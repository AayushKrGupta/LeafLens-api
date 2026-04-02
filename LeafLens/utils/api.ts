// LeafLens API Utility
// Backend: https://leaflens-api-t394.onrender.com

export const API_BASE_URL = 'https://leaflens-api-t394.onrender.com';

export interface TopKPrediction {
  label: string;
  confidence: number;
  plant: string;
  condition: string;
}

export interface PredictionResult {
  prediction: string;
  confidence: number;
  plant: string;
  condition: string;
  top_k: TopKPrediction[];
  input_size: [number, number];
}

export interface ApiError {
  message: string;
  type: 'network' | 'timeout' | 'invalid_image' | 'server';
}

const TIMEOUT_MS = 30000; // 30s to handle Render cold starts

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. The server may be waking up, please try again.')), ms)
    ),
  ]);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await withTimeout(fetch(`${API_BASE_URL}/health`), 10000);
    return response.ok;
  } catch {
    return false;
  }
}

export async function predictLeaf(
  imageUri: string,
  fileName: string = 'leaf.jpg',
  mimeType: string = 'image/jpeg',
  debug: boolean = false
): Promise<PredictionResult> {
  if (debug) {
    console.log('=== API Upload Debug ===');
    console.log('Image URI:', imageUri);
    console.log('File name:', fileName);
    console.log('MIME type:', mimeType);
  }

  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: fileName,
    type: mimeType,
  } as any);

  try {
    const response = await withTimeout(
      fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
          // Do NOT set Content-Type manually — fetch sets it with boundary for FormData
        },
      }),
      TIMEOUT_MS
    );

    if (debug) {
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    }

    if (!response.ok) {
      if (response.status === 422) {
        throw { message: 'Invalid image format. Please use a clear leaf photo.', type: 'invalid_image' } as ApiError;
      }
      throw { message: `Server error (${response.status}). Please try again.`, type: 'server' } as ApiError;
    }

    const data: PredictionResult = await response.json();
    
    if (debug) {
      console.log('Prediction result:', {
        plant: data.plant,
        condition: data.condition,
        confidence: `${(data.confidence * 100).toFixed(1)}%`,
        inputSize: data.input_size,
      });
      console.log('=== End API Debug ===');
    }
    
    return data;
  } catch (error: any) {
    if (error?.type) throw error; // already formatted
    if (error?.message?.includes('timed out')) {
      throw { message: error.message, type: 'timeout' } as ApiError;
    }
    throw { message: 'Network error. Check your connection and try again.', type: 'network' } as ApiError;
  }
}
