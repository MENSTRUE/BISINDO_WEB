import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  CirclePlay,
  Eye,
  Languages,
  Lightbulb,
  MessageSquareText,
  Play,
  Search,
  Sparkles,
  Video,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "../styles/learning.css";


const STORAGE_KEY =
  "bisindo-learning-progress-v1";


/* =========================================
   LESSON DATA
========================================= */

const gestures = [
  {
    id: 0,
    word: "Air",
    slug: "air",
    category: "Dasar",

    meaning:
      "Kosakata untuk menyebut air atau sesuatu yang berkaitan dengan air.",

    example:
      "Saya minum air.",
  },

  {
    id: 1,
    word: "Belajar",
    slug: "belajar",
    category: "Aktivitas",

    meaning:
      "Kosakata untuk menyatakan kegiatan mempelajari atau memahami sesuatu.",

    example:
      "Saya belajar BISINDO.",
  },

  {
    id: 2,
    word: "Cari",
    slug: "cari",
    category: "Aktivitas",

    meaning:
      "Kosakata untuk menyatakan kegiatan mencari seseorang atau sesuatu.",

    example:
      "Saya cari teman.",
  },

  {
    id: 3,
    word: "Hari",
    slug: "hari",
    category: "Waktu",

    meaning:
      "Kosakata yang digunakan ketika membicarakan hari atau waktu dalam satu hari.",

    example:
      "Hari ini saya belajar.",
  },

  {
    id: 4,
    word: "Ingat",
    slug: "ingat",
    category: "Aktivitas",

    meaning:
      "Kosakata untuk menyatakan bahwa seseorang mengingat sesuatu.",

    example:
      "Saya ingat teman saya.",
  },

  {
    id: 5,
    word: "Lagi",
    slug: "lagi",
    category: "Dasar",

    meaning:
      "Kosakata yang dapat digunakan untuk menunjukkan pengulangan atau sesuatu yang sedang berlangsung kembali.",

    example:
      "Saya belajar lagi.",
  },

  {
    id: 6,
    word: "Maaf",
    slug: "maaf",
    category: "Dasar",

    meaning:
      "Kosakata yang digunakan untuk meminta maaf.",

    example:
      "Maaf, saya terlambat.",
  },

  {
    id: 7,
    word: "Makan",
    slug: "makan",
    category: "Aktivitas",

    meaning:
      "Kosakata untuk menyatakan aktivitas makan.",

    example:
      "Saya makan pagi.",
  },

  {
    id: 8,
    word: "Motor",
    slug: "motor",
    category: "Benda",

    meaning:
      "Kosakata yang digunakan untuk menyebut kendaraan sepeda motor.",

    example:
      "Saya berangkat naik motor.",
  },

  {
    id: 9,
    word: "Saya",
    slug: "saya",
    category: "Dasar",

    meaning:
      "Kosakata yang digunakan untuk merujuk pada diri sendiri.",

    example:
      "Saya belajar BISINDO.",
  },

  {
    id: 10,
    word: "Terima kasih",
    slug: "terima-kasih",
    category: "Dasar",

    meaning:
      "Ungkapan yang digunakan untuk menyampaikan rasa terima kasih.",

    example:
      "Terima kasih, teman.",
  },

  {
    id: 11,
    word: "Tuli",
    slug: "tuli",
    category: "Dasar",

    meaning:
      "Kosakata yang berkaitan dengan identitas atau kondisi Tuli.",

    example:
      "Dia teman Tuli saya.",
  },

  {
    id: 12,
    word: "Apa",
    slug: "apa",
    category: "Pertanyaan",

    meaning:
      "Kata tanya untuk menanyakan benda, hal, atau informasi.",

    example:
      "Apa itu?",
  },

  {
    id: 13,
    word: "Siapa",
    slug: "siapa",
    category: "Pertanyaan",

    meaning:
      "Kata tanya yang digunakan untuk menanyakan seseorang.",

    example:
      "Siapa teman kamu?",
  },

  {
    id: 14,
    word: "Kapan",
    slug: "kapan",
    category: "Pertanyaan",

    meaning:
      "Kata tanya untuk menanyakan waktu terjadinya sesuatu.",

    example:
      "Kapan kamu datang?",
  },

  {
    id: 15,
    word: "Di mana",
    slug: "di-mana",
    category: "Pertanyaan",

    meaning:
      "Kata tanya yang digunakan untuk menanyakan tempat atau lokasi.",

    example:
      "Rumah kamu di mana?",
  },

  {
    id: 16,
    word: "Mengapa",
    slug: "mengapa",
    category: "Pertanyaan",

    meaning:
      "Kata tanya untuk menanyakan alasan atau sebab.",

    example:
      "Mengapa kamu datang?",
  },

  {
    id: 17,
    word: "Bagaimana",
    slug: "bagaimana",
    category: "Pertanyaan",

    meaning:
      "Kata tanya untuk menanyakan cara, keadaan, atau kondisi.",

    example:
      "Bagaimana cara belajar BISINDO?",
  },

  {
    id: 18,
    word: "Merah",
    slug: "merah",
    category: "Warna",

    meaning:
      "Kosakata untuk menyebut warna merah.",

    example:
      "Motor itu merah.",
  },

  {
    id: 19,
    word: "Kuning",
    slug: "kuning",
    category: "Warna",

    meaning:
      "Kosakata untuk menyebut warna kuning.",

    example:
      "Baju itu kuning.",
  },

  {
    id: 20,
    word: "Hijau",
    slug: "hijau",
    category: "Warna",

    meaning:
      "Kosakata untuk menyebut warna hijau.",

    example:
      "Baju saya hijau.",
  },

  {
    id: 21,
    word: "Hitam",
    slug: "hitam",
    category: "Warna",

    meaning:
      "Kosakata untuk menyebut warna hitam.",

    example:
      "Motor saya hitam.",
  },

  {
    id: 22,
    word: "Dengar",
    slug: "dengar",
    category: "Aktivitas",

    meaning:
      "Kosakata yang berkaitan dengan aktivitas mendengar.",

    example:
      "Saya dengar suara motor.",
  },

  {
    id: 23,
    word: "Berangkat",
    slug: "berangkat",
    category: "Aktivitas",

    meaning:
      "Kosakata untuk menyatakan seseorang mulai pergi menuju suatu tempat.",

    example:
      "Saya berangkat pagi.",
  },

  {
    id: 24,
    word: "Datang",
    slug: "datang",
    category: "Aktivitas",

    meaning:
      "Kosakata untuk menyatakan seseorang tiba atau menuju suatu tempat.",

    example:
      "Teman saya datang sore.",
  },

  {
    id: 25,
    word: "Teman",
    slug: "teman",
    category: "Relasi",

    meaning:
      "Kosakata yang digunakan untuk menyebut seorang teman.",

    example:
      "Dia teman saya.",
  },

  {
    id: 26,
    word: "Keluarga",
    slug: "keluarga",
    category: "Relasi",

    meaning:
      "Kosakata yang digunakan untuk menyebut keluarga.",

    example:
      "Keluarga saya di rumah.",
  },

  {
    id: 27,
    word: "Rumah",
    slug: "rumah",
    category: "Tempat",

    meaning:
      "Kosakata yang digunakan untuk menyebut rumah atau tempat tinggal.",

    example:
      "Saya pulang ke rumah.",
  },

  {
    id: 28,
    word: "Pagi",
    slug: "pagi",
    category: "Waktu",

    meaning:
      "Kosakata untuk menyebut waktu pagi.",

    example:
      "Saya berangkat pagi.",
  },

  {
    id: 29,
    word: "Siang",
    slug: "siang",
    category: "Waktu",

    meaning:
      "Kosakata untuk menyebut waktu siang.",

    example:
      "Saya makan siang.",
  },

  {
    id: 30,
    word: "Sore",
    slug: "sore",
    category: "Waktu",

    meaning:
      "Kosakata untuk menyebut waktu sore.",

    example:
      "Teman saya datang sore.",
  },

  {
    id: 31,
    word: "Malam",
    slug: "malam",
    category: "Waktu",

    meaning:
      "Kosakata untuk menyebut waktu malam.",

    example:
      "Saya belajar malam.",
  },
];


