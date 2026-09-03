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

import useCamera from "../hooks/useCamera";
import useBackendHealth from "../hooks/useBackendHealth";
import useFrameStreamer from "../hooks/useFrameStreamer";
import useRealtimeLandmarks from "../hooks/useRealtimeLandmarks";

import LandmarkCanvas from "../components/landmarks/LandmarkCanvas";

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
    status: backendStatus,
    isOnline: isBackendOnline,
  } = useBackendHealth();


  /* =========================
     FRAME STREAM
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
     VISION + SEQUENCE
  ========================= */

  const {
    landmarks,

    processingMs,
    lastFrameId,

    sequenceCount,
    sequenceTarget,
    sequenceReady,
    sequencePreprocessingMs,
    sequenceShapes,
  } = useRealtimeLandmarks();


  /* =========================
     STATUS
  ========================= */

  const BackendIcon =
    isBackendOnline
      ? Wifi
      : WifiOff;


  const getBackendStatusText = () => {
    if (
      backendStatus ===
      "checking"
    ) {
      return "Checking";
    }

    return isBackendOnline
      ? "Online"
      : "Offline";
  };


  const getCameraStatusText = () => {
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
     LANDMARK COUNTS
  ========================= */

  const totalHandLandmarks =
    landmarks.leftHand.length +
    landmarks.rightHand.length;


  const totalPoseLandmarks =
    landmarks.pose.length;


  const totalFaceLandmarks =
    landmarks.face.length;


  const hasVisionData =
    isCameraActive &&
    lastFrameId !== null;


  const displaySequenceCount =
    isCameraActive
      ? sequenceCount
      : 0;


  /* =========================
     CAMERA INFO
  ========================= */

  const getCameraInfoText = () => {
    if (!isCameraActive) {
      return "Kamera belum aktif.";
    }

    if (!isBackendOnline) {
      return (
        "Kamera aktif · " +
        "backend offline."
      );
    }

    if (!isStreaming) {
      return (
        "Kamera aktif · " +
        "menunggu WebSocket."
      );
    }

    return (
      `Streaming ${streamFps} FPS · ` +
      `Sent ${sentFrames} · ` +
      `Backend ${receivedFrames}`
    );
  };


  /* =========================
     PREDICTION INFO
  ========================= */

  const getPredictionValue = () => {
    if (!isCameraActive) {
      return "Menunggu Kamera";
    }

    if (!sequenceReady) {
      return "Mengisi Sequence";
    }

    return "Menunggu AI";
  };


  const getPredictionSubtitle = () => {
    if (!isCameraActive) {
      return (
        "Belum ada gerakan " +
        "yang diproses."
      );
    }

    if (!hasVisionData) {
      return (
        "Frame kamera sedang " +
        "diproses oleh backend."
      );
    }

    if (!sequenceReady) {
      return (
        `Mengumpulkan input temporal ` +
        `${sequenceCount}/${sequenceTarget} frame.`
      );
    }

    return (
      "Sequence 48 frame siap. " +
      "Model klasifikasi belum dimuat."
    );
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
            Gunakan kamera untuk mengenali
            gerakan Bahasa Isyarat Indonesia
            secara real-time.
          </p>
        </div>

        <div className="recognition-heading-status">
          <span className="heading-status-dot" />

          {sequenceReady
            ? "Sequence Ready"
            : hasVisionData
              ? "Vision Active"
              : isStreaming
                ? "Frame Streaming"
                : "Frontend Ready"}
        </div>
      </section>


      {/* =========================
          WORKSPACE
      ========================== */}

      <section className="recognition-workspace">
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
                className={`camera-status-dot ${
                  isCameraActive
                    ? "online"
                    : cameraStatus ===
                        "error"
                      ? "error"
                      : "offline"
                }`}
              />

              {getCameraStatusText()}
            </div>
          </div>


          {/* CAMERA */}

          <div className="camera-preview">
            <video
              ref={videoRef}
              className={`camera-video ${
                isCameraActive
                  ? "visible"
                  : ""
              }`}
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
                      Tekan tombol Mulai Kamera
                      untuk mengaktifkan webcam.
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

                {sequenceReady
                  ? "SEQUENCE"
                  : hasVisionData
                    ? "VISION"
                    : isStreaming
                      ? "STREAMING"
                      : "LIVE"}
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
                isCameraActive ||
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
              disabled={!isCameraActive}
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
                  --
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
                  Sequence
                </span>

                <strong>
                  {displaySequenceCount}
                  {" / "}
                  {sequenceTarget}
                </strong>
              </div>
            </div>


            <div className="prediction-metric">
              <div
                className={`metric-icon backend-${backendStatus}`}
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
              v1 · Words
            </strong>

            <p>
              Model pengenalan kata BISINDO.
            </p>
          </div>


          {/* STATUS */}

          <div
            className={`recognition-warning ${
              hasVisionData
                ? "backend-connected"
                : ""
            }`}
          >
            <CircleAlert
              size={16}
              strokeWidth={1.7}
            />

            <p>
              {sequenceReady
                ? (
                    `Sequence siap · ` +
                    `Hand ${sequenceShapes.hand.join("×")} · ` +
                    `Pose ${sequenceShapes.pose.join("×")} · ` +
                    `FaceHead ${sequenceShapes.facehead.join("×")} · ` +
                    `Multi ${sequenceShapes.multimodal.join("×")} · ` +
                    `prep ${sequencePreprocessingMs ?? "--"} ms.`
                  )
                : hasVisionData
                  ? (
                      `Vision aktif · ` +
                      `frame ${lastFrameId} · ` +
                      `sequence ${sequenceCount}/${sequenceTarget} · ` +
                      `Hand ${totalHandLandmarks} · ` +
                      `Body ${totalPoseLandmarks} · ` +
                      `Face ${totalFaceLandmarks} · ` +
                      `vision ${processingMs ?? "--"} ms.`
                    )
                  : isStreaming
                    ? (
                        `Frame kamera dikirim ke backend · ` +
                        `${sentFrames} sent · ` +
                        `${receivedFrames} diterima · ` +
                        `${lastFrameBytes} byte.`
                      )
                    : backendStatus ===
                        "checking"
                      ? "Sedang memeriksa koneksi backend FastAPI..."
                      : isBackendOnline
                        ? "Backend FastAPI terhubung. Aktifkan kamera."
                        : "Backend tidak terhubung. Jalankan FastAPI terlebih dahulu."}
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

            Waiting
          </div>
        </div>

        <div className="transcript-content">
          <Languages
            size={22}
            strokeWidth={1.5}
          />

          <p>
            Hasil pengenalan akan disusun
            dan ditampilkan di sini.
          </p>
        </div>
      </section>
    </div>
  );
}


export default RecognitionPage;