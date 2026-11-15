import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChartNoAxesCombined,
  Info,
  Dumbbell,
  BookOpen,
  CheckCircle2,
  Code2,
  Calendar,
  Flame,
  Award,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../../src/theme';
import { getDatabase } from '../../src/db/database';
import {
  getOverallConsistency,
  getGymConsistency,
  getAcademicConsistency,
  getHabitCompletionRate,
  getRealWeeklyTrends,
  getRealHeatmap,
} from '../../src/db/queries/statsQueries';
import { getToday } from '../../src/utils/dateUtils';
import { MetricCard } from '../../src/components/ui/MetricCard';
import { ConsistencyHeatmap, HeatmapDay } from '../../src/components/charts/ConsistencyHeatmap';
import { TrendLineChart, LinePoint } from '../../src/components/charts/TrendLineChart';
import { WeeklyBarChart, BarDataPoint } from '../../src/components/charts/WeeklyBarChart';
import { useAppStore } from '../../src/stores/appStore';

type PeriodFilter = 'week' | 'month' | '3months' | 'year';
type CategoryFilter = 'all' | 'gym' | 'academics' | 'habits';

export default function StatsScreen() {
  const { colors } = useTheme();
  const refreshKey = useAppStore((state) => state.refreshKey);

  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  // Consistency values — purely real calculations, 0% when no commitments done yet
  const [overallRate, setOverallRate] = useState(0);
  const [gymRate, setGymRate] = useState(0);
  const [academicRate, setAcademicRate] = useState(0);
  const [habitRate, setHabitRate] = useState(0);
  const [trendPoints, setTrendPoints] = useState<LinePoint[]>([]);
  const [heatmapDays, setHeatmapDays] = useState<HeatmapDay[]>([]);

  const todayStr = getToday();

  const loadStats = useCallback(async () => {
    try {
      const db = await getDatabase();
      const now = new Date();
      let daysBack = 30;
      if (period === 'week') daysBack = 7;
      if (period === '3months') daysBack = 90;
      if (period === 'year') daysBack = 365;

      const startDateObj = new Date();
      startDateObj.setDate(now.getDate() - daysBack);
      const startStr = startDateObj.toISOString().split('T')[0];

      const [overall, gym, acad, habit, trends, heatmap] = await Promise.all([
        getOverallConsistency(db, startStr, todayStr),
        getGymConsistency(db, startStr, todayStr),
        getAcademicConsistency(db, startStr, todayStr),
        getHabitCompletionRate(db, startStr, todayStr),
        getRealWeeklyTrends(db),
        getRealHeatmap(db, category, todayStr),
      ]);

      // Real calculated rates with zero fake fallback
      setOverallRate(Math.round(overall * 100));
      setGymRate(Math.round(gym * 100));
      setAcademicRate(Math.round(acad * 100));
      setHabitRate(Math.round(habit * 100));
      setTrendPoints(trends);
      setHeatmapDays(heatmap);
    } catch (err) {
      console.error('Failed to load consistency statistics:', err);
    }
  }, [period, category, todayStr]);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshKey]);

  // Category comparison bar data
  const categoryBarData: BarDataPoint[] = [
    { label: 'Gym', value: gymRate, unit: '%' },
    { label: 'Acad', value: academicRate, unit: '%' },
    { label: 'Habits', value: habitRate, unit: '%' },
    { label: 'Overall', value: overallRate, unit: '%' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[Typography.screenTitle, { color: colors.ink }]}>Stats & Analytics</Text>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginTop: 2 }]}>
            Truthful, offline discipline metrics
          </Text>
        </View>
        <Pressable
          style={[styles.infoToggleBtn, { backgroundColor: colors.surface, borderColor: colors.line }]}
          onPress={() => setShowFormulaInfo(!showFormulaInfo)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={showFormulaInfo ? "Hide formula calculation details" : "Show formula calculation details"}
          hitSlop={8}
        >
          <Info size={18} color={showFormulaInfo ? colors.orange : colors.inkMuted} />
        </Pressable>
      </View>

      {/* Period Filter Strip */}
      <View style={styles.filterStrip}>
        {(['week', 'month', '3months', 'year'] as PeriodFilter[]).map((p) => {
          const isSelected = period === p;
          return (
            <Pressable
              key={p}
              accessible={true}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Period: ${p === '3months' ? '3 Months' : p}`}
              hitSlop={6}
              style={[
                styles.periodPill,
                {
                  backgroundColor: isSelected ? colors.ink : colors.surface,
                  borderColor: isSelected ? colors.ink : colors.line,
                },
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  Typography.captionSmall,
                  {
                    color: isSelected ? '#FFFFFF' : colors.inkMuted,
                    fontWeight: isSelected ? '700' : '500',
                    textTransform: 'capitalize',
                  },
                ]}
              >
                {p === '3months' ? '3 Months' : p}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Math & Truthful Calculation Disclaimer Card */}
        {showFormulaInfo && (
          <View style={[styles.formulaCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}>
            <View style={styles.formulaTitleRow}>
              <Award size={18} color={colors.ink} />
              <Text style={[Typography.sectionTitle, { color: colors.ink, marginLeft: 6 }]}>
                Integrity in Tracking
              </Text>
            </View>
            <Text style={[Typography.caption, { color: colors.inkMuted, marginTop: 4 }]}>
              • Habit Completion: Completed habits ÷ eligible scheduled habits × 100.{'\n'}
              • Gym Consistency: Completed workouts ÷ planned workout days × 100.{'\n'}
              • Academic Consistency: Days with study sessions ÷ planned study days × 100.{'\n'}
              • Paused habits and rest days never count as missed.
            </Text>
          </View>
        )}

        {/* Consistency Metric Highlights */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Overall Consistency"
            value={`${overallRate}%`}
            subtitle="All commitments"
            icon={Flame}
            accentColor={colors.orange}
          />
          <MetricCard
            title="Gym Adherence"
            value={`${gymRate}%`}
            subtitle="Split workouts"
            icon={Dumbbell}
            accentColor={colors.orange}
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            title="Academic Focus"
            value={`${academicRate}%`}
            subtitle="Study targets"
            icon={BookOpen}
            accentColor={colors.green}
          />
          <MetricCard
            title="Habit Completion"
            value={`${habitRate}%`}
            subtitle="Routines & Skincare"
            icon={CheckCircle2}
            accentColor={colors.warning}
          />
        </View>

        {/* Category Heatmap Filter */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Consistency Heatmap</Text>
        </View>
        <View style={styles.categoryPillsRow}>
          {(['all', 'gym', 'academics', 'habits'] as CategoryFilter[]).map((c) => {
            const isSelected = category === c;
            let activeColor: string = colors.ink;
            if (c === 'gym') activeColor = colors.orange;
            if (c === 'academics') activeColor = colors.green;
            return (
              <Pressable
                key={c}
                accessible={true}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Category filter: ${c}`}
                hitSlop={6}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: isSelected ? activeColor : colors.surface,
                    borderColor: isSelected ? activeColor : colors.line,
                  },
                ]}
                onPress={() => setCategory(c)}
              >
                <Text
                  style={[
                    Typography.captionSmall,
                    {
                      color: isSelected ? '#FFFFFF' : colors.inkMuted,
                      fontWeight: isSelected ? '700' : '500',
                      textTransform: 'capitalize',
                    },
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Heatmap Card */}
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <ConsistencyHeatmap
            days={heatmapDays}
            category={category === 'gym' ? 'gym' : category === 'academics' ? 'academics' : 'all'}
          />
        </View>

        {/* Completion Trend Line Chart */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Completion Trend</Text>
          <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>Weekly Averages</Text>
        </View>
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <TrendLineChart
            data={trendPoints}
            color={category === 'academics' ? colors.green : colors.orange}
            unit="%"
          />
        </View>

        {/* Category Comparison Bar Chart */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Category Comparison</Text>
        </View>
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <WeeklyBarChart data={categoryBarData} color={colors.ink} unit="%" maxValue={100} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xs,
  },
  infoToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterStrip: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  periodPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
  },
  formulaCard: {
    padding: Spacing.base,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  formulaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chartCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.base,
    alignItems: 'center',
  },
});
