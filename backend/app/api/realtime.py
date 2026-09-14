import base64
import time

from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.inference.gesture_segmenter import (
    IsolatedGestureSegmenter,
    build_segment_result,
)
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
SEQUENCE_LENGTH = 48


# ============================================================
# FINAL REALTIME ACCEPTANCE GATE
#
# IMPORTANT:
# - Satu gesture selesai -> maksimal satu inference.
# - Transcript hanya boleh commit ketika accepted_event=True.
# - V2 tetap memakai fixed-time 2.2s -> 48 timestep melalui
#   RealtimeSequenceBuilder yang membaca profile model_runtime.
# ============================================================

MIN_ACCEPT_CONFIDENCE = 0.78
MIN_ACCEPT_MARGIN = 0.12
MIN_VALID_HAND_RATIO = 0.25


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



def frame_timestamp_seconds(
    message,
):
    """
    Prefer waktu capture client jika tersedia.
    Kalau frontend tidak mengirim timestamp,
    gunakan monotonic server time.
    """

    for key in (
        "timestamp_ms",
        "capture_timestamp_ms",
        "client_timestamp_ms",
    ):
        value = message.get(
            key
        )

        if value is not None:
            try:
                value = float(
                    value
                )

                if value == value:
                    return (
                        value
                        / 1000.0
                    )

            except Exception:
                pass

    value = message.get(
        "timestamp"
    )

    if value is not None:
        try:
            value = float(
                value
            )

            if value == value:
                return (
                    value / 1000.0
                    if value > 1e6
                    else value
                )

        except Exception:
            pass

    return time.monotonic()



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



def empty_prediction(
    status="idle",
):
    return {
        "status": status,
        "label": None,
        "class_id": None,
        "confidence": 0.0,
        "confidence_percent": 0.0,
        "top3": [],
        "hand_present_frames": 0,
        "inference_ms": None,
    }



def apply_final_acceptance_gate(
    result,
):
    """
    build_segment_result() sudah punya gate dasar.
    Di sini kita tambah gate deployment yang lebih konservatif
    supaya transcript tidak gampang menerima transisi/noise.
    """

    result = (
        dict(result)
        if isinstance(
            result,
            dict,
        )
        else {}
    )

    confidence = safe_float(
        result.get(
            "confidence",
            0.0,
        )
    )

    margin = safe_float(
        result.get(
            "margin",
            0.0,
        )
    )

    hand_present_frames = int(
        result.get(
            "hand_present_frames",
            0,
        )
        or 0
    )

    valid_ratio = (
        hand_present_frames
        / SEQUENCE_LENGTH
    )

    base_accepted = bool(
        result.get(
            "accepted",
            False,
        )
    )

    accepted = (
        base_accepted
        and confidence
        >= MIN_ACCEPT_CONFIDENCE
        and margin
        >= MIN_ACCEPT_MARGIN
        and valid_ratio
        >= MIN_VALID_HAND_RATIO
    )

    result[
        "accepted"
    ] = bool(
        accepted
    )

    result[
        "valid_ratio"
    ] = round(
        valid_ratio,
        4,
    )

    result[
        "valid_ratio_percent"
    ] = round(
        valid_ratio
        * 100.0,
        2,
    )

    if (
        not accepted
        and result.get(
            "status"
        ) == "accepted"
    ):
        result[
            "status"
        ] = "uncertain"

    thresholds = dict(
        result.get(
            "thresholds",
            {}
        )
    )

    thresholds.update(
        {
            "deployment_min_confidence": (
                MIN_ACCEPT_CONFIDENCE
            ),
            "deployment_min_margin": (
                MIN_ACCEPT_MARGIN
            ),
            "deployment_min_valid_hand_ratio": (
                MIN_VALID_HAND_RATIO
            ),
        }
    )

    result[
        "thresholds"
    ] = thresholds

    return result



