import json
import os
import threading
from pathlib import Path
from typing import Any

import numpy as np
import torch


SEQUENCE_LENGTH = 48
HAND_DIM = 134
POSE_DIM = 36
FACEHEAD_DIM = 52
FACE_CROP_SIZE = 48
NUM_CLASSES = 32

BACKEND_DIR = Path(__file__).resolve().parents[2]
MODEL_ROOT = BACKEND_DIR / "model_files"
DEFAULT_VERSION = os.getenv("BISINDO_MODEL_VERSION", "v1")

MODEL_FILENAME = "wl_bisindo_multimodal_traced.pt"
CLASS_MAPPING_FILENAME = "class_mapping.json"

# Legacy V1 files
HAND_MEAN_FILENAME = "hand_mean.npy"
HAND_STD_FILENAME = "hand_std.npy"
POSE_MEAN_FILENAME = "pose_mean.npy"
POSE_STD_FILENAME = "pose_std.npy"
FACEHEAD_MEAN_FILENAME = "facehead_mean.npy"
FACEHEAD_STD_FILENAME = "facehead_std.npy"
FACECROP_STATS_FILENAME = "facecrop_stats.json"
DEPLOYMENT_CONFIG_FILENAME = "deployment_config.json"

# V2 masked model files
MODEL_CONTRACT_FILENAME = "model_contract.json"
TEMPORAL_CONFIG_FILENAME = "temporal_config.json"
TRAINING_CONTRACT_FILENAME = "training_contract.json"

LEGACY_REQUIRED_FILES = [
    MODEL_FILENAME,
    CLASS_MAPPING_FILENAME,
    HAND_MEAN_FILENAME,
    HAND_STD_FILENAME,
    POSE_MEAN_FILENAME,
    POSE_STD_FILENAME,
    FACEHEAD_MEAN_FILENAME,
    FACEHEAD_STD_FILENAME,
    FACECROP_STATS_FILENAME,
    DEPLOYMENT_CONFIG_FILENAME,
]

V2_REQUIRED_FILES = [
    MODEL_FILENAME,
    CLASS_MAPPING_FILENAME,
    MODEL_CONTRACT_FILENAME,
    TEMPORAL_CONFIG_FILENAME,
]


