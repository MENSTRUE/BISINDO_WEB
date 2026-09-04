from collections import deque
from copy import deepcopy

import numpy as np


# ============================================================
# SEGMENTATION CONFIG V2
#
# Runtime heuristic.
# BUKAN parameter training.
#
# Tuning berdasarkan log realtime:
#
# - false segment banyak di 13-15 frame
# - idle/jitter sempat mencapai sekitar 0.010-0.012
# - gesture valid berhasil di 20-41 frame
# - END terlalu ketat sehingga pernah mencapai max_length
# ============================================================


# Beberapa frame sebelum gesture benar-benar
# terdeteksi ikut dimasukkan sebagai konteks awal.
PRE_ROLL_FRAMES = 6


# Sisakan sedikit final pose setelah motion berhenti.
POST_ROLL_FRAMES = 4


# Segment pendek seperti 13-15 frame
# tidak langsung dianggap gesture valid.
MIN_SEGMENT_FRAMES = 18


# Safety maksimal.
#
# Dibuat sedikit lebih panjang daripada V1,
# tetapi result max_length tidak boleh langsung
# diterima sebagai kata valid.
MAX_SEGMENT_FRAMES = 72


# Gerakan minimum untuk MULAI gesture.
#
# V1 = 0.010
# Sekarang diperketat karena idle jitter
# sempat mendekati ~0.012.
START_MOTION_THRESHOLD = 0.015


# Motion yang kita hitung sebagai
# aktivitas nyata selama recording.
ACTIVE_MOTION_THRESHOLD = 0.010


# Gerakan di bawah nilai ini dianggap
# cukup diam untuk mengakhiri gesture.
#
# V1 = 0.0045
# Dibuat lebih toleran terhadap jitter MediaPipe.
END_MOTION_THRESHOLD = 0.0075


# Harus ada motion start berulang.
START_CONSECUTIVE_FRAMES = 2


# Segment harus mengandung minimal
# beberapa frame aktivitas nyata.
MIN_ACTIVE_MOTION_FRAMES = 3


# Diam 5 frame berturut-turut
# sekitar setengah detik pada ~10 FPS.
END_STILL_FRAMES = 5


# Kalau tangan benar-benar hilang,
# gesture bisa selesai lebih cepat.
NO_HAND_END_FRAMES = 2


# Setelah satu hasil keluar,
# tunggu kondisi cukup stabil sebelum
# menerima gesture baru.
REARM_MOTION_THRESHOLD = 0.008
REARM_STILL_FRAMES = 3


# EMA untuk motion.
MOTION_EMA_ALPHA = 0.60


# Wrist + fingertips.
#
# Cukup representatif untuk menangkap:
# - perpindahan tangan
# - perubahan posisi jari utama
MOTION_POINT_INDICES = (
    0,
    4,
    8,
    12,
    16,
    20,
)


# ============================================================
# RESULT ACCEPTANCE
# ============================================================

MIN_RESULT_CONFIDENCE = 0.70
MIN_RESULT_MARGIN = 0.10


# ============================================================
# HELPERS
# ============================================================

def safe_float(
    value,
    default=0.0,
):
    try:
        return float(value)

    except (
        TypeError,
        ValueError,
    ):
        return float(default)


def hand_to_motion_points(
    points,
):
    """
    Ambil titik tangan yang digunakan
    untuk estimasi motion realtime.
    """

    if not isinstance(
        points,
        list,
    ):
        return None

    if len(points) < 21:
        return None


    output = []


    for index in MOTION_POINT_INDICES:
        point = points[index]


        if not isinstance(
            point,
            dict,
        ):
            return None


        try:
            x = float(
                point["x"]
            )

            y = float(
                point["y"]
            )

        except (
            KeyError,
            TypeError,
            ValueError,
        ):
            return None


        if (
            not np.isfinite(x)
            or not np.isfinite(y)
        ):
            return None


        output.append(
            [
                x,
                y,
            ]
        )


    return np.asarray(
        output,
        dtype=np.float32,
    )


# ============================================================
# SEGMENT RESULT
# ============================================================

