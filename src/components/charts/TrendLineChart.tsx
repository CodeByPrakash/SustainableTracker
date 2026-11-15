import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme, Typography, Spacing, Radius } from '../../theme';

export interface LinePoint {
  label: string; // e.g. 'Nov 10'
  value: number; // e.g. 72.5
}

interface TrendLineChartProps {
  data: LinePoint[];
  color?: string;
  height?: number;
  unit?: string;
  showGradient?: boolean;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  color,
  height = 180,
  unit = '',
  showGradient = true,
}) => {
  const { colors } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const strokeColor = color || colors.orange;

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[Typography.body, { color: colors.inkMuted }]}>No records logged yet</Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const chartWidth = 320;
  const paddingH = 30;
  const paddingV = 24;
  const plotWidth = chartWidth - paddingH * 2;
  const plotHeight = height - paddingV * 2;

  const points = data.map((d, i) => {
    const x = paddingH + (data.length > 1 ? (i / (data.length - 1)) * plotWidth : plotWidth / 2);
    const y = paddingV + plotHeight - ((d.value - minVal) / valRange) * plotHeight;
    return { x, y, ...d };
  });

  // Construct SVG path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }

  // Area fill path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - 10} L ${points[0].x} ${height - 10} Z`;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Trend line chart with ${data.length} records. Latest value: ${data[data.length - 1]?.value} ${unit}`}
    >
      {selectedIdx !== null && data[selectedIdx] && (
        <View
          style={[styles.tooltip, { backgroundColor: colors.surface, borderColor: colors.line }]}
          accessible={true}
          accessibilityLiveRegion="polite"
        >
          <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
            {data[selectedIdx].label}
          </Text>
          <Text style={[Typography.sectionTitle, { color: strokeColor }]}>
            {data[selectedIdx].value} {unit}
          </Text>
        </View>
      )}

      <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Base Grid */}
        <Line
          x1={paddingH}
          y1={paddingV + plotHeight}
          x2={chartWidth - paddingH}
          y2={paddingV + plotHeight}
          stroke={colors.line}
          strokeWidth={1}
        />
        <Line
          x1={paddingH}
          y1={paddingV}
          x2={chartWidth - paddingH}
          y2={paddingV}
          stroke={colors.line}
          strokeDasharray="4, 4"
          strokeWidth={0.8}
        />

        {/* Area */}
        {showGradient && <Path d={areaD} fill="url(#areaGradient)" />}

        {/* Line */}
        <Path d={pathD} fill="none" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" />

        {/* Points */}
        {points.map((p, i) => {
          const isSelected = selectedIdx === i;
          return (
            <React.Fragment key={i}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={isSelected ? 6 : 4}
                fill={colors.surface}
                stroke={strokeColor}
                strokeWidth={2}
                onPress={() => setSelectedIdx(isSelected ? null : i)}
              />
              {/* Show date labels for first, middle, last */}
              {(i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1) && (
                <SvgText
                  x={p.x}
                  y={height - 2}
                  fontSize="11"
                  fill={colors.inkMuted}
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              )}
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
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
