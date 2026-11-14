import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Typography, Spacing } from '../../theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  accentColor,
}: SectionHeaderProps) {
  const { colors } = useTheme();
  const accent = accentColor ?? colors.orange;

  return (
    <View style={styles.container}>
      <Text style={[Typography.sectionTitle, { color: colors.ink, flex: 1 }]}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={[Typography.caption, { color: accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    marginBottom: Spacing.md,
  },
});