const categories = [
  "Semua",
  "Dasar",
  "Aktivitas",
  "Pertanyaan",
  "Warna",
  "Waktu",
  "Relasi",
  "Tempat",
  "Benda",
];


/* =========================================
   COMMON LEARNING TIPS
========================================= */

const learningTips = [
  "Tonton video sampai selesai sebelum mencoba gerakan.",

  "Perhatikan posisi awal tangan, bentuk jari, dan orientasi telapak tangan.",

  "Perhatikan arah serta perubahan posisi tangan selama gerakan.",

  "Perhatikan posisi akhir dan tempo gerakan.",

  "Ulangi video beberapa kali lalu praktikkan secara perlahan.",
];


/* =========================================
   VIDEO SOURCES
========================================= */

const getVideoSources =
  (gesture) => {
    /*
     * Source pertama:
     * format file yang rapi.
     *
     * Source kedua:
     * fallback untuk file kamu
     * yang sekarang masih .mp4.mp4.
     */
    return [
      `/learning-videos/${gesture.slug}.mp4`,

      `/learning-videos/${gesture.slug}.mp4.mp4`,
    ];
  };


function LearningPage() {
  /* =====================================
     SEARCH / FILTER
  ===================================== */

  const [
    search,
    setSearch,
  ] = useState("");


  const [
    activeCategory,
    setActiveCategory,
  ] = useState(
    "Semua"
  );


  /* =====================================
     MODAL
  ===================================== */

  const [
    selectedGesture,
    setSelectedGesture,
  ] = useState(null);


  const [
    videoFailed,
    setVideoFailed,
  ] = useState(false);


  /* =====================================
     PROGRESS
  ===================================== */

  const [
    learnedIds,
    setLearnedIds,
  ] = useState(() => {
    try {
      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );


      if (!saved) {
        return [];
      }


      const parsed =
        JSON.parse(
          saved
        );


      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    }

    catch {
      return [];
    }
  });


  /* =====================================
     STORE PROGRESS
  ===================================== */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,

        JSON.stringify(
          learnedIds
        )
      );
    }

    catch {
      /*
       * UI tetap berjalan jika
       * localStorage gagal.
       */
    }

  }, [
    learnedIds,
  ]);


  /* =====================================
     RESET VIDEO ERROR
  ===================================== */

  useEffect(() => {
    setVideoFailed(
      false
    );

  }, [
    selectedGesture,
  ]);


  /* =====================================
     ESC CLOSE MODAL
  ===================================== */

  useEffect(() => {
    if (!selectedGesture) {
      return undefined;
    }


    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          setSelectedGesture(
            null
          );
        }
      };


    window.addEventListener(
      "keydown",
      handleKeyDown
    );


    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };

  }, [
    selectedGesture,
  ]);


  /* =====================================
     FILTER
  ===================================== */

  const filteredGestures =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();


      return gestures.filter(
        (gesture) => {
          const categoryMatches =
            (
              activeCategory ===
              "Semua"
            )
            ||
            (
              gesture.category ===
              activeCategory
            );


          const searchMatches =
            !normalizedSearch
            ||
            gesture.word
              .toLowerCase()
              .includes(
                normalizedSearch
              )
            ||
            gesture.meaning
              .toLowerCase()
              .includes(
                normalizedSearch
              );


          return (
            categoryMatches
            &&
            searchMatches
          );
        }
      );

    }, [
      search,
      activeCategory,
    ]);


  /* =====================================
     PROGRESS CALCULATION
  ===================================== */

  const learnedCount =
    learnedIds.length;


  const progress =
    Math.round(
      (
        learnedCount
        /
        gestures.length
      )
      *
      100
    );


  const isLearned =
    (id) =>
      learnedIds.includes(
        id
      );


  const toggleLearned =
    (id) => {
      setLearnedIds(
        (current) => {
          if (
            current.includes(
              id
            )
          ) {
            return current.filter(
              (item) =>
                item !== id
            );
          }


          return [
            ...current,
            id,
          ];
        }
      );
    };


  /* =====================================
     OPEN NEXT LESSON
  ===================================== */

  const openNextLesson =
    () => {
      const nextGesture =
        gestures.find(
          (gesture) =>
            !isLearned(
              gesture.id
            )
        )
        ??
        gestures[0];


      setSelectedGesture(
        nextGesture
      );
    };


  /* =====================================
     VIDEO SOURCES
  ===================================== */

  const selectedVideoSources =
    selectedGesture
      ? getVideoSources(
          selectedGesture
        )
      : [];


  return (
    <div className="learning-page">
      {/* =================================
          HEADING
      ================================= */}

      <section className="learning-heading">
        <div>
          <span className="learning-eyebrow">
            Learning Workspace
          </span>

          <h2>
            Belajar BISINDO
          </h2>

          <p>
            Pelajari kosakata yang
            tersedia pada model BISINDO
            v1 melalui contoh video
            gerakan secara bertahap.
          </p>
        </div>


        <div className="learning-heading-badge">
          <Languages
            size={17}
            strokeWidth={1.8}
          />

          <span>
            32 Kosakata
          </span>
        </div>
      </section>


      {/* =================================
          HERO
      ================================= */}

      <section className="learning-hero">
        <div className="learning-hero-content">
          <div className="learning-hero-badge">
            <Sparkles
              size={14}
              strokeWidth={1.8}
            />

            BISINDO Learning
          </div>


          <h3>
            Belajar satu kata,
            satu gerakan,
            setiap hari.
          </h3>


          <p>
            Pilih kosakata,
            tonton video contoh,
            pahami arti dan penggunaannya,
            lalu praktikkan gerakan
            secara bertahap.
          </p>


          <button
            className="learning-primary-button"
            type="button"
            onClick={
              openNextLesson
            }
          >
            <Play
              size={16}
              strokeWidth={1.9}
            />

            Mulai Belajar

            <ArrowRight
              size={15}
              strokeWidth={1.9}
            />
          </button>
        </div>


        {/* PROGRESS */}

        <div className="learning-progress-card">
          <div className="learning-progress-top">
            <div>
              <span>
                Progress Belajar
              </span>

              <strong>
                {learnedCount}
                {" / "}
                {gestures.length}
              </strong>
            </div>


            <div className="learning-progress-number">
              {progress}%
            </div>
          </div>


          <div className="learning-progress-track">
            <div
              className="learning-progress-fill"
              style={{
                width:
                  `${progress}%`,
              }}
            />
          </div>


          <p>
            {learnedCount ===
            gestures.length
              ? (
                  "Semua kosakata telah dipelajari."
                )
              : (
                  `${gestures.length - learnedCount} kata lagi untuk menyelesaikan kosakata model v1.`
                )}
          </p>
        </div>
      </section>


      {/* =================================
          SEARCH
      ================================= */}

      <section className="learning-toolbar">
        <div className="learning-search">
          <Search
            size={17}
            strokeWidth={1.8}
          />

          <input
            type="text"
            value={
              search
            }
            placeholder="Cari kosakata BISINDO..."
            onChange={
              (event) =>
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
                size={15}
              />
            </button>
          )}
        </div>


        <div className="learning-result-count">
          <strong>
            {
              filteredGestures
                .length
            }
          </strong>

          <span>
            kata ditemukan
          </span>
        </div>
      </section>


      {/* =================================
          CATEGORIES
      ================================= */}

      <section className="learning-categories">
        {categories.map(
          (category) => (
            <button
              key={
                category
              }
              type="button"
              className={
                activeCategory ===
                category
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveCategory(
                  category
                )
              }
            >
              {category}
            </button>
          )
        )}
      </section>


      {/* =================================
          LIBRARY
      ================================= */}

      <section className="learning-library">
        <div className="learning-section-heading">
          <div>
            <span>
              Kamus Gesture
            </span>

            <h3>
              Kosakata BISINDO
            </h3>
          </div>


          <BookOpen
            size={20}
            strokeWidth={1.7}
          />
        </div>


        {filteredGestures.length >
        0 ? (
          <div className="gesture-grid">
            {filteredGestures.map(
              (gesture) => {
                const learned =
                  isLearned(
                    gesture.id
                  );


                return (
                  <article
                    className={
                      `gesture-card ${
                        learned
                          ? "learned"
                          : ""
                      }`
                    }
                    key={
                      gesture.id
                    }
                  >
                    {/* PREVIEW */}

                    <div className="gesture-card-preview">
                      <div className="gesture-preview-icon">
                        <CirclePlay
                          size={29}
                          strokeWidth={1.45}
                        />
                      </div>


                      <span className="gesture-video-label">
                        Video
                      </span>


                      {learned && (
                        <div className="gesture-learned-badge">
                          <Check
                            size={12}
                            strokeWidth={2}
                          />

                          Dipelajari
                        </div>
                      )}


                      <span className="gesture-class-id">
                        #
                        {String(
                          gesture.id
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>
                    </div>


                    {/* CONTENT */}

                    <div className="gesture-card-content">
                      <span className="gesture-category">
                        {
                          gesture.category
                        }
                      </span>


                      <h4>
                        {gesture.word}
                      </h4>


                      <p>
                        {gesture.meaning}
                      </p>


                      <div className="gesture-card-actions">
                        <button
                          type="button"
                          className="gesture-view-button"
                          onClick={() =>
                            setSelectedGesture(
                              gesture
                            )
                          }
                        >
                          Lihat Gerakan

                          <ChevronRight
                            size={14}
                          />
                        </button>


                        <button
                          type="button"
                          className={
                            `gesture-check-button ${
                              learned
                                ? "active"
                                : ""
                            }`
                          }
                          title={
                            learned
                              ? "Tandai belum dipelajari"
                              : "Tandai sudah dipelajari"
                          }
                          onClick={() =>
                            toggleLearned(
                              gesture.id
                            )
                          }
                        >
                          <CircleCheck
                            size={16}
                            strokeWidth={1.8}
                          />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="learning-empty">
            <Search
              size={24}
              strokeWidth={1.5}
            />

            <strong>
              Kosakata tidak ditemukan
            </strong>

            <p>
              Coba gunakan kata atau
              kategori lain.
            </p>
          </div>
        )}
      </section>


      {/* =================================
          LESSON MODAL
      ================================= */}

      {selectedGesture && (
        <div
          className="gesture-modal-backdrop"
          role="presentation"
          onClick={() =>
            setSelectedGesture(
              null
            )
          }
        >
          <div
            className="gesture-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              `Belajar ${selectedGesture.word}`
            }
            onClick={
              (event) =>
                event.stopPropagation()
            }
          >
            {/* HEADER */}

            <div className="gesture-modal-header">
              <div>
                <span>
                  {
                    selectedGesture
                      .category
                  }
                </span>

                <h3>
                  {
                    selectedGesture
                      .word
                  }
                </h3>
              </div>


              <button
                type="button"
                aria-label="Tutup"
                onClick={() =>
                  setSelectedGesture(
                    null
                  )
                }
              >
                <X
                  size={18}
                />
              </button>
            </div>


            {/* =================================
                VIDEO + INFORMATION
            ================================= */}

            <div className="lesson-content-grid">
              {/* VIDEO */}

              <div className="lesson-video-section">
                <div className="lesson-section-title">
                  <Video
                    size={15}
                    strokeWidth={1.8}
                  />

                  <span>
                    Video Gerakan
                  </span>
                </div>


                {!videoFailed ? (
                  <div className="gesture-video-player">
                    <video
                      key={
                        selectedGesture.id
                      }
                      controls
                      loop
                      playsInline
                      preload="metadata"
                      onError={() =>
                        setVideoFailed(
                          true
                        )
                      }
                    >
                      <source
                        src={
                          selectedVideoSources[0]
                        }
                        type="video/mp4"
                      />

                      <source
                        src={
                          selectedVideoSources[1]
                        }
                        type="video/mp4"
                      />

                      Browser tidak mendukung
                      video MP4.
                    </video>
                  </div>
                ) : (
                  <div className="gesture-video-error">
                    <Video
                      size={27}
                      strokeWidth={1.5}
                    />

                    <strong>
                      Video tidak ditemukan
                    </strong>

                    <p>
                      Pastikan file video berada
                      di folder
                      {" "}
                      <code>
                        public/learning-videos
                      </code>
                      .
                    </p>
                  </div>
                )}


                <div className="lesson-video-hint">
                  <Eye
                    size={14}
                    strokeWidth={1.8}
                  />

                  <p>
                    Tonton video beberapa kali.
                    Fokus pada bentuk tangan,
                    posisi awal, arah gerakan,
                    dan posisi akhir.
                  </p>
                </div>
              </div>


              {/* INFORMATION */}

              <div className="lesson-information">
                {/* MEANING */}

                <section className="lesson-info-card">
                  <div className="lesson-info-heading">
                    <Languages
                      size={15}
                      strokeWidth={1.8}
                    />

                    <span>
                      Arti
                    </span>
                  </div>

                  <p>
                    {
                      selectedGesture
                        .meaning
                    }
                  </p>
                </section>


                {/* EXAMPLE */}

                <section className="lesson-info-card">
                  <div className="lesson-info-heading">
                    <MessageSquareText
                      size={15}
                      strokeWidth={1.8}
                    />

                    <span>
                      Contoh Kalimat
                    </span>
                  </div>

                  <p className="lesson-example">
                    “
                    {
                      selectedGesture
                        .example
                    }
                    ”
                  </p>
                </section>


                {/* HOW TO LEARN */}

                <section className="lesson-info-card lesson-guide-card">
                  <div className="lesson-info-heading">
                    <Lightbulb
                      size={15}
                      strokeWidth={1.8}
                    />

                    <span>
                      Cara Mempelajari
                    </span>
                  </div>


                  <ol>
                    {learningTips.map(
                      (
                        tip,
                        index
                      ) => (
                        <li
                          key={
                            tip
                          }
                        >
                          <span>
                            {
                              index + 1
                            }
                          </span>

                          <p>
                            {tip}
                          </p>
                        </li>
                      )
                    )}
                  </ol>
                </section>
              </div>
            </div>


            {/* =================================
                LESSON NOTE
            ================================= */}

            <div className="gesture-modal-note">
              <Lightbulb
                size={16}
                strokeWidth={1.8}
              />

              <p>
                Video yang ditampilkan
                merupakan video referensi
                untuk kelas
                {" "}
                <strong>
                  {
                    selectedGesture
                      .word
                  }
                </strong>
                .
                Penjelasan cara gerakan
                spesifik mengikuti gerakan
                pada video agar tidak
                mengarang bentuk BISINDO.
              </p>
            </div>


            {/* =================================
                METADATA
            ================================= */}

            <div className="gesture-modal-info">
              <div>
                <span>
                  Class ID
                </span>

                <strong>
                  #
                  {String(
                    selectedGesture.id
                  ).padStart(
                    2,
                    "0"
                  )}
                </strong>
              </div>


              <div>
                <span>
                  Kategori
                </span>

                <strong>
                  {
                    selectedGesture
                      .category
                  }
                </strong>
              </div>


              <div>
                <span>
                  Model
                </span>

                <strong>
                  BISINDO v1
                </strong>
              </div>


              <div>
                <span>
                  Media
                </span>

                <strong>
                  Video Referensi
                </strong>
              </div>
            </div>


            {/* =================================
                COMPLETE
            ================================= */}

            <button
              type="button"
              className={
                `gesture-modal-complete ${
                  isLearned(
                    selectedGesture.id
                  )
                    ? "completed"
                    : ""
                }`
              }
              onClick={() =>
                toggleLearned(
                  selectedGesture.id
                )
              }
            >
              <CircleCheck
                size={17}
                strokeWidth={1.9}
              />

              {isLearned(
                selectedGesture.id
              )
                ? "Sudah Dipelajari"
                : "Tandai Sudah Dipelajari"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


export default LearningPage;