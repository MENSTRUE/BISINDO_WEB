import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
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

import {
  LEARNING_CATEGORIES,
  LEARNING_LESSONS,
  PRACTICE_RULES,
} from "../data/learningLessons";

import useLearningPractice
  from "../hooks/useLearningPractice";

import LearningPracticePanel
  from "../components/learning/LearningPracticePanel";

import "../styles/learning.css";
import "../styles/learning-practice-meta.css";


function LearningPage() {
  /* =========================================
     LEARNING DATA / PROGRESS
  ========================================= */

  const {
    getLessonProgress,

    registerResult,

    resetLesson,

    completedLessons,

    overallPercent,
  } = useLearningPractice();


  /* =========================================
     SEARCH
  ========================================= */

  const [
    search,
    setSearch,
  ] = useState("");


  /* =========================================
     CATEGORY
  ========================================= */

  const [
    activeCategory,
    setActiveCategory,
  ] = useState(
    "Semua"
  );


  /* =========================================
     SELECTED LESSON
  ========================================= */

  const [
    selectedLesson,
    setSelectedLesson,
  ] = useState(null);


  /* =========================================
     LESSON / PRACTICE MODE
  ========================================= */

  const [
    practiceMode,
    setPracticeMode,
  ] = useState(false);


  /* =========================================
     VIDEO ERROR
  ========================================= */

  const [
    videoError,
    setVideoError,
  ] = useState(false);


  /* =========================================
     FILTER LESSONS
  ========================================= */

  const filteredLessons =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();


        return LEARNING_LESSONS
          .filter(
            (lesson) => {
              const categoryMatches =
                activeCategory ===
                  "Semua"
                ||
                lesson.category ===
                  activeCategory;


              const searchMatches =
                !query
                ||
                lesson.word
                  .toLowerCase()
                  .includes(
                    query
                  )
                ||
                lesson.meaning
                  .toLowerCase()
                  .includes(
                    query
                  );


              return (
                categoryMatches
                &&
                searchMatches
              );
            }
          );
      },

      [
        search,
        activeCategory,
      ]
    );


  /* =========================================
     OPEN LESSON
  ========================================= */

  const openLesson =
    (lesson) => {
      setPracticeMode(
        false
      );


      setVideoError(
        false
      );


      setSelectedLesson(
        lesson
      );
    };


  /* =========================================
     CLOSE LESSON
  ========================================= */

  const closeLesson =
    () => {
      setPracticeMode(
        false
      );


      setVideoError(
        false
      );


      setSelectedLesson(
        null
      );
    };


  /* =========================================
     OPEN NEXT UNFINISHED LESSON
  ========================================= */

  const openNextLesson =
    () => {
      const nextLesson =
        LEARNING_LESSONS
          .find(
            (lesson) => {
              const progress =
                getLessonProgress(
                  lesson.id
                );


              return (
                !progress.completed
              );
            }
          )
        ??
        LEARNING_LESSONS[0];


      openLesson(
        nextLesson
      );
    };


  /* =========================================
     ESCAPE CLOSE MODAL
  ========================================= */

  useEffect(
    () => {
      if (
        !selectedLesson
      ) {
        return undefined;
      }


      const handleKeyDown =
        (event) => {
          if (
            event.key ===
            "Escape"
          ) {
            setPracticeMode(
              false
            );


            setVideoError(
              false
            );


            setSelectedLesson(
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
    },

    [
      selectedLesson,
    ]
  );


  /* =========================================
     BODY SCROLL LOCK
  ========================================= */

  useEffect(
    () => {
      if (
        !selectedLesson
      ) {
        return undefined;
      }


      const previousOverflow =
        document.body.style
          .overflow;


      document.body.style
        .overflow =
        "hidden";


      return () => {
        document.body.style
          .overflow =
          previousOverflow;
      };
    },

    [
      selectedLesson,
    ]
  );


  /* =========================================
     MAIN VIEW
  ========================================= */

  return (
    <div className="learning-page">
      {/* =====================================
          HEADING
      ===================================== */}

      <section className="learning-heading">
        <div>
          <span className="learning-eyebrow">
            Learning Workspace
          </span>


          <h2>
            Belajar BISINDO
          </h2>


          <p>
            Tonton video referensi,
            pahami gerakannya,
            kemudian praktikkan hingga
            berhasil dikenali AI
            sebanyak
            {" "}
            {
              PRACTICE_RULES
                .requiredRepetitions
            }
            {" "}
            kali.
          </p>
        </div>


        <div className="learning-heading-badge">
          <Languages
            size={17}
            strokeWidth={1.8}
          />

          <span>
            {
              LEARNING_LESSONS
                .length
            }
            {" "}
            Kosakata
          </span>
        </div>
      </section>


      {/* =====================================
          HERO
      ===================================== */}

      <section className="learning-hero">
        {/* HERO CONTENT */}

        <div className="learning-hero-content">
          <div className="learning-hero-badge">
            <Sparkles
              size={14}
              strokeWidth={1.8}
            />

            BISINDO Learning
          </div>


          <h3>
            Tonton.
            <br />

            Pahami.
            <br />

            Praktikkan.
          </h3>


          <p>
            Sebuah kosakata baru dianggap
            selesai setelah AI berhasil
            mengenali gesture tersebut
            minimal
            {" "}
            {
              PRACTICE_RULES
                .requiredRepetitions
            }
            {" "}
            kali secara valid.
          </p>


          <button
            type="button"
            className="learning-primary-button"
            onClick={
              openNextLesson
            }
          >
            <Play
              size={15}
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
                {completedLessons}
                {" / "}
                {
                  LEARNING_LESSONS
                    .length
                }
              </strong>
            </div>


            <div className="learning-progress-number">
              {
                overallPercent
              }
              %
            </div>
          </div>


          <div className="learning-progress-track">
            <div
              className="learning-progress-fill"
              style={{
                width:
                  `${overallPercent}%`,
              }}
            />
          </div>


          <p>
            {completedLessons ===
            LEARNING_LESSONS.length
              ? (
                  "Semua kosakata telah selesai dipraktikkan."
                )
              : (
                  `${
                    LEARNING_LESSONS.length
                    -
                    completedLessons
                  } kosakata belum mencapai ${
                    PRACTICE_RULES
                      .requiredRepetitions
                  }/${
                    PRACTICE_RULES
                      .requiredRepetitions
                  } valid.`
                )}
          </p>
        </div>
      </section>


      {/* =====================================
          SEARCH
      ===================================== */}

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
              (event) => {
                setSearch(
                  event
                    .target
                    .value
                );
              }
            }
          />


          {search && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => {
                setSearch("");
              }}
            >
              <X
                size={14}
              />
            </button>
          )}
        </div>


        <div className="learning-result-count">
          <strong>
            {
              filteredLessons
                .length
            }
          </strong>

          {" "}

          kata ditemukan
        </div>
      </section>


      {/* =====================================
          CATEGORY
      ===================================== */}

      <section className="learning-categories">
        {LEARNING_CATEGORIES.map(
          (category) => (
            <button
              type="button"
              key={
                category
              }
              className={
                activeCategory ===
                  category
                  ? "active"
                  : ""
              }
              onClick={() => {
                setActiveCategory(
                  category
                );
              }}
            >
              {category}
            </button>
          )
        )}
      </section>


      {/* =====================================
          LIBRARY
      ===================================== */}

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
            size={19}
            strokeWidth={1.7}
          />
        </div>


        {/* =================================
            LESSON GRID
        ================================= */}

        {filteredLessons.length >
        0 ? (
          <div className="gesture-grid">
            {filteredLessons.map(
              (lesson) => {
                const progress =
                  getLessonProgress(
                    lesson.id
                  );


                const completed =
                  progress.completed;


                const validRepetitions =
                  Math.min(
                    progress
                      .validRepetitions,

                    PRACTICE_RULES
                      .requiredRepetitions
                  );


                const lessonPercent =
                  Math.min(
                    100,

                    (
                      validRepetitions
                      /
                      PRACTICE_RULES
                        .requiredRepetitions
                    )
                    *
                    100
                  );


                return (
                  <article
                    key={
                      lesson.id
                    }
                    className={
                      `gesture-card ${
                        completed
                          ? "learned"
                          : ""
                      }`
                    }
                  >
                    {/* =========================
                        VIDEO PREVIEW
                    ========================= */}

                    <button
                      type="button"
                      className="gesture-card-preview"
                      onClick={() => {
                        openLesson(
                          lesson
                        );
                      }}
                    >
                      <video
                        className="gesture-card-video"
                        src={
                          lesson.video
                        }
                        muted
                        playsInline
                        preload="metadata"
                      />


                      <div className="gesture-preview-overlay">
                        <div className="gesture-preview-play">
                          <CirclePlay
                            size={23}
                            strokeWidth={1.6}
                          />
                        </div>
                      </div>


                      <span className="gesture-video-label">
                        Video
                      </span>


                      <span className="gesture-class-id">
                        #
                        {String(
                          lesson.id
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>


                      {completed && (
                        <div className="gesture-learned-badge">
                          <CheckCircle2
                            size={11}
                            strokeWidth={2}
                          />

                          {
                            PRACTICE_RULES
                              .requiredRepetitions
                          }
                          /
                          {
                            PRACTICE_RULES
                              .requiredRepetitions
                          }
                        </div>
                      )}
                    </button>


                    {/* =========================
                        CARD CONTENT
                    ========================= */}

                    <div className="gesture-card-content">
                      <span className="gesture-category">
                        {
                          lesson.category
                        }
                      </span>


                      <h4>
                        {
                          lesson.word
                        }
                      </h4>


                      <p>
                        {
                          lesson.meaning
                        }
                      </p>


                      {/* =====================
                          PRACTICE MINI PROGRESS
                      ===================== */}

                      <div className="gesture-practice-mini">
                        <div>
                          <span>
                            Latihan AI
                          </span>


                          <strong>
                            {
                              validRepetitions
                            }
                            {" / "}
                            {
                              PRACTICE_RULES
                                .requiredRepetitions
                            }
                          </strong>
                        </div>


                        <div className="gesture-practice-mini-track">
                          <span
                            style={{
                              width:
                                `${lessonPercent}%`,
                            }}
                          />
                        </div>
                      </div>


                      {/* =====================
                          ACTION
                      ===================== */}

                      <div className="gesture-card-actions">
                        <button
                          type="button"
                          className="gesture-view-button"
                          onClick={() => {
                            openLesson(
                              lesson
                            );
                          }}
                        >
                          {completed
                            ? (
                                "Lihat Materi"
                              )
                            : (
                                "Belajar & Latihan"
                              )}

                          <ChevronRight
                            size={14}
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
              size={25}
              strokeWidth={1.5}
            />


            <strong>
              Kosakata tidak ditemukan
            </strong>


            <p>
              Coba gunakan kata
              atau kategori lain.
            </p>
          </div>
        )}
      </section>


      {/* =====================================
          LESSON MODAL
      ===================================== */}

      {selectedLesson && (
        <div
          className="gesture-modal-backdrop"
          role="presentation"
          onClick={
            closeLesson
          }
        >
          <div
            className="gesture-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              `Belajar ${selectedLesson.word}`
            }
            onClick={
              (event) => {
                event
                  .stopPropagation();
              }
            }
          >
            {/* =================================
                MODAL HEADER
            ================================= */}

            <div className="gesture-modal-header">
              <div>
                <span>
                  {
                    selectedLesson
                      .category
                  }
                </span>


                <h3>
                  {
                    selectedLesson
                      .word
                  }
                </h3>
              </div>


              <button
                type="button"
                aria-label="Tutup"
                onClick={
                  closeLesson
                }
              >
                <X
                  size={18}
                />
              </button>
            </div>


            {/* =================================
                LESSON MODE
            ================================= */}

            {!practiceMode && (
              <>
                <div className="lesson-content-grid">
                  {/* =========================
                      LEFT
                  ========================= */}

                  <div className="lesson-video-section">
                    {/* VIDEO TITLE */}

                    <div className="lesson-section-title">
                      <Video
                        size={15}
                        strokeWidth={1.8}
                      />

                      Video Referensi
                    </div>


                    {/* VIDEO */}

                    {!videoError ? (
                      <div className="gesture-video-player">
                        <video
                          key={
                            selectedLesson.id
                          }
                          src={
                            selectedLesson.video
                          }
                          controls
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="auto"
                          onError={() => {
                            setVideoError(
                              true
                            );
                          }}
                        >
                          Browser tidak
                          mendukung video MP4.
                        </video>
                      </div>
                    ) : (
                      <div className="gesture-video-error">
                        <Video
                          size={28}
                          strokeWidth={1.5}
                        />

                        <strong>
                          Video tidak ditemukan
                        </strong>

                        <p>
                          URL:
                        </p>

                        <code>
                          {
                            selectedLesson
                              .video
                          }
                        </code>
                      </div>
                    )}


                    {/* =================================
                        MOVEMENT DESCRIPTION
                    ================================= */}

                    <section className="lesson-info-card lesson-movement-card">
                      <div className="lesson-info-heading">
                        <Lightbulb
                          size={15}
                          strokeWidth={1.8}
                        />

                        Gerakan dari Video Referensi
                      </div>


                      {/* HAND */}

                      <div className="lesson-movement-block">
                        <span>
                          Tangan
                        </span>


                        <p>
                          {
                            selectedLesson
                              .movement
                              .hands
                          }
                        </p>
                      </div>


                      {/* START */}

                      <div className="lesson-movement-block">
                        <span>
                          Posisi Awal
                        </span>


                        <p>
                          {
                            selectedLesson
                              .movement
                              .start
                          }
                        </p>
                      </div>


                      {/* ACTION */}

                      <div className="lesson-movement-block">
                        <span>
                          Gerakan
                        </span>


                        <p>
                          {
                            selectedLesson
                              .movement
                              .action
                          }
                        </p>
                      </div>


                      {/* FINISH */}

                      <div className="lesson-movement-block">
                        <span>
                          Posisi Akhir
                        </span>


                        <p>
                          {
                            selectedLesson
                              .movement
                              .finish
                          }
                        </p>
                      </div>


                      {/* FOCUS */}

                      <div className="lesson-focus-list">
                        <span>
                          Hal yang Perlu Diperhatikan
                        </span>


                        <ul>
                          {selectedLesson
                            .movement
                            .focus
                            .map(
                              (item) => (
                                <li
                                  key={
                                    item
                                  }
                                >
                                  {item}
                                </li>
                              )
                            )}
                        </ul>
                      </div>
                    </section>
                  </div>


                  {/* =========================
                      RIGHT
                  ========================= */}

                  <div className="lesson-information">
                    {/* ARTI */}

                    <section className="lesson-info-card">
                      <div className="lesson-info-heading">
                        <Languages
                          size={15}
                          strokeWidth={1.8}
                        />

                        Arti
                      </div>


                      <p>
                        {
                          selectedLesson
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

                        Contoh Kalimat
                      </div>


                      <p className="lesson-example">
                        “
                        {
                          selectedLesson
                            .example
                        }
                        ”
                      </p>
                    </section>


                    {/* PRACTICE RULE */}

                    <section className="lesson-info-card">
                      <div className="lesson-info-heading">
                        <CheckCircle2
                          size={15}
                          strokeWidth={1.8}
                        />

                        Syarat Selesai
                      </div>


                      <p>
                        Kosakata ini hanya
                        dianggap selesai jika
                        gesture berhasil
                        dikenali AI sebanyak
                        {" "}
                        <strong>
                          {
                            PRACTICE_RULES
                              .requiredRepetitions
                          }
                          {" "}
                          kali
                        </strong>
                        .
                      </p>


                      <p>
                        Prediksi harus sama
                        dengan target
                        {" "}
                        <strong>
                          {
                            selectedLesson
                              .word
                          }
                        </strong>
                        ,
                        confidence minimal
                        {" "}
                        <strong>
                          {
                            PRACTICE_RULES
                              .minConfidencePercent
                          }
                          %
                        </strong>
                        {" "}
                        dan margin minimal
                        {" "}
                        <strong>
                          {
                            PRACTICE_RULES
                              .minMarginPercent
                          }
                          %
                        </strong>
                        .
                      </p>
                    </section>


                    {/* HOW TO PRACTICE */}

                    <section className="lesson-info-card">
                      <div className="lesson-info-heading">
                        <Lightbulb
                          size={15}
                          strokeWidth={1.8}
                        />

                        Cara Latihan
                      </div>


                      <p>
                        Tonton video beberapa
                        kali sebelum menyalakan
                        kamera.
                      </p>


                      <p>
                        Setelah satu gesture
                        berhasil dikenali,
                        kembali ke posisi netral
                        terlebih dahulu sebelum
                        mengulanginya.
                      </p>


                      <p>
                        Menahan satu gesture
                        terus-menerus tidak
                        dihitung sebagai beberapa
                        repetisi.
                      </p>
                    </section>


                    {/* NOTE */}

                    <div className="gesture-modal-note">
                      <Lightbulb
                        size={15}
                        strokeWidth={1.8}
                      />


                      <p>
                        Deskripsi gerakan
                        merupakan observasi dari
                        video referensi dataset
                        BISINDO v1 dan belum
                        diklaim sebagai standar
                        BISINDO yang telah
                        diverifikasi ahli.
                      </p>
                    </div>
                  </div>
                </div>


                {/* =================================
                    CURRENT LESSON PROGRESS
                ================================= */}

                <div className="gesture-modal-info">
                  <div>
                    <span>
                      Class ID
                    </span>


                    <strong>
                      #
                      {String(
                        selectedLesson.id
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
                        selectedLesson
                          .category
                      }
                    </strong>
                  </div>


                  <div>
                    <span>
                      Latihan Valid
                    </span>


                    <strong>
                      {
                        getLessonProgress(
                          selectedLesson.id
                        )
                          .validRepetitions
                      }
                      {" / "}
                      {
                        PRACTICE_RULES
                          .requiredRepetitions
                      }
                    </strong>
                  </div>


                  <div>
                    <span>
                      Status
                    </span>


                    <strong>
                      {getLessonProgress(
                        selectedLesson.id
                      ).completed
                        ? (
                            "Selesai"
                          )
                        : (
                            "Belum Selesai"
                          )}
                    </strong>
                  </div>
                </div>


                {/* =================================
                    START PRACTICE
                ================================= */}

                <button
                  type="button"
                  className="gesture-modal-complete"
                  onClick={() => {
                    setPracticeMode(
                      true
                    );
                  }}
                >
                  <Play
                    size={16}
                    strokeWidth={1.9}
                  />

                  Latih dengan Kamera

                  {" · "}

                  {
                    getLessonProgress(
                      selectedLesson.id
                    )
                      .validRepetitions
                  }
                  /
                  {
                    PRACTICE_RULES
                      .requiredRepetitions
                  }
                </button>
              </>
            )}


            {/* =================================
                PRACTICE MODE
            ================================= */}

            {practiceMode && (
              <>
                <LearningPracticePanel
                  lesson={
                    selectedLesson
                  }

                  progress={
                    getLessonProgress(
                      selectedLesson.id
                    )
                  }

                  onRegisterResult={
                    registerResult
                  }

                  onReset={
                    resetLesson
                  }
                />


                <button
                  type="button"
                  className="gesture-modal-complete completed"
                  onClick={() => {
                    setPracticeMode(
                      false
                    );
                  }}
                >
                  Kembali ke Materi
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default LearningPage;