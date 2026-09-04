import base64
import time

from collections import Counter, deque
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.inference.model_runtime import model_runtime
from app.inference.predictor import bisindo_predictor
from app.preprocessing.realtime_sequence import RealtimeSequenceBuilder
from app.services.landmark_extractor import LandmarkExtractor


router = APIRouter(
    tags=["Realtime"],
)


# ============================================================
# FRAME / TRANSPORT
# ============================================================

MAX_FRAME_BYTES = 2_000_000


# ============================================================
# CONTINUOUS RECOGNITION CONFIG
#
# Disamakan dengan baseline Python lokal:
# - rolling 48 frame
# - inference setiap 2 frame
# - vote window 3
# - minimal 2 vote
# - confidence 0.75
# - margin 0.10
# - valid hand ratio 0.25
# - same-label rearm setelah 3 inference netral
# - change cooldown 0.20 detik
# ============================================================

SEQUENCE_LENGTH = 48
INFER_EVERY = 2

MIN_CONFIDENCE = 0.75
MIN_MARGIN = 0.10
MIN_VALID_RATIO = 0.25

VOTE_WINDOW = 3
VOTE_HITS = 2

CHANGE_COOLDOWN_SECONDS = 0.20
NEUTRAL_RESET_HITS = 3


# ============================================================
# HELPERS
# ============================================================

def utc_now():
    return datetime.now(
        timezone.utc,
    ).isoformat()


def decode_frame_base64(
    image_base64: str,
) -> bytes:
    if not image_base64:
        raise ValueError(
            "Frame kosong."
        )

    try:
        frame_bytes = base64.b64decode(
            image_base64,
            validate=True,
        )

    except Exception as error:
        raise ValueError(
            "Frame bukan Base64 valid."
        ) from error

    if not frame_bytes:
        raise ValueError(
            "Frame hasil decode kosong."
        )

    if len(frame_bytes) > MAX_FRAME_BYTES:
        raise ValueError(
            "Ukuran frame terlalu besar."
        )

    return frame_bytes


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


def prediction_margin(
    raw_prediction,
):
    if not isinstance(
        raw_prediction,
        dict,
    ):
        return 0.0

    confidence = safe_float(
        raw_prediction.get(
            "confidence",
            0.0,
        )
    )

    top3 = raw_prediction.get(
        "top3",
        [],
    )

    second = 0.0

    if (
        isinstance(top3, list)
        and len(top3) >= 2
        and isinstance(top3[1], dict)
    ):
        second = safe_float(
            top3[1].get(
                "confidence",
                0.0,
            )
        )

    return max(
        0.0,
        confidence - second,
    )


def build_segment_compat(
    window_count,
    accepted_event,
    event_id,
    inference_performed,
):
    """
    Payload compatibility untuk frontend lama.

    Ini BUKAN isolated segmentation lagi.
    Field `segment` hanya dipakai agar hook/UI lama
    tetap dapat menampilkan warm-up / accepted state.
    """

    ready = (
        int(window_count)
        >= SEQUENCE_LENGTH
    )

    if not ready:
        status = "recording"
        reason = "rolling_warmup"

    elif accepted_event:
        status = "cooldown"
        reason = "word_accepted"

    elif inference_performed:
        status = "waiting"
        reason = "rolling_inference"

    else:
        status = "waiting"
        reason = "rolling_ready"

    return {
        "status": status,
        "reason": reason,
        "segment_id": (
            event_id
            if event_id > 0
            else None
        ),
        "source_frames": int(window_count),
        "pre_roll_frames": 0,
        "motion_score": 0.0,
        "motion_ema": 0.0,
        "peak_motion": 0.0,
        "start_counter": 0,
        "still_frames": 0,
        "no_hand_frames": 0,
        "rearm_still_frames": 0,
        "result_event": bool(
            accepted_event
        ),
        "thresholds": {
            "start_motion": 0.0,
            "end_motion": 0.0,
            "start_consecutive_frames": 0,
            "end_still_frames": 0,
            "pre_roll_frames": 0,
            "post_roll_frames": 0,
            "min_segment_frames": SEQUENCE_LENGTH,
            "max_segment_frames": SEQUENCE_LENGTH,
            "rearm_motion": 0.0,
            "rearm_still_frames": NEUTRAL_RESET_HITS,
        },
    }


