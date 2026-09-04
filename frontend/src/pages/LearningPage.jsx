import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  Languages,
  Play,
  Search,
  Sparkles,
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


const gestures = [
  {
    id: 0,
    word: "Air",
    category: "Dasar",
  },
  {
    id: 1,
    word: "Belajar",
    category: "Aktivitas",
  },
  {
    id: 2,
    word: "Cari",
    category: "Aktivitas",
  },
  {
    id: 3,
    word: "Hari",
    category: "Waktu",
  },
  {
    id: 4,
    word: "Ingat",
    category: "Aktivitas",
  },
  {
    id: 5,
    word: "Lagi",
    category: "Dasar",
  },
  {
    id: 6,
    word: "Maaf",
    category: "Dasar",
  },
  {
    id: 7,
    word: "Makan",
    category: "Aktivitas",
  },
  {
    id: 8,
    word: "Motor",
    category: "Benda",
  },
  {
    id: 9,
    word: "Saya",
    category: "Dasar",
  },
  {
    id: 10,
    word: "Terima kasih",
    category: "Dasar",
  },
  {
    id: 11,
    word: "Tuli",
    category: "Dasar",
  },
  {
    id: 12,
    word: "Apa",
    category: "Pertanyaan",
  },
  {
    id: 13,
    word: "Siapa",
    category: "Pertanyaan",
  },
  {
    id: 14,
    word: "Kapan",
    category: "Pertanyaan",
  },
  {
    id: 15,
    word: "Di mana",
    category: "Pertanyaan",
  },
  {
    id: 16,
    word: "Mengapa",
    category: "Pertanyaan",
  },
  {
    id: 17,
    word: "Bagaimana",
    category: "Pertanyaan",
  },
  {
    id: 18,
    word: "Merah",
    category: "Warna",
  },
  {
    id: 19,
    word: "Kuning",
    category: "Warna",
  },
  {
    id: 20,
    word: "Hijau",
    category: "Warna",
  },
  {
    id: 21,
    word: "Hitam",
    category: "Warna",
  },
  {
    id: 22,
    word: "Dengar",
    category: "Aktivitas",
  },
  {
    id: 23,
    word: "Berangkat",
    category: "Aktivitas",
  },
  {
    id: 24,
    word: "Datang",
    category: "Aktivitas",
  },
  {
    id: 25,
    word: "Teman",
    category: "Relasi",
  },
  {
    id: 26,
    word: "Keluarga",
    category: "Relasi",
  },
  {
    id: 27,
    word: "Rumah",
    category: "Tempat",
  },
  {
    id: 28,
    word: "Pagi",
    category: "Waktu",
  },
  {
    id: 29,
    word: "Siang",
    category: "Waktu",
  },
  {
    id: 30,
    word: "Sore",
    category: "Waktu",
  },
  {
    id: 31,
    word: "Malam",
    category: "Waktu",
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


function LearningPage() {
  const [
    search,
    setSearch,
  ] = useState("");


  const [
    activeCategory,
    setActiveCategory,
  ] = useState("Semua");


  const [
    selectedGesture,
    setSelectedGesture,
  ] = useState(null);


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
        JSON.parse(saved);

      return Array.isArray(parsed)
        ? parsed
        : [];
    }

    catch {
      return [];
    }
  });


  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        learnedIds
      )
    );

  }, [
    learnedIds,
  ]);


  const filteredGestures =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();


      return gestures.filter(
        (gesture) => {
          const categoryMatches =
            activeCategory === "Semua"
            ||
            gesture.category ===
              activeCategory;


          const searchMatches =
            !normalizedSearch
            ||
            gesture.word
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


  const learnedCount =
    learnedIds.length;


  const progress =
    Math.round(
      (
        learnedCount
        / gestures.length
      )
      * 100
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
            current.includes(id)
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


  return (
    <div className="learning-page">
      {/* =========================
          HEADING
      ========================= */}

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
            v1 secara bertahap.
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


      {/* =========================
          HERO
      ========================= */}

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
            satu gerakan, setiap hari.
          </h3>

          <p>
            Pilih kosakata,
            lihat contoh gerakan,
            kemudian tandai kata yang
            sudah kamu pelajari.
          </p>

          <button
            className="learning-primary-button"
            type="button"
            onClick={() => {
              const nextGesture =
                gestures.find(
                  (gesture) =>
                    !isLearned(
                      gesture.id
                    )
                )
                ?? gestures[0];

              setSelectedGesture(
                nextGesture
              );
            }}
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


      {/* =========================
          SEARCH
      ========================= */}

      <section className="learning-toolbar">
        <div className="learning-search">
          <Search
            size={17}
            strokeWidth={1.8}
          />

          <input
            type="text"
            value={search}
            placeholder="Cari kosakata BISINDO..."
            onChange={(event) =>
              setSearch(
                event.target.value
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


      {/* =========================
          CATEGORIES
      ========================= */}

      <section className="learning-categories">
        {categories.map(
          (category) => (
            <button
              key={category}
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


      {/* =========================
          LIBRARY
      ========================= */}

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
                    <div className="gesture-card-preview">
                      <div className="gesture-preview-icon">
                        <Languages
                          size={28}
                          strokeWidth={1.3}
                        />
                      </div>

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
                        #{String(
                          gesture.id
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>
                    </div>


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
                        Kosakata model
                        BISINDO v1.
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


      {/* =========================
          DETAIL MODAL
      ========================= */}

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
            onClick={(event) =>
              event.stopPropagation()
            }
          >
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


            <div className="gesture-video-placeholder">
              <div>
                <Play
                  size={28}
                  strokeWidth={1.4}
                />
              </div>

              <strong>
                Video Gerakan
              </strong>

              <p>
                Media contoh gerakan
                untuk kata ini akan
                ditempatkan di sini.
              </p>
            </div>


            <div className="gesture-modal-info">
              <div>
                <span>
                  Model Class
                </span>

                <strong>
                  #
                  {
                    selectedGesture.id
                  }
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong>
                  {isLearned(
                    selectedGesture.id
                  )
                    ? "Sudah Dipelajari"
                    : "Belum Dipelajari"}
                </strong>
              </div>
            </div>


            <div className="gesture-modal-note">
              <BookOpen
                size={17}
                strokeWidth={1.7}
              />

              <p>
                Tahap UI ini belum
                menampilkan instruksi
                gerakan agar kita tidak
                mengarang bentuk isyarat.
                Nanti contoh video asli
                dari dataset dapat
                dihubungkan ke setiap
                kosakata.
              </p>
            </div>


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
                strokeWidth={1.8}
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