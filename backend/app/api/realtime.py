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

MAX_FRAME_BYTES = 2_000_000


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


@router.websocket(
    "/ws/realtime"
)
async def realtime_websocket(
    websocket: WebSocket,
):
    await websocket.accept()

    frame_count = 0
    last_client_frame_id = None

    extractor = (
        LandmarkExtractor()
    )

    sequence_builder = (
        MultimodalSequenceBuilder()
    )

    await websocket.send_json(
        {
            "type":
                "connection",

            "status":
                "connected",

            "message": (
                "BISINDO realtime "
                "channel ready."
            ),

            "vision":
                "ready",

            "sequence_target":
                48,

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

            # =========================
            # PING
            # =========================

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

                        "server_time":
                            utc_now(),
                    }
                )

                continue

            # =========================
            # HELLO
            # =========================

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

                        "message": (
                            "BISINDO frontend "
                            "connected."
                        ),

                        "vision":
                            "ready",

                        "sequence_target":
                            48,

                        "server_time":
                            utc_now(),
                    }
                )

                continue

            # =========================
            # MANUAL RESET
            # =========================

            if (
                message_type
                == "reset_sequence"
            ):
                sequence_builder.reset()

                frame_count = 0

                last_client_frame_id = (
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

                        "server_time":
                            utc_now(),
                    }
                )

                continue

            # =========================
            # FRAME
            # =========================

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

                    # New camera session.
                    if (
                        last_client_frame_id
                        is not None
                        and frame_id
                        <= last_client_frame_id
                    ):
                        frame_count = 0

                        sequence_builder.reset()

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

                    # =========================
                    # VISION
                    # =========================

                    result = (
                        extractor.extract(
                            frame_bytes
                        )
                    )

                    # =========================
                    # SEQUENCE PREPROCESSING
                    # =========================

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

                    # =========================
                    # SEND LANDMARK + SEQUENCE
                    # =========================

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

                            "server_time":
                                utc_now(),
                        }
                    )

                    # =========================
                    # ACK
                    # =========================

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

                    # =========================
                    # LOG
                    # =========================

                    if (
                        frame_count % 10
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

                        print(
                            "[Realtime] "
                            f"frame={frame_count} "
                            f"seq={seq_count}/48 "
                            f"ready={seq_ready} "
                            f"handL={counts['left_hand']} "
                            f"handR={counts['right_hand']} "
                            f"body={counts['pose']} "
                            f"face={counts['face']} "
                            f"vision={result['processing_ms']}ms "
                            f"prep="
                            f"{sequence_status['preprocessing_ms']}ms"
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

            # =========================
            # GENERIC
            # =========================

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