import base64
import time

from datetime import (
    datetime,
    timezone,
)

from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
)

from app.inference.gesture_segmenter import (
    IsolatedGestureSegmenter,
    build_segment_result,
)

from app.inference.model_runtime import (
    model_runtime,
)

from app.inference.predictor import (
    bisindo_predictor,
)

from app.preprocessing.isolated_sequence import (
    IsolatedSequenceBuilder,
)

from app.services.landmark_extractor import (
    LandmarkExtractor,
)


router = APIRouter(
    tags=["Realtime"],
)


# ============================================================
# CONFIG
# ============================================================

MAX_FRAME_BYTES = 2_000_000


# ============================================================
# TIME
# ============================================================

def utc_now():
    return datetime.now(
        timezone.utc,
    ).isoformat()


# ============================================================
# BASE64 FRAME
# ============================================================

def decode_frame_base64(
    image_base64: str,
) -> bytes:
    if not image_base64:
        raise ValueError(
            "Frame kosong."
        )

    try:
        frame_bytes = (
            base64.b64decode(
                image_base64,
                validate=True,
            )
        )

    except Exception as error:
        raise ValueError(
            "Frame bukan Base64 valid."
        ) from error

    if not frame_bytes:
        raise ValueError(
            "Frame hasil decode kosong."
        )

    if (
        len(frame_bytes)
        > MAX_FRAME_BYTES
    ):
        raise ValueError(
            "Ukuran frame terlalu besar."
        )

    return frame_bytes


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

    last_prediction = None


    # ========================================================
    # SERVICES
    # ========================================================

    extractor = (
        LandmarkExtractor()
    )

    segmenter = (
        IsolatedGestureSegmenter()
    )

    sequence_builder = (
        IsolatedSequenceBuilder()
    )


    # ========================================================
    # CONNECTION READY
    # ========================================================

    await websocket.send_json(
        {
            "type":
                "connection",

            "status":
                "connected",

            "message":
                (
                    "BISINDO isolated "
                    "gesture channel ready."
                ),

            "vision":
                "ready",

            "recognition_mode":
                "isolated_gesture",

            "sequence_target":
                48,

            "model_loaded":
                model_runtime.loaded,

            "model_status":
                model_runtime.status,

            "server_time":
                utc_now(),
        }
    )


    try:
        while True:
            # =================================================
            # RECEIVE
            # =================================================

            message = (
                await websocket
                .receive_json()
            )

            message_type = (
                message.get(
                    "type",
                    "unknown",
                )
            )


            # =================================================
            # PING
            # =================================================

            if (
                message_type
                == "ping"
            ):
                await websocket.send_json(
                    {
                        "type":
                            "pong",

                        "status":
                            "ok",

                        "model_loaded":
                            model_runtime.loaded,

                        "server_time":
                            utc_now(),
                    }
                )

                continue


            # =================================================
            # CLIENT HELLO
            # =================================================

            if (
                message_type
                == "client_hello"
            ):
                await websocket.send_json(
                    {
                        "type":
                            "hello_ack",

                        "status":
                            "ok",

                        "message":
                            (
                                "BISINDO frontend "
                                "connected."
                            ),

                        "vision":
                            "ready",

                        "recognition_mode":
                            "isolated_gesture",

                        "sequence_target":
                            48,

                        "model_loaded":
                            model_runtime.loaded,

                        "model_status":
                            model_runtime.status,

                        "server_time":
                            utc_now(),
                    }
                )

                continue


            # =================================================
            # RESET
            # =================================================

            if (
                message_type
                == "reset_sequence"
            ):
                frame_count = 0

                last_client_frame_id = None

                last_prediction = None

                segmenter.reset()

                sequence_builder.reset()


                await websocket.send_json(
                    {
                        "type":
                            "sequence_reset",

                        "status":
                            "ok",

                        "prediction":
                            None,

                        "segment":
                            segmenter.snapshot(),

                        "server_time":
                            utc_now(),
                    }
                )

                continue


            # =================================================
            # CAMERA FRAME
            # =================================================

            if (
                message_type
                == "frame"
            ):
                frame_id = None

                try:
                    pipeline_started = (
                        time.perf_counter()
                    )


                    # =========================================
                    # FRAME ID
                    # =========================================

                    frame_id = int(
                        message.get(
                            "frame_id",
                            frame_count + 1,
                        )
                    )


                    # =========================================
                    # FRAME META
                    # =========================================

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


                    # =========================================
                    # NEW CAMERA SESSION
                    # =========================================

                    if (
                        last_client_frame_id
                        is not None
                        and frame_id
                        <= last_client_frame_id
                    ):
                        frame_count = 0

                        last_prediction = None

                        segmenter.reset()

                        sequence_builder.reset()


                    last_client_frame_id = (
                        frame_id
                    )


                    # =========================================
                    # DECODE FRAME
                    # =========================================

                    frame_bytes = (
                        decode_frame_base64(
                            message.get(
                                "image_base64",
                                "",
                            )
                        )
                    )


                    # =========================================
                    # VISION
                    # =========================================

                    result = (
                        extractor.extract(
                            frame_bytes
                        )
                    )


                    frame_count += 1


                    counts = (
                        result[
                            "counts"
                        ]
                    )


                    current_hand_detected = (
                        counts[
                            "left_hand"
                        ]
                        > 0
                        or
                        counts[
                            "right_hand"
                        ]
                        > 0
                    )


                    # =========================================
                    # ISOLATED GESTURE SEGMENTATION
                    # =========================================

                    (
                        segment_state,
                        completed_segment,
                    ) = segmenter.observe(
                        frame_id,
                        result[
                            "landmarks"
                        ],
                        current_hand_detected,
                    )


                    segment_build_ms = 0.0

                    inference_ms = 0.0


                    # =========================================
                    # ONE SEGMENT
                    # →
                    # ONE 48-FRAME SEQUENCE
                    # →
                    # ONE INFERENCE
                    # =========================================

                    if (
                        completed_segment
                        is not None
                    ):
                        try:
                            # =================================
                            # TEMPORAL SAMPLING + PREPROCESS
                            # =================================

                            (
                                sequences,
                                sequence_info,
                            ) = (
                                sequence_builder
                                .build(
                                    completed_segment[
                                        "frames"
                                    ]
                                )
                            )


                            segment_build_ms = float(
                                sequence_info.get(
                                    "build_ms",
                                    0.0,
                                )
                                or 0.0
                            )


                            # =================================
                            # TORCHSCRIPT INFERENCE
                            # =================================

                            raw_prediction = (
                                bisindo_predictor
                                .predict(
                                    sequences
                                )
                            )


                            inference_ms = float(
                                raw_prediction.get(
                                    "inference_ms",
                                    0.0,
                                )
                                or 0.0
                            )


                            # =================================
                            # RESULT QUALITY GATE
                            # =================================

                            last_prediction = (
                                build_segment_result(
                                    raw_prediction,
                                    completed_segment,
                                    sequence_info,
                                )
                            )


                        except Exception as analysis_error:
                            print(
                                "[Segment] "
                                "Analysis error:",
                                analysis_error,
                            )


                            last_prediction = {
                                "status":
                                    "error",

                                "raw_status":
                                    "error",

                                "accepted":
                                    False,

                                "class_id":
                                    None,

                                "label":
                                    None,

                                "confidence":
                                    0.0,

                                "confidence_percent":
                                    0.0,

                                "margin":
                                    0.0,

                                "margin_percent":
                                    0.0,

                                "top3":
                                    [],

                                "hand_present_frames":
                                    0,

                                "segment_id":
                                    completed_segment.get(
                                        "segment_id"
                                    ),

                                "source_frames":
                                    completed_segment.get(
                                        "source_frames",
                                        0,
                                    ),

                                "sampled_frames":
                                    48,

                                "unique_sampled_frames":
                                    0,

                                "sequence_build_ms":
                                    segment_build_ms,

                                "inference_ms":
                                    None,

                                "end_reason":
                                    completed_segment.get(
                                        "end_reason",
                                        "unknown",
                                    ),

                                "peak_motion":
                                    completed_segment.get(
                                        "peak_motion",
                                        0.0,
                                    ),

                                "thresholds": {
                                    "min_confidence":
                                        0.70,

                                    "min_confidence_percent":
                                        70.0,

                                    "min_margin":
                                        0.10,

                                    "min_margin_percent":
                                        10.0,
                                },

                                "error":
                                    str(
                                        analysis_error
                                    ),
                            }


                        # =====================================
                        # FINISH ANALYSIS
                        # =====================================

                        segment_state = (
                            segmenter
                            .finish_analysis(
                                last_prediction
                            )
                        )


                        # =====================================
                        # SEGMENT LOG
                        # =====================================

                        print(
                            "[Segment] "
                            f"id="
                            f"{last_prediction.get('segment_id')} "
                            f"source="
                            f"{last_prediction.get('source_frames')} "
                            f"sampled="
                            f"{last_prediction.get('sampled_frames')} "
                            f"unique="
                            f"{last_prediction.get('unique_sampled_frames', 0)} "
                            f"build="
                            f"{float(last_prediction.get('sequence_build_ms', 0) or 0):.2f}ms "
                            f"infer="
                            f"{float(last_prediction.get('inference_ms', 0) or 0):.2f}ms "
                            f"end="
                            f"{last_prediction.get('end_reason')} "
                            f"result="
                            f"{last_prediction.get('label') or '-'} "
                            f"{float(last_prediction.get('confidence_percent', 0) or 0):.1f}% "
                            f"margin="
                            f"{float(last_prediction.get('margin_percent', 0) or 0):.1f}% "
                            f"status="
                            f"{last_prediction.get('status')}"
                        )


                    # =========================================
                    # PREDICTION PAYLOAD
                    # =========================================

                    prediction_payload = None


                    if (
                        last_prediction
                        is not None
                    ):
                        prediction_payload = dict(
                            last_prediction
                        )


                        result_event = bool(
                            segment_state.get(
                                "result_event",
                                False,
                            )
                        )


                        prediction_payload[
                            "result_event"
                        ] = (
                            result_event
                        )


                        prediction_payload[
                            "accepted_event"
                        ] = (
                            result_event
                            and bool(
                                prediction_payload.get(
                                    "accepted",
                                    False,
                                )
                            )
                        )


                    # =========================================
                    # TOTAL PIPELINE
                    # =========================================

                    pipeline_ms = (
                        (
                            time.perf_counter()
                            - pipeline_started
                        )
                        * 1000.0
                    )


                    # =========================================
                    # SEND RESULT
                    # =========================================

                    await websocket.send_json(
                        {
                            "type":
                                "landmarks",

                            "status":
                                "ok",

                            "frame_id":
                                frame_id,

                            "width":
                                width,

                            "height":
                                height,

                            "frame_bytes":
                                len(
                                    frame_bytes
                                ),

                            "landmarks":
                                result[
                                    "landmarks"
                                ],

                            "counts":
                                counts,

                            "processing_ms":
                                result[
                                    "processing_ms"
                                ],

                            "pipeline_ms":
                                round(
                                    pipeline_ms,
                                    2,
                                ),

                            "segment_build_ms":
                                round(
                                    segment_build_ms,
                                    2,
                                ),

                            "inference_ms":
                                round(
                                    inference_ms,
                                    2,
                                ),

                            "segment":
                                segment_state,

                            "prediction":
                                prediction_payload,

                            "model_loaded":
                                model_runtime.loaded,

                            "recognition_mode":
                                "isolated_gesture",

                            "server_time":
                                utc_now(),
                        }
                    )


                    # =========================================
                    # PERIODIC DEBUG LOG
                    # =========================================

                    if (
                        frame_count
                        % 10
                        == 0
                    ):
                        prediction_text = "-"


                        if (
                            last_prediction
                            is not None
                        ):
                            prediction_text = (
                                f"last="
                                f"{last_prediction.get('label') or '-'} "
                                f"{float(last_prediction.get('confidence_percent', 0) or 0):.1f}% "
                                f"result="
                                f"{last_prediction.get('status')}"
                            )


                        print(
                            "[Realtime] "
                            f"frame={frame_count} "
                            f"state="
                            f"{segment_state.get('status')} "
                            f"source="
                            f"{segment_state.get('source_frames')} "
                            f"motion="
                            f"{float(segment_state.get('motion_ema', 0) or 0):.4f} "
                            f"still="
                            f"{segment_state.get('still_frames')} "
                            f"handL="
                            f"{counts['left_hand']} "
                            f"handR="
                            f"{counts['right_hand']} "
                            f"vision="
                            f"{result['processing_ms']}ms "
                            f"build="
                            f"{segment_build_ms:.2f}ms "
                            f"infer="
                            f"{inference_ms:.2f}ms "
                            f"total="
                            f"{pipeline_ms:.2f}ms "
                            f"{prediction_text}"
                        )


                # =================================================
                # FRAME INPUT ERROR
                # =================================================

                except ValueError as error:
                    await websocket.send_json(
                        {
                            "type":
                                "frame_error",

                            "status":
                                "error",

                            "frame_id":
                                frame_id,

                            "message":
                                str(
                                    error
                                ),

                            "server_time":
                                utc_now(),
                        }
                    )


                # =================================================
                # VISION / PIPELINE ERROR
                # =================================================

                except Exception as error:
                    print(
                        "[Realtime] "
                        "Frame processing error:",
                        error,
                    )


                    await websocket.send_json(
                        {
                            "type":
                                "vision_error",

                            "status":
                                "error",

                            "frame_id":
                                frame_id,

                            "message":
                                str(
                                    error
                                ),

                            "server_time":
                                utc_now(),
                        }
                    )


                continue


            # =================================================
            # UNKNOWN MESSAGE
            # =================================================

            await websocket.send_json(
                {
                    "type":
                        "ack",

                    "status":
                        "ok",

                    "received_type":
                        message_type,

                    "server_time":
                        utc_now(),
                }
            )


    # ========================================================
    # CLIENT DISCONNECT
    # ========================================================

    except WebSocketDisconnect:
        print(
            "[WebSocket] "
            "Client disconnected "
            f"after {frame_count} frames."
        )


    # ========================================================
    # WEBSOCKET ERROR
    # ========================================================

    except Exception as error:
        print(
            "[WebSocket] Error:",
            error,
        )


    # ========================================================
    # CLEANUP
    # ========================================================

    finally:
        segmenter.reset()

        sequence_builder.reset()

        extractor.close()


        try:
            await websocket.close()

        except Exception:
            pass