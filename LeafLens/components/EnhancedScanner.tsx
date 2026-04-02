import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { X, Zap, RotateCcw, CheckCircle2, TrendingUp, AlertTriangle, Crop, Camera as CameraIcon, RefreshCw } from 'lucide-react-native';
import { predictLeaf, PredictionResult, ApiError } from '@/utils/api';
import { saveHistory } from '@/utils/history';
import { preprocessImage, capturePhotoWithQuality, logImageMetadata, ImageMetadata } from '@/utils/imageProcessing';
import Colors from '@/constants/Colors';

const { width, height } = Dimensions.get('window');
const CAMERA_CROP_PRESETS = [
  { key: 'tight', label: 'Tight', cropScale: 0.5 },
  { key: 'balanced', label: 'Balanced', cropScale: 0.72 },
  { key: 'wide', label: 'Wide', cropScale: 0.9 },
] as const;
type CameraCropPresetKey = typeof CAMERA_CROP_PRESETS[number]['key'];

interface ScannerProps {
  onScanComplete?: (result: PredictionResult) => void;
}

/**
 * Enhanced LeafLens Camera Scanner with preview, cropping, and unified preprocessing
 */
export default function EnhancedScannerScreen({ onScanComplete }: ScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [cropPreset, setCropPreset] = useState<CameraCropPresetKey>('balanced');
  
  const cameraRef = useRef<any>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const theme = Colors.dark;

  // Scan line animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 240,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <AlertTriangle size={48} color={theme.accent} style={{ marginBottom: 16 }} />
        <Text style={[styles.permissionText, { color: theme.text }]}>Camera access needed</Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.accent }]} 
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const preprocessCapturedImage = async (
    photoUri: string,
    presetKey: CameraCropPresetKey,
    debugOverride: boolean = debugMode
  ) => {
    const preset = CAMERA_CROP_PRESETS.find((item) => item.key === presetKey) ?? CAMERA_CROP_PRESETS[1];
    const processed = await preprocessImage(photoUri, 'camera', debugOverride, {
      cropScale: preset.cropScale,
      maxSize: 1024,
    });
    setProcessedImage(processed.uri);

    if (debugOverride) {
      const metadata: ImageMetadata = {
        width: processed.width,
        height: processed.height,
        uri: processed.uri,
        source: 'camera',
      };
      logImageMetadata(metadata, { originalUri: photoUri, cropPreset: preset.label });
    }

    return processed;
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsPreparingImage(true);
      setError(null);
      setResult(null);
      setProcessedImage(null);
      setCropPreset('balanced');
      
      // Capture with higher quality
      const photoUri = await capturePhotoWithQuality(cameraRef, {
        quality: 1,
        onShutter: () => {
          // Optional: Add haptic feedback here
        }
      });

      setCapturedImage(photoUri);
      setShowPreview(true);
      
      // Preprocess the image using the default balanced crop preset
      await preprocessCapturedImage(photoUri, 'balanced');
      setIsPreparingImage(false);

    } catch (err: any) {
      console.error('Camera capture error:', err);
      setError(err?.message || 'Failed to capture photo. Please try again.');
      setIsPreparingImage(false);
    }
  };

  const analyzeImage = async () => {
    if (!processedImage) {
      setError('Image is still being prepared. Please wait a moment and try again.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      // Use the same API function as picker
      const prediction = await predictLeaf(processedImage, 'leaf.jpg', 'image/jpeg', debugMode);
      setResult(prediction);
      
      // Save to history
      await saveHistory({
        ...prediction,
        imageUri: capturedImage!, // Save original for display
      });

      if (onScanComplete) {
        onScanComplete(prediction);
      }

    } catch (err: any) {
      console.error('Prediction error:', err);
      setError(err?.message || 'Failed to analyze leaf. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setShowPreview(false);
    setResult(null);
    setError(null);
    setCropPreset('balanced');
    setIsPreparingImage(false);
    setIsAnalyzing(false);
  };

  const changeCropPreset = async (presetKey: CameraCropPresetKey) => {
    if (!capturedImage || presetKey === cropPreset) return;

    try {
      setCropPreset(presetKey);
      setIsPreparingImage(true);
      setError(null);
      await preprocessCapturedImage(capturedImage, presetKey);
    } catch (err: any) {
      console.error('Crop update error:', err);
      setError(err?.message || 'Failed to update crop. Please try again.');
    } finally {
      setIsPreparingImage(false);
    }
  };

  const confirmAndAnalyze = () => {
    if (!processedImage || isPreparingImage) {
      return;
    }
    setShowPreview(false);
    analyzeImage();
  };

  const resetScanner = () => {
    setResult(null);
    setCapturedImage(null);
    setProcessedImage(null);
    setShowPreview(false);
    setError(null);
    setIsPreparingImage(false);
    setIsAnalyzing(false);
  };

  // Preview modal after capture
  if (showPreview && capturedImage) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.previewContainer}>
          <Image source={{ uri: processedImage || capturedImage }} style={styles.previewImage} />
          
          {/* Preview overlay with controls */}
          <View style={styles.previewOverlay}>
            <View style={styles.previewHeader}>
              <TouchableOpacity onPress={retakePhoto} style={styles.previewControlBtn}>
                <RefreshCw size={24} color="#fff" />
                <Text style={styles.previewControlText}>Retake</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setDebugMode(!debugMode)} 
                style={[styles.previewControlBtn, debugMode && styles.debugBtn]}
              >
                <AlertTriangle size={24} color={debugMode ? theme.accent : "#fff"} />
                <Text style={styles.previewControlText}>Debug</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.previewFooter}>
              <Text style={styles.previewInstruction}>
                {debugMode ? 'Debug mode ON' : 'Review your leaf photo'}
              </Text>

              <View style={styles.cropPresetRow}>
                {CAMERA_CROP_PRESETS.map((preset) => {
                  const isActive = cropPreset === preset.key;
                  return (
                    <TouchableOpacity
                      key={preset.key}
                      onPress={() => changeCropPreset(preset.key)}
                      disabled={isPreparingImage || isAnalyzing}
                      style={[
                        styles.cropPresetButton,
                        {
                          backgroundColor: isActive ? theme.accent : 'rgba(255,255,255,0.08)',
                          borderColor: isActive ? theme.accent : 'rgba(255,255,255,0.12)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cropPresetText,
                          { color: isActive ? '#fff' : theme.textSecondary },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.cropHint}>
                Tight crop usually works best when the leaf fills the frame.
              </Text>
              
              <TouchableOpacity
                onPress={confirmAndAnalyze}
                disabled={isPreparingImage || isAnalyzing || !processedImage}
                style={[styles.analyzeBtn, { backgroundColor: theme.accent }]}
              >
                {isPreparingImage ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.analyzeBtnText}> Preparing Photo...</Text>
                  </>
                ) : isAnalyzing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <TrendingUp size={22} color="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.analyzeBtnText}>Analyze Leaf</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!capturedImage ? (
        <CameraView
          style={styles.camera}
          ref={cameraRef}
          facing={cameraType}
          enableTorch={flash === 'on'}
        >
          <View style={styles.overlay}>
            {/* Top Controls */}
            <SafeAreaOverlay style={styles.topControls}>
              <TouchableOpacity onPress={() => setFlash(flash === 'off' ? 'on' : 'off')} style={styles.controlIcon}>
                <Zap size={24} color={flash === 'on' ? theme.accent : '#fff'} fill={flash === 'on' ? theme.accent : 'transparent'} />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>LeafLens Scanner</Text>
              <TouchableOpacity onPress={() => setCameraType(cameraType === 'back' ? 'front' : 'back')} style={styles.controlIcon}>
                <RotateCcw size={24} color="#fff" />
              </TouchableOpacity>
            </SafeAreaOverlay>

            {/* Enhanced Scan Frame with guidance */}
            <View style={styles.frameContainer}>
              <View style={[styles.scanFrame, { borderColor: theme.accent }]}>
                <Animated.View 
                  style={[
                    styles.scanLine, 
                    { 
                      backgroundColor: theme.accent,
                      transform: [{ translateY: scanLineAnim }]
                    }
                  ]} 
                />
                {/* Corner indicators */}
                <View style={[styles.corner, styles.topLeft, { borderColor: theme.accent }]} />
                <View style={[styles.corner, styles.topRight, { borderColor: theme.accent }]} />
                <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.accent }]} />
                <View style={[styles.corner, styles.bottomRight, { borderColor: theme.accent }]} />
              </View>
              
              {/* Enhanced instructions */}
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionTitle}>Position leaf inside frame</Text>
                <Text style={styles.instructionSubtext}>• Fill most of the frame with the leaf</Text>
                <Text style={styles.instructionSubtext}>• Use good lighting</Text>
                <Text style={styles.instructionSubtext}>• Avoid cluttered backgrounds</Text>
              </View>
            </View>

            {/* Bottom Capture */}
            <View style={styles.bottomControls}>
              <TouchableOpacity
                onPress={takePicture}
                disabled={isPreparingImage || isAnalyzing}
                style={[styles.captureButton, { borderColor: theme.accent }]}
              >
                <View style={[styles.captureInner, { backgroundColor: theme.accent }]} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          {isAnalyzing && (
            <BlurView intensity={20} style={StyleSheet.absoluteFill}>
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[styles.processingText, { color: theme.text }]}>Analyzing Leaf Data...</Text>
              </View>
            </BlurView>
          )}
        </View>
      )}

      {/* Result Modal */}
      <Modal
        visible={result !== null || error !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={resetScanner}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="dark" style={styles.modalContent}>
            <TouchableOpacity onPress={resetScanner} style={styles.closeButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>

            {result ? (
              <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                  <CheckCircle2 size={40} color={theme.success} />
                  <Text style={[styles.resultTitle, { color: theme.text }]}>Prediction Ready</Text>
                </View>

                <View style={[styles.mainResultCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.plantLabel, { color: theme.textSecondary }]}>Plant</Text>
                  <Text style={[styles.plantName, { color: theme.text }]}>{result.plant}</Text>
                  
                  <View style={styles.divider} />
                  
                  <Text style={[styles.conditionLabel, { color: theme.textSecondary }]}>Condition</Text>
                  <Text style={[styles.conditionValue, { color: result.condition === 'Healthy' ? theme.success : theme.error }]}>
                    {result.condition}
                  </Text>
                  
                  <View style={styles.confidenceBadge}>
                    <TrendingUp size={16} color={theme.accent} style={{ marginRight: 6 }} />
                    <Text style={[styles.confidenceText, { color: theme.accent }]}>
                      {(result.confidence * 100).toFixed(1)}% Confidence
                    </Text>
                  </View>
                </View>

                <Text style={[styles.topKTitle, { color: theme.text }]}>Top Predictions</Text>
                {result.top_k.slice(0, 3).map((item, idx) => (
                  <View key={idx} style={[styles.topKRow, { borderBottomColor: theme.cardBorder }]}>
                    <Text style={[styles.topKName, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.plant} - {item.condition}
                    </Text>
                    <Text style={[styles.topKValue, { color: theme.accent }]}>
                      {(item.confidence * 100).toFixed(0)}%
                    </Text>
                  </View>
                ))}

                <TouchableOpacity 
                  style={[styles.doneButton, { backgroundColor: theme.accent }]}
                  onPress={resetScanner}
                >
                  <Text style={styles.buttonText}>New Scan</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.errorContainer}>
                <AlertTriangle size={60} color={theme.error} />
                <Text style={[styles.errorTitle, { color: theme.text }]}>Scan Failed</Text>
                <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
                <TouchableOpacity 
                  style={[styles.doneButton, { backgroundColor: theme.accent }]}
                  onPress={resetScanner}
                >
                  <Text style={styles.buttonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const SafeAreaOverlay = ({ children, style }: any) => (
  <View style={[{ paddingTop: Platform.OS === 'ios' ? 60 : 40 }, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  controlIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  scanFrame: {
    width: 280,
    height: 280,
    borderWidth: 2,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
  },
  scanLine: {
    height: 2,
    width: '100%',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topLeft: {
    top: -2,
    left: -2,
  },
  topRight: {
    top: -2,
    right: -2,
    transform: [{ rotate: '90deg' }],
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    transform: [{ rotate: '-90deg' }],
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    transform: [{ rotate: '180deg' }],
  },
  instructionContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  instructionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  bottomControls: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
    backgroundColor: '#050816',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  previewControlBtn: {
    alignItems: 'center',
    padding: 8,
  },
  previewControlText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  debugBtn: {
    backgroundColor: 'rgba(79, 70, 229, 0.3)',
    borderRadius: 8,
  },
  previewFooter: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  cropPresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  cropPresetButton: {
    minWidth: 86,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cropPresetText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cropHint: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  previewInstruction: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  analyzeBtn: {
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  analyzeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  processingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 32,
    minHeight: height * 0.65,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    right: 24,
    top: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContainer: {
    marginTop: 20,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  mainResultCard: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  plantLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  plantName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  conditionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  conditionValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  topKTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  topKRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topKName: {
    fontSize: 14,
    flex: 1,
  },
  topKValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  doneButton: {
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
});
