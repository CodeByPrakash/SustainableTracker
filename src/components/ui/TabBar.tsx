import React from 'react';
import { ScrollView, Text, Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Typography, Spacing } from '../../theme';

interface TabBarProps {
  tabs: string[];
  activeTab: number;
  onTabChange: (index: number) => void;
  accentColor: string;
}

export function TabBar({ tabs, activeTab, onTabChange, accentColor }: TabBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.line }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => onTabChange(index)}
              style={({ pressed }) => [
                styles.tab,
                {
                  borderBottomColor: isActive ? accentColor : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  isActive ? Typography.bodyMedium : Typography.body,
                  { color: isActive ? accentColor : colors.inkMuted },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
  },
  tab: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 2,
    marginRight: Spacing.sm,
  },
});
