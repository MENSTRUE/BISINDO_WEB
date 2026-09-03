import {
  Activity,
  Camera,
  CircleAlert,
  Gauge,
  Hand,
  Languages,
  Mic2,
  Play,
  ScanLine,
  Square,
  Wifi,
  WifiOff,
} from "lucide-react";

import useCamera
  from "../hooks/useCamera";

import useBackendHealth
  from "../hooks/useBackendHealth";

import useFrameStreamer
  from "../hooks/useFrameStreamer";

import useRealtimeLandmarks
  from "../hooks/useRealtimeLandmarks";

import LandmarkCanvas
  from "../components/landmarks/LandmarkCanvas";

import "../styles/recognition.css";


function RecognitionPage() {
  /* =========================
     CAMERA
  ========================= */

  const {
    videoRef,
    isCameraActive,
    cameraStatus,
    cameraError,
    startCamera,
    stopCamera,
  } = useCamera();


  /* =========================
     BACKEND
  ========================= */

  const {
    status:
      backendStatus,

    isOnline:
      isBackendOnline,
  } = useBackendHealth();


  /* =========================
     STREAM
  ========================= */

  const {
    isStreaming,
    streamFps,
    sentFrames,
    receivedFrames,
    lastFrameBytes,
  } = useFrameStreamer({
    videoRef,
    isCameraActive,
  });


  /* =========================
     REALTIME
  ========================= */

  const {
    landmarks,

    processingMs,
    pipelineMs,
    lastFrameId,

    segmentStatus,
    segmentReason,
    segmentId,
    segmentSourceFrames,

    segmentMotionEma,
    segmentStillFrames,

    segmentThresholds,

    predictionStatus,
    predictionAccepted,

    predictionLabel,
    predictionConfidencePercent,
    predictionMarginPercent,

    predictionTop3,

    predictionInferenceMs,

    predictionSegmentId,

    predictionSourceFrames,
    predictionSampledFrames,
    predictionUniqueSampledFrames,

    predictionSequenceBuildMs,

    predictionEndReason,

    predictionThresholds,
  } = useRealtimeLandmarks();


  /* =========================
     LANDMARK COUNTS
  ========================= */

  const totalHandLandmarks =
    landmarks.leftHand.length
    +
    landmarks.rightHand.length;


  const totalPoseLandmarks =
    landmarks.pose.length;


  const totalFaceLandmarks =
    landmarks.face.length;


  const hasVisionData =
    isCameraActive
    &&
    lastFrameId !== null;


  /* =========================
     RESULT
  ========================= */

  const hasAcceptedWord =
    predictionAccepted
    &&
    Boolean(
      predictionLabel
    );


  const hasPredictionResult =
    predictionStatus !== "idle";


  /* =========================
     BACKEND
  ========================= */

  const effectiveBackendOnline =
    isBackendOnline
    ||
    isStreaming
    ||
    receivedFrames > 0
    ||
    lastFrameId !== null;


  const effectiveBackendStatus =
    effectiveBackendOnline
      ? "online"
      : backendStatus;


  const BackendIcon =
    effectiveBackendOnline
      ? Wifi
      : WifiOff;


  const getBackendStatusText =
    () => {
      if (
        effectiveBackendOnline
      ) {
        return "Online";
      }

      if (
        backendStatus ===
        "checking"
      ) {
        return "Checking";
      }

      return "Offline";
    };


  /* =========================
     CAMERA STATUS
  ========================= */

  const getCameraStatusText =
    () => {
      if (
        cameraStatus ===
        "requesting"
      ) {
        return "Meminta Izin";
      }

      if (
        cameraStatus ===
        "active"
      ) {
        return "Camera On";
      }

      if (
        cameraStatus ===
        "error"
      ) {
        return "Camera Error";
      }

      return "Camera Off";
    };


  /* =========================
     CAMERA INFO
  ========================= */

  const getCameraInfoText =
    () => {
      if (
        !isCameraActive
      ) {
        return (
          "Kamera belum aktif."
        );
      }


      if (
        !effectiveBackendOnline
      ) {
        return (
          "Kamera aktif · backend offline."
        );
      }


      if (
        !isStreaming
      ) {
        return (
          "Kamera aktif · menunggu WebSocket."
        );
      }


      return (
        `Streaming ${streamFps} FPS · `
        +
        `Sent ${sentFrames} · `
        +
        `Backend ${receivedFrames}`
      );
    };


  /* =========================
     PREDICTION VALUE
  ========================= */

  const getPredictionValue =
    () => {
      if (
        !isCameraActive
      ) {
        return (
          "Menunggu Kamera"
        );
      }


      if (
        segmentStatus ===
        "recording"
      ) {
        return (
          "Merekam Gesture..."
        );
      }


      if (
        segmentStatus ===
        "analyzing"
      ) {
        return (
          "Menganalisis..."
        );
      }


      if (
        segmentStatus ===
        "cooldown"
      ) {
        if (
          hasAcceptedWord
        ) {
          return (
            predictionLabel
          );
        }


        if (
          predictionStatus ===
          "uncertain"
        ) {
          return (
            "Tidak Yakin"
          );
        }
      }


      if (
        segmentStatus ===
        "waiting"
      ) {
        if (
          hasAcceptedWord
        ) {
          return (
            predictionLabel
          );
        }


        return (
          "Menunggu Gerakan"
        );
      }


      if (
        predictionStatus ===
        "model_not_loaded"
      ) {
        return (
          "Model Offline"
        );
      }


      return (
        "Menunggu Gerakan"
      );
    };


  /* =========================
     SUBTITLE
  ========================= */

  const getPredictionSubtitle =
    () => {
      if (
        !isCameraActive
      ) {
        return (
          "Aktifkan kamera untuk memulai."
        );
      }


      if (
        !hasVisionData
      ) {
        return (
          "Menunggu frame kamera."
        );
      }


      if (
        segmentStatus ===
        "recording"
      ) {
        return (
          `Gesture #${segmentId ?? "--"} · `
          +
          `${segmentSourceFrames} source frame · `
          +
          `motion ${Number(
            segmentMotionEma ?? 0
          ).toFixed(4)}.`
        );
      }


      if (
        segmentStatus ===
        "analyzing"
      ) {
        return (
          "Gesture selesai · sampling seluruh gesture menjadi 48 frame."
        );
      }


      if (
        segmentStatus ===
        "cooldown"
        &&
        hasAcceptedWord
      ) {
        return (
          `Kata diterima · `
          +
          `${Number(
            predictionConfidencePercent
          ).toFixed(1)}% · `
          +
          `diam sebentar untuk gesture berikutnya.`
        );
      }


      if (
        segmentStatus ===
        "cooldown"
        &&
        predictionStatus ===
        "uncertain"
      ) {
        return (
          `Top-1 ${predictionLabel ?? "--"} `
          +
          `${Number(
            predictionConfidencePercent ?? 0
          ).toFixed(1)}% · `
          +
          `hasil belum cukup yakin.`
        );
      }


      if (
        segmentStatus ===
        "waiting"
        &&
        hasAcceptedWord
      ) {
        return (
          "Hasil terakhir · sistem siap membaca gesture berikutnya."
        );
      }


      return (
        "Lakukan satu gesture BISINDO lalu diam sebentar."
      );
    };


  /* =========================
     CONFIDENCE
  ========================= */

  const getConfidenceText =
    () => {
      if (
        !hasAcceptedWord
      ) {
        return "--";
      }


      return (
        `${Number(
          predictionConfidencePercent
        ).toFixed(1)}%`
      );
    };


  /* =========================
     GESTURE METRIC
  ========================= */

  const getGestureMetric =
    () => {
      if (
        segmentStatus ===
        "recording"
      ) {
        return (
          `${segmentSourceFrames} fr`
        );
      }


      if (
        predictionSourceFrames
        > 0
      ) {
        return (
          `${predictionSourceFrames} → 48`
        );
      }


      return "--";
    };


  /* =========================
     TOP 3
  ========================= */

  const getTop3Text =
    () => {
      if (
        !Array.isArray(
          predictionTop3
        )
        ||
        predictionTop3.length === 0
      ) {
        return "--";
      }


      return predictionTop3
        .map(
          (
            item
          ) => {
            const confidence =
              Number(
                item
                  .confidence_percent ??
                0
              )
              .toFixed(1);


            return (
              `${item.label} ${confidence}%`
            );
          }
        )
        .join(" · ");
    };


  /* =========================
     STATUS MESSAGE
  ========================= */

  const getStatusMessage =
    () => {
      if (
        segmentStatus ===
        "recording"
      ) {
        return (
          `Recording gesture #`
          +
          `${segmentId ?? "--"} · `
          +
          `${segmentSourceFrames} frame · `
          +
          `motion ${Number(
            segmentMotionEma ?? 0
          ).toFixed(4)} · `
          +
          `still ${segmentStillFrames}/`
          +
          `${segmentThresholds
            ?.endStillFrames ?? 6}.`
        );
      }


      if (
        segmentStatus ===
        "analyzing"
      ) {
        return (
          "Gesture selesai · "
          +
          "melakukan uniform temporal sampling "
          +
          "dan inference TorchScript."
        );
      }


      if (
        segmentStatus ===
        "cooldown"
        &&
        hasAcceptedWord
      ) {
        return (
          `Accepted · `
          +
          `${predictionLabel} `
          +
          `${Number(
            predictionConfidencePercent
          ).toFixed(1)}% · `
          +
          `margin ${Number(
            predictionMarginPercent
          ).toFixed(1)}% · `
          +
          `${predictionSourceFrames} source frame `
          +
          `→ ${predictionSampledFrames} sampled · `
          +
          `${predictionUniqueSampledFrames} unique · `
          +
          `build ${Number(
            predictionSequenceBuildMs ?? 0
          ).toFixed(2)} ms · `
          +
          `infer ${predictionInferenceMs ?? "--"} ms · `
          +
          `end ${predictionEndReason}.`
        );
      }


      if (
        segmentStatus ===
        "cooldown"
        &&
        predictionStatus ===
        "uncertain"
      ) {
        return (
          `Prediction ditolak · `
          +
          `top-1 ${predictionLabel ?? "--"} `
          +
          `${Number(
            predictionConfidencePercent ?? 0
          ).toFixed(1)}% · `
          +
          `margin ${Number(
            predictionMarginPercent ?? 0
          ).toFixed(1)}% · `
          +
          `minimum confidence `
          +
          `${Number(
            predictionThresholds
              ?.minConfidencePercent ??
            70
          ).toFixed(0)}% · `
          +
          `minimum margin `
          +
          `${Number(
            predictionThresholds
              ?.minMarginPercent ??
            10
          ).toFixed(0)}%.`
        );
      }


      if (
        predictionStatus ===
        "insufficient_hand"
      ) {
        return (
          "Gesture selesai tetapi landmark tangan "
          +
          "tidak cukup untuk inference yang valid."
        );
      }


      if (
        predictionStatus ===
        "model_not_loaded"
      ) {
        return (
          "Model TorchScript tidak aktif."
        );
      }


      if (
        segmentStatus ===
        "waiting"
      ) {
        return (
          `Segmenter siap · `
          +
          `motion ${Number(
            segmentMotionEma ?? 0
          ).toFixed(4)} · `
          +
          `start ≥${Number(
            segmentThresholds
              ?.startMotion ??
            0.010
          ).toFixed(4)} · `
          +
          `gerakkan tangan untuk memulai satu gesture.`
        );
      }


      if (
        hasVisionData
      ) {
        return (
          `Vision aktif · `
          +
          `frame ${lastFrameId} · `
          +
          `Hand ${totalHandLandmarks} · `
          +
          `Body ${totalPoseLandmarks} · `
          +
          `Face ${totalFaceLandmarks} · `
          +
          `vision ${processingMs ?? "--"} ms · `
          +
          `pipeline ${pipelineMs ?? "--"} ms.`
        );
      }


      if (
        isStreaming
      ) {
        return (
          `Frame kamera dikirim · `
          +
          `${sentFrames} sent · `
          +
          `${receivedFrames} diterima · `
          +
          `${lastFrameBytes} byte.`
        );
      }


      if (
        effectiveBackendOnline
      ) {
        return (
          "Backend siap. Aktifkan kamera."
        );
      }


      return (
        "Backend tidak terhubung."
      );
    };


  /* =========================
     WORKSPACE STATUS
  ========================= */

  const getWorkspaceStatus =
    () => {
      if (
        segmentStatus ===
        "recording"
      ) {
        return (
          "Recording Gesture"
        );
      }


      if (
        segmentStatus ===
        "analyzing"
      ) {
        return (
          "AI Analyzing"
        );
      }


      if (
        segmentStatus ===
        "cooldown"
        &&
        hasAcceptedWord
      ) {
        return (
          "Word Accepted"
        );
      }


      if (
        segmentStatus ===
        "cooldown"
      ) {
        return (
          "Rearming"
        );
      }


      if (
        hasVisionData
      ) {
        return (
          "AI Ready"
        );
      }


      if (
        isStreaming
      ) {
        return (
          "Frame Streaming"
        );
      }


      return (
        "Frontend Ready"
      );
    };


  /* =========================
     CAMERA BADGE
  ========================= */

  const getCameraBadge =
    () => {
      if (
        segmentStatus ===
        "recording"
      ) {
        return "REC";
      }


      if (
        segmentStatus ===
        "analyzing"
      ) {
        return "AI";
      }


      if (
        segmentStatus ===
        "cooldown"
        &&
        hasAcceptedWord
      ) {
        return "ACCEPT";
      }


      if (
        segmentStatus ===
        "waiting"
      ) {
        return "READY";
      }


      if (
        hasVisionData
      ) {
        return "VISION";
      }


      return "LIVE";
    };


  return (
    <div className="recognition-page">
      {/* =========================
          HEADING
      ========================== */}

      <section className="recognition-heading">
        <div>
          <span className="recognition-eyebrow">
            Live Recognition
          </span>

          <h2>
            Pengenalan BISINDO Real-Time
          </h2>

          <p>
            Setiap gesture direkam sebagai satu
            segment isolated sebelum dianalisis model.
          </p>
        </div>

        <div className="recognition-heading-status">
          <span className="heading-status-dot" />

          {getWorkspaceStatus()}
        </div>
      </section>


      {/* =========================
          WORKSPACE
      ========================== */}

      <section className="recognition-workspace">
        {/* CAMERA */}

        <div className="camera-panel">
          <div className="camera-panel-header">
            <div>
              <span className="panel-label">
                Camera Workspace
              </span>

              <strong>
                Live Camera
              </strong>
            </div>

            <div className="camera-status">
              <span
                className={
                  `camera-status-dot ${
                    isCameraActive
                      ? "online"
                      : cameraStatus ===
                          "error"
                        ? "error"
                        : "offline"
                  }`
                }
              />

              {getCameraStatusText()}
            </div>
          </div>


          {/* CAMERA PREVIEW */}

          <div className="camera-preview">
            <video
              ref={videoRef}
              className={
                `camera-video ${
                  isCameraActive
                    ? "visible"
                    : ""
                }`
              }
              autoPlay
              playsInline
              muted
            />


            {isCameraActive && (
              <LandmarkCanvas
                landmarks={landmarks}
                mirrored
              />
            )}


            <div className="camera-corner top-left" />
            <div className="camera-corner top-right" />
            <div className="camera-corner bottom-left" />
            <div className="camera-corner bottom-right" />


            {!isCameraActive && (
              <div className="camera-placeholder">
                <div className="camera-placeholder-icon">
                  <Camera
                    size={34}
                    strokeWidth={1.4}
                  />
                </div>

                {cameraStatus ===
                "requesting" ? (
                  <>
                    <strong>
                      Meminta izin kamera...
                    </strong>

                    <p>
                      Silakan izinkan akses
                      kamera melalui browser.
                    </p>
                  </>
                ) : cameraError ? (
                  <>
                    <strong>
                      Kamera tidak tersedia
                    </strong>

                    <p>
                      {cameraError}
                    </p>
                  </>
                ) : (
                  <>
                    <strong>
                      Kamera belum aktif
                    </strong>

                    <p>
                      Tekan Mulai Kamera untuk
                      mengaktifkan webcam.
                    </p>
                  </>
                )}
              </div>
            )}


            <div className="camera-overlay-badge">
              <ScanLine
                size={14}
                strokeWidth={1.8}
              />

              Landmark Overlay
            </div>


            {isCameraActive && (
              <div className="camera-live-badge">
                <span />

                {getCameraBadge()}
              </div>
            )}


            {isCameraActive && (
              <div className="landmark-debug-status">
                <div>
                  <span className="landmark-dot hand" />

                  Hand

                  <strong>
                    {totalHandLandmarks}
                  </strong>
                </div>

                <div>
                  <span className="landmark-dot pose" />

                  Body

                  <strong>
                    {totalPoseLandmarks}
                  </strong>
                </div>

                <div>
                  <span className="landmark-dot face" />

                  Face

                  <strong>
                    {totalFaceLandmarks}
                  </strong>
                </div>
              </div>
            )}
          </div>


          {/* CONTROLS */}

          <div className="camera-controls">
            <button
              type="button"
              className="recognition-control primary"
              onClick={startCamera}
              disabled={
                isCameraActive
                ||
                cameraStatus ===
                  "requesting"
              }
            >
              <Play
                size={16}
                strokeWidth={1.9}
              />

              {cameraStatus ===
              "requesting"
                ? "Meminta Izin..."
                : "Mulai Kamera"}
            </button>


            <button
              type="button"
              className="recognition-control secondary"
              onClick={stopCamera}
              disabled={
                !isCameraActive
              }
            >
              <Square
                size={15}
                strokeWidth={1.9}
              />

              Hentikan
            </button>


            <div className="camera-control-info">
              {getCameraInfoText()}
            </div>
          </div>
        </div>


        {/* =========================
            RESULT
        ========================== */}

        <aside className="recognition-result-panel">
          <div className="result-panel-header">
            <div>
              <span className="panel-label">
                AI Prediction
              </span>

              <strong>
                Hasil Pengenalan
              </strong>
            </div>

            <Activity
              size={18}
              strokeWidth={1.7}
            />
          </div>


          {/* PREDICTION */}

          <div className="prediction-card">
            <div className="prediction-icon">
              <Hand
                size={26}
                strokeWidth={1.5}
              />
            </div>

            <span className="prediction-caption">
              Prediksi Saat Ini
            </span>

            <strong className="prediction-value">
              {getPredictionValue()}
            </strong>

            <span className="prediction-subtitle">
              {getPredictionSubtitle()}
            </span>
          </div>


          {/* METRICS */}

          <div className="prediction-metrics">
            <div className="prediction-metric">
              <div className="metric-icon">
                <Gauge
                  size={16}
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <span>
                  Confidence
                </span>

                <strong>
                  {getConfidenceText()}
                </strong>
              </div>
            </div>


            <div className="prediction-metric">
              <div className="metric-icon">
                <Activity
                  size={16}
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <span>
                  Gesture
                </span>

                <strong>
                  {getGestureMetric()}
                </strong>
              </div>
            </div>


            <div className="prediction-metric">
              <div
                className={
                  `metric-icon `
                  +
                  `backend-${effectiveBackendStatus}`
                }
              >
                <BackendIcon
                  size={16}
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <span>
                  Backend
                </span>

                <strong>
                  {getBackendStatusText()}
                </strong>
              </div>
            </div>
          </div>


          {/* MODEL */}

          <div className="model-info-card">
            <div className="model-info-header">
              <Languages
                size={16}
                strokeWidth={1.7}
              />

              <span>
                Model Aktif
              </span>
            </div>

            <strong>
              v1 · Isolated Words
            </strong>

            <p>
              Satu gesture utuh disampling
              menjadi 48 frame sebelum inference.
            </p>
          </div>


          {/* STATUS */}

          <div
            className={
              `recognition-warning ${
                hasVisionData
                  ? "backend-connected"
                  : ""
              }`
            }
          >
            <CircleAlert
              size={16}
              strokeWidth={1.7}
            />

            <p>
              {getStatusMessage()}
            </p>
          </div>
        </aside>
      </section>


      {/* =========================
          TRANSCRIPT
      ========================== */}

      <section className="transcript-panel">
        <div className="transcript-header">
          <div>
            <span className="panel-label">
              Transcript
            </span>

            <strong>
              Hasil Kalimat
            </strong>
          </div>

          <div className="transcript-status">
            <Mic2
              size={15}
              strokeWidth={1.7}
            />

            {segmentStatus ===
            "recording"
              ? "Recording"
              : segmentStatus ===
                  "analyzing"
                ? "Analyzing"
                : hasAcceptedWord
                  ? "Word Ready"
                  : "Waiting"}
          </div>
        </div>


        <div className="transcript-content">
          <Languages
            size={22}
            strokeWidth={1.5}
          />

          <p>
            {hasAcceptedWord
              ? (
                  `Kata terakhir: `
                  +
                  `${predictionLabel}. `
                  +
                  `Segment #`
                  +
                  `${predictionSegmentId ?? "--"} `
                  +
                  `menggunakan `
                  +
                  `${predictionSourceFrames} `
                  +
                  `source frame → 48 frame. `
                  +
                  `Penyusunan beberapa kata `
                  +
                  `menjadi kalimat akan `
                  +
                  `diaktifkan setelah segmentasi stabil.`
                )
              : hasPredictionResult &&
                predictionStatus ===
                  "uncertain"
                ? (
                    `Gesture terakhir belum `
                    +
                    `cukup yakin untuk diterima. `
                    +
                    `Top kandidat: `
                    +
                    `${getTop3Text()}.`
                  )
                : (
                    "Lakukan satu gesture BISINDO, "
                    +
                    "kemudian diam sebentar hingga "
                    +
                    "gesture selesai direkam."
                  )}
          </p>
        </div>
      </section>
    </div>
  );
}


export default RecognitionPage;