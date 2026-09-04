import time

import cv2
import mediapipe as mp
import numpy as np


# ============================================================
# POSE / FACE LANDMARK INDEX
# ============================================================

BODY_LANDMARK_INDICES = [
    0,   # nose
    11,  # left shoulder
    12,  # right shoulder
    13,  # left elbow
    14,  # right elbow
    15,  # left wrist
    16,  # right wrist
    23,  # left hip
    24,  # right hip
]

FACE_LANDMARK_INDICES = list(
    range(0, 11)
)

LEFT_WRIST_INDEX = 15
RIGHT_WRIST_INDEX = 16


# ============================================================
# VISION CONFIG — DISAMAKAN DENGAN BASELINE PYTHON LOKAL
# ============================================================

POSE_VIS_THRESHOLD = 0.25

FULL_HAND_DET_CONF = 0.30
FULL_HAND_TRACK_CONF = 0.30
RECOVERY_DET_CONF = 0.20
FALLBACK_HAND_DET_CONF = 0.15

DETECTOR_CLAHE_CLIP = 2.0
DETECTOR_DARK_CENTER_MEAN = 92.0
DETECTOR_LOW_P10 = 34.0


class LandmarkExtractor:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.mp_pose = mp.solutions.pose

        # ====================================================
        # PRIMARY HANDS
        # ====================================================

        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            model_complexity=0,
            min_detection_confidence=(
                FULL_HAND_DET_CONF
            ),
            min_tracking_confidence=(
                FULL_HAND_TRACK_CONF
            ),
        )

        # ====================================================
        # FULL-FRAME FALLBACK
        # ====================================================

        self.fallback_hands = (
            self.mp_hands.Hands(
                static_image_mode=True,
                max_num_hands=2,
                model_complexity=0,
                min_detection_confidence=(
                    FALLBACK_HAND_DET_CONF
                ),
            )
        )

        # ====================================================
        # ROI RECOVERY
        # ====================================================

        self.recovery_hands = (
            self.mp_hands.Hands(
                static_image_mode=True,
                max_num_hands=1,
                model_complexity=0,
                min_detection_confidence=(
                    RECOVERY_DET_CONF
                ),
            )
        )

        # ====================================================
        # POSE
        # ====================================================

        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=0,
            smooth_landmarks=True,
            enable_segmentation=False,
            min_detection_confidence=0.30,
            min_tracking_confidence=0.30,
        )

    # ========================================================
    # DECODE JPEG
    # ========================================================

    @staticmethod
    def decode_frame(
        frame_bytes: bytes,
    ):
        array = np.frombuffer(
            frame_bytes,
            dtype=np.uint8,
        )

        frame_bgr = cv2.imdecode(
            array,
            cv2.IMREAD_COLOR,
        )

        if frame_bgr is None:
            raise ValueError(
                "JPEG frame gagal didecode."
            )

        return frame_bgr

    # ========================================================
    # LOW-LIGHT / BACKLIGHT DETECTOR FRAME
    #
    # Display / geometry tidak diubah.
    # Enhancement hanya diberikan ke MediaPipe.
    # ========================================================

    @staticmethod
    def prepare_detector_frame(
        frame,
    ):
        gray = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2GRAY,
        )

        h, w = gray.shape[:2]

        cy0 = int(h * 0.18)
        cy1 = int(h * 0.88)
        cx0 = int(w * 0.18)
        cx1 = int(w * 0.82)

        center = gray[
            cy0:cy1,
            cx0:cx1,
        ]

        center_mean = float(
            center.mean()
            if center.size
            else gray.mean()
        )

        p10 = float(
            np.percentile(
                gray,
                10,
            )
        )

        p90 = float(
            np.percentile(
                gray,
                90,
            )
        )

        should_enhance = (
            center_mean
            < DETECTOR_DARK_CENTER_MEAN
            or p10
            < DETECTOR_LOW_P10
            or (
                p90 - p10
            ) > 155.0
        )

        if not should_enhance:
            return (
                frame,
                False,
                {
                    "center_mean": (
                        center_mean
                    ),
                    "p10": p10,
                    "p90": p90,
                    "enhanced": False,
                },
            )

        lab = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2LAB,
        )

        l_chan, a_chan, b_chan = (
            cv2.split(lab)
        )

        clahe = cv2.createCLAHE(
            clipLimit=(
                DETECTOR_CLAHE_CLIP
            ),
            tileGridSize=(8, 8),
        )

        l_chan = clahe.apply(
            l_chan
        )

        enhanced = cv2.cvtColor(
            cv2.merge(
                (
                    l_chan,
                    a_chan,
                    b_chan,
                )
            ),
            cv2.COLOR_LAB2BGR,
        )

        if center_mean < 70.0:
            gamma = 0.72

            lut = np.asarray(
                [
                    (
                        (i / 255.0)
                        ** gamma
                    )
                    * 255.0
                    for i in range(256)
                ],
                dtype=np.uint8,
            )

            enhanced = cv2.LUT(
                enhanced,
                lut,
            )

        return (
            enhanced,
            True,
            {
                "center_mean": (
                    center_mean
                ),
                "p10": p10,
                "p90": p90,
                "enhanced": True,
            },
        )

    # ========================================================
    # POINT FORMAT
    # ========================================================

    @staticmethod
    def hand_point(
        xyz,
        confidence=1.0,
    ):
        return {
            "x": float(xyz[0]),
            "y": float(xyz[1]),
            "z": float(xyz[2]),
            "confidence": float(
                confidence
            ),
        }

    @staticmethod
    def pose_point(
        landmark,
    ):
        visibility = float(
            getattr(
                landmark,
                "visibility",
                1.0,
            )
        )

        return {
            "x": float(
                landmark.x
            ),
            "y": float(
                landmark.y
            ),
            "z": float(
                landmark.z
            ),
            "visibility": visibility,
            "confidence": visibility,
        }

    @staticmethod
    def landmark_list_to_array(
        hand_landmarks,
    ):
        return np.asarray(
            [
                [
                    lm.x,
                    lm.y,
                    lm.z,
                ]
                for lm in (
                    hand_landmarks.landmark
                )
            ],
            dtype=np.float32,
        )

    @staticmethod
    def xy_distance(
        point_a,
        point_b,
    ):
        return float(
            np.linalg.norm(
                np.asarray(
                    point_a[:2],
                    dtype=np.float32,
                )
                - np.asarray(
                    point_b[:2],
                    dtype=np.float32,
                )
            )
        )

    # ========================================================
    # POSE ANCHOR
    # ========================================================

    @staticmethod
    def get_pose_anchor(
        pose_landmarks,
    ):
        body_center = np.asarray(
            [
                0.5,
                0.5,
                0.0,
            ],
            dtype=np.float32,
        )

        body_scale = 0.35

        left_wrist = None
        right_wrist = None

        if pose_landmarks is None:
            return (
                body_center,
                body_scale,
                left_wrist,
                right_wrist,
            )

        points = pose_landmarks.landmark

        left_shoulder = np.asarray(
            [
                points[11].x,
                points[11].y,
                points[11].z,
            ],
            dtype=np.float32,
        )

        right_shoulder = np.asarray(
            [
                points[12].x,
                points[12].y,
                points[12].z,
            ],
            dtype=np.float32,
        )

        body_center = (
            left_shoulder
            + right_shoulder
        ) / 2.0

        body_scale = float(
            max(
                np.linalg.norm(
                    left_shoulder[:2]
                    - right_shoulder[:2]
                ),
                0.08,
            )
        )

        if (
            points[
                LEFT_WRIST_INDEX
            ].visibility
            >= POSE_VIS_THRESHOLD
        ):
            left_wrist = np.asarray(
                [
                    points[
                        LEFT_WRIST_INDEX
                    ].x,
                    points[
                        LEFT_WRIST_INDEX
                    ].y,
                    points[
                        LEFT_WRIST_INDEX
                    ].z,
                ],
                dtype=np.float32,
            )

        if (
            points[
                RIGHT_WRIST_INDEX
            ].visibility
            >= POSE_VIS_THRESHOLD
        ):
            right_wrist = np.asarray(
                [
                    points[
                        RIGHT_WRIST_INDEX
                    ].x,
                    points[
                        RIGHT_WRIST_INDEX
                    ].y,
                    points[
                        RIGHT_WRIST_INDEX
                    ].z,
                ],
                dtype=np.float32,
            )

        return (
            body_center,
            body_scale,
            left_wrist,
            right_wrist,
        )

    # ========================================================
    # FULL HAND CANDIDATES
    # ========================================================

    def collect_hand_candidates(
        self,
        hands_result,
    ):
        candidates = []

        detected_hands = (
            hands_result.multi_hand_landmarks
            or []
        )

        handedness_list = (
            hands_result.multi_handedness
            or []
        )

        for index, landmarks in enumerate(
            detected_hands
        ):
            arr = (
                self.landmark_list_to_array(
                    landmarks
                )
            )

            handedness_label = None
            handedness_score = 0.0

            if index < len(
                handedness_list
            ):
                classification = (
                    handedness_list[
                        index
                    ].classification[0]
                )

                handedness_label = (
                    classification.label
                )

                handedness_score = float(
                    classification.score
                )

            candidates.append(
                {
                    "arr": arr,
                    "wrist": arr[0],
                    "handedness_label": (
                        handedness_label
                    ),
                    "handedness_score": (
                        handedness_score
                    ),
                }
            )

        return candidates

    # ========================================================
    # ANATOMICAL LEFT / RIGHT ASSIGNMENT
    # ========================================================

    def assign_candidates_to_sides(
        self,
        candidates,
        left_pose_wrist,
        right_pose_wrist,
    ):
        assigned = {
            "leftHand": None,
            "rightHand": None,
        }

        if len(candidates) == 0:
            return assigned

        anchors = {
            "leftHand": left_pose_wrist,
            "rightHand": right_pose_wrist,
        }

        # ====================================================
        # ONE HAND
        # ====================================================

        if len(candidates) == 1:
            candidate = candidates[0]
            costs = {}

            for side in (
                "leftHand",
                "rightHand",
            ):
                anchor = anchors[side]

                if anchor is not None:
                    costs[side] = (
                        self.xy_distance(
                            candidate[
                                "wrist"
                            ],
                            anchor,
                        )
                    )

            if costs:
                chosen_side = min(
                    costs,
                    key=costs.get,
                )

                assigned[
                    chosen_side
                ] = candidate["arr"]

                return assigned

            # Dataset / browser frame tidak dimirror.
            # MediaPipe handedness fallback dibalik.
            label = candidate.get(
                "handedness_label"
            )

            if label == "Left":
                assigned[
                    "rightHand"
                ] = candidate["arr"]

            elif label == "Right":
                assigned[
                    "leftHand"
                ] = candidate["arr"]

            else:
                assigned[
                    "leftHand"
                ] = candidate["arr"]

            return assigned

        # ====================================================
        # TWO HANDS
        # ====================================================

        candidates = candidates[:2]

        c0 = candidates[0]
        c1 = candidates[1]

        if (
            left_pose_wrist is not None
            and right_pose_wrist is not None
        ):
            cost_a = (
                self.xy_distance(
                    c0["wrist"],
                    left_pose_wrist,
                )
                + self.xy_distance(
                    c1["wrist"],
                    right_pose_wrist,
                )
            )

            cost_b = (
                self.xy_distance(
                    c0["wrist"],
                    right_pose_wrist,
                )
                + self.xy_distance(
                    c1["wrist"],
                    left_pose_wrist,
                )
            )

            if cost_a <= cost_b:
                assigned[
                    "leftHand"
                ] = c0["arr"]

                assigned[
                    "rightHand"
                ] = c1["arr"]

            else:
                assigned[
                    "leftHand"
                ] = c1["arr"]

                assigned[
                    "rightHand"
                ] = c0["arr"]

            return assigned

        # Fallback handedness.
        for candidate in candidates:
            label = candidate.get(
                "handedness_label"
            )

            if (
                label == "Left"
                and assigned[
                    "rightHand"
                ] is None
            ):
                assigned[
                    "rightHand"
                ] = candidate["arr"]

            elif (
                label == "Right"
                and assigned[
                    "leftHand"
                ] is None
            ):
                assigned[
                    "leftHand"
                ] = candidate["arr"]

        remaining = [
            item["arr"]
            for item in candidates
            if not any(
                np.array_equal(
                    item["arr"],
                    value,
                )
                for value in assigned.values()
                if value is not None
            )
        ]

        if (
            assigned["leftHand"] is None
            and remaining
        ):
            assigned[
                "leftHand"
            ] = remaining.pop(0)

        if (
            assigned["rightHand"] is None
            and remaining
        ):
            assigned[
                "rightHand"
            ] = remaining.pop(0)

        return assigned

    # ========================================================
    # ROI HAND RECOVERY
    # ========================================================

    @staticmethod
    def make_wrist_roi(
        frame,
        target_wrist,
        body_scale,
    ):
        if target_wrist is None:
            return None

        h, w = frame.shape[:2]

        cx = int(
            np.clip(
                target_wrist[0],
                0.0,
                1.0,
            )
            * w
        )

        cy = int(
            np.clip(
                target_wrist[1],
                0.0,
                1.0,
            )
            * h
        )

        shoulder_px = (
            body_scale
            * max(w, h)
        )

        half = int(
            np.clip(
                1.10 * shoulder_px,
                72,
                0.30 * max(w, h),
            )
        )

        x0 = max(
            0,
            cx - half,
        )

        y0 = max(
            0,
            cy - half,
        )

        x1 = min(
            w,
            cx + half,
        )

        y1 = min(
            h,
            cy + half,
        )

        if (
            x1 - x0 < 48
            or y1 - y0 < 48
        ):
            return None

        return (
            frame[y0:y1, x0:x1],
            x0,
            y0,
            x1,
            y1,
        )

    @staticmethod
    def map_crop_hand_to_full(
        crop_hand_landmarks,
        x0,
        y0,
        x1,
        y1,
        full_w,
        full_h,
    ):
        crop_w = x1 - x0
        crop_h = y1 - y0

        arr = np.zeros(
            (
                21,
                3,
            ),
            dtype=np.float32,
        )

        for index, landmark in enumerate(
            crop_hand_landmarks.landmark
        ):
            arr[index, 0] = (
                x0
                + landmark.x
                * crop_w
            ) / full_w

            arr[index, 1] = (
                y0
                + landmark.y
                * crop_h
            ) / full_h

            arr[index, 2] = (
                landmark.z
                * crop_w
                / full_w
            )

        return arr

    def recover_hand_from_roi(
        self,
        frame,
        target_wrist,
        body_scale,
    ):
        roi = self.make_wrist_roi(
            frame,
            target_wrist,
            body_scale,
        )

        if roi is None:
            return None

        (
            crop,
            x0,
            y0,
            x1,
            y1,
        ) = roi

        detector_crop, _, _ = (
            self.prepare_detector_frame(
                crop
            )
        )

        crop_rgb = cv2.cvtColor(
            detector_crop,
            cv2.COLOR_BGR2RGB,
        )

        result = self.recovery_hands.process(
            crop_rgb
        )

        hands = (
            result.multi_hand_landmarks
            or []
        )

        if not hands:
            return None

        full_h, full_w = frame.shape[:2]

        arrays = [
            self.map_crop_hand_to_full(
                hand,
                x0,
                y0,
                x1,
                y1,
                full_w,
                full_h,
            )
            for hand in hands
        ]

        return min(
            arrays,
            key=lambda arr:
                self.xy_distance(
                    arr[0],
                    target_wrist,
                ),
        )

    # ========================================================
    # ARRAY -> JSON POINTS
    # ========================================================

    def array_to_points(
        self,
        arr,
        confidence=1.0,
    ):
        if arr is None:
            return []

        return [
            self.hand_point(
                arr[index],
                confidence,
            )
            for index in range(
                len(arr)
            )
        ]

    # ========================================================
    # EXTRACT
    # ========================================================

    def extract(
        self,
        frame_bytes: bytes,
    ):
        started_at = (
            time.perf_counter()
        )

        frame_bgr = self.decode_frame(
            frame_bytes
        )

        detector_frame, enhanced_used, light_stats = (
            self.prepare_detector_frame(
                frame_bgr
            )
        )

        frame_rgb = cv2.cvtColor(
            detector_frame,
            cv2.COLOR_BGR2RGB,
        )

        frame_rgb.flags.writeable = False

        pose_result = self.pose.process(
            frame_rgb
        )

        hands_result = self.hands.process(
            frame_rgb
        )

        frame_rgb.flags.writeable = True

        pose_landmarks = (
            pose_result.pose_landmarks
        )

        (
            _,
            body_scale,
            left_pose_wrist,
            right_pose_wrist,
        ) = self.get_pose_anchor(
            pose_landmarks
        )

        candidates = self.collect_hand_candidates(
            hands_result
        )

        fallback_used = False

        # Full-frame fallback bila primary detector gagal total.
        if not candidates:
            fallback_result = (
                self.fallback_hands.process(
                    frame_rgb
                )
            )

            fallback_candidates = (
                self.collect_hand_candidates(
                    fallback_result
                )
            )

            if fallback_candidates:
                candidates = fallback_candidates
                fallback_used = True

        assigned = self.assign_candidates_to_sides(
            candidates,
            left_pose_wrist,
            right_pose_wrist,
        )

        # ROI recovery seperti native Python.
        if (
            assigned["leftHand"] is None
            and left_pose_wrist is not None
        ):
            assigned[
                "leftHand"
            ] = self.recover_hand_from_roi(
                frame_bgr,
                left_pose_wrist,
                body_scale,
            )

        if (
            assigned["rightHand"] is None
            and right_pose_wrist is not None
        ):
            assigned[
                "rightHand"
            ] = self.recover_hand_from_roi(
                frame_bgr,
                right_pose_wrist,
                body_scale,
            )

        output = {
            "leftHand": self.array_to_points(
                assigned[
                    "leftHand"
                ]
            ),
            "rightHand": self.array_to_points(
                assigned[
                    "rightHand"
                ]
            ),
            "pose": [],
            "face": [],
        }

        if pose_landmarks:
            pose_points = (
                pose_landmarks.landmark
            )

            output["pose"] = [
                self.pose_point(
                    pose_points[index]
                )
                for index in (
                    BODY_LANDMARK_INDICES
                )
            ]

            output["face"] = [
                self.pose_point(
                    pose_points[index]
                )
                for index in (
                    FACE_LANDMARK_INDICES
                )
            ]

        elapsed_ms = (
            (
                time.perf_counter()
                - started_at
            )
            * 1000.0
        )

        return {
            "landmarks": output,
            "counts": {
                "left_hand": len(
                    output["leftHand"]
                ),
                "right_hand": len(
                    output["rightHand"]
                ),
                "pose": len(
                    output["pose"]
                ),
                "face": len(
                    output["face"]
                ),
            },
            "vision": {
                "enhanced": bool(
                    enhanced_used
                ),
                "fallback_used": bool(
                    fallback_used
                ),
                "center_mean": round(
                    float(
                        light_stats.get(
                            "center_mean",
                            0.0,
                        )
                    ),
                    2,
                ),
            },
            "processing_ms": round(
                elapsed_ms,
                2,
            ),
        }

    # ========================================================
    # CLOSE
    # ========================================================

    def close(self):
        for service in (
            self.hands,
            self.fallback_hands,
            self.recovery_hands,
            self.pose,
        ):
            try:
                service.close()
            except Exception:
                pass
