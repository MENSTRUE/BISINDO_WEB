import {
  useCallback,
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
     STOP STREAM INTERNAL
  ========================= */

  const stopStream = useCallback(() => {
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
  }, []);

  /* =========================
     STOP CAMERA
  ========================= */

  const stopCamera = useCallback(() => {
    stopStream();

    setIsCameraActive(false);
    setCameraStatus("idle");
    setCameraError("");
    setActiveCameraName("");
  }, [stopStream]);

  /* =========================
     START CAMERA
  ========================= */

  const startCamera = useCallback(async () => {
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
      stopStream();

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
        "[Camera] Available cameras:",
        cameras,
      );

      if (cameras.length === 0) {
        throw new DOMException(
          "Tidak ada kamera ditemukan.",
          "NotFoundError",
        );
      }

      /* =========================
         SELECT PHYSICAL CAMERA
      ========================= */

      const physicalCamera =
        cameras.find((camera) => {
          const label =
            camera.label
              ?.toLowerCase()
              .trim() ?? "";

          return (
            !label.includes("obs") &&
            !label.includes("virtual") &&
            !label.includes("droidcam") &&
            !label.includes("snap camera")
          );
        }) ?? cameras[0];

      console.log(
        "[Camera] Selected camera:",
        physicalCamera,
      );

      /* =========================
         OPEN CAMERA
      ========================= */

      let stream;

      try {
        /*
         * Jangan pakai:
         *
         * deviceId: {
         *   exact: ...
         * }
         *
         * karena terlalu ketat dan bisa
         * menghasilkan OverconstrainedError.
         */
        stream =
          await navigator.mediaDevices
            .getUserMedia({
              video: {
                deviceId:
                  physicalCamera.deviceId
                    ? {
                        ideal:
                          physicalCamera.deviceId,
                      }
                    : undefined,

                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },

                facingMode: {
                  ideal: "user",
                },
              },

              audio: false,
            });
      } catch (constraintError) {
        /*
         * Kalau browser menolak constraint,
         * biarkan browser memilih konfigurasi
         * kamera yang didukung.
         */
        if (
          constraintError.name !==
          "OverconstrainedError"
        ) {
          throw constraintError;
        }

        console.warn(
          "[Camera] Constraint ideal gagal. " +
          "Fallback ke video:true.",
          constraintError,
        );

        stream =
          await navigator.mediaDevices
            .getUserMedia({
              video: true,
              audio: false,
            });
      }

      streamRef.current = stream;

      /* =========================
         GET ACTIVE VIDEO TRACK
      ========================= */

      const videoTrack =
        stream.getVideoTracks()[0];

      if (!videoTrack) {
        throw new DOMException(
          "Video track tidak tersedia.",
          "NotFoundError",
        );
      }

      const settings =
        videoTrack.getSettings();

      const label =
        videoTrack.label ||
        physicalCamera.label ||
        "Camera";

      console.log(
        "[Camera] Camera started:",
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

        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn(
            "[Camera] video.play() warning:",
            playError,
          );
        }
      }

      /* =========================
         CAMERA READY
      ========================= */

      setIsCameraActive(true);
      setCameraStatus("active");
      setCameraError("");
    } catch (error) {
      console.error(
        "[Camera] Access error:",
        error,
      );

      stopStream();

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

        return;
      }

      if (
        error.name === "NotFoundError"
      ) {
        setCameraError(
          "Kamera tidak ditemukan pada perangkat.",
        );

        return;
      }

      if (
        error.name === "NotReadableError"
      ) {
        setCameraError(
          "Kamera ditemukan, tetapi tidak dapat dibuka. Pastikan kamera tidak sedang digunakan aplikasi lain.",
        );

        return;
      }

      if (
        error.name ===
        "OverconstrainedError"
      ) {
        setCameraError(
          "Browser tidak menemukan konfigurasi kamera yang sesuai.",
        );

        return;
      }

      if (
        error.name === "AbortError"
      ) {
        setCameraError(
          "Proses membuka kamera dibatalkan oleh perangkat.",
        );

        return;
      }

      if (
        error.name === "SecurityError"
      ) {
        setCameraError(
          "Browser memblokir akses kamera karena kebijakan keamanan.",
        );

        return;
      }

      setCameraError(
        error?.message
          ? `Kamera tidak dapat diaktifkan: ${error.message}`
          : "Kamera tidak dapat diaktifkan.",
      );
    }
  }, [stopStream]);

  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  /* =========================
     RETURN
  ========================= */

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