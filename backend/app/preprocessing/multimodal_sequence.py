from collections import deque
import time

import numpy as np


# ============================================================
# CONFIG — SAME FEATURE LAYOUT AS TRAINING
# ============================================================

SEQ_LEN = 48

NUM_HAND_LANDMARKS = 21

HAND_FEATURES = 67
HAND_DIM = 134

POSE_COUNT = 9
POSE_DIM = 36

FACE_COUNT = 11
FACE_HEAD_DIM = 52

FEATURE_DIM = (
    HAND_DIM
    + POSE_DIM
    + FACE_HEAD_DIM
)

MAX_INTERP_GAP = 6
EDGE_FILL = 2
HAND_EMA_ALPHA = 0.65

POSE_ANCHOR_VIS_THRESHOLD = 0.25
POSE_FEATURE_VIS_THRESHOLD = 0.20
FACE_POINT_VIS_THRESHOLD = 0.20

LEFT = 0
RIGHT = 1


# ============================================================
# BASIC HELPERS
# ============================================================

def _point_confidence(point):
    if not isinstance(point, dict):
        return 0.0

    value = point.get(
        "confidence",
        point.get(
            "visibility",
            0.0,
        ),
    )

    try:
        return float(
            np.clip(
                float(value),
                0.0,
                1.0,
            )
        )
    except Exception:
        return 0.0


def _point_xyz(point):
    if not isinstance(point, dict):
        return None

    try:
        xyz = np.asarray(
            [
                float(point["x"]),
                float(point["y"]),
                float(
                    point.get(
                        "z",
                        0.0,
                    )
                ),
            ],
            dtype=np.float32,
        )
    except Exception:
        return None

    if not np.isfinite(
        xyz
    ).all():
        return None

    return xyz


# ============================================================
# HAND RAW
# ============================================================

def hand_points_to_array(
    points,
):
    output = np.full(
        (
            NUM_HAND_LANDMARKS,
            3,
        ),
        np.nan,
        dtype=np.float32,
    )

    if (
        not isinstance(points, list)
        or len(points)
        != NUM_HAND_LANDMARKS
    ):
        return output

    for index, point in enumerate(
        points
    ):
        xyz = _point_xyz(
            point
        )

        if xyz is None:
            return np.full(
                (
                    NUM_HAND_LANDMARKS,
                    3,
                ),
                np.nan,
                dtype=np.float32,
            )

        output[index] = xyz

    return output


# ============================================================
# POSE RAW
#
# order:
# 0 nose
# 1 left shoulder
# 2 right shoulder
# 3 left elbow
# 4 right elbow
# 5 left wrist
# 6 right wrist
# 7 left hip
# 8 right hip
# ============================================================

def extract_pose_raw(
    points,
):
    coords = np.full(
        (
            POSE_COUNT,
            3,
        ),
        np.nan,
        dtype=np.float32,
    )

    valid = np.zeros(
        POSE_COUNT,
        dtype=np.uint8,
    )

    visibility = np.zeros(
        POSE_COUNT,
        dtype=np.float32,
    )

    if not isinstance(
        points,
        list,
    ):
        return (
            coords,
            valid,
            visibility,
        )

    for index in range(
        min(
            len(points),
            POSE_COUNT,
        )
    ):
        point = points[index]

        confidence = (
            _point_confidence(
                point
            )
        )

        visibility[index] = (
            confidence
        )

        xyz = _point_xyz(
            point
        )

        if (
            xyz is not None
            and confidence
            >= POSE_FEATURE_VIS_THRESHOLD
        ):
            coords[index] = xyz
            valid[index] = 1

    return (
        coords,
        valid,
        visibility,
    )


# ============================================================
# BODY ANCHOR
# ============================================================

