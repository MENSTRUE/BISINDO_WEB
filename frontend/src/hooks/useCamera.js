import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";


const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const TARGET_FPS = 30;


/* =========================================================
   HELPERS
========================================================= */

function clamp(
  value,
  min,
  max,
) {
  return Math.min(
    Math.max(
      value,
      min,
    ),
    max,
  );
}


function supportsMode(
  capability,
  mode,
) {
  return (
    Array.isArray(
      capability,
    ) &&
    capability.includes(
      mode,
    )
  );
}


async function safeApplyConstraints(
  track,
  constraints,
  label,
) {
  try {
    await track.applyConstraints(
      constraints,
    );

    console.log(
      `[Camera] ✅ ${label}`,
      constraints,
    );

    return true;
  } catch (error) {
    console.warn(
      `[Camera] ⚠️ ${label} tidak didukung:`,
      error,
    );

    return false;
  }
}


/* =========================================================
   CAMERA HARDWARE TUNING
========================================================= */

async function configureCameraTrack(
  track,
) {
  if (
    !track ||
    typeof track.applyConstraints !==
      "function"
  ) {
    return;
  }


  const supported =
    navigator.mediaDevices
      ?.getSupportedConstraints?.() ??
    {};


  let capabilities = {};

  try {
    capabilities =
      track.getCapabilities?.() ??
      {};
  } catch (error) {
    console.warn(
      "[Camera] getCapabilities gagal:",
      error,
    );
  }


  console.log(
    "[Camera] Supported constraints:",
    supported,
  );

  console.log(
    "[Camera] Capabilities:",
    capabilities,
  );


  /* =======================================================
     RESOLUTION + FPS
  ======================================================= */

  await safeApplyConstraints(
    track,
    {
      width: {
        ideal:
          TARGET_WIDTH,
      },

      height: {
        ideal:
          TARGET_HEIGHT,
      },

      frameRate: {
        ideal:
          TARGET_FPS,

        max:
          TARGET_FPS,
      },
    },
    "Resolution/FPS configured",
  );


  /* =======================================================
     AUTO EXPOSURE
  ======================================================= */

  if (
    supported.exposureMode &&
    supportsMode(
      capabilities.exposureMode,
      "continuous",
    )
  ) {
    await safeApplyConstraints(
      track,
      {
        advanced: [
          {
            exposureMode:
              "continuous",
          },
        ],
      },
      "Auto exposure enabled",
    );
  }


  /* =======================================================
     AUTO WHITE BALANCE
  ======================================================= */

  if (
    supported.whiteBalanceMode &&
    supportsMode(
      capabilities.whiteBalanceMode,
      "continuous",
    )
  ) {
    await safeApplyConstraints(
      track,
      {
        advanced: [
          {
            whiteBalanceMode:
              "continuous",
          },
        ],
      },
      "Auto white balance enabled",
    );
  }


  /* =======================================================
     AUTO FOCUS
  ======================================================= */

  if (
    supported.focusMode &&
    supportsMode(
      capabilities.focusMode,
      "continuous",
    )
  ) {
    await safeApplyConstraints(
      track,
      {
        advanced: [
          {
            focusMode:
              "continuous",
          },
        ],
      },
      "Continuous autofocus enabled",
    );
  }


  /* =======================================================
     EXPOSURE COMPENSATION
     
     Naik sedikit jika webcam mendukung.
     Bukan exposure manual.
  ======================================================= */

  if (
    supported.exposureCompensation &&
    capabilities
      .exposureCompensation &&
    typeof capabilities
        .exposureCompensation
        .min ===
      "number" &&
    typeof capabilities
        .exposureCompensation
        .max ===
      "number"
  ) {
    const min =
      capabilities
        .exposureCompensation
        .min;

    const max =
      capabilities
        .exposureCompensation
        .max;


    /*
     * +0.5 cukup ringan.
     * Tidak sengaja dibuat terlalu terang
     * karena landmark tangan juga bisa rusak
     * kalau highlight overexposed.
     */

    const target =
      clamp(
        0.5,
        min,
        max,
      );


    await safeApplyConstraints(
      track,
      {
        advanced: [
          {
            exposureCompensation:
              target,
          },
        ],
      },
      `Exposure compensation ${target}`,
    );
  }


  /* =======================================================
     OPTIONAL BRIGHTNESS RECOVERY

     Hanya dilakukan kalau:
     - browser expose brightness control
     - current brightness tersedia
     - brightness sekarang memang rendah
  ======================================================= */

  try {
    const currentSettings =
      track.getSettings();


    const brightnessCaps =
      capabilities.brightness;


    if (
      supported.brightness &&
      brightnessCaps &&
      typeof brightnessCaps.min ===
        "number" &&
      typeof brightnessCaps.max ===
        "number"
    ) {
      const min =
        brightnessCaps.min;

      const max =
        brightnessCaps.max;

      const midpoint =
        min +
        (
          max -
          min
        ) *
          0.55;


      const current =
        typeof currentSettings
          .brightness ===
        "number"
          ? currentSettings
              .brightness
          : null;


      /*
       * Jangan utak-atik brightness kalau
       * driver tidak memberi current value.
       */

      if (
        current !== null &&
        current <
          midpoint
      ) {
        await safeApplyConstraints(
          track,
          {
            advanced: [
              {
                brightness:
                  midpoint,
              },
            ],
          },
          `Brightness raised to ${midpoint}`,
        );
      }
    }
  } catch (error) {
    console.warn(
      "[Camera] Brightness tuning skipped:",
      error,
    );
  }


  console.log(
    "[Camera] Final settings:",
    track.getSettings?.(),
  );
}


