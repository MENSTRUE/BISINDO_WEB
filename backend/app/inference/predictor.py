import time

import numpy as np
import torch

from app.inference.model_runtime import (
    FACE_CROP_SIZE,
    FACEHEAD_DIM,
    HAND_DIM,
    NUM_CLASSES,
    POSE_DIM,
    SEQUENCE_LENGTH,
    model_runtime,
)

HAND_LEFT_PRESENCE_INDEX = 66
HAND_RIGHT_PRESENCE_INDEX = 133
POSE_VISIBILITY_INDICES = [3,7,11,15,19,23,27,31,35]
FACE_VISIBILITY_START = 33
FACE_VISIBILITY_END = 44
FACE_PRESENCE_INDEX = 51
MIN_HAND_PRESENT_FRAMES = 4


def normalize_hand(sequence: np.ndarray):
    x = np.asarray(sequence, dtype=np.float32).copy()
    if x.shape != (SEQUENCE_LENGTH, HAND_DIM):
        raise ValueError(f"Shape hand salah. Expected ({SEQUENCE_LENGTH},{HAND_DIM}), got {x.shape}.")
    if model_runtime.hand_mean is None or model_runtime.hand_std is None:
        raise RuntimeError("Statistik hand V1 belum dimuat.")
    lp = x[:,HAND_LEFT_PRESENCE_INDEX].copy()
    rp = x[:,HAND_RIGHT_PRESENCE_INDEX].copy()
    x = (x-model_runtime.hand_mean)/model_runtime.hand_std
    x[lp<0.5,0:66]=0.0
    x[rp<0.5,67:133]=0.0
    x[:,HAND_LEFT_PRESENCE_INDEX]=lp
    x[:,HAND_RIGHT_PRESENCE_INDEX]=rp
    return x.astype(np.float32)


def normalize_pose(sequence: np.ndarray):
    x = np.asarray(sequence,dtype=np.float32).copy()
    if x.shape != (SEQUENCE_LENGTH,POSE_DIM):
        raise ValueError(f"Shape pose salah. Expected ({SEQUENCE_LENGTH},{POSE_DIM}), got {x.shape}.")
    if model_runtime.pose_mean is None or model_runtime.pose_std is None:
        raise RuntimeError("Statistik pose V1 belum dimuat.")
    vis=x[:,POSE_VISIBILITY_INDICES].copy()
    x=(x-model_runtime.pose_mean)/model_runtime.pose_std
    for j,vi in enumerate(POSE_VISIBILITY_INDICES):
        invalid=vis[:,j]<0.2
        base=j*4
        x[invalid,base:base+3]=0.0
        x[:,vi]=vis[:,j]
    return x.astype(np.float32)


def normalize_facehead(sequence: np.ndarray):
    x=np.asarray(sequence,dtype=np.float32).copy()
    if x.shape != (SEQUENCE_LENGTH,FACEHEAD_DIM):
        raise ValueError(f"Shape facehead salah. Expected ({SEQUENCE_LENGTH},{FACEHEAD_DIM}), got {x.shape}.")
    if model_runtime.facehead_mean is None or model_runtime.facehead_std is None:
        raise RuntimeError("Statistik facehead V1 belum dimuat.")
    vis=x[:,FACE_VISIBILITY_START:FACE_VISIBILITY_END].copy()
    presence=x[:,FACE_PRESENCE_INDEX].copy()
    x=(x-model_runtime.facehead_mean)/model_runtime.facehead_std
    for j in range(11):
        invalid=vis[:,j]<0.2
        start=j*3
        x[invalid,start:start+3]=0.0
    x[:,FACE_VISIBILITY_START:FACE_VISIBILITY_END]=vis
    x[:,FACE_PRESENCE_INDEX]=presence
    missing=presence<0.5
    x[missing,0:33]=0.0
    x[missing,44:51]=0.0
    return x.astype(np.float32)


def count_hand_present_frames(hand_sequence: np.ndarray, hand_mask=None):
    if hand_mask is not None:
        hm=np.asarray(hand_mask)
        if hm.shape==(SEQUENCE_LENGTH,2):
            return int(np.count_nonzero(hm.sum(axis=1)>0))
    left=hand_sequence[:,HAND_LEFT_PRESENCE_INDEX]>=0.5
    right=hand_sequence[:,HAND_RIGHT_PRESENCE_INDEX]>=0.5
    return int(np.count_nonzero(left|right))


