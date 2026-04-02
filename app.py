import io
import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.getenv("MODEL_PATH", BASE_DIR / "plant_model.h5"))
CLASSES_PATH = Path(os.getenv("CLASSES_PATH", BASE_DIR / "classes.json"))
TOP_K = int(os.getenv("TOP_K", "3"))


class PredictionItem(BaseModel):
    label: str
    confidence: float
    plant: str
    condition: str


class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    plant: str
    condition: str
    top_k: list[PredictionItem]
    input_size: list[int]


def parse_label(label: str) -> tuple[str, str]:
    parts = label.split("___", 1)
    if len(parts) == 2:
        return parts[0].replace("_", " "), parts[1].replace("_", " ")
    return label.replace("_", " "), "unknown"


@lru_cache
def load_classes() -> list[str]:
    with CLASSES_PATH.open("r", encoding="utf-8") as f:
        classes = json.load(f)
    if not isinstance(classes, list) or not classes:
        raise RuntimeError("classes.json must contain a non-empty JSON array.")
    return [str(item) for item in classes]


@lru_cache
def load_model() -> tf.keras.Model:
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model file not found: {MODEL_PATH}")
    return tf.keras.models.load_model(MODEL_PATH)


def get_input_size(model: tf.keras.Model) -> tuple[int, int]:
    shape = model.input_shape
    if isinstance(shape, list):
        shape = shape[0]
    if len(shape) != 4 or shape[1] is None or shape[2] is None:
        raise RuntimeError(f"Unsupported model input shape: {shape}")
    return int(shape[1]), int(shape[2])


def preprocess_image(image_bytes: bytes, target_size: tuple[int, int]) -> np.ndarray:
    try:
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image file.") from exc

    image = ImageOps.exif_transpose(image).convert("RGB")
    image = image.resize(target_size)
    image_array = np.asarray(image, dtype=np.float32) / 255.0
    return np.expand_dims(image_array, axis=0)


def build_prediction_items(probabilities: np.ndarray, classes: list[str], top_k: int) -> list[PredictionItem]:
    indices = np.argsort(probabilities)[::-1][:top_k]
    items: list[PredictionItem] = []
    for index in indices:
        label = classes[int(index)]
        plant, condition = parse_label(label)
        items.append(
            PredictionItem(
                label=label,
                confidence=round(float(probabilities[int(index)]), 6),
                plant=plant,
                condition=condition,
            )
        )
    return items


app = FastAPI(
    title="Leaf Disease Prediction API",
    version="1.0.0",
    description="Upload a crop leaf image and get plant disease predictions.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    model = load_model()
    classes = load_classes()
    width, height = get_input_size(model)
    return {
        "status": "ok",
        "model_loaded": True,
        "classes": len(classes),
        "input_size": [width, height],
        "top_k": TOP_K,
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)) -> PredictionResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    model = load_model()
    classes = load_classes()
    input_size = get_input_size(model)
    batch = preprocess_image(image_bytes, input_size)

    predictions = model.predict(batch, verbose=0)
    probabilities = predictions[0]

    if len(probabilities) != len(classes):
        raise HTTPException(
            status_code=500,
            detail="Model output size does not match classes.json length.",
        )

    top_items = build_prediction_items(probabilities, classes, TOP_K)
    best = top_items[0]

    return PredictionResponse(
        prediction=best.label,
        confidence=best.confidence,
        plant=best.plant,
        condition=best.condition,
        top_k=top_items,
        input_size=[input_size[0], input_size[1]],
    )
