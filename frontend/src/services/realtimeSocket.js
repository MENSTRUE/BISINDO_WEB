const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ??
  "ws://127.0.0.1:8000";

const REALTIME_WS_URL =
  `${WS_BASE_URL}/ws/realtime`;


function createRealtimeSocket() {
  return new WebSocket(
    REALTIME_WS_URL,
  );
}


export {
  WS_BASE_URL,
  REALTIME_WS_URL,
  createRealtimeSocket,
};