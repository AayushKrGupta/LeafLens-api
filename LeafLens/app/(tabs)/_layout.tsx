import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Camera, Image as ImageIcon } from 'lucide-react-native';
import Colors from '@/constants/Colors';

/**
 * Spotify-inspired Bottom Navigation Bar
 * Optimized for a sleek, single-line experience with a subtle top-faded gradient.
 */
export default function TabLayout() {
  const theme = Colors.dark;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF', // Spotify uses white for active
        tabBarInactiveTintColor: '#B3B3B3', // Spotify gray
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 88 : 72,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {/* The "opacity changing from bottom to top" effect using a gradient */}
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.8)', 'rgba(0,0,0,1)']}
              locations={[0, 0.3, 1]}
              style={StyleSheet.absoluteFill}
            />
            {Platform.OS === 'ios' && (
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
            )}
          </View>
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home 
              size={24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2} 
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color, focused }) => (
             <Camera 
               size={24} 
               color={color} 
               strokeWidth={focused ? 2.5 : 2} 
             />
          ),
        }}
      />

      <Tabs.Screen
        name="picker"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color, focused }) => (
            <ImageIcon 
              size={24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
