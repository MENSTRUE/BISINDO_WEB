import { useEffect, useRef, useState } from "react";

function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isCameraActive, setIsCameraActive] =
    useState(false);

  const [cameraStatus, setCameraStatus] =
    useState("idle");

  const [cameraError, setCameraError] =
    useState("");

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setCameraStatus("idle");
  };

  const startCamera = async () => {
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraStatus("error");

      setCameraError(
        "Browser tidak mendukung akses kamera.",
      );

      return;
    }

    try {
      setCameraError("");
      setCameraStatus("requesting");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",

            width: {
              ideal: 1280,
            },

            height: {
              ideal: 720,
            },
          },

          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setCameraStatus("active");
    } catch (error) {
      console.error(
        "Camera access error:",
        error,
      );

      setIsCameraActive(false);
      setCameraStatus("error");

      if (error.name === "NotAllowedError") {
        setCameraError(
          "Izin kamera ditolak. Izinkan kamera melalui pengaturan browser.",
        );
      } else if (
        error.name === "NotFoundError"
      ) {
        setCameraError(
          "Kamera tidak ditemukan pada perangkat.",
        );
      } else if (
        error.name === "NotReadableError"
      ) {
        setCameraError(
          "Kamera sedang digunakan aplikasi lain.",
        );
      } else {
        setCameraError(
          "Kamera tidak dapat diaktifkan.",
        );
      }
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }
    };
  }, []);

  return {
    videoRef,
    isCameraActive,
    cameraStatus,
    cameraError,
    startCamera,
    stopCamera,
  };
}

export default useCamera;