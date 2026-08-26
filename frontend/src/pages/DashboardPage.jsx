import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Camera,
  Clock3,
  Languages,
  Server,
  Sparkles,
} from "lucide-react";

import { Link } from "react-router-dom";

import "../styles/dashboard.css";

const systemStats = [
  {
    id: "model",
    label: "Model Aktif",
    value: "v1 · Words",
    description: "Pengenalan kata BISINDO",
    icon: BrainCircuit,
    status: "ready",
  },
  {
    id: "classes",
    label: "Kelas Bahasa Isyarat",
    value: "32",
    description: "Kosakata model v1",
    icon: Languages,
    status: "neutral",
  },
  {
    id: "sequence",
    label: "Sequence",
    value: "48 Frame",
    description: "Jendela input temporal",
    icon: Activity,
    status: "neutral",
  },
  {
    id: "backend",
    label: "Backend",
    value: "Belum Terhubung",
    description: "Integrasi dilakukan tahap berikutnya",
    icon: Server,
    status: "pending",
  },
];

function DashboardPage() {
  return (
    <div className="dashboard-page">
      {/* =========================
          PAGE HEADING
      ========================== */}

      <section className="dashboard-heading">
        <div>
          <span className="dashboard-eyebrow">
            Dashboard
          </span>

          <h2>
            Selamat datang di BISINDO AI
          </h2>

          <p>
            Sistem pengenalan Bahasa Isyarat Indonesia
            berbasis kecerdasan buatan.
          </p>
        </div>

        <Link
          to="/recognition"
          className="dashboard-primary-action"
        >
          <Camera
            size={17}
            strokeWidth={1.9}
          />

          <span>
            Mulai Pengenalan
          </span>

          <ArrowRight
            size={16}
            strokeWidth={1.9}
          />
        </Link>
      </section>

      {/* =========================
          HERO
      ========================== */}

      <section className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-badge">
            <Sparkles
              size={14}
              strokeWidth={1.8}
            />

            AI Recognition Workspace
          </div>

          <h3>
            Kenali gerakan BISINDO
            secara real-time.
          </h3>

          <p>
            Gunakan kamera untuk menangkap gerakan,
            menjalankan proses pengenalan, dan
            menampilkan hasil prediksi dalam satu
            workspace.
          </p>

          <div className="dashboard-hero-actions">
            <Link
              to="/recognition"
              className="hero-button primary"
            >
              <Camera
                size={16}
                strokeWidth={1.8}
              />

              Buka Kamera
            </Link>

            <Link
              to="/models"
              className="hero-button secondary"
            >
              <BrainCircuit
                size={16}
                strokeWidth={1.8}
              />

              Lihat Model
            </Link>
          </div>
        </div>

        <div className="dashboard-hero-visual">
          <div className="ai-orbit orbit-large" />
          <div className="ai-orbit orbit-medium" />

          <div className="ai-core">
            <Languages
              size={34}
              strokeWidth={1.4}
            />
          </div>

          <span className="hero-visual-label">
            BISINDO AI
          </span>

          <span className="hero-visual-status">
            <span />
            Frontend Ready
          </span>
        </div>
      </section>

      {/* =========================
          SYSTEM STATS
      ========================== */}

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-label">
              Sistem
            </span>

            <h3>
              Ringkasan sistem
            </h3>
          </div>
        </div>

        <div className="dashboard-stats-grid">
          {systemStats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article
                className="dashboard-stat-card"
                key={stat.id}
              >
                <div className="dashboard-stat-top">
                  <div className="dashboard-stat-icon">
                    <Icon
                      size={18}
                      strokeWidth={1.8}
                    />
                  </div>

                  <span
                    className={`dashboard-stat-status ${stat.status}`}
                  />
                </div>

                <span className="dashboard-stat-label">
                  {stat.label}
                </span>

                <strong>
                  {stat.value}
                </strong>

                <p>
                  {stat.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* =========================
          BOTTOM GRID
      ========================== */}

      <section className="dashboard-bottom-grid">
        <article className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span className="dashboard-section-label">
                Aktivitas
              </span>

              <h3>
                Pengenalan terbaru
              </h3>
            </div>

            <Clock3
              size={18}
              strokeWidth={1.7}
            />
          </div>

          <div className="dashboard-empty-state">
            <div className="dashboard-empty-icon">
              <Clock3
                size={23}
                strokeWidth={1.5}
              />
            </div>

            <strong>
              Belum ada sesi pengenalan
            </strong>

            <p>
              Riwayat hasil pengenalan akan
              ditampilkan di sini setelah backend
              dan kamera terhubung.
            </p>

            <Link
              to="/recognition"
              className="dashboard-text-link"
            >
              Buka Live Recognition

              <ArrowRight
                size={14}
                strokeWidth={1.8}
              />
            </Link>
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span className="dashboard-section-label">
                Quick Access
              </span>

              <h3>
                Akses cepat
              </h3>
            </div>
          </div>

          <div className="dashboard-quick-actions">
            <Link
              to="/recognition"
              className="dashboard-quick-item"
            >
              <div className="quick-item-icon">
                <Camera
                  size={18}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <strong>
                  Live Recognition
                </strong>

                <span>
                  Buka workspace kamera
                </span>
              </div>

              <ArrowRight
                size={15}
                strokeWidth={1.8}
              />
            </Link>

            <Link
              to="/models"
              className="dashboard-quick-item"
            >
              <div className="quick-item-icon">
                <BrainCircuit
                  size={18}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <strong>
                  Model
                </strong>

                <span>
                  Lihat model pengenalan
                </span>
              </div>

              <ArrowRight
                size={15}
                strokeWidth={1.8}
              />
            </Link>

            <Link
              to="/history"
              className="dashboard-quick-item"
            >
              <div className="quick-item-icon">
                <Clock3
                  size={18}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <strong>
                  Riwayat
                </strong>

                <span>
                  Lihat sesi sebelumnya
                </span>
              </div>

              <ArrowRight
                size={15}
                strokeWidth={1.8}
              />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

export default DashboardPage;