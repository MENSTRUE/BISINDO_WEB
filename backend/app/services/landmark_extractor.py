import time

import cv2
import mediapipe as mp
import numpy as np


# =========================
# POSE LANDMARK INDEX
# =========================

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


class LandmarkExtractor:
    def __init__(self):
        self.mp_hands = (
            mp.solutions.hands
        )

        self.mp_pose = (
            mp.solutions.pose
        )


        self.hands = (
            self.mp_hands.Hands(
                static_image_mode=False,

                max_num_hands=2,

                model_complexity=1,

                min_detection_confidence=0.5,

                min_tracking_confidence=0.5,
            )
        )


        self.pose = (
            self.mp_pose.Pose(
                static_image_mode=False,

                model_complexity=1,

                smooth_landmarks=True,

                enable_segmentation=False,

                min_detection_confidence=0.5,

                min_tracking_confidence=0.5,
            )
        )


    # =========================
    # DECODE JPEG
    # =========================

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


    # =========================
    # POINT FORMAT
    # =========================

    @staticmethod
    def hand_point(
        landmark,
        confidence=1.0,
    ):
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

            "visibility":
                visibility,

            "confidence":
                visibility,
        }


    # =========================
    # WRIST DISTANCE
    # =========================

    @staticmethod
    def distance_2d(
        point_a,
        point_b,
    ):
        dx = (
            float(point_a.x) -
            float(point_b.x)
        )

        dy = (
            float(point_a.y) -
            float(point_b.y)
        )

        return (
            dx * dx +
            dy * dy
        ) ** 0.5


    # =========================
    # FALLBACK HANDEDNESS
    # =========================

    @staticmethod
    def fallback_hand_side(
        handedness,
    ):
        """
        Frame dari browser dikirim RAW /
        tidak dimirror.

        MediaPipe Hands umumnya menganggap
        input selfie/mirrored untuk label
        handedness.

        Karena itu label fallback dibalik.
        """

        if not handedness:
            return None


        classification = (
            handedness
            .classification[0]
        )


        label = (
            classification.label
            .strip()
            .lower()
        )


        score = float(
            classification.score
        )


        if label == "left":
            return (
                "rightHand",
                score,
            )


        if label == "right":
            return (
                "leftHand",
                score,
            )


        return (
            None,
            score,
        )


    # =========================
    # ASSIGN HAND
    # =========================

    def assign_hand_side(
        self,
        hand_landmarks,
        handedness,
        pose_landmarks,
        used_sides,
    ):
        hand_wrist = (
            hand_landmarks
            .landmark[0]
        )


        # =========================
        # PREFER POSE WRIST
        # =========================

        if pose_landmarks:
            pose_points = (
                pose_landmarks
                .landmark
            )


            left_wrist = (
                pose_points[
                    LEFT_WRIST_INDEX
                ]
            )

            right_wrist = (
                pose_points[
                    RIGHT_WRIST_INDEX
                ]
            )


            left_valid = (
                getattr(
                    left_wrist,
                    "visibility",
                    0.0,
                ) >= 0.25
            )


            right_valid = (
                getattr(
                    right_wrist,
                    "visibility",
                    0.0,
                ) >= 0.25
            )


            candidates = []


            if (
                left_valid and
                "leftHand"
                not in used_sides
            ):
                candidates.append(
                    (
                        self.distance_2d(
                            hand_wrist,
                            left_wrist,
                        ),
                        "leftHand",
                    )
                )


            if (
                right_valid and
                "rightHand"
                not in used_sides
            ):
                candidates.append(
                    (
                        self.distance_2d(
                            hand_wrist,
                            right_wrist,
                        ),
                        "rightHand",
                    )
                )


            if candidates:
                candidates.sort(
                    key=lambda item:
                        item[0]
                )

                return (
                    candidates[0][1],
                    1.0,
                )


        # =========================
        # MEDIAPIPE FALLBACK
        # =========================

        (
            side,
            confidence,
        ) = self.fallback_hand_side(
            handedness
        )


        if (
            side and
            side not in used_sides
        ):
            return (
                side,
                confidence,
            )


        # =========================
        # FINAL FALLBACK
        # =========================

        if (
            "leftHand"
            not in used_sides
        ):
            return (
                "leftHand",
                confidence,
            )


        if (
            "rightHand"
            not in used_sides
        ):
            return (
                "rightHand",
                confidence,
            )


        return (
            None,
            confidence,
        )


    # =========================
    # EXTRACT
    # =========================

    def extract(
        self,
        frame_bytes: bytes,
    ):
        started_at = (
            time.perf_counter()
        )


        frame_bgr = (
            self.decode_frame(
                frame_bytes
            )
        )


        frame_rgb = (
            cv2.cvtColor(
                frame_bgr,
                cv2.COLOR_BGR2RGB,
            )
        )


        frame_rgb.flags.writeable = (
            False
        )


        # =========================
        # MEDIAPIPE
        # =========================

        pose_result = (
            self.pose.process(
                frame_rgb
            )
        )


        hands_result = (
            self.hands.process(
                frame_rgb
            )
        )


        frame_rgb.flags.writeable = (
            True
        )


        # =========================
        # OUTPUT
        # =========================

        output = {
            "leftHand": [],
            "rightHand": [],
            "pose": [],
            "face": [],
        }


        pose_landmarks = (
            pose_result
            .pose_landmarks
        )


        # =========================
        # BODY + FACE
        # =========================

        if pose_landmarks:
            pose_points = (
                pose_landmarks
                .landmark
            )


            for index in (
                BODY_LANDMARK_INDICES
            ):
                output["pose"].append(
                    self.pose_point(
                        pose_points[
                            index
                        ]
                    )
                )


            for index in (
                FACE_LANDMARK_INDICES
            ):
                output["face"].append(
                    self.pose_point(
                        pose_points[
                            index
                        ]
                    )
                )


        # =========================
        # HANDS
        # =========================

        detected_hands = (
            hands_result
            .multi_hand_landmarks
            or []
        )


        handedness_list = (
            hands_result
            .multi_handedness
            or []
        )


        used_sides = set()


        for index, hand in enumerate(
            detected_hands
        ):
            handedness = (
                handedness_list[index]
                if index <
                len(handedness_list)
                else None
            )


            (
                side,
                confidence,
            ) = self.assign_hand_side(
                hand,
                handedness,
                pose_landmarks,
                used_sides,
            )


            if not side:
                continue


            used_sides.add(
                side
            )


            output[side] = [
                self.hand_point(
                    landmark,
                    confidence,
                )

                for landmark
                in hand.landmark
            ]


        elapsed_ms = (
            (
                time.perf_counter() -
                started_at
            )
            * 1000.0
        )


        return {
            "landmarks":
                output,

            "counts": {
                "left_hand":
                    len(
                        output[
                            "leftHand"
                        ]
                    ),

                "right_hand":
                    len(
                        output[
                            "rightHand"
                        ]
                    ),

                "pose":
                    len(
                        output[
                            "pose"
                        ]
                    ),

                "face":
                    len(
                        output[
                            "face"
                        ]
                    ),
            },

            "processing_ms":
                round(
                    elapsed_ms,
                    2,
                ),
        }


    # =========================
    # CLOSE
    # =========================

    def close(self):
        try:
            self.hands.close()
        except Exception:
            pass


        try:
            self.pose.close()
        except Exception:
            pass