def build_segment_result(
    raw_prediction,
    segment_info,
    sequence_info,
):
    """
    Menggabungkan output model +
    metadata hasil gesture segmentation.

    Satu isolated gesture hanya melakukan
    satu inference.
    """

    raw_prediction = (
        raw_prediction
        if isinstance(
            raw_prediction,
            dict,
        )
        else {}
    )


    raw_status = (
        raw_prediction.get(
            "status",
            "idle",
        )
    )


    confidence = safe_float(
        raw_prediction.get(
            "confidence",
            0.0,
        )
    )


    top3 = (
        raw_prediction.get(
            "top3",
            [],
        )
    )


    # ========================================================
    # TOP-1 vs TOP-2 MARGIN
    # ========================================================

    second_confidence = 0.0


    if (
        isinstance(
            top3,
            list,
        )
        and len(top3) >= 2
        and isinstance(
            top3[1],
            dict,
        )
    ):
        second_confidence = (
            safe_float(
                top3[1].get(
                    "confidence",
                    0.0,
                )
            )
        )


    margin = max(
        0.0,
        confidence
        - second_confidence,
    )


    # ========================================================
    # SEGMENT QUALITY
    # ========================================================

    end_reason = (
        segment_info.get(
            "end_reason",
            "unknown",
        )
    )


    segment_quality_valid = bool(
        segment_info.get(
            "quality_valid",
            True,
        )
    )


    # Kalau recording terpaksa dipotong
    # karena MAX_SEGMENT_FRAMES,
    # jangan percaya hasilnya sebagai
    # kata final.
    boundary_valid = (
        end_reason
        != "max_length"
    )


    # ========================================================
    # ACCEPT
    # ========================================================

    accepted = (
        raw_status
        == "ok"

        and segment_quality_valid

        and boundary_valid

        and confidence
        >= MIN_RESULT_CONFIDENCE

        and margin
        >= MIN_RESULT_MARGIN
    )


    # ========================================================
    # STATUS
    # ========================================================

    if (
        raw_status
        == "model_not_loaded"
    ):
        status = (
            "model_not_loaded"
        )


    elif (
        raw_status
        == "waiting_for_hand"
    ):
        status = (
            "insufficient_hand"
        )


    elif (
        raw_status
        != "ok"
    ):
        status = (
            "error"
        )


    elif not segment_quality_valid:
        status = (
            "invalid_segment"
        )


    elif not boundary_valid:
        status = (
            "boundary_uncertain"
        )


    elif accepted:
        status = (
            "accepted"
        )


    else:
        status = (
            "uncertain"
        )


    # ========================================================
    # OUTPUT
    # ========================================================

    return {
        "status":
            status,

        "raw_status":
            raw_status,

        "accepted":
            accepted,

        "class_id":
            raw_prediction.get(
                "class_id"
            ),

        "label":
            raw_prediction.get(
                "label"
            ),

        "confidence":
            confidence,

        "confidence_percent":
            round(
                confidence
                * 100.0,
                2,
            ),

        "margin":
            margin,

        "margin_percent":
            round(
                margin
                * 100.0,
                2,
            ),

        "top3":
            top3
            if isinstance(
                top3,
                list,
            )
            else [],

        "hand_present_frames":
            int(
                raw_prediction.get(
                    "hand_present_frames",
                    0,
                )
                or 0
            ),

        "inference_ms":
            raw_prediction.get(
                "inference_ms"
            ),

        "segment_id":
            segment_info.get(
                "segment_id"
            ),

        "source_frames":
            sequence_info.get(
                "source_frames",
                0,
            ),

        "sampled_frames":
            sequence_info.get(
                "sampled_frames",
                48,
            ),

        "unique_sampled_frames":
            sequence_info.get(
                "unique_sampled_frames",
                0,
            ),

        "sequence_build_ms":
            sequence_info.get(
                "build_ms",
                0.0,
            ),

        "end_reason":
            end_reason,

        "peak_motion":
            segment_info.get(
                "peak_motion",
                0.0,
            ),

        "active_motion_frames":
            segment_info.get(
                "active_motion_frames",
                0,
            ),

        "motion_ratio":
            segment_info.get(
                "motion_ratio",
                0.0,
            ),

        "segment_quality_valid":
            segment_quality_valid,

        "thresholds": {
            "min_confidence":
                MIN_RESULT_CONFIDENCE,

            "min_confidence_percent":
                round(
                    MIN_RESULT_CONFIDENCE
                    * 100.0,
                    2,
                ),

            "min_margin":
                MIN_RESULT_MARGIN,

            "min_margin_percent":
                round(
                    MIN_RESULT_MARGIN
                    * 100.0,
                    2,
                ),
        },
    }


