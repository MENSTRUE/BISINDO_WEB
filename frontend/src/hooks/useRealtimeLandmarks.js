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

  }, [lastMessage]);


  /* =========================
     RESET MESSAGE
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
  };
}


export default useRealtimeLandmarks;