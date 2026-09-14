import time
from collections import deque

import numpy as np

from app.preprocessing.multimodal_sequence import (
    FACE_HEAD_DIM,
    FEATURE_DIM,
    HAND_DIM,
    POSE_DIM,
    SEQ_LEN,
    MultimodalSequenceBuilder,
)


class RealtimeSequenceBuilder(MultimodalSequenceBuilder):
    """Realtime builder supporting legacy 48-frame and V3.2 fixed-time mode."""

    def __init__(
        self,
        sequence_length=SEQ_LEN,
        window_seconds=None,
        max_interp_gap=6,
        edge_fill=2,
    ):
        super().__init__(
            sequence_length=sequence_length,
            max_interp_gap=max_interp_gap,
            edge_fill=edge_fill,
        )
        self.window_seconds = float(window_seconds) if window_seconds else None
        self.source_frames = deque(maxlen=512)
        self.last_timestamp_sec = None
        self.last_record_ms = 0.0
        self.last_build_ms = 0.0
        self.total_builds = 0
        self.last_source_count = 0
        self.last_coverage_sec = 0.0

    @property
    def time_aware(self):
        return self.window_seconds is not None and self.window_seconds > 0

    def reset(self):
        super().reset()
        if hasattr(self, "source_frames"):
            self.source_frames.clear()
        self.last_timestamp_sec = None
        self.last_record_ms = 0.0
        self.last_build_ms = 0.0
        self.total_builds = 0
        self.last_source_count = 0
        self.last_coverage_sec = 0.0

    def _normalize_timestamp(self, timestamp_sec):
        if timestamp_sec is None:
            ts = time.monotonic()
        else:
            try:
                ts = float(timestamp_sec)
            except Exception:
                ts = time.monotonic()
        if not np.isfinite(ts):
            ts = time.monotonic()
        return ts

    def _prune_time_buffer(self):
        if not self.time_aware or not self.source_frames:
            return
        newest = self.source_frames[-1][0]
        keep_after = newest - max(self.window_seconds + 0.75, self.window_seconds * 1.5)
        while len(self.source_frames) > 2 and self.source_frames[0][0] < keep_after:
            self.source_frames.popleft()

    def _coverage(self):
        if len(self.source_frames) < 2:
            return 0.0
        return max(0.0, float(self.source_frames[-1][0] - self.source_frames[0][0]))

    def add_frame(self, frame_id, landmarks, timestamp_sec=None):
        frame_id = int(frame_id)
        ts = self._normalize_timestamp(timestamp_sec)

        if self.last_frame_id is not None and frame_id <= self.last_frame_id:
            self.reset()

        if self.time_aware and self.last_timestamp_sec is not None and ts <= self.last_timestamp_sec:
            # Client timestamp can restart with the camera. Reset temporal state.
            self.reset()

        started = time.perf_counter()
        record = self._make_record(landmarks)

        if self.time_aware:
            self.source_frames.append((ts, record))
            self._prune_time_buffer()
            coverage = self._coverage()
            ready = coverage >= self.window_seconds and len(self.source_frames) >= 2
            progress = min(1.0, coverage / max(self.window_seconds, 1e-6))
            count = self.sequence_length if ready else int(round(progress * self.sequence_length))
            source_count = len(self.source_frames)
            self.last_coverage_sec = coverage
        else:
            self.frames.append(record)
            count = len(self.frames)
            source_count = count
            ready = count == self.sequence_length
            coverage = 0.0

        self.last_frame_id = frame_id
        self.last_timestamp_sec = ts
        self.latest_sequences = None
        self.last_record_ms = (time.perf_counter() - started) * 1000.0
        self.last_build_ms = 0.0
        self.last_source_count = source_count

        return {
            "count": int(count),
            "source_count": int(source_count),
            "target": self.sequence_length,
            "ready": bool(ready),
            "time_aware": bool(self.time_aware),
            "window_seconds": self.window_seconds,
            "coverage_seconds": round(float(coverage), 4),
            "preprocessing_ms": round(self.last_record_ms, 3),
            "sequence_build_ms": 0.0,
            "shapes": {
                "hand": [count, HAND_DIM],
                "pose": [count, POSE_DIM],
                "facehead": [count, FACE_HEAD_DIM],
                "multimodal": [count, FEATURE_DIM],
            },
        }

    def _resample_time_window(self):
        if not self.time_aware or len(self.source_frames) < 2:
            return None
        newest = float(self.source_frames[-1][0])
        start = newest - self.window_seconds
        if float(self.source_frames[0][0]) > start:
            return None

        times = np.asarray([item[0] for item in self.source_frames], dtype=np.float64)
        records = [item[1] for item in self.source_frames]
        target = np.linspace(start, newest, self.sequence_length, endpoint=True)

        # Nearest source record to each fixed temporal sample.
        pos = np.searchsorted(times, target, side="left")
        pos = np.clip(pos, 0, len(times)-1)
        left = np.clip(pos-1, 0, len(times)-1)
        choose_left = np.abs(times[left]-target) <= np.abs(times[pos]-target)
        indices = np.where(choose_left, left, pos)
        return [records[int(i)] for i in indices]

    def get_ready_sequences(self):
        if self.time_aware:
            sampled = self._resample_time_window()
            if sampled is None:
                return None
            original_frames = self.frames
            try:
                self.frames = deque(sampled, maxlen=self.sequence_length)
                started = time.perf_counter()
                sequences = super().build_sequences()
            finally:
                self.frames = original_frames
        else:
            if len(self.frames) != self.sequence_length:
                return None
            started = time.perf_counter()
            sequences = super().build_sequences()

        self.last_build_ms = (time.perf_counter() - started) * 1000.0
        self.total_builds += 1
        self.latest_sequences = sequences
        return {key: value.copy() for key, value in sequences.items()}

    def get_performance(self):
        return {
            "record_ms": round(self.last_record_ms, 3),
            "build_ms": round(self.last_build_ms, 3),
            "total_builds": self.total_builds,
            "time_aware": bool(self.time_aware),
            "window_seconds": self.window_seconds,
            "source_count": self.last_source_count,
            "coverage_seconds": round(self.last_coverage_sec, 4),
        }
