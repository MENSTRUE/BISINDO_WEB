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


router = APIRouter(
    tags=["Realtime"],
)


FRAME_ACK_INTERVAL = 5

MAX_FRAME_BYTES = (
    2_000_000
)


def utc_now():
    return datetime.now(
        timezone.utc,
    ).isoformat()


# =========================
# BASE64
# =========================

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
        len(frame_bytes) >
        MAX_FRAME_BYTES
    ):
        raise ValueError(
            "Ukuran frame terlalu besar."
        )


    return frame_bytes


# =========================
# WEBSOCKET
# =========================

@router.websocket(
    "/ws/realtime"
)
async def realtime_websocket(
    websocket: WebSocket,
):
    await websocket.accept()


    frame_count = 0


    extractor = (
        LandmarkExtractor()
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
                message_type ==
                "ping"
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
                message_type ==
                "client_hello"
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

                        "server_time":
                            utc_now(),
                    }
                )

                continue


            # =========================
            # FRAME
            # =========================

            if (
                message_type ==
                "frame"
            ):
                try:
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
                    # LANDMARK EXTRACTION
                    # =========================

                    result = (
                        extractor.extract(
                            frame_bytes
                        )
                    )


                    frame_count += 1


                    # =========================
                    # SEND LANDMARKS
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

                            "server_time":
                                utc_now(),
                        }
                    )


                    # =========================
                    # FRAME ACK
                    # =========================

                    if (
                        frame_count %
                        FRAME_ACK_INTERVAL ==
                        0
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
                    # TERMINAL LOG
                    # =========================

                    if (
                        frame_count %
                        25 ==
                        0
                    ):
                        counts = (
                            result[
                                "counts"
                            ]
                        )


                        print(
                            "[Vision] "
                            f"frame={frame_count} "
                            f"handL="
                            f"{counts['left_hand']} "
                            f"handR="
                            f"{counts['right_hand']} "
                            f"body="
                            f"{counts['pose']} "
                            f"face="
                            f"{counts['face']} "
                            f"time="
                            f"{result['processing_ms']}ms"
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
                        "[Vision] "
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
        extractor.close()


        try:
            await websocket.close()
        except Exception:
            pass