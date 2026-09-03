import time

from app.preprocessing.multimodal_sequence import (
    FACE_HEAD_DIM,
    FEATURE_DIM,
    HAND_DIM,
    POSE_DIM,
    SEQ_LEN,
    MultimodalSequenceBuilder,
)


class RealtimeSequenceBuilder(
    MultimodalSequenceBuilder
):
    """
    Optimized realtime sequence builder.

    Bedanya dengan MultimodalSequenceBuilder biasa:

    add_frame()
        hanya:
        - parsing landmark frame sekarang
        - simpan raw record
        - update rolling buffer

    get_ready_sequences()
        baru:
        - build Hand134
        - build Pose36
        - build FaceHead52
        - build Multimodal222

    Dengan demikian preprocessing berat tidak
    dijalankan ulang pada setiap frame.

    Formula feature tetap berasal dari
    MultimodalSequenceBuilder asli.
    """

    def __init__(
        self,
        sequence_length=SEQ_LEN,
    ):
        super().__init__(
            sequence_length=sequence_length
        )

        self.last_record_ms = 0.0

        self.last_build_ms = 0.0

        self.total_builds = 0


    # ========================================================
    # RESET
    # ========================================================

    def reset(
        self,
    ):
        super().reset()

        self.last_record_ms = 0.0

        self.last_build_ms = 0.0

        self.total_builds = 0


    # ========================================================
    # ADD FRAME
    #
    # LAZY:
    # tidak menjalankan build_sequences()
    # ========================================================

    def add_frame(
        self,
        frame_id,
        landmarks,
    ):
        frame_id = int(
            frame_id
        )


        # ====================================================
        # CAMERA SESSION RESTART
        # ====================================================

        if (
            self.last_frame_id
            is not None
            and frame_id
            <= self.last_frame_id
        ):
            self.reset()


        started_at = (
            time.perf_counter()
        )


        # ====================================================
        # LANDMARK -> RAW RECORD
        # ====================================================

        record = (
            self._make_record(
                landmarks
            )
        )


        self.frames.append(
            record
        )


        self.last_frame_id = (
            frame_id
        )


        # Window berubah,
        # cached sequence tidak valid lagi.
        self.latest_sequences = (
            None
        )


        self.last_record_ms = (
            (
                time.perf_counter()
                - started_at
            )
            * 1000.0
        )


        # Belum ada full sequence build
        # pada frame ini.
        self.last_build_ms = 0.0


        count = len(
            self.frames
        )


        ready = (
            count
            == self.sequence_length
        )


        return {
            "count":
                count,

            "target":
                self.sequence_length,

            "ready":
                ready,

            # Sekarang ini hanya
            # biaya membuat raw record.
            "preprocessing_ms":
                round(
                    self.last_record_ms,
                    3,
                ),

            "sequence_build_ms":
                0.0,

            "shapes": {
                "hand": [
                    count,
                    HAND_DIM,
                ],

                "pose": [
                    count,
                    POSE_DIM,
                ],

                "facehead": [
                    count,
                    FACE_HEAD_DIM,
                ],

                "multimodal": [
                    count,
                    FEATURE_DIM,
                ],
            },
        }


    # ========================================================
    # BUILD ONLY WHEN NEEDED
    # ========================================================

    def get_ready_sequences(
        self,
    ):
        if (
            len(self.frames)
            != self.sequence_length
        ):
            return None


        started_at = (
            time.perf_counter()
        )


        sequences = (
            self.build_sequences()
        )


        self.last_build_ms = (
            (
                time.perf_counter()
                - started_at
            )
            * 1000.0
        )


        self.total_builds += 1


        self.latest_sequences = (
            sequences
        )


        return {
            key:
                value.copy()

            for (
                key,
                value,
            )
            in sequences.items()
        }


    # ========================================================
    # PERFORMANCE
    # ========================================================

    def get_performance(
        self,
    ):
        return {
            "record_ms":
                round(
                    self.last_record_ms,
                    3,
                ),

            "build_ms":
                round(
                    self.last_build_ms,
                    3,
                ),

            "total_builds":
                self.total_builds,
        }