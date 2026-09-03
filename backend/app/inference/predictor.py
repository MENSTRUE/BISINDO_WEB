import time

import numpy as np
import torch

from app.inference.model_runtime import (
    FACE_CROP_SIZE,
    FACEHEAD_DIM,
    HAND_DIM,
    NUM_CLASSES,
    POSE_DIM,
    SEQUENCE_LENGTH,
    model_runtime,
)


# ============================================================
# TRAINING NORMALIZATION CONFIG
# ============================================================

HAND_LEFT_PRESENCE_INDEX = 66
HAND_RIGHT_PRESENCE_INDEX = 133

POSE_VISIBILITY_INDICES = [
    3,
    7,
    11,
    15,
    19,
    23,
    27,
    31,
    35,
]

FACE_VISIBILITY_START = 33
FACE_VISIBILITY_END = 44
FACE_PRESENCE_INDEX = 51


# ============================================================
# INPUT QUALITY
# ============================================================

MIN_HAND_PRESENT_FRAMES = 4


# ============================================================
# NORMALIZE HAND
# ============================================================

def normalize_hand(
    sequence: np.ndarray,
):
    x = np.asarray(
        sequence,
        dtype=np.float32,
    ).copy()

    if x.shape != (
        SEQUENCE_LENGTH,
        HAND_DIM,
    ):
        raise ValueError(
            (
                "Shape hand salah. "
                f"Expected "
                f"({SEQUENCE_LENGTH}, {HAND_DIM}), "
                f"got {x.shape}."
            )
        )


    left_presence = (
        x[
            :,
            HAND_LEFT_PRESENCE_INDEX,
        ].copy()
    )


    right_presence = (
        x[
            :,
            HAND_RIGHT_PRESENCE_INDEX,
        ].copy()
    )


    x = (
        x
        - model_runtime.hand_mean
    ) / model_runtime.hand_std


    # =========================
    # MISSING LEFT HAND
    # =========================

    x[
        left_presence < 0.5,
        0:66,
    ] = 0.0


    # =========================
    # MISSING RIGHT HAND
    # =========================

    x[
        right_presence < 0.5,
        67:133,
    ] = 0.0


    # =========================
    # RESTORE PRESENCE
    # =========================

    x[
        :,
        HAND_LEFT_PRESENCE_INDEX,
    ] = left_presence


    x[
        :,
        HAND_RIGHT_PRESENCE_INDEX,
    ] = right_presence


    return x.astype(
        np.float32
    )


# ============================================================
# NORMALIZE POSE
# ============================================================

def normalize_pose(
    sequence: np.ndarray,
):
    x = np.asarray(
        sequence,
        dtype=np.float32,
    ).copy()


    if x.shape != (
        SEQUENCE_LENGTH,
        POSE_DIM,
    ):
        raise ValueError(
            (
                "Shape pose salah. "
                f"Expected "
                f"({SEQUENCE_LENGTH}, {POSE_DIM}), "
                f"got {x.shape}."
            )
        )


    visibility = (
        x[
            :,
            POSE_VISIBILITY_INDICES,
        ].copy()
    )


    x = (
        x
        - model_runtime.pose_mean
    ) / model_runtime.pose_std


    for (
        landmark_index,
        visibility_index,
    ) in enumerate(
        POSE_VISIBILITY_INDICES
    ):
        base = (
            landmark_index * 4
        )


        invalid = (
            visibility[
                :,
                landmark_index,
            ]
            < 0.2
        )


        x[
            invalid,
            base:base + 3,
        ] = 0.0


        x[
            :,
            visibility_index,
        ] = visibility[
            :,
            landmark_index,
        ]


    return x.astype(
        np.float32
    )


# ============================================================
# NORMALIZE FACEHEAD
# ============================================================

