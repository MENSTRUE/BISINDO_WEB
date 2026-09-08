import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Gauge,
  RotateCcw,
  Square,
  Wifi,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import useCamera
  from "../../hooks/useCamera";

import useFrameStreamer
  from "../../hooks/useFrameStreamer";

import useRealtimeLandmarks
  from "../../hooks/useRealtimeLandmarks";

import LandmarkCanvas
  from "../landmarks/LandmarkCanvas";

import {
  PRACTICE_RULES,
} from "../../data/learningLessons";

import "../../styles/learning-practice.css";


function LearningPracticePanel({
  lesson,
  progress,
  onRegisterResult,
  onReset,
}) {
  /* =========================================
     CAMERA
  ========================================= */

  const {
    videoRef,
    isCameraActive,
    cameraStatus,
    cameraError,
    startCamera,
    stopCamera,
  } = useCamera();


  /* =========================================
     STREAM
  ========================================= */

  const {
    isStreaming,
    streamFps,
    receivedFrames,
  } = useFrameStreamer({
    videoRef,
    isCameraActive,
  });


  /* =========================================
     REALTIME AI
  ========================================= */

  const {
    landmarks,

    lastFrameId,

    predictionAccepted,
    predictionAcceptedEvent,

    predictionLabel,
    predictionConfidencePercent,
    predictionMarginPercent,

    predictionSegmentId,
  } = useRealtimeLandmarks();


  /* =========================================
     FEEDBACK
  ========================================= */

  const [
    feedback,
    setFeedback,
  ] = useState({
    type: "idle",

    title:
      "Kamera belum dimulai",

    description:
      "Aktifkan kamera lalu lakukan gesture sesuai video referensi.",
  });


  /*
   * Satu accepted event dari backend
   * hanya boleh dihitung sekali.
   */
  const lastAcceptedEventRef =
    useRef(null);


  /* =========================================
     EVENT KEY
  ========================================= */

  const currentEventKey =
    useMemo(
      () => {
        /*
         * Prioritas pertama:
         * gunakan segment ID dari backend.
         *
         * Ini paling aman karena setiap
         * gesture mempunyai segment berbeda.
         */
        if (
          predictionSegmentId !== null
          &&
          predictionSegmentId !== undefined
        ) {
          return (
            `segment:${predictionSegmentId}`
          );
        }


        /*
         * Fallback jika backend tidak
         * mengirim segment ID.
         */
        if (
          lastFrameId !== null
          &&
          lastFrameId !== undefined
        ) {
          return (
            `frame:${lastFrameId}:`
            +
            `${predictionLabel ?? ""}`
          );
        }


        return null;
      },

      [
        predictionSegmentId,
        lastFrameId,
        predictionLabel,
      ]
    );


  /* =========================================
     START CAMERA
  ========================================= */

  const handleStart =
    async () => {
      /*
       * Jangan sampai hasil gesture lama
       * sebelum kamera aktif ikut dihitung.
       */
      lastAcceptedEventRef.current =
        currentEventKey;


      setFeedback({
        type: "waiting",

        title:
          `Target: ${lesson.word}`,

        description:
          "Lakukan satu gesture lalu kembali ke posisi netral sebelum mengulang.",
      });


      await startCamera();
    };


  /* =========================================
     STOP CAMERA
  ========================================= */

  const handleStop =
    () => {
      stopCamera();


      setFeedback({
        type: "idle",

        title:
          "Latihan dihentikan",

        description:
          "Tekan Mulai Kamera untuk melanjutkan latihan.",
      });
    };


  /* =========================================
     AI ACCEPTED EVENT
  ========================================= */

  useEffect(
    () => {
      /*
       * Kamera dan stream harus aktif.
       */
      if (
        !isCameraActive
        ||
        !isStreaming
      ) {
        return;
      }


      /*
       * Hanya accepted_event dari backend
       * yang boleh menjadi satu attempt.
       */
      if (
        !predictionAcceptedEvent
        ||
        !predictionAccepted
        ||
        !predictionLabel
      ) {
        return;
      }


      if (!currentEventKey) {
        return;
      }


      /*
       * Jangan hitung segment yang sama
       * berkali-kali walaupun React
       * menerima beberapa message.
       */
      if (
        lastAcceptedEventRef.current
        ===
        currentEventKey
      ) {
        return;
      }


      lastAcceptedEventRef.current =
        currentEventKey;


      const confidence =
        Number(
          predictionConfidencePercent
          ??
          0
        );


      const margin =
        Number(
          predictionMarginPercent
          ??
          0
        );


      /*
       * Simpan hasil ke progress lesson.
       */
      const result =
        onRegisterResult({
          lesson,

          predictedLabel:
            predictionLabel,

          confidencePercent:
            confidence,

          marginPercent:
            margin,
        });


      /* =====================================
         VALID
      ===================================== */

      if (
        result?.valid
      ) {
        setFeedback({
          type: "success",

          title:
            `Valid — ${lesson.word}`,

          description:
            (
              `${confidence.toFixed(1)}% confidence`
              +
              ` · margin ${margin.toFixed(1)}%. `
              +
              "Kembali ke posisi netral lalu ulangi gesture."
            ),
        });


        return;
      }


      /* =====================================
         INVALID
      ===================================== */

      let reason =
        `AI membaca "${predictionLabel}".`;


      /*
       * Label benar tetapi confidence
       * belum mencapai threshold.
       */
      if (
        result?.labelMatches
        &&
        !result?.confidenceValid
      ) {
        reason =
          (
            "Label sudah benar, tetapi confidence "
            +
            `${confidence.toFixed(1)}% masih di bawah `
            +
            `${PRACTICE_RULES.minConfidencePercent}%.`
          );
      }


      /*
       * Label + confidence benar,
       * tetapi margin belum cukup.
       */
      else if (
        result?.labelMatches
        &&
        !result?.marginValid
      ) {
        reason =
          (
            "Label sudah benar, tetapi margin "
            +
            `${margin.toFixed(1)}% belum mencapai `
            +
            `${PRACTICE_RULES.minMarginPercent}%.`
          );
      }


      setFeedback({
        type: "error",

        title:
          "Belum valid",

        description:
          (
            `${reason} `
            +
            `Target latihan adalah "${lesson.word}".`
          ),
      });
    },

    [
      isCameraActive,
      isStreaming,

      predictionAcceptedEvent,
      predictionAccepted,
      predictionLabel,

      predictionConfidencePercent,
      predictionMarginPercent,

      currentEventKey,

      lesson,
      onRegisterResult,
    ]
  );


  /* =========================================
     CLEANUP CAMERA
  ========================================= */

  useEffect(
    () => {
      return () => {
        stopCamera();
      };
    },

    [
      stopCamera,
    ]
  );


  /* =========================================
     PROGRESS
  ========================================= */

  const validCount =
    Math.min(
      Number(
        progress
          ?.validRepetitions
        ??
        0
      ),

      PRACTICE_RULES
        .requiredRepetitions
    );


  const practicePercent =
    Math.round(
      (
        validCount
        /
        PRACTICE_RULES
          .requiredRepetitions
      )
      *
      100
    );


  /* =========================================
     CURRENT PREDICTION
  ========================================= */

  const currentPrediction =
    predictionLabel
    ||
    "Menunggu...";


  /* =========================================
     RENDER
  ========================================= */

  return (
    <section className="learning-practice-panel">
      {/* =====================================
          HEADER
      ===================================== */}

      <div className="learning-practice-header">
        <div>
          <span>
            AI Practice
          </span>


          <h4>
            Latih “{lesson.word}”
          </h4>


          <p>
            Gesture harus berhasil
            dikenali AI sebanyak
            {" "}

            <strong>
              {
                PRACTICE_RULES
                  .requiredRepetitions
              }
              x
            </strong>
            .
          </p>
        </div>


        {progress?.completed && (
          <div className="learning-practice-completed">
            <CheckCircle2
              size={15}
              strokeWidth={1.9}
            />

            Selesai
          </div>
        )}
      </div>


      {/* =====================================
          PROGRESS
      ===================================== */}

      <div className="learning-practice-progress">
        <div className="learning-practice-progress-top">
          <div>
            <span>
              Latihan valid
            </span>


            <strong>
              {validCount}
              {" / "}
              {
                PRACTICE_RULES
                  .requiredRepetitions
              }
            </strong>
          </div>


          <b>
            {practicePercent}%
          </b>
        </div>


        <div className="learning-practice-track">
          <div
            style={{
              width:
                `${practicePercent}%`,
            }}
          />
        </div>
      </div>


      {/* =====================================
          CAMERA PREVIEW
      ===================================== */}

      <div className="learning-practice-preview">
        {/*
         * FIX PENTING:
         *
         * CSS global .camera-video
         * mempunyai opacity: 0.
         *
         * Class "visible" harus diberikan
         * ketika kamera sudah aktif.
         *
         * Sebelumnya:
         *
         * className=
         * "camera-video learning-practice-video"
         *
         * menyebabkan video sebenarnya hidup,
         * tetapi tidak terlihat.
         */}

        <video
          ref={videoRef}
          className={
            `camera-video learning-practice-video ${
              isCameraActive
                ? "visible"
                : ""
            }`
          }
          autoPlay
          muted
          playsInline
        />


        {/* LANDMARK */}

        <LandmarkCanvas
          landmarks={
            landmarks
          }
          mirrored
        />


        {/* CAMERA OFF */}

        {!isCameraActive && (
          <div className="learning-practice-camera-empty">
            <Camera
              size={30}
              strokeWidth={1.5}
            />


            <strong>
              Kamera belum aktif
            </strong>


            <p>
              Posisikan tubuh seperti
              contoh video sebelum
              memulai.
            </p>
          </div>
        )}


        {/* LIVE BADGE */}

        {isCameraActive && (
          <div className="learning-practice-live">
            <span />

            LIVE
          </div>
        )}
      </div>


      {/* =====================================
          CAMERA ACTIONS
      ===================================== */}

      <div className="learning-practice-camera-actions">
        {!isCameraActive ? (
          <button
            type="button"
            className="learning-practice-start"
            onClick={
              handleStart
            }
            disabled={
              cameraStatus ===
              "requesting"
            }
          >
            <Camera
              size={15}
            />


            {cameraStatus ===
            "requesting"
              ? (
                  "Meminta Izin..."
                )
              : (
                  "Mulai Kamera"
                )}
          </button>
        ) : (
          <button
            type="button"
            className="learning-practice-stop"
            onClick={
              handleStop
            }
          >
            <Square
              size={14}
            />

            Hentikan
          </button>
        )}


        {/* STREAM INFO */}

        <div className="learning-practice-stream">
          <Wifi
            size={13}
          />


          {isStreaming
            ? (
                `${streamFps} FPS · `
                +
                `${receivedFrames} frame`
              )
            : (
                "Menunggu stream"
              )}
        </div>
      </div>


      {/* =====================================
          CAMERA ERROR
      ===================================== */}

      {cameraError && (
        <div className="learning-practice-error-message">
          <CircleAlert
            size={14}
          />

          {cameraError}
        </div>
      )}


      {/* =====================================
          LIVE AI RESULT
      ===================================== */}

      <div className="learning-practice-ai-grid">
        {/* TARGET */}

        <div>
          <span>
            Target
          </span>


          <strong>
            {lesson.word}
          </strong>
        </div>


        {/* PREDICTION */}

        <div>
          <span>
            Prediksi AI
          </span>


          <strong>
            {
              currentPrediction
            }
          </strong>
        </div>


        {/* CONFIDENCE */}

        <div>
          <span>
            Confidence
          </span>


          <strong>
            {predictionLabel
              ? (
                  `${Number(
                    predictionConfidencePercent
                    ??
                    0
                  ).toFixed(1)}%`
                )
              : (
                  "--"
                )}
          </strong>
        </div>


        {/* MARGIN */}

        <div>
          <span>
            Margin
          </span>


          <strong>
            {predictionLabel
              ? (
                  `${Number(
                    predictionMarginPercent
                    ??
                    0
                  ).toFixed(1)}%`
                )
              : (
                  "--"
                )}
          </strong>
        </div>
      </div>


      {/* =====================================
          FEEDBACK
      ===================================== */}

      <div
        className={
          `learning-practice-feedback ${
            feedback.type
          }`
        }
      >
        {feedback.type ===
        "success" ? (
          <CheckCircle2
            size={17}
          />
        ) : feedback.type ===
          "error" ? (
          <CircleAlert
            size={17}
          />
        ) : (
          <Gauge
            size={17}
          />
        )}


        <div>
          <strong>
            {
              feedback.title
            }
          </strong>


          <p>
            {
              feedback.description
            }
          </p>
        </div>
      </div>


      {/* =====================================
          PRACTICE STATS
      ===================================== */}

      <div className="learning-practice-stats">
        {/* ATTEMPTS */}

        <div>
          <span>
            Percobaan
          </span>


          <strong>
            {
              progress?.attempts
              ??
              0
            }
          </strong>
        </div>


        {/* VALID */}

        <div>
          <span>
            Valid
          </span>


          <strong>
            {
              progress
                ?.validRepetitions
              ??
              0
            }
          </strong>
        </div>


        {/* INVALID */}

        <div>
          <span>
            Belum Valid
          </span>


          <strong>
            {
              progress
                ?.invalidRepetitions
              ??
              0
            }
          </strong>
        </div>


        {/* AVG CONFIDENCE */}

        <div>
          <span>
            Avg. Confidence
          </span>


          <strong>
            {Number(
              progress
                ?.validRepetitions
              ??
              0
            ) > 0
              ? (
                  `${Number(
                    progress
                      ?.averageConfidence
                    ??
                    0
                  ).toFixed(1)}%`
                )
              : (
                  "--"
                )}
          </strong>
        </div>


        {/* BEST CONFIDENCE */}

        <div>
          <span>
            Best
          </span>


          <strong>
            {Number(
              progress
                ?.bestConfidence
              ??
              0
            ) > 0
              ? (
                  `${Number(
                    progress
                      ?.bestConfidence
                    ??
                    0
                  ).toFixed(1)}%`
                )
              : (
                  "--"
                )}
          </strong>
        </div>
      </div>


      {/* =====================================
          RESET
      ===================================== */}

      {Number(
        progress?.attempts
        ??
        0
      ) > 0 && (
        <button
          type="button"
          className="learning-practice-reset"
          onClick={() => {
            const confirmed =
              window.confirm(
                (
                  `Reset latihan "${lesson.word}" `
                  +
                  `kembali ke 0/${
                    PRACTICE_RULES
                      .requiredRepetitions
                  }?`
                )
              );


            if (!confirmed) {
              return;
            }


            onReset(
              lesson.id
            );


            /*
             * Supaya event terakhir tidak
             * langsung terhitung lagi
             * setelah reset.
             */
            lastAcceptedEventRef.current =
              currentEventKey;


            setFeedback({
              type: "idle",

              title:
                "Progress direset",

              description:
                (
                  "Latihan kembali ke "
                  +
                  `0/${
                    PRACTICE_RULES
                      .requiredRepetitions
                  }.`
                ),
            });
          }}
        >
          <RotateCcw
            size={13}
          />

          Reset Latihan
        </button>
      )}
    </section>
  );
}


export default LearningPracticePanel;