def build_prediction_payload(
    *,
    raw_prediction,
    display_prediction,
    accepted_event,
    inference_performed,
    event_id,
    segment_id,
    sequence_build_ms,
):
    """
    Payload dibuat kompatibel dengan frontend lama,
    tapi event transcript dibuat event-only.

    PENTING:
    result_event == accepted_event
    bukan == inference_performed.
    """

    raw_prediction = (
        raw_prediction
        if isinstance(
            raw_prediction,
            dict,
        )
        else {}
    )

    display_prediction = (
        display_prediction
        if isinstance(
            display_prediction,
            dict,
        )
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

    raw_valid_ratio = (
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

        valid_ratio = safe_float(
            display_prediction.get(
                "valid_ratio",
                raw_valid_ratio,
            )
        )

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
        valid_ratio = raw_valid_ratio

        raw_status = raw_prediction.get(
            "status",
            "idle",
        )

        if raw_status in (
            "model_not_loaded",
            "waiting_for_hand",
            "warming_up",
        ):
            status = raw_status

        elif inference_performed:
            status = "uncertain"

        else:
            status = "idle"

    return {
        "status": status,
        "raw_status": raw_prediction.get(
            "status",
            "idle",
        ),

        # Event-only.
        # Jangan dipakai sebagai persistent state.
        "accepted": bool(
            accepted_event
        ),
        "result_event": bool(
            accepted_event
        ),
        "accepted_event": bool(
            accepted_event
        ),

        "event_id": (
            int(event_id)
            if accepted_event
            else None
        ),
        "segment_id": segment_id,

        "class_id": class_id,
        "label": label,
        "confidence": confidence,
        "confidence_percent": round(
            confidence
            * 100.0,
            2,
        ),
        "margin": margin,
        "margin_percent": round(
            margin
            * 100.0,
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
            valid_ratio
            * 100.0,
            2,
        ),
        "inference_ms": raw_prediction.get(
            "inference_ms"
        ),
        "source_frames": (
            display_prediction.get(
                "source_frames",
                0,
            )
            if display_prediction
            else 0
        ),
        "sampled_frames": SEQUENCE_LENGTH,
        "sequence_build_ms": round(
            safe_float(
                sequence_build_ms
            ),
            2,
        ),
        "end_reason": (
            display_prediction.get(
                "end_reason"
            )
            if display_prediction
            else None
        ),
        "thresholds": {
            "min_confidence": (
                MIN_ACCEPT_CONFIDENCE
            ),
            "min_margin": (
                MIN_ACCEPT_MARGIN
            ),
            "min_valid_ratio": (
                MIN_VALID_HAND_RATIO
            ),
            "one_gesture_one_inference": True,
        },
    }



def sanitize_segment_payload(
    segment_snapshot,
    accepted_event,
    event_id,
):
    """
    Frontend lama bisa mendengarkan segment.result_event.
    Maka result_event di segment juga hanya True jika kata
    BENAR-BENAR diterima ke transcript.
    """

    payload = (
        dict(segment_snapshot)
        if isinstance(
            segment_snapshot,
            dict,
        )
        else {}
    )

    payload[
        "result_event"
    ] = bool(
        accepted_event
    )

    payload[
        "accepted_event"
    ] = bool(
        accepted_event
    )

    payload[
        "event_id"
    ] = (
        int(event_id)
        if accepted_event
        else None
    )

    return payload


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
    runtime_generation = (
        model_runtime.generation
    )

    raw_prediction = None
    last_accepted_prediction = None
    accepted_event_counter = 0

    # ========================================================
    # PIPELINE FACTORY
    # ========================================================

    def create_pipeline_components():
        profile = (
            model_runtime
            .get_preprocessing_profile()
        )

        builder = RealtimeSequenceBuilder(
            sequence_length=(
                SEQUENCE_LENGTH
            ),
            window_seconds=profile.get(
                "window_seconds"
            ),
            max_interp_gap=profile.get(
                "max_interp_gap",
                6,
            ),
            edge_fill=profile.get(
                "edge_fill",
                2,
            ),
        )

        vision = LandmarkExtractor(
            profile=profile.get(
                "vision_profile",
                "legacy_v1",
            )
        )

        gesture = (
            IsolatedGestureSegmenter()
        )

        return (
            builder,
            vision,
            gesture,
        )

    (
        sequence_builder,
        extractor,
        gesture_segmenter,
    ) = create_pipeline_components()

    # ========================================================
    # RESET
    # ========================================================

    def reset_runtime_state():
        nonlocal frame_count
        nonlocal last_client_frame_id
        nonlocal raw_prediction
        nonlocal last_accepted_prediction
        nonlocal accepted_event_counter

        frame_count = 0
        last_client_frame_id = None

        sequence_builder.reset()
        gesture_segmenter.reset()

        try:
            extractor.reset_temporal_state()
        except Exception:
            pass

        raw_prediction = None
        last_accepted_prediction = None
        accepted_event_counter = 0

    # ========================================================
    # MODEL HOT-SWITCH REBUILD
    # ========================================================

    def rebuild_pipeline_for_active_model():
        nonlocal sequence_builder
        nonlocal extractor
        nonlocal gesture_segmenter
        nonlocal runtime_generation

        old_extractor = extractor

        (
            sequence_builder,
            extractor,
            gesture_segmenter,
        ) = create_pipeline_components()

        runtime_generation = (
            model_runtime.generation
        )

        try:
            old_extractor.close()
        except Exception:
            pass

        reset_runtime_state()

    # ========================================================
    # CONNECTION READY
    # ========================================================

    await websocket.send_json(
        {
            "type": "connection",
            "status": "connected",
            "message": (
                "BISINDO isolated gesture "
                "recognition ready."
            ),
            "vision": "ready",
            "recognition_mode": (
                "isolated_gesture"
            ),
            "sequence_target": (
                SEQUENCE_LENGTH
            ),
            "one_gesture_one_inference": True,
            "model_loaded": (
                model_runtime.loaded
            ),
            "model_status": (
                model_runtime.status
            ),
            "model_version": (
                model_runtime.active_version
            ),
            "runtime_schema": (
                model_runtime.runtime_schema
            ),
            "window_duration_sec": (
                model_runtime
                .get_window_seconds()
            ),
            "server_time": utc_now(),
        }
    )

    try:
        while True:
            message = (
                await websocket
                .receive_json()
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
                        "model_version": (
                            model_runtime.active_version
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
                            "isolated_gesture"
                        ),
                        "sequence_target": (
                            SEQUENCE_LENGTH
                        ),
                        "one_gesture_one_inference": True,
                        "model_loaded": (
                            model_runtime.loaded
                        ),
                        "model_status": (
                            model_runtime.status
                        ),
                        "model_version": (
                            model_runtime.active_version
                        ),
                        "runtime_schema": (
                            model_runtime.runtime_schema
                        ),
                        "window_duration_sec": (
                            model_runtime
                            .get_window_seconds()
                        ),
                        "server_time": utc_now(),
                    }
                )
                continue

            # =================================================
            # HOT-SWITCH MODEL
            # =================================================

            if message_type in (
                "select_model",
                "switch_model",
            ):
                version = str(
                    message.get(
                        "version",
                        "",
                    )
                ).strip()

                success = (
                    model_runtime
                    .switch(
                        version
                    )
                )

                if success:
                    rebuild_pipeline_for_active_model()

                await websocket.send_json(
                    {
                        "type": "model_selected",
                        "success": bool(
                            success
                        ),
                        "version": (
                            model_runtime.active_version
                        ),
                        "model": (
                            model_runtime.get_status()
                        ),
                        "error": (
                            model_runtime.error
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
                            sanitize_segment_payload(
                                gesture_segmenter
                                .snapshot(),
                                False,
                                0,
                            )
                        ),
                        "server_time": utc_now(),
                    }
                )
                continue

            # =================================================
            # CAMERA FRAME ONLY
            # =================================================

            if message_type != "frame":
                continue

            # REST switch can happen outside this websocket.
            if (
                model_runtime.generation
                != runtime_generation
            ):
                rebuild_pipeline_for_active_model()

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

                frame_timestamp_sec = (
                    frame_timestamp_seconds(
                        message
                    )
                )

                # =============================================
                # NEW CAMERA SESSION
                # =============================================

                if (
                    last_client_frame_id
                    is not None
                    and frame_id
                    <= last_client_frame_id
                ):
                    reset_runtime_state()

                last_client_frame_id = (
                    frame_id
                )

                # =============================================
                # DECODE + VISION
                # =============================================

                frame_bytes = (
                    decode_frame_base64(
                        message.get(
                            "image_base64",
                            "",
                        )
                    )
                )

                vision_result = (
                    extractor.extract(
                        frame_bytes
                    )
                )

                frame_count += 1

                counts = (
                    vision_result[
                        "counts"
                    ]
                )

                current_hand_detected = (
                    counts[
                        "left_hand"
                    ] > 0
                    or counts[
                        "right_hand"
                    ] > 0
                )

                landmarks = (
                    vision_result[
                        "landmarks"
                    ]
                )

                # =============================================
                # CONTINUOUS FEATURE BUFFER
                #
                # V2:
                #   timestamp-aware fixed window (2.2 s)
                #   -> 48 samples
                #
                # V1:
                #   legacy rolling 48 frames
                # =============================================

                sequence_state = (
                    sequence_builder.add_frame(
                        frame_id,
                        landmarks,
                        timestamp_sec=(
                            frame_timestamp_sec
                        ),
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

                preprocessing_ms = (
                    safe_float(
                        sequence_state.get(
                            "preprocessing_ms",
                            0.0,
                        )
                    )
                )

                # =============================================
                # GESTURE STATE MACHINE
                # =============================================

                (
                    segment_snapshot,
                    completed_segment,
                ) = gesture_segmenter.observe(
                    frame_id,
                    landmarks,
                    current_hand_detected,
                )

                inference_performed = False
                accepted_event = False
                sequence_build_ms = 0.0
                inference_ms = 0.0
                current_result = None

                # =============================================
                # ONE COMPLETED GESTURE -> ONE INFERENCE
                # =============================================

                if completed_segment is not None:
                    inference_performed = True

                    sequences = (
                        sequence_builder
                        .get_ready_sequences()
                    )

                    perf = (
                        sequence_builder
                        .get_performance()
                    )

                    sequence_build_ms = (
                        safe_float(
                            perf.get(
                                "build_ms",
                                0.0,
                            )
                        )
                    )

                    if sequences is None:
                        raw_prediction = (
                            empty_prediction(
                                "warming_up"
                            )
                        )

                        current_result = {
                            "status": "warming_up",
                            "raw_status": "warming_up",
                            "accepted": False,
                            "class_id": None,
                            "label": None,
                            "confidence": 0.0,
                            "confidence_percent": 0.0,
                            "margin": 0.0,
                            "margin_percent": 0.0,
                            "top3": [],
                            "hand_present_frames": 0,
                            "inference_ms": None,
                            "segment_id": (
                                completed_segment.get(
                                    "segment_id"
                                )
                            ),
                            "source_frames": (
                                completed_segment.get(
                                    "source_frames",
                                    0,
                                )
                            ),
                            "sampled_frames": (
                                SEQUENCE_LENGTH
                            ),
                            "unique_sampled_frames": 0,
                            "sequence_build_ms": (
                                sequence_build_ms
                            ),
                            "end_reason": (
                                completed_segment.get(
                                    "end_reason"
                                )
                            ),
                            "peak_motion": (
                                completed_segment.get(
                                    "peak_motion",
                                    0.0,
                                )
                            ),
                            "segment_quality_valid": (
                                completed_segment.get(
                                    "quality_valid",
                                    False,
                                )
                            ),
                            "valid_ratio": 0.0,
                            "valid_ratio_percent": 0.0,
                            "thresholds": {},
                        }

                    else:
                        raw_prediction = (
                            bisindo_predictor
                            .predict(
                                sequences
                            )
                        )

                        inference_ms = (
                            safe_float(
                                raw_prediction.get(
                                    "inference_ms",
                                    0.0,
                                )
                            )
                        )

                        sequence_info = {
                            "source_frames": (
                                completed_segment.get(
                                    "source_frames",
                                    0,
                                )
                            ),
                            "sampled_frames": (
                                SEQUENCE_LENGTH
                            ),
                            "unique_sampled_frames": min(
                                int(
                                    completed_segment.get(
                                        "source_frames",
                                        0,
                                    )
                                ),
                                SEQUENCE_LENGTH,
                            ),
                            "build_ms": (
                                sequence_build_ms
                            ),
                        }

                        current_result = (
                            build_segment_result(
                                raw_prediction,
                                completed_segment,
                                sequence_info,
                            )
                        )

                        current_result = (
                            apply_final_acceptance_gate(
                                current_result
                            )
                        )

                    accepted_event = bool(
                        current_result.get(
                            "accepted",
                            False,
                        )
                    )

                    if accepted_event:
                        accepted_event_counter += 1

                        last_accepted_prediction = (
                            dict(
                                current_result
                            )
                        )

                        print(
                            "[SIGN] "
                            f"event={accepted_event_counter} "
                            f"segment={current_result.get('segment_id')} "
                            f"label={current_result.get('label')} "
                            f"conf={safe_float(current_result.get('confidence')):.3f} "
                            f"margin={safe_float(current_result.get('margin')):.3f} "
                            f"valid={safe_float(current_result.get('valid_ratio')):.3f} "
                            f"reason={current_result.get('end_reason')}"
                        )

                    else:
                        print(
                            "[REJECT] "
                            f"segment={current_result.get('segment_id')} "
                            f"status={current_result.get('status')} "
                            f"label={current_result.get('label')} "
                            f"conf={safe_float(current_result.get('confidence')):.3f} "
                            f"margin={safe_float(current_result.get('margin')):.3f} "
                            f"valid={safe_float(current_result.get('valid_ratio')):.3f}"
                        )

                    # Masuk cooldown dan tunggu neutral/rearm.
                    segment_snapshot = (
                        gesture_segmenter
                        .finish_analysis(
                            current_result
                        )
                    )

                # =============================================
                # PREDICTION PAYLOAD
                # =============================================

                display_prediction = (
                    current_result
                    if accepted_event
                    else last_accepted_prediction
                )

                prediction_payload = (
                    build_prediction_payload(
                        raw_prediction=(
                            raw_prediction
                        ),
                        display_prediction=(
                            display_prediction
                        ),
                        accepted_event=(
                            accepted_event
                        ),
                        inference_performed=(
                            inference_performed
                        ),
                        event_id=(
                            accepted_event_counter
                        ),
                        segment_id=(
                            (
                                current_result.get(
                                    "segment_id"
                                )
                                if isinstance(
                                    current_result,
                                    dict,
                                )
                                else segment_snapshot.get(
                                    "segment_id"
                                )
                            )
                        ),
                        sequence_build_ms=(
                            sequence_build_ms
                        ),
                    )
                )

                segment_payload = (
                    sanitize_segment_payload(
                        segment_snapshot,
                        accepted_event,
                        accepted_event_counter,
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
                        "model_version": (
                            model_runtime.active_version
                        ),
                        "runtime_schema": (
                            model_runtime.runtime_schema
                        ),
                        "window_duration_sec": (
                            model_runtime
                            .get_window_seconds()
                        ),
                        "width": width,
                        "height": height,
                        "frame_bytes": len(
                            frame_bytes
                        ),
                        "landmarks": landmarks,
                        "counts": counts,
                        "processing_ms": (
                            vision_result[
                                "processing_ms"
                            ]
                        ),
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
                        "segment": (
                            segment_payload
                        ),
                        "prediction": (
                            prediction_payload
                        ),
                        "continuous": {
                            "mode": (
                                "isolated_segmented_2.2s"
                                if sequence_builder.time_aware
                                else "isolated_segmented_48frame"
                            ),
                            "window_count": (
                                window_count
                            ),
                            "window_target": (
                                SEQUENCE_LENGTH
                            ),
                            "ready": ready,
                            "time_aware": bool(
                                sequence_builder.time_aware
                            ),
                            "window_seconds": (
                                sequence_builder.window_seconds
                            ),
                            "one_gesture_one_inference": True,
                            "inference_performed": bool(
                                inference_performed
                            ),
                            "accepted_event": bool(
                                accepted_event
                            ),
                            "segment_state": (
                                segment_payload.get(
                                    "status"
                                )
                            ),
                            "segment_reason": (
                                segment_payload.get(
                                    "reason"
                                )
                            ),
                        },
                        "model_loaded": (
                            model_runtime.loaded
                        ),
                        "recognition_mode": (
                            "isolated_gesture"
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

                    print(
                        "[Realtime] "
                        f"frame={frame_count} "
                        f"buffer={window_count}/{SEQUENCE_LENGTH} "
                        f"ready={ready} "
                        f"hands={counts['left_hand'] + counts['right_hand']} "
                        f"segment={segment_payload.get('status')} "
                        f"reason={segment_payload.get('reason')} "
                        f"motion={safe_float(segment_payload.get('motion_ema')):.4f} "
                        f"raw={raw_label or '-'} "
                        f"infer={inference_performed} "
                        f"accepted={accepted_event} "
                        f"vision={vision_result['processing_ms']}ms "
                        f"build={sequence_build_ms:.2f}ms "
                        f"model={inference_ms:.2f}ms"
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