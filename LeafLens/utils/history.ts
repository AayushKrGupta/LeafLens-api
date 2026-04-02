import AsyncStorage from '@react-native-async-storage/async-storage';
import { PredictionResult } from './api';

const HISTORY_KEY = '@leaflens_history';

export interface HistoryItem extends PredictionResult {
  id: string;
  timestamp: number;
  imageUri: string;
}

export async function saveHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): Promise<HistoryItem> {
  try {
    const history = await getHistory();
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    
    const updatedHistory = [newItem, ...history];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    return newItem;
  } catch (error) {
    console.error('Failed to save history:', error);
    throw error;
  }
}

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(HISTORY_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}

export interface Stats {
  totalScans: number;
  avgConfidence: number;
  recentTrends: number[];
}

export async function getStats(): Promise<Stats> {
  const history = await getHistory();
  if (history.length === 0) {
    return { totalScans: 0, avgConfidence: 0, recentTrends: [] };
  }

  const totalScans = history.length;
  const avgConfidence = history.reduce((acc, item) => acc + item.confidence, 0) / totalScans;
  
  // Last 7 scans confidence for trends
  const recentTrends = history.slice(0, 7).reverse().map(item => item.confidence * 100);

  return {
    totalScans,
    avgConfidence,
    recentTrends,
  };
}
