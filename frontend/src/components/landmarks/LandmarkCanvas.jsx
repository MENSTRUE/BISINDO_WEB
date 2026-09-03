import {
  useEffect,
  useRef,
} from "react";


const EMPTY_LANDMARKS = {
  leftHand: [],
  rightHand: [],
  pose: [],
  face: [],
};


/* =========================
   HAND CONNECTIONS
========================= */

const HAND_CONNECTIONS = [
  // Thumb
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],

  // Index
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],

  // Middle
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],

  // Ring
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],

  // Pinky
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],

  // Palm
  [0, 17],
];


function LandmarkCanvas({
  landmarks = EMPTY_LANDMARKS,
  mirrored = true,
}) {
  const canvasRef =
    useRef(null);


  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return undefined;
    }


    const parent =
      canvas.parentElement;

    if (!parent) {
      return undefined;
    }


    let animationFrameId =
      null;


    /* =========================
       DISPLAY POINT
    ========================= */

    const getDisplayPoint = (
      point,
      width,
      height,
    ) => {
      if (!point) {
        return null;
      }


      const x =
        Number(point.x);

      const y =
        Number(point.y);


      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        return null;
      }


      const confidence =
        Number(
          point.confidence ??
          point.visibility ??
          1,
        );


      if (
        !Number.isFinite(confidence) ||
        confidence <= 0
      ) {
        return null;
      }


      /*
       * Abaikan titik yang terlalu jauh
       * di luar area kamera.
       */
      if (
        x < -0.08 ||
        x > 1.08 ||
        y < -0.08 ||
        y > 1.08
      ) {
        return null;
      }


      return {
        x:
          mirrored
            ? (1 - x) * width
            : x * width,

        y:
          y * height,

        confidence,
      };
    };


    /* =========================
       HAND LINE
    ========================= */

    const drawHandLine = (
      context,
      pointA,
      pointB,
      color,
    ) => {
      if (
        !pointA ||
        !pointB
      ) {
        return;
      }


      if (
        pointA.confidence < 0.15 ||
        pointB.confidence < 0.15
      ) {
        return;
      }


      /*
       * Outline gelap.
       */
      context.beginPath();

      context.moveTo(
        pointA.x,
        pointA.y,
      );

      context.lineTo(
        pointB.x,
        pointB.y,
      );

      context.strokeStyle =
        "rgba(4, 7, 10, 0.9)";

      context.lineWidth = 3.8;

      context.lineCap =
        "round";

      context.lineJoin =
        "round";

      context.stroke();


      /*
       * Garis tangan utama.
       */
      context.beginPath();

      context.moveTo(
        pointA.x,
        pointA.y,
      );

      context.lineTo(
        pointB.x,
        pointB.y,
      );

      context.strokeStyle =
        color;

      context.lineWidth = 1.8;

      context.lineCap =
        "round";

      context.lineJoin =
        "round";

      context.stroke();
    };


    /* =========================
       HAND SKELETON
    ========================= */

    const drawHandSkeleton = (
      context,
      points,
      width,
      height,
      color,
    ) => {
      if (!Array.isArray(points)) {
        return;
      }


      HAND_CONNECTIONS.forEach(
        ([startIndex, endIndex]) => {
          const pointA =
            getDisplayPoint(
              points[startIndex],
              width,
              height,
            );


          const pointB =
            getDisplayPoint(
              points[endIndex],
              width,
              height,
            );


          drawHandLine(
            context,
            pointA,
            pointB,
            color,
          );
        },
      );
    };


    /* =========================
       POINT GROUP
    ========================= */

    const drawPointGroup = (
      context,
      points,
      width,
      height,
      color,
      {
        radius = 3,
        minConfidence = 0.15,
      } = {},
    ) => {
      if (!Array.isArray(points)) {
        return;
      }


      points.forEach((point) => {
        const displayPoint =
          getDisplayPoint(
            point,
            width,
            height,
          );


        if (!displayPoint) {
          return;
        }


        if (
          displayPoint.confidence <
          minConfidence
        ) {
          return;
        }


        context.beginPath();

        context.arc(
          displayPoint.x,
          displayPoint.y,
          radius,
          0,
          Math.PI * 2,
        );


        context.fillStyle =
          color;

        context.fill();


        context.lineWidth =
          1.3;

        context.strokeStyle =
          "rgba(4, 7, 10, 0.9)";

        context.stroke();
      });
    };


    /* =========================
       BODY POINTS
    ========================= */

    const drawBodyPoints = (
      context,
      width,
      height,
    ) => {
      /*
       * Backend:
       *
       * 0 nose
       * 1 L shoulder
       * 2 R shoulder
       * 3 L elbow
       * 4 R elbow
       * 5 L wrist
       * 6 R wrist
       * 7 L hip
       * 8 R hip
       *
       * Semua tetap tersedia untuk model.
       * Overlay hanya titik.
       */
      drawPointGroup(
        context,
        landmarks.pose,
        width,
        height,
        "#62c7e8",
        {
          radius: 3.1,
          minConfidence: 0.55,
        },
      );
    };


    /* =========================
       FACE POINTS
    ========================= */

    const drawFacePoints = (
      context,
      width,
      height,
    ) => {
      drawPointGroup(
        context,
        landmarks.face,
        width,
        height,
        "#e7c866",
        {
          radius: 2.6,
          minConfidence: 0.4,
        },
      );
    };


    /* =========================
       DRAW EVERYTHING
    ========================= */

    const drawLandmarks = () => {
      const context =
        canvas.getContext("2d");


      if (!context) {
        return;
      }


      const pixelRatio =
        window.devicePixelRatio ||
        1;


      const width =
        canvas.width /
        pixelRatio;


      const height =
        canvas.height /
        pixelRatio;


      context.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0,
      );


      context.clearRect(
        0,
        0,
        width,
        height,
      );


      /* =========================
         HAND LINES
      ========================= */

      drawHandSkeleton(
        context,
        landmarks.leftHand,
        width,
        height,
        "#63d98b",
      );


      drawHandSkeleton(
        context,
        landmarks.rightHand,
        width,
        height,
        "#d66fd6",
      );


      /* =========================
         HAND POINTS
      ========================= */

      drawPointGroup(
        context,
        landmarks.leftHand,
        width,
        height,
        "#63d98b",
        {
          radius: 3.3,
          minConfidence: 0.15,
        },
      );


      drawPointGroup(
        context,
        landmarks.rightHand,
        width,
        height,
        "#d66fd6",
        {
          radius: 3.3,
          minConfidence: 0.15,
        },
      );


      /* =========================
         BODY = POINT ONLY
      ========================= */

      drawBodyPoints(
        context,
        width,
        height,
      );


      /* =========================
         FACE = POINT ONLY
      ========================= */

      drawFacePoints(
        context,
        width,
        height,
      );
    };


    /* =========================
       RESIZE
    ========================= */

    const resizeCanvas = () => {
      const rect =
        parent.getBoundingClientRect();


      const pixelRatio =
        window.devicePixelRatio ||
        1;


      const displayWidth =
        Math.max(
          1,
          Math.round(
            rect.width,
          ),
        );


      const displayHeight =
        Math.max(
          1,
          Math.round(
            rect.height,
          ),
        );


      canvas.width =
        Math.round(
          displayWidth *
          pixelRatio,
        );


      canvas.height =
        Math.round(
          displayHeight *
          pixelRatio,
        );


      canvas.style.width =
        `${displayWidth}px`;


      canvas.style.height =
        `${displayHeight}px`;


      drawLandmarks();
    };


    /* =========================
       DRAW SCHEDULE
    ========================= */

    const scheduleDraw = () => {
      if (animationFrameId) {
        cancelAnimationFrame(
          animationFrameId,
        );
      }


      animationFrameId =
        requestAnimationFrame(
          drawLandmarks,
        );
    };


    /* =========================
       RESIZE OBSERVER
    ========================= */

    const resizeObserver =
      new ResizeObserver(() => {
        resizeCanvas();
      });


    resizeObserver.observe(
      parent,
    );


    resizeCanvas();
    scheduleDraw();


    return () => {
      resizeObserver.disconnect();


      if (animationFrameId) {
        cancelAnimationFrame(
          animationFrameId,
        );
      }
    };

  }, [
    landmarks,
    mirrored,
  ]);


  return (
    <canvas
      ref={canvasRef}
      className="landmark-canvas"
      aria-hidden="true"
    />
  );
}


export default LandmarkCanvas;