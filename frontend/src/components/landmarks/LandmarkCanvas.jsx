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
  /* =========================
     REFS
  ========================= */

  const canvasRef =
    useRef(null);


  /*
   * Landmark datang terus menerus
   * dari WebSocket.
   *
   * Kita simpan di ref agar
   * ResizeObserver dan listener video
   * tidak dibuat ulang setiap frame.
   */
  const landmarksRef =
    useRef(
      landmarks
    );


  const mirroredRef =
    useRef(
      mirrored
    );


  /*
   * Fungsi draw aktif akan
   * disimpan di sini agar effect
   * update landmark cukup meminta
   * redraw.
   */
  const requestDrawRef =
    useRef(
      () => {}
    );


  /* =========================
     UPDATE LANDMARK
  ========================= */

  useEffect(() => {
    landmarksRef.current =
      landmarks;


    requestDrawRef.current();

  }, [
    landmarks,
  ]);


  /* =========================
     UPDATE MIRROR
  ========================= */

  useEffect(() => {
    mirroredRef.current =
      mirrored;


    requestDrawRef.current();

  }, [
    mirrored,
  ]);


  /* =========================
     CANVAS ENGINE
  ========================= */

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


    /*
     * Video berada dalam container
     * camera-preview yang sama.
     *
     * Tidak perlu mengubah API
     * RecognitionPage.
     */
    const video =
      parent.querySelector(
        ".camera-video"
      )
      ??
      parent.querySelector(
        "video"
      );


    let animationFrameId =
      null;


    /* =========================
       VIDEO PROJECTION
    ========================= */

    const getVideoProjection = (
      displayWidth,
      displayHeight,
    ) => {
      /*
       * Source frame yang dikirim
       * ke backend mempertahankan
       * aspect ratio video asli.
       *
       * Karena landmark normalized
       * relatif terhadap frame tersebut,
       * video.videoWidth/videoHeight
       * bisa digunakan sebagai source.
       */
      const sourceWidth =
        Number(
          video?.videoWidth
          ?? 0
        );


      const sourceHeight =
        Number(
          video?.videoHeight
          ?? 0
        );


      /*
       * Metadata video belum siap.
       *
       * Fallback:
       * mapping normalized biasa.
       */
      if (
        sourceWidth <= 0
        ||
        sourceHeight <= 0
      ) {
        return {
          mode:
            "fallback",

          sourceWidth:
            displayWidth,

          sourceHeight:
            displayHeight,

          renderedWidth:
            displayWidth,

          renderedHeight:
            displayHeight,

          scale:
            1,

          offsetX:
            0,

          offsetY:
            0,
        };
      }


      /*
       * CSS camera-video saat ini:
       *
       * object-fit: cover;
       * object-position: center center;
       *
       * Browser memperbesar video
       * hingga seluruh container terisi.
       *
       * Sebagian sisi video bisa ter-crop.
       */
      const scale =
        Math.max(
          displayWidth
          /
          sourceWidth,

          displayHeight
          /
          sourceHeight,
        );


      const renderedWidth =
        sourceWidth
        *
        scale;


      const renderedHeight =
        sourceHeight
        *
        scale;


      /*
       * Karena object-position center,
       * crop dibagi rata kiri/kanan
       * atau atas/bawah.
       *
       * Nilai offset bisa negatif.
       */
      const offsetX =
        (
          displayWidth
          -
          renderedWidth
        )
        /
        2;


      const offsetY =
        (
          displayHeight
          -
          renderedHeight
        )
        /
        2;


      return {
        mode:
          "cover",

        sourceWidth,

        sourceHeight,

        renderedWidth,

        renderedHeight,

        scale,

        offsetX,

        offsetY,
      };
    };


    /* =========================
       NORMALIZED -> DISPLAY
    ========================= */

    const getDisplayPoint = (
      point,
      displayWidth,
      displayHeight,
      projection,
    ) => {
      if (!point) {
        return null;
      }


      const normalizedX =
        Number(
          point.x
        );


      const normalizedY =
        Number(
          point.y
        );


      if (
        !Number.isFinite(
          normalizedX
        )
        ||
        !Number.isFinite(
          normalizedY
        )
      ) {
        return null;
      }


      const confidence =
        Number(
          point.confidence
          ??
          point.visibility
          ??
          1
        );


      if (
        !Number.isFinite(
          confidence
        )
        ||
        confidence <= 0
      ) {
        return null;
      }


      /*
       * MediaPipe kadang menghasilkan
       * landmark sedikit di luar 0..1.
       *
       * Jangan langsung buang titik yang
       * hanya sedikit keluar frame.
       */
      if (
        normalizedX < -0.15
        ||
        normalizedX > 1.15
        ||
        normalizedY < -0.15
        ||
        normalizedY > 1.15
      ) {
        return null;
      }


      let displayX;
      let displayY;


      /* =====================
         FALLBACK
      ===================== */

      if (
        projection.mode ===
        "fallback"
      ) {
        displayX =
          normalizedX
          *
          displayWidth;


        displayY =
          normalizedY
          *
          displayHeight;
      }


      /* =====================
         OBJECT-FIT COVER
      ===================== */

      else {
        /*
         * normalized coordinate
         * ->
         * pixel source video
         */
        const sourceX =
          normalizedX
          *
          projection
            .sourceWidth;


        const sourceY =
          normalizedY
          *
          projection
            .sourceHeight;


        /*
         * pixel source
         * ->
         * rendered object-fit cover
         */
        displayX =
          projection.offsetX
          +
          (
            sourceX
            *
            projection.scale
          );


        displayY =
          projection.offsetY
          +
          (
            sourceY
            *
            projection.scale
          );
      }


      /*
       * Preview kamera di CSS:
       *
       * transform: scaleX(-1)
       *
       * Backend menerima frame ORIGINAL,
       * bukan mirror.
       *
       * Jadi overlay harus dibalik
       * setelah projection selesai.
       */
      if (
        mirroredRef.current
      ) {
        displayX =
          displayWidth
          -
          displayX;
      }


      return {
        x:
          displayX,

        y:
          displayY,

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
        !pointA
        ||
        !pointB
      ) {
        return;
      }


      if (
        pointA.confidence <
          0.15
        ||
        pointB.confidence <
          0.15
      ) {
        return;
      }


      /*
       * Shadow / outline
       * agar garis tetap terlihat
       * di background terang.
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
        "rgba(3, 7, 18, 0.88)";


      context.lineWidth =
        4;


      context.lineCap =
        "round";


      context.lineJoin =
        "round";


      context.stroke();


      /*
       * Garis utama.
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


      context.lineWidth =
        1.9;


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
      displayWidth,
      displayHeight,
      projection,
      color,
    ) => {
      if (
        !Array.isArray(
          points
        )
      ) {
        return;
      }


      HAND_CONNECTIONS.forEach(
        ([
          startIndex,
          endIndex,
        ]) => {
          const pointA =
            getDisplayPoint(
              points[
                startIndex
              ],

              displayWidth,

              displayHeight,

              projection,
            );


          const pointB =
            getDisplayPoint(
              points[
                endIndex
              ],

              displayWidth,

              displayHeight,

              projection,
            );


          drawHandLine(
            context,
            pointA,
            pointB,
            color,
          );
        }
      );
    };


    /* =========================
       POINT GROUP
    ========================= */

    const drawPointGroup = (
      context,
      points,
      displayWidth,
      displayHeight,
      projection,
      color,
      {
        radius = 3,
        minConfidence = 0.15,
      } = {},
    ) => {
      if (
        !Array.isArray(
          points
        )
      ) {
        return;
      }


      points.forEach(
        (point) => {
          const displayPoint =
            getDisplayPoint(
              point,

              displayWidth,

              displayHeight,

              projection,
            );


          if (!displayPoint) {
            return;
          }


          if (
            displayPoint
              .confidence
            <
            minConfidence
          ) {
            return;
          }


          /*
           * Titik yang sudah ter-crop
           * oleh object-fit cover
           * tidak perlu digambar.
           */
          if (
            displayPoint.x < 0
            ||
            displayPoint.x >
              displayWidth
            ||
            displayPoint.y < 0
            ||
            displayPoint.y >
              displayHeight
          ) {
            return;
          }


          /*
           * Outline.
           */
          context.beginPath();


          context.arc(
            displayPoint.x,
            displayPoint.y,
            radius + 1.2,
            0,
            Math.PI * 2,
          );


          context.fillStyle =
            "rgba(3, 7, 18, 0.82)";


          context.fill();


          /*
           * Main point.
           */
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
        }
      );
    };


    /* =========================
       DRAW BODY
    ========================= */

    const drawBodyPoints = (
      context,
      displayWidth,
      displayHeight,
      projection,
      currentLandmarks,
    ) => {
      /*
       * Backend pose compact:
       *
       * 0 nose
       * 1 left shoulder
       * 2 right shoulder
       * 3 left elbow
       * 4 right elbow
       * 5 left wrist
       * 6 right wrist
       * 7 left hip
       * 8 right hip
       *
       * Overlay hanya titik.
       */
      drawPointGroup(
        context,

        currentLandmarks.pose,

        displayWidth,

        displayHeight,

        projection,

        "#38bdf8",

        {
          radius:
            3,

          minConfidence:
            0.55,
        },
      );
    };


    /* =========================
       DRAW FACE
    ========================= */

    const drawFacePoints = (
      context,
      displayWidth,
      displayHeight,
      projection,
      currentLandmarks,
    ) => {
      drawPointGroup(
        context,

        currentLandmarks.face,

        displayWidth,

        displayHeight,

        projection,

        "#f8c95f",

        {
          radius:
            2.5,

          minConfidence:
            0.4,
        },
      );
    };


    /* =========================
       DRAW EVERYTHING
    ========================= */

    const drawLandmarks =
      () => {
        const context =
          canvas.getContext(
            "2d"
          );


        if (!context) {
          return;
        }


        const pixelRatio =
          window
            .devicePixelRatio
          ||
          1;


        /*
         * Canvas backing resolution
         * berbeda dari CSS size.
         */
        const displayWidth =
          canvas.width
          /
          pixelRatio;


        const displayHeight =
          canvas.height
          /
          pixelRatio;


        if (
          displayWidth <= 0
          ||
          displayHeight <= 0
        ) {
          return;
        }


        /*
         * Gunakan CSS coordinate
         * setelah transform DPR.
         */
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
          displayWidth,
          displayHeight,
        );


        const currentLandmarks =
          landmarksRef.current
          ??
          EMPTY_LANDMARKS;


        const projection =
          getVideoProjection(
            displayWidth,
            displayHeight,
          );


        /* =====================
           HAND SKELETON
        ===================== */

        drawHandSkeleton(
          context,

          currentLandmarks
            .leftHand,

          displayWidth,

          displayHeight,

          projection,

          "#4ade80",
        );


        drawHandSkeleton(
          context,

          currentLandmarks
            .rightHand,

          displayWidth,

          displayHeight,

          projection,

          "#e879f9",
        );


        /* =====================
           HAND POINTS
        ===================== */

        drawPointGroup(
          context,

          currentLandmarks
            .leftHand,

          displayWidth,

          displayHeight,

          projection,

          "#4ade80",

          {
            radius:
              3.2,

            minConfidence:
              0.15,
          },
        );


        drawPointGroup(
          context,

          currentLandmarks
            .rightHand,

          displayWidth,

          displayHeight,

          projection,

          "#e879f9",

          {
            radius:
              3.2,

            minConfidence:
              0.15,
          },
        );


        /* =====================
           BODY
        ===================== */

        drawBodyPoints(
          context,

          displayWidth,

          displayHeight,

          projection,

          currentLandmarks,
        );


        /* =====================
           FACE
        ===================== */

        drawFacePoints(
          context,

          displayWidth,

          displayHeight,

          projection,

          currentLandmarks,
        );
      };


    /* =========================
       DRAW SCHEDULER
    ========================= */

    const scheduleDraw =
      () => {
        if (
          animationFrameId !==
          null
        ) {
          cancelAnimationFrame(
            animationFrameId
          );
        }


        animationFrameId =
          requestAnimationFrame(
            () => {
              animationFrameId =
                null;


              drawLandmarks();
            }
          );
      };


    /*
     * Expose scheduler untuk
     * effect landmark di atas.
     */
    requestDrawRef.current =
      scheduleDraw;


    /* =========================
       RESIZE CANVAS
    ========================= */

    const resizeCanvas =
      () => {
        const rect =
          parent
            .getBoundingClientRect();


        const pixelRatio =
          window
            .devicePixelRatio
          ||
          1;


        const displayWidth =
          Math.max(
            1,

            Math.round(
              rect.width
            )
          );


        const displayHeight =
          Math.max(
            1,

            Math.round(
              rect.height
            )
          );


        const backingWidth =
          Math.round(
            displayWidth
            *
            pixelRatio
          );


        const backingHeight =
          Math.round(
            displayHeight
            *
            pixelRatio
          );


        if (
          canvas.width !==
          backingWidth
        ) {
          canvas.width =
            backingWidth;
        }


        if (
          canvas.height !==
          backingHeight
        ) {
          canvas.height =
            backingHeight;
        }


        canvas.style.width =
          `${displayWidth}px`;


        canvas.style.height =
          `${displayHeight}px`;


        scheduleDraw();
      };


    /* =========================
       RESIZE OBSERVER
    ========================= */

    const resizeObserver =
      new ResizeObserver(
        () => {
          resizeCanvas();
        }
      );


    resizeObserver.observe(
      parent
    );


    /* =========================
       VIDEO EVENTS
    ========================= */

    const handleVideoMetadata =
      () => {
        /*
         * videoWidth/videoHeight
         * baru valid setelah metadata
         * tersedia.
         */
        scheduleDraw();
      };


    const handleVideoResize =
      () => {
        scheduleDraw();
      };


    if (video) {
      video.addEventListener(
        "loadedmetadata",
        handleVideoMetadata
      );


      video.addEventListener(
        "resize",
        handleVideoResize
      );


      video.addEventListener(
        "playing",
        handleVideoMetadata
      );
    }


    /* =========================
       INITIAL
    ========================= */

    resizeCanvas();


    scheduleDraw();


    /* =========================
       CLEANUP
    ========================= */

    return () => {
      resizeObserver
        .disconnect();


      if (video) {
        video.removeEventListener(
          "loadedmetadata",
          handleVideoMetadata
        );


        video.removeEventListener(
          "resize",
          handleVideoResize
        );


        video.removeEventListener(
          "playing",
          handleVideoMetadata
        );
      }


      if (
        animationFrameId !==
        null
      ) {
        cancelAnimationFrame(
          animationFrameId
        );
      }


      requestDrawRef.current =
        () => {};
    };

  }, []);


  /* =========================
     VIEW
  ========================= */

  return (
    <canvas
      ref={canvasRef}
      className="landmark-canvas"
      aria-hidden="true"
    />
  );
}


export default LandmarkCanvas;