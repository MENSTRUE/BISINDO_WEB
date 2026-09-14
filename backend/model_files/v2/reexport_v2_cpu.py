from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F


# ============================================================
# CONFIG
# ============================================================

SOURCE_STATE_DICT = Path(
    "best_model_state_dict.pt"
)

OUTPUT_MODEL = Path(
    "wl_bisindo_multimodal_traced.pt"
)

NUM_CLASSES = 32
SEQ_LEN = 48

HAND_DIM = 134
POSE_DIM = 36
FACE_DIM = 52

DEVICE = torch.device("cpu")


# ============================================================
# MODEL COMPONENTS
# ============================================================

class ModalityProjection(
    nn.Module
):
    def __init__(
        self,
        in_dim,
        out_dim,
        drop=0.12,
    ):
        super().__init__()

        self.net = nn.Sequential(
            nn.Linear(
                in_dim,
                out_dim,
            ),

            nn.LayerNorm(
                out_dim
            ),

            nn.GELU(),

            nn.Dropout(
                drop
            ),

            nn.Linear(
                out_dim,
                out_dim,
            ),

            nn.LayerNorm(
                out_dim
            ),

            nn.GELU(),
        )


    def forward(
        self,
        x,
    ):
        return self.net(
            x
        )


class TemporalBlock(
    nn.Module
):
    def __init__(
        self,
        dim,
        kernel,
        drop=0.15,
    ):
        super().__init__()

        padding = (
            kernel // 2
        )

        self.c1 = nn.Conv1d(
            dim,
            dim,
            kernel,
            padding=padding,
        )

        self.c2 = nn.Conv1d(
            dim,
            dim,
            kernel,
            padding=padding,
        )

        self.n1 = nn.LayerNorm(
            dim
        )

        self.n2 = nn.LayerNorm(
            dim
        )

        self.d = nn.Dropout(
            drop
        )


    def forward(
        self,
        x,
    ):
        residual = x

        y = self.c1(
            x.transpose(
                1,
                2,
            )
        ).transpose(
            1,
            2,
        )

        y = self.d(
            F.gelu(
                self.n1(
                    y
                )
            )
        )

        y = self.c2(
            y.transpose(
                1,
                2,
            )
        ).transpose(
            1,
            2,
        )

        y = self.n2(
            y
        )

        return F.gelu(
            residual
            +
            self.d(
                y
            )
        )


# ============================================================
# FINAL BISINDO MODEL
# ============================================================

