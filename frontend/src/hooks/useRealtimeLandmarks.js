import {
  useEffect,
  useState,
} from "react";

import {
  useRealtime,
} from "../contexts/RealtimeContext";


const EMPTY_LANDMARKS = {
  leftHand: [],
  rightHand: [],
  pose: [],
  face: [],
};


const EMPTY_COUNTS = {
  left_hand: 0,
  right_hand: 0,
  pose: 0,
  face: 0,
};


const EMPTY_SEQUENCE = {
  count: 0,
  target: 48,
  ready: false,
  preprocessingMs: null,

  shapes: {
    hand: [0, 134],
    pose: [0, 36],
    facehead: [0, 52],
    multimodal: [0, 222],
  },
};


const EMPTY_PREDICTION = {
  status: "idle",

  label: null,

  classId: null,

  confidence: 0,

  confidencePercent: 0,

  inferenceMs: null,

  handPresentFrames: 0,

  top3: [],
};


function useRealtimeLandmarks() {
  const {
    lastMessage,
    isConnected,
  } = useRealtime();


  const [
    landmarks,
    setLandmarks,
  ] = useState(
    EMPTY_LANDMARKS,
  );


  const [
    counts,
    setCounts,
  ] = useState(
    EMPTY_COUNTS,
  );


  const [
    processingMs,
    setProcessingMs,
  ] = useState(null);


  const [
    lastFrameId,
    setLastFrameId,
  ] = useState(null);


  const [
    sequence,
    setSequence,
  ] = useState(
    EMPTY_SEQUENCE,
  );


  const [
    prediction,
    setPrediction,
  ] = useState(
    EMPTY_PREDICTION,
  );


  /* =========================
     LANDMARK MESSAGE
  ========================= */

  useEffect(() => {
    if (
      lastMessage?.type !==
      "landmarks"
    ) {
      return;
    }


    /* =========================
       LANDMARKS
    ========================= */

    const nextLandmarks = {
      leftHand:
        Array.isArray(
          lastMessage
            .landmarks
            ?.leftHand
        )
          ? lastMessage
              .landmarks
              .leftHand
          : [],

      rightHand:
        Array.isArray(
          lastMessage
            .landmarks
            ?.rightHand
        )
          ? lastMessage
              .landmarks
              .rightHand
          : [],

      pose:
        Array.isArray(
          lastMessage
            .landmarks
            ?.pose
        )
          ? lastMessage
              .landmarks
              .pose
          : [],

      face:
        Array.isArray(
          lastMessage
            .landmarks
            ?.face
        )
          ? lastMessage
              .landmarks
              .face
          : [],
    };


    setLandmarks(
      nextLandmarks,
    );


    /* =========================
       COUNTS
    ========================= */

    setCounts({
      left_hand:
        Number(
          lastMessage
            .counts
            ?.left_hand ?? 0,
        ),

      right_hand:
        Number(
          lastMessage
            .counts
            ?.right_hand ?? 0,
        ),

      pose:
        Number(
          lastMessage
            .counts
            ?.pose ?? 0,
        ),

      face:
        Number(
          lastMessage
            .counts
            ?.face ?? 0,
        ),
    });


    /* =========================
       VISION
    ========================= */

    setProcessingMs(
      Number(
        lastMessage
          .processing_ms ?? 0,
      ),
    );


    setLastFrameId(
      Number(
        lastMessage
          .frame_id ?? 0,
      ),
    );


    /* =========================
       SEQUENCE
    ========================= */

    const nextSequence =
      lastMessage.sequence;


    if (nextSequence) {
      setSequence({
        count:
          Number(
            nextSequence
              .count ?? 0,
          ),

        target:
          Number(
            nextSequence
              .target ?? 48,
          ),

        ready:
          Boolean(
            nextSequence.ready
          ),

        preprocessingMs:
          Number(
            nextSequence
              .preprocessing_ms ?? 0,
          ),

        shapes: {
          hand:
            Array.isArray(
              nextSequence
                .shapes
                ?.hand
            )
              ? nextSequence
                  .shapes
                  .hand
              : [0, 134],

          pose:
            Array.isArray(
              nextSequence
                .shapes
                ?.pose
            )
              ? nextSequence
                  .shapes
                  .pose
              : [0, 36],

          facehead:
            Array.isArray(
              nextSequence
                .shapes
                ?.facehead
            )
              ? nextSequence
                  .shapes
                  .facehead
              : [0, 52],

          multimodal:
            Array.isArray(
              nextSequence
                .shapes
                ?.multimodal
            )
              ? nextSequence
                  .shapes
                  .multimodal
              : [0, 222],
        },
      });
    }


    /* =========================
       PREDICTION
    ========================= */

    const nextPrediction =
      lastMessage.prediction;


    if (nextPrediction) {
      setPrediction({
        status:
          nextPrediction
            .status ??
          "idle",

        label:
          nextPrediction
            .label ??
          null,

        classId:
          nextPrediction
            .class_id ??
          null,

        confidence:
          Number(
            nextPrediction
              .confidence ?? 0,
          ),

        confidencePercent:
          Number(
            nextPrediction
              .confidence_percent ??
            0,
          ),

        inferenceMs:
          nextPrediction
            .inference_ms === null
            ||
            nextPrediction
              .inference_ms ===
              undefined
              ? null
              : Number(
                  nextPrediction
                    .inference_ms
                ),

        handPresentFrames:
          Number(
            nextPrediction
              .hand_present_frames ??
            0,
          ),

        top3:
          Array.isArray(
            nextPrediction.top3
          )
            ? nextPrediction.top3
            : [],
      });
    }


    else if (
      !nextSequence?.ready
    ) {
      setPrediction(
        EMPTY_PREDICTION,
      );
    }

  }, [lastMessage]);


  /* =========================
     RESET
  ========================= */

  useEffect(() => {
    if (
      lastMessage?.type !==
      "sequence_reset"
    ) {
      return;
    }


    setSequence(
      EMPTY_SEQUENCE,
    );


    setPrediction(
      EMPTY_PREDICTION,
    );

  }, [lastMessage]);


  /* =========================
     DISCONNECTED
  ========================= */

  useEffect(() => {
    if (isConnected) {
      return;
    }


    setLandmarks(
      EMPTY_LANDMARKS,
    );


    setCounts(
      EMPTY_COUNTS,
    );


    setProcessingMs(null);

    setLastFrameId(null);


    setSequence(
      EMPTY_SEQUENCE,
    );


    setPrediction(
      EMPTY_PREDICTION,
    );

  }, [isConnected]);


  return {
    landmarks,
    counts,

    processingMs,
    lastFrameId,

    sequenceCount:
      sequence.count,

    sequenceTarget:
      sequence.target,

    sequenceReady:
      sequence.ready,

    sequencePreprocessingMs:
      sequence.preprocessingMs,

    sequenceShapes:
      sequence.shapes,

    predictionStatus:
      prediction.status,

    predictionLabel:
      prediction.label,

    predictionClassId:
      prediction.classId,

    predictionConfidence:
      prediction.confidence,

    predictionConfidencePercent:
      prediction.confidencePercent,

    predictionInferenceMs:
      prediction.inferenceMs,

    predictionHandPresentFrames:
      prediction.handPresentFrames,

    predictionTop3:
      prediction.top3,
  };
}


export default useRealtimeLandmarks;