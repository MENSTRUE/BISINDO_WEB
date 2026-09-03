import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createRealtimeSocket,
} from "../services/realtimeSocket";


const RealtimeContext =
  createContext(null);


const RECONNECT_DELAY_MS = 2000;
const PING_INTERVAL_MS = 10000;


function RealtimeProvider({
  children,
}) {
  const socketRef =
    useRef(null);

  const reconnectTimerRef =
    useRef(null);

  const pingTimerRef =
    useRef(null);

  const shouldReconnectRef =
    useRef(true);


  const [status, setStatus] =
    useState("connecting");

  const [lastMessage, setLastMessage] =
    useState(null);

  const [lastPongAt, setLastPongAt] =
    useState(null);

  const [error, setError] =
    useState("");


  /* =========================
     CLEAR TIMERS
  ========================= */

  const clearPingTimer =
    useCallback(() => {
      if (pingTimerRef.current) {
        window.clearInterval(
          pingTimerRef.current,
        );

        pingTimerRef.current = null;
      }
    }, []);


  const clearReconnectTimer =
    useCallback(() => {
      if (
        reconnectTimerRef.current
      ) {
        window.clearTimeout(
          reconnectTimerRef.current,
        );

        reconnectTimerRef.current =
          null;
      }
    }, []);


  /* =========================
     SEND
  ========================= */

  const sendMessage =
    useCallback((payload) => {
      const socket =
        socketRef.current;

      if (
        !socket ||
        socket.readyState !==
          WebSocket.OPEN
      ) {
        return false;
      }

      try {
        socket.send(
          JSON.stringify(payload),
        );

        return true;
      } catch (sendError) {
        console.error(
          "WebSocket send error:",
          sendError,
        );

        return false;
      }
    }, []);


  /* =========================
     CONNECTION
  ========================= */

  const connect =
    useCallback(() => {
      const existingSocket =
        socketRef.current;

      if (
        existingSocket &&
        (
          existingSocket.readyState ===
            WebSocket.OPEN ||
          existingSocket.readyState ===
            WebSocket.CONNECTING
        )
      ) {
        return;
      }

      clearReconnectTimer();

      setStatus("connecting");
      setError("");

      const socket =
        createRealtimeSocket();

      socketRef.current = socket;


      /* =========================
         OPEN
      ========================= */

      socket.onopen = () => {
        console.log(
          "[WebSocket] Connected",
        );

        setStatus("connected");
        setError("");

        socket.send(
          JSON.stringify({
            type: "client_hello",
            client: "bisindo-web",
            client_time:
              new Date().toISOString(),
          }),
        );

        clearPingTimer();

        pingTimerRef.current =
          window.setInterval(() => {
            if (
              socket.readyState ===
              WebSocket.OPEN
            ) {
              socket.send(
                JSON.stringify({
                  type: "ping",
                  client_time:
                    new Date()
                      .toISOString(),
                }),
              );
            }
          }, PING_INTERVAL_MS);
      };


      /* =========================
         MESSAGE
      ========================= */

      socket.onmessage = (
        event,
      ) => {
        try {
          const data =
            JSON.parse(event.data);

          console.log(
            "[WebSocket] Message:",
            data,
          );

          setLastMessage(data);

          if (
            data.type === "pong"
          ) {
            setLastPongAt(
              new Date(),
            );
          }
        } catch (parseError) {
          console.error(
            "WebSocket message parse error:",
            parseError,
          );
        }
      };


      /* =========================
         ERROR
      ========================= */

      socket.onerror = () => {
        setStatus("error");

        setError(
          "Koneksi WebSocket mengalami error.",
        );
      };


      /* =========================
         CLOSE
      ========================= */

      socket.onclose = (
        event,
      ) => {
        console.log(
          "[WebSocket] Disconnected",
          event.code,
        );

        clearPingTimer();

        if (
          socketRef.current ===
          socket
        ) {
          socketRef.current = null;
        }

        setStatus("disconnected");

        if (
          shouldReconnectRef.current
        ) {
          reconnectTimerRef.current =
            window.setTimeout(
              () => {
                connect();
              },
              RECONNECT_DELAY_MS,
            );
        }
      };
    }, [
      clearPingTimer,
      clearReconnectTimer,
    ]);


  /* =========================
     MANUAL DISCONNECT
  ========================= */

  const disconnect =
    useCallback(() => {
      shouldReconnectRef.current =
        false;

      clearPingTimer();
      clearReconnectTimer();

      const socket =
        socketRef.current;

      if (socket) {
        socket.close();
      }

      socketRef.current = null;

      setStatus("disconnected");
    }, [
      clearPingTimer,
      clearReconnectTimer,
    ]);


  /* =========================
     MANUAL RECONNECT
  ========================= */

  const reconnect =
    useCallback(() => {
      shouldReconnectRef.current =
        true;

      clearReconnectTimer();

      const socket =
        socketRef.current;

      if (socket) {
        socket.close();
        socketRef.current = null;
      }

      window.setTimeout(
        connect,
        50,
      );
    }, [
      connect,
      clearReconnectTimer,
    ]);


  /* =========================
     LIFECYCLE
  ========================= */

  useEffect(() => {
    shouldReconnectRef.current =
      true;

    connect();

    return () => {
      shouldReconnectRef.current =
        false;

      clearPingTimer();
      clearReconnectTimer();

      const socket =
        socketRef.current;

      if (socket) {
        /*
         * Hindari reconnect ketika
         * component benar-benar unmount.
         */
        socket.onclose = null;

        socket.close();
      }

      socketRef.current = null;
    };
  }, [
    connect,
    clearPingTimer,
    clearReconnectTimer,
  ]);


  /* =========================
     CONTEXT VALUE
  ========================= */

  const value = useMemo(
    () => ({
      status,

      isConnected:
        status === "connected",

      isConnecting:
        status === "connecting",

      lastMessage,
      lastPongAt,
      error,

      sendMessage,
      reconnect,
      disconnect,
    }),
    [
      status,
      lastMessage,
      lastPongAt,
      error,
      sendMessage,
      reconnect,
      disconnect,
    ],
  );


  return (
    <RealtimeContext.Provider
      value={value}
    >
      {children}
    </RealtimeContext.Provider>
  );
}


function useRealtime() {
  const context =
    useContext(
      RealtimeContext,
    );

  if (!context) {
    throw new Error(
      "useRealtime harus digunakan di dalam RealtimeProvider.",
    );
  }

  return context;
}


export {
  RealtimeProvider,
  useRealtime,
};