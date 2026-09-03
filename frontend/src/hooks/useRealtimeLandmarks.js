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


  /* =========================
     RECEIVE LANDMARKS
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

  }, [lastMessage]);


  /* =========================
     RESET WHEN DISCONNECTED
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

  }, [isConnected]);


  return {
    landmarks,
    counts,
    processingMs,
    lastFrameId,
  };
}


export default useRealtimeLandmarks;