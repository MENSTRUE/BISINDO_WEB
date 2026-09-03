import time

import numpy as np

from app.preprocessing.multimodal_sequence import (
    FACE_HEAD_DIM,
    HAND_DIM,
    POSE_DIM,
    SEQ_LEN,
    MultimodalSequenceBuilder,
)


# ============================================================
# EXACT TRAINING TEMPORAL SAMPLING
# ============================================================

def uniform_indices(
    total_frames,
    seq_len=SEQ_LEN,
):
    """
    Sama dengan preprocessing training:

    np.linspace(
        0,
        total_frames - 1,
        seq_len
    ).round().astype(np.int64)

    Kalau source frame < 48,
    beberapa indeks otomatis berulang.

    Kalau source frame > 48,
    48 frame dipilih merata dari
    seluruh gesture.
    """

    total_frames = int(
        total_frames
    )

    seq_len = int(
        seq_len
    )

    if total_frames <= 0:
        raise ValueError(
            "Gesture tidak memiliki frame."
        )

    if total_frames <= 1:
        return np.zeros(
            seq_len,
            dtype=np.int64,
        )

    return (
        np.linspace(
            0,
            total_frames - 1,
            seq_len,
        )
        .round()
        .astype(
            np.int64
        )
    )


# ============================================================
# ISOLATED SEQUENCE BUILDER
# ============================================================

class IsolatedSequenceBuilder:
    """
    Mengubah SATU segment gesture menjadi
    input model 48 frame.

    Langkah:
    1. menerima N landmark frame
    2. uniform sample N -> 48
    3. jalankan preprocessing training:
       - Hand134
       - Pose36
       - FaceHead52
       - gap recovery
       - EMA
       - body normalization
    4. output tepat:
       hand     (48, 134)
       pose     (48, 36)
       facehead (48, 52)
    """

    def __init__(
        self,
        sequence_length=SEQ_LEN,
    ):
        self.sequence_length = int(
            sequence_length
        )

        self.builder = (
            MultimodalSequenceBuilder(
                sequence_length=(
                    self.sequence_length
                )
            )
        )

        self.last_build_ms = 0.0


    # ========================================================
    # RESET
    # ========================================================

    def reset(
        self,
    ):
        self.builder.reset()

        self.last_build_ms = 0.0


    # ========================================================
    # EXTRACT LANDMARK PAYLOAD
    # ========================================================

    @staticmethod
    def _get_landmarks(
        frame,
    ):
        if not isinstance(
            frame,
            dict,
        ):
            raise ValueError(
                "Frame gesture harus dictionary."
            )

        if (
            "landmarks"
            in frame
        ):
            landmarks = (
                frame[
                    "landmarks"
                ]
            )
        else:
            landmarks = (
                frame
            )

        if not isinstance(
            landmarks,
            dict,
        ):
            raise ValueError(
                "Landmark gesture tidak valid."
            )

        return landmarks


    # ========================================================
    # BUILD
    # ========================================================

    def build(
        self,
        landmark_frames,
    ):
        frames = list(
            landmark_frames
        )

        source_frames = len(
            frames
        )

        if source_frames <= 0:
            raise ValueError(
                "Segment gesture kosong."
            )


        # ====================================================
        # EXACT UNIFORM SAMPLING
        # ====================================================

        sampled_indices = (
            uniform_indices(
                source_frames,
                self.sequence_length,
            )
        )


        self.builder.reset()


        started_at = (
            time.perf_counter()
        )


        # ====================================================
        # LANDMARK -> RAW RECORD
        #
        # Penting:
        # preprocessing dilakukan SETELAH
        # temporal sampling, mengikuti konsep
        # preprocessing training.
        # ====================================================

        for source_index in (
            sampled_indices
        ):
            source_frame = (
                frames[
                    int(
                        source_index
                    )
                ]
            )

            landmarks = (
                self._get_landmarks(
                    source_frame
                )
            )

            record = (
                self.builder
                ._make_record(
                    landmarks
                )
            )

            self.builder.frames.append(
                record
            )


        # ====================================================
        # EXACT FEATURE BUILD
        # ====================================================

        sequences = (
            self.builder
            .build_sequences()
        )


        self.last_build_ms = (
            (
                time.perf_counter()
                - started_at
            )
            * 1000.0
        )


        # ====================================================
        # VALIDATION
        # ====================================================

        expected_shapes = {
            "hand": (
                self.sequence_length,
                HAND_DIM,
            ),

            "pose": (
                self.sequence_length,
                POSE_DIM,
            ),

            "facehead": (
                self.sequence_length,
                FACE_HEAD_DIM,
            ),
        }


        for (
            name,
            expected,
        ) in expected_shapes.items():
            actual = (
                np.asarray(
                    sequences[
                        name
                    ]
                )
            )

            if (
                tuple(
                    actual.shape
                )
                != expected
            ):
                raise RuntimeError(
                    (
                        f"Shape sequence {name} salah. "
                        f"Expected {expected}, "
                        f"got {actual.shape}."
                    )
                )

            if not np.isfinite(
                actual
            ).all():
                raise RuntimeError(
                    (
                        f"Sequence {name} "
                        "mengandung NaN/Inf."
                    )
                )


        output = {
            key:
                value.copy()

            for (
                key,
                value,
            )
            in sequences.items()
        }


        metadata = {
            "source_frames":
                source_frames,

            "sampled_frames":
                self.sequence_length,

            "unique_sampled_frames":
                int(
                    len(
                        np.unique(
                            sampled_indices
                        )
                    )
                ),

            "sampled_indices":
                sampled_indices
                .astype(int)
                .tolist(),

            "build_ms":
                round(
                    self.last_build_ms,
                    2,
                ),
        }


        self.builder.reset()


        return (
            output,
            metadata,
        )