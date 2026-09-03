import base64
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
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
        len(frame_bytes) >
        MAX_FRAME_BYTES
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

    await websocket.send_json(
        {
            "type": "connection",
            "status": "connected",
            "message": (
                "BISINDO realtime "
                "channel ready."
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
                        "type": "pong",
                        "status": "ok",
                        "server_time":
                            utc_now(),
                    }
                )

                continue

            # =========================
            # CLIENT HELLO
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

                        "server_time":
                            utc_now(),
                    }
                )

                continue

            # =========================
            # CAMERA FRAME
            # =========================

            if (
                message_type ==
                "frame"
            ):
                try:
                    frame_id = (
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
                            image_base64,
                        )
                    )

                    frame_count += 1

                    # Log jangan tiap frame
                    # supaya terminal tidak banjir.
                    if (
                        frame_count % 25 ==
                        0
                    ):
                        print(
                            "[Frame] "
                            f"received={frame_count} "
                            f"id={frame_id} "
                            f"size={width}x{height} "
                            f"bytes={len(frame_bytes)}"
                        )

                    # Kirim ACK setiap 5 frame.
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

                continue

            # =========================
            # GENERIC ACK
            # =========================

            await websocket.send_json(
                {
                    "type": "ack",
                    "status": "ok",

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

        try:
            await websocket.close()
        except Exception:
            pass