def get_body_anchor(
    pose_points,
):
    default_center = np.asarray(
        [
            0.5,
            0.5,
            0.0,
        ],
        dtype=np.float32,
    )

    default_scale = 0.35

    if (
        not isinstance(
            pose_points,
            list,
        )
        or len(pose_points) < 3
    ):
        return (
            default_center,
            default_scale,
            0,
        )

    left_shoulder = _point_xyz(
        pose_points[1]
    )

    right_shoulder = _point_xyz(
        pose_points[2]
    )

    left_conf = _point_confidence(
        pose_points[1]
    )

    right_conf = _point_confidence(
        pose_points[2]
    )

    if (
        left_shoulder is None
        or right_shoulder is None
        or left_conf
        < POSE_ANCHOR_VIS_THRESHOLD
        or right_conf
        < POSE_ANCHOR_VIS_THRESHOLD
    ):
        return (
            default_center,
            default_scale,
            0,
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

    return (
        body_center.astype(
            np.float32
        ),
        body_scale,
        1,
    )


# ============================================================
# FACE RAW
#
# 0 nose
# 1/2/3 left eye
# 4/5/6 right eye
# 7/8 ears
# 9/10 mouth
# ============================================================

def extract_face_raw(
    points,
):
    coords = np.full(
        (
            FACE_COUNT,
            3,
        ),
        np.nan,
        dtype=np.float32,
    )

    visibility = np.zeros(
        FACE_COUNT,
        dtype=np.float32,
    )

    valid = np.zeros(
        FACE_COUNT,
        dtype=np.uint8,
    )

    if not isinstance(
        points,
        list,
    ):
        return (
            coords,
            visibility,
            valid,
        )

    for index in range(
        min(
            len(points),
            FACE_COUNT,
        )
    ):
        point = points[index]

        confidence = (
            _point_confidence(
                point
            )
        )

        visibility[index] = (
            confidence
        )

        xyz = _point_xyz(
            point
        )

        if (
            xyz is not None
            and confidence
            >= FACE_POINT_VIS_THRESHOLD
        ):
            coords[index] = xyz
            valid[index] = 1

    return (
        coords,
        visibility,
        valid,
    )


# ============================================================
# POSE ANCHOR INTERPOLATION
# ============================================================

def fill_pose_anchors(
    centers,
    scales,
    valid,
):
    out_centers = (
        centers.copy()
    )

    out_scales = (
        scales.copy()
    )

    valid_idx = np.where(
        valid > 0.5
    )[0]

    if len(valid_idx) == 0:
        out_centers[:] = np.asarray(
            [
                0.5,
                0.5,
                0.0,
            ],
            dtype=np.float32,
        )

        out_scales[:] = 0.35

        return (
            out_centers,
            out_scales,
        )

    timeline = np.arange(
        len(valid)
    )

    for dim in range(3):
        out_centers[
            :,
            dim,
        ] = np.interp(
            timeline,
            valid_idx,
            centers[
                valid_idx,
                dim,
            ],
        )

    out_scales[:] = np.interp(
        timeline,
        valid_idx,
        scales[
            valid_idx
        ],
    )

    return (
        out_centers,
        out_scales,
    )


# ============================================================
# HAND GAP RECOVERY
# ============================================================

def interpolate_short_gaps_hand(
    track,
    max_gap=MAX_INTERP_GAP,
    edge_fill=EDGE_FILL,
):
    out = track.copy()

    valid = np.isfinite(
        out
    ).all(
        axis=(
            1,
            2,
        )
    )

    valid_idx = np.where(
        valid
    )[0]

    if len(valid_idx) == 0:
        return (
            out,
            valid.copy(),
        )

    for a, b in zip(
        valid_idx[:-1],
        valid_idx[1:],
    ):
        gap = (
            b - a - 1
        )

        if (
            gap <= 0
            or gap > max_gap
        ):
            continue

        start = out[a]
        end = out[b]

        for step in range(
            1,
            gap + 1,
        ):
            ratio = (
                step
                / (gap + 1)
            )

            out[
                a + step
            ] = (
                (1.0 - ratio)
                * start
                + ratio
                * end
            )

    first = int(
        valid_idx[0]
    )

    last = int(
        valid_idx[-1]
    )

    for index in range(
        max(
            0,
            first - edge_fill,
        ),
        first,
    ):
        out[index] = (
            out[first]
        )

    for index in range(
        last + 1,
        min(
            len(out),
            last
            + edge_fill
            + 1,
        ),
    ):
        out[index] = (
            out[last]
        )

    new_valid = np.isfinite(
        out
    ).all(
        axis=(
            1,
            2,
        )
    )

    return (
        out,
        new_valid,
    )


# ============================================================
# HAND EMA
# ============================================================

def ema_smooth_hand(
    track,
    valid_mask,
    alpha=HAND_EMA_ALPHA,
):
    out = track.copy()

    previous = None

    for index in range(
        len(out)
    ):
        if not valid_mask[index]:
            previous = None
            continue

        if previous is None:
            previous = (
                out[index].copy()
            )

        else:
            previous = (
                alpha
                * out[index]
                + (
                    1.0
                    - alpha
                )
                * previous
            )

            out[index] = (
                previous
            )

    return out


# ============================================================
# HAND67
# ============================================================

def hand_to_feature(
    hand_array,
    body_center,
    body_scale,
    valid,
):
    feature = np.zeros(
        HAND_FEATURES,
        dtype=np.float32,
    )

    if not valid:
        return feature

    wrist = (
        hand_array[0]
        .copy()
    )

    local = (
        hand_array
        - wrist
    )

    hand_scale = float(
        max(
            np.linalg.norm(
                hand_array[
                    9,
                    :2,
                ]
                - hand_array[
                    0,
                    :2,
                ]
            ),

            np.linalg.norm(
                hand_array[
                    5,
                    :2,
                ]
                - hand_array[
                    17,
                    :2,
                ]
            ),

            np.linalg.norm(
                hand_array[
                    12,
                    :2,
                ]
                - hand_array[
                    0,
                    :2,
                ]
            ),

            0.025,
        )
    )

    local = (
        local
        / hand_scale
    )

    wrist_global = (
        wrist
        - body_center
    ) / max(
        float(body_scale),
        0.08,
    )

    feature[:63] = (
        local.reshape(-1)
    )

    feature[
        63:66
    ] = wrist_global

    feature[66] = 1.0

    feature[:66] = np.clip(
        feature[:66],
        -10.0,
        10.0,
    )

    return feature


# ============================================================
# POSE36
# ============================================================

def pose_to_feature(
    pose_coords,
    pose_valid,
    pose_visibility,
    body_center,
    body_scale,
):
    feature = np.zeros(
        POSE_DIM,
        dtype=np.float32,
    )

    scale = max(
        float(body_scale),
        0.08,
    )

    for index in range(
        POSE_COUNT
    ):
        base = (
            index * 4
        )

        if (
            pose_valid[index] > 0
            and np.isfinite(
                pose_coords[index]
            ).all()
        ):
            local = (
                pose_coords[index]
                - body_center
            ) / scale

            feature[
                base:base + 3
            ] = np.clip(
                local,
                -10.0,
                10.0,
            )

            feature[
                base + 3
            ] = float(
                np.clip(
                    pose_visibility[
                        index
                    ],
                    0.0,
                    1.0,
                )
            )

    return feature


# ============================================================
# FACE HELPERS
# ============================================================

def safe_distance(
    coords,
    valid,
    a,
    b,
):
    if (
        valid[a] > 0
        and valid[b] > 0
        and np.isfinite(
            coords[a]
        ).all()
        and np.isfinite(
            coords[b]
        ).all()
    ):
        return float(
            np.linalg.norm(
                coords[
                    a,
                    :2,
                ]
                - coords[
                    b,
                    :2,
                ]
            )
        )

    return 0.0


# ============================================================
# FACEHEAD52
# ============================================================

def facehead_to_feature(
    coords,
    visibility,
    valid,
    body_center,
    body_scale,
):
    feature = np.zeros(
        FACE_HEAD_DIM,
        dtype=np.float32,
    )

    num_valid = int(
        valid.sum()
    )

    if num_valid < 3:
        return (
            feature,
            0,
        )

    # face center
    if (
        valid[2] > 0
        and valid[5] > 0
    ):
        face_center = (
            coords[2]
            + coords[5]
        ) / 2.0

    elif valid[0] > 0:
        face_center = (
            coords[0].copy()
        )

    else:
        face_center = np.mean(
            coords[
                valid > 0
            ],
            axis=0,
        )

    ear_distance = (
        safe_distance(
            coords,
            valid,
            7,
            8,
        )
    )

    eye_distance = (
        safe_distance(
            coords,
            valid,
            2,
            5,
        )
    )

    face_scale = max(
        ear_distance,
        eye_distance,
        float(body_scale)
        * 0.35,
        0.04,
    )

    # 11 × xyz = 33
    for index in range(
        FACE_COUNT
    ):
        if (
            valid[index] > 0
            and np.isfinite(
                coords[index]
            ).all()
        ):
            local = (
                coords[index]
                - face_center
            ) / face_scale

            start = (
                index * 3
            )

            feature[
                start:start + 3
            ] = np.clip(
                local,
                -6.0,
                6.0,
            )

    # 11 visibility
    feature[
        33:44
    ] = np.where(
        valid > 0,
        np.clip(
            visibility,
            0.0,
            1.0,
        ),
        0.0,
    ).astype(
        np.float32
    )

    mouth_width = (
        safe_distance(
            coords,
            valid,
            9,
            10,
        )
    )

    eye_sin = 0.0
    eye_cos = 0.0

    if (
        valid[2] > 0
        and valid[5] > 0
    ):
        delta = (
            coords[
                5,
                :2,
            ]
            - coords[
                2,
                :2,
            ]
        )

        norm = float(
            np.linalg.norm(
                delta
            )
        )

        if norm > 1e-6:
            eye_cos = float(
                delta[0]
                / norm
            )

            eye_sin = float(
                delta[1]
                / norm
            )

    nose_body_x = 0.0
    nose_body_y = 0.0

    if (
        valid[0] > 0
        and np.isfinite(
            coords[0]
        ).all()
    ):
        nose_body = (
            coords[0]
            - body_center
        ) / max(
            float(body_scale),
            0.08,
        )

        nose_body_x = float(
            np.clip(
                nose_body[0],
                -10.0,
                10.0,
            )
        )

        nose_body_y = float(
            np.clip(
                nose_body[1],
                -10.0,
                10.0,
            )
        )

    # 7 geometry/global
    feature[
        44:51
    ] = np.asarray(
        [
            eye_distance
            / face_scale,

            ear_distance
            / face_scale,

            mouth_width
            / face_scale,

            eye_sin,
            eye_cos,

            nose_body_x,
            nose_body_y,
        ],
        dtype=np.float32,
    )

    # presence
    feature[51] = 1.0

    return (
        feature,
        1,
    )


# ============================================================
# REALTIME SEQUENCE BUILDER
# ============================================================

class MultimodalSequenceBuilder:
    def __init__(
        self,
        sequence_length=SEQ_LEN,
    ):
        self.sequence_length = (
            int(sequence_length)
        )

        self.frames = deque(
            maxlen=self.sequence_length
        )

        self.last_frame_id = None

        self.latest_sequences = None


    # --------------------------------------------------------
    # RESET
    # --------------------------------------------------------

    def reset(self):
        self.frames.clear()

        self.last_frame_id = None

        self.latest_sequences = None


    # --------------------------------------------------------
    # FRAME RECORD
    # --------------------------------------------------------

    def _make_record(
        self,
        landmarks,
    ):
        landmarks = (
            landmarks
            if isinstance(
                landmarks,
                dict,
            )
            else {}
        )

        left_hand = (
            hand_points_to_array(
                landmarks.get(
                    "leftHand",
                    [],
                )
            )
        )

        right_hand = (
            hand_points_to_array(
                landmarks.get(
                    "rightHand",
                    [],
                )
            )
        )

        pose_points = (
            landmarks.get(
                "pose",
                [],
            )
        )

        (
            pose_coords,
            pose_valid,
            pose_visibility,
        ) = extract_pose_raw(
            pose_points
        )

        (
            body_center,
            body_scale,
            pose_frame_valid,
        ) = get_body_anchor(
            pose_points
        )

        (
            face_coords,
            face_visibility,
            face_valid,
        ) = extract_face_raw(
            landmarks.get(
                "face",
                [],
            )
        )

        return {
            "left_hand":
                left_hand,

            "right_hand":
                right_hand,

            "pose_coords":
                pose_coords,

            "pose_valid":
                pose_valid,

            "pose_visibility":
                pose_visibility,

            "body_center":
                body_center,

            "body_scale":
                body_scale,

            "pose_frame_valid":
                pose_frame_valid,

            "face_coords":
                face_coords,

            "face_visibility":
                face_visibility,

            "face_valid":
                face_valid,
        }


    # --------------------------------------------------------
    # ADD FRAME
    # --------------------------------------------------------

    def add_frame(
        self,
        frame_id,
        landmarks,
    ):
        frame_id = int(
            frame_id
        )

        # Camera restarted:
        # frame id kembali ke 1.
        if (
            self.last_frame_id
            is not None
            and frame_id
            <= self.last_frame_id
        ):
            self.reset()

        self.last_frame_id = (
            frame_id
        )

        self.frames.append(
            self._make_record(
                landmarks
            )
        )

        started_at = (
            time.perf_counter()
        )

        self.latest_sequences = (
            self.build_sequences()
        )

        preprocessing_ms = (
            (
                time.perf_counter()
                - started_at
            )
            * 1000.0
        )

        count = len(
            self.frames
        )

        ready = (
            count
            == self.sequence_length
        )

        sequences = (
            self.latest_sequences
        )

        return {
            "count":
                count,

            "target":
                self.sequence_length,

            "ready":
                ready,

            "preprocessing_ms":
                round(
                    preprocessing_ms,
                    3,
                ),

            "shapes": {
                "hand":
                    list(
                        sequences[
                            "hand"
                        ].shape
                    ),

                "pose":
                    list(
                        sequences[
                            "pose"
                        ].shape
                    ),

                "facehead":
                    list(
                        sequences[
                            "facehead"
                        ].shape
                    ),

                "multimodal":
                    list(
                        sequences[
                            "multimodal"
                        ].shape
                    ),
            },
        }


    # --------------------------------------------------------
    # BUILD
    # --------------------------------------------------------

    def build_sequences(self):
        records = list(
            self.frames
        )

        n = len(records)

        if n == 0:
            return {
                "hand":
                    np.zeros(
                        (
                            0,
                            HAND_DIM,
                        ),
                        dtype=np.float32,
                    ),

                "pose":
                    np.zeros(
                        (
                            0,
                            POSE_DIM,
                        ),
                        dtype=np.float32,
                    ),

                "facehead":
                    np.zeros(
                        (
                            0,
                            FACE_HEAD_DIM,
                        ),
                        dtype=np.float32,
                    ),

                "multimodal":
                    np.zeros(
                        (
                            0,
                            FEATURE_DIM,
                        ),
                        dtype=np.float32,
                    ),
            }

        # =========================
        # RAW ARRAYS
        # =========================

        hand_tracks = np.full(
            (
                n,
                2,
                NUM_HAND_LANDMARKS,
                3,
            ),
            np.nan,
            dtype=np.float32,
        )

        body_centers = np.zeros(
            (
                n,
                3,
            ),
            dtype=np.float32,
        )

        body_scales = np.full(
            n,
            0.35,
            dtype=np.float32,
        )

        pose_frame_valid = (
            np.zeros(
                n,
                dtype=np.uint8,
            )
        )

        pose_coords = np.full(
            (
                n,
                POSE_COUNT,
                3,
            ),
            np.nan,
            dtype=np.float32,
        )

        pose_valid = np.zeros(
            (
                n,
                POSE_COUNT,
            ),
            dtype=np.uint8,
        )

        pose_visibility = np.zeros(
            (
                n,
                POSE_COUNT,
            ),
            dtype=np.float32,
        )

        face_coords = np.full(
            (
                n,
                FACE_COUNT,
                3,
            ),
            np.nan,
            dtype=np.float32,
        )

        face_visibility = np.zeros(
            (
                n,
                FACE_COUNT,
            ),
            dtype=np.float32,
        )

        face_valid = np.zeros(
            (
                n,
                FACE_COUNT,
            ),
            dtype=np.uint8,
        )

        for index, record in enumerate(
            records
        ):
            hand_tracks[
                index,
                LEFT,
            ] = record[
                "left_hand"
            ]

            hand_tracks[
                index,
                RIGHT,
            ] = record[
                "right_hand"
            ]

            body_centers[index] = (
                record[
                    "body_center"
                ]
            )

            body_scales[index] = (
                record[
                    "body_scale"
                ]
            )

            pose_frame_valid[index] = (
                record[
                    "pose_frame_valid"
                ]
            )

            pose_coords[index] = (
                record[
                    "pose_coords"
                ]
            )

            pose_valid[index] = (
                record[
                    "pose_valid"
                ]
            )

            pose_visibility[index] = (
                record[
                    "pose_visibility"
                ]
            )

            face_coords[index] = (
                record[
                    "face_coords"
                ]
            )

            face_visibility[index] = (
                record[
                    "face_visibility"
                ]
            )

            face_valid[index] = (
                record[
                    "face_valid"
                ]
            )

        # =========================
        # BODY ANCHOR FILL
        # =========================

        (
            body_centers,
            body_scales,
        ) = fill_pose_anchors(
            body_centers,
            body_scales,
            pose_frame_valid,
        )

        # =========================
        # HAND GAP + EMA
        # =========================

        hand_final_valid = np.zeros(
            (
                n,
                2,
            ),
            dtype=np.uint8,
        )

        for side in [
            LEFT,
            RIGHT,
        ]:
            (
                track,
                valid_mask,
            ) = (
                interpolate_short_gaps_hand(
                    hand_tracks[
                        :,
                        side,
                    ]
                )
            )

            track = ema_smooth_hand(
                track,
                valid_mask,
            )

            hand_tracks[
                :,
                side,
            ] = track

            hand_final_valid[
                :,
                side,
            ] = (
                valid_mask.astype(
                    np.uint8
                )
            )

        # =========================
        # OUTPUT ARRAYS
        # =========================

        hand_sequence = np.zeros(
            (
                n,
                HAND_DIM,
            ),
            dtype=np.float32,
        )

        pose_sequence = np.zeros(
            (
                n,
                POSE_DIM,
            ),
            dtype=np.float32,
        )

        facehead_sequence = (
            np.zeros(
                (
                    n,
                    FACE_HEAD_DIM,
                ),
                dtype=np.float32,
            )
        )

        for index in range(n):
            left_feature = (
                hand_to_feature(
                    hand_tracks[
                        index,
                        LEFT,
                    ],
                    body_centers[index],
                    body_scales[index],
                    bool(
                        hand_final_valid[
                            index,
                            LEFT,
                        ]
                    ),
                )
            )

            right_feature = (
                hand_to_feature(
                    hand_tracks[
                        index,
                        RIGHT,
                    ],
                    body_centers[index],
                    body_scales[index],
                    bool(
                        hand_final_valid[
                            index,
                            RIGHT,
                        ]
                    ),
                )
            )

            hand_sequence[index] = (
                np.concatenate(
                    [
                        left_feature,
                        right_feature,
                    ]
                ).astype(
                    np.float32
                )
            )

            pose_sequence[index] = (
                pose_to_feature(
                    pose_coords[index],
                    pose_valid[index],
                    pose_visibility[
                        index
                    ],
                    body_centers[index],
                    body_scales[index],
                )
            )

            (
                face_feature,
                _,
            ) = facehead_to_feature(
                face_coords[index],
                face_visibility[index],
                face_valid[index],
                body_centers[index],
                body_scales[index],
            )

            facehead_sequence[
                index
            ] = face_feature

        multimodal = np.concatenate(
            [
                hand_sequence,
                pose_sequence,
                facehead_sequence,
            ],
            axis=1,
        ).astype(
            np.float32
        )

        # =========================
        # HARD CHECK
        # =========================

        expected = (
            n,
            FEATURE_DIM,
        )

        if (
            multimodal.shape
            != expected
        ):
            raise RuntimeError(
                (
                    "Bad multimodal shape: "
                    f"{multimodal.shape}"
                )
            )

        for name, array in [
            (
                "hand",
                hand_sequence,
            ),
            (
                "pose",
                pose_sequence,
            ),
            (
                "facehead",
                facehead_sequence,
            ),
            (
                "multimodal",
                multimodal,
            ),
        ]:
            if not np.isfinite(
                array
            ).all():
                raise RuntimeError(
                    (
                        f"{name} contains "
                        "NaN/Inf"
                    )
                )

        return {
            "hand":
                hand_sequence,

            "pose":
                pose_sequence,

            "facehead":
                facehead_sequence,

            "multimodal":
                multimodal,
        }


    # --------------------------------------------------------
    # FUTURE MODEL INPUT
    # --------------------------------------------------------

    def get_ready_sequences(self):
        if (
            len(self.frames)
            != self.sequence_length
            or self.latest_sequences
            is None
        ):
            return None

        return {
            key:
                value.copy()

            for key, value
            in self.latest_sequences.items()
        }