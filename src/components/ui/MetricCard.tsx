import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Typography, Spacing, Radius } from '../../theme';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  accentColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor,
  onPress,
  style,
}: MetricCardProps) {
  const { colors } = useTheme();
  const accent = accentColor ?? colors.orange;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {Icon ? (
        <View style={[styles.iconWrap, { backgroundColor: accent + '14' }]}>
          <Icon size={20} color={accent} />
        </View>
      ) : null}
      <Text style={[Typography.caption, { color: colors.inkMuted, marginTop: Spacing.sm }]}>
        {title}
      </Text>
      <Text style={[Typography.metric, { color: colors.ink, marginTop: Spacing.xs }]}>
        {value}
      </Text>
      {subtitle ? (
        <Text
          style={[Typography.captionSmall, { color: colors.inkMuted, marginTop: Spacing.xs }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.card,
    padding: Spacing.base,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
