import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleGauge,
  Clock3,
  History,
  Languages,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import "../styles/history.css";


const STORAGE_KEY =
  "bisindo-recognition-history-v1";


const TIME_FILTERS = [
  {
    id: "all",
    label: "Semua",
  },
  {
    id: "today",
    label: "Hari Ini",
  },
  {
    id: "week",
    label: "7 Hari",
  },
];


const loadHistory = () => {
  try {
    const stored =
      window.localStorage
        .getItem(
          STORAGE_KEY
        );


    if (!stored) {
      return [];
    }


    const parsed =
      JSON.parse(
        stored
      );


    if (
      !Array.isArray(
        parsed
      )
    ) {
      return [];
    }


    return parsed;
  }

  catch {
    return [];
  }
};


const getTranscriptWords =
  (session) => {
    if (
      Array.isArray(
        session.transcript
      )
    ) {
      return session.transcript;
    }


    if (
      typeof session.transcript ===
      "string"
    ) {
      return session.transcript
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    }


    if (
      Array.isArray(
        session.words
      )
    ) {
      return session.words;
    }


    return [];
  };


const getTranscriptText =
  (session) => {
    const words =
      getTranscriptWords(
        session
      );


    return words.join(" ");
  };


const getSessionDate =
  (session) => {
    const source =
      session.createdAt
      ??
      session.created_at
      ??
      session.timestamp;


    const date =
      new Date(source);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }


    return date;
  };


const formatDate =
  (date) => {
    if (!date) {
      return "--";
    }


    return new Intl
      .DateTimeFormat(
        "id-ID",
        {
          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric",
        }
      )
      .format(
        date
      );
  };


