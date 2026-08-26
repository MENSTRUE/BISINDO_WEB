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
  WifiOff,
} from "lucide-react";

import "../styles/recognition.css";

function RecognitionPage() {
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

          <h2>Pengenalan BISINDO Real-Time</h2>

          <p>
            Gunakan kamera untuk mengenali gerakan
            Bahasa Isyarat Indonesia secara real-time.
          </p>
        </div>

        <div className="recognition-heading-status">
          <span className="heading-status-dot" />

          Frontend Ready
        </div>
      </section>

      {/* =========================
          MAIN WORKSPACE
      ========================== */}

      <section className="recognition-workspace">
        {/* CAMERA AREA */}

        <div className="camera-panel">
          <div className="camera-panel-header">
            <div>
              <span className="panel-label">
                Camera Workspace
              </span>

              <strong>Live Camera</strong>
            </div>

            <div className="camera-status">
              <span className="camera-status-dot offline" />
              Camera Off
            </div>
          </div>

          <div className="camera-preview">
            <div className="camera-corner top-left" />
            <div className="camera-corner top-right" />
            <div className="camera-corner bottom-left" />
            <div className="camera-corner bottom-right" />

            <div className="camera-placeholder">
              <div className="camera-placeholder-icon">
                <Camera
                  size={34}
                  strokeWidth={1.4}
                />
              </div>

              <strong>Kamera belum aktif</strong>

              <p>
                Preview kamera akan ditampilkan
                di area ini.
              </p>
            </div>

            <div className="camera-overlay-badge">
              <ScanLine
                size={14}
                strokeWidth={1.8}
              />

              Landmark Overlay
            </div>
          </div>

          <div className="camera-controls">
            <button
              type="button"
              className="recognition-control primary"
            >
              <Play
                size={16}
                strokeWidth={1.9}
              />

              Mulai Kamera
            </button>

            <button
              type="button"
              className="recognition-control secondary"
              disabled
            >
              <Square
                size={15}
                strokeWidth={1.9}
              />

              Hentikan
            </button>

            <div className="camera-control-info">
              Kamera belum dihubungkan.
            </div>
          </div>
        </div>

        {/* RESULT PANEL */}

        <aside className="recognition-result-panel">
          <div className="result-panel-header">
            <div>
              <span className="panel-label">
                AI Prediction
              </span>

              <strong>Hasil Pengenalan</strong>
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
              Menunggu Kamera
            </strong>

            <span className="prediction-subtitle">
              Belum ada gerakan yang diproses.
            </span>
          </div>

          <div className="prediction-metrics">
            <div className="prediction-metric">
              <div className="metric-icon">
                <Gauge
                  size={16}
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <span>Confidence</span>
                <strong>--</strong>
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
                <span>Sequence</span>
                <strong>0 / 48</strong>
              </div>
            </div>

            <div className="prediction-metric">
              <div className="metric-icon">
                <WifiOff
                  size={16}
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <span>Backend</span>
                <strong>Offline</strong>
              </div>
            </div>
          </div>

          <div className="model-info-card">
            <div className="model-info-header">
              <Languages
                size={16}
                strokeWidth={1.7}
              />

              <span>Model Aktif</span>
            </div>

            <strong>v1 · Words</strong>

            <p>
              Model pengenalan kata BISINDO.
            </p>
          </div>

          <div className="recognition-warning">
            <CircleAlert
              size={16}
              strokeWidth={1.7}
            />

            <p>
              Backend inference belum terhubung.
              Tampilan ini masih berupa workspace
              frontend.
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

            <strong>Hasil Kalimat</strong>
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
            Hasil pengenalan akan disusun dan
            ditampilkan di sini.
          </p>
        </div>
      </section>
    </div>
  );
}

export default RecognitionPage;