# ============================================================
# ISOLATED GESTURE SEGMENTER
# ============================================================

class IsolatedGestureSegmenter:
    """
    State machine:

        WAITING
           ↓
       actual motion
           ↓
       RECORDING
           ↓
       still / release
           ↓
       ANALYZING
           ↓
       COOLDOWN
           ↓
        WAITING


    Perbaikan V2:

    1. Tangan MASUK frame saja
       tidak langsung dianggap gesture.

    2. Harus ada motion nyata.

    3. Segment terlalu pendek / minim aktivitas
       dibatalkan sebelum inference.

    4. END threshold lebih toleran
       terhadap jitter MediaPipe.

    5. Segment yang mentok max_length
       tidak boleh diterima sebagai word final.
    """


    def __init__(
        self,
    ):
        self.segment_counter = 0


        self.reset(
            reset_counter=False
        )


    # ========================================================
    # RESET
    # ========================================================

    def reset(
        self,
        reset_counter=True,
    ):
        if reset_counter:
            self.segment_counter = 0


        self.state = (
            "waiting"
        )


        self.reason = (
            "waiting_for_gesture"
        )


        self.pre_roll = deque(
            maxlen=PRE_ROLL_FRAMES
        )


        self.current_frames = []


        self.previous_hands = {
            "leftHand":
                None,

            "rightHand":
                None,
        }


        self.motion_score = 0.0

        self.motion_ema = 0.0

        self.peak_motion = 0.0


        self.start_counter = 0

        self.still_frames = 0

        self.no_hand_frames = 0

        self.rearm_still_frames = 0


        self.active_motion_frames = 0


        self.current_segment_id = None


        self.last_result = None

        self.result_event = False


    # ========================================================
    # MOTION
    # ========================================================

    def _measure_motion(
        self,
        landmarks,
    ):
        landmarks = (
            landmarks
            if isinstance(
                landmarks,
                dict,
            )
            else {}
        )


        current_hands = {}

        hand_motion_scores = []

        entry_event = False


        for key in (
            "leftHand",
            "rightHand",
        ):
            current = (
                hand_to_motion_points(
                    landmarks.get(
                        key,
                        [],
                    )
                )
            )


            previous = (
                self.previous_hands.get(
                    key
                )
            )


            # =================================================
            # HAND ENTERED
            # =================================================

            if (
                current is not None
                and previous is None
            ):
                entry_event = True


            # =================================================
            # MOTION DIFFERENCE
            # =================================================

            if (
                current is not None
                and previous is not None
                and current.shape
                == previous.shape
            ):
                distances = (
                    np.linalg.norm(
                        current
                        - previous,
                        axis=1,
                    )
                )


                if (
                    distances.size
                    > 0
                ):
                    hand_motion_scores.append(
                        float(
                            np.median(
                                distances
                            )
                        )
                    )


            current_hands[key] = (
                current
            )


        self.previous_hands = (
            current_hands
        )


        # ====================================================
        # CURRENT MOTION
        # ====================================================

        if hand_motion_scores:
            raw_motion = max(
                hand_motion_scores
            )

        else:
            raw_motion = 0.0


        self.motion_score = (
            raw_motion
        )


        # ====================================================
        # EMA
        # ====================================================

        self.motion_ema = (
            MOTION_EMA_ALPHA
            * raw_motion

            + (
                1.0
                - MOTION_EMA_ALPHA
            )
            * self.motion_ema
        )


        return (
            raw_motion,
            entry_event,
        )


    # ========================================================
    # FRAME PAYLOAD
    # ========================================================

    @staticmethod
    def _make_frame(
        frame_id,
        landmarks,
    ):
        return {
            "frame_id":
                int(
                    frame_id
                ),

            "landmarks":
                deepcopy(
                    landmarks
                ),
        }


    # ========================================================
    # QUALITY CHECK
    # ========================================================

    def _quality_valid(
        self,
        frame_count=None,
    ):
        if frame_count is None:
            total_frames = len(
                self.current_frames
            )

        else:
            total_frames = int(
                frame_count
            )


        return (
            total_frames
            >= MIN_SEGMENT_FRAMES

            and self.active_motion_frames
            >= MIN_ACTIVE_MOTION_FRAMES

            and self.peak_motion
            >= START_MOTION_THRESHOLD
        )


    # ========================================================
    # SNAPSHOT
    # ========================================================

    def snapshot(
        self,
    ):
        current_length = len(
            self.current_frames
        )


        if current_length > 0:
            motion_ratio = (
                self.active_motion_frames
                / current_length
            )

        else:
            motion_ratio = 0.0


        return {
            "status":
                self.state,

            "reason":
                self.reason,

            "segment_id":
                self.current_segment_id,

            "source_frames":
                current_length,

            "pre_roll_frames":
                len(
                    self.pre_roll
                ),

            "motion_score":
                round(
                    self.motion_score,
                    6,
                ),

            "motion_ema":
                round(
                    self.motion_ema,
                    6,
                ),

            "peak_motion":
                round(
                    self.peak_motion,
                    6,
                ),

            "active_motion_frames":
                self.active_motion_frames,

            "motion_ratio":
                round(
                    motion_ratio,
                    4,
                ),

            "start_counter":
                self.start_counter,

            "still_frames":
                self.still_frames,

            "no_hand_frames":
                self.no_hand_frames,

            "rearm_still_frames":
                self.rearm_still_frames,

            "result_event":
                bool(
                    self.result_event
                ),

            "last_result":
                self.last_result,

            "thresholds": {
                "start_motion":
                    START_MOTION_THRESHOLD,

                "active_motion":
                    ACTIVE_MOTION_THRESHOLD,

                "end_motion":
                    END_MOTION_THRESHOLD,

                "start_consecutive_frames":
                    START_CONSECUTIVE_FRAMES,

                "min_active_motion_frames":
                    MIN_ACTIVE_MOTION_FRAMES,

                "end_still_frames":
                    END_STILL_FRAMES,

                "pre_roll_frames":
                    PRE_ROLL_FRAMES,

                "post_roll_frames":
                    POST_ROLL_FRAMES,

                "min_segment_frames":
                    MIN_SEGMENT_FRAMES,

                "max_segment_frames":
                    MAX_SEGMENT_FRAMES,

                "rearm_motion":
                    REARM_MOTION_THRESHOLD,

                "rearm_still_frames":
                    REARM_STILL_FRAMES,
            },
        }


    # ========================================================
    # START RECORDING
    # ========================================================

    def _start_recording(
        self,
    ):
        self.segment_counter += 1


        self.current_segment_id = (
            self.segment_counter
        )


        self.state = (
            "recording"
        )


        self.reason = (
            "gesture_started"
        )


        # Pre-roll sudah mencakup beberapa
        # frame sebelum gesture benar-benar aktif.
        self.current_frames = list(
            self.pre_roll
        )


        self.start_counter = 0

        self.still_frames = 0

        self.no_hand_frames = 0


        # Frame yang men-trigger start
        # sudah termasuk motion nyata.
        self.active_motion_frames = 1


        self.peak_motion = (
            self.motion_ema
        )


    # ========================================================
    # CANCEL RECORDING
    # ========================================================

    def _cancel_recording(
        self,
        reason,
    ):
        self.state = (
            "waiting"
        )


        self.reason = (
            reason
        )


        self.current_frames = []


        self.current_segment_id = (
            None
        )


        self.start_counter = 0

        self.still_frames = 0

        self.no_hand_frames = 0

        self.active_motion_frames = 0


        self.peak_motion = 0.0


        # Jangan bawa motion lama terlalu kuat
        # ke candidate berikutnya.
        self.motion_ema *= 0.50


        self.pre_roll.clear()


    # ========================================================
    # FINALIZE
    # ========================================================

    def _finalize(
        self,
        end_reason,
    ):
        frames = list(
            self.current_frames
        )


        # ====================================================
        # TRIM STILL TAIL
        # ====================================================

        if (
            end_reason
            == "still"
        ):
            excess_still = max(
                0,

                self.still_frames
                - POST_ROLL_FRAMES,
            )


            if (
                excess_still > 0

                and (
                    len(frames)
                    - excess_still
                )
                >= MIN_SEGMENT_FRAMES
            ):
                frames = (
                    frames[
                        :-excess_still
                    ]
                )


        # ====================================================
        # TRIM MISSING-HAND TAIL
        # ====================================================

        if (
            end_reason
            == "hand_released"
        ):
            excess_missing = max(
                0,

                self.no_hand_frames
                - 1,
            )


            if (
                excess_missing > 0

                and (
                    len(frames)
                    - excess_missing
                )
                >= MIN_SEGMENT_FRAMES
            ):
                frames = (
                    frames[
                        :-excess_missing
                    ]
                )


        source_frames = len(
            frames
        )


        if source_frames > 0:
            motion_ratio = (
                self.active_motion_frames
                / source_frames
            )

        else:
            motion_ratio = 0.0


        completed = {
            "segment_id":
                self.current_segment_id,

            "frames":
                frames,

            "source_frames":
                source_frames,

            "end_reason":
                end_reason,

            "peak_motion":
                round(
                    self.peak_motion,
                    6,
                ),

            "active_motion_frames":
                self.active_motion_frames,

            "motion_ratio":
                round(
                    motion_ratio,
                    4,
                ),

            "quality_valid":
                self._quality_valid(
                    source_frames
                ),
        }


        self.state = (
            "analyzing"
        )


        self.reason = (
            "segment_complete"
        )


        self.current_frames = []


        self.pre_roll.clear()


        self.still_frames = 0

        self.no_hand_frames = 0


        return completed


    # ========================================================
    # OBSERVE FRAME
    # ========================================================

    def observe(
        self,
        frame_id,
        landmarks,
        current_hand_detected,
    ):
        # Result event hanya hidup satu update.
        self.result_event = False


        (
            _,
            entry_event,
        ) = self._measure_motion(
            landmarks
        )


        frame_payload = (
            self._make_frame(
                frame_id,
                landmarks,
            )
        )


        # ====================================================
        # ANALYZING
        # ====================================================

        if (
            self.state
            == "analyzing"
        ):
            return (
                self.snapshot(),
                None,
            )


        # ====================================================
        # COOLDOWN
        # ====================================================

        if (
            self.state
            == "cooldown"
        ):
            self.pre_roll.append(
                frame_payload
            )


            rearm_condition = (
                not current_hand_detected

                or self.motion_ema
                <= REARM_MOTION_THRESHOLD
            )


            if rearm_condition:
                self.rearm_still_frames += 1

            else:
                self.rearm_still_frames = 0


            if (
                self.rearm_still_frames
                >= REARM_STILL_FRAMES
            ):
                self.state = (
                    "waiting"
                )


                self.reason = (
                    "ready_for_next_gesture"
                )


                self.rearm_still_frames = 0

                self.start_counter = 0


                self.current_segment_id = (
                    None
                )


            return (
                self.snapshot(),
                None,
            )


        # ====================================================
        # WAITING
        # ====================================================

        if (
            self.state
            == "waiting"
        ):
            self.pre_roll.append(
                frame_payload
            )


            # =================================================
            # NO HAND
            # =================================================

            if not current_hand_detected:
                self.start_counter = 0


                self.reason = (
                    "waiting_for_hand"
                )


                self.motion_ema *= 0.70


                return (
                    self.snapshot(),
                    None,
                )


            # =================================================
            # HAND ENTRY
            #
            # Perubahan penting:
            # hand entry TIDAK langsung start.
            # Hanya memberi 1 candidate count.
            # =================================================

            if entry_event:
                self.start_counter = max(
                    self.start_counter,
                    1,
                )


                self.reason = (
                    "hand_entered"
                )


            # =================================================
            # TRUE MOTION
            # =================================================

            elif (
                self.motion_ema
                >= START_MOTION_THRESHOLD
            ):
                self.start_counter += 1


                self.reason = (
                    "motion_candidate"
                )


            # =================================================
            # IDLE / JITTER
            # =================================================

            else:
                self.start_counter = max(
                    0,

                    self.start_counter
                    - 1,
                )


                self.reason = (
                    "waiting_for_motion"
                )


            # =================================================
            # START
            # =================================================

            if (
                self.start_counter
                >= START_CONSECUTIVE_FRAMES
            ):
                self._start_recording()


            return (
                self.snapshot(),
                None,
            )


        # ====================================================
        # RECORDING
        # ====================================================

        if (
            self.state
            == "recording"
        ):
            self.current_frames.append(
                frame_payload
            )


            # =================================================
            # PEAK MOTION
            # =================================================

            self.peak_motion = max(
                self.peak_motion,
                self.motion_ema,
            )


            # =================================================
            # ACTIVE MOTION COUNT
            # =================================================

            if (
                self.motion_ema
                >= ACTIVE_MOTION_THRESHOLD
            ):
                self.active_motion_frames += 1


            # =================================================
            # HAND PRESENCE
            # =================================================

            if current_hand_detected:
                self.no_hand_frames = 0

            else:
                self.no_hand_frames += 1


            # =================================================
            # STILLNESS
            #
            # END threshold dibuat lebih toleran
            # supaya jitter MediaPipe ~0.005
            # tidak membuat recording terus hidup.
            # =================================================

            if (
                current_hand_detected

                and self.motion_ema
                <= END_MOTION_THRESHOLD
            ):
                self.still_frames += 1

            else:
                self.still_frames = 0


            source_frames = len(
                self.current_frames
            )


            min_length_reached = (
                source_frames
                >= MIN_SEGMENT_FRAMES
            )


            quality_ready = (
                self.active_motion_frames
                >= MIN_ACTIVE_MOTION_FRAMES

                and self.peak_motion
                >= START_MOTION_THRESHOLD
            )


            # =================================================
            # SHORT FALSE SEGMENT
            # =================================================

            if (
                not min_length_reached

                and self.no_hand_frames
                >= NO_HAND_END_FRAMES
            ):
                self._cancel_recording(
                    "short_segment_cancelled"
                )


                return (
                    self.snapshot(),
                    None,
                )


            # =================================================
            # HAND RELEASE END
            # =================================================

            if (
                min_length_reached

                and self.no_hand_frames
                >= NO_HAND_END_FRAMES
            ):
                if not quality_ready:
                    self._cancel_recording(
                        "low_activity_cancelled"
                    )


                    return (
                        self.snapshot(),
                        None,
                    )


                completed = (
                    self._finalize(
                        "hand_released"
                    )
                )


                return (
                    self.snapshot(),
                    completed,
                )


            # =================================================
            # STILL END
            # =================================================

            if (
                min_length_reached

                and self.still_frames
                >= END_STILL_FRAMES
            ):
                if not quality_ready:
                    self._cancel_recording(
                        "low_activity_cancelled"
                    )


                    return (
                        self.snapshot(),
                        None,
                    )


                completed = (
                    self._finalize(
                        "still"
                    )
                )


                return (
                    self.snapshot(),
                    completed,
                )


            # =================================================
            # MAX LENGTH SAFETY
            # =================================================

            if (
                source_frames
                >= MAX_SEGMENT_FRAMES
            ):
                if not quality_ready:
                    self._cancel_recording(
                        "max_length_cancelled"
                    )


                    return (
                        self.snapshot(),
                        None,
                    )


                completed = (
                    self._finalize(
                        "max_length"
                    )
                )


                return (
                    self.snapshot(),
                    completed,
                )


            self.reason = (
                "recording_gesture"
            )


            return (
                self.snapshot(),
                None,
            )


        # ====================================================
        # FALLBACK
        # ====================================================

        self._cancel_recording(
            "state_recovered"
        )


        return (
            self.snapshot(),
            None,
        )


    # ========================================================
    # FINISH ANALYSIS
    # ========================================================

    def finish_analysis(
        self,
        result,
    ):
        self.last_result = (
            result
        )


        self.result_event = True


        self.state = (
            "cooldown"
        )


        if (
            isinstance(
                result,
                dict,
            )

            and result.get(
                "accepted",
                False,
            )
        ):
            self.reason = (
                "word_accepted"
            )

        else:
            self.reason = (
                "prediction_uncertain"
            )


        self.current_segment_id = (
            result.get(
                "segment_id"
            )

            if isinstance(
                result,
                dict,
            )

            else None
        )


        self.rearm_still_frames = 0


        self.motion_ema = 0.0

        self.active_motion_frames = 0


        self.pre_roll.clear()


        return self.snapshot()