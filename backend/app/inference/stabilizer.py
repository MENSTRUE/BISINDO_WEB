from collections import (
    Counter,
    deque,
)


# ============================================================
# RUNTIME STABILIZATION CONFIG
#
# Ini adalah threshold deployment awal.
# BUKAN threshold dari training.
#
# Nanti boleh dituning berdasarkan
# hasil pengujian real-time.
# ============================================================

MIN_CONFIDENCE = 0.70
MIN_MARGIN = 0.10

VOTE_WINDOW = 5
MIN_VOTES = 3

# Inference dilakukan setiap 2 frame.
#
# Kalau tangan hilang selama 3 update inference,
# prediction stabil akan dibersihkan.
NO_HAND_CLEAR_UPDATES = 3

# Prediction stabil boleh dipertahankan sebentar
# saat transisi gesture / confidence turun.
STABLE_MISS_LIMIT = 8


# ============================================================
# HELPERS
# ============================================================

def safe_float(
    value,
    default=0.0,
):
    try:
        return float(
            value
        )

    except (
        TypeError,
        ValueError,
    ):
        return float(
            default
        )


def get_raw_margin(
    raw_prediction,
):
    if not isinstance(
        raw_prediction,
        dict,
    ):
        return 0.0


    top1_confidence = safe_float(
        raw_prediction.get(
            "confidence",
            0.0,
        )
    )


    top3 = (
        raw_prediction.get(
            "top3",
            [],
        )
    )


    second_confidence = 0.0


    if (
        isinstance(
            top3,
            list,
        )
        and len(top3) >= 2
        and isinstance(
            top3[1],
            dict,
        )
    ):
        second_confidence = (
            safe_float(
                top3[1].get(
                    "confidence",
                    0.0,
                )
            )
        )


    margin = (
        top1_confidence
        - second_confidence
    )


    return max(
        0.0,
        margin,
    )


# ============================================================
# STABILIZER
# ============================================================

