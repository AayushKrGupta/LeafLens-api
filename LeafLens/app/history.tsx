import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Trash2, Calendar, ShieldCheck, Activity } from 'lucide-react-native';
import { getHistory, HistoryItem, clearHistory } from '@/utils/history';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');

/**
 * LeafLens - Full History Screen
 * A high-quality list showing all plant scans with detailed status indicators.
 */
export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const theme = Colors.dark;

  const loadData = useCallback(async () => {
    const data = await getHistory();
    setHistory(data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleClear = async () => {
    await clearHistory();
    setHistory([]);
  };

  const renderItem = (item: HistoryItem) => (
    <TouchableOpacity 
      key={item.id} 
      activeOpacity={0.7}
      style={[styles.historyItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
        <View style={[styles.imageOverlay, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemPlant, { color: theme.text }]} numberOfLines={1}>{item.plant}</Text>
        <View style={styles.conditionRow}>
          <View style={[styles.statusDot, { backgroundColor: item.confidence > 0.85 ? theme.success : '#F59E0B' }]} />
          <Text style={[styles.itemCondition, { color: theme.textSecondary }]} numberOfLines={1}>{item.condition}</Text>
        </View>
        <View style={styles.dateRow}>
          <Calendar size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.itemDate, { color: theme.textSecondary }]}>
            {new Date(item.timestamp).toLocaleDateString(undefined, { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric' 
            })}
          </Text>
        </View>
      </View>
      <View style={styles.itemMeta}>
        <View style={[styles.confidenceBadge, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
          <Text style={[styles.itemConfidence, { color: theme.accent }]}>
            {(item.confidence * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Scan History</Text>
        <TouchableOpacity 
          onPress={handleClear}
          style={[styles.clearButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
        >
          <Trash2 size={20} color={theme.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
        }
      >
        {history.length > 0 ? (
          <>
            <View style={styles.statsOverview}>
              <View style={[styles.miniStat, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Activity size={16} color={theme.accent} />
                <Text style={[styles.miniStatText, { color: theme.textSecondary }]}>Total: <Text style={{ color: theme.text, fontWeight: '700' }}>{history.length}</Text></Text>
              </View>
              <View style={[styles.miniStat, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <ShieldCheck size={16} color={theme.success} />
                <Text style={[styles.miniStatText, { color: theme.textSecondary }]}>Verified Scans</Text>
              </View>
            </View>

            {history.map(renderItem)}
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.glow }]}>
              <Calendar size={40} color={theme.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>History is Empty</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              All your future plant scans and diagnoses will appear here.
            </Text>
            <TouchableOpacity 
              style={[styles.scanNowButton, { backgroundColor: theme.accent }]}
              onPress={() => router.push('/scanner')}
            >
              <Text style={styles.scanNowText}>Start Scanning</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  statsOverview: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  miniStatText: {
    fontSize: 13,
    fontWeight: '500',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: 68,
    height: 68,
    borderRadius: 18,
    marginRight: 16,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  itemInfo: {
    flex: 1,
  },
  itemPlant: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  itemCondition: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemMeta: {
    alignItems: 'flex-end',
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itemConfidence: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  scanNowButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  scanNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
