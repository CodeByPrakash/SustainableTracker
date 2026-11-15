import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme';
import { Typography } from '../../theme';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  color,
  label,
  sublabel,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clampedProgress) }}
      accessibilityLabel={`${label || 'Progress'}: ${Math.round(clampedProgress)} percent${sublabel ? `, ${sublabel}` : ''}`}
    >
      <Svg width={size} height={size}>
        {/* Background trail circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeOpacity={0.1}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Active arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={[Typography.metric, { color: colors.ink }]}>
          {Math.round(clampedProgress)}%
        </Text>
        {label ? (
          <Text
            style={[Typography.captionSmall, { color: colors.inkMuted }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        ) : null}
        {sublabel ? (
          <Text
            style={[Typography.captionSmall, { color: colors.inkMuted, marginTop: 1 }]}
            numberOfLines={1}
          >
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
