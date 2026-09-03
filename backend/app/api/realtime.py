import base64
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

from app.services.landmark_extractor import (
    LandmarkExtractor,
)

from app.preprocessing.multimodal_sequence import (
    MultimodalSequenceBuilder,
)


router = APIRouter(
    tags=["Realtime"],
)


FRAME_ACK_INTERVAL = 5

INFERENCE_EVERY_N_FRAMES = 2

MAX_FRAME_BYTES = (
    2_000_000
)


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
# WEBSOCKET
# ============================================================

@router.websocket(
    "/ws/realtime"
)
async def realtime_websocket(
    websocket: WebSocket,
):
    await websocket.accept()


    frame_count = 0

    last_client_frame_id = (
        None
    )

    last_prediction = None


    extractor = (
        LandmarkExtractor()
    )


    sequence_builder = (
        MultimodalSequenceBuilder()
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
            # HELLO
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

                frame_count = 0

                last_client_frame_id = (
                    None
                )

                last_prediction = None


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
                try:
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

                        last_prediction = None


                    last_client_frame_id = (
                        frame_id
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


                    image_base64 = (
                        message.get(
                            "image_base64",
                            "",
                        )
                    )


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
                    # SEQUENCE
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
                    # REAL INFERENCE
                    # =========================================

                    if (
                        sequence_status[
                            "ready"
                        ]
                    ):
                        should_infer = (
                            last_prediction
                            is None
                            or frame_count
                            % INFERENCE_EVERY_N_FRAMES
                            == 0
                        )


                        if should_infer:
                            ready_sequences = (
                                sequence_builder
                                .get_ready_sequences()
                            )


                            if (
                                ready_sequences
                                is not None
                            ):
                                last_prediction = (
                                    bisindo_predictor
                                    .predict(
                                        ready_sequences
                                    )
                                )

                    else:
                        last_prediction = (
                            None
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

                            "landmarks":
                                result[
                                    "landmarks"
                                ],

                            "counts":
                                result[
                                    "counts"
                                ],

                            "processing_ms":
                                result[
                                    "processing_ms"
                                ],

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
                    # FRAME ACK
                    # =========================================

                    if (
                        frame_count
                        % FRAME_ACK_INTERVAL
                        == 0
                    ):
                        await websocket.send_json(
                            {
                                "type":
                                    "frame_ack",

                                "status":
                                    "ok",

                                "frame_id":
                                    frame_id,

                                "received_frames":
                                    frame_count,

                                "width":
                                    width,

                                "height":
                                    height,

                                "bytes":
                                    len(
                                        frame_bytes
                                    ),

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
                        counts = (
                            result[
                                "counts"
                            ]
                        )


                        seq_count = (
                            sequence_status[
                                "count"
                            ]
                        )


                        seq_ready = (
                            sequence_status[
                                "ready"
                            ]
                        )


                        prediction_text = (
                            "-"
                        )


                        if (
                            last_prediction
                            and last_prediction
                            .get(
                                "status"
                            )
                            == "ok"
                        ):
                            prediction_text = (
                                (
                                    f"{last_prediction['label']} "
                                    f"{last_prediction['confidence_percent']:.1f}% "
                                    f"{last_prediction['inference_ms']}ms"
                                )
                            )


                        elif (
                            last_prediction
                            and last_prediction
                            .get(
                                "status"
                            )
                            == "waiting_for_hand"
                        ):
                            prediction_text = (
                                "waiting_hand"
                            )


                        print(
                            "[Realtime] "
                            f"frame={frame_count} "
                            f"seq={seq_count}/48 "
                            f"ready={seq_ready} "
                            f"handL={counts['left_hand']} "
                            f"handR={counts['right_hand']} "
                            f"body={counts['pose']} "
                            f"face={counts['face']} "
                            f"vision="
                            f"{result['processing_ms']}ms "
                            f"prep="
                            f"{sequence_status['preprocessing_ms']}ms "
                            f"pred="
                            f"{prediction_text}"
                        )


                except ValueError as error:
                    await websocket.send_json(
                        {
                            "type":
                                "frame_error",

                            "status":
                                "error",

                            "message":
                                str(error),

                            "server_time":
                                utc_now(),
                        }
                    )


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

                            "message":
                                str(error),

                            "server_time":
                                utc_now(),
                        }
                    )


                continue


            # =================================================
            # GENERIC ACK
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


    except WebSocketDisconnect:
        print(
            "[WebSocket] "
            "Client disconnected "
            f"after {frame_count} frames."
        )


    except Exception as error:
        print(
            "[WebSocket] Error:",
            error,
        )


    finally:
        sequence_builder.reset()

        extractor.close()


        try:
            await websocket.close()

        except Exception:
            pass