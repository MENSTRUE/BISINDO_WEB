from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect


router = APIRouter(
    tags=["Realtime"],
)


def utc_now():
    return datetime.now(
        timezone.utc,
    ).isoformat()


@router.websocket("/ws/realtime")
async def realtime_websocket(
    websocket: WebSocket,
):
    await websocket.accept()

    await websocket.send_json(
        {
            "type": "connection",
            "status": "connected",
            "message": "BISINDO realtime channel ready.",
            "server_time": utc_now(),
        }
    )

    try:
        while True:
            message = await websocket.receive_json()

            message_type = message.get(
                "type",
                "unknown",
            )

            if message_type == "ping":
                await websocket.send_json(
                    {
                        "type": "pong",
                        "status": "ok",
                        "server_time": utc_now(),
                    }
                )
                continue

            if message_type == "client_hello":
                await websocket.send_json(
                    {
                        "type": "hello_ack",
                        "status": "ok",
                        "message": "BISINDO frontend connected.",
                        "server_time": utc_now(),
                    }
                )
                continue

            await websocket.send_json(
                {
                    "type": "ack",
                    "status": "ok",
                    "received_type": message_type,
                    "server_time": utc_now(),
                }
            )

    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected")

    except Exception as error:
        print("[WebSocket] Error:", error)

        try:
            await websocket.close()
        except Exception:
            pass