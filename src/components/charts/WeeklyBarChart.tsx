import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useTheme, Typography, Spacing, Radius } from '../../theme';

export interface BarDataPoint {
  label: string; // e.g. 'Mon'
  value: number; // e.g. 1.5 (hours) or 4 (sets)
  fullLabel?: string; // e.g. 'Monday'
  unit?: string; // e.g. 'hrs', 'workouts'
}

interface WeeklyBarChartProps {
  data: BarDataPoint[];
  color?: string;
  height?: number;
  unit?: string;
  maxValue?: number;
}

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({
  data,
  color,
  height = 180,
  unit = '',
  maxValue,
}) => {
  const { colors } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const barColor = color || colors.orange;
  const calculatedMax = Math.max(...data.map((d) => d.value), 1);
  const max = maxValue ? Math.max(maxValue, calculatedMax) : calculatedMax;

  const chartHeight = height - 40; // reserve space for labels
  const barWidth = 24;
  const chartWidth = 300;
  const spacing = (chartWidth - barWidth * data.length) / (data.length + 1);

  return (
    <View style={styles.container}>
      {selectedIdx !== null && data[selectedIdx] && (
        <View style={[styles.tooltip, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
            {data[selectedIdx].fullLabel || data[selectedIdx].label}
          </Text>
          <Text style={[Typography.sectionTitle, { color: barColor }]}>
            {data[selectedIdx].value} {data[selectedIdx].unit || unit}
          </Text>
        </View>
      )}

      <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        {/* Baseline grid */}
        <Line
          x1={0}
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          stroke={colors.line}
          strokeWidth={1}
        />
        {/* Mid grid */}
        <Line
          x1={0}
          y1={chartHeight / 2}
          x2={chartWidth}
          y2={chartHeight / 2}
          stroke={colors.line}
          strokeDasharray="4, 4"
          strokeWidth={0.8}
        />

        {data.map((d, i) => {
          const x = spacing + i * (barWidth + spacing);
          const barH = max > 0 ? (d.value / max) * (chartHeight - 16) : 0;
          const y = chartHeight - barH;
          const isSelected = selectedIdx === i;

          return (
            <React.Fragment key={i}>
              {/* Bar background slot */}
              <Rect
                x={x}
                y={8}
                width={barWidth}
                height={chartHeight - 8}
                rx={6}
                fill={colors.surfaceMuted}
                opacity={0.3}
              />
              {/* Active Bar */}
              {barH > 0 && (
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={6}
                  fill={barColor}
                  opacity={isSelected ? 1 : 0.85}
                  onPress={() => setSelectedIdx(isSelected ? null : i)}
                />
              )}
              {/* Day Label */}
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight + 20}
                fontSize="12"
                fill={isSelected ? barColor : colors.inkMuted}
                textAnchor="middle"
                fontWeight={isSelected ? '700' : '500'}
              >
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  tooltip: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
});
