import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { House, CalendarDays, Dumbbell, BookOpen, ChartNoAxesCombined } from 'lucide-react-native';
import { useTheme, Typography } from '../../src/theme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          ...Typography.tabLabel,
          marginTop: 2,
        },
        tabBarInactiveTintColor: colors.inkMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarActiveTintColor: colors.ink,
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color, size }) => <House size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarActiveTintColor: colors.ink,
          tabBarAccessibilityLabel: 'Planner and timetable tab',
          tabBarIcon: ({ color, size }) => <CalendarDays size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="gym"
        options={{
          title: 'Gym',
          tabBarActiveTintColor: colors.orange,
          tabBarAccessibilityLabel: 'Gym workout workspace tab',
          tabBarIcon: ({ color, size }) => <Dumbbell size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="academics"
        options={{
          title: 'Academics',
          tabBarActiveTintColor: colors.green,
          tabBarAccessibilityLabel: 'Academics and curriculum tab',
          tabBarIcon: ({ color, size }) => <BookOpen size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarActiveTintColor: colors.ink,
          tabBarAccessibilityLabel: 'Consistency statistics and analytics tab',
          tabBarIcon: ({ color, size }) => <ChartNoAxesCombined size={22} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
