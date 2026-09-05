import {
  Activity,
  BadgeCheck,
  Binary,
  BrainCircuit,
  ChevronRight,
  CircleGauge,
  Cpu,
  Database,
  Eye,
  FileCode2,
  Hand,
  Languages,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import "../styles/models.css";


const MODEL_INFO = {
  version:
    "v1",

  name:
    "WL-BISINDO Multimodal Temporal Transformer",

  runtime:
    "TorchScript",

  modelFile:
    "wl_bisindo_multimodal_traced.pt",

  winnerMode:
    "C",

  winnerName:
    "Hand134 + Pose36 + FaceHead52",

  sequenceLength:
    48,

  numClasses:
    32,

  bestEpoch:
    50,

  devAccuracy:
    95.95,

  devMacroF1:
    95.50,

  testAccuracy:
    87.81,

  testMacroF1:
    87.11,

  testSigner:
    4,

  devSigner:
    1,
};


const INPUT_STREAMS = [
  {
    id:
      "hand",

    label:
      "Hand",

    shape:
      "48 × 134",

    description:
      "Landmark tangan kiri dan kanan",

    icon:
      Hand,
  },

  {
    id:
      "pose",

    label:
      "Pose",

    shape:
      "48 × 36",

    description:
      "Fitur pose tubuh bagian atas",

    icon:
      UserRound,
  },

  {
    id:
      "facehead",

    label:
      "FaceHead",

    shape:
      "48 × 52",

    description:
      "Fitur kepala dan wajah",

    icon:
      Eye,
  },

  {
    id:
      "facecrop",

    label:
      "Face Crop",

    shape:
      "48 × 48 × 48",

    description:
      "Input crop wajah pada signature runtime",

    icon:
      Database,
  },
];


const CLASS_MAPPING = [
  "Air",
  "Belajar",
  "Cari",
  "Hari",
  "Ingat",
  "Lagi",
  "Maaf",
  "Makan",
  "Motor",
  "Saya",
  "Terima kasih",
  "Tuli",
  "Apa",
  "Siapa",
  "Kapan",
  "Di mana",
  "Mengapa",
  "Bagaimana",
  "Merah",
  "Kuning",
  "Hijau",
  "Hitam",
  "Dengar",
  "Berangkat",
  "Datang",
  "Teman",
  "Keluarga",
  "Rumah",
  "Pagi",
  "Siang",
  "Sore",
  "Malam",
];


function ModelsPage() {
  const [
    search,
    setSearch,
  ] = useState("");


  const [
    showAllClasses,
    setShowAllClasses,
  ] = useState(false);


  const filteredClasses =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();


      if (!normalized) {
        return CLASS_MAPPING;
      }


      return CLASS_MAPPING.filter(
        (label) =>
          label
            .toLowerCase()
            .includes(
              normalized
            )
      );

    }, [
      search,
    ]);


  const visibleClasses =
    showAllClasses
      ? filteredClasses
      : filteredClasses.slice(
          0,
          16
        );


  const metrics = [
    {
      id:
        "classes",

      label:
        "Jumlah Kelas",

      value:
        MODEL_INFO.numClasses,

      description:
        "Kosakata BISINDO",

      icon:
        Languages,
    },

    {
      id:
        "sequence",

      label:
        "Sequence",

      value:
        `${MODEL_INFO.sequenceLength} Frame`,

      description:
        "Input temporal",

      icon:
        Activity,
    },

    {
      id:
        "accuracy",

      label:
        "Test Accuracy",

      value:
        `${MODEL_INFO.testAccuracy}%`,

      description:
        `Unseen signer ${MODEL_INFO.testSigner}`,

      icon:
        CircleGauge,
    },

    {
      id:
        "f1",

      label:
        "Macro F1",

      value:
        `${MODEL_INFO.testMacroF1}%`,

      description:
        "Final test macro-F1",

      icon:
        BadgeCheck,
    },
  ];


  return (
    <div className="models-page">
      {/* =========================
          HEADING
      ========================= */}

      <section className="models-heading">
        <div>
          <span className="models-eyebrow">
            Model Workspace
          </span>

          <h2>
            Model Pengenalan BISINDO
          </h2>

          <p>
            Informasi model aktif,
            performa evaluasi, input
            multimodal, dan kelas
            kosakata yang tersedia.
          </p>
        </div>


        <div className="models-active-badge">
          <span className="models-active-dot" />

          <div>
            <span>
              Active Model
            </span>

            <strong>
              {MODEL_INFO.version}
              {" · "}
              Words
            </strong>
          </div>
        </div>
      </section>


      {/* =========================
          HERO MODEL
      ========================= */}

      <section className="models-hero">
        <div className="models-hero-content">
          <div className="models-hero-badge">
            <Sparkles
              size={14}
              strokeWidth={1.8}
            />

            Production Model
          </div>


          <h3>
            {MODEL_INFO.name}
          </h3>


          <p>
            Model multimodal temporal
            untuk mengenali kosakata
            BISINDO dari sequence
            landmark secara real-time.
          </p>


          <div className="models-hero-tags">
            <span>
              <Cpu
                size={13}
              />

              {
                MODEL_INFO.runtime
              }
            </span>

            <span>
              <Binary
                size={13}
              />

              Mode {
                MODEL_INFO.winnerMode
              }
            </span>

            <span>
              <Activity
                size={13}
              />

              {
                MODEL_INFO.sequenceLength
              } Frame
            </span>
          </div>
        </div>


        <div className="models-hero-visual">
          <div className="model-orbit orbit-large" />

          <div className="model-orbit orbit-medium" />

          <div className="model-core">
            <BrainCircuit
              size={38}
              strokeWidth={1.35}
            />
          </div>

          <span className="model-core-label">
            BISINDO AI
          </span>

          <div className="model-status-chip">
            <span />

            Model Ready
          </div>
        </div>
      </section>


      {/* =========================
          METRICS
      ========================= */}

      <section className="models-metrics-grid">
        {metrics.map(
          (metric) => {
            const Icon =
              metric.icon;


            return (
              <article
                className="models-metric-card"
                key={
                  metric.id
                }
              >
                <div className="models-metric-top">
                  <div className="models-metric-icon">
                    <Icon
                      size={18}
                      strokeWidth={1.8}
                    />
                  </div>

                  <span className="models-metric-indicator" />
                </div>


                <span className="models-metric-label">
                  {
                    metric.label
                  }
                </span>

                <strong>
                  {
                    metric.value
                  }
                </strong>

                <p>
                  {
                    metric.description
                  }
                </p>
              </article>
            );
          }
        )}
      </section>


      {/* =========================
          DETAIL GRID
      ========================= */}

      <section className="models-detail-grid">
        {/* MODEL INFO */}

        <article className="models-panel model-information-panel">
          <div className="models-panel-heading">
            <div>
              <span className="models-section-label">
                Configuration
              </span>

              <h3>
                Informasi Model
              </h3>
            </div>

            <FileCode2
              size={18}
              strokeWidth={1.7}
            />
          </div>


          <div className="model-information-list">
            <div>
              <span>
                Model Version
              </span>

              <strong>
                {
                  MODEL_INFO.version
                }
              </strong>
            </div>

            <div>
              <span>
                Winner Mode
              </span>

              <strong>
                {
                  MODEL_INFO.winnerMode
                }
              </strong>
            </div>

            <div>
              <span>
                Feature Fusion
              </span>

              <strong>
                {
                  MODEL_INFO.winnerName
                }
              </strong>
            </div>

            <div>
              <span>
                Runtime
              </span>

              <strong>
                {
                  MODEL_INFO.runtime
                }
              </strong>
            </div>

            <div>
              <span>
                Model File
              </span>

              <strong className="model-file-name">
                {
                  MODEL_INFO.modelFile
                }
              </strong>
            </div>

            <div>
              <span>
                Best Epoch
              </span>

              <strong>
                {
                  MODEL_INFO.bestEpoch
                }
              </strong>
            </div>
          </div>
        </article>


        {/* PERFORMANCE */}

        <article className="models-panel">
          <div className="models-panel-heading">
            <div>
              <span className="models-section-label">
                Evaluation
              </span>

              <h3>
                Performa Model
              </h3>
            </div>

            <CircleGauge
              size={18}
              strokeWidth={1.7}
            />
          </div>


          <div className="performance-list">
            <div className="performance-item">
              <div className="performance-item-heading">
                <div>
                  <span>
                    Dev Accuracy
                  </span>

                  <strong>
                    {
                      MODEL_INFO
                        .devAccuracy
                    }%
                  </strong>
                </div>

                <span>
                  Signer {
                    MODEL_INFO
                      .devSigner
                  }
                </span>
              </div>

              <div className="performance-track">
                <div
                  className="performance-fill"
                  style={{
                    width:
                      `${MODEL_INFO.devAccuracy}%`,
                  }}
                />
              </div>
            </div>


            <div className="performance-item">
              <div className="performance-item-heading">
                <div>
                  <span>
                    Dev Macro F1
                  </span>

                  <strong>
                    {
                      MODEL_INFO
                        .devMacroF1
                    }%
                  </strong>
                </div>

                <span>
                  Validation
                </span>
              </div>

              <div className="performance-track">
                <div
                  className="performance-fill"
                  style={{
                    width:
                      `${MODEL_INFO.devMacroF1}%`,
                  }}
                />
              </div>
            </div>


            <div className="performance-item">
              <div className="performance-item-heading">
                <div>
                  <span>
                    Test Accuracy
                  </span>

                  <strong>
                    {
                      MODEL_INFO
                        .testAccuracy
                    }%
                  </strong>
                </div>

                <span>
                  Signer {
                    MODEL_INFO
                      .testSigner
                  }
                </span>
              </div>

              <div className="performance-track">
                <div
                  className="performance-fill"
                  style={{
                    width:
                      `${MODEL_INFO.testAccuracy}%`,
                  }}
                />
              </div>
            </div>


            <div className="performance-item">
              <div className="performance-item-heading">
                <div>
                  <span>
                    Test Macro F1
                  </span>

                  <strong>
                    {
                      MODEL_INFO
                        .testMacroF1
                    }%
                  </strong>
                </div>

                <span>
                  Final Test
                </span>
              </div>

              <div className="performance-track">
                <div
                  className="performance-fill"
                  style={{
                    width:
                      `${MODEL_INFO.testMacroF1}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </article>
      </section>


      {/* =========================
          INPUT STREAMS
      ========================= */}

      <section className="models-panel">
        <div className="models-panel-heading">
          <div>
            <span className="models-section-label">
              Multimodal Input
            </span>

            <h3>
              Input Model
            </h3>
          </div>

          <Database
            size={18}
            strokeWidth={1.7}
          />
        </div>


        <div className="model-input-grid">
          {INPUT_STREAMS.map(
            (input) => {
              const Icon =
                input.icon;


              return (
                <article
                  className="model-input-card"
                  key={
                    input.id
                  }
                >
                  <div className="model-input-icon">
                    <Icon
                      size={19}
                      strokeWidth={1.7}
                    />
                  </div>

                  <div className="model-input-content">
                    <span>
                      {
                        input.label
                      }
                    </span>

                    <strong>
                      {
                        input.shape
                      }
                    </strong>

                    <p>
                      {
                        input.description
                      }
                    </p>
                  </div>
                </article>
              );
            }
          )}
        </div>
      </section>


      {/* =========================
          CLASS LIBRARY
      ========================= */}

      <section className="models-panel">
        <div className="models-panel-heading class-heading">
          <div>
            <span className="models-section-label">
              Vocabulary
            </span>

            <h3>
              32 Kelas BISINDO
            </h3>
          </div>


          <div className="models-class-count">
            <Languages
              size={14}
              strokeWidth={1.7}
            />

            {
              filteredClasses
                .length
            } kelas
          </div>
        </div>


        <div className="models-class-toolbar">
          <div className="models-class-search">
            <Search
              size={16}
              strokeWidth={1.8}
            />

            <input
              type="text"
              value={
                search
              }
              placeholder="Cari kelas BISINDO..."
              onChange={(
                event
              ) =>
                setSearch(
                  event
                    .target
                    .value
                )
              }
            />

            {search && (
              <button
                type="button"
                aria-label="Hapus pencarian"
                onClick={() =>
                  setSearch("")
                }
              >
                <X
                  size={14}
                />
              </button>
            )}
          </div>
        </div>


        {visibleClasses.length >
        0 ? (
          <>
            <div className="model-class-grid">
              {visibleClasses.map(
                (
                  label,
                  visibleIndex
                ) => {
                  const classIndex =
                    CLASS_MAPPING
                      .indexOf(
                        label
                      );


                  return (
                    <article
                      className="model-class-card"
                      key={
                        label
                      }
                    >
                      <span className="model-class-number">
                        {
                          String(
                            classIndex
                          ).padStart(
                            2,
                            "0"
                          )
                        }
                      </span>

                      <div>
                        <strong>
                          {label}
                        </strong>

                        <span>
                          Class {
                            classIndex
                          }
                        </span>
                      </div>

                      <ChevronRight
                        size={14}
                        strokeWidth={1.7}
                      />
                    </article>
                  );
                }
              )}
            </div>


            {filteredClasses.length >
            16 && (
              <button
                type="button"
                className="models-show-all"
                onClick={() =>
                  setShowAllClasses(
                    (current) =>
                      !current
                  )
                }
              >
                {
                  showAllClasses
                    ? (
                        "Tampilkan Lebih Sedikit"
                      )
                    : (
                        `Lihat Semua ${filteredClasses.length} Kelas`
                      )
                }

                <ChevronRight
                  size={14}
                  className={
                    showAllClasses
                      ? "rotate"
                      : ""
                  }
                />
              </button>
            )}
          </>
        ) : (
          <div className="models-empty-search">
            <Search
              size={22}
              strokeWidth={1.5}
            />

            <strong>
              Kelas tidak ditemukan
            </strong>

            <p>
              Coba gunakan nama
              kosakata lain.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}


export default ModelsPage;