def normalize_facehead(
    sequence: np.ndarray,
):
    x = np.asarray(
        sequence,
        dtype=np.float32,
    ).copy()


    if x.shape != (
        SEQUENCE_LENGTH,
        FACEHEAD_DIM,
    ):
        raise ValueError(
            (
                "Shape facehead salah. "
                f"Expected "
                f"({SEQUENCE_LENGTH}, {FACEHEAD_DIM}), "
                f"got {x.shape}."
            )
        )


    visibility = (
        x[
            :,
            FACE_VISIBILITY_START:
            FACE_VISIBILITY_END,
        ].copy()
    )


    presence = (
        x[
            :,
            FACE_PRESENCE_INDEX,
        ].copy()
    )


    x = (
        x
        - model_runtime.facehead_mean
    ) / model_runtime.facehead_std


    # =========================
    # INVALID FACE POINTS
    # =========================

    for landmark_index in range(
        11
    ):
        invalid = (
            visibility[
                :,
                landmark_index,
            ]
            < 0.2
        )


        start = (
            landmark_index * 3
        )


        x[
            invalid,
            start:start + 3,
        ] = 0.0


    # =========================
    # RESTORE VISIBILITY
    # =========================

    x[
        :,
        FACE_VISIBILITY_START:
        FACE_VISIBILITY_END,
    ] = visibility


    # =========================
    # RESTORE PRESENCE
    # =========================

    x[
        :,
        FACE_PRESENCE_INDEX,
    ] = presence


    # =========================
    # FACE MISSING
    # =========================

    missing_face = (
        presence < 0.5
    )


    x[
        missing_face,
        0:33,
    ] = 0.0


    x[
        missing_face,
        44:51,
    ] = 0.0


    return x.astype(
        np.float32
    )


# ============================================================
# QUALITY CHECK
# ============================================================

def count_hand_present_frames(
    hand_sequence: np.ndarray,
):
    left_presence = (
        hand_sequence[
            :,
            HAND_LEFT_PRESENCE_INDEX,
        ]
        >= 0.5
    )


    right_presence = (
        hand_sequence[
            :,
            HAND_RIGHT_PRESENCE_INDEX,
        ]
        >= 0.5
    )


    any_hand = (
        left_presence
        | right_presence
    )


    return int(
        np.count_nonzero(
            any_hand
        )
    )


# ============================================================
# PREDICTOR
# ============================================================

