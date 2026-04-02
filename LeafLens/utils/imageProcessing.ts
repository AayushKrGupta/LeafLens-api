import * as ImageManipulator from 'expo-image-manipulator';

export interface ProcessedImageResult {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

export interface PreprocessImageOptions {
  cropScale?: number;
  maxSize?: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  uri: string;
  fileSize?: number;
  source: 'camera' | 'picker';
}

/**
 * Unified image preprocessing pipeline for both camera and picker images
 * Ensures consistent image format, orientation, and quality before API upload
 */
export async function preprocessImage(
  imageUri: string,
  source: 'camera' | 'picker',
  debug: boolean = false,
  options: PreprocessImageOptions = {}
): Promise<ProcessedImageResult> {
  try {
    // Get original image info
    const originalInfo = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    const metadata: ImageMetadata = {
      width: originalInfo.width,
      height: originalInfo.height,
      uri: originalInfo.uri,
      source,
    };

    if (debug) {
      console.log('=== Image Preprocessing Debug ===');
      console.log('Source:', source);
      console.log('Original dimensions:', `${originalInfo.width}x${originalInfo.height}`);
      console.log('Original URI:', imageUri);
    }

    // Camera captures benefit from a tighter center crop because the scan frame
    // only covers part of the full preview. Picker images are usually already
    // framed intentionally, so we keep more of the original crop there.
    const shortestSide = Math.min(originalInfo.width, originalInfo.height);
    const defaultCropScale = source === 'camera' ? 0.72 : 1;
    const cropScale = Math.min(1, Math.max(0.35, options.cropScale ?? defaultCropScale));
    const cropSize = Math.max(224, Math.round(shortestSide * cropScale));
    const cropX = Math.max(0, Math.round((originalInfo.width - cropSize) / 2));
    const cropY = Math.max(0, Math.round((originalInfo.height - cropSize) / 2));

    // Apply transformations
    const actions: ImageManipulator.Action[] = [];

    // 1. Center crop to square aspect ratio using a tighter crop for camera shots
    if (cropSize !== originalInfo.width || cropSize !== originalInfo.height) {
      actions.push({
        crop: {
          originX: cropX,
          originY: cropY,
          width: cropSize,
          height: cropSize,
        },
      });
    }

    // 2. Keep a higher-resolution square for upload and preview.
    // The backend already resizes to the model input size, so shrinking to 224
    // on-device throws away useful detail and makes the preview look blurry.
    const finalSize = Math.min(cropSize, options.maxSize ?? 1024);
    if (cropSize !== finalSize) {
      actions.push({
        resize: {
          width: finalSize,
          height: finalSize,
        },
      });
    }

    // Apply all transformations
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      actions,
      { 
        format: ImageManipulator.SaveFormat.JPEG, 
        compress: 0.92,
        base64: debug // Include base64 for debugging if needed
      }
    );

    const processedResult: ProcessedImageResult = {
      uri: result.uri,
      width: result.width,
      height: result.height,
      base64: result.base64,
    };

    if (debug) {
      console.log('Processed dimensions:', `${result.width}x${result.height}`);
      console.log('Processed URI:', result.uri);
      console.log('Number of transformations:', actions.length);
      console.log('Crop scale:', cropScale);
      console.log('=== End Debug ===');
    }

    return processedResult;
  } catch (error) {
    console.error('Image preprocessing failed:', error);
    // Fallback: return original URI if preprocessing fails
    return {
      uri: imageUri,
      width: 0,
      height: 0,
    };
  }
}

/**
 * Enhanced camera capture with better quality settings
 */
export interface CameraCaptureOptions {
  quality?: number;
  skipProcessing?: boolean;
  onShutter?: () => void;
}

export async function capturePhotoWithQuality(
  cameraRef: any,
  options: CameraCaptureOptions = {}
): Promise<string> {
  const {
    quality = 1,
    skipProcessing = false,
    onShutter
  } = options;

  if (!cameraRef?.current) {
    throw new Error('Camera reference is not available');
  }

  try {
    // Capture with higher quality and better settings
    const photo = await cameraRef.current.takePictureAsync({
      quality,
      base64: false,
      skipProcessing: skipProcessing,
      onShutter,
    });

    return photo.uri;
  } catch (error) {
    console.error('Camera capture failed:', error);
    throw error;
  }
}

/**
 * Log image metadata for debugging camera vs picker differences
 */
export function logImageMetadata(
  metadata: ImageMetadata,
  additionalInfo?: Record<string, any>
) {
  console.log('=== Image Metadata ===');
  console.log('Source:', metadata.source);
  console.log('Dimensions:', `${metadata.width}x${metadata.height}`);
  console.log('URI:', metadata.uri);
  if (metadata.fileSize) {
    console.log('File size:', `${(metadata.fileSize / 1024).toFixed(2)} KB`);
  }
  if (additionalInfo) {
    Object.entries(additionalInfo).forEach(([key, value]) => {
      console.log(`${key}:`, value);
    });
  }
  console.log('===================');
}
