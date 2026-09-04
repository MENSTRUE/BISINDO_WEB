import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRealtime,
} from "../contexts/RealtimeContext";


/* =========================
   FRAME CONFIG
========================= */

/*
 * Continuous rolling mode.
 *
 * Gunakan 640 px agar landmark tangan
 * lebih jelas dibanding versi 512 px,
 * tetapi masih lebih ringan daripada
 * mengirim resolusi kamera penuh.
 *
 * Landmark MediaPipe menggunakan
 * koordinat normalized, sehingga
 * dimensi feature model tidak berubah.
 */
const FRAME_WIDTH = 640;


/*
 * Target maksimum 30 FPS agar rolling
 * 48-frame lebih mendekati runtime
 * Python lokal.
 *
 * Backpressure tetap aktif, jadi bila
 * backend hanya mampu 12-18 FPS,
 * streamer otomatis mengikuti kemampuan
 * backend dan tidak menumpuk frame.
 */
const TARGET_FPS = 30;


const TARGET_FRAME_INTERVAL_MS =
  1000 / TARGET_FPS;


/*
 * Scheduler hanya mengecek apakah frame
 * sudah boleh dikirim. Pengiriman nyata
 * tetap dibatasi TARGET_FRAME_INTERVAL_MS
 * dan mekanisme backpressure.
 */
const SCHEDULER_INTERVAL_MS = 10;


/*
 * Naik sedikit dari versi ringan 0.60
 * supaya detail tangan lebih terjaga.
 */
const JPEG_QUALITY = 0.72;


/*
 * Safety timeout.
 *
 * Kalau response backend benar-benar
 * hilang, streamer tidak deadlock.
 */
const MAX_IN_FLIGHT_MS = 1500;


