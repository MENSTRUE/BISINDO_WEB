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
     STREAM
  ========================= */

  const {
    isStreaming,

    streamFps,

    sentFrames,

    receivedFrames,
  } = useFrameStreamer({
    videoRef,

    isCameraActive,
  });


  /* =========================
     REALTIME AI
  ========================= */

  const {
    landmarks,

    lastFrameId,

    predictionStatus,

    predictionAccepted,

    predictionAcceptedEvent,

    predictionLabel,

    predictionConfidencePercent,

    predictionMarginPercent,

    predictionSegmentId,
  } = useRealtimeLandmarks();


  /* =========================
     FEEDBACK
  ========================= */

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
   * Mencegah accepted_event
   * yang sama dihitung dua kali.
   */
  const lastAcceptedEventRef =
    useRef(null);


  /* =========================
     EVENT KEY
  ========================= */

  const currentEventKey =
    useMemo(
      () => {
        if (
          predictionSegmentId !==
            null
          &&
          predictionSegmentId !==
            undefined
        ) {
          return (
            `segment:`
            +
            `${predictionSegmentId}`
          );
        }


        if (
          lastFrameId !== null
          &&
          lastFrameId !==
            undefined
        ) {
          return (
            `frame:`
            +
            `${lastFrameId}:`
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


  /* =========================
     START
  ========================= */

  const handleStart =
    async () => {
      /*
       * Jangan hitung event lama
       * sebelum kamera dimulai.
       */
      lastAcceptedEventRef
        .current =
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


  /* =========================
     STOP
  ========================= */

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


  /* =========================
     AI ACCEPTED EVENT
  ========================= */

  useEffect(() => {
    if (
      !isCameraActive
      ||
      !isStreaming
    ) {
      return;
    }


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


    if (
      lastAcceptedEventRef
        .current
      ===
      currentEventKey
    ) {
      return;
    }


    lastAcceptedEventRef
      .current =
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
            "Kembali ke posisi netral lalu ulangi."
          ),
      });
    }

    else {
      let reason =
        (
          `AI membaca "${predictionLabel}".`
        );


      if (
        result
          ?.labelMatches
        &&
        !result
          ?.confidenceValid
      ) {
        reason =
          (
            `Label benar, tetapi confidence `
            +
            `${confidence.toFixed(1)}% masih di bawah `
            +
            `${PRACTICE_RULES.minConfidencePercent}%.`
          );
      }


      else if (
        result
          ?.labelMatches
        &&
        !result
          ?.marginValid
      ) {
        reason =
          (
            `Label benar, tetapi margin `
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
            `${reason} Target latihan adalah "${lesson.word}".`
          ),
      });
    }

  }, [
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
  ]);


  /* =========================
     CLEANUP
  ========================= */

  useEffect(
    () => () => {
      stopCamera();
    },

    [
      stopCamera,
    ]
  );


  /* =========================
     PROGRESS
  ========================= */

  const validCount =
    Math.min(
      progress
        .validRepetitions,

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


  const currentPrediction =
    predictionLabel
    ||
    "Menunggu...";


  return (
    <section className="learning-practice-panel">
      {/* =====================
          HEADER
      ===================== */}

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


        {progress.completed && (
          <div className="learning-practice-completed">
            <CheckCircle2
              size={15}
            />

            Selesai
          </div>
        )}
      </div>


      {/* =====================
          PROGRESS
      ===================== */}

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


      {/* =====================
          CAMERA
      ===================== */}

      <div className="learning-practice-preview">
        <video
          ref={videoRef}
          className="camera-video learning-practice-video"
          autoPlay
          muted
          playsInline
        />


        <LandmarkCanvas
          landmarks={
            landmarks
          }
          mirrored
        />


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


        {isCameraActive && (
          <div className="learning-practice-live">
            <span />

            LIVE
          </div>
        )}
      </div>


      {/* =====================
          CAMERA ACTION
      ===================== */}

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
              ? "Meminta Izin..."
              : "Mulai Kamera"}
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
            : "Menunggu stream"}
        </div>
      </div>


      {cameraError && (
        <div className="learning-practice-error-message">
          <CircleAlert
            size={14}
          />

          {cameraError}
        </div>
      )}


      {/* =====================
          LIVE AI
      ===================== */}

      <div className="learning-practice-ai-grid">
        <div>
          <span>
            Target
          </span>

          <strong>
            {lesson.word}
          </strong>
        </div>


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
              : "--"}
          </strong>
        </div>


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
              : "--"}
          </strong>
        </div>
      </div>


      {/* =====================
          FEEDBACK
      ===================== */}

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


      {/* =====================
          STATS
      ===================== */}

      <div className="learning-practice-stats">
        <div>
          <span>
            Percobaan
          </span>

          <strong>
            {
              progress.attempts
            }
          </strong>
        </div>


        <div>
          <span>
            Valid
          </span>

          <strong>
            {
              progress
                .validRepetitions
            }
          </strong>
        </div>


        <div>
          <span>
            Belum Valid
          </span>

          <strong>
            {
              progress
                .invalidRepetitions
            }
          </strong>
        </div>


        <div>
          <span>
            Avg. Confidence
          </span>

          <strong>
            {progress
              .validRepetitions >
            0
              ? (
                  `${Number(
                    progress
                      .averageConfidence
                  ).toFixed(1)}%`
                )
              : "--"}
          </strong>
        </div>


        <div>
          <span>
            Best
          </span>

          <strong>
            {progress
              .bestConfidence >
            0
              ? (
                  `${Number(
                    progress
                      .bestConfidence
                  ).toFixed(1)}%`
                )
              : "--"}
          </strong>
        </div>
      </div>


      {/* =====================
          RESET
      ===================== */}

      {progress.attempts > 0 && (
        <button
          type="button"
          className="learning-practice-reset"
          onClick={() => {
            const confirmed =
              window.confirm(
                (
                  `Reset latihan "${lesson.word}" `
                  +
                  "kembali ke 0/10?"
                )
              );


            if (confirmed) {
              onReset(
                lesson.id
              );


              setFeedback({
                type: "idle",

                title:
                  "Progress direset",

                description:
                  "Latihan kembali ke 0/10.",
              });
            }
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