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
     VISION + SEQUENCE + AI
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

    predictionStatus,
    predictionLabel,
    predictionClassId,
    predictionConfidencePercent,
    predictionInferenceMs,
    predictionHandPresentFrames,
    predictionTop3,
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


  const hasPrediction =
    predictionStatus === "ok" &&
    Boolean(predictionLabel);


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
     PREDICTION VALUE
  ========================= */

  const getPredictionValue = () => {
    if (!isCameraActive) {
      return "Menunggu Kamera";
    }

    if (!sequenceReady) {
      return "Mengisi Sequence";
    }

    if (
      predictionStatus ===
      "waiting_for_hand"
    ) {
      return "Menunggu Gerakan";
    }

    if (
      predictionStatus ===
      "model_not_loaded"
    ) {
      return "Model Offline";
    }

    if (hasPrediction) {
      return predictionLabel;
    }

    return "Memproses AI";
  };


  /* =========================
     PREDICTION SUBTITLE
  ========================= */

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

    if (
      predictionStatus ===
      "waiting_for_hand"
    ) {
      return (
        "Sequence siap, tetapi tangan " +
        "belum cukup terdeteksi."
      );
    }

    if (
      predictionStatus ===
      "model_not_loaded"
    ) {
      return (
        "Model TorchScript belum tersedia."
      );
    }

    if (hasPrediction) {
      return (
        `Raw inference · ` +
        `class ${predictionClassId} · ` +
        `${predictionInferenceMs ?? "--"} ms.`
      );
    }

    return (
      "Sequence siap. Menunggu " +
      "hasil inference model."
    );
  };


  /* =========================
     CONFIDENCE
  ========================= */

  const getConfidenceText = () => {
    if (!hasPrediction) {
      return "--";
    }

    return (
      `${Number(
        predictionConfidencePercent ?? 0,
      ).toFixed(1)}%`
    );
  };


  /* =========================
     TOP 3 TEXT
  ========================= */

  const getTop3Text = () => {
    if (
      !Array.isArray(
        predictionTop3
      ) ||
      predictionTop3.length === 0
    ) {
      return "--";
    }

    return predictionTop3
      .map((item) => {
        const confidence =
          Number(
            item.confidence_percent ??
            0,
          ).toFixed(1);

        return (
          `${item.label} ` +
          `${confidence}%`
        );
      })
      .join(" · ");
  };


  /* =========================
     STATUS MESSAGE
  ========================= */

  const getStatusMessage = () => {
    if (hasPrediction) {
      return (
        `AI aktif · ` +
        `${predictionLabel} ` +
        `${Number(
          predictionConfidencePercent ?? 0,
        ).toFixed(1)}% · ` +
        `inference ` +
        `${predictionInferenceMs ?? "--"} ms · ` +
        `hand ` +
        `${predictionHandPresentFrames ?? 0}/48 · ` +
        `Top-3: ${getTop3Text()}`
      );
    }

    if (
      predictionStatus ===
      "waiting_for_hand"
    ) {
      return (
        `Sequence 48/48 siap · ` +
        `tangan terdeteksi ` +
        `${predictionHandPresentFrames ?? 0}/48 frame · ` +
        `menunggu gerakan.`
      );
    }

    if (
      predictionStatus ===
      "model_not_loaded"
    ) {
      return (
        "Model TorchScript tidak aktif. " +
        "Periksa backend model runtime."
      );
    }

    if (sequenceReady) {
      return (
        `Sequence siap · ` +
        `Hand ${sequenceShapes.hand.join("×")} · ` +
        `Pose ${sequenceShapes.pose.join("×")} · ` +
        `FaceHead ${sequenceShapes.facehead.join("×")} · ` +
        `Multi ${sequenceShapes.multimodal.join("×")} · ` +
        `prep ${sequencePreprocessingMs ?? "--"} ms · ` +
        `menunggu inference.`
      );
    }

    if (hasVisionData) {
      return (
        `Vision aktif · ` +
        `frame ${lastFrameId} · ` +
        `sequence ${sequenceCount}/${sequenceTarget} · ` +
        `Hand ${totalHandLandmarks} · ` +
        `Body ${totalPoseLandmarks} · ` +
        `Face ${totalFaceLandmarks} · ` +
        `vision ${processingMs ?? "--"} ms.`
      );
    }

    if (isStreaming) {
      return (
        `Frame kamera dikirim ke backend · ` +
        `${sentFrames} sent · ` +
        `${receivedFrames} diterima · ` +
        `${lastFrameBytes} byte.`
      );
    }

    if (
      backendStatus ===
      "checking"
    ) {
      return (
        "Sedang memeriksa koneksi " +
        "backend FastAPI..."
      );
    }

    if (isBackendOnline) {
      return (
        "Backend FastAPI terhubung. " +
        "Aktifkan kamera."
      );
    }

    return (
      "Backend tidak terhubung. " +
      "Jalankan FastAPI terlebih dahulu."
    );
  };


  /* =========================
     HEADER STATUS
  ========================= */

  const getWorkspaceStatus = () => {
    if (hasPrediction) {
      return "AI Active";
    }

    if (sequenceReady) {
      return "Sequence Ready";
    }

    if (hasVisionData) {
      return "Vision Active";
    }

    if (isStreaming) {
      return "Frame Streaming";
    }

    return "Frontend Ready";
  };


  /* =========================
     CAMERA BADGE
  ========================= */

  const getCameraBadge = () => {
    if (hasPrediction) {
      return "AI";
    }

    if (sequenceReady) {
      return "SEQUENCE";
    }

    if (hasVisionData) {
      return "VISION";
    }

    if (isStreaming) {
      return "STREAMING";
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
            Gunakan kamera untuk mengenali
            gerakan Bahasa Isyarat Indonesia
            secara real-time.
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


            {/* CORNERS */}

            <div className="camera-corner top-left" />

            <div className="camera-corner top-right" />

            <div className="camera-corner bottom-left" />

            <div className="camera-corner bottom-right" />


            {/* PLACEHOLDER */}

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


            {/* OVERLAY BADGE */}

            <div className="camera-overlay-badge">
              <ScanLine
                size={14}
                strokeWidth={1.8}
              />

              Landmark Overlay
            </div>


            {/* LIVE BADGE */}

            {isCameraActive && (
              <div className="camera-live-badge">
                <span />

                {getCameraBadge()}
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
              {getPredictionValue()}
            </strong>

            <span className="prediction-subtitle">
              {getPredictionSubtitle()}
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
                  {getConfidenceText()}
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
                  {displaySequenceCount}
                  {" / "}
                  {sequenceTarget}
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
              AI STATUS
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

            {hasPrediction
              ? "Recognizing"
              : "Waiting"}
          </div>
        </div>

        <div className="transcript-content">
          <Languages
            size={22}
            strokeWidth={1.5}
          />

          <p>
            {hasPrediction
              ? (
                  `Prediksi sementara: ` +
                  `${predictionLabel}. ` +
                  `Transcript stabil akan ` +
                  `diaktifkan pada tahap berikutnya.`
                )
              : (
                  "Hasil pengenalan akan disusun " +
                  "dan ditampilkan di sini."
                )}
          </p>
        </div>
      </section>
    </div>
  );
}


export default RecognitionPage;