class BisindoPredictor:
    def __init__(self):
        self.runtime = (
            model_runtime
        )


    # ========================================================
    # VALIDATE RAW SEQUENCES
    # ========================================================

    @staticmethod
    def validate_sequences(
        sequences,
    ):
        if not isinstance(
            sequences,
            dict,
        ):
            raise ValueError(
                (
                    "Sequences harus "
                    "berupa dictionary."
                )
            )


        required = {
            "hand": (
                SEQUENCE_LENGTH,
                HAND_DIM,
            ),

            "pose": (
                SEQUENCE_LENGTH,
                POSE_DIM,
            ),

            "facehead": (
                SEQUENCE_LENGTH,
                FACEHEAD_DIM,
            ),
        }


        for (
            name,
            expected_shape,
        ) in required.items():
            if (
                name
                not in sequences
            ):
                raise ValueError(
                    (
                        f"Sequence '{name}' "
                        "tidak tersedia."
                    )
                )


            actual = np.asarray(
                sequences[
                    name
                ]
            )


            if (
                tuple(actual.shape)
                != expected_shape
            ):
                raise ValueError(
                    (
                        f"Shape '{name}' salah. "
                        f"Expected "
                        f"{expected_shape}, "
                        f"got "
                        f"{actual.shape}."
                    )
                )


            if not np.isfinite(
                actual
            ).all():
                raise ValueError(
                    (
                        f"Sequence '{name}' "
                        "mengandung NaN/Inf."
                    )
                )


    # ========================================================
    # PREDICT
    # ========================================================

    def predict(
        self,
        sequences,
    ):
        if (
            not self.runtime.loaded
            or self.runtime.model
            is None
        ):
            return {
                "status":
                    "model_not_loaded",

                "label":
                    None,

                "class_id":
                    None,

                "confidence":
                    0.0,

                "confidence_percent":
                    0.0,

                "top3":
                    [],

                "inference_ms":
                    None,
            }


        self.validate_sequences(
            sequences
        )


        raw_hand = np.asarray(
            sequences[
                "hand"
            ],
            dtype=np.float32,
        )


        hand_present_frames = (
            count_hand_present_frames(
                raw_hand
            )
        )


        # =========================
        # NO USEFUL HAND INPUT
        # =========================

        if (
            hand_present_frames
            < MIN_HAND_PRESENT_FRAMES
        ):
            return {
                "status":
                    "waiting_for_hand",

                "label":
                    None,

                "class_id":
                    None,

                "confidence":
                    0.0,

                "confidence_percent":
                    0.0,

                "top3":
                    [],

                "hand_present_frames":
                    hand_present_frames,

                "inference_ms":
                    None,
            }


        # =========================
        # NORMALIZE
        # =========================

        hand = normalize_hand(
            sequences[
                "hand"
            ]
        )


        pose = normalize_pose(
            sequences[
                "pose"
            ]
        )


        facehead = (
            normalize_facehead(
                sequences[
                    "facehead"
                ]
            )
        )


        # Winner C tidak memakai
        # crop branch.
        #
        # Signature TorchScript
        # tetap membutuhkan input
        # keempat.
        facecrop = np.zeros(
            (
                SEQUENCE_LENGTH,
                FACE_CROP_SIZE,
                FACE_CROP_SIZE,
            ),
            dtype=np.float32,
        )


        # =========================
        # BATCH DIMENSION
        # =========================

        hand_tensor = (
            torch.from_numpy(
                hand
            )
            .unsqueeze(0)
            .to(
                self.runtime.device
            )
        )


        pose_tensor = (
            torch.from_numpy(
                pose
            )
            .unsqueeze(0)
            .to(
                self.runtime.device
            )
        )


        facehead_tensor = (
            torch.from_numpy(
                facehead
            )
            .unsqueeze(0)
            .to(
                self.runtime.device
            )
        )


        facecrop_tensor = (
            torch.from_numpy(
                facecrop
            )
            .unsqueeze(0)
            .to(
                self.runtime.device
            )
        )


        # =========================
        # INFERENCE
        # =========================

        started_at = (
            time.perf_counter()
        )


        with torch.inference_mode():
            logits = (
                self.runtime.model(
                    hand_tensor,
                    pose_tensor,
                    facehead_tensor,
                    facecrop_tensor,
                )
            )


            probabilities = (
                torch.softmax(
                    logits,
                    dim=-1,
                )
            )


        inference_ms = (
            (
                time.perf_counter()
                - started_at
            )
            * 1000.0
        )


        # =========================
        # OUTPUT VALIDATION
        # =========================

        if (
            tuple(
                probabilities.shape
            )
            != (
                1,
                NUM_CLASSES,
            )
        ):
            raise RuntimeError(
                (
                    "Shape output inference "
                    f"salah: "
                    f"{tuple(probabilities.shape)}"
                )
            )


        if not torch.isfinite(
            probabilities
        ).all():
            raise RuntimeError(
                (
                    "Probabilitas model "
                    "mengandung NaN/Inf."
                )
            )


        probs = (
            probabilities[0]
            .detach()
            .cpu()
        )


        # =========================
        # TOP 3
        # =========================

        top_values, top_indices = (
            torch.topk(
                probs,
                k=3,
            )
        )


        top3 = []


        for (
            probability,
            class_index,
        ) in zip(
            top_values.tolist(),
            top_indices.tolist(),
        ):
            label = (
                self.runtime
                .class_mapping[
                    str(
                        class_index
                    )
                ]
            )


            top3.append(
                {
                    "class_id":
                        int(
                            class_index
                        ),

                    "label":
                        str(
                            label
                        ),

                    "confidence":
                        float(
                            probability
                        ),

                    "confidence_percent":
                        round(
                            float(
                                probability
                            )
                            * 100.0,
                            2,
                        ),
                }
            )


        winner = (
            top3[0]
        )


        return {
            "status":
                "ok",

            "class_id":
                winner[
                    "class_id"
                ],

            "label":
                winner[
                    "label"
                ],

            "confidence":
                winner[
                    "confidence"
                ],

            "confidence_percent":
                winner[
                    "confidence_percent"
                ],

            "top3":
                top3,

            "hand_present_frames":
                hand_present_frames,

            "inference_ms":
                round(
                    inference_ms,
                    2,
                ),
        }


# ============================================================
# SINGLETON
# ============================================================

bisindo_predictor = (
    BisindoPredictor()
)