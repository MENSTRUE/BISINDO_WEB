import {
  Activity,
  BookOpen,
  BrainCircuit,
  Check,
  CircleGauge,
  Cpu,
  Database,
  History,
  Info,
  Languages,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  useTheme,
} from "../contexts/ThemeContext";

import "../styles/settings.css";


const LEARNING_STORAGE_KEY =
  "bisindo-learning-progress-v1";


const HISTORY_STORAGE_KEY =
  "bisindo-recognition-history-v1";


const getStoredArrayLength =
  (key) => {
    try {
      const value =
        window.localStorage
          .getItem(
            key
          );


      if (!value) {
        return 0;
      }


      const parsed =
        JSON.parse(
          value
        );


      return Array.isArray(
        parsed
      )
        ? parsed.length
        : 0;
    }

    catch {
      return 0;
    }
  };


function SettingsPage() {
  /* =========================
     THEME
  ========================= */

  const {
    theme,
    setDarkTheme,
    setLightTheme,
  } = useTheme();


  /* =========================
     LOCAL DATA
  ========================= */

  const [
    learningProgressCount,
    setLearningProgressCount,
  ] = useState(
    () =>
      getStoredArrayLength(
        LEARNING_STORAGE_KEY
      )
  );


  const [
    historyCount,
    setHistoryCount,
  ] = useState(
    () =>
      getStoredArrayLength(
        HISTORY_STORAGE_KEY
      )
  );


  const [
    actionMessage,
    setActionMessage,
  ] = useState("");


  /* =========================
     CLEAR LEARNING
  ========================= */

  const clearLearningProgress =
    () => {
      const confirmed =
        window.confirm(
          "Hapus seluruh progress belajar BISINDO?"
        );


      if (!confirmed) {
        return;
      }


      try {
        window.localStorage
          .setItem(
            LEARNING_STORAGE_KEY,
            JSON.stringify([])
          );


        setLearningProgressCount(
          0
        );


        setActionMessage(
          "Progress belajar berhasil dihapus."
        );
      }

      catch {
        setActionMessage(
          "Progress belajar gagal dihapus."
        );
      }
    };


  /* =========================
     CLEAR HISTORY
  ========================= */

  const clearRecognitionHistory =
    () => {
      const confirmed =
        window.confirm(
          "Hapus seluruh riwayat pengenalan?"
        );


      if (!confirmed) {
        return;
      }


      try {
        window.localStorage
          .setItem(
            HISTORY_STORAGE_KEY,
            JSON.stringify([])
          );


        setHistoryCount(
          0
        );


        setActionMessage(
          "Riwayat pengenalan berhasil dihapus."
        );
      }

      catch {
        setActionMessage(
          "Riwayat pengenalan gagal dihapus."
        );
      }
    };


  /* =========================
     RESET APP DATA
  ========================= */

  const resetApplicationData =
    () => {
      const confirmed =
        window.confirm(
          "Reset data lokal BISINDO AI? Tema tidak akan diubah."
        );


      if (!confirmed) {
        return;
      }


      try {
        window.localStorage
          .setItem(
            LEARNING_STORAGE_KEY,
            JSON.stringify([])
          );


        window.localStorage
          .setItem(
            HISTORY_STORAGE_KEY,
            JSON.stringify([])
          );


        setLearningProgressCount(
          0
        );


        setHistoryCount(
          0
        );


        setActionMessage(
          "Data lokal aplikasi berhasil direset."
        );
      }

      catch {
        setActionMessage(
          "Data lokal aplikasi gagal direset."
        );
      }
    };


  /* =========================
     RECOGNITION CONFIG
  ========================= */

  const recognitionConfig = [
    {
      id:
        "sequence",

      label:
        "Sequence Window",

      value:
        "48 Frame",

      description:
        "Rolling temporal window",

      icon:
        Activity,
    },

    {
      id:
        "confidence",

      label:
        "Min. Confidence",

      value:
        "75%",

      description:
        "Ambang penerimaan prediksi",

      icon:
        CircleGauge,
    },

    {
      id:
        "margin",

      label:
        "Min. Margin",

      value:
        "10%",

      description:
        "Selisih top-1 dan top-2",

      icon:
        ShieldCheck,
    },

    {
      id:
        "voting",

      label:
        "Temporal Voting",

      value:
        "2 dari 3",

      description:
        "Voting prediksi stabil",

      icon:
        BrainCircuit,
    },
  ];


  return (
    <div className="settings-page">
      {/* =========================
          HEADING
      ========================= */}

      <section className="settings-heading">
        <div>
          <span className="settings-eyebrow">
            Application Settings
          </span>

          <h2>
            Pengaturan Aplikasi
          </h2>

          <p>
            Kelola tampilan,
            informasi sistem,
            dan data lokal BISINDO AI.
          </p>
        </div>


        <div className="settings-save-status">
          <Check
            size={15}
            strokeWidth={2}
          />

          <div>
            <span>
              Preference
            </span>

            <strong>
              Disimpan Otomatis
            </strong>
          </div>
        </div>
      </section>


      {/* =========================
          APPEARANCE
      ========================= */}

      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div>
            <span className="settings-section-label">
              Appearance
            </span>

            <h3>
              Tampilan
            </h3>

            <p>
              Pilih tema yang digunakan
              pada seluruh workspace.
            </p>
          </div>

          <Sun
            size={19}
            strokeWidth={1.7}
          />
        </div>


        <div className="appearance-grid">
          {/* DARK */}

          <button
            type="button"
            className={
              `appearance-card ${
                theme === "dark"
                  ? "active"
                  : ""
              }`
            }
            onClick={
              setDarkTheme
            }
          >
            <div className="appearance-preview dark-preview">
              <div className="preview-sidebar" />

              <div className="preview-workspace">
                <div className="preview-header" />

                <div className="preview-content">
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              {theme ===
              "dark" && (
                <div className="appearance-selected">
                  <Check
                    size={12}
                    strokeWidth={2.2}
                  />
                </div>
              )}
            </div>


            <div className="appearance-card-footer">
              <div className="appearance-icon">
                <Moon
                  size={17}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <strong>
                  Dark Mode
                </strong>

                <span>
                  Navy dark interface
                </span>
              </div>
            </div>
          </button>


          {/* LIGHT */}

          <button
            type="button"
            className={
              `appearance-card ${
                theme === "light"
                  ? "active"
                  : ""
              }`
            }
            onClick={
              setLightTheme
            }
          >
            <div className="appearance-preview light-preview">
              <div className="preview-sidebar" />

              <div className="preview-workspace">
                <div className="preview-header" />

                <div className="preview-content">
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              {theme ===
              "light" && (
                <div className="appearance-selected">
                  <Check
                    size={12}
                    strokeWidth={2.2}
                  />
                </div>
              )}
            </div>


            <div className="appearance-card-footer">
              <div className="appearance-icon">
                <Sun
                  size={17}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <strong>
                  Light Mode
                </strong>

                <span>
                  Clean light interface
                </span>
              </div>
            </div>
          </button>
        </div>
      </section>


      {/* =========================
          RECOGNITION CONFIG
      ========================= */}

      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div>
            <span className="settings-section-label">
              Recognition
            </span>

            <h3>
              Konfigurasi Pengenalan
            </h3>

            <p>
              Parameter runtime utama
              yang digunakan pipeline
              continuous recognition.
            </p>
          </div>

          <BrainCircuit
            size={19}
            strokeWidth={1.7}
          />
        </div>


        <div className="settings-config-grid">
          {recognitionConfig.map(
            (config) => {
              const Icon =
                config.icon;


              return (
                <article
                  className="settings-config-card"
                  key={
                    config.id
                  }
                >
                  <div className="settings-config-icon">
                    <Icon
                      size={18}
                      strokeWidth={1.8}
                    />
                  </div>

                  <span>
                    {
                      config.label
                    }
                  </span>

                  <strong>
                    {
                      config.value
                    }
                  </strong>

                  <p>
                    {
                      config.description
                    }
                  </p>
                </article>
              );
            }
          )}
        </div>


        <div className="settings-readonly-note">
          <Info
            size={16}
            strokeWidth={1.8}
          />

          <p>
            Parameter recognition
            ditampilkan sebagai informasi
            runtime. Untuk menjaga
            konsistensi model, parameter
            inference belum dapat diubah
            dari antarmuka.
          </p>
        </div>
      </section>


      {/* =========================
          SYSTEM INFORMATION
      ========================= */}

      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div>
            <span className="settings-section-label">
              System
            </span>

            <h3>
              Informasi Sistem
            </h3>

            <p>
              Konfigurasi utama model
              BISINDO yang sedang aktif.
            </p>
          </div>

          <Cpu
            size={19}
            strokeWidth={1.7}
          />
        </div>


        <div className="settings-system-list">
          <div className="settings-system-row">
            <div className="system-row-icon">
              <BrainCircuit
                size={17}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <span>
                Model
              </span>

              <strong>
                v1 · Words
              </strong>
            </div>

            <span className="system-status ready">
              Active
            </span>
          </div>


          <div className="settings-system-row">
            <div className="system-row-icon">
              <Languages
                size={17}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <span>
                Vocabulary
              </span>

              <strong>
                32 Kelas BISINDO
              </strong>
            </div>

            <span className="system-value">
              32
            </span>
          </div>


          <div className="settings-system-row">
            <div className="system-row-icon">
              <Activity
                size={17}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <span>
                Temporal Input
              </span>

              <strong>
                Continuous Rolling
              </strong>
            </div>

            <span className="system-value">
              48 Frame
            </span>
          </div>


          <div className="settings-system-row">
            <div className="system-row-icon">
              <Cpu
                size={17}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <span>
                Runtime
              </span>

              <strong>
                TorchScript
              </strong>
            </div>

            <span className="system-value">
              v1
            </span>
          </div>
        </div>
      </section>


      {/* =========================
          LOCAL DATA
      ========================= */}

      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div>
            <span className="settings-section-label">
              Storage
            </span>

            <h3>
              Data Lokal
            </h3>

            <p>
              Kelola progress belajar
              dan riwayat yang tersimpan
              pada browser.
            </p>
          </div>

          <Database
            size={19}
            strokeWidth={1.7}
          />
        </div>


        <div className="settings-data-list">
          {/* LEARNING */}

          <article className="settings-data-card">
            <div className="settings-data-icon">
              <BookOpen
                size={19}
                strokeWidth={1.8}
              />
            </div>

            <div className="settings-data-content">
              <span>
                Progress Belajar
              </span>

              <strong>
                {
                  learningProgressCount
                }
                {" / "}
                32 kata
              </strong>

              <p>
                Kosakata yang sudah
                ditandai sebagai
                dipelajari.
              </p>
            </div>


            <button
              type="button"
              className="settings-data-action"
              disabled={
                learningProgressCount ===
                0
              }
              onClick={
                clearLearningProgress
              }
            >
              <Trash2
                size={14}
                strokeWidth={1.8}
              />

              Hapus
            </button>
          </article>


          {/* HISTORY */}

          <article className="settings-data-card">
            <div className="settings-data-icon">
              <History
                size={19}
                strokeWidth={1.8}
              />
            </div>

            <div className="settings-data-content">
              <span>
                Recognition History
              </span>

              <strong>
                {
                  historyCount
                }
                {" "}
                sesi
              </strong>

              <p>
                Riwayat sesi pengenalan
                yang tersimpan secara
                lokal.
              </p>
            </div>


            <button
              type="button"
              className="settings-data-action"
              disabled={
                historyCount ===
                0
              }
              onClick={
                clearRecognitionHistory
              }
            >
              <Trash2
                size={14}
                strokeWidth={1.8}
              />

              Hapus
            </button>
          </article>
        </div>


        {actionMessage && (
          <div className="settings-action-message">
            <Check
              size={14}
              strokeWidth={2}
            />

            {
              actionMessage
            }
          </div>
        )}
      </section>


      {/* =========================
          RESET
      ========================= */}

      <section className="settings-danger-panel">
        <div>
          <div className="settings-danger-icon">
            <RotateCcw
              size={19}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>
              Reset Local Data
            </span>

            <strong>
              Reset Data Aplikasi
            </strong>

            <p>
              Menghapus progress belajar
              dan riwayat recognition.
              Preferensi tema tetap
              dipertahankan.
            </p>
          </div>
        </div>


        <button
          type="button"
          onClick={
            resetApplicationData
          }
        >
          <RotateCcw
            size={14}
            strokeWidth={1.8}
          />

          Reset Data
        </button>
      </section>
    </div>
  );
}


export default SettingsPage;