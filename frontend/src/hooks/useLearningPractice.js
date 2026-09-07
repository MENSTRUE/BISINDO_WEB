import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LEARNING_LESSONS,
  PRACTICE_RULES,
} from "../data/learningLessons";


const STORAGE_KEY =
  "bisindo-learning-practice-v2";


const EMPTY_STORAGE = {
  version: 2,

  lessons: {},
};


const normalizeLabel =
  (value) =>
    String(
      value ?? ""
    )
      .trim()
      .toLowerCase();


const createEmptyLessonProgress =
  () => ({
    attempts: 0,

    validRepetitions: 0,

    invalidRepetitions: 0,

    confidenceSum: 0,

    averageConfidence: 0,

    bestConfidence: 0,

    completed: false,

    completedAt: null,

    lastPracticedAt: null,
  });


const loadStorage =
  () => {
    try {
      const value =
        window.localStorage
          .getItem(
            STORAGE_KEY
          );


      if (!value) {
        return EMPTY_STORAGE;
      }


      const parsed =
        JSON.parse(
          value
        );


      if (
        !parsed
        ||
        typeof parsed !==
          "object"
      ) {
        return EMPTY_STORAGE;
      }


      return {
        version: 2,

        lessons:
          parsed.lessons
          &&
          typeof parsed.lessons ===
            "object"
            ? parsed.lessons
            : {},
      };
    }

    catch {
      return EMPTY_STORAGE;
    }
  };


function useLearningPractice() {
  const [
    storage,
    setStorage,
  ] = useState(
    loadStorage
  );


  /* =========================
     PERSIST
  ========================= */

  useEffect(() => {
    try {
      window.localStorage
        .setItem(
          STORAGE_KEY,

          JSON.stringify(
            storage
          )
        );
    }

    catch {
      // UI tetap berjalan.
    }

  }, [
    storage,
  ]);


  /* =========================
     GET PROGRESS
  ========================= */

  const getLessonProgress =
    useCallback(
      (lessonId) => {
        const saved =
          storage.lessons[
            String(
              lessonId
            )
          ];


        return {
          ...createEmptyLessonProgress(),

          ...(saved ?? {}),
        };
      },

      [
        storage.lessons,
      ]
    );


  /* =========================
     REGISTER AI RESULT
  ========================= */

  const registerResult =
    useCallback(
      ({
        lesson,

        predictedLabel,

        confidencePercent,

        marginPercent,
      }) => {
        if (!lesson) {
          return {
            valid: false,

            reason:
              "lesson_missing",
          };
        }


        const confidence =
          Number(
            confidencePercent ?? 0
          );


        const margin =
          Number(
            marginPercent ?? 0
          );


        const labelMatches =
          normalizeLabel(
            predictedLabel
          )
          ===
          normalizeLabel(
            lesson.word
          );


        const confidenceValid =
          confidence >=
          PRACTICE_RULES
            .minConfidencePercent;


        const marginValid =
          margin >=
          PRACTICE_RULES
            .minMarginPercent;


        const valid =
          (
            labelMatches
            &&
            confidenceValid
            &&
            marginValid
          );


        let outcome =
          null;


        setStorage(
          (currentStorage) => {
            const key =
              String(
                lesson.id
              );


            const current =
              {
                ...createEmptyLessonProgress(),

                ...(
                  currentStorage
                    .lessons[
                      key
                    ]
                  ??
                  {}
                ),
              };


            const nextAttempts =
              current.attempts
              +
              1;


            const nextInvalid =
              current.invalidRepetitions
              +
              (
                valid
                  ? 0
                  : 1
              );


            const nextValid =
              Math.min(
                PRACTICE_RULES
                  .requiredRepetitions,

                current
                  .validRepetitions
                +
                (
                  valid
                    ? 1
                    : 0
                )
              );


            const confidenceSum =
              current.confidenceSum
              +
              (
                valid
                  ? confidence
                  : 0
              );


            const averageConfidence =
              nextValid > 0
                ? (
                    confidenceSum
                    /
                    nextValid
                  )
                : 0;


            const completed =
              nextValid >=
              PRACTICE_RULES
                .requiredRepetitions;


            const now =
              new Date()
                .toISOString();


            const nextProgress = {
              attempts:
                nextAttempts,

              validRepetitions:
                nextValid,

              invalidRepetitions:
                nextInvalid,

              confidenceSum,

              averageConfidence,

              bestConfidence:
                valid
                  ? Math.max(
                      current
                        .bestConfidence,

                      confidence
                    )
                  : current
                      .bestConfidence,

              completed,

              completedAt:
                completed
                  ? (
                      current
                        .completedAt
                      ??
                      now
                    )
                  : null,

              lastPracticedAt:
                now,
            };


            outcome = {
              valid,

              labelMatches,

              confidenceValid,

              marginValid,

              progress:
                nextProgress,
            };


            return {
              ...currentStorage,

              version: 2,

              lessons: {
                ...currentStorage
                  .lessons,

                [key]:
                  nextProgress,
              },
            };
          }
        );


        return {
          valid,

          labelMatches,

          confidenceValid,

          marginValid,

          /*
           * Nilai final progress akan
           * terlihat pada render berikutnya.
           */
          outcome,
        };
      },

      []
    );


  /* =========================
     RESET LESSON
  ========================= */

  const resetLesson =
    useCallback(
      (lessonId) => {
        setStorage(
          (current) => {
            const nextLessons = {
              ...current.lessons,
            };


            delete nextLessons[
              String(
                lessonId
              )
            ];


            return {
              ...current,

              lessons:
                nextLessons,
            };
          }
        );
      },

      []
    );


  /* =========================
     RESET ALL
  ========================= */

  const resetAllPractice =
    useCallback(() => {
      setStorage(
        EMPTY_STORAGE
      );
    }, []);


  /* =========================
     OVERALL PROGRESS
  ========================= */

  const completedLessons =
    useMemo(
      () =>
        LEARNING_LESSONS.filter(
          (lesson) =>
            Boolean(
              storage
                .lessons[
                  String(
                    lesson.id
                  )
                ]
                ?.completed
            )
        ).length,

      [
        storage.lessons,
      ]
    );


  const overallPercent =
    Math.round(
      (
        completedLessons
        /
        LEARNING_LESSONS.length
      )
      *
      100
    );


  return {
    storage,

    getLessonProgress,

    registerResult,

    resetLesson,

    resetAllPractice,

    completedLessons,

    overallPercent,
  };
}


export default useLearningPractice;