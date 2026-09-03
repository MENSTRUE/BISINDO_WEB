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

from app.inference.model_runtime import (
    model_runtime,
)

from app.inference.predictor import (
    bisindo_predictor,
)

from app.inference.stabilizer import (
    PredictionStabilizer,
)

from app.services.landmark_extractor import (
    LandmarkExtractor,
)

from app.preprocessing.realtime_sequence import (
    RealtimeSequenceBuilder,
)


router = APIRouter(
    tags=[
        "Realtime"
    ],
)


# ============================================================
# CONFIG
# ============================================================

INFERENCE_EVERY_N_FRAMES = 2


MAX_FRAME_BYTES = (
    2_000_000
)


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
            (
                "Frame bukan "
                "Base64 valid."
            )
        ) from error


    if not frame_bytes:
        raise ValueError(
            (
                "Frame hasil decode "
                "kosong."
            )
        )


    if (
        len(frame_bytes)
        > MAX_FRAME_BYTES
    ):
        raise ValueError(
            (
                "Ukuran frame "
                "terlalu besar."
            )
        )


    return frame_bytes


# ============================================================
# WEBSOCKET
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


    last_client_frame_id = (
        None
    )


    last_prediction = (
        None
    )


    # ========================================================
    # SERVICES
    # ========================================================

    extractor = (
        LandmarkExtractor()
    )


    sequence_builder = (
        RealtimeSequenceBuilder()
    )


    stabilizer = (
        PredictionStabilizer()
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
                    "BISINDO realtime "
                    "channel ready."
                ),

            "vision":
                "ready",

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
            # RESET SEQUENCE
            # =================================================

            if (
                message_type
                == "reset_sequence"
            ):
                sequence_builder.reset()

                stabilizer.reset()


                frame_count = 0


                last_client_frame_id = (
                    None
                )


                last_prediction = (
                    None
                )


                await websocket.send_json(
                    {
                        "type":
                            "sequence_reset",

                        "status":
                            "ok",

                        "count":
                            0,

                        "target":
                            48,

                        "prediction":
                            None,

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
                frame_id = (
                    None
                )


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
                    # NEW CAMERA SESSION
                    # =========================================

                    if (
                        last_client_frame_id
                        is not None

                        and frame_id
                        <= last_client_frame_id
                    ):
                        frame_count = 0


                        sequence_builder.reset()


                        stabilizer.reset()


                        last_prediction = (
                            None
                        )


                    last_client_frame_id = (
                        frame_id
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


                    image_base64 = (
                        message.get(
                            "image_base64",
                            "",
                        )
                    )


                    # =========================================
                    # BASE64 DECODE
                    # =========================================

                    frame_bytes = (
                        decode_frame_base64(
                            image_base64
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


                    # =========================================
                    # LAZY SEQUENCE RECORD
                    #
                    # Tidak build ulang seluruh
                    # sequence 48 frame di sini.
                    # =========================================

                    sequence_status = (
                        sequence_builder
                        .add_frame(
                            frame_id,

                            result[
                                "landmarks"
                            ],
                        )
                    )


                    frame_count += 1


                    # =========================================
                    # COUNTS
                    # =========================================

                    counts = (
                        result[
                            "counts"
                        ]
                    )


                    # =========================================
                    # CURRENT HAND
                    # =========================================

                    current_hand_detected = (
                        (
                            counts[
                                "left_hand"
                            ]
                            > 0
                        )

                        or

                        (
                            counts[
                                "right_hand"
                            ]
                            > 0
                        )
                    )


                    # =========================================
                    # BUILD + MODEL
                    # =========================================

                    build_ms = 0.0


                    if (
                        sequence_status[
                            "ready"
                        ]
                    ):
                        should_infer = (
                            last_prediction
                            is None

                            or

                            (
                                frame_count
                                % INFERENCE_EVERY_N_FRAMES
                                == 0
                            )
                        )


                        if should_infer:
                            # =================================
                            # BUILD FULL 48 FRAME
                            # HANYA SEKARANG
                            # =================================

                            ready_sequences = (
                                sequence_builder
                                .get_ready_sequences()
                            )


                            build_ms = (
                                sequence_builder
                                .last_build_ms
                            )


                            if (
                                ready_sequences
                                is not None
                            ):
                                # =============================
                                # RAW AI
                                # =============================

                                raw_prediction = (
                                    bisindo_predictor
                                    .predict(
                                        ready_sequences
                                    )
                                )


                                # =============================
                                # STABILIZATION
                                # =============================

                                last_prediction = (
                                    stabilizer.update(
                                        raw_prediction,

                                        current_hand_detected=(
                                            current_hand_detected
                                        ),
                                    )
                                )


                    else:
                        last_prediction = (
                            None
                        )


                        stabilizer.reset()


                    # =========================================
                    # PREPROCESSING PERFORMANCE
                    # =========================================

                    sequence_status[
                        "sequence_build_ms"
                    ] = round(
                        build_ms,
                        3,
                    )


                    sequence_status[
                        "preprocessing_ms"
                    ] = round(
                        (
                            sequence_builder
                            .last_record_ms
                        )
                        + build_ms,
                        3,
                    )


                    # =========================================
                    # TOTAL PIPELINE TIME
                    # =========================================

                    pipeline_ms = (
                        (
                            time.perf_counter()
                            - pipeline_started
                        )
                        * 1000.0
                    )


                    # =========================================
                    # SEND ONE RESULT PER FRAME
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

                            "sequence":
                                sequence_status,

                            "prediction":
                                last_prediction,

                            "model_loaded":
                                model_runtime.loaded,

                            "server_time":
                                utc_now(),
                        }
                    )


                    # =========================================
                    # TERMINAL LOG
                    # =========================================

                    if (
                        frame_count
                        % 10
                        == 0
                    ):
                        prediction_text = (
                            "-"
                        )


                        inference_ms = 0.0


                        if (
                            last_prediction
                            is not None
                        ):
                            pred_status = (
                                last_prediction.get(
                                    "status",
                                    "idle",
                                )
                            )


                            raw_label = (
                                last_prediction.get(
                                    "raw_label"
                                )
                                or "-"
                            )


                            raw_conf = float(
                                last_prediction.get(
                                    "raw_confidence_percent",
                                    0.0,
                                )
                                or 0.0
                            )


                            raw_margin = float(
                                last_prediction.get(
                                    "raw_margin_percent",
                                    0.0,
                                )
                                or 0.0
                            )


                            stable_label = (
                                last_prediction.get(
                                    "label"
                                )
                                or "-"
                            )


                            stable_conf = float(
                                last_prediction.get(
                                    "confidence_percent",
                                    0.0,
                                )
                                or 0.0
                            )


                            votes = int(
                                last_prediction.get(
                                    "votes",
                                    0,
                                )
                                or 0
                            )


                            required_votes = int(
                                last_prediction.get(
                                    "required_votes",
                                    3,
                                )
                                or 3
                            )


                            inference_ms = float(
                                last_prediction.get(
                                    "inference_ms",
                                    0.0,
                                )
                                or 0.0
                            )


                            prediction_text = (
                                f"raw={raw_label} "
                                f"{raw_conf:.1f}% "
                                f"margin={raw_margin:.1f}% "
                                f"stable={stable_label} "
                                f"{stable_conf:.1f}% "
                                f"vote={votes}/{required_votes} "
                                f"status={pred_status}"
                            )


                        print(
                            "[Realtime] "

                            f"frame={frame_count} "

                            f"seq="
                            f"{sequence_status['count']}/48 "

                            f"ready="
                            f"{sequence_status['ready']} "

                            f"handL="
                            f"{counts['left_hand']} "

                            f"handR="
                            f"{counts['right_hand']} "

                            f"vision="
                            f"{result['processing_ms']}ms "

                            f"record="
                            f"{sequence_builder.last_record_ms:.2f}ms "

                            f"build="
                            f"{build_ms:.2f}ms "

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
                # VISION / MODEL ERROR
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
    # CLIENT DISCONNECTED
    # ========================================================

    except WebSocketDisconnect:
        print(
            "[WebSocket] "
            "Client disconnected "
            f"after {frame_count} frames."
        )


    # ========================================================
    # SERVER ERROR
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
        sequence_builder.reset()


        stabilizer.reset()


        extractor.close()


        try:
            await websocket.close()

        except Exception:
            pass