/* =========================================================
   HOOK
========================================================= */

function useCamera() {
  const videoRef =
    useRef(null);

  const streamRef =
    useRef(null);


  const [
    isCameraActive,
    setIsCameraActive,
  ] =
    useState(false);


  const [
    cameraStatus,
    setCameraStatus,
  ] =
    useState("idle");


  const [
    cameraError,
    setCameraError,
  ] =
    useState("");


  const [
    activeCameraName,
    setActiveCameraName,
  ] =
    useState("");


  const [
    cameraSettings,
    setCameraSettings,
  ] =
    useState(null);


  const [
    cameraCapabilities,
    setCameraCapabilities,
  ] =
    useState(null);


  /* =========================
     STOP STREAM INTERNAL
  ========================= */

  const stopStream =
    useCallback(() => {
      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach(
            (
              track
            ) => {
              track.stop();
            },
          );

        streamRef.current =
          null;
      }


      if (
        videoRef.current
      ) {
        videoRef.current.srcObject =
          null;
      }
    }, []);


  /* =========================
     STOP CAMERA
  ========================= */

  const stopCamera =
    useCallback(() => {
      stopStream();

      setIsCameraActive(
        false,
      );

      setCameraStatus(
        "idle",
      );

      setCameraError(
        "",
      );

      setActiveCameraName(
        "",
      );

      setCameraSettings(
        null,
      );

      setCameraCapabilities(
        null,
      );
    }, [
      stopStream,
    ]);


  /* =========================
     START CAMERA
  ========================= */

  const startCamera =
    useCallback(
      async () => {
        if (
          !navigator
            .mediaDevices ||
          !navigator
            .mediaDevices
            .getUserMedia
        ) {
          setCameraStatus(
            "error",
          );

          setCameraError(
            "Browser tidak mendukung akses kamera.",
          );

          return;
        }


        try {
          setCameraError(
            "",
          );

          setCameraStatus(
            "requesting",
          );


          /*
           * Pastikan stream lama berhenti
           * sebelum kamera dibuka ulang.
           */

          stopStream();


          /* =====================
             DETECT CAMERAS
          ===================== */

          const devices =
            await navigator
              .mediaDevices
              .enumerateDevices();


          const cameras =
            devices.filter(
              (
                device
              ) =>
                device.kind ===
                "videoinput",
            );


          console.log(
            "[Camera] Available cameras:",
            cameras,
          );


          if (
            cameras.length ===
            0
          ) {
            throw new DOMException(
              "Tidak ada kamera ditemukan.",
              "NotFoundError",
            );
          }


          /* =====================
             SELECT REAL CAMERA
          ===================== */

          const physicalCamera =
            cameras.find(
              (
                camera
              ) => {
                const label =
                  camera.label
                    ?.toLowerCase()
                    .trim() ??
                  "";


                return (
                  !label.includes(
                    "obs",
                  ) &&
                  !label.includes(
                    "virtual",
                  ) &&
                  !label.includes(
                    "droidcam",
                  ) &&
                  !label.includes(
                    "snap camera",
                  )
                );
              },
            ) ??
            cameras[0];


          console.log(
            "[Camera] Selected camera:",
            physicalCamera,
          );


          /* =====================
             OPEN CAMERA
          ===================== */

          let stream;


          try {
            stream =
              await navigator
                .mediaDevices
                .getUserMedia({
                  video: {
                    deviceId:
                      physicalCamera
                        .deviceId
                        ? {
                            ideal:
                              physicalCamera
                                .deviceId,
                          }
                        : undefined,

                    width: {
                      ideal:
                        TARGET_WIDTH,
                    },

                    height: {
                      ideal:
                        TARGET_HEIGHT,
                    },

                    frameRate: {
                      ideal:
                        TARGET_FPS,

                      max:
                        TARGET_FPS,
                    },

                    facingMode: {
                      ideal:
                        "user",
                    },

                    resizeMode: {
                      ideal:
                        "crop-and-scale",
                    },
                  },

                  audio:
                    false,
                });
          } catch (
            constraintError
          ) {
            if (
              constraintError
                .name !==
              "OverconstrainedError"
            ) {
              throw constraintError;
            }


            console.warn(
              "[Camera] Constraint ideal gagal. Fallback.",
              constraintError,
            );


            stream =
              await navigator
                .mediaDevices
                .getUserMedia({
                  video:
                    true,

                  audio:
                    false,
                });
          }


          streamRef.current =
            stream;


          /* =====================
             VIDEO TRACK
          ===================== */

          const videoTrack =
            stream
              .getVideoTracks()[0];


          if (
            !videoTrack
          ) {
            throw new DOMException(
              "Video track tidak tersedia.",
              "NotFoundError",
            );
          }


          /* =====================
             CAMERA TUNING
          ===================== */

          await configureCameraTrack(
            videoTrack,
          );


          /* =====================
             READ CAPABILITIES
          ===================== */

          try {
            const capabilities =
              videoTrack
                .getCapabilities?.() ??
              null;


            setCameraCapabilities(
              capabilities,
            );
          } catch (
            error
          ) {
            console.warn(
              "[Camera] Capabilities unavailable:",
              error,
            );
          }


          /* =====================
             CAMERA INFO
          ===================== */

          const settings =
            videoTrack
              .getSettings();


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


          setCameraSettings(
            settings,
          );


          setActiveCameraName(
            label,
          );


          /* =====================
             ATTACH VIDEO
          ===================== */

          if (
            videoRef.current
          ) {
            videoRef.current.srcObject =
              stream;


            /*
             * Penting untuk webcam/browser.
             */

            videoRef.current.autoplay =
              true;

            videoRef.current.muted =
              true;

            videoRef.current.playsInline =
              true;


            try {
              await videoRef
                .current
                .play();
            } catch (
              playError
            ) {
              console.warn(
                "[Camera] video.play() warning:",
                playError,
              );
            }
          }


          /* =====================
             SECOND AUTO-EXPOSURE PASS
             
             Beberapa webcam Windows
             reset exposure sesaat setelah
             stream mulai tampil.
          ===================== */

          await new Promise(
            (
              resolve
            ) =>
              setTimeout(
                resolve,
                350,
              ),
          );


          await configureCameraTrack(
            videoTrack,
          );


          const finalSettings =
            videoTrack
              .getSettings();


          setCameraSettings(
            finalSettings,
          );


          console.log(
            "[Camera] Final active settings:",
            finalSettings,
          );


          /* =====================
             READY
          ===================== */

          setIsCameraActive(
            true,
          );

          setCameraStatus(
            "active",
          );

          setCameraError(
            "",
          );
        } catch (
          error
        ) {
          console.error(
            "[Camera] Access error:",
            error,
          );


          stopStream();


          setIsCameraActive(
            false,
          );

          setCameraStatus(
            "error",
          );

          setActiveCameraName(
            "",
          );

          setCameraSettings(
            null,
          );

          setCameraCapabilities(
            null,
          );


          /* =====================
             FRIENDLY ERRORS
          ===================== */

          if (
            error.name ===
            "NotAllowedError"
          ) {
            setCameraError(
              "Izin kamera ditolak. Izinkan kamera melalui pengaturan browser.",
            );

            return;
          }


          if (
            error.name ===
            "NotFoundError"
          ) {
            setCameraError(
              "Kamera tidak ditemukan pada perangkat.",
            );

            return;
          }


          if (
            error.name ===
            "NotReadableError"
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
            error.name ===
            "AbortError"
          ) {
            setCameraError(
              "Proses membuka kamera dibatalkan oleh perangkat.",
            );

            return;
          }


          if (
            error.name ===
            "SecurityError"
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
      },
      [
        stopStream,
      ],
    );


  /* =========================
     REFRESH CAMERA SETTINGS
  ========================= */

  const refreshCameraSettings =
    useCallback(() => {
      const track =
        streamRef.current
          ?.getVideoTracks?.()[0];


      if (
        !track
      ) {
        return null;
      }


      const settings =
        track.getSettings?.() ??
        null;


      setCameraSettings(
        settings,
      );


      return settings;
    }, []);


  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [
    stopStream,
  ]);


  /* =========================
     RETURN
  ========================= */

  return {
    videoRef,

    isCameraActive,
    cameraStatus,
    cameraError,
    activeCameraName,

    cameraSettings,
    cameraCapabilities,

    startCamera,
    stopCamera,

    refreshCameraSettings,
  };
}


export default useCamera;