const formatTime =
  (date) => {
    if (!date) {
      return "--:--";
    }


    return new Intl
      .DateTimeFormat(
        "id-ID",
        {
          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      )
      .format(
        date
      );
  };


const formatDuration =
  (seconds) => {
    const safeSeconds =
      Math.max(
        0,
        Number(
          seconds ?? 0
        )
      );


    if (
      safeSeconds < 60
    ) {
      return `${Math.round(
        safeSeconds
      )} dtk`;
    }


    const minutes =
      Math.floor(
        safeSeconds / 60
      );


    const remainder =
      Math.round(
        safeSeconds % 60
      );


    return (
      `${minutes} mnt `
      +
      `${remainder} dtk`
    );
  };


function HistoryPage() {
  const [
    historyItems,
    setHistoryItems,
  ] = useState(
    loadHistory
  );


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    timeFilter,
    setTimeFilter,
  ] = useState("all");


  /* =========================
     FILTER
  ========================= */

  const filteredHistory =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();


      const now =
        new Date();


      const todayStart =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );


      const sevenDaysAgo =
        new Date(
          now.getTime()
          -
          (
            7
            * 24
            * 60
            * 60
            * 1000
          )
        );


      return historyItems
        .filter(
          (session) => {
            const date =
              getSessionDate(
                session
              );


            if (
              timeFilter ===
              "today"
            ) {
              if (
                !date
                ||
                date <
                  todayStart
              ) {
                return false;
              }
            }


            if (
              timeFilter ===
              "week"
            ) {
              if (
                !date
                ||
                date <
                  sevenDaysAgo
              ) {
                return false;
              }
            }


            if (
              normalizedSearch
            ) {
              const text =
                getTranscriptText(
                  session
                )
                  .toLowerCase();


              if (
                !text.includes(
                  normalizedSearch
                )
              ) {
                return false;
              }
            }


            return true;
          }
        )
        .sort(
          (
            sessionA,
            sessionB
          ) => {
            const dateA =
              getSessionDate(
                sessionA
              );


            const dateB =
              getSessionDate(
                sessionB
              );


            return (
              (
                dateB?.getTime()
                ?? 0
              )
              -
              (
                dateA?.getTime()
                ?? 0
              )
            );
          }
        );

    }, [
      historyItems,
      search,
      timeFilter,
    ]);


  /* =========================
     STATISTICS
  ========================= */

  const totalSessions =
    historyItems.length;


  const totalWords =
    historyItems.reduce(
      (
        total,
        session
      ) =>
        total
        +
        getTranscriptWords(
          session
        ).length,
      0
    );


  const confidenceValues =
    historyItems
      .map(
        (session) =>
          Number(
            session.avgConfidence
            ??
            session.averageConfidence
            ??
            session.confidence
          )
      )
      .filter(
        (value) =>
          Number.isFinite(
            value
          )
          &&
          value > 0
      );


  const averageConfidence =
    confidenceValues.length > 0
      ? (
          confidenceValues.reduce(
            (
              total,
              value
            ) =>
              total
              +
              value,
            0
          )
          /
          confidenceValues.length
        )
      : 0;


  const latestSession =
    useMemo(() => {
      if (
        historyItems.length ===
        0
      ) {
        return null;
      }


      return [
        ...historyItems,
      ].sort(
        (
          sessionA,
          sessionB
        ) =>
          (
            getSessionDate(
              sessionB
            )?.getTime()
            ?? 0
          )
          -
          (
            getSessionDate(
              sessionA
            )?.getTime()
            ?? 0
          )
      )[0];

    }, [
      historyItems,
    ]);


  const latestDate =
    latestSession
      ? getSessionDate(
          latestSession
        )
      : null;


  /* =========================
     DELETE
  ========================= */

  const persistHistory =
    (items) => {
      setHistoryItems(
        items
      );


      try {
        window.localStorage
          .setItem(
            STORAGE_KEY,
            JSON.stringify(
              items
            )
          );
      }

      catch {
        /*
         * UI tetap berjalan
         * walau penyimpanan gagal.
         */
      }
    };


  const removeSession =
    (sessionIndex) => {
      const target =
        filteredHistory[
          sessionIndex
        ];


      if (!target) {
        return;
      }


      const nextHistory =
        historyItems.filter(
          (session) =>
            session !== target
        );


      persistHistory(
        nextHistory
      );
    };


  const clearHistory =
    () => {
      persistHistory(
        []
      );
    };


  /* =========================
     STAT CARDS
  ========================= */

  const stats = [
    {
      id:
        "sessions",

      label:
        "Total Sesi",

      value:
        totalSessions,

      description:
        "Sesi pengenalan tersimpan",

      icon:
        History,
    },

    {
      id:
        "words",

      label:
        "Kata Dikenali",

      value:
        totalWords,

      description:
        "Total kata dari seluruh sesi",

      icon:
        Languages,
    },

    {
      id:
        "confidence",

      label:
        "Rata-rata Confidence",

      value:
        confidenceValues.length
          ? (
              `${averageConfidence.toFixed(
                1
              )}%`
            )
          : "--",

      description:
        "Confidence sesi tersimpan",

      icon:
        CircleGauge,
    },

    {
      id:
        "latest",

      label:
        "Sesi Terakhir",

      value:
        latestDate
          ? formatDate(
              latestDate
            )
          : "--",

      description:
        latestDate
          ? formatTime(
              latestDate
            )
          : "Belum ada sesi",

      icon:
        Clock3,
    },
  ];


  return (
    <div className="history-page">
      {/* =========================
          HEADING
      ========================= */}

      <section className="history-heading">
        <div>
          <span className="history-eyebrow">
            Recognition History
          </span>

          <h2>
            Riwayat Pengenalan
          </h2>

          <p>
            Lihat kembali hasil
            pengenalan BISINDO dari
            sesi sebelumnya.
          </p>
        </div>


        <Link
          to="/recognition"
          className="history-primary-action"
        >
          <Activity
            size={16}
            strokeWidth={1.8}
          />

          Mulai Pengenalan

          <ArrowRight
            size={15}
            strokeWidth={1.8}
          />
        </Link>
      </section>


      {/* =========================
          STATISTICS
      ========================= */}

      <section className="history-stats-grid">
        {stats.map(
          (stat) => {
            const Icon =
              stat.icon;


            return (
              <article
                className="history-stat-card"
                key={
                  stat.id
                }
              >
                <div className="history-stat-top">
                  <div className="history-stat-icon">
                    <Icon
                      size={18}
                      strokeWidth={1.8}
                    />
                  </div>

                  <span className="history-stat-dot" />
                </div>


                <span className="history-stat-label">
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
          }
        )}
      </section>


      {/* =========================
          HISTORY PANEL
      ========================= */}

      <section className="history-panel">
        <div className="history-panel-heading">
          <div>
            <span className="history-section-label">
              Sessions
            </span>

            <h3>
              Sesi Pengenalan
            </h3>
          </div>


          <div className="history-panel-count">
            <History
              size={14}
              strokeWidth={1.7}
            />

            <span>
              {
                filteredHistory
                  .length
              }
              {" "}
              sesi
            </span>
          </div>
        </div>


        {/* =====================
            TOOLBAR
        ===================== */}

        <div className="history-toolbar">
          <div className="history-search">
            <Search
              size={16}
              strokeWidth={1.8}
            />

            <input
              type="text"
              value={
                search
              }
              placeholder="Cari kata dari transcript..."
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


          <div className="history-filter-group">
            {TIME_FILTERS.map(
              (filter) => (
                <button
                  key={
                    filter.id
                  }
                  type="button"
                  className={
                    timeFilter ===
                    filter.id
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setTimeFilter(
                      filter.id
                    )
                  }
                >
                  {
                    filter.label
                  }
                </button>
              )
            )}
          </div>


          {historyItems.length >
          0 && (
            <button
              type="button"
              className="history-clear-button"
              onClick={
                clearHistory
              }
            >
              <Trash2
                size={14}
                strokeWidth={1.8}
              />

              Hapus Semua
            </button>
          )}
        </div>


        {/* =====================
            CONTENT
        ===================== */}

        {filteredHistory.length >
        0 ? (
          <div className="history-session-list">
            {filteredHistory.map(
              (
                session,
                index
              ) => {
                const date =
                  getSessionDate(
                    session
                  );


                const words =
                  getTranscriptWords(
                    session
                  );


                const transcript =
                  words.join(" ");


                const confidence =
                  Number(
                    session.avgConfidence
                    ??
                    session.averageConfidence
                    ??
                    session.confidence
                  );


                const duration =
                  session.durationSeconds
                  ??
                  session.duration_seconds
                  ??
                  session.duration
                  ??
                  0;


                return (
                  <article
                    className="history-session-card"
                    key={
                      session.id
                      ??
                      `${date?.getTime() ?? "session"}-${index}`
                    }
                  >
                    <div className="history-session-time">
                      <div className="history-date-icon">
                        <CalendarDays
                          size={17}
                          strokeWidth={1.7}
                        />
                      </div>

                      <div>
                        <strong>
                          {
                            formatDate(
                              date
                            )
                          }
                        </strong>

                        <span>
                          {
                            formatTime(
                              date
                            )
                          }
                        </span>
                      </div>
                    </div>


                    <div className="history-session-transcript">
                      <span>
                        Transcript
                      </span>

                      <strong>
                        {transcript
                          ||
                          "Tidak ada kata tersimpan"}
                      </strong>
                    </div>


                    <div className="history-session-meta">
                      <div>
                        <span>
                          Kata
                        </span>

                        <strong>
                          {
                            words.length
                          }
                        </strong>
                      </div>


                      <div>
                        <span>
                          Confidence
                        </span>

                        <strong>
                          {
                            Number
                              .isFinite(
                                confidence
                              )
                            &&
                            confidence >
                              0
                              ? (
                                  `${confidence.toFixed(
                                    1
                                  )}%`
                                )
                              : "--"
                          }
                        </strong>
                      </div>


                      <div>
                        <span>
                          Durasi
                        </span>

                        <strong>
                          {
                            Number(
                              duration
                            ) > 0
                              ? formatDuration(
                                  duration
                                )
                              : "--"
                          }
                        </strong>
                      </div>
                    </div>


                    <div className="history-session-actions">
                      <button
                        type="button"
                        className="history-delete-session"
                        title="Hapus sesi"
                        onClick={() =>
                          removeSession(
                            index
                          )
                        }
                      >
                        <Trash2
                          size={14}
                          strokeWidth={1.8}
                        />
                      </button>

                      <button
                        type="button"
                        className="history-detail-button"
                        title="Detail sesi akan ditambahkan kemudian"
                      >
                        <ChevronRight
                          size={16}
                          strokeWidth={1.8}
                        />
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="history-empty-state">
            <div className="history-empty-visual">
              <div className="history-empty-orbit orbit-one" />

              <div className="history-empty-orbit orbit-two" />

              <div className="history-empty-icon">
                <History
                  size={28}
                  strokeWidth={1.5}
                />
              </div>
            </div>


            <div className="history-empty-badge">
              <Sparkles
                size={13}
                strokeWidth={1.7}
              />

              Recognition History
            </div>


            <h4>
              {historyItems.length >
              0
                ? (
                    "Riwayat tidak ditemukan"
                  )
                : (
                    "Belum ada sesi pengenalan"
                  )}
            </h4>

            <p>
              {historyItems.length >
              0
                ? (
                    "Coba ubah pencarian atau filter waktu yang digunakan."
                  )
                : (
                    "Setelah sesi pengenalan disimpan, transcript dan informasi sesi akan muncul di halaman ini."
                  )}
            </p>


            {historyItems.length ===
            0 && (
              <Link
                to="/recognition"
                className="history-empty-action"
              >
                Mulai Pengenalan

                <ArrowRight
                  size={14}
                  strokeWidth={1.8}
                />
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}


export default HistoryPage;