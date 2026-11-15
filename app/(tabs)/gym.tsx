import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
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
  Edit2,
  Trash2,
  X,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../../src/theme';
import { getDatabase } from '../../src/db/database';
import {
  getWorkoutPlanForDay,
  getAllWorkoutPlans,
  createOrUpdateWorkoutPlanForDay,
  addExerciseToPlan,
  updateExercise,
  deleteExercise,
  getWorkoutHistory,
  getBodyWeight,
  logBodyWeight,
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
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { useAppStore } from '../../src/stores/appStore';

export default function GymScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const refreshKey = useAppStore((state) => state.refreshKey);
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);

  const [activeTab, setActiveTab] = useState(0); // 0: Overview, 1: Workout, 2: Progress, 3: History
  const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1=Mon ... 7=Sun
  const [selectedDay, setSelectedDay] = useState<number>(todayDow);

  const [todaysPlan, setTodaysPlan] = useState<(WorkoutPlan & { exercises: Exercise[] }) | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<(WorkoutPlan & { exercises: Exercise[] }) | null>(null);
  const [allPlans, setAllPlans] = useState<WorkoutPlan[]>([]);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [latestWeight, setLatestWeight] = useState<BodyMeasurement | null>(null);
  const [weightLogs, setWeightLogs] = useState<BodyMeasurement[]>([]);

  // Centered Modals
  // 1. Edit Split Modal
  const [editSplitVisible, setEditSplitVisible] = useState(false);
  const [editSplitDay, setEditSplitDay] = useState<number>(1);
  const [editSplitName, setEditSplitName] = useState('');
  const [editSplitFocus, setEditSplitFocus] = useState('');

  // 2. Add Exercise Modal
  const [addExModalVisible, setAddExModalVisible] = useState(false);
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('3');
  const [exReps, setExReps] = useState('10');
  const [exWeight, setExWeight] = useState('20');
  const [exCategory, setExCategory] = useState('general');

  // 3. Edit Exercise Modal
  const [editExModalVisible, setEditExModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editExName, setEditExName] = useState('');
  const [editExSets, setEditExSets] = useState('3');
  const [editExReps, setEditExReps] = useState('10');
  const [editExWeight, setEditExWeight] = useState('20');
  const [editExCategory, setEditExCategory] = useState('general');

  // 4. Delete Exercise Confirm
  const [deleteExConfirmVisible, setDeleteExConfirmVisible] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);

  // 5. Body weight Modal
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [todayPlan, currentSelectedPlan, plans, hist, weight, allWeights] = await Promise.all([
        getWorkoutPlanForDay(db, todayDow),
        getWorkoutPlanForDay(db, selectedDay),
        getAllWorkoutPlans(db),
        getWorkoutHistory(db, 20),
        getBodyWeight(db),
        db.getAllAsync<BodyMeasurement>(
          'SELECT * FROM body_measurements ORDER BY date ASC LIMIT 30'
        ),
      ]);
      setTodaysPlan(todayPlan);
      setSelectedPlan(currentSelectedPlan);
      setAllPlans(plans);
      setHistory(hist);
      setLatestWeight(weight);
      setWeightLogs(allWeights);
    } catch (err) {
      console.error('Failed to load gym data:', err);
    }
  }, [todayDow, selectedDay]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Open Edit Split for a specific day
  const openEditSplitForDay = async (dow: number) => {
    setEditSplitDay(dow);
    const existing = allPlans.find((p) => p.day_of_week === dow);
    if (existing) {
      setEditSplitName(existing.name);
      setEditSplitFocus(existing.focus);
    } else {
      const db = await getDatabase();
      const p = await db.getFirstAsync<WorkoutPlan>(
        'SELECT * FROM workout_plans WHERE day_of_week = ?',
        [dow]
      );
      setEditSplitName(p?.name || (dow === 7 ? 'Rest / Recovery' : 'Custom Split'));
      setEditSplitFocus(p?.focus || (dow === 7 ? 'rest' : 'general'));
    }
    setEditSplitVisible(true);
  };

  // Save Split Edit
  const handleSaveSplit = async () => {
    if (!editSplitName.trim()) {
      Alert.alert('Required', 'Please enter a split name.');
      return;
    }
    try {
      const db = await getDatabase();
      await createOrUpdateWorkoutPlanForDay(
        db,
        editSplitDay,
        editSplitName.trim(),
        editSplitFocus.trim()
      );
      setEditSplitVisible(false);
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to update split:', err);
    }
  };

  // Open Add Exercise Modal
  const openAddExercise = () => {
    setExName('');
    setExSets('3');
    setExReps('10');
    setExWeight('20');
    setExCategory('general');
    setAddExModalVisible(true);
  };

  // Add Exercise to Plan
  const handleAddExercise = async () => {
    if (!selectedPlan && !todaysPlan) {
      Alert.alert('No Plan', 'Please select or create a workout plan first.');
      return;
    }
    const targetPlan = selectedPlan || todaysPlan;
    if (!targetPlan || !exName.trim()) {
      Alert.alert('Required', 'Please enter an exercise name.');
      return;
    }
    try {
      const db = await getDatabase();
      await addExerciseToPlan(
        db,
        targetPlan.id,
        exName.trim(),
        exCategory,
        parseInt(exSets, 10) || 3,
        parseInt(exReps, 10) || 10,
        parseFloat(exWeight) || 20
      );
      setAddExModalVisible(false);
      setExName('');
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to add exercise:', err);
    }
  };

  // Open Edit Exercise Modal
  const openEditExercise = (ex: Exercise) => {
    setEditingExercise(ex);
    setEditExName(ex.name);
    setEditExCategory(ex.category || 'general');
    setEditExSets(String(ex.default_sets ?? 3));
    setEditExReps(String(ex.default_reps ?? 10));
    setEditExWeight(String(ex.default_weight_kg ?? 20));
    setEditExModalVisible(true);
  };

  // Save Edited Exercise
  const handleSaveEditExercise = async () => {
    if (!editingExercise || !editExName.trim()) {
      Alert.alert('Required', 'Please enter an exercise name.');
      return;
    }
    try {
      const db = await getDatabase();
      await updateExercise(
        db,
        editingExercise.id,
        editExName.trim(),
        editExCategory,
        parseInt(editExSets, 10) || 3,
        parseInt(editExReps, 10) || 10,
        parseFloat(editExWeight) || 20
      );
      setEditExModalVisible(false);
      setEditingExercise(null);
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to update exercise:', err);
    }
  };

  // Confirm and Delete Exercise
  const promptDeleteExercise = (ex: Exercise) => {
    setExerciseToDelete(ex);
    setDeleteExConfirmVisible(true);
  };

  const handleConfirmDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    try {
      const db = await getDatabase();
      await deleteExercise(db, exerciseToDelete.id);
      setDeleteExConfirmVisible(false);
      setExerciseToDelete(null);
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to delete exercise:', err);
    }
  };

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
      setWeightModalVisible(false);
      setWeightInput('');
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to log weight:', err);
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

  const tabs = ['Overview', 'Workout', 'Progress', 'History'];

  // History dates for heatmap & weekly chart
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

  // Current plan shown in Workout tab
  const activePlanInWorkout = selectedPlan || todaysPlan;

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
            {DAY_NAMES[todayDow - 1]}'s Split: {todaysPlan?.focus ? todaysPlan.focus.replace(/,/g, ' • ') : 'Rest & Recovery'}
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
        {/* ─── TAB 0: OVERVIEW ─── */}
        {activeTab === 0 && (
          <View style={styles.tabContent}>
            {/* Split Banner */}
            <View style={[styles.splitCard, { backgroundColor: colors.orangeSoft, borderColor: colors.orange }]}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, textTransform: 'uppercase', letterSpacing: 1 }]}>
                  Today's Training Focus
                </Text>
                <Text style={[Typography.screenTitle, { color: colors.orangeDark, marginTop: 2 }]}>
                  {todaysPlan?.name || 'Active Recovery'}
                </Text>
                <Text style={[Typography.body, { color: colors.ink, marginTop: 4, textTransform: 'capitalize' }]}>
                  {todaysPlan?.focus ? todaysPlan.focus.replace(/,/g, ' • ') : 'Take rest or perform light mobility.'}
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
                onPress={() => {
                  setWeightInput(latestWeight ? String(latestWeight.weight_kg) : '55');
                  setWeightModalVisible(true);
                }}
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

            {/* Weekly Training Split (100% Real & Editable) */}
            <View style={[styles.sectionHeader, { marginTop: Spacing.sm }]}>
              <View>
                <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Weekly Training Split</Text>
                <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginTop: 1 }]}>
                  Tap any day or pencil to customize your routine
                </Text>
              </View>
              <Pressable
                style={[styles.smallActionBtn, { backgroundColor: colors.orangeSoft }]}
                onPress={() => openEditSplitForDay(todayDow)}
              >
                <Edit2 size={13} color={colors.orangeDark} />
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', marginLeft: 4 }]}>
                  Edit Split
                </Text>
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              {DAY_NAMES.map((dayName, idx) => {
                const dow = idx + 1; // 1=Mon ... 7=Sun
                const isToday = dow === todayDow;
                const plan = allPlans.find((p) => p.day_of_week === dow);
                const planName = plan?.name || (dow === 7 ? 'Rest / Recovery' : 'Custom Split');
                const planFocus = plan?.focus || (dow === 7 ? 'Rest' : 'General');

                return (
                  <Pressable
                    key={dayName}
                    style={({ pressed }) => [
                      styles.splitRow,
                      { borderBottomColor: colors.line },
                      isToday && { backgroundColor: colors.orangeSoft + '40' },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => openEditSplitForDay(dow)}
                  >
                    <View style={[styles.splitDayBadge, { backgroundColor: isToday ? colors.orangeSoft : colors.surfaceMuted }]}>
                      <Text style={[Typography.bodyMedium, { color: isToday ? colors.orangeDark : colors.ink, fontWeight: '700' }]}>
                        {dayName.slice(0, 3)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: Spacing.sm }}>
                      <Text style={[Typography.bodyMedium, { color: isToday ? colors.orangeDark : colors.ink, fontWeight: '600' }]}>
                        {planName}
                      </Text>
                      <Text style={[Typography.caption, { color: colors.inkMuted, textTransform: 'capitalize' }]} numberOfLines={1}>
                        {planFocus.replace(/,/g, ' • ')}
                      </Text>
                    </View>
                    {isToday && (
                      <View style={[styles.todayTag, { backgroundColor: colors.orange, marginRight: Spacing.xs }]}>
                        <Text style={[Typography.captionSmall, { color: '#FFFFFF', fontWeight: '700', fontSize: 10 }]}>
                          TODAY
                        </Text>
                      </View>
                    )}
                    <Pressable
                      style={[styles.editIconBtn, { backgroundColor: colors.surfaceMuted }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        openEditSplitForDay(dow);
                      }}
                      hitSlop={8}
                    >
                      <Edit2 size={13} color={colors.inkMuted} />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── TAB 1: WORKOUT (VIEW & EDIT ANY DAY) ─── */}
        {activeTab === 1 && (
          <View style={styles.tabContent}>
            {/* Day Selector Pill Bar */}
            <View style={styles.daySelectorWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorScroll}>
                {DAY_NAMES.map((name, idx) => {
                  const dow = idx + 1;
                  const isSel = selectedDay === dow;
                  const isToday = dow === todayDow;
                  return (
                    <Pressable
                      key={name}
                      style={[
                        styles.daySelectorPill,
                        {
                          backgroundColor: isSel ? colors.orange : colors.surface,
                          borderColor: isSel ? colors.orange : colors.line,
                        },
                      ]}
                      onPress={() => setSelectedDay(dow)}
                    >
                      <Text
                        style={[
                          Typography.captionSmall,
                          {
                            color: isSel ? '#FFFFFF' : colors.ink,
                            fontWeight: isSel ? '700' : '500',
                          },
                        ]}
                      >
                        {name.slice(0, 3)}
                        {isToday ? ' •' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Split Info Bar for Selected Day */}
            <View style={[styles.selectedSplitHeaderCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', textTransform: 'uppercase' }]}>
                    {DAY_NAMES[selectedDay - 1]} ROUTINE
                  </Text>
                  {selectedDay === todayDow && (
                    <View style={[styles.todayTag, { backgroundColor: colors.orange }]}>
                      <Text style={[Typography.captionSmall, { color: '#FFFFFF', fontWeight: '700', fontSize: 9 }]}>
                        TODAY
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[Typography.sectionTitle, { color: colors.ink, marginTop: 2 }]}>
                  {activePlanInWorkout?.name || 'Rest / Recovery'}
                </Text>
                <Text style={[Typography.caption, { color: colors.inkMuted, textTransform: 'capitalize' }]}>
                  Focus: {activePlanInWorkout?.focus ? activePlanInWorkout.focus.replace(/,/g, ' • ') : 'Rest'}
                </Text>
              </View>

              <Pressable
                style={[styles.smallActionBtn, { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.line }]}
                onPress={() => openEditSplitForDay(selectedDay)}
              >
                <Edit2 size={13} color={colors.ink} />
                <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '600', marginLeft: 4 }]}>
                  Edit Split
                </Text>
              </Pressable>
            </View>

            {/* Action Bar: Add Exercise & Start */}
            <View style={styles.sectionHeader}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>
                Prescribed Exercises ({activePlanInWorkout?.exercises?.length || 0})
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Pressable
                  style={[styles.smallActionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.orange }]}
                  onPress={openAddExercise}
                >
                  <Plus size={14} color={colors.orange} />
                  <Text style={[Typography.captionSmall, { color: colors.orange, fontWeight: '700', marginLeft: 4 }]}>
                    Add Exercise
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

            {activePlanInWorkout?.exercises && activePlanInWorkout.exercises.length > 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                {activePlanInWorkout.exercises.map((ex, i) => (
                  <View key={ex.id} style={[styles.exerciseItem, { borderBottomColor: colors.line }]}>
                    <View style={styles.exNumber}>
                      <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700' }]}>
                        {i + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginRight: Spacing.xs }}>
                      <Text style={[Typography.bodyMedium, { color: colors.ink, fontWeight: '600' }]}>
                        {ex.name}
                      </Text>
                      <Text style={[Typography.caption, { color: colors.inkMuted }]}>
                        {ex.default_sets} sets × {ex.default_reps} reps • {ex.default_weight_kg ? `${ex.default_weight_kg} kg` : '20 kg'}
                      </Text>
                    </View>

                    {/* Action Buttons: Edit, Delete, Log */}
                    <View style={styles.exActionsRow}>
                      <Pressable
                        style={[styles.iconButtonSmall, { backgroundColor: colors.surfaceMuted }]}
                        onPress={() => openEditExercise(ex)}
                        hitSlop={8}
                      >
                        <Edit2 size={13} color={colors.ink} />
                      </Pressable>
                      <Pressable
                        style={[styles.iconButtonSmall, { backgroundColor: colors.surfaceMuted }]}
                        onPress={() => promptDeleteExercise(ex)}
                        hitSlop={8}
                      >
                        <Trash2 size={13} color={colors.danger} />
                      </Pressable>
                      <Pressable
                        style={[styles.quickLogSetBtn, { borderColor: colors.orange, backgroundColor: colors.orangeSoft }]}
                        onPress={() => router.push('/workout-active')}
                      >
                        <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700' }]}>Log</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                icon={Dumbbell}
                title="Rest or Empty Routine"
                message={`No exercises assigned for ${DAY_NAMES[selectedDay - 1]}. Tap "Add Exercise" to customize this workout.`}
                actionLabel="Add First Exercise"
                onAction={openAddExercise}
              />
            )}
          </View>
        )}

        {/* ─── TAB 2: PROGRESS ─── */}
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
              <Pressable
                onPress={() => {
                  setWeightInput(latestWeight ? String(latestWeight.weight_kg) : '55');
                  setWeightModalVisible(true);
                }}
              >
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
                  onAction={() => {
                    setWeightInput('55');
                    setWeightModalVisible(true);
                  }}
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

        {/* ─── TAB 3: HISTORY ─── */}
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

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ─── 1. CENTERED MODAL: EDIT TRAINING SPLIT ─── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={editSplitVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setEditSplitVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centeredModalOverlay}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setEditSplitVisible(false)}
          />
          <View style={[styles.centeredModalCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.sectionTitle, { color: colors.ink }]}>
                  Edit Training Split
                </Text>
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', marginTop: 2 }]}>
                  {DAY_NAMES[editSplitDay - 1]} Routine
                </Text>
              </View>
              <Pressable
                onPress={() => setEditSplitVisible(false)}
                hitSlop={12}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <X size={18} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Day Selector inside modal */}
              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 6 }]}>
                Select Day to Configure
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, marginBottom: Spacing.base }}
              >
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
                        } else {
                          setEditSplitName('');
                          setEditSplitFocus('');
                        }
                      }}
                    >
                      <Text
                        style={[
                          Typography.captionSmall,
                          {
                            color: isSel ? '#FFFFFF' : colors.ink,
                            fontWeight: isSel ? '700' : '500',
                          },
                        ]}
                      >
                        {name.slice(0, 3)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
                Split / Workout Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                ]}
                value={editSplitName}
                onChangeText={setEditSplitName}
                placeholder="e.g. Chest + Triceps, Legs + Abs, Pull Day"
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="words"
              />

              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4, marginTop: Spacing.xs }]}>
                Target Muscle Groups (comma separated)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                ]}
                value={editSplitFocus}
                onChangeText={setEditSplitFocus}
                placeholder="e.g. chest, triceps, shoulders"
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="none"
              />

              <View style={styles.modalButtonRow}>
                <Pressable
                  style={[styles.modalCancelBtn, { borderColor: colors.line }]}
                  onPress={() => setEditSplitVisible(false)}
                >
                  <Text style={[Typography.button, { color: colors.ink }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.orange }]}
                  onPress={handleSaveSplit}
                >
                  <Text style={[Typography.button, { color: '#FFFFFF' }]}>Save Split</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ─── 2. CENTERED MODAL: ADD EXERCISE ─── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={addExModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAddExModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centeredModalOverlay}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setAddExModalVisible(false)}
          />
          <View style={[styles.centeredModalCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.sectionTitle, { color: colors.ink }]}>
                  Add Exercise
                </Text>
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', marginTop: 2 }]}>
                  To {activePlanInWorkout?.name || 'Workout Plan'}
                </Text>
              </View>
              <Pressable
                onPress={() => setAddExModalVisible(false)}
                hitSlop={12}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <X size={18} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
                Exercise Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                ]}
                value={exName}
                onChangeText={setExName}
                placeholder="e.g. Incline Dumbbell Press, Cable Fly"
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="words"
              />

              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Sets</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                    ]}
                    value={exSets}
                    onChangeText={setExSets}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Reps</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                    ]}
                    value={exReps}
                    onChangeText={setExReps}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Weight (kg)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                    ]}
                    value={exWeight}
                    onChangeText={setExWeight}
                    keyboardType="numeric"
                    placeholder="20"
                    placeholderTextColor={colors.inkMuted}
                  />
                </View>
              </View>

              <View style={styles.modalButtonRow}>
                <Pressable
                  style={[styles.modalCancelBtn, { borderColor: colors.line }]}
                  onPress={() => setAddExModalVisible(false)}
                >
                  <Text style={[Typography.button, { color: colors.ink }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.orange }]}
                  onPress={handleAddExercise}
                >
                  <Text style={[Typography.button, { color: '#FFFFFF' }]}>Add Exercise</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ─── 3. CENTERED MODAL: EDIT EXERCISE ─── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={editExModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setEditExModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centeredModalOverlay}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setEditExModalVisible(false)}
          />
          <View style={[styles.centeredModalCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.sectionTitle, { color: colors.ink }]}>
                  Edit Exercise
                </Text>
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', marginTop: 2 }]}>
                  Modify Prescription
                </Text>
              </View>
              <Pressable
                onPress={() => setEditExModalVisible(false)}
                hitSlop={12}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <X size={18} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
                Exercise Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                ]}
                value={editExName}
                onChangeText={setEditExName}
                placeholder="e.g. Romanian Deadlift"
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="words"
              />

              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Sets</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                    ]}
                    value={editExSets}
                    onChangeText={setEditExSets}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Reps</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                    ]}
                    value={editExReps}
                    onChangeText={setEditExReps}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Weight (kg)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                    ]}
                    value={editExWeight}
                    onChangeText={setEditExWeight}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.modalButtonRow}>
                <Pressable
                  style={[styles.modalCancelBtn, { borderColor: colors.line }]}
                  onPress={() => setEditExModalVisible(false)}
                >
                  <Text style={[Typography.button, { color: colors.ink }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.orange }]}
                  onPress={handleSaveEditExercise}
                >
                  <Text style={[Typography.button, { color: '#FFFFFF' }]}>Update</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ─── 4. CENTERED MODAL: LOG BODY WEIGHT ─── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={weightModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centeredModalOverlay}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setWeightModalVisible(false)}
          />
          <View style={[styles.centeredModalCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.sectionTitle, { color: colors.ink }]}>
                  Log Body Weight
                </Text>
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', marginTop: 2 }]}>
                  Progressive Metric Tracking
                </Text>
              </View>
              <Pressable
                onPress={() => setWeightModalVisible(false)}
                hitSlop={12}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <X size={18} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 6 }]}>
                Current Weight in kg
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line, fontSize: 18, fontWeight: '700' },
                ]}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="numeric"
                placeholder={latestWeight?.weight_kg ? String(latestWeight.weight_kg) : '55.0'}
                placeholderTextColor={colors.inkMuted}
                autoFocus
              />

              <View style={styles.modalButtonRow}>
                <Pressable
                  style={[styles.modalCancelBtn, { borderColor: colors.line }]}
                  onPress={() => setWeightModalVisible(false)}
                >
                  <Text style={[Typography.button, { color: colors.ink }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.orange }]}
                  onPress={handleSaveWeight}
                >
                  <Text style={[Typography.button, { color: '#FFFFFF' }]}>Save Weight</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Exercise Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteExConfirmVisible}
        title="Delete Exercise"
        message={`Are you sure you want to remove "${exerciseToDelete?.name}" from this workout plan?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleConfirmDeleteExercise}
        onCancel={() => {
          setDeleteExConfirmVisible(false);
          setExerciseToDelete(null);
        }}
      />
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
  splitDayBadge: {
    width: 44,
    height: 32,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  editIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daySelectorWrapper: {
    marginBottom: Spacing.base,
  },
  daySelectorScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  daySelectorPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  selectedSplitHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.base,
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
    marginRight: Spacing.sm,
  },
  exActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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

  /* Centered Modal Styles (stays centered above keyboard) */
  centeredModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  centeredModalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    paddingBottom: Spacing.xs,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.button,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitBtn: {
    flex: 1.4,
    height: 48,
    borderRadius: Radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    fontSize: 16,
    marginBottom: Spacing.base,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});
