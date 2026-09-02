import {
  useEffect,
  useRef,
  useState,
} from "react";

function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isCameraActive, setIsCameraActive] =
    useState(false);

  const [cameraStatus, setCameraStatus] =
    useState("idle");

  const [cameraError, setCameraError] =
    useState("");

  const [activeCameraName, setActiveCameraName] =
    useState("");

  /* =========================
     STOP CAMERA
  ========================= */

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
    setActiveCameraName("");
  };

  /* =========================
     START CAMERA
  ========================= */

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

      /*
       * Pastikan stream lama benar-benar
       * dihentikan sebelum meminta kamera baru.
       */
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        streamRef.current = null;
      }

      /* =========================
         DETECT AVAILABLE CAMERAS
      ========================= */

      const devices =
        await navigator.mediaDevices
          .enumerateDevices();

      const cameras = devices.filter(
        (device) =>
          device.kind === "videoinput",
      );

      console.log(
        "Available cameras:",
        cameras,
      );

      if (cameras.length === 0) {
        throw new DOMException(
          "Tidak ada kamera ditemukan.",
          "NotFoundError",
        );
      }

      /*
       * Hindari virtual camera jika ada.
       */
      const physicalCamera =
        cameras.find((camera) => {
          const label =
            camera.label
              .toLowerCase()
              .trim();

          return (
            !label.includes("obs") &&
            !label.includes("virtual") &&
            !label.includes("droidcam") &&
            !label.includes("snap camera")
          );
        }) ?? cameras[0];

      console.log(
        "Selected camera:",
        physicalCamera,
      );

      /* =========================
         OPEN SELECTED CAMERA
      ========================= */

      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            video: {
              deviceId: {
                exact:
                  physicalCamera.deviceId,
              },

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

      /* =========================
         GET ACTUAL ACTIVE DEVICE
      ========================= */

      const videoTrack =
        stream.getVideoTracks()[0];

      const settings =
        videoTrack?.getSettings();

      const label =
        videoTrack?.label ||
        physicalCamera.label ||
        "Camera";

      console.log(
        "Camera started:",
        {
          label,
          settings,
        },
      );

      setActiveCameraName(label);

      /* =========================
         ATTACH TO VIDEO
      ========================= */

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setCameraStatus("active");
    } catch (error) {
      console.error(
        "Camera access error:",
        error,
      );

      /*
       * Pastikan stream gagal tidak tertinggal.
       */
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
      setCameraStatus("error");
      setActiveCameraName("");

      /* =========================
         FRIENDLY ERRORS
      ========================= */

      if (
        error.name === "NotAllowedError"
      ) {
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
          "Kamera ditemukan, tetapi tidak dapat dibuka. Pastikan kamera tidak sedang digunakan aplikasi lain.",
        );
      } else if (
        error.name === "OverconstrainedError"
      ) {
        setCameraError(
          "Konfigurasi kamera tidak didukung oleh perangkat.",
        );
      } else if (
        error.name === "AbortError"
      ) {
        setCameraError(
          "Proses membuka kamera dibatalkan oleh perangkat.",
        );
      } else {
        setCameraError(
          `Kamera tidak dapat diaktifkan${
            error?.message
              ? `: ${error.message}`
              : "."
          }`,
        );
      }
    }
  };

  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        streamRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,

    isCameraActive,
    cameraStatus,
    cameraError,
    activeCameraName,

    startCamera,
    stopCamera,
  };
}

export default useCamera;