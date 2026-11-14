import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Dumbbell,
  Play,
  History,
  TrendingUp,
  Scale,
  Plus,
  Flame,
  CheckCircle,
  Timer,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../../src/theme';
import { getDatabase } from '../../src/db/database';
import {
  getWorkoutPlanForDay,
  getWorkoutHistory,
  getBodyWeight,
  logBodyWeight,
  addExerciseToPlan,
  updateWorkoutPlan,
  deleteExercise,
  applyCalibrationFor55Kg,
  WorkoutPlan,
  Exercise,
  WorkoutSession,
  BodyMeasurement,
} from '../../src/db/queries/workoutQueries';
import { getToday, formatDate, getStartOfWeek, formatDateDisplay, formatDurationHuman, DAY_NAMES } from '../../src/utils/dateUtils';
import { TabBar } from '../../src/components/ui/TabBar';
import { MetricCard } from '../../src/components/ui/MetricCard';
import { WeeklyBarChart } from '../../src/components/charts/WeeklyBarChart';
import { TrendLineChart } from '../../src/components/charts/TrendLineChart';
import { ConsistencyHeatmap, HeatmapDay } from '../../src/components/charts/ConsistencyHeatmap';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAppStore } from '../../src/stores/appStore';

export default function GymScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const refreshKey = useAppStore((state) => state.refreshKey);
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);

  const [activeTab, setActiveTab] = useState(0); // 0: Overview, 1: Workout, 2: Progress, 3: History
  const [todaysPlan, setTodaysPlan] = useState<(WorkoutPlan & { exercises: Exercise[] }) | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [latestWeight, setLatestWeight] = useState<BodyMeasurement | null>(null);
  const [weightLogs, setWeightLogs] = useState<BodyMeasurement[]>([]);

  // Body weight bottom sheet
  const [weightSheetVisible, setWeightSheetVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  // Add Exercise Sheet
  const [addExSheetVisible, setAddExSheetVisible] = useState(false);
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('3');
  const [exReps, setExReps] = useState('10');
  const [exWeight, setExWeight] = useState('20');
  const [exCategory, setExCategory] = useState('general');

  // Edit Split Sheet
  const [editSplitVisible, setEditSplitVisible] = useState(false);
  const [editSplitDay, setEditSplitDay] = useState<number>(1);
  const [editSplitName, setEditSplitName] = useState('');
  const [editSplitFocus, setEditSplitFocus] = useState('');

  const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1=Mon ... 7=Sun

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [plan, hist, weight, allWeights] = await Promise.all([
        getWorkoutPlanForDay(db, todayDow),
        getWorkoutHistory(db, 20),
        getBodyWeight(db),
        db.getAllAsync<BodyMeasurement>(
          'SELECT * FROM body_measurements ORDER BY date ASC LIMIT 30'
        ),
      ]);
      setTodaysPlan(plan);
      setHistory(hist);
      setLatestWeight(weight);
      setWeightLogs(allWeights);
    } catch (err) {
      console.error('Failed to load gym data:', err);
    }
  }, [todayDow]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Save body weight
  const handleSaveWeight = async () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0 || val > 300) {
      Alert.alert('Invalid Weight', 'Please enter a valid body weight in kg.');
      return;
    }
    try {
      const db = await getDatabase();
      await logBodyWeight(db, val, getToday());
      setWeightSheetVisible(false);
      setWeightInput('');
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to log weight:', err);
    }
  };

  // Add Exercise to Plan
  const handleAddExercise = async () => {
    if (!todaysPlan || !exName.trim()) {
      Alert.alert('Required', 'Please enter an exercise name.');
      return;
    }
    try {
      const db = await getDatabase();
      await addExerciseToPlan(
        db,
        todaysPlan.id,
        exName.trim(),
        exCategory,
        parseInt(exSets, 10) || 3,
        parseInt(exReps, 10) || 10,
        parseFloat(exWeight) || 20
      );
      setAddExSheetVisible(false);
      setExName('');
      setExWeight('20');
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to add exercise:', err);
    }
  };

  // Re-calibrate Split for 55kg
  const handleRecalibrate55Kg = async () => {
    try {
      const db = await getDatabase();
      await applyCalibrationFor55Kg(db);
      await loadData();
      triggerRefresh();
      Alert.alert('Calibrated', 'All default sets, reps, and weights have been calibrated for 55 kg body weight.');
    } catch (err) {
      console.error('Failed to recalibrate:', err);
    }
  };

  // Save Split Edit
  const handleSaveSplit = async () => {
    if (!editSplitName.trim()) {
      Alert.alert('Required', 'Please enter a split name.');
      return;
    }
    try {
      const db = await getDatabase();
      const plan = await db.getFirstAsync<WorkoutPlan>(
        'SELECT * FROM workout_plans WHERE day_of_week = ?',
        [editSplitDay]
      );
      if (plan) {
        await updateWorkoutPlan(db, plan.id, editSplitName.trim(), editSplitFocus.trim());
      }
      setEditSplitVisible(false);
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to update split:', err);
    }
  };

  const tabs = ['Overview', 'Workout', 'Progress', 'History'];

  // Mock sample heatmap & bar data based on actual db history
  const historyDates = new Set(history.map((h) => h.date));
  const todayStr = getToday();

  // 35 days for heatmap
  const heatmapDays: HeatmapDay[] = Array.from({ length: 35 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (34 - i));
    const ds = d.toISOString().split('T')[0];
    const isLogged = historyDates.has(ds);
    const dow = d.getDay();
    const isSunday = dow === 0;

    let status: HeatmapDay['status'] = 'none';
    if (isLogged) {
      status = 'completed';
    } else if (isSunday) {
      status = 'none'; // Rest day
    } else if (d < new Date(todayStr)) {
      status = 'missed';
    }

    return {
      date: ds,
      status,
      label: `${ds}: ${isLogged ? 'Completed' : isSunday ? 'Rest Day' : 'No workout'}`,
    };
  });

  // Calculate real weekly bar data for current week (Mon..Sun)
  const monday = getStartOfWeek(new Date());
  const currentWeekMondayStr = formatDate(monday);
  const workoutsThisWeek = history.filter((h) => h.date >= currentWeekMondayStr && h.is_completed).length;

  const weeklyBarData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    const dayStr = formatDate(dayDate);
    const isCompleted = historyDates.has(dayStr) ? 1 : 0;
    return {
      label,
      value: isCompleted,
      fullLabel: `${label} (${isCompleted ? 'Completed' : 'Rest/Pending'})`,
    };
  });

  // Real weight progression line data
  const weightLineData = weightLogs.map((w) => ({
    label: w.date.slice(5),
    value: w.weight_kg ?? 55,
  }));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <Text style={[Typography.screenTitle, { color: colors.orangeDark }]}>Gym Workspace</Text>
            <View style={[styles.activeSplitBadge, { backgroundColor: colors.orangeSoft }]}>
              <Flame size={14} color={colors.orange} />
              <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', marginLeft: 4 }]}>
                Athletic Orange
              </Text>
            </View>
          </View>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginTop: 2 }]}>
            {DAY_NAMES[todayDow - 1]}'s Split: {todaysPlan?.focus || 'Rest & Recovery'}
          </Text>
        </View>

        <Pressable
          style={[styles.startWorkoutButton, { backgroundColor: colors.orange }]}
          onPress={() => router.push('/workout-active')}
        >
          <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={[Typography.button, { color: '#FFFFFF', marginLeft: 6 }]}>Train</Text>
        </Pressable>
      </View>

      {/* Sub Tabs */}
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={colors.orange}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TAB 0: OVERVIEW */}
        {activeTab === 0 && (
          <View style={styles.tabContent}>
            {/* Split Banner */}
            <View style={[styles.splitCard, { backgroundColor: colors.orangeSoft, borderColor: colors.orange }]}>
              <View>
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, textTransform: 'uppercase', letterSpacing: 1 }]}>
                  Today's Training Focus
                </Text>
                <Text style={[Typography.screenTitle, { color: colors.orangeDark, marginTop: 2 }]}>
                  {todaysPlan?.name || 'Active Recovery'}
                </Text>
                <Text style={[Typography.body, { color: colors.ink, marginTop: 4 }]}>
                  {todaysPlan?.focus || 'Take rest or perform light mobility.'}
                </Text>
              </View>
              <Pressable
                style={[styles.trainPill, { backgroundColor: colors.orange }]}
                onPress={() => router.push('/workout-active')}
              >
                <Text style={[Typography.button, { color: '#FFFFFF' }]}>Start Now</Text>
              </Pressable>
            </View>

            {/* Metrics Grid */}
            <View style={styles.metricsGrid}>
              <MetricCard
                title="Workouts This Week"
                value={workoutsThisWeek}
                subtitle="Target: 5 sessions"
                icon={Dumbbell}
                accentColor={colors.orange}
              />
              <MetricCard
                title="Body Weight"
                value={latestWeight ? `${latestWeight.weight_kg} kg` : '55.0 kg'}
                subtitle={latestWeight ? 'Tap to update' : 'Baseline 55 kg'}
                icon={Scale}
                accentColor={colors.orange}
                onPress={() => setWeightSheetVisible(true)}
              />
            </View>

            {/* 55kg Calibration Banner */}
            <View style={[styles.calibrationBanner, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700' }]}>
                  CALIBRATED FOR 55 KG BODY WEIGHT
                </Text>
                <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginTop: 2 }]}>
                  Sets, reps, and baseline weights optimized for progressive overload.
                </Text>
              </View>
              <Pressable
                style={[styles.recalibrateBtn, { backgroundColor: colors.orange }]}
                onPress={handleRecalibrate55Kg}
              >
                <RefreshCw size={12} color="#FFFFFF" />
                <Text style={[Typography.captionSmall, { color: '#FFFFFF', fontWeight: '700', marginLeft: 4 }]}>
                  Sync 55kg
                </Text>
              </Pressable>
            </View>

            {/* Weekly Plan Summary */}
            <View style={styles.sectionHeader}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Weekly Training Split</Text>
              <Pressable
                onPress={() => {
                  setEditSplitDay(todayDow);
                  setEditSplitName(todaysPlan?.name || '');
                  setEditSplitFocus(todaysPlan?.focus || '');
                  setEditSplitVisible(true);
                }}
              >
                <Text style={[Typography.caption, { color: colors.orange, fontWeight: '600' }]}>Edit Split</Text>
              </Pressable>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              {[
                { day: 'Mon', focus: 'Chest + Triceps' },
                { day: 'Tue', focus: 'Back + Biceps' },
                { day: 'Wed', focus: 'Legs + Abs' },
                { day: 'Thu', focus: 'Shoulders + Triceps' },
                { day: 'Fri', focus: 'Chest + Back' },
                { day: 'Sat', focus: 'Legs + Biceps + Abs' },
                { day: 'Sun', focus: 'Rest / Recovery' },
              ].map((item, idx) => {
                const isToday = idx + 1 === todayDow;
                return (
                  <View
                    key={item.day}
                    style={[
                      styles.splitRow,
                      { borderBottomColor: colors.line },
                      isToday && { backgroundColor: colors.orangeSoft + '60' },
                    ]}
                  >
                    <Text style={[Typography.bodyMedium, { color: isToday ? colors.orangeDark : colors.ink, width: 60 }]}>
                      {item.day}
                    </Text>
                    <Text style={[Typography.body, { color: isToday ? colors.orangeDark : colors.inkMuted, flex: 1 }]}>
                      {item.focus}
                    </Text>
                    {isToday && (
                      <View style={[styles.todayTag, { backgroundColor: colors.orange }]}>
                        <Text style={[Typography.captionSmall, { color: '#FFFFFF', fontWeight: '700' }]}>TODAY</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 1: WORKOUT */}
        {activeTab === 1 && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>
                {todaysPlan?.name} Exercises
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Pressable
                  style={[styles.smallActionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.orange }]}
                  onPress={() => setAddExSheetVisible(true)}
                >
                  <Plus size={14} color={colors.orange} />
                  <Text style={[Typography.captionSmall, { color: colors.orange, fontWeight: '700', marginLeft: 4 }]}>
                    Add
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.smallActionBtn, { backgroundColor: colors.orangeSoft }]}
                  onPress={() => router.push('/workout-active')}
                >
                  <Play size={14} color={colors.orangeDark} />
                  <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', marginLeft: 4 }]}>
                    Start
                  </Text>
                </Pressable>
              </View>
            </View>

            {todaysPlan?.exercises && todaysPlan.exercises.length > 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                {todaysPlan.exercises.map((ex, i) => (
                  <View key={ex.id} style={[styles.exerciseItem, { borderBottomColor: colors.line }]}>
                    <View style={styles.exNumber}>
                      <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700' }]}>
                        {i + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.bodyMedium, { color: colors.ink }]}>{ex.name}</Text>
                      <Text style={[Typography.caption, { color: colors.inkMuted }]}>
                        {ex.default_sets} sets × {ex.default_reps} reps • {ex.default_weight_kg ? `${ex.default_weight_kg} kg` : '20 kg'}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.quickLogSetBtn, { borderColor: colors.orange }]}
                      onPress={() => router.push('/workout-active')}
                    >
                      <Text style={[Typography.captionSmall, { color: colors.orange, fontWeight: '700' }]}>Log</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                icon={Dumbbell}
                title="Rest Day"
                message="No exercises prescribed for today. Enjoy your rest or take a walk!"
                actionLabel="Start Freestyle Workout"
                onAction={() => router.push('/workout-active')}
              />
            )}
          </View>
        )}

        {/* TAB 2: PROGRESS */}
        {activeTab === 2 && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Weekly Frequency</Text>
            </View>
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <WeeklyBarChart data={weeklyBarData} color={colors.orange} unit="session" />
            </View>

            <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Body Weight Progression</Text>
              <Pressable onPress={() => setWeightSheetVisible(true)}>
                <Text style={[Typography.caption, { color: colors.orange, fontWeight: '600' }]}>+ Log Weight</Text>
              </Pressable>
            </View>
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              {weightLineData.length > 0 ? (
                <TrendLineChart data={weightLineData} color={colors.orange} unit="kg" />
              ) : (
                <EmptyState
                  icon={Scale}
                  title="No Weight Records"
                  message="Log your body weight consistently to track progress."
                  actionLabel="Log Weight"
                  onAction={() => setWeightSheetVisible(true)}
                />
              )}
            </View>

            <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Monthly Workout Heatmap</Text>
            </View>
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <ConsistencyHeatmap days={heatmapDays} category="gym" />
            </View>
          </View>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 3 && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Workout Logs</Text>
            </View>

            {history.length === 0 ? (
              <EmptyState
                icon={History}
                title="No Workouts Yet"
                message="Your completed workout sessions will appear here with duration and sets."
                actionLabel="Log First Workout"
                onAction={() => router.push('/workout-active')}
              />
            ) : (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                {history.map((h) => (
                  <View key={h.id} style={[styles.historyRow, { borderBottomColor: colors.line }]}>
                    <View style={[styles.historyIcon, { backgroundColor: colors.orangeSoft }]}>
                      <Dumbbell size={18} color={colors.orangeDark} />
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Text style={[Typography.bodyMedium, { color: colors.ink }]}>{h.name}</Text>
                      <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                        {h.date} • {formatDurationHuman(h.duration_seconds || 1800)}
                      </Text>
                    </View>
                    <View style={styles.historyStatus}>
                      <CheckCircle size={16} color={colors.orange} />
                      <Text style={[Typography.captionSmall, { color: colors.orange, fontWeight: '700', marginLeft: 4 }]}>
                        Done
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Log Body Weight Bottom Sheet */}
      <BottomSheet
        visible={weightSheetVisible}
        onClose={() => setWeightSheetVisible(false)}
        title="Log Body Weight"
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 6 }]}>
            Current Weight in kg
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="numeric"
            placeholder={latestWeight?.weight_kg ? String(latestWeight.weight_kg) : '72.5'}
            placeholderTextColor={colors.inkMuted}
          />
          <Pressable
            style={[styles.saveWeightBtn, { backgroundColor: colors.orange }]}
            onPress={handleSaveWeight}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Save Weight Record</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Add Exercise Bottom Sheet */}
      <BottomSheet
        visible={addExSheetVisible}
        onClose={() => setAddExSheetVisible(false)}
        title={`Add Exercise to ${todaysPlan?.name || 'Workout'}`}
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Exercise Name
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={exName}
            onChangeText={setExName}
            placeholder="e.g. Romanian Deadlift, Lateral Raise"
            placeholderTextColor={colors.inkMuted}
          />

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Sets</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={exSets}
                onChangeText={setExSets}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Reps</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={exReps}
                onChangeText={setExReps}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Weight (kg)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={exWeight}
                onChangeText={setExWeight}
                keyboardType="numeric"
                placeholder="20"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
          </View>

          <Pressable
            style={[styles.saveWeightBtn, { backgroundColor: colors.orange, marginTop: Spacing.sm }]}
            onPress={handleAddExercise}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Add to Plan</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Edit Split Bottom Sheet */}
      <BottomSheet
        visible={editSplitVisible}
        onClose={() => setEditSplitVisible(false)}
        title="Edit Training Split"
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Day of Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
            {DAY_NAMES.map((name, idx) => {
              const dow = idx + 1;
              const isSel = editSplitDay === dow;
              return (
                <Pressable
                  key={name}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: isSel ? colors.orange : colors.surfaceMuted,
                      borderColor: isSel ? colors.orange : colors.line,
                    },
                  ]}
                  onPress={async () => {
                    setEditSplitDay(dow);
                    const db = await getDatabase();
                    const p = await db.getFirstAsync<WorkoutPlan>(
                      'SELECT * FROM workout_plans WHERE day_of_week = ?',
                      [dow]
                    );
                    if (p) {
                      setEditSplitName(p.name);
                      setEditSplitFocus(p.focus);
                    }
                  }}
                >
                  <Text style={[Typography.captionSmall, { color: isSel ? '#FFFFFF' : colors.ink }]}>
                    {name.slice(0, 3)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Workout Name
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={editSplitName}
            onChangeText={setEditSplitName}
            placeholder="e.g. Chest + Triceps"
            placeholderTextColor={colors.inkMuted}
          />

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Muscle Focus (Comma separated)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={editSplitFocus}
            onChangeText={setEditSplitFocus}
            placeholder="e.g. chest,triceps"
            placeholderTextColor={colors.inkMuted}
          />

          <Pressable
            style={[styles.saveWeightBtn, { backgroundColor: colors.orange, marginTop: Spacing.sm }]}
            onPress={handleSaveSplit}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Update Split</Text>
          </Pressable>
        </View>
      </BottomSheet>
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  activeSplitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: Radius.full,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  tabContent: {
    paddingBottom: Spacing.base,
  },
  splitCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: Radius.card,
    borderWidth: 1.5,
    marginBottom: Spacing.base,
  },
  trainPill: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: Radius.button,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  calibrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  recalibrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginLeft: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chartCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.base,
    alignItems: 'center',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  todayTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  exNumber: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: '#FCE7D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  quickLogSetBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetContent: {
    paddingVertical: Spacing.base,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    fontSize: 16,
    marginBottom: Spacing.base,
  },
  saveWeightBtn: {
    height: 48,
    borderRadius: Radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: 6,
  },
});
