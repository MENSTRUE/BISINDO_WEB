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
     BACKEND HEALTH
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
     REALTIME LANDMARKS
  ========================= */

  const {
    landmarks,
    processingMs,
    lastFrameId,
  } = useRealtimeLandmarks();


  /* =========================
     BACKEND STATUS
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


  /* =========================
     CAMERA STATUS
  ========================= */

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
     CAMERA INFO
  ========================= */

  const getCameraInfoText = () => {
    if (!isCameraActive) {
      return "Kamera belum aktif.";
    }

    if (
      isCameraActive &&
      !isBackendOnline
    ) {
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
     VISION STATUS
  ========================= */

  const hasVisionData =
    lastFrameId !== null;


  return (
    <div className="recognition-page">
      {/* =========================
          PAGE HEADING
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

          {hasVisionData
            ? "Vision Active"
            : isStreaming
              ? "Frame Streaming"
              : "Frontend Ready"}
        </div>
      </section>


      {/* =========================
          MAIN WORKSPACE
      ========================== */}

      <section className="recognition-workspace">
        {/* =========================
            CAMERA PANEL
        ========================== */}

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


          {/* =========================
              CAMERA PREVIEW
          ========================== */}

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


            {/* LANDMARK CANVAS */}

            {isCameraActive && (
              <LandmarkCanvas
                landmarks={landmarks}
                mirrored
              />
            )}


            {/* CAMERA CORNERS */}

            <div className="camera-corner top-left" />

            <div className="camera-corner top-right" />

            <div className="camera-corner bottom-left" />

            <div className="camera-corner bottom-right" />


            {/* CAMERA PLACEHOLDER */}

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


            {/* OVERLAY LABEL */}

            <div className="camera-overlay-badge">
              <ScanLine
                size={14}
                strokeWidth={1.8}
              />

              Landmark Overlay
            </div>


            {/* LIVE STATUS */}

            {isCameraActive && (
              <div className="camera-live-badge">
                <span />

                {hasVisionData
                  ? "VISION"
                  : isStreaming
                    ? "STREAMING"
                    : "LIVE"}
              </div>
            )}


            {/* LANDMARK STATUS */}

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


          {/* =========================
              CAMERA CONTROLS
          ========================== */}

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
            RESULT PANEL
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


          {/* =========================
              CURRENT PREDICTION
          ========================== */}

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
              {isCameraActive
                ? "Menunggu AI"
                : "Menunggu Kamera"}
            </strong>

            <span className="prediction-subtitle">
              {!isCameraActive
                ? "Belum ada gerakan yang diproses."
                : hasVisionData
                  ? "Landmark real-time berhasil diekstrak. Model klasifikasi belum diaktifkan."
                  : isStreaming
                    ? "Frame kamera sedang diproses oleh backend."
                    : isBackendOnline
                      ? "Kamera aktif, menunggu koneksi real-time."
                      : "Kamera aktif, tetapi backend belum terhubung."}
            </span>
          </div>


          {/* =========================
              METRICS
          ========================== */}

          <div className="prediction-metrics">
            {/* CONFIDENCE */}

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


            {/* SEQUENCE */}

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
                  0 / 48
                </strong>
              </div>
            </div>


            {/* BACKEND */}

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


          {/* =========================
              MODEL INFO
          ========================== */}

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


          {/* =========================
              STREAM / VISION INFO
          ========================== */}

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
              {hasVisionData
                ? (
                    `Vision backend aktif · ` +
                    `frame ${lastFrameId} · ` +
                    `Hand ${totalHandLandmarks} · ` +
                    `Body ${totalPoseLandmarks} · ` +
                    `Face ${totalFaceLandmarks} · ` +
                    `${processingMs ?? "--"} ms.`
                  )
                : isStreaming
                  ? (
                      `Frame kamera sudah dikirim ` +
                      `ke backend (${sentFrames} sent, ` +
                      `${receivedFrames} diterima, ` +
                      `${lastFrameBytes} byte frame terakhir). ` +
                      `Menunggu hasil ekstraksi landmark.`
                    )
                  : backendStatus ===
                      "checking"
                    ? "Sedang memeriksa koneksi backend FastAPI..."
                    : isBackendOnline
                      ? "Backend FastAPI terhubung. Aktifkan kamera untuk mulai memproses landmark."
                      : "Backend tidak terhubung. Jalankan server FastAPI terlebih dahulu."}
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