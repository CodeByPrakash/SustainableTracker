import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme, Typography, Spacing, Radius } from '../../theme';

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  status: 'completed' | 'partial' | 'missed' | 'none';
  label?: string; // e.g. "Nov 14: Completed (5/5)"
}

interface ConsistencyHeatmapProps {
  days: HeatmapDay[];
  category?: 'all' | 'gym' | 'academics';
  weeksCount?: number;
}

export const ConsistencyHeatmap: React.FC<ConsistencyHeatmapProps> = ({
  days,
  category = 'all',
  weeksCount = 5,
}) => {
  const { colors } = useTheme();
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  const getCellColor = (status: HeatmapDay['status']) => {
    const isGym = category === 'gym';
    switch (status) {
      case 'completed':
        return isGym ? colors.orange : colors.green;
      case 'partial':
        return isGym ? colors.orangeSoft : colors.greenSoft;
      case 'missed':
        return colors.inkMuted;
      case 'none':
      default:
        return colors.surfaceMuted;
    }
  };

  // Group into columns of 7 days (Monday to Sunday)
  const columns: HeatmapDay[][] = [];
  let currentCol: HeatmapDay[] = [];

  days.forEach((day, index) => {
    currentCol.push(day);
    if (currentCol.length === 7 || index === days.length - 1) {
      columns.push(currentCol);
      currentCol = [];
    }
  });

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Consistency heatmap chart, showing ${days.length} days of history`}
    >
      {selectedDay && (
        <View
          style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.line }]}
          accessible={true}
          accessibilityLiveRegion="polite"
        >
          <Text style={[Typography.captionSmall, { color: colors.ink }]}>
            {selectedDay.label || `${selectedDay.date}: ${selectedDay.status}`}
          </Text>
        </View>
      )}

      <View style={styles.gridRow}>
        {/* Day-of-week labels */}
        <View style={styles.labelCol} importantForAccessibility="no-hide-descendants">
          {dayLabels.map((lbl, i) => (
            <Text key={i} style={[styles.dayLabel, { color: colors.inkMuted }]}>
              {lbl}
            </Text>
          ))}
        </View>

        {/* Heatmap Columns */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.columnsWrapper}>
          {columns.map((col, colIdx) => (
            <View key={colIdx} style={styles.column}>
              {col.map((day, rowIdx) => {
                const isSelected = selectedDay?.date === day.date;
                return (
                  <Pressable
                    key={rowIdx}
                    onPress={() => setSelectedDay(isSelected ? null : day)}
                    hitSlop={6}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.date}: ${day.status}`}
                    accessibilityHint="Double tap to see date details"
                    style={[
                      styles.cell,
                      {
                        backgroundColor: getCellColor(day.status),
                        borderColor: isSelected ? colors.ink : 'transparent',
                        borderWidth: isSelected ? 1.5 : 0,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: category === 'gym' ? colors.orange : colors.green }]} />
          <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>Completed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: category === 'gym' ? colors.orangeSoft : colors.greenSoft }]} />
          <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>Partial</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.inkMuted }]} />
          <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>Missed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.surfaceMuted }]} />
          <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>Rest / Off</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: Spacing.sm,
  },
  infoBanner: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    alignSelf: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelCol: {
    marginRight: Spacing.xs,
    justifyContent: 'space-between',
    height: 126,
  },
  dayLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  columnsWrapper: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  column: {
    marginRight: 4,
    justifyContent: 'space-between',
    height: 126,
  },
  cell: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
