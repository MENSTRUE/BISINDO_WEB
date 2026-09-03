import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRealtime,
} from "../contexts/RealtimeContext";


const FRAME_WIDTH = 640;

const FRAME_INTERVAL_MS = 200;

const JPEG_QUALITY = 0.65;


function useFrameStreamer({
  videoRef,
  isCameraActive,
}) {
  const canvasRef =
    useRef(null);

  const frameIdRef =
    useRef(0);

  const sentFramesRef =
    useRef(0);

  const previousCameraStateRef =
    useRef(false);


  const {
    isConnected,
    sendMessage,
    lastMessage,
  } = useRealtime();


  const [sentFrames, setSentFrames] =
    useState(0);

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


  /* =========================
     RESET NEW CAMERA SESSION
  ========================= */

  useEffect(() => {
    const wasActive =
      previousCameraStateRef.current;

    if (
      isCameraActive &&
      !wasActive
    ) {
      frameIdRef.current = 0;

      sentFramesRef.current = 0;

      setSentFrames(0);
      setReceivedFrames(0);
      setLastFrameBytes(0);
    }

    previousCameraStateRef.current =
      isCameraActive;
  }, [isCameraActive]);


  /* =========================
     BACKEND FRAME ACK
  ========================= */

  useEffect(() => {
    if (
      lastMessage?.type !==
      "frame_ack"
    ) {
      return;
    }

    setReceivedFrames(
      Number(
        lastMessage
          .received_frames ?? 0,
      ),
    );

    setLastFrameBytes(
      Number(
        lastMessage.bytes ?? 0,
      ),
    );
  }, [lastMessage]);


  /* =========================
     FRAME STREAM
  ========================= */

  useEffect(() => {
    if (
      !isCameraActive ||
      !isConnected
    ) {
      setIsStreaming(false);

      return undefined;
    }


    setIsStreaming(true);


    if (!canvasRef.current) {
      canvasRef.current =
        document.createElement(
          "canvas",
        );
    }


    const canvas =
      canvasRef.current;

    const context =
      canvas.getContext(
        "2d",
        {
          alpha: false,
        },
      );


    if (!context) {
      console.error(
        "[FrameStreamer] " +
        "Canvas context gagal dibuat.",
      );

      setIsStreaming(false);

      return undefined;
    }


    const captureFrame = () => {
      const video =
        videoRef.current;


      if (!video) {
        return;
      }


      /*
       * HAVE_CURRENT_DATA = 2
       *
       * Jangan capture sebelum
       * browser punya frame video.
       */
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


      /*
       * Maksimal 640px.
       * Kamera kecil tidak di-upscale.
       */
      const targetWidth =
        Math.min(
          FRAME_WIDTH,
          sourceWidth,
        );


      const scale =
        targetWidth /
        sourceWidth;


      const targetHeight =
        Math.max(
          1,
          Math.round(
            sourceHeight *
            scale,
          ),
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


      /*
       * PENTING:
       *
       * Video di UI boleh mirror
       * lewat CSS.
       *
       * Frame yang dikirim backend
       * harus tetap RAW / tidak mirror.
       */
      context.drawImage(
        video,
        0,
        0,
        targetWidth,
        targetHeight,
      );


      const dataUrl =
        canvas.toDataURL(
          "image/jpeg",
          JPEG_QUALITY,
        );


      const separatorIndex =
        dataUrl.indexOf(",");


      if (
        separatorIndex < 0
      ) {
        return;
      }


      const imageBase64 =
        dataUrl.slice(
          separatorIndex + 1,
        );


      frameIdRef.current += 1;


      const frameId =
        frameIdRef.current;


      const sent =
        sendMessage({
          type: "frame",

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


      if (sent) {
        sentFramesRef.current += 1;

        setSentFrames(
          sentFramesRef.current,
        );
      }
    };


    /*
     * 200 ms = 5 FPS
     */
    const intervalId =
      window.setInterval(
        captureFrame,
        FRAME_INTERVAL_MS,
      );


    return () => {
      window.clearInterval(
        intervalId,
      );

      setIsStreaming(false);
    };
  }, [
    videoRef,
    isCameraActive,
    isConnected,
    sendMessage,
  ]);


  return {
    isStreaming,

    streamFps:
      Math.round(
        1000 /
        FRAME_INTERVAL_MS,
      ),

    sentFrames,
    receivedFrames,
    lastFrameBytes,
  };
}


export default useFrameStreamer;