def build_prediction_payload(
    *,
    display_prediction,
    raw_prediction,
    inference_performed,
    accepted_event,
    event_id,
    build_ms,
    history_size,
    stable_votes,
    neutral_streak,
    same_label_rearmed,
):
    raw_prediction = (
        raw_prediction
        if isinstance(raw_prediction, dict)
        else {}
    )

    display_prediction = (
        display_prediction
        if isinstance(display_prediction, dict)
        else None
    )

    raw_confidence = safe_float(
        raw_prediction.get(
            "confidence",
            0.0,
        )
    )

    raw_margin = prediction_margin(
        raw_prediction
    )

    raw_hand_present_frames = int(
        raw_prediction.get(
            "hand_present_frames",
            0,
        )
        or 0
    )

    valid_ratio = (
        raw_hand_present_frames
        / SEQUENCE_LENGTH
    )

    if display_prediction is not None:
        label = display_prediction.get(
            "label"
        )

        class_id = display_prediction.get(
            "class_id"
        )

        confidence = safe_float(
            display_prediction.get(
                "confidence",
                0.0,
            )
        )

        margin = safe_float(
            display_prediction.get(
                "margin",
                0.0,
            )
        )

        accepted = bool(label)

        status = (
            "accepted"
            if accepted_event
            else "holding"
        )

    else:
        label = raw_prediction.get(
            "label"
        )

        class_id = raw_prediction.get(
            "class_id"
        )

        confidence = raw_confidence
        margin = raw_margin
        accepted = False

        raw_status = raw_prediction.get(
            "status",
            "idle",
        )

        if raw_status == "model_not_loaded":
            status = "model_not_loaded"
        elif raw_status == "waiting_for_hand":
            status = "waiting_for_hand"
        elif inference_performed:
            status = "stabilizing"
        else:
            status = "idle"

    return {
        "status": status,
        "raw_status": raw_prediction.get(
            "status",
            "idle",
        ),
        "accepted": accepted,
        "result_event": bool(
            inference_performed
        ),
        "accepted_event": bool(
            accepted_event
        ),
        "class_id": class_id,
        "label": label,
        "confidence": confidence,
        "confidence_percent": round(
            confidence * 100.0,
            2,
        ),
        "margin": margin,
        "margin_percent": round(
            margin * 100.0,
            2,
        ),
        "top3": (
            raw_prediction.get(
                "top3",
                [],
            )
            if isinstance(
                raw_prediction.get(
                    "top3",
                    [],
                ),
                list,
            )
            else []
        ),
        "hand_present_frames": (
            raw_hand_present_frames
        ),
        "valid_ratio": round(
            valid_ratio,
            4,
        ),
        "valid_ratio_percent": round(
            valid_ratio * 100.0,
            2,
        ),
        "inference_ms": raw_prediction.get(
            "inference_ms"
        ),
        "segment_id": (
            event_id
            if event_id > 0
            else None
        ),
        "source_frames": SEQUENCE_LENGTH,
        "sampled_frames": SEQUENCE_LENGTH,
        "unique_sampled_frames": SEQUENCE_LENGTH,
        "sequence_build_ms": round(
            safe_float(build_ms),
            2,
        ),
        "end_reason": "rolling_window",
        "peak_motion": 0.0,
        "votes": int(
            stable_votes
        ),
        "required_votes": VOTE_HITS,
        "window_size": int(
            history_size
        ),
        "vote_window": VOTE_WINDOW,
        "neutral_streak": int(
            neutral_streak
        ),
        "same_label_rearmed": bool(
            same_label_rearmed
        ),
        "raw_class_id": raw_prediction.get(
            "class_id"
        ),
        "raw_label": raw_prediction.get(
            "label"
        ),
        "raw_confidence": raw_confidence,
        "raw_confidence_percent": round(
            raw_confidence * 100.0,
            2,
        ),
        "raw_margin": raw_margin,
        "raw_margin_percent": round(
            raw_margin * 100.0,
            2,
        ),
        "thresholds": {
            "min_confidence": MIN_CONFIDENCE,
            "min_confidence_percent": round(
                MIN_CONFIDENCE * 100.0,
                2,
            ),
            "min_margin": MIN_MARGIN,
            "min_margin_percent": round(
                MIN_MARGIN * 100.0,
                2,
            ),
            "min_valid_ratio": MIN_VALID_RATIO,
            "min_valid_ratio_percent": round(
                MIN_VALID_RATIO * 100.0,
                2,
            ),
            "min_votes": VOTE_HITS,
            "vote_window": VOTE_WINDOW,
            "infer_every": INFER_EVERY,
            "neutral_reset_hits": NEUTRAL_RESET_HITS,
            "change_cooldown_seconds": (
                CHANGE_COOLDOWN_SECONDS
            ),
        },
    }