class BisindoPredictor:
    def __init__(self):
        self.runtime=model_runtime

    def validate_sequences(self,sequences):
        if not isinstance(sequences,dict):
            raise ValueError("Sequences harus berupa dictionary.")
        required={
            "hand":(48,134),
            "pose":(48,36),
            "facehead":(48,52),
        }
        if self.runtime.runtime_schema=="masked_v2":
            required.update({
                "hand_mask":(48,2),
                "pose_mask":(48,),
                "facehead_mask":(48,),
                "time_mask":(48,),
            })
        for name,shape in required.items():
            if name not in sequences:
                raise ValueError(f"Sequence '{name}' tidak tersedia.")
            arr=np.asarray(sequences[name])
            if tuple(arr.shape)!=shape:
                raise ValueError(f"Shape '{name}' salah. Expected {shape}, got {arr.shape}.")
            if not np.isfinite(arr).all():
                raise ValueError(f"Sequence '{name}' mengandung NaN/Inf.")

    def _predict_v1(self,sequences):
        hand=normalize_hand(sequences["hand"])
        pose=normalize_pose(sequences["pose"])
        face=normalize_facehead(sequences["facehead"])
        crop=np.zeros((48,FACE_CROP_SIZE,FACE_CROP_SIZE),dtype=np.float32)
        tensors=[
            torch.from_numpy(hand).unsqueeze(0).to(self.runtime.device),
            torch.from_numpy(pose).unsqueeze(0).to(self.runtime.device),
            torch.from_numpy(face).unsqueeze(0).to(self.runtime.device),
            torch.from_numpy(crop).unsqueeze(0).to(self.runtime.device),
        ]
        return self.runtime.model(*tensors)

    def _predict_v2(self,sequences):
        tensors=[
            torch.from_numpy(np.asarray(sequences["hand"],dtype=np.float32)).unsqueeze(0).to(self.runtime.device),
            torch.from_numpy(np.asarray(sequences["pose"],dtype=np.float32)).unsqueeze(0).to(self.runtime.device),
            torch.from_numpy(np.asarray(sequences["facehead"],dtype=np.float32)).unsqueeze(0).to(self.runtime.device),
            torch.from_numpy(np.asarray(sequences["hand_mask"],dtype=np.float32)).unsqueeze(0).to(self.runtime.device),
            torch.from_numpy(np.asarray(sequences["pose_mask"],dtype=np.float32)).unsqueeze(0).to(self.runtime.device),
            torch.from_numpy(np.asarray(sequences["facehead_mask"],dtype=np.float32)).unsqueeze(0).to(self.runtime.device),
            torch.from_numpy(np.asarray(sequences["time_mask"],dtype=np.float32)).unsqueeze(0).to(self.runtime.device),
        ]
        return self.runtime.model(*tensors)

    def predict(self,sequences):
        if not self.runtime.loaded or self.runtime.model is None:
            return {
                "status":"model_not_loaded","label":None,"class_id":None,
                "confidence":0.0,"confidence_percent":0.0,"top3":[],"inference_ms":None,
            }
        self.validate_sequences(sequences)
        raw_hand=np.asarray(sequences["hand"],dtype=np.float32)
        hand_present_frames=count_hand_present_frames(raw_hand,sequences.get("hand_mask"))
        if hand_present_frames<MIN_HAND_PRESENT_FRAMES:
            return {
                "status":"waiting_for_hand","label":None,"class_id":None,
                "confidence":0.0,"confidence_percent":0.0,"top3":[],
                "hand_present_frames":hand_present_frames,"inference_ms":None,
            }

        started=time.perf_counter()
        with torch.inference_mode():
            if self.runtime.runtime_schema=="masked_v2":
                logits=self._predict_v2(sequences)
            else:
                logits=self._predict_v1(sequences)
            probabilities=torch.softmax(logits,dim=-1)
        inference_ms=(time.perf_counter()-started)*1000.0

        if tuple(probabilities.shape)!=(1,NUM_CLASSES):
            raise RuntimeError(f"Shape output inference salah: {tuple(probabilities.shape)}")
        if not torch.isfinite(probabilities).all():
            raise RuntimeError("Probabilitas model mengandung NaN/Inf.")

        probs=probabilities[0].detach().cpu()
        top_values,top_indices=torch.topk(probs,k=3)
        top3=[]
        for probability,class_index in zip(top_values.tolist(),top_indices.tolist()):
            label=self.runtime.class_mapping[str(class_index)]
            top3.append({
                "class_id":int(class_index),"label":str(label),
                "confidence":float(probability),
                "confidence_percent":round(float(probability)*100.0,2),
            })
        winner=top3[0]
        return {
            "status":"ok",
            "class_id":winner["class_id"],
            "label":winner["label"],
            "confidence":winner["confidence"],
            "confidence_percent":winner["confidence_percent"],
            "top3":top3,
            "hand_present_frames":hand_present_frames,
            "inference_ms":round(inference_ms,2),
            "model_version":self.runtime.active_version,
            "runtime_schema":self.runtime.runtime_schema,
        }


bisindo_predictor=BisindoPredictor()
