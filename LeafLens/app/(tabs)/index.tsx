import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Activity, Leaf, ScanSearch, History as HistoryIcon, TrendingUp, Target, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { getHistory, getStats, HistoryItem, Stats } from '@/utils/history';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');

/**
 * LeafLens - Premium Performance Dashboard
 */
export default function HomeScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const theme = Colors.dark;

  const loadData = useCallback(async () => {
    const [historyData, statsData] = await Promise.all([getHistory(), getStats()]);
    setHistory(historyData);
    setStats(statsData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Chart configuration
  const chartData = useMemo(() => {
    const data = stats?.recentTrends && stats.recentTrends.length > 1 
      ? stats.recentTrends 
      : [0, 0, 0, 0, 0, 0, 0]; // Default placeholder
      
    return {
      labels: Array(data.length).fill('').map((_, i) => `${i + 1}`),
      datasets: [{
        data: data,
        color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
        strokeWidth: 3
      }]
    };
  }, [stats]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.iconGlow, { backgroundColor: theme.glow }]}>
        <ScanSearch size={48} color={theme.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Insights Yet</Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        Start by scanning a leaf to track your plant health and prediction accuracy.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Leaf Lens</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Analytics</Text>
          </View>
          <View style={[styles.profileButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Image 
              source={require('@/assets/images/LeafLens.png')} 
              style={styles.headerLogo} 
            />
          </View>
        </View>

        {history.length > 0 ? (
          <>
            {/* Primary Stats Grid */}
            <View style={styles.statsRow}>
              <View style={[styles.statCardFull, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.statIconBadge}>
                  <ShieldCheck size={20} color={theme.success} />
                </View>
                <View>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Average Prediction Accuracy</Text>
                  <View style={styles.statValueRow}>
                    <Text style={[styles.statValueLarge, { color: theme.text }]}>
                      {((stats?.avgConfidence || 0) * 100).toFixed(1)}%
                    </Text>
                    <View style={styles.trendBadge}>
                      <TrendingUp size={12} color={theme.success} />
                      <Text style={[styles.trendText, { color: theme.success }]}>+2.4%</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statCardSmall, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={[styles.miniIcon, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                  <Target size={16} color={theme.accent} />
                </View>
                <Text style={[styles.statValueSmall, { color: theme.text }]}>{stats?.totalScans || 0}</Text>
                <Text style={[styles.statLabelSmall, { color: theme.textSecondary }]}>Total Scans</Text>
              </View>
              <View style={[styles.statCardSmall, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={[styles.miniIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Activity size={16} color={theme.success} />
                </View>
                <Text style={[styles.statValueSmall, { color: theme.text }]}>Healthy</Text>
                <Text style={[styles.statLabelSmall, { color: theme.textSecondary }]}>Avg. Status</Text>
              </View>
            </View>

            {/* Performance Chart */}
            <View style={[styles.chartContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Confidence Trend</Text>
                <View style={styles.chartPeriod}>
                  <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>LAST 7 SCANS</Text>
                </View>
              </View>
              
              <LineChart
                data={chartData}
                width={width - 50}
                height={180}
                chartConfig={{
                  backgroundColor: theme.card,
                  backgroundGradientFrom: theme.card,
                  backgroundGradientTo: theme.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: theme.accent
                  }
                }}
                bezier
                style={styles.chartStyle}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLabels={false}
              />
            </View>

            {/* Scan History Section */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent History</Text>
              <TouchableOpacity onPress={() => router.push('/history')}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 13, marginRight: 2 }}>View All</Text>
                  <ChevronRight size={14} color={theme.accent} />
                </View>
              </TouchableOpacity>
            </View>

            {history.slice(0, 5).map((item) => (
              <TouchableOpacity 
                key={item.id} 
                activeOpacity={0.7}
                style={[styles.historyItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <View style={styles.imageContainer}>
                  <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
                  <View style={[styles.imageOverlay, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemPlant, { color: theme.text }]} numberOfLines={1}>{item.plant}</Text>
                  <View style={styles.conditionRow}>
                    <View style={[styles.statusDotSmall, { backgroundColor: item.confidence > 0.85 ? theme.success : '#F59E0B' }]} />
                    <Text style={[styles.itemCondition, { color: theme.textSecondary }]} numberOfLines={1}>{item.condition}</Text>
                  </View>
                </View>
                <View style={styles.itemMeta}>
                  <View style={[styles.confidenceBadge, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                    <Text style={[styles.itemConfidence, { color: theme.accent }]}>
                      {(item.confidence * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <Text style={[styles.itemTime, { color: theme.textSecondary }]}>
                    {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : renderEmptyState()}
        
        {/* Extra space for floating bottom bar */}
        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: Platform.OS === 'android' ? 20 : 0,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCardFull: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  statIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statCardSmall: {
    width: (width - 55) / 2,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValueLarge: {
    fontSize: 28,
    fontWeight: '800',
    marginRight: 10,
  },
  statValueSmall: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabelSmall: {
    fontSize: 12,
    fontWeight: '500',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  chartContainer: {
    padding: 20,
    borderRadius: 28,
    borderWidth: 1.5,
    marginBottom: 24,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartPeriod: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
    marginLeft: -15, // Offset chart kit default padding
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 18,
    marginRight: 14,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemPlant: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  itemCondition: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemMeta: {
    alignItems: 'flex-end',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 6,
  },
  itemConfidence: {
    fontSize: 14,
    fontWeight: '800',
  },
  itemTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  iconGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
