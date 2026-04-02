# Leaf Disease Prediction API

This project exposes the existing Keras model in `plant_model.h5` through a FastAPI service.

## What it does

- Accepts a leaf image upload at `POST /predict`
- Returns the top prediction, confidence, plant name, and disease/condition
- Exposes `GET /health` for deployment and debugging

## Local development

Use Python 3.11 or 3.12. Do not use Python 3.14 for TensorFlow-based installs.

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

Then open:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

## API

### `GET /health`

Returns model readiness and input size.

### `POST /predict`

Send a multipart form upload with the field name `file`.

Example response:

```json
{
  "prediction": "Tomato___Late_blight",
  "confidence": 0.91,
  "plant": "Tomato",
  "condition": "Late blight",
  "top_k": [
    {
      "label": "Tomato___Late_blight",
      "confidence": 0.91,
      "plant": "Tomato",
      "condition": "Late blight"
    }
  ],
  "input_size": [224, 224]
}
```

## Deploying

### Render

This repo includes a `Dockerfile` and `render.yaml`, so you can deploy it as a Docker web service on Render.

Expected startup:

```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

After deploy, your API base URL will look like:

```text
https://your-service-name.onrender.com
```

Use that URL from the Expo app, for example:

```ts
const API_BASE_URL = "https://your-service-name.onrender.com";
```
