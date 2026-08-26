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

function LandmarkCanvas({
  landmarks = EMPTY_LANDMARKS,
  mirrored = true,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const parent = canvas.parentElement;

    if (!parent) {
      return undefined;
    }

    let animationFrameId = null;

    const resizeCanvas = () => {
      const rect =
        parent.getBoundingClientRect();

      const pixelRatio =
        window.devicePixelRatio || 1;

      const displayWidth = Math.max(
        1,
        Math.round(rect.width),
      );

      const displayHeight = Math.max(
        1,
        Math.round(rect.height),
      );

      canvas.width = Math.round(
        displayWidth * pixelRatio,
      );

      canvas.height = Math.round(
        displayHeight * pixelRatio,
      );

      canvas.style.width =
        `${displayWidth}px`;

      canvas.style.height =
        `${displayHeight}px`;

      drawLandmarks();
    };

    const drawPointGroup = (
      context,
      points,
      width,
      height,
      color,
      radius,
    ) => {
      if (!Array.isArray(points)) {
        return;
      }

      points.forEach((point) => {
        if (!point) {
          return;
        }

        const x = Number(point.x);
        const y = Number(point.y);

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y)
        ) {
          return;
        }

        const confidence =
          point.confidence ??
          point.visibility ??
          1;

        if (confidence <= 0) {
          return;
        }

        /*
         * Koordinat dari backend/model tetap asli.
         *
         * Karena preview video dimirror,
         * hanya koordinat DISPLAY yang dibalik.
         */
        const displayX = mirrored
          ? (1 - x) * width
          : x * width;

        const displayY =
          y * height;

        context.beginPath();

        context.arc(
          displayX,
          displayY,
          radius,
          0,
          Math.PI * 2,
        );

        context.fillStyle = color;
        context.fill();

        /*
         * Outline gelap supaya titik tetap
         * terlihat di background terang.
         */
        context.lineWidth = 1.5;

        context.strokeStyle =
          "rgba(5, 8, 12, 0.9)";

        context.stroke();
      });
    };

    const drawLandmarks = () => {
      const context =
        canvas.getContext("2d");

      if (!context) {
        return;
      }

      const pixelRatio =
        window.devicePixelRatio || 1;

      const width =
        canvas.width / pixelRatio;

      const height =
        canvas.height / pixelRatio;

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

      /*
       * Tidak ada skeleton line.
       * Hanya titik landmark.
       */

      drawPointGroup(
        context,
        landmarks.leftHand,
        width,
        height,
        "#63d98b",
        3.6,
      );

      drawPointGroup(
        context,
        landmarks.rightHand,
        width,
        height,
        "#d66fd6",
        3.6,
      );

      drawPointGroup(
        context,
        landmarks.pose,
        width,
        height,
        "#62c7e8",
        3.8,
      );

      drawPointGroup(
        context,
        landmarks.face,
        width,
        height,
        "#e7c866",
        3.2,
      );
    };

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

    const resizeObserver =
      new ResizeObserver(() => {
        resizeCanvas();
      });

    resizeObserver.observe(parent);

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
  }, [landmarks, mirrored]);

  return (
    <canvas
      ref={canvasRef}
      className="landmark-canvas"
      aria-hidden="true"
    />
  );
}

export default LandmarkCanvas;