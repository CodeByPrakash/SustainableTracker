import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Typography, Spacing, Radius } from '../../theme';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon size={48} color={colors.inkMuted} opacity={0.4} />
      </View>
      <Text style={[Typography.sectionTitle, { color: colors.ink, marginTop: Spacing.lg }]}>
        {title}
      </Text>
      <Text
        style={[
          Typography.body,
          {
            color: colors.inkMuted,
            marginTop: Spacing.sm,
            textAlign: 'center',
            maxWidth: 260,
          },
        ]}
      >
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: colors.orange,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[Typography.button, { color: '#FFFFFF' }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
  },
  iconWrap: {
    marginBottom: Spacing.xs,
  },
  actionButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.button,
  },
});
