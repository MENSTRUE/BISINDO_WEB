from collections import deque
from copy import deepcopy

import numpy as np


# ============================================================
# SEGMENTATION CONFIG
#
# Runtime heuristic.
# BUKAN parameter training.
# ============================================================

# Beberapa frame sebelum motion terdeteksi
# ikut dimasukkan ke gesture.
PRE_ROLL_FRAMES = 5


# Setelah motion berhenti,
# simpan sebagian tail supaya final pose
# masih terlihat.
POST_ROLL_FRAMES = 3


# Minimal panjang source gesture.
MIN_SEGMENT_FRAMES = 12


# Safety kalau user tidak pernah berhenti.
MAX_SEGMENT_FRAMES = 60


# Motion harus cukup besar untuk start.
START_MOTION_THRESHOLD = 0.010


# Motion di bawah nilai ini dianggap diam.
END_MOTION_THRESHOLD = 0.0045


# Start harus terlihat dua update berturut.
START_CONSECUTIVE_FRAMES = 2


# Diam sekian frame = gesture selesai.
END_STILL_FRAMES = 6


# Tangan hilang beberapa frame juga
# dianggap gesture selesai.
NO_HAND_END_FRAMES = 3


# Setelah prediction selesai,
# sistem harus stabil sebentar sebelum
# membuka gesture berikutnya.
REARM_MOTION_THRESHOLD = 0.0055
REARM_STILL_FRAMES = 4


# EMA motion.
MOTION_EMA_ALPHA = 0.65


# Titik representatif tangan:
# wrist + fingertips.
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
#
# Satu gesture = satu inference.
# Jadi kita pakai quality gate langsung,
# bukan rolling voting.
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
        return float(
            value
        )

    except (
        TypeError,
        ValueError,
    ):
        return float(
            default
        )


def hand_to_motion_points(
    points,
):
    if not isinstance(
        points,
        list,
    ):
        return None

    if len(points) < 21:
        return None


    output = []


    for index in (
        MOTION_POINT_INDICES
    ):
        point = (
            points[index]
        )

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


    confidence = (
        safe_float(
            raw_prediction.get(
                "confidence",
                0.0,
            )
        )
    )


    top3 = (
        raw_prediction.get(
            "top3",
            [],
        )
    )


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


    accepted = (
        raw_status
        == "ok"

        and confidence
        >= MIN_RESULT_CONFIDENCE

        and margin
        >= MIN_RESULT_MARGIN
    )


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

    elif accepted:
        status = (
            "accepted"
        )

    else:
        status = (
            "uncertain"
        )


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
            segment_info.get(
                "end_reason",
                "unknown",
            ),

        "peak_motion":
            segment_info.get(
                "peak_motion",
                0.0,
            ),

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
# SEGMENTER
# ============================================================

class IsolatedGestureSegmenter:
    """
    State:

    waiting
        ↓ motion
    recording
        ↓ still / hand release
    analyzing
        ↓ inference selesai
    cooldown
        ↓ diam sebentar
    waiting
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


            if (
                current is not None
                and previous is None
            ):
                entry_event = True


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


        if hand_motion_scores:
            raw_motion = max(
                hand_motion_scores
            )

        else:
            raw_motion = 0.0


        self.motion_score = (
            raw_motion
        )


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
    # SNAPSHOT
    # ========================================================

    def snapshot(
        self,
    ):
        return {
            "status":
                self.state,

            "reason":
                self.reason,

            "segment_id":
                self.current_segment_id,

            "source_frames":
                len(
                    self.current_frames
                ),

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

                "end_motion":
                    END_MOTION_THRESHOLD,

                "start_consecutive_frames":
                    START_CONSECUTIVE_FRAMES,

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


        self.current_frames = list(
            self.pre_roll
        )


        self.start_counter = 0

        self.still_frames = 0

        self.no_hand_frames = 0


        self.peak_motion = (
            self.motion_ema
        )


    # ========================================================
    # CANCEL SHORT SEGMENT
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

        self.peak_motion = 0.0

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
        # TRIM EXCESS STILL TAIL
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
        # TRIM EXCESS MISSING HAND TAIL
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


        completed = {
            "segment_id":
                self.current_segment_id,

            "frames":
                frames,

            "source_frames":
                len(
                    frames
                ),

            "end_reason":
                end_reason,

            "peak_motion":
                round(
                    self.peak_motion,
                    6,
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
    # OBSERVE
    # ========================================================

    def observe(
        self,
        frame_id,
        landmarks,
        current_hand_detected,
    ):
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
        #
        # Backend analysis synchronous.
        # Biasanya state ini langsung berubah
        # ke cooldown pada frame yang sama.
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
        # COOLDOWN / REARM
        # ====================================================

        if (
            self.state
            == "cooldown"
        ):
            self.pre_roll.append(
                frame_payload
            )


            is_rearmed = (
                not current_hand_detected

                or self.motion_ema
                <= REARM_MOTION_THRESHOLD
            )


            if is_rearmed:
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


            if not current_hand_detected:
                self.start_counter = 0

                self.reason = (
                    "waiting_for_hand"
                )

                self.motion_ema *= 0.75


                return (
                    self.snapshot(),
                    None,
                )


            # Hand baru masuk kamera merupakan
            # start cue yang kuat.
            if entry_event:
                self.start_counter = (
                    START_CONSECUTIVE_FRAMES
                )

            elif (
                self.motion_ema
                >= START_MOTION_THRESHOLD
            ):
                self.start_counter += 1

            else:
                self.start_counter = 0


            if (
                self.start_counter
                >= START_CONSECUTIVE_FRAMES
            ):
                self._start_recording()


                return (
                    self.snapshot(),
                    None,
                )


            self.reason = (
                "waiting_for_motion"
            )


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


            self.peak_motion = max(
                self.peak_motion,
                self.motion_ema,
            )


            # =================================================
            # HAND PRESENCE
            # =================================================

            if current_hand_detected:
                self.no_hand_frames = 0

            else:
                self.no_hand_frames += 1


            # =================================================
            # STILLNESS
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


            min_reached = (
                source_frames
                >= MIN_SEGMENT_FRAMES
            )


            # =================================================
            # FALSE START
            # =================================================

            if (
                not min_reached

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
            # MAX LENGTH
            # =================================================

            if (
                source_frames
                >= MAX_SEGMENT_FRAMES
            ):
                completed = (
                    self._finalize(
                        "max_length"
                    )
                )


                return (
                    self.snapshot(),
                    completed,
                )


            # =================================================
            # HAND RELEASE
            # =================================================

            if (
                min_reached

                and self.no_hand_frames
                >= NO_HAND_END_FRAMES
            ):
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
            # MOTION FINISHED
            # =================================================

            if (
                min_reached

                and self.still_frames
                >= END_STILL_FRAMES
            ):
                completed = (
                    self._finalize(
                        "still"
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

        self.pre_roll.clear()


        return self.snapshot()