class BISINDONet(
    nn.Module
):
    def __init__(
        self,
        n_classes=32,
    ):
        super().__init__()


        # ----------------------------------------------------
        # MODALITY PROJECTIONS
        # ----------------------------------------------------

        self.hand = (
            ModalityProjection(
                134,
                160,
            )
        )

        self.pose = (
            ModalityProjection(
                36,
                96,
            )
        )

        self.face = (
            ModalityProjection(
                52,
                96,
            )
        )


        # ----------------------------------------------------
        # FEATURE FUSION
        #
        # hand      = 160
        # pose      = 96
        # facehead  = 96
        #
        # masks:
        # left hand = 1
        # right hand= 1
        # pose      = 1
        # facehead  = 1
        # time      = 1
        #
        # total = 357
        # ----------------------------------------------------

        self.fuse = nn.Sequential(
            nn.Linear(
                357,
                256,
            ),

            nn.LayerNorm(
                256
            ),

            nn.GELU(),

            nn.Dropout(
                0.15
            ),
        )


        # ----------------------------------------------------
        # POSITIONAL EMBEDDING
        # ----------------------------------------------------

        self.pos = nn.Parameter(
            torch.zeros(
                1,
                48,
                256,
            )
        )

        nn.init.trunc_normal_(
            self.pos,
            std=0.02,
        )


        # ----------------------------------------------------
        # TEMPORAL CNN
        # ----------------------------------------------------

        self.temporal = (
            nn.Sequential(
                TemporalBlock(
                    256,
                    5,
                ),

                TemporalBlock(
                    256,
                    3,
                ),
            )
        )


        # ----------------------------------------------------
        # BiLSTM
        # ----------------------------------------------------

        self.rnn = nn.LSTM(
            input_size=256,
            hidden_size=160,
            num_layers=2,
            batch_first=True,
            bidirectional=True,
            dropout=0.15,
        )


        # ----------------------------------------------------
        # MASKED ATTENTION
        # ----------------------------------------------------

        self.attn = nn.Sequential(
            nn.Linear(
                320,
                128,
            ),

            nn.Tanh(),

            nn.Linear(
                128,
                1,
            ),
        )


        # ----------------------------------------------------
        # CLASSIFIER
        # ----------------------------------------------------

        self.head = nn.Sequential(
            nn.LayerNorm(
                320
            ),

            nn.Linear(
                320,
                192,
            ),

            nn.GELU(),

            nn.Dropout(
                0.25
            ),

            nn.Linear(
                192,
                n_classes,
            ),
        )


    def forward(
        self,
        hand,
        pose,
        face,
        hand_mask,
        pose_mask,
        face_mask,
        time_mask,
    ):
        # ----------------------------------------------------
        # MASKS
        # ----------------------------------------------------

        hand_available = (
            hand_mask
            .sum(
                -1,
                keepdim=True,
            )
            > 0
        ).float()


        pose_available = (
            pose_mask
            .unsqueeze(
                -1
            )
            .float()
        )


        face_available = (
            face_mask
            .unsqueeze(
                -1
            )
            .float()
        )


        time_available = (
            time_mask
            .unsqueeze(
                -1
            )
            .float()
        )


        # ----------------------------------------------------
        # MODALITY FEATURES
        # ----------------------------------------------------

        hand_feature = (
            self.hand(
                hand
            )
            *
            hand_available
        )


        pose_feature = (
            self.pose(
                pose
            )
            *
            pose_available
        )


        face_feature = (
            self.face(
                face
            )
            *
            face_available
        )


        # ----------------------------------------------------
        # MASK CONTEXT
        # ----------------------------------------------------

        context = torch.cat(
            [
                hand_mask.float(),
                pose_available,
                face_available,
                time_available,
            ],
            dim=-1,
        )


        # ----------------------------------------------------
        # FUSION
        # ----------------------------------------------------

        x = torch.cat(
            [
                hand_feature,
                pose_feature,
                face_feature,
                context,
            ],
            dim=-1,
        )


        x = self.fuse(
            x
        )


        # ----------------------------------------------------
        # POSITION + TIME MASK
        # ----------------------------------------------------

        x = (
            x
            +
            self.pos[
                :,
                :x.size(1),
            ]
        )


        x = (
            x
            *
            time_available
        )


        # ----------------------------------------------------
        # TEMPORAL CNN
        # ----------------------------------------------------

        x = self.temporal(
            x
        )


        x = (
            x
            *
            time_available
        )


        # ----------------------------------------------------
        # BiLSTM
        # ----------------------------------------------------

        x, _ = self.rnn(
            x
        )


        # ----------------------------------------------------
        # MASKED ATTENTION
        # ----------------------------------------------------

        score = (
            self.attn(
                x
            )
            .squeeze(
                -1
            )
        )


        valid = (
            time_mask
            > 0.5
        )


        no_valid = (
            ~valid.any(
                1
            )
        )


        if no_valid.any():
            valid = (
                valid.clone()
            )

            valid[
                no_valid,
                0,
            ] = True


        score = (
            score.masked_fill(
                ~valid,
                -1e4,
            )
        )


        alpha = (
            torch.softmax(
                score,
                dim=1,
            )
            .unsqueeze(
                -1
            )
        )


        pooled = (
            alpha
            *
            x
        ).sum(
            1
        )


        # ----------------------------------------------------
        # CLASSIFICATION
        # ----------------------------------------------------

        return self.head(
            pooled
        )


# ============================================================
# LOAD STATE DICT
# ============================================================

print(
    "=" * 72
)

print(
    "WL-BISINDO V2 CPU RE-EXPORT"
)

print(
    "=" * 72
)

print(
    "PyTorch:",
    torch.__version__,
)

print(
    "Device :",
    DEVICE,
)

print(
    "Source :",
    SOURCE_STATE_DICT.resolve(),
)


if not SOURCE_STATE_DICT.exists():
    raise FileNotFoundError(
        SOURCE_STATE_DICT
    )


try:
    state = torch.load(
        SOURCE_STATE_DICT,
        map_location="cpu",
        weights_only=True,
    )

except TypeError:
    state = torch.load(
        SOURCE_STATE_DICT,
        map_location="cpu",
    )


