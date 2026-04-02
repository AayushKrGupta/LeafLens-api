import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { Image as ImageIcon, Search, CheckCircle2, TrendingUp, AlertCircle, X } from 'lucide-react-native';
import { predictLeaf, PredictionResult } from '@/utils/api';
import { saveHistory } from '@/utils/history';
import { preprocessImage, logImageMetadata, ImageMetadata } from '@/utils/imageProcessing';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');

/**
 * LeafLens - Gallery Image Picker & Prediction Screen
 */
export default function PickerScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const theme = Colors.dark;

  const pickImage = async () => {
    // Reset state
    setResult(null);
    setError(null);
    setProcessedImage(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85, // Match camera quality
    });

    if (!result.canceled) {
      const selectedUri = result.assets[0].uri;
      setImage(selectedUri);
      
      // Preprocess the image using the same pipeline as camera
      try {
        const processed = await preprocessImage(selectedUri, 'picker', debugMode);
        setProcessedImage(processed.uri);
        
        // Log metadata for debugging
        const metadata: ImageMetadata = {
          width: processed.width,
          height: processed.height,
          uri: processed.uri,
          source: 'picker',
        };
        
        if (debugMode) {
          logImageMetadata(metadata, { originalUri: selectedUri });
        }
      } catch (error) {
        console.error('Image preprocessing failed:', error);
        // Fallback to original URI if preprocessing fails
        setProcessedImage(selectedUri);
      }
    }
  };

  const analyzeImage = async () => {
    if (!processedImage) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      
      // Use the same API function as camera with debug mode
      const prediction = await predictLeaf(processedImage, 'leaf.jpg', 'image/jpeg', debugMode);
      setResult(prediction);
      
      // Save locally
      await saveHistory({
        ...prediction,
        imageUri: image!, // We know image is not null here
      });

    } catch (err: any) {
      setError(err?.message || 'Something went wrong during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearSelection = () => {
    setImage(null);
    setProcessedImage(null);
    setResult(null);
    setError(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Select from</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Gallery</Text>
        </View>

        {/* Image Preview / Upload Card */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={!image ? pickImage : undefined}
          style={[
            styles.uploadCard, 
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            image && styles.uploadCardActive
          ]}
        >
          {image ? (
            <View style={styles.previewWrapper}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity style={styles.clearBtn} onPress={clearSelection}>
                <BlurView intensity={60} tint="dark" style={styles.clearBtnBlur}>
                  <X size={20} color="#fff" />
                </BlurView>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <View style={[styles.uploadIconContainer, { backgroundColor: theme.glow }]}>
                <ImageIcon size={40} color={theme.accent} />
              </View>
              <Text style={[styles.uploadText, { color: theme.textSecondary }]}>
                Choose a leaf image to start analysis
              </Text>
              <TouchableOpacity style={[styles.pickBtn, { backgroundColor: theme.accent }]} onPress={pickImage}>
                <Text style={styles.pickBtnText}>Select Image</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* Action Buttons */}
        {image && !result && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.analyzeBtn, { backgroundColor: theme.accent }]} 
              onPress={analyzeImage}
              disabled={isAnalyzing || !processedImage}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Search size={22} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.analyzeBtnText}>Analyze Leaf</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.debugBtn, { backgroundColor: debugMode ? theme.accent : 'rgba(255,255,255,0.1)' }]} 
              onPress={() => setDebugMode(!debugMode)}
            >
              <AlertCircle size={16} color={debugMode ? '#fff' : theme.textSecondary} />
              <Text style={[styles.debugBtnText, { color: debugMode ? '#fff' : theme.textSecondary }]}>
                Debug {debugMode ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Result Summary */}
        {result && (
          <View style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.resultHeader}>
              <CheckCircle2 size={32} color={theme.success} />
              <Text style={[styles.resultTitle, { color: theme.text }]}>Leaf Data Parsed</Text>
            </View>

            <View style={styles.dataRow}>
              <View style={styles.dataItem}>
                <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>Plant</Text>
                <Text style={[styles.dataValue, { color: theme.text }]}>{result.plant}</Text>
              </View>
              <View style={[styles.dataItem, { alignItems: 'flex-end' }]}>
                <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>Confidence</Text>
                <Text style={[styles.dataValue, { color: theme.accent }]}>
                  {(result.confidence * 100).toFixed(1)}%
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.conditionBox}>
              <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>Condition</Text>
              <View style={styles.conditionRow}>
                <Text style={[styles.conditionText, { color: result.condition === 'Healthy' ? theme.success : theme.error }]}>
                  {result.condition}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.newBtn} onPress={clearSelection}>
              <Text style={[styles.newBtnText, { color: theme.accent }]}>Clear and pick another</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <AlertCircle size={24} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          </View>
        )}

        {/* Extra padding for bottom bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  uploadCard: {
    height: width - 48,
    borderRadius: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 24,
  },
  uploadCardActive: {
    borderStyle: 'solid',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    padding: 40,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  pickBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pickBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  previewWrapper: {
    width: '100%',
    height: '100%',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  clearBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  clearBtnBlur: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  analyzeBtn: {
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButtons: {
    marginBottom: 32,
  },
  debugBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'center',
  },
  debugBtnText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  analyzeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultCard: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dataItem: {
    flex: 1,
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  conditionBox: {
    marginBottom: 24,
  },
  conditionRow: {
    marginTop: 4,
  },
  conditionText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  newBtn: {
    alignItems: 'center',
  },
  newBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
  },
  errorText: {
    marginLeft: 10,
    fontWeight: '500',
    fontSize: 14,
    flex: 1,
  },
});
