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


const EMPTY_SEGMENT = {
  status: "waiting",
  reason: "waiting_for_gesture",

  segmentId: null,

  sourceFrames: 0,
  preRollFrames: 0,

  motionScore: 0,
  motionEma: 0,
  peakMotion: 0,

  startCounter: 0,
  stillFrames: 0,
  noHandFrames: 0,
  rearmStillFrames: 0,

  resultEvent: false,

  thresholds: {
    startMotion: 0.010,
    endMotion: 0.0045,

    startConsecutiveFrames: 2,
    endStillFrames: 6,

    preRollFrames: 5,
    postRollFrames: 3,

    minSegmentFrames: 12,
    maxSegmentFrames: 60,

    rearmMotion: 0.0055,
    rearmStillFrames: 4,
  },
};


const EMPTY_PREDICTION = {
  status: "idle",

  rawStatus: "idle",

  accepted: false,

  resultEvent: false,
  acceptedEvent: false,

  classId: null,
  label: null,

  confidence: 0,
  confidencePercent: 0,

  margin: 0,
  marginPercent: 0,

  top3: [],

  handPresentFrames: 0,

  inferenceMs: null,

  segmentId: null,

  sourceFrames: 0,
  sampledFrames: 48,
  uniqueSampledFrames: 0,

  sequenceBuildMs: 0,

  endReason: null,

  peakMotion: 0,

  thresholds: {
    minConfidencePercent: 70,
    minMarginPercent: 10,
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
    pipelineMs,
    setPipelineMs,
  ] = useState(null);


  const [
    lastFrameId,
    setLastFrameId,
  ] = useState(null);


  const [
    segment,
    setSegment,
  ] = useState(
    EMPTY_SEGMENT,
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

    setLandmarks({
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
    });


    /* =========================
       COUNTS
    ========================= */

    setCounts({
      left_hand:
        Number(
          lastMessage
            .counts
            ?.left_hand ?? 0
        ),

      right_hand:
        Number(
          lastMessage
            .counts
            ?.right_hand ?? 0
        ),

      pose:
        Number(
          lastMessage
            .counts
            ?.pose ?? 0
        ),

      face:
        Number(
          lastMessage
            .counts
            ?.face ?? 0
        ),
    });


    /* =========================
       PERFORMANCE
    ========================= */

    setProcessingMs(
      Number(
        lastMessage
          .processing_ms ?? 0
      )
    );


    setPipelineMs(
      Number(
        lastMessage
          .pipeline_ms ?? 0
      )
    );


    setLastFrameId(
      Number(
        lastMessage
          .frame_id ?? 0
      )
    );


    /* =========================
       SEGMENT
    ========================= */

    const nextSegment =
      lastMessage.segment;


    if (nextSegment) {
      setSegment({
        status:
          nextSegment
            .status ??
          "waiting",

        reason:
          nextSegment
            .reason ??
          "waiting_for_gesture",

        segmentId:
          nextSegment
            .segment_id ??
          null,

        sourceFrames:
          Number(
            nextSegment
              .source_frames ?? 0
          ),

        preRollFrames:
          Number(
            nextSegment
              .pre_roll_frames ?? 0
          ),

        motionScore:
          Number(
            nextSegment
              .motion_score ?? 0
          ),

        motionEma:
          Number(
            nextSegment
              .motion_ema ?? 0
          ),

        peakMotion:
          Number(
            nextSegment
              .peak_motion ?? 0
          ),

        startCounter:
          Number(
            nextSegment
              .start_counter ?? 0
          ),

        stillFrames:
          Number(
            nextSegment
              .still_frames ?? 0
          ),

        noHandFrames:
          Number(
            nextSegment
              .no_hand_frames ?? 0
          ),

        rearmStillFrames:
          Number(
            nextSegment
              .rearm_still_frames ?? 0
          ),

        resultEvent:
          Boolean(
            nextSegment
              .result_event
          ),

        thresholds: {
          startMotion:
            Number(
              nextSegment
                .thresholds
                ?.start_motion ??
              0.010
            ),

          endMotion:
            Number(
              nextSegment
                .thresholds
                ?.end_motion ??
              0.0045
            ),

          startConsecutiveFrames:
            Number(
              nextSegment
                .thresholds
                ?.start_consecutive_frames ??
              2
            ),

          endStillFrames:
            Number(
              nextSegment
                .thresholds
                ?.end_still_frames ??
              6
            ),

          preRollFrames:
            Number(
              nextSegment
                .thresholds
                ?.pre_roll_frames ??
              5
            ),

          postRollFrames:
            Number(
              nextSegment
                .thresholds
                ?.post_roll_frames ??
              3
            ),

          minSegmentFrames:
            Number(
              nextSegment
                .thresholds
                ?.min_segment_frames ??
              12
            ),

          maxSegmentFrames:
            Number(
              nextSegment
                .thresholds
                ?.max_segment_frames ??
              60
            ),

          rearmMotion:
            Number(
              nextSegment
                .thresholds
                ?.rearm_motion ??
              0.0055
            ),

          rearmStillFrames:
            Number(
              nextSegment
                .thresholds
                ?.rearm_still_frames ??
              4
            ),
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

        rawStatus:
          nextPrediction
            .raw_status ??
          "idle",

        accepted:
          Boolean(
            nextPrediction
              .accepted
          ),

        resultEvent:
          Boolean(
            nextPrediction
              .result_event
          ),

        acceptedEvent:
          Boolean(
            nextPrediction
              .accepted_event
          ),

        classId:
          nextPrediction
            .class_id ??
          null,

        label:
          nextPrediction
            .label ??
          null,

        confidence:
          Number(
            nextPrediction
              .confidence ?? 0
          ),

        confidencePercent:
          Number(
            nextPrediction
              .confidence_percent ?? 0
          ),

        margin:
          Number(
            nextPrediction
              .margin ?? 0
          ),

        marginPercent:
          Number(
            nextPrediction
              .margin_percent ?? 0
          ),

        top3:
          Array.isArray(
            nextPrediction.top3
          )
            ? nextPrediction.top3
            : [],

        handPresentFrames:
          Number(
            nextPrediction
              .hand_present_frames ?? 0
          ),

        inferenceMs:
          nextPrediction
            .inference_ms === null ||
          nextPrediction
            .inference_ms === undefined
            ? null
            : Number(
                nextPrediction
                  .inference_ms
              ),

        segmentId:
          nextPrediction
            .segment_id ??
          null,

        sourceFrames:
          Number(
            nextPrediction
              .source_frames ?? 0
          ),

        sampledFrames:
          Number(
            nextPrediction
              .sampled_frames ?? 48
          ),

        uniqueSampledFrames:
          Number(
            nextPrediction
              .unique_sampled_frames ?? 0
          ),

        sequenceBuildMs:
          Number(
            nextPrediction
              .sequence_build_ms ?? 0
          ),

        endReason:
          nextPrediction
            .end_reason ??
          null,

        peakMotion:
          Number(
            nextPrediction
              .peak_motion ?? 0
          ),

        thresholds: {
          minConfidencePercent:
            Number(
              nextPrediction
                .thresholds
                ?.min_confidence_percent ??
              70
            ),

          minMarginPercent:
            Number(
              nextPrediction
                .thresholds
                ?.min_margin_percent ??
              10
            ),
        },
      });
    }

    else {
      setPrediction(
        EMPTY_PREDICTION,
      );
    }

  }, [
    lastMessage,
  ]);


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


    setSegment(
      EMPTY_SEGMENT,
    );


    setPrediction(
      EMPTY_PREDICTION,
    );

  }, [
    lastMessage,
  ]);


  /* =========================
     DISCONNECT
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

    setPipelineMs(null);

    setLastFrameId(null);


    setSegment(
      EMPTY_SEGMENT,
    );


    setPrediction(
      EMPTY_PREDICTION,
    );

  }, [
    isConnected,
  ]);


  return {
    landmarks,
    counts,

    processingMs,
    pipelineMs,
    lastFrameId,


    /* =====================
       SEGMENT
    ===================== */

    segmentStatus:
      segment.status,

    segmentReason:
      segment.reason,

    segmentId:
      segment.segmentId,

    segmentSourceFrames:
      segment.sourceFrames,

    segmentPreRollFrames:
      segment.preRollFrames,

    segmentMotionScore:
      segment.motionScore,

    segmentMotionEma:
      segment.motionEma,

    segmentPeakMotion:
      segment.peakMotion,

    segmentStartCounter:
      segment.startCounter,

    segmentStillFrames:
      segment.stillFrames,

    segmentNoHandFrames:
      segment.noHandFrames,

    segmentRearmStillFrames:
      segment.rearmStillFrames,

    segmentResultEvent:
      segment.resultEvent,

    segmentThresholds:
      segment.thresholds,


    /* =====================
       PREDICTION
    ===================== */

    predictionStatus:
      prediction.status,

    predictionRawStatus:
      prediction.rawStatus,

    predictionAccepted:
      prediction.accepted,

    predictionResultEvent:
      prediction.resultEvent,

    predictionAcceptedEvent:
      prediction.acceptedEvent,

    predictionClassId:
      prediction.classId,

    predictionLabel:
      prediction.label,

    predictionConfidence:
      prediction.confidence,

    predictionConfidencePercent:
      prediction.confidencePercent,

    predictionMargin:
      prediction.margin,

    predictionMarginPercent:
      prediction.marginPercent,

    predictionTop3:
      prediction.top3,

    predictionHandPresentFrames:
      prediction.handPresentFrames,

    predictionInferenceMs:
      prediction.inferenceMs,

    predictionSegmentId:
      prediction.segmentId,

    predictionSourceFrames:
      prediction.sourceFrames,

    predictionSampledFrames:
      prediction.sampledFrames,

    predictionUniqueSampledFrames:
      prediction.uniqueSampledFrames,

    predictionSequenceBuildMs:
      prediction.sequenceBuildMs,

    predictionEndReason:
      prediction.endReason,

    predictionPeakMotion:
      prediction.peakMotion,

    predictionThresholds:
      prediction.thresholds,
  };
}


export default useRealtimeLandmarks;