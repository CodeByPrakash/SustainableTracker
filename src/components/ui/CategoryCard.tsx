import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Typography, Spacing, Radius } from '../../theme';

interface CategoryCardProps {
  title: string;
  status: string;
  icon: LucideIcon;
  accentColor: string;
  softColor: string;
  onPress: () => void;
}

export function CategoryCard({
  title,
  status,
  icon: Icon,
  accentColor,
  softColor,
  onPress,
}: CategoryCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: softColor,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accentColor + '1A' }]}>
        <Icon size={22} color={accentColor} />
      </View>
      <Text
        style={[Typography.sectionTitle, { color: accentColor, marginTop: Spacing.md }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text
        style={[Typography.captionSmall, { color: colors.inkMuted, marginTop: Spacing.xs }]}
        numberOfLines={1}
      >
        {status}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.card,
    padding: Spacing.base,
    minHeight: 120,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
