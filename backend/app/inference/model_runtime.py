import json
from pathlib import Path
from typing import Any

import numpy as np
import torch


# ============================================================
# MODEL CONFIG
# ============================================================

SEQUENCE_LENGTH = 48

HAND_DIM = 134
POSE_DIM = 36
FACEHEAD_DIM = 52

FACE_CROP_SIZE = 48

NUM_CLASSES = 32


# ============================================================
# PATHS
# ============================================================

# model_runtime.py
# backend/app/inference/model_runtime.py
#
# parents[0] = inference
# parents[1] = app
# parents[2] = backend
BACKEND_DIR = (
    Path(__file__)
    .resolve()
    .parents[2]
)

DEFAULT_MODEL_DIR = (
    BACKEND_DIR
    / "model_files"
    / "v1"
)


MODEL_FILENAME = (
    "wl_bisindo_multimodal_traced.pt"
)

HAND_MEAN_FILENAME = (
    "hand_mean.npy"
)

HAND_STD_FILENAME = (
    "hand_std.npy"
)

POSE_MEAN_FILENAME = (
    "pose_mean.npy"
)

POSE_STD_FILENAME = (
    "pose_std.npy"
)

FACEHEAD_MEAN_FILENAME = (
    "facehead_mean.npy"
)

FACEHEAD_STD_FILENAME = (
    "facehead_std.npy"
)

FACECROP_STATS_FILENAME = (
    "facecrop_stats.json"
)

CLASS_MAPPING_FILENAME = (
    "class_mapping.json"
)

DEPLOYMENT_CONFIG_FILENAME = (
    "deployment_config.json"
)


REQUIRED_FILES = [
    MODEL_FILENAME,

    HAND_MEAN_FILENAME,
    HAND_STD_FILENAME,

    POSE_MEAN_FILENAME,
    POSE_STD_FILENAME,

    FACEHEAD_MEAN_FILENAME,
    FACEHEAD_STD_FILENAME,

    FACECROP_STATS_FILENAME,

    CLASS_MAPPING_FILENAME,

    DEPLOYMENT_CONFIG_FILENAME,
]


# ============================================================
# RUNTIME
# ============================================================