# Optional wrapper safety.
if (
    isinstance(
        state,
        dict,
    )
    and
    "state_dict" in state
):
    state = state[
        "state_dict"
    ]


model = BISINDONet(
    n_classes=NUM_CLASSES
)


model.load_state_dict(
    state,
    strict=True,
)


model = (
    model
    .to(
        DEVICE
    )
    .eval()
)


print(
    "✅ STATE DICT LOADED"
)


# ============================================================
# SCRIPT ON CPU
#
# IMPORTANT:
# use torch.jit.script instead of tracing on CUDA.
# This avoids hard-coded cuda:0 tensors inside the LSTM graph.
# ============================================================

scripted = (
    torch.jit.script(
        model
    )
)


scripted = (
    scripted
    .to(
        DEVICE
    )
    .eval()
)


scripted.save(
    str(
        OUTPUT_MODEL
    )
)


print(
    "✅ CPU TORCHSCRIPT SAVED"
)

print(
    "Output :",
    OUTPUT_MODEL.resolve(),
)


# ============================================================
# CPU VALIDATION
# ============================================================

def make_test_inputs(
    batch_size,
):
    hand = torch.randn(
        batch_size,
        SEQ_LEN,
        HAND_DIM,
        dtype=torch.float32,
        device="cpu",
    )


    pose = torch.randn(
        batch_size,
        SEQ_LEN,
        POSE_DIM,
        dtype=torch.float32,
        device="cpu",
    )


    face = torch.randn(
        batch_size,
        SEQ_LEN,
        FACE_DIM,
        dtype=torch.float32,
        device="cpu",
    )


    hand_mask = torch.ones(
        batch_size,
        SEQ_LEN,
        2,
        dtype=torch.float32,
        device="cpu",
    )


    pose_mask = torch.ones(
        batch_size,
        SEQ_LEN,
        dtype=torch.float32,
        device="cpu",
    )


    face_mask = torch.ones(
        batch_size,
        SEQ_LEN,
        dtype=torch.float32,
        device="cpu",
    )


    time_mask = torch.ones(
        batch_size,
        SEQ_LEN,
        dtype=torch.float32,
        device="cpu",
    )


    return (
        hand,
        pose,
        face,
        hand_mask,
        pose_mask,
        face_mask,
        time_mask,
    )


for batch_size in [
    1,
    2,
    4,
]:
    inputs = (
        make_test_inputs(
            batch_size
        )
    )


    with torch.no_grad():
        eager_output = (
            model(
                *inputs
            )
        )


        scripted_output = (
            scripted(
                *inputs
            )
        )


    expected_shape = (
        batch_size,
        NUM_CLASSES,
    )


    if (
        tuple(
            scripted_output.shape
        )
        !=
        expected_shape
    ):
        raise RuntimeError(
            "Output shape mismatch: "
            f"{scripted_output.shape}"
        )


    max_diff = float(
        (
            eager_output
            -
            scripted_output
        )
        .abs()
        .max()
        .item()
    )


    print(
        f"Batch {batch_size}: "
        f"shape={tuple(scripted_output.shape)} "
        f"max_diff={max_diff:.10f}"
    )


    if max_diff > 1e-5:
        raise RuntimeError(
            "TorchScript parity failed: "
            f"{max_diff}"
        )


# ============================================================
# RELOAD TEST
# ============================================================

reloaded = torch.jit.load(
    str(
        OUTPUT_MODEL
    ),
    map_location="cpu",
)


reloaded.eval()


test_inputs = (
    make_test_inputs(
        1
    )
)


with torch.no_grad():
    output = reloaded(
        *test_inputs
    )


print(
    "Reload output:",
    tuple(
        output.shape
    ),
)


if (
    tuple(
        output.shape
    )
    !=
    (
        1,
        32,
    )
):
    raise RuntimeError(
        "Reload validation failed"
    )


# ============================================================
# FINAL
# ============================================================

print()

print(
    "=" * 72
)

print(
    "✅ CPU EXPORT PASSED"
)

print(
    "✅ NO RETRAINING REQUIRED"
)

print(
    "✅ MODEL OUTPUT = (batch, 32)"
)

print(
    "=" * 72
)

print()

print(
    "Copy this file:"
)

print(
    OUTPUT_MODEL.resolve()
)

print()

print(
    "to:"
)

print(
    "backend/model_files/v2/"
    "wl_bisindo_multimodal_traced.pt"
)