# ============================================================
# WEBSOCKET REALTIME
# ============================================================

@router.websocket(
    "/ws/realtime"
)
async def realtime_websocket(
    websocket: WebSocket,
):
    await websocket.accept()

    # ========================================================
    # SESSION STATE
    # ========================================================

    frame_count = 0
    last_client_frame_id = None

    sequence_builder = (
        RealtimeSequenceBuilder(
            sequence_length=(
                SEQUENCE_LENGTH
            )
        )
    )

    extractor = LandmarkExtractor()

    prediction_history = deque(
        maxlen=VOTE_WINDOW,
    )

    raw_prediction = None
    display_prediction = None

    last_emit_label = None
    last_emit_time = 0.0

    same_label_rearmed = True
    neutral_streak = 0

    accepted_event_counter = 0

    stable_votes = 0

    # ========================================================
    # LOCAL RESET HELPER
    # ========================================================

    def reset_runtime_state():
        nonlocal frame_count
        nonlocal last_client_frame_id
        nonlocal raw_prediction
        nonlocal display_prediction
        nonlocal last_emit_label
        nonlocal last_emit_time
        nonlocal same_label_rearmed
        nonlocal neutral_streak
        nonlocal accepted_event_counter
        nonlocal stable_votes

        frame_count = 0
        last_client_frame_id = None

        sequence_builder.reset()

        prediction_history.clear()

        raw_prediction = None
        display_prediction = None

        last_emit_label = None
        last_emit_time = 0.0

        same_label_rearmed = True
        neutral_streak = 0

        accepted_event_counter = 0
        stable_votes = 0

    # ========================================================
    # CONNECTION READY
    # ========================================================

    await websocket.send_json(
        {
            "type": "connection",
            "status": "connected",
            "message": (
                "BISINDO continuous rolling "
                "recognition ready."
            ),
            "vision": "ready",
            "recognition_mode": (
                "continuous_rolling"
            ),
            "sequence_target": (
                SEQUENCE_LENGTH
            ),
            "infer_every": (
                INFER_EVERY
            ),
            "vote_window": (
                VOTE_WINDOW
            ),
            "vote_hits": (
                VOTE_HITS
            ),
            "model_loaded": (
                model_runtime.loaded
            ),
            "model_status": (
                model_runtime.status
            ),
            "server_time": utc_now(),
        }
    )

    try:
        while True:
            message = (
                await websocket.receive_json()
            )

            message_type = message.get(
                "type",
                "unknown",
            )

            # =================================================
            # PING
            # =================================================

            if message_type == "ping":
                await websocket.send_json(
                    {
                        "type": "pong",
                        "status": "ok",
                        "model_loaded": (
                            model_runtime.loaded
                        ),
                        "server_time": utc_now(),
                    }
                )
                continue

            # =================================================
            # CLIENT HELLO
            # =================================================

            if message_type == "client_hello":
                await websocket.send_json(
                    {
                        "type": "hello_ack",
                        "status": "ok",
                        "message": (
                            "BISINDO frontend connected."
                        ),
                        "vision": "ready",
                        "recognition_mode": (
                            "continuous_rolling"
                        ),
                        "sequence_target": (
                            SEQUENCE_LENGTH
                        ),
                        "infer_every": (
                            INFER_EVERY
                        ),
                        "vote_window": (
                            VOTE_WINDOW
                        ),
                        "vote_hits": (
                            VOTE_HITS
                        ),
                        "model_loaded": (
                            model_runtime.loaded
                        ),
                        "model_status": (
                            model_runtime.status
                        ),
                        "server_time": utc_now(),
                    }
                )
                continue

            # =================================================
            # RESET
            # =================================================

            if message_type == "reset_sequence":
                reset_runtime_state()

                await websocket.send_json(
                    {
                        "type": "sequence_reset",
                        "status": "ok",
                        "prediction": None,
                        "segment": (
                            build_segment_compat(
                                0,
                                False,
                                0,
                                False,
                            )
                        ),
                        "server_time": utc_now(),
                    }
                )
                continue

            # =================================================
            # CAMERA FRAME
            # =================================================

            if message_type != "frame":
                continue

            frame_id = None

            try:
                pipeline_started = (
                    time.perf_counter()
                )

                frame_id = int(
                    message.get(
                        "frame_id",
                        frame_count + 1,
                    )
                )

                width = int(
                    message.get(
                        "width",
                        0,
                    )
                )

                height = int(
                    message.get(
                        "height",
                        0,
                    )
                )

                # =============================================
                # NEW CAMERA SESSION
                # =============================================

                if (
                    last_client_frame_id is not None
                    and frame_id <= last_client_frame_id
                ):
                    reset_runtime_state()

                last_client_frame_id = frame_id

                # =============================================
                # DECODE + VISION
                # =============================================

                frame_bytes = decode_frame_base64(
                    message.get(
                        "image_base64",
                        "",
                    )
                )

                vision_result = extractor.extract(
                    frame_bytes
                )

                frame_count += 1

                counts = vision_result[
                    "counts"
                ]

                current_hand_detected = (
                    counts[
                        "left_hand"
                    ] > 0
                    or counts[
                        "right_hand"
                    ] > 0
                )

                # =============================================
                # ROLLING 48 RAW LANDMARK WINDOW
                # =============================================

                sequence_state = (
                    sequence_builder.add_frame(
                        frame_id,
                        vision_result[
                            "landmarks"
                        ],
                    )
                )

                window_count = int(
                    sequence_state.get(
                        "count",
                        0,
                    )
                )

                ready = bool(
                    sequence_state.get(
                        "ready",
                        False,
                    )
                )

                preprocessing_ms = safe_float(
                    sequence_state.get(
                        "preprocessing_ms",
                        0.0,
                    )
                )

                sequence_build_ms = 0.0
                inference_ms = 0.0

                inference_performed = False
                accepted_event = False

                # =============================================
                # INFERENCE EVERY 2 FRAMES
                # =============================================

                if (
                    ready
                    and frame_count % INFER_EVERY == 0
                ):
                    inference_performed = True

                    sequences = (
                        sequence_builder
                        .get_ready_sequences()
                    )

                    perf = (
                        sequence_builder
                        .get_performance()
                    )

                    sequence_build_ms = safe_float(
                        perf.get(
                            "build_ms",
                            0.0,
                        )
                    )

                    if sequences is None:
                        raw_prediction = {
                            "status": "idle",
                            "label": None,
                            "class_id": None,
                            "confidence": 0.0,
                            "confidence_percent": 0.0,
                            "top3": [],
                            "hand_present_frames": 0,
                            "inference_ms": None,
                        }

                    else:
                        raw_prediction = (
                            bisindo_predictor
                            .predict(
                                sequences
                            )
                        )

                    inference_ms = safe_float(
                        raw_prediction.get(
                            "inference_ms",
                            0.0,
                        )
                    )

                    confidence = safe_float(
                        raw_prediction.get(
                            "confidence",
                            0.0,
                        )
                    )

                    margin = prediction_margin(
                        raw_prediction
                    )

                    hand_present_frames = int(
                        raw_prediction.get(
                            "hand_present_frames",
                            0,
                        )
                        or 0
                    )

                    valid_ratio = (
                        hand_present_frames
                        / SEQUENCE_LENGTH
                    )

                    passed = (
                        current_hand_detected
                        and raw_prediction.get(
                            "status"
                        ) == "ok"
                        and confidence >= MIN_CONFIDENCE
                        and margin >= MIN_MARGIN
                        and valid_ratio >= MIN_VALID_RATIO
                    )

                    # =========================================
                    # VALID CANDIDATE
                    # =========================================

                    if passed:
                        neutral_streak = 0

                        prediction_history.append(
                            {
                                "class_id": (
                                    raw_prediction.get(
                                        "class_id"
                                    )
                                ),
                                "label": (
                                    raw_prediction.get(
                                        "label"
                                    )
                                ),
                                "confidence": confidence,
                                "margin": margin,
                            }
                        )

                    # =========================================
                    # NEUTRAL / UNCERTAIN TRANSITION
                    # =========================================

                    else:
                        neutral_streak += 1

                        prediction_history.append(
                            None
                        )

                        if (
                            neutral_streak
                            >= NEUTRAL_RESET_HITS
                        ):
                            same_label_rearmed = True
                            display_prediction = None

                    # =========================================
                    # TEMPORAL VOTING
                    # =========================================

                    valid_votes = [
                        item
                        for item in prediction_history
                        if (
                            isinstance(item, dict)
                            and item.get("label")
                        )
                    ]

                    stable_id = None
                    stable_label = None
                    stable_conf = 0.0
                    stable_margin = 0.0
                    stable_votes = 0

                    if valid_votes:
                        counts_by_id = Counter(
                            int(item["class_id"])
                            for item in valid_votes
                            if item.get(
                                "class_id"
                            ) is not None
                        )

                        if counts_by_id:
                            (
                                stable_id,
                                stable_votes,
                            ) = counts_by_id.most_common(
                                1
                            )[0]

                            matching = [
                                item
                                for item in valid_votes
                                if int(
                                    item["class_id"]
                                ) == stable_id
                            ]

                            if matching:
                                stable_label = matching[-1][
                                    "label"
                                ]

                                stable_conf = sum(
                                    safe_float(
                                        item.get(
                                            "confidence",
                                            0.0,
                                        )
                                    )
                                    for item in matching
                                ) / len(matching)

                                stable_margin = sum(
                                    safe_float(
                                        item.get(
                                            "margin",
                                            0.0,
                                        )
                                    )
                                    for item in matching
                                ) / len(matching)

                    # =========================================
                    # STABLE WORD
                    # =========================================

                    if (
                        stable_id is not None
                        and stable_votes >= VOTE_HITS
                        and stable_conf >= MIN_CONFIDENCE
                    ):
                        stable_result = {
                            "class_id": int(
                                stable_id
                            ),
                            "label": str(
                                stable_label
                            ),
                            "confidence": float(
                                stable_conf
                            ),
                            "margin": float(
                                stable_margin
                            ),
                        }

                        display_prediction = (
                            stable_result
                        )

                        now = time.monotonic()

                        is_new_class = (
                            last_emit_label is None
                            or int(stable_id)
                            != int(last_emit_label)
                        )

                        is_rearmed_same_class = (
                            last_emit_label is not None
                            and int(stable_id)
                            == int(last_emit_label)
                            and same_label_rearmed
                        )

                        debounce_ok = (
                            now - last_emit_time
                            >= CHANGE_COOLDOWN_SECONDS
                        )

                        allowed = (
                            debounce_ok
                            and (
                                is_new_class
                                or is_rearmed_same_class
                            )
                        )

                        if allowed:
                            accepted_event = True
                            accepted_event_counter += 1

                            last_emit_label = int(
                                stable_id
                            )

                            last_emit_time = now

                            same_label_rearmed = False
                            neutral_streak = 0

                            # Sama seperti native Python:
                            # clear vote history,
                            # JANGAN clear rolling raw window.
                            prediction_history.clear()

                            print(
                                "[SIGN] "
                                f"event={accepted_event_counter} "
                                f"label={stable_label} "
                                f"conf={stable_conf:.3f} "
                                f"margin={stable_margin:.3f} "
                                f"window={window_count}/{SEQUENCE_LENGTH}"
                            )

                # =============================================
                # PREDICTION PAYLOAD
                # =============================================

                prediction_payload = (
                    build_prediction_payload(
                        display_prediction=(
                            display_prediction
                        ),
                        raw_prediction=(
                            raw_prediction
                        ),
                        inference_performed=(
                            inference_performed
                        ),
                        accepted_event=(
                            accepted_event
                        ),
                        event_id=(
                            accepted_event_counter
                        ),
                        build_ms=(
                            sequence_build_ms
                        ),
                        history_size=len(
                            prediction_history
                        ),
                        stable_votes=(
                            stable_votes
                        ),
                        neutral_streak=(
                            neutral_streak
                        ),
                        same_label_rearmed=(
                            same_label_rearmed
                        ),
                    )
                )

                segment_payload = (
                    build_segment_compat(
                        window_count,
                        accepted_event,
                        accepted_event_counter,
                        inference_performed,
                    )
                )

                # =============================================
                # TOTAL PIPELINE
                # =============================================

                pipeline_ms = (
                    (
                        time.perf_counter()
                        - pipeline_started
                    )
                    * 1000.0
                )

                # =============================================
                # SEND
                # =============================================

                await websocket.send_json(
                    {
                        "type": "landmarks",
                        "status": "ok",
                        "frame_id": frame_id,
                        "width": width,
                        "height": height,
                        "frame_bytes": len(
                            frame_bytes
                        ),
                        "landmarks": vision_result[
                            "landmarks"
                        ],
                        "counts": counts,
                        "processing_ms": vision_result[
                            "processing_ms"
                        ],
                        "pipeline_ms": round(
                            pipeline_ms,
                            2,
                        ),
                        "preprocessing_ms": round(
                            preprocessing_ms,
                            3,
                        ),
                        "segment_build_ms": round(
                            sequence_build_ms,
                            2,
                        ),
                        "inference_ms": round(
                            inference_ms,
                            2,
                        ),
                        "segment": segment_payload,
                        "prediction": (
                            prediction_payload
                        ),
                        "continuous": {
                            "mode": (
                                "rolling_48_temporal_vote"
                            ),
                            "window_count": (
                                window_count
                            ),
                            "window_target": (
                                SEQUENCE_LENGTH
                            ),
                            "ready": ready,
                            "infer_every": (
                                INFER_EVERY
                            ),
                            "vote_window": (
                                VOTE_WINDOW
                            ),
                            "vote_hits": (
                                VOTE_HITS
                            ),
                            "history_size": len(
                                prediction_history
                            ),
                            "stable_votes": (
                                stable_votes
                            ),
                            "neutral_streak": (
                                neutral_streak
                            ),
                            "same_label_rearmed": (
                                same_label_rearmed
                            ),
                        },
                        "model_loaded": (
                            model_runtime.loaded
                        ),
                        "recognition_mode": (
                            "continuous_rolling"
                        ),
                        "server_time": utc_now(),
                    }
                )

                # =============================================
                # PERIODIC DEBUG
                # =============================================

                if frame_count % 20 == 0:
                    raw_label = (
                        raw_prediction.get(
                            "label"
                        )
                        if isinstance(
                            raw_prediction,
                            dict,
                        )
                        else None
                    )

                    display_label = (
                        display_prediction.get(
                            "label"
                        )
                        if isinstance(
                            display_prediction,
                            dict,
                        )
                        else None
                    )

                    print(
                        "[Realtime] "
                        f"frame={frame_count} "
                        f"rolling={window_count}/{SEQUENCE_LENGTH} "
                        f"hands={counts['left_hand'] + counts['right_hand']} "
                        f"raw={raw_label or '-'} "
                        f"stable={display_label or '-'} "
                        f"votes={stable_votes}/{VOTE_HITS} "
                        f"neutral={neutral_streak} "
                        f"vision={vision_result['processing_ms']}ms "
                        f"build={sequence_build_ms:.2f}ms "
                        f"infer={inference_ms:.2f}ms"
                    )

            except Exception as frame_error:
                print(
                    "[Realtime] Frame error:",
                    frame_error,
                )

                await websocket.send_json(
                    {
                        "type": "frame_error",
                        "status": "error",
                        "frame_id": frame_id,
                        "message": str(
                            frame_error
                        ),
                        "server_time": utc_now(),
                    }
                )

    except WebSocketDisconnect:
        pass

    finally:
        try:
            extractor.close()
        except Exception:
            pass