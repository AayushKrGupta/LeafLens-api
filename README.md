# LeafLens - Plant Disease Detection Mobile App

A React Native mobile app that uses computer vision to identify plant diseases from leaf images. Built with Expo and integrated with a FastAPI backend for real-time disease prediction.

## Features

- **Camera Capture**: Take photos of leaves directly within the app
- **Image Picker**: Select existing photos from your device gallery
- **Real-time Prediction**: Get instant disease identification with confidence scores
- **History Tracking**: View and manage your previous scans
- **Enhanced Image Processing**: Optimized preprocessing for accurate ML model predictions

## Screenshots

| Home | Scanner | Picker | History |
|------|---------|--------|---------|
| ![Home Screen](assets/screenshots/home.png) | ![Scanner Screen](assets/screenshots/scanner.png) | ![Picker Screen](assets/screenshots/picker.png) | ![History Screen](assets/screenshots/history.png) |

Just add your screenshot files named:
- `home.png`
- `scanner.png` 
- `picker.png`
- `history.png`

to the `assets/screenshots/` folder and they'll automatically appear in the README!

## Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router
- **UI Components**: Lucide React Native icons
- **Backend Integration**: FastAPI with TensorFlow/Keras model
- **Image Processing**: Expo Image Manipulator

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- Expo CLI
- Physical iOS/Android device or Expo Go app

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run the app:
   - **iOS**: `npm run ios`
   - **Android**: `npm run android`
   - **Web**: `npm run web`

### Configuration

Update the API base URL in `utils/api.ts` to point to your deployed backend service:

```typescript
const API_BASE_URL = "https://your-api-service.onrender.com";
```

## App Structure

```
LeafLens/
├── app/
│   ├── (tabs)/          # Tab navigation screens
│   │   ├── index.tsx    # Home tab
│   │   ├── scanner.tsx  # Camera scanner tab
│   │   ├── picker.tsx   # Image picker tab
│   │   └── history.tsx  # Scan history tab
│   ├── _layout.tsx      # Root layout
│   ├── +html.tsx        # HTML fallback
│   └── +not-found.tsx   # 404 page
├── components/          # Reusable UI components
│   ├── EnhancedScanner.tsx
│   └── ...
├── utils/              # Utility functions
│   ├── api.ts          # API integration
│   └── imageProcessing.ts  # Image preprocessing
└── assets/             # Static assets
```

## Key Features

### Enhanced Image Processing

The app includes sophisticated image preprocessing to ensure optimal accuracy:

- **Source-aware cropping**: Different crop ratios for camera vs picker images
- **Resolution optimization**: Maintains high quality for preview while optimizing for ML model
- **Compression control**: Balanced file size and quality

### Camera Integration

- Real-time camera preview with overlay guides
- Automatic image capture with quality optimization
- Integration with device camera hardware

### API Integration

- Seamless communication with FastAPI backend
- Error handling and retry mechanisms
- Base64 image encoding for secure transmission

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on both iOS and Android
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.



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