class BisindoModelRuntime:
    """Runtime that can hot-switch between model_files/v1, v2, ...

    Supported schemas:
    - legacy_v1: normalized hand/pose/facehead + dummy facecrop, 4 TorchScript inputs.
    - masked_v2: raw V3.2 features + hand/pose/face/time masks, 7 TorchScript inputs.
    """

    def __init__(self, version: str = DEFAULT_VERSION):
        self.device = torch.device("cpu")
        self._lock = threading.RLock()

        self.active_version = str(version)
        self.model_dir = MODEL_ROOT / self.active_version
        self.runtime_schema = None
        self.generation = 0

        self.model = None
        self.class_mapping = {}
        self.config = {}
        self.model_contract = {}
        self.temporal_config = {}
        self.training_contract = {}

        self.hand_mean = None
        self.hand_std = None
        self.pose_mean = None
        self.pose_std = None
        self.facehead_mean = None
        self.facehead_std = None
        self.facecrop_mean = None
        self.facecrop_std = None

        self.loaded = False
        self.status = "not_loaded"
        self.error = None

    @staticmethod
    def _safe_version_name(version: str) -> str:
        value = str(version or "").strip()
        if not value or any(ch not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for ch in value):
            raise ValueError("Nama versi model tidak valid.")
        return value

    @staticmethod
    def read_json(path: Path):
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def read_npy(path: Path, expected_shape):
        arr = np.load(path).astype(np.float32)
        if tuple(arr.shape) != tuple(expected_shape):
            raise RuntimeError(
                f"Shape {path.name} salah. Expected {expected_shape}, got {arr.shape}."
            )
        if not np.isfinite(arr).all():
            raise RuntimeError(f"{path.name} mengandung NaN/Inf.")
        return arr

    def path(self, filename: str, model_dir: Path | None = None) -> Path:
        return (model_dir or self.model_dir) / filename

    def discover_versions(self):
        if not MODEL_ROOT.exists():
            return []
        return sorted(
            p.name for p in MODEL_ROOT.iterdir()
            if p.is_dir() and not p.name.startswith(".")
        )

    def detect_schema(self, model_dir: Path) -> str:
        contract_path = model_dir / MODEL_CONTRACT_FILENAME
        if contract_path.exists():
            try:
                contract = self.read_json(contract_path)
                inputs = contract.get("inputs", {}) if isinstance(contract, dict) else {}
                if all(name in inputs for name in (
                    "hand", "pose", "facehead", "hand_mask", "pose_mask", "facehead_mask", "time_mask"
                )):
                    return "masked_v2"
            except Exception:
                pass
        return "legacy_v1"

    def required_files_for(self, model_dir: Path):
        schema = self.detect_schema(model_dir)
        return V2_REQUIRED_FILES if schema == "masked_v2" else LEGACY_REQUIRED_FILES

    def get_missing_files(self, version: str | None = None):
        version = self.active_version if version is None else self._safe_version_name(version)
        model_dir = MODEL_ROOT / version
        return [name for name in self.required_files_for(model_dir) if not (model_dir / name).exists()]

    def get_versions(self):
        items = []
        for version in self.discover_versions():
            model_dir = MODEL_ROOT / version
            schema = self.detect_schema(model_dir)
            missing = self.get_missing_files(version)
            label = version
            contract = {}
            deployment = {}
            try:
                if schema == "masked_v2" and (model_dir / MODEL_CONTRACT_FILENAME).exists():
                    contract = self.read_json(model_dir / MODEL_CONTRACT_FILENAME)
                    label = contract.get("model_version") or contract.get("name") or version
                elif (model_dir / DEPLOYMENT_CONFIG_FILENAME).exists():
                    deployment = self.read_json(model_dir / DEPLOYMENT_CONFIG_FILENAME)
                    label = deployment.get("name") or deployment.get("winner_name") or version
            except Exception:
                pass
            items.append({
                "version": version,
                "label": str(label),
                "schema": schema,
                "ready": len(missing) == 0,
                "missing_files": missing,
                "active": version == self.active_version,
            })
        return items

    @staticmethod
    def validate_class_mapping(mapping):
        if not isinstance(mapping, dict):
            raise RuntimeError("class_mapping.json harus berupa object.")
        if len(mapping) != NUM_CLASSES:
            raise RuntimeError(f"Jumlah label salah. Expected {NUM_CLASSES}, got {len(mapping)}.")
        expected = {str(i) for i in range(NUM_CLASSES)}
        if set(mapping.keys()) != expected:
            raise RuntimeError("class_mapping.json harus mempunyai key 0 sampai 31.")

    @staticmethod
    def _shape_matches(actual, expected):
        if actual is None:
            return False
        if list(actual) == list(expected):
            return True
        # model_contract uses ["batch", 48, dim]
        if len(actual) == len(expected) and len(expected) >= 1:
            for a, e in zip(actual, expected):
                if isinstance(e, str):
                    continue
                if a != e:
                    return False
            return True
        return False

    def validate_legacy_config(self, config):
        if int(config.get("sequence_length", -1)) != SEQUENCE_LENGTH:
            raise RuntimeError("Sequence length model V1 tidak sesuai.")
        if int(config.get("num_classes", -1)) != NUM_CLASSES:
            raise RuntimeError("Jumlah class model V1 tidak sesuai.")
        inputs = config.get("inputs", {})
        expected = {
            "hand": [1, 48, 134],
            "pose": [1, 48, 36],
            "facehead": [1, 48, 52],
            "facecrop": [1, 48, 48, 48],
        }
        for name, shape in expected.items():
            if inputs.get(name) != shape:
                raise RuntimeError(f"Input V1 '{name}' salah. Expected {shape}, got {inputs.get(name)}.")

    def validate_v2_contract(self, contract, temporal):
        inputs = contract.get("inputs", {})
        expected = {
            "hand": ["batch", 48, 134],
            "pose": ["batch", 48, 36],
            "facehead": ["batch", 48, 52],
            "hand_mask": ["batch", 48, 2],
            "pose_mask": ["batch", 48],
            "facehead_mask": ["batch", 48],
            "time_mask": ["batch", 48],
        }
        for name, shape in expected.items():
            if not self._shape_matches(inputs.get(name), shape):
                raise RuntimeError(
                    f"Input V2 '{name}' salah. Expected compatible with {shape}, got {inputs.get(name)}."
                )
        seq_len = int(temporal.get("sequence_length", contract.get("sequence_length", -1)))
        if seq_len != SEQUENCE_LENGTH:
            raise RuntimeError(f"Sequence length V2 harus {SEQUENCE_LENGTH}, got {seq_len}.")
        window_sec = float(temporal.get("window_duration_sec", 0.0))
        if window_sec <= 0:
            raise RuntimeError("temporal_config.json tidak memiliki window_duration_sec valid.")

    def _smoke_test_model(self, model, schema: str):
        zeros = lambda shape: torch.zeros(shape, dtype=torch.float32, device=self.device)
        with torch.inference_mode():
            if schema == "masked_v2":
                output = model(
                    zeros((1,48,134)),
                    zeros((1,48,36)),
                    zeros((1,48,52)),
                    zeros((1,48,2)),
                    zeros((1,48)),
                    zeros((1,48)),
                    torch.ones((1,48), dtype=torch.float32, device=self.device),
                )
            else:
                output = model(
                    zeros((1,48,134)),
                    zeros((1,48,36)),
                    zeros((1,48,52)),
                    zeros((1,48,48,48)),
                )
        if tuple(output.shape) != (1, NUM_CLASSES):
            raise RuntimeError(f"Output TorchScript salah. Expected (1,{NUM_CLASSES}), got {tuple(output.shape)}.")
        if not torch.isfinite(output).all():
            raise RuntimeError("Output TorchScript mengandung NaN/Inf.")
        return tuple(output.shape)

    def load(self, version: str | None = None):
        with self._lock:
            target_version = self.active_version if version is None else self._safe_version_name(version)
            target_dir = MODEL_ROOT / target_version
            if not target_dir.exists():
                self.error = f"Folder model tidak ditemukan: {target_dir}"
                if not self.loaded:
                    self.status = "missing_model_dir"
                return False

            schema = self.detect_schema(target_dir)
            required = self.required_files_for(target_dir)
            missing = [name for name in required if not (target_dir / name).exists()]
            if missing:
                self.error = "File model belum lengkap: " + ", ".join(missing)
                if not self.loaded:
                    self.status = "missing_files"
                return False

            # Build everything locally first. Existing active model stays alive on failure.
            try:
                class_mapping = self.read_json(target_dir / CLASS_MAPPING_FILENAME)
                self.validate_class_mapping(class_mapping)

                model = torch.jit.load(str(target_dir / MODEL_FILENAME), map_location=self.device)
                model.eval()

                config = {}
                model_contract = {}
                temporal_config = {}
                training_contract = {}
                hand_mean = hand_std = pose_mean = pose_std = None
                facehead_mean = facehead_std = None
                facecrop_mean = facecrop_std = None

                if schema == "masked_v2":
                    model_contract = self.read_json(target_dir / MODEL_CONTRACT_FILENAME)
                    temporal_config = self.read_json(target_dir / TEMPORAL_CONFIG_FILENAME)
                    if (target_dir / TRAINING_CONTRACT_FILENAME).exists():
                        training_contract = self.read_json(target_dir / TRAINING_CONTRACT_FILENAME)
                    self.validate_v2_contract(model_contract, temporal_config)
                    config = model_contract.copy()
                    config.setdefault("sequence_length", SEQUENCE_LENGTH)
                    config.setdefault("num_classes", NUM_CLASSES)
                    config["window_duration_sec"] = float(temporal_config["window_duration_sec"])
                else:
                    config = self.read_json(target_dir / DEPLOYMENT_CONFIG_FILENAME)
                    self.validate_legacy_config(config)
                    hand_mean = self.read_npy(target_dir / HAND_MEAN_FILENAME, (HAND_DIM,))
                    hand_std = self.read_npy(target_dir / HAND_STD_FILENAME, (HAND_DIM,))
                    pose_mean = self.read_npy(target_dir / POSE_MEAN_FILENAME, (POSE_DIM,))
                    pose_std = self.read_npy(target_dir / POSE_STD_FILENAME, (POSE_DIM,))
                    facehead_mean = self.read_npy(target_dir / FACEHEAD_MEAN_FILENAME, (FACEHEAD_DIM,))
                    facehead_std = self.read_npy(target_dir / FACEHEAD_STD_FILENAME, (FACEHEAD_DIM,))
                    crop_stats = self.read_json(target_dir / FACECROP_STATS_FILENAME)
                    facecrop_mean = float(crop_stats.get("mean", 0.0))
                    facecrop_std = float(crop_stats.get("std", 1.0))
                    if facecrop_std <= 0:
                        raise RuntimeError("facecrop std harus lebih dari 0.")

                output_shape = self._smoke_test_model(model, schema)

                # Atomic swap after validation/smoke test.
                self.active_version = target_version
                self.model_dir = target_dir
                self.runtime_schema = schema
                self.model = model
                self.class_mapping = class_mapping
                self.config = config
                self.model_contract = model_contract
                self.temporal_config = temporal_config
                self.training_contract = training_contract
                self.hand_mean, self.hand_std = hand_mean, hand_std
                self.pose_mean, self.pose_std = pose_mean, pose_std
                self.facehead_mean, self.facehead_std = facehead_mean, facehead_std
                self.facecrop_mean, self.facecrop_std = facecrop_mean, facecrop_std
                self.loaded = True
                self.status = "loaded"
                self.error = None
                self.generation += 1

                print(f"[Model] ✅ Loaded {target_version} ({schema})")
                print("[Model] Device:", self.device)
                print("[Model] Output:", output_shape)
                if schema == "masked_v2":
                    print("[Model] Window sec:", self.get_window_seconds())
                return True

            except Exception as exc:
                self.error = str(exc)
                if not self.loaded:
                    self.status = "error"
                print("[Model] ❌ Load error:", exc)
                return False

    def switch(self, version: str):
        return self.load(version=version)

    def unload(self):
        with self._lock:
            self.model = None
            self.loaded = False
            self.status = "not_loaded"
            self.generation += 1

    def get_window_seconds(self):
        if self.runtime_schema == "masked_v2":
            return float(self.temporal_config.get("window_duration_sec", 2.2))
        return None

    def get_preprocessing_profile(self):
        if self.runtime_schema == "masked_v2":
            window = self.get_window_seconds() or 2.2
            timestep = window / max(SEQUENCE_LENGTH - 1, 1)
            max_interp_gap = max(1, int(round(0.22 / max(timestep, 1e-6))))
            edge_fill = max(0, int(round(0.08 / max(timestep, 1e-6))))
            return {
                "schema": "masked_v2",
                "sequence_length": SEQUENCE_LENGTH,
                "window_seconds": window,
                "max_interp_gap": max_interp_gap,
                "edge_fill": edge_fill,
                "vision_profile": "v32_exact",
            }
        return {
            "schema": "legacy_v1",
            "sequence_length": SEQUENCE_LENGTH,
            "window_seconds": None,
            "max_interp_gap": 6,
            "edge_fill": 2,
            "vision_profile": "legacy_v1",
        }

    def get_status(self) -> dict[str, Any]:
        profile = self.get_preprocessing_profile()
        return {
            "status": self.status,
            "loaded": self.loaded,
            "active_version": self.active_version,
            "runtime_schema": self.runtime_schema,
            "generation": self.generation,
            "device": str(self.device),
            "torch_version": torch.__version__,
            "model_directory": str(self.model_dir),
            "model_file": MODEL_FILENAME,
            "missing_files": self.get_missing_files(self.active_version) if self.model_dir.exists() else [],
            "error": self.error,
            "name": self.config.get("name") or self.config.get("model_version"),
            "winner_mode": self.config.get("winner_mode"),
            "winner_name": self.config.get("winner_name"),
            "sequence_length": SEQUENCE_LENGTH,
            "num_classes": NUM_CLASSES,
            "inputs": self.config.get("inputs", {}),
            "class_count": len(self.class_mapping),
            "window_duration_sec": profile.get("window_seconds"),
            "preprocessing_profile": profile,
            "available_versions": self.get_versions(),
            "statistics": {
                "hand": list(self.hand_mean.shape) if self.hand_mean is not None else None,
                "pose": list(self.pose_mean.shape) if self.pose_mean is not None else None,
                "facehead": list(self.facehead_mean.shape) if self.facehead_mean is not None else None,
            },
        }


model_runtime = BisindoModelRuntime()
