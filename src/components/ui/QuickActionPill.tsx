import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Typography, Spacing, Radius } from '../../theme';

interface QuickActionPillProps {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  accentColor?: string;
}

export function QuickActionPill({
  label,
  icon: Icon,
  onPress,
  accentColor,
}: QuickActionPillProps) {
  const { colors } = useTheme();
  const accent = accentColor ?? colors.orange;

  return (
    <Pressable
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: accent + '14',
          borderColor: accent + '30',
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Icon size={16} color={accent} />
      <Text
        style={[
          Typography.caption,
          { color: accent, marginLeft: Spacing.sm },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    minHeight: 44,
  },
});
