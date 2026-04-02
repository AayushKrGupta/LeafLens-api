# LeafLens Camera vs Picker Prediction Fix

## Problem Summary
The React Native Expo app had inconsistent prediction quality between camera-captured images and gallery-picked images. Gallery images returned accurate predictions while camera images were often incorrect.

## Root Cause Analysis
1. **Different preprocessing pipelines**: Camera images went directly to API while picker images had built-in cropping and aspect ratio enforcement
2. **Quality differences**: Camera used 0.7 quality vs picker used 0.8 quality  
3. **No orientation handling**: Camera captures contained EXIF rotation metadata that wasn't normalized
4. **Missing preview/crop step**: Camera immediately processed without user confirmation
5. **Inconsistent API calls**: Different upload behavior between sources

## Implemented Solutions

### 1. Unified Image Preprocessing (`utils/imageProcessing.ts`)
- **Center cropping**: Both sources now get square center crops to focus on the leaf
- **Resizing**: All images resized to 224x224 (optimal for ML models)
- **Quality normalization**: Consistent 0.85 quality for both sources
- **Orientation handling**: EXIF rotation automatically corrected via expo-image-manipulator
- **Debug logging**: Optional metadata logging for troubleshooting

```typescript
export async function preprocessImage(
  imageUri: string,
  source: 'camera' | 'picker',
  debug: boolean = false
): Promise<ProcessedImageResult>
```

### 2. Enhanced Camera Scanner (`components/EnhancedScanner.tsx`)
- **Post-capture preview**: Shows image before analysis
- **Retake option**: Users can reshoot if needed  
- **Debug mode toggle**: Enable detailed logging
- **Better guidance**: Enhanced scan frame with corner indicators and detailed instructions
- **Higher quality capture**: 0.85 quality vs previous 0.7
- **Unified API calls**: Uses same preprocessing pipeline as picker

### 3. Updated Gallery Picker (`app/(tabs)/picker.tsx`)
- **Same preprocessing**: Now uses unified `preprocessImage` function
- **Debug mode**: Toggle for comparing camera vs picker behavior
- **Consistent quality**: Updated to 0.85 to match camera
- **Better error handling**: Graceful fallback if preprocessing fails

### 4. Enhanced API Utility (`utils/api.ts`)
- **Debug parameter**: Optional logging for API calls
- **Consistent uploads**: Same FormData structure for both sources
- **Better error reporting**: More detailed error messages

### 5. Improved Scanner UI
- **Enhanced guidance**: Multiple instruction lines:
  - "Position leaf inside frame"
  - "• Fill most of the frame with the leaf"  
  - "• Use good lighting"
  - "• Avoid cluttered backgrounds"
- **Corner indicators**: Visual frame corners for better alignment
- **Preview controls**: Retake and debug toggle in preview mode

## Technical Improvements

### Image Processing Pipeline
1. **Capture/Pick** → Original URI
2. **Preprocess** → Center crop → Resize to 224x224 → Normalize orientation
3. **Upload** → Consistent FormData with same field names
4. **Predict** → Backend receives standardized input

### Quality Settings
- **Before**: Camera 0.7, Picker 0.8
- **After**: Both 0.85 (higher quality, consistent)

### Debug Features
- **Metadata logging**: Image dimensions, URI, source, file size
- **API logging**: Upload details, response info, prediction results
- **Comparison mode**: Toggle debug on both camera and picker to compare

## Dependencies Added
```json
"expo-image-manipulator": "~13.0.9"
```

## Expected Results
1. **Consistent predictions**: Camera and picker should now produce similar accuracy
2. **Better user experience**: Preview before analysis, retake option
3. **Improved guidance**: Clear instructions for better image capture
4. **Debug capability**: Easy troubleshooting if issues persist
5. **Higher quality**: Better image quality for both sources

## Testing Recommendations
1. **A/B test**: Capture same leaf with camera and picker, compare results
2. **Debug mode**: Enable debug to verify preprocessing is working
3. **Edge cases**: Test with different lighting, angles, leaf sizes
4. **Performance**: Verify preprocessing doesn't cause significant delays

## Long-term Considerations
- **Model training**: If camera images still underperform, consider fine-tuning the model with real phone camera photos
- **Advanced cropping**: Could implement object detection for automatic leaf detection
- **Image enhancement**: Could add brightness/contrast adjustment for poor lighting conditions

## Files Modified
- ✅ `utils/imageProcessing.ts` - New unified preprocessing
- ✅ `components/EnhancedScanner.tsx` - New enhanced camera component  
- ✅ `app/(tabs)/scanner.tsx` - Updated to use enhanced scanner
- ✅ `app/(tabs)/picker.tsx` - Updated to use unified preprocessing
- ✅ `utils/api.ts` - Added debug logging
- ✅ `package.json` - Added expo-image-manipulator dependency

The camera prediction quality should now match picker performance with the same preprocessing pipeline, quality settings, and consistent API uploads.
