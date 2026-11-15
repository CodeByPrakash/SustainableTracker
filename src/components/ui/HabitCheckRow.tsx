import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Typography, Spacing } from '../../theme';

type HabitStatus = 'done' | 'partial' | 'missed' | 'pending';

interface HabitCheckRowProps {
  name: string;
  status: HabitStatus;
  onToggle: (nextStatus: HabitStatus) => void;
  groupColor?: string;
}

const NEXT_STATUS: Record<HabitStatus, HabitStatus> = {
  pending: 'done',
  done: 'missed',
  missed: 'pending',
  partial: 'done',
};

export function HabitCheckRow({
  name,
  status,
  onToggle,
  groupColor,
}: HabitCheckRowProps) {
  const { colors } = useTheme();

  const handleToggle = useCallback(() => {
    onToggle(NEXT_STATUS[status]);
  }, [status, onToggle]);

  const renderStatusIcon = () => {
    const size = 28;
    const half = size / 2;

    switch (status) {
      case 'done':
        return (
          <View
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: half,
                backgroundColor: colors.success,
              },
            ]}
          >
            <Check size={16} color="#FFFFFF" strokeWidth={3} />
          </View>
        );
      case 'missed':
        return (
          <View
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: half,
                borderWidth: 2,
                borderColor: colors.danger,
                backgroundColor: 'transparent',
              },
            ]}
          >
            <X size={14} color={colors.danger} strokeWidth={3} />
          </View>
        );
      case 'partial':
        return (
          <View
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: half,
                backgroundColor: colors.warning + '30',
                borderWidth: 2,
                borderColor: colors.warning,
              },
            ]}
          >
            <Check size={14} color={colors.warning} strokeWidth={3} />
          </View>
        );
      default: // pending
        return (
          <View
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: half,
                borderWidth: 2,
                borderColor: colors.line,
                backgroundColor: 'transparent',
              },
            ]}
          />
        );
    }
  };

  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      {groupColor ? (
        <View style={[styles.colorDot, { backgroundColor: groupColor }]} />
      ) : null}
      <Text
        style={[
          Typography.body,
          {
            color: status === 'done' ? colors.inkMuted : colors.ink,
            flex: 1,
            textDecorationLine: status === 'done' ? 'line-through' : 'none',
          },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Pressable
        onPress={handleToggle}
        hitSlop={8}
        accessible={true}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: status === 'done' }}
        accessibilityLabel={`${name}, currently ${status}`}
        accessibilityHint="Double tap to cycle status between done, missed, and pending"
        style={({ pressed }) => [
          styles.toggleTarget,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        {renderStatusIcon()}
      </Pressable>
    </View>
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
  toggleTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
