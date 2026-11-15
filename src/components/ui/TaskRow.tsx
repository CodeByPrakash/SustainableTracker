import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Typography, Spacing, Radius } from '../../theme';

interface TaskRowProps {
  time: string;
  title: string;
  category: string;
  status: 'done' | 'pending' | 'active' | 'completed';
  isActive?: boolean;
  onToggle?: () => void;
  onPress?: () => void;
}

export function TaskRow({
  time,
  title,
  category,
  status,
  isActive,
  onToggle,
  onPress,
}: TaskRowProps) {
  const { colors } = useTheme();
  const done = status === 'done' || status === 'completed';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${time}, ${category}, ${done ? 'completed' : 'pending'}`}
      accessibilityHint={onPress ? 'Double tap to view or edit commitment' : undefined}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.line,
          backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
        },
        isActive && {
          borderLeftColor: colors.orange,
          borderLeftWidth: 3,
          paddingLeft: Spacing.base - 3,
        },
      ]}
    >
      {/* Time */}
      <View style={styles.timeColumn}>
        <Text
          style={[
            Typography.caption,
            { color: done ? colors.inkMuted : colors.ink },
          ]}
        >
          {time}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            Typography.body,
            {
              color: done ? colors.inkMuted : colors.ink,
              textDecorationLine: done ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={[Typography.captionSmall, { color: colors.inkMuted, marginTop: 2 }]}
          numberOfLines={1}
        >
          {category}
        </Text>
      </View>

      {/* Toggle */}
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        accessible={true}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${title}: ${done ? 'Completed' : 'Incomplete'}`}
        accessibilityHint="Double tap to toggle task completion"
        style={({ pressed }) => [
          styles.checkboxWrap,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: done ? colors.success : colors.line,
              backgroundColor: done ? colors.success : 'transparent',
            },
          ]}
        >
          {done && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  timeColumn: {
    width: 52,
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  checkboxWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