class BisindoModelRuntime:
    def __init__(
        self,
        model_dir: Path | str = DEFAULT_MODEL_DIR,
    ):
        self.model_dir = Path(
            model_dir
        )

        # Untuk deployment lokal sekarang
        # kita lock CPU dulu.
        self.device = torch.device(
            "cpu"
        )

        self.model = None

        self.hand_mean = None
        self.hand_std = None

        self.pose_mean = None
        self.pose_std = None

        self.facehead_mean = None
        self.facehead_std = None

        self.facecrop_mean = None
        self.facecrop_std = None

        self.class_mapping = {}
        self.config = {}

        self.loaded = False
        self.status = "not_loaded"
        self.error = None


    # ========================================================
    # FILE PATH
    # ========================================================

    def path(
        self,
        filename: str,
    ) -> Path:
        return (
            self.model_dir
            / filename
        )


    # ========================================================
    # MISSING FILES
    # ========================================================

    def get_missing_files(self):
        return [
            filename

            for filename
            in REQUIRED_FILES

            if not self.path(
                filename
            ).exists()
        ]


    # ========================================================
    # JSON
    # ========================================================

    @staticmethod
    def read_json(
        path: Path,
    ):
        with path.open(
            "r",
            encoding="utf-8",
        ) as file:
            return json.load(
                file
            )


    # ========================================================
    # NUMPY
    # ========================================================

    @staticmethod
    def read_npy(
        path: Path,
        expected_shape,
    ):
        array = np.load(
            path
        ).astype(
            np.float32
        )

        if (
            tuple(array.shape)
            != tuple(expected_shape)
        ):
            raise RuntimeError(
                (
                    f"Shape {path.name} salah. "
                    f"Expected {expected_shape}, "
                    f"got {array.shape}."
                )
            )

        if not np.isfinite(
            array
        ).all():
            raise RuntimeError(
                (
                    f"{path.name} "
                    "mengandung NaN/Inf."
                )
            )

        return array


    # ========================================================
    # CONFIG VALIDATION
    # ========================================================

    def validate_config(self):
        sequence_length = int(
            self.config.get(
                "sequence_length",
                -1,
            )
        )

        num_classes = int(
            self.config.get(
                "num_classes",
                -1,
            )
        )

        if (
            sequence_length
            != SEQUENCE_LENGTH
        ):
            raise RuntimeError(
                (
                    "Sequence length model salah. "
                    f"Expected {SEQUENCE_LENGTH}, "
                    f"got {sequence_length}."
                )
            )

        if (
            num_classes
            != NUM_CLASSES
        ):
            raise RuntimeError(
                (
                    "Jumlah class model salah. "
                    f"Expected {NUM_CLASSES}, "
                    f"got {num_classes}."
                )
            )

        inputs = self.config.get(
            "inputs",
            {},
        )

        expected_inputs = {
            "hand": [
                1,
                48,
                134,
            ],

            "pose": [
                1,
                48,
                36,
            ],

            "facehead": [
                1,
                48,
                52,
            ],

            "facecrop": [
                1,
                48,
                48,
                48,
            ],
        }

        for (
            name,
            expected_shape,
        ) in expected_inputs.items():
            actual_shape = (
                inputs.get(
                    name
                )
            )

            if (
                actual_shape
                != expected_shape
            ):
                raise RuntimeError(
                    (
                        f"Input '{name}' salah. "
                        f"Expected {expected_shape}, "
                        f"got {actual_shape}."
                    )
                )


    # ========================================================
    # CLASS MAPPING VALIDATION
    # ========================================================

    def validate_class_mapping(
        self,
    ):
        if not isinstance(
            self.class_mapping,
            dict,
        ):
            raise RuntimeError(
                (
                    "class_mapping.json "
                    "harus berupa object."
                )
            )

        if (
            len(
                self.class_mapping
            )
            != NUM_CLASSES
        ):
            raise RuntimeError(
                (
                    "Jumlah label salah. "
                    f"Expected {NUM_CLASSES}, "
                    f"got "
                    f"{len(self.class_mapping)}."
                )
            )

        expected_keys = {
            str(index)

            for index
            in range(
                NUM_CLASSES
            )
        }

        actual_keys = set(
            self.class_mapping.keys()
        )

        if (
            actual_keys
            != expected_keys
        ):
            raise RuntimeError(
                (
                    "class_mapping.json "
                    "harus mempunyai key "
                    "0 sampai 31."
                )
            )


    # ========================================================
    # TORCHSCRIPT SMOKE TEST
    # ========================================================

    def smoke_test(self):
        if self.model is None:
            raise RuntimeError(
                "Model belum dimuat."
            )

        dummy_hand = torch.zeros(
            (
                1,
                SEQUENCE_LENGTH,
                HAND_DIM,
            ),
            dtype=torch.float32,
            device=self.device,
        )

        dummy_pose = torch.zeros(
            (
                1,
                SEQUENCE_LENGTH,
                POSE_DIM,
            ),
            dtype=torch.float32,
            device=self.device,
        )

        dummy_facehead = torch.zeros(
            (
                1,
                SEQUENCE_LENGTH,
                FACEHEAD_DIM,
            ),
            dtype=torch.float32,
            device=self.device,
        )

        # Winner C tidak memakai FaceCropCNN.
        #
        # Tapi TorchScript diekspor dengan
        # signature 4 input, jadi dummy crop
        # tetap wajib diberikan.
        dummy_facecrop = torch.zeros(
            (
                1,
                SEQUENCE_LENGTH,
                FACE_CROP_SIZE,
                FACE_CROP_SIZE,
            ),
            dtype=torch.float32,
            device=self.device,
        )

        with torch.inference_mode():
            output = self.model(
                dummy_hand,
                dummy_pose,
                dummy_facehead,
                dummy_facecrop,
            )

        expected_shape = (
            1,
            NUM_CLASSES,
        )

        if (
            tuple(output.shape)
            != expected_shape
        ):
            raise RuntimeError(
                (
                    "Output TorchScript salah. "
                    f"Expected {expected_shape}, "
                    f"got "
                    f"{tuple(output.shape)}."
                )
            )

        if not torch.isfinite(
            output
        ).all():
            raise RuntimeError(
                (
                    "Output TorchScript "
                    "mengandung NaN/Inf."
                )
            )

        return tuple(
            output.shape
        )


    # ========================================================
    # LOAD MODEL
    # ========================================================

    def load(self):
        self.loaded = False
        self.status = "loading"
        self.error = None

        missing_files = (
            self.get_missing_files()
        )

        if missing_files:
            self.status = (
                "missing_files"
            )

            self.error = (
                "File model belum lengkap: "
                + ", ".join(
                    missing_files
                )
            )

            print(
                "[Model] ❌",
                self.error,
            )

            return False

        try:
            # =========================
            # CONFIG
            # =========================

            self.config = (
                self.read_json(
                    self.path(
                        DEPLOYMENT_CONFIG_FILENAME
                    )
                )
            )

            self.class_mapping = (
                self.read_json(
                    self.path(
                        CLASS_MAPPING_FILENAME
                    )
                )
            )

            self.validate_config()

            self.validate_class_mapping()


            # =========================
            # NORMALIZATION STATS
            # =========================

            self.hand_mean = (
                self.read_npy(
                    self.path(
                        HAND_MEAN_FILENAME
                    ),
                    (
                        HAND_DIM,
                    ),
                )
            )

            self.hand_std = (
                self.read_npy(
                    self.path(
                        HAND_STD_FILENAME
                    ),
                    (
                        HAND_DIM,
                    ),
                )
            )

            self.pose_mean = (
                self.read_npy(
                    self.path(
                        POSE_MEAN_FILENAME
                    ),
                    (
                        POSE_DIM,
                    ),
                )
            )

            self.pose_std = (
                self.read_npy(
                    self.path(
                        POSE_STD_FILENAME
                    ),
                    (
                        POSE_DIM,
                    ),
                )
            )

            self.facehead_mean = (
                self.read_npy(
                    self.path(
                        FACEHEAD_MEAN_FILENAME
                    ),
                    (
                        FACEHEAD_DIM,
                    ),
                )
            )

            self.facehead_std = (
                self.read_npy(
                    self.path(
                        FACEHEAD_STD_FILENAME
                    ),
                    (
                        FACEHEAD_DIM,
                    ),
                )
            )


            # =========================
            # FACE CROP STATS
            # =========================

            crop_stats = (
                self.read_json(
                    self.path(
                        FACECROP_STATS_FILENAME
                    )
                )
            )

            self.facecrop_mean = float(
                crop_stats.get(
                    "mean",
                    0.0,
                )
            )

            self.facecrop_std = float(
                crop_stats.get(
                    "std",
                    1.0,
                )
            )

            if (
                self.facecrop_std
                <= 0
            ):
                raise RuntimeError(
                    (
                        "facecrop std "
                        "harus lebih dari 0."
                    )
                )


            # =========================
            # LOAD TORCHSCRIPT
            # =========================

            self.model = (
                torch.jit.load(
                    str(
                        self.path(
                            MODEL_FILENAME
                        )
                    ),
                    map_location=(
                        self.device
                    ),
                )
            )

            self.model.eval()


            # =========================
            # SMOKE TEST
            # =========================

            output_shape = (
                self.smoke_test()
            )


            # =========================
            # READY
            # =========================

            self.loaded = True
            self.status = "loaded"

            print(
                "[Model] ✅ Loaded"
            )

            print(
                "[Model] Name:",
                self.config.get(
                    "name"
                ),
            )

            print(
                "[Model] Winner:",
                self.config.get(
                    "winner_mode"
                ),
                "-",
                self.config.get(
                    "winner_name"
                ),
            )

            print(
                "[Model] Device:",
                self.device,
            )

            print(
                "[Model] PyTorch:",
                torch.__version__,
            )

            print(
                "[Model] Classes:",
                len(
                    self.class_mapping
                ),
            )

            print(
                "[Model] Output:",
                output_shape,
            )

            return True

        except Exception as error:
            self.model = None

            self.loaded = False
            self.status = "error"

            self.error = str(
                error
            )

            print(
                "[Model] ❌ Load error:",
                error,
            )

            return False


    # ========================================================
    # UNLOAD
    # ========================================================

    def unload(self):
        self.model = None

        self.loaded = False
        self.status = "not_loaded"


    # ========================================================
    # STATUS
    # ========================================================

    def get_status(
        self,
    ) -> dict[str, Any]:
        inputs = (
            self.config.get(
                "inputs",
                {},
            )

            if isinstance(
                self.config,
                dict,
            )

            else {}
        )

        return {
            "status":
                self.status,

            "loaded":
                self.loaded,

            "device":
                str(
                    self.device
                ),

            "torch_version":
                torch.__version__,

            "model_directory":
                str(
                    self.model_dir
                ),

            "model_file":
                MODEL_FILENAME,

            "missing_files":
                self.get_missing_files(),

            "error":
                self.error,

            "name":
                self.config.get(
                    "name"
                ),

            "winner_mode":
                self.config.get(
                    "winner_mode"
                ),

            "winner_name":
                self.config.get(
                    "winner_name"
                ),

            "sequence_length":
                self.config.get(
                    "sequence_length"
                ),

            "num_classes":
                self.config.get(
                    "num_classes"
                ),

            "inputs":
                inputs,

            "class_count":
                len(
                    self.class_mapping
                ),

            "statistics": {
                "hand":
                    (
                        list(
                            self.hand_mean.shape
                        )

                        if self.hand_mean
                        is not None

                        else None
                    ),

                "pose":
                    (
                        list(
                            self.pose_mean.shape
                        )

                        if self.pose_mean
                        is not None

                        else None
                    ),

                "facehead":
                    (
                        list(
                            self.facehead_mean.shape
                        )

                        if self.facehead_mean
                        is not None

                        else None
                    ),
            },
        }


# ============================================================
# SINGLETON
# ============================================================

model_runtime = (
    BisindoModelRuntime()
)