function useFrameStreamer({
  videoRef,
  isCameraActive,
}) {
  /* =========================
     REFS
  ========================= */

  const canvasRef =
    useRef(null);


  const frameIdRef =
    useRef(0);


  const sentFramesRef =
    useRef(0);


  const previousCameraStateRef =
    useRef(false);


  /*
   * BACKPRESSURE
   */
  const waitingForBackendRef =
    useRef(false);


  const pendingFrameIdRef =
    useRef(null);


  const inFlightStartedAtRef =
    useRef(0);


  /*
   * FPS
   */
  const lastSentAtRef =
    useRef(0);


  const previousSuccessfulSendRef =
    useRef(0);


  const smoothedFpsRef =
    useRef(0);


  /* =========================
     REALTIME CONTEXT
  ========================= */

  const {
    isConnected,
    sendMessage,
    lastMessage,
  } = useRealtime();


  /* =========================
     STATE
  ========================= */

  const [
    sentFrames,
    setSentFrames,
  ] = useState(0);


  const [
    receivedFrames,
    setReceivedFrames,
  ] = useState(0);


  const [
    lastFrameBytes,
    setLastFrameBytes,
  ] = useState(0);


  const [
    isStreaming,
    setIsStreaming,
  ] = useState(false);


  const [
    streamFps,
    setStreamFps,
  ] = useState(0);


  /* =========================
     RESET CAMERA SESSION
  ========================= */

  useEffect(() => {
    const wasActive =
      previousCameraStateRef.current;


    if (
      isCameraActive &&
      !wasActive
    ) {
      frameIdRef.current =
        0;


      sentFramesRef.current =
        0;


      waitingForBackendRef.current =
        false;


      pendingFrameIdRef.current =
        null;


      inFlightStartedAtRef.current =
        0;


      lastSentAtRef.current =
        0;


      previousSuccessfulSendRef.current =
        0;


      smoothedFpsRef.current =
        0;


      setSentFrames(
        0
      );


      setReceivedFrames(
        0
      );


      setLastFrameBytes(
        0
      );


      setStreamFps(
        0
      );
    }


    if (
      !isCameraActive
    ) {
      waitingForBackendRef.current =
        false;


      pendingFrameIdRef.current =
        null;


      inFlightStartedAtRef.current =
        0;
    }


    previousCameraStateRef.current =
      isCameraActive;

  }, [
    isCameraActive,
  ]);


  /* =========================
     BACKEND FRAME RESPONSE
  ========================= */

  useEffect(() => {
    if (
      !lastMessage
    ) {
      return;
    }


    const messageType =
      lastMessage.type;


    const isFrameResponse =
      (
        messageType ===
        "landmarks"
      )

      ||

      (
        messageType ===
        "frame_error"
      )

      ||

      (
        messageType ===
        "vision_error"
      );


    if (
      !isFrameResponse
    ) {
      return;
    }


    const responseFrameId =
      Number(
        lastMessage
          .frame_id ??
        0
      );


    const pendingFrameId =
      pendingFrameIdRef.current;


    /*
     * Backend sudah selesai
     * memproses frame in-flight.
     */
    if (
      pendingFrameId !== null

      &&

      (
        responseFrameId <= 0

        ||

        responseFrameId
        >= pendingFrameId
      )
    ) {
      waitingForBackendRef.current =
        false;


      pendingFrameIdRef.current =
        null;


      inFlightStartedAtRef.current =
        0;
    }


    /* =========================
       SUCCESSFUL FRAME
    ========================= */

    if (
      messageType ===
      "landmarks"
    ) {
      if (
        responseFrameId > 0
      ) {
        setReceivedFrames(
          responseFrameId
        );
      }


      setLastFrameBytes(
        Number(
          lastMessage
            .frame_bytes ??
          0
        )
      );
    }

  }, [
    lastMessage,
  ]);


  /* =========================
     DISCONNECTED
  ========================= */

  useEffect(() => {
    if (
      isConnected
    ) {
      return;
    }


    waitingForBackendRef.current =
      false;


    pendingFrameIdRef.current =
      null;


    inFlightStartedAtRef.current =
      0;


    setIsStreaming(
      false
    );

  }, [
    isConnected,
  ]);


  /* =========================
     STREAM
  ========================= */

  useEffect(() => {
    if (
      !isCameraActive ||
      !isConnected
    ) {
      setIsStreaming(
        false
      );

      return undefined;
    }


    setIsStreaming(
      true
    );


    /* =========================
       CANVAS
    ========================= */

    if (
      !canvasRef.current
    ) {
      canvasRef.current =
        document.createElement(
          "canvas"
        );
    }


    const canvas =
      canvasRef.current;


    const context =
      canvas.getContext(
        "2d",
        {
          alpha:
            false,
        }
      );


    if (
      !context
    ) {
      console.error(
        (
          "[FrameStreamer] "
          + "Canvas context gagal dibuat."
        )
      );


      setIsStreaming(
        false
      );


      return undefined;
    }


    /* =========================
       CAPTURE
    ========================= */

    const captureFrame = () => {
      const now =
        performance.now();


      /* =====================
         BACKPRESSURE
      ===================== */

      if (
        waitingForBackendRef.current
      ) {
        const waitingMs =
          (
            now
            - inFlightStartedAtRef.current
          );


        if (
          waitingMs
          < MAX_IN_FLIGHT_MS
        ) {
          return;
        }


        /*
         * Safety reset jika response
         * backend hilang terlalu lama.
         */
        waitingForBackendRef.current =
          false;


        pendingFrameIdRef.current =
          null;


        inFlightStartedAtRef.current =
          0;
      }


      /* =====================
         MAX TARGET FPS
      ===================== */

      if (
        lastSentAtRef.current > 0

        &&

        (
          now
          - lastSentAtRef.current
        )
        <
        TARGET_FRAME_INTERVAL_MS
      ) {
        return;
      }


      /* =====================
         VIDEO
      ===================== */

      const video =
        videoRef.current;


      if (
        !video
      ) {
        return;
      }


      if (
        video.readyState < 2
      ) {
        return;
      }


      const sourceWidth =
        video.videoWidth;


      const sourceHeight =
        video.videoHeight;


      if (
        sourceWidth <= 0 ||
        sourceHeight <= 0
      ) {
        return;
      }


      /* =====================
         RESIZE
      ===================== */

      const targetWidth =
        Math.min(
          FRAME_WIDTH,
          sourceWidth
        );


      const scale =
        (
          targetWidth
          / sourceWidth
        );


      const targetHeight =
        Math.max(
          1,

          Math.round(
            sourceHeight
            * scale
          )
        );


      if (
        canvas.width !==
        targetWidth
      ) {
        canvas.width =
          targetWidth;
      }


      if (
        canvas.height !==
        targetHeight
      ) {
        canvas.height =
          targetHeight;
      }


      /* =====================
         RAW FRAME
         NO MIRROR
      ===================== */

      context.drawImage(
        video,

        0,
        0,

        targetWidth,
        targetHeight
      );


      /* =====================
         JPEG
      ===================== */

      const dataUrl =
        canvas.toDataURL(
          "image/jpeg",
          JPEG_QUALITY
        );


      const separatorIndex =
        dataUrl.indexOf(
          ","
        );


      if (
        separatorIndex < 0
      ) {
        return;
      }


      const imageBase64 =
        dataUrl.slice(
          separatorIndex + 1
        );


      /* =====================
         FRAME ID
      ===================== */

      frameIdRef.current += 1;


      const frameId =
        frameIdRef.current;


      /* =====================
         SEND
      ===================== */

      const sent =
        sendMessage({
          type:
            "frame",

          frame_id:
            frameId,

          timestamp:
            new Date()
              .toISOString(),

          mime_type:
            "image/jpeg",

          width:
            targetWidth,

          height:
            targetHeight,

          image_base64:
            imageBase64,
        });


      if (
        !sent
      ) {
        return;
      }


      /* =====================
         MARK IN-FLIGHT
      ===================== */

      waitingForBackendRef.current =
        true;


      pendingFrameIdRef.current =
        frameId;


      inFlightStartedAtRef.current =
        now;


      lastSentAtRef.current =
        now;


      /* =====================
         SENT COUNT
      ===================== */

      sentFramesRef.current += 1;


      setSentFrames(
        sentFramesRef.current
      );


      /* =====================
         EFFECTIVE FPS
      ===================== */

      const previousSend =
        previousSuccessfulSendRef.current;


      if (
        previousSend > 0
      ) {
        const delta =
          (
            now
            - previousSend
          );


        if (
          delta > 0
        ) {
          const instantFps =
            (
              1000
              / delta
            );


          if (
            smoothedFpsRef.current
            <= 0
          ) {
            smoothedFpsRef.current =
              instantFps;
          }

          else {
            smoothedFpsRef.current =
              (
                (
                  0.80
                  * smoothedFpsRef.current
                )

                +

                (
                  0.20
                  * instantFps
                )
              );
          }


          setStreamFps(
            Math.max(
              1,

              Math.round(
                smoothedFpsRef.current
              )
            )
          );
        }
      }

      else {
        setStreamFps(
          TARGET_FPS
        );
      }


      previousSuccessfulSendRef.current =
        now;
    };


    /* =========================
       SCHEDULER
    ========================= */

    const intervalId =
      window.setInterval(
        captureFrame,
        SCHEDULER_INTERVAL_MS
      );


    /* =========================
       CLEANUP
    ========================= */

    return () => {
      window.clearInterval(
        intervalId
      );


      waitingForBackendRef.current =
        false;


      pendingFrameIdRef.current =
        null;


      inFlightStartedAtRef.current =
        0;


      setIsStreaming(
        false
      );
    };

  }, [
    videoRef,
    isCameraActive,
    isConnected,
    sendMessage,
  ]);


  /* =========================
     OUTPUT
  ========================= */

  return {
    isStreaming,

    streamFps,

    targetFps:
      TARGET_FPS,

    sentFrames,

    receivedFrames,

    lastFrameBytes,
  };
}


export default useFrameStreamer;