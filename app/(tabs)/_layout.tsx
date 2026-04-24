import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#60A5FA' : '#3B82F6',
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 15,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -4,
        },
      }}>
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={24} name={focused ? "clock.fill" : "clock"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jadwal"
        options={{
          title: 'Jadwal',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={24} name={focused ? "calendar" : "calendar"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={32}
              name={focused ? "house.fill" : "house"}
              color={color}
              style={focused ? styles.homeIconActive : {}}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Tugas',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={24} name={focused ? "doc.text.fill" : "doc.text"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={24} name={focused ? "person.fill" : "person"} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  homeIconActive: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