class PredictionStabilizer:
    def __init__(
        self,
    ):
        self.history = deque(
            maxlen=VOTE_WINDOW,
        )

        self.stable_prediction = (
            None
        )

        self.no_hand_updates = 0

        self.stable_miss_count = 0


    # ========================================================
    # RESET
    # ========================================================

    def reset(
        self,
    ):
        self.history.clear()

        self.stable_prediction = (
            None
        )

        self.no_hand_updates = 0

        self.stable_miss_count = 0


    # ========================================================
    # HISTORY WINNER
    # ========================================================

    def get_history_winner(
        self,
    ):
        valid_entries = [
            item

            for item
            in self.history

            if (
                isinstance(
                    item,
                    dict,
                )
                and item.get(
                    "label"
                )
            )
        ]


        if not valid_entries:
            return (
                None,
                0,
            )


        counts = Counter(
            item[
                "label"
            ]

            for item
            in valid_entries
        )


        winner_label, votes = (
            counts.most_common(
                1
            )[0]
        )


        matching = [
            item

            for item
            in valid_entries

            if (
                item[
                    "label"
                ]
                == winner_label
            )
        ]


        latest = (
            matching[-1]
        )


        average_confidence = (
            sum(
                safe_float(
                    item.get(
                        "confidence",
                        0.0,
                    )
                )

                for item
                in matching
            )
            / len(
                matching
            )
        )


        average_margin = (
            sum(
                safe_float(
                    item.get(
                        "margin",
                        0.0,
                    )
                )

                for item
                in matching
            )
            / len(
                matching
            )
        )


        return (
            {
                "class_id":
                    latest.get(
                        "class_id"
                    ),

                "label":
                    winner_label,

                "confidence":
                    average_confidence,

                "margin":
                    average_margin,
            },
            votes,
        )


    # ========================================================
    # CURRENT STABLE VOTES
    # ========================================================

    def get_stable_votes(
        self,
    ):
        if (
            self.stable_prediction
            is None
        ):
            return 0


        stable_label = (
            self.stable_prediction[
                "label"
            ]
        )


        return sum(
            1

            for item
            in self.history

            if (
                isinstance(
                    item,
                    dict,
                )
                and item.get(
                    "label"
                )
                == stable_label
            )
        )


    # ========================================================
    # OUTPUT
    # ========================================================

    def build_result(
        self,
        raw_prediction,
        status,
        reason,
        candidate_valid=False,
    ):
        raw_prediction = (
            raw_prediction

            if isinstance(
                raw_prediction,
                dict,
            )

            else {}
        )


        raw_confidence = (
            safe_float(
                raw_prediction.get(
                    "confidence",
                    0.0,
                )
            )
        )


        raw_margin = (
            get_raw_margin(
                raw_prediction
            )
        )


        stable = (
            self.stable_prediction
        )


        stable_votes = (
            self.get_stable_votes()
        )


        accepted = (
            stable is not None
        )


        return {
            "status":
                status,

            "accepted":
                accepted,

            # =====================
            # STABLE RESULT
            # =====================

            "class_id":
                (
                    stable.get(
                        "class_id"
                    )

                    if stable
                    else None
                ),

            "label":
                (
                    stable.get(
                        "label"
                    )

                    if stable
                    else None
                ),

            "confidence":
                (
                    safe_float(
                        stable.get(
                            "confidence",
                            0.0,
                        )
                    )

                    if stable
                    else 0.0
                ),

            "confidence_percent":
                (
                    round(
                        safe_float(
                            stable.get(
                                "confidence",
                                0.0,
                            )
                        )
                        * 100.0,
                        2,
                    )

                    if stable
                    else 0.0
                ),

            "margin":
                (
                    safe_float(
                        stable.get(
                            "margin",
                            0.0,
                        )
                    )

                    if stable
                    else 0.0
                ),

            "margin_percent":
                (
                    round(
                        safe_float(
                            stable.get(
                                "margin",
                                0.0,
                            )
                        )
                        * 100.0,
                        2,
                    )

                    if stable
                    else 0.0
                ),

            # =====================
            # VOTING
            # =====================

            "votes":
                stable_votes,

            "required_votes":
                MIN_VOTES,

            "window_size":
                len(
                    self.history
                ),

            "vote_window":
                VOTE_WINDOW,

            # =====================
            # RAW MODEL
            # =====================

            "raw_status":
                raw_prediction.get(
                    "status",
                    "idle",
                ),

            "raw_class_id":
                raw_prediction.get(
                    "class_id"
                ),

            "raw_label":
                raw_prediction.get(
                    "label"
                ),

            "raw_confidence":
                raw_confidence,

            "raw_confidence_percent":
                round(
                    raw_confidence
                    * 100.0,
                    2,
                ),

            "raw_margin":
                raw_margin,

            "raw_margin_percent":
                round(
                    raw_margin
                    * 100.0,
                    2,
                ),

            # =====================
            # DEBUG / QUALITY
            # =====================

            "candidate_valid":
                bool(
                    candidate_valid
                ),

            "reason":
                reason,

            "stable_miss_count":
                self.stable_miss_count,

            "no_hand_updates":
                self.no_hand_updates,

            "thresholds": {
                "min_confidence":
                    MIN_CONFIDENCE,

                "min_confidence_percent":
                    round(
                        MIN_CONFIDENCE
                        * 100.0,
                        2,
                    ),

                "min_margin":
                    MIN_MARGIN,

                "min_margin_percent":
                    round(
                        MIN_MARGIN
                        * 100.0,
                        2,
                    ),

                "min_votes":
                    MIN_VOTES,

                "vote_window":
                    VOTE_WINDOW,
            },

            # =====================
            # ORIGINAL INFO
            # =====================

            "hand_present_frames":
                int(
                    raw_prediction.get(
                        "hand_present_frames",
                        0,
                    )
                    or 0
                ),

            "inference_ms":
                raw_prediction.get(
                    "inference_ms"
                ),

            "top3":
                (
                    raw_prediction.get(
                        "top3",
                        []
                    )

                    if isinstance(
                        raw_prediction.get(
                            "top3",
                            []
                        ),
                        list,
                    )

                    else []
                ),
        }


    # ========================================================
    # UPDATE
    # ========================================================

    def update(
        self,
        raw_prediction,
        current_hand_detected,
    ):
        raw_prediction = (
            raw_prediction

            if isinstance(
                raw_prediction,
                dict,
            )

            else {
                "status":
                    "idle"
            }
        )


        # ====================================================
        # CURRENT HAND PRESENCE
        # ====================================================

        if current_hand_detected:
            self.no_hand_updates = 0

        else:
            self.no_hand_updates += 1

            # Jangan gunakan prediction lama
            # saat tangan saat ini hilang.
            self.history.append(
                None
            )


            if (
                self.stable_prediction
                is not None
            ):
                self.stable_miss_count += 1


            # Bersihkan hasil stabil setelah
            # beberapa inference tanpa tangan.
            if (
                self.no_hand_updates
                >= NO_HAND_CLEAR_UPDATES
            ):
                self.history.clear()

                self.stable_prediction = (
                    None
                )

                self.stable_miss_count = 0


                return self.build_result(
                    raw_prediction,
                    status="waiting_for_hand",
                    reason="no_hand",
                    candidate_valid=False,
                )


            if (
                self.stable_prediction
                is not None
            ):
                return self.build_result(
                    raw_prediction,
                    status="holding",
                    reason="no_hand_grace",
                    candidate_valid=False,
                )


            return self.build_result(
                raw_prediction,
                status="waiting_for_hand",
                reason="no_hand",
                candidate_valid=False,
            )


        # ====================================================
        # MODEL NOT LOADED
        # ====================================================

        if (
            raw_prediction.get(
                "status"
            )
            == "model_not_loaded"
        ):
            self.reset()


            return self.build_result(
                raw_prediction,
                status="model_not_loaded",
                reason="model_not_loaded",
                candidate_valid=False,
            )


        # ====================================================
        # RAW MODEL NOT READY
        # ====================================================

        if (
            raw_prediction.get(
                "status"
            )
            != "ok"
        ):
            self.history.append(
                None
            )


            if (
                self.stable_prediction
                is not None
            ):
                self.stable_miss_count += 1


                if (
                    self.stable_miss_count
                    >= STABLE_MISS_LIMIT
                ):
                    self.stable_prediction = (
                        None
                    )

                    self.stable_miss_count = 0


            if (
                self.stable_prediction
                is not None
            ):
                return self.build_result(
                    raw_prediction,
                    status="holding",
                    reason="raw_not_ready",
                    candidate_valid=False,
                )


            return self.build_result(
                raw_prediction,
                status="stabilizing",
                reason="raw_not_ready",
                candidate_valid=False,
            )


        # ====================================================
        # RAW CONFIDENCE + MARGIN
        # ====================================================

        raw_confidence = (
            safe_float(
                raw_prediction.get(
                    "confidence",
                    0.0,
                )
            )
        )


        raw_margin = (
            get_raw_margin(
                raw_prediction
            )
        )


        candidate_valid = (
            raw_confidence
            >= MIN_CONFIDENCE

            and raw_margin
            >= MIN_MARGIN
        )


        # ====================================================
        # FILTER LOW QUALITY
        # ====================================================

        if not candidate_valid:
            self.history.append(
                None
            )


            if (
                self.stable_prediction
                is not None
            ):
                self.stable_miss_count += 1


                if (
                    self.stable_miss_count
                    >= STABLE_MISS_LIMIT
                ):
                    self.stable_prediction = (
                        None
                    )

                    self.stable_miss_count = 0


            reason = (
                "low_confidence"

                if (
                    raw_confidence
                    < MIN_CONFIDENCE
                )

                else "low_margin"
            )


            if (
                self.stable_prediction
                is not None
            ):
                return self.build_result(
                    raw_prediction,
                    status="holding",
                    reason=reason,
                    candidate_valid=False,
                )


            return self.build_result(
                raw_prediction,
                status="stabilizing",
                reason=reason,
                candidate_valid=False,
            )


        # ====================================================
        # VALID CANDIDATE
        # ====================================================

        candidate = {
            "class_id":
                raw_prediction.get(
                    "class_id"
                ),

            "label":
                raw_prediction.get(
                    "label"
                ),

            "confidence":
                raw_confidence,

            "margin":
                raw_margin,
        }


        self.history.append(
            candidate
        )


        (
            winner,
            winner_votes,
        ) = self.get_history_winner()


        # ====================================================
        # ACCEPT STABLE
        # ====================================================

        if (
            winner is not None

            and winner_votes
            >= MIN_VOTES
        ):
            self.stable_prediction = (
                winner
            )

            self.stable_miss_count = 0


            return self.build_result(
                raw_prediction,
                status="stable",
                reason="vote_accepted",
                candidate_valid=True,
            )


        # ====================================================
        # HOLD PREVIOUS STABLE
        # ====================================================

        if (
            self.stable_prediction
            is not None
        ):
            if (
                candidate.get(
                    "label"
                )
                == self.stable_prediction.get(
                    "label"
                )
            ):
                self.stable_miss_count = 0

            else:
                self.stable_miss_count += 1


            if (
                self.stable_miss_count
                >= STABLE_MISS_LIMIT
            ):
                self.stable_prediction = (
                    None
                )

                self.stable_miss_count = 0


                return self.build_result(
                    raw_prediction,
                    status="stabilizing",
                    reason="stable_expired",
                    candidate_valid=True,
                )


            return self.build_result(
                raw_prediction,
                status="holding",
                reason="collecting_new_votes",
                candidate_valid=True,
            )


        # ====================================================
        # COLLECTING
        # ====================================================

        return self.build_result(
            raw_prediction,
            status="stabilizing",
            reason="collecting_votes",
            candidate_valid=True,
        )