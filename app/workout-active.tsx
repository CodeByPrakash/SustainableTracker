import React, { useState, useEffect, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  X,
  Play,
  Pause,
  Timer,
  Check,
  Plus,
  Dumbbell,
  Flame,
  RotateCcw,
  Sparkles,
  Minus,
  CheckCircle2,
  Clock,
  Award,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../src/theme';
import { getDatabase } from '../src/db/database';
import {
  getWorkoutPlanForDay,
  startWorkoutSession,
  logExerciseSet,
  completeWorkoutSession,
  WorkoutPlan,
  Exercise,
} from '../src/db/queries/workoutQueries';
import { getScheduleForDate, updateBlockStatus } from '../src/db/queries/scheduleQueries';
import { formatDuration, getToday, DAY_NAMES } from '../src/utils/dateUtils';
import { useAppStore } from '../src/stores/appStore';
import { useTimerStore } from '../src/stores/timerStore';
import { AppHaptics } from '../src/utils/haptics';

interface ActiveSet {
  setNumber: number;
  reps: string;
  weight: string;
  completed: boolean;
}

interface ActiveExercise {
  name: string;
  category?: string | null;
  sets: ActiveSet[];
}

export default function WorkoutActiveModal() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ dayOfWeek?: string }>();
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);

  // Workout Session State: 'ready' (preview/not started), 'active' (timer running), 'paused'
  const [workoutState, setWorkoutState] = useState<'ready' | 'active' | 'paused'>('ready');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [workoutName, setWorkoutName] = useState('Today’s Workout');
  const [workoutFocus, setWorkoutFocus] = useState('Full Body / Custom');
  const [defaultRestDuration, setDefaultRestDuration] = useState(90); // default 90s
  const [restJustFinished, setRestJustFinished] = useState(false);
  const [nextUpInfo, setNextUpInfo] = useState<string | null>(null);

  // Rest Timer from store
  const { restTimerActive, restTimerSeconds, restTimerTotal, startRestTimer, tickRestTimer, stopRestTimer } =
    useTimerStore();

  const prevRestSecondsRef = useRef(restTimerSeconds);

  // Load default exercises for the day
  useEffect(() => {
    async function loadPlan() {
      try {
        const db = await getDatabase();
        const dowParam = params.dayOfWeek ? parseInt(params.dayOfWeek, 10) : NaN;
        const currentDow = new Date().getDay() === 0 ? 7 : new Date().getDay();
        const dow = !isNaN(dowParam) && dowParam >= 1 && dowParam <= 7 ? dowParam : currentDow;

        const plan = await getWorkoutPlanForDay(db, dow);
        if (plan) {
          setWorkoutName(plan.name);
          setWorkoutFocus(plan.focus ? plan.focus.replace(/,/g, ' • ') : 'Hypertrophy & Strength');
          const initialExs: ActiveExercise[] = plan.exercises.map((ex) => ({
            name: ex.name,
            category: ex.category,
            sets: Array.from({ length: ex.default_sets || 3 }).map((_, i) => ({
              setNumber: i + 1,
              reps: String(ex.default_reps || 10),
              weight: String(ex.default_weight_kg || 20),
              completed: false,
            })),
          }));
          setExercises(initialExs);
        } else {
          setWorkoutName('Full Body Routine');
          setWorkoutFocus('General Conditioning');
          setExercises([
            {
              name: 'Barbell Bench Press',
              category: 'Chest',
              sets: [
                { setNumber: 1, reps: '10', weight: '30', completed: false },
                { setNumber: 2, reps: '10', weight: '30', completed: false },
                { setNumber: 3, reps: '8', weight: '35', completed: false },
              ],
            },
            {
              name: 'Incline Dumbbell Press',
              category: 'Chest',
              sets: [
                { setNumber: 1, reps: '12', weight: '10', completed: false },
                { setNumber: 2, reps: '12', weight: '10', completed: false },
                { setNumber: 3, reps: '10', weight: '12.5', completed: false },
              ],
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to load active workout plan:', err);
      }
    }
    loadPlan();
  }, [params.dayOfWeek]);

  // Session Stopwatch interval (only runs when active)
  useEffect(() => {
    if (workoutState !== 'active') return;
    const timer = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [workoutState]);

  // Rest timer tick interval
  useEffect(() => {
    if (!restTimerActive) return;
    const interval = setInterval(() => {
      tickRestTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimerActive, tickRestTimer]);

  // Rest finish detection (when countdown goes from 1 to 0)
  useEffect(() => {
    if (prevRestSecondsRef.current > 0 && restTimerSeconds === 0 && !restTimerActive) {
      AppHaptics.success();
      setRestJustFinished(true);
      const timer = setTimeout(() => setRestJustFinished(false), 8000);
      return () => clearTimeout(timer);
    }
    prevRestSecondsRef.current = restTimerSeconds;
  }, [restTimerSeconds, restTimerActive]);

  // Start Workout Action
  const handleStartWorkout = () => {
    AppHaptics.success();
    setWorkoutState('active');
  };

  // Toggle Pause / Resume
  const handleTogglePause = () => {
    AppHaptics.impactLight();
    setWorkoutState((prev) => (prev === 'active' ? 'paused' : 'active'));
  };

  // Trigger Rest Timer
  const handleTriggerRest = (seconds: number) => {
    AppHaptics.impactMedium();
    setDefaultRestDuration(seconds);
    setRestJustFinished(false);
    startRestTimer(seconds);
  };

  // Toggle set completion
  const handleToggleSet = (exIdx: number, setIdx: number) => {
    // If workout wasn't started yet, automatically start it now
    if (workoutState !== 'active') {
      setWorkoutState('active');
    }

    setExercises((prev) => {
      const updated = [...prev];
      const target = updated[exIdx].sets[setIdx];
      const isNowCompleted = !target.completed;
      target.completed = isNowCompleted;

      if (isNowCompleted) {
        AppHaptics.impactMedium();

        // Find the next incomplete set to preview in the rest HUD
        let foundNext = false;
        // Check remaining sets in current exercise
        for (let s = setIdx + 1; s < updated[exIdx].sets.length; s++) {
          if (!updated[exIdx].sets[s].completed) {
            setNextUpInfo(`Next: ${updated[exIdx].name} (Set ${s + 1} • ${updated[exIdx].sets[s].weight}kg × ${updated[exIdx].sets[s].reps})`);
            foundNext = true;
            break;
          }
        }
        // If not found in current exercise, check subsequent exercises
        if (!foundNext) {
          for (let e = exIdx + 1; e < updated.length; e++) {
            const nextIncomp = updated[e].sets.find((st) => !st.completed);
            if (nextIncomp) {
              setNextUpInfo(`Next: ${updated[e].name} (Set ${nextIncomp.setNumber} • ${nextIncomp.weight}kg × ${nextIncomp.reps})`);
              foundNext = true;
              break;
            }
          }
        }
        if (!foundNext) {
          setNextUpInfo('All prescribed sets completed! Great work.');
        }

        // Start Rest Timer automatically on completion
        setRestJustFinished(false);
        startRestTimer(defaultRestDuration);
      }
      return updated;
    });
  };

  // Add set to exercise
  const handleAddSet = (exIdx: number) => {
    AppHaptics.selection();
    setExercises((prev) => {
      const updated = [...prev];
      const ex = updated[exIdx];
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        setNumber: ex.sets.length + 1,
        reps: lastSet ? lastSet.reps : '10',
        weight: lastSet ? lastSet.weight : '20',
        completed: false,
      });
      return updated;
    });
  };

  // Remove set from exercise
  const handleRemoveSet = (exIdx: number) => {
    AppHaptics.selection();
    setExercises((prev) => {
      const updated = [...prev];
      const ex = updated[exIdx];
      if (ex.sets.length > 1) {
        ex.sets.pop();
      }
      return updated;
    });
  };

  // Stats calculation
  const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.completed).length,
    0
  );
  const totalVolumeKg = exercises.reduce((sum, e) => {
    return (
      sum +
      e.sets.reduce((exSum, s) => {
        if (!s.completed) return exSum;
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        return exSum + w * r;
      }, 0)
    );
  }, 0);

  // Finish and save workout
  const handleFinishWorkout = async () => {
    if (completedSets === 0) {
      Alert.alert(
        'No Sets Completed',
        'You have not completed any sets yet. Would you like to discard this session?',
        [
          { text: 'Keep Training', style: 'cancel' },
          {
            text: 'Discard & Exit',
            style: 'destructive',
            onPress: () => {
              stopRestTimer();
              router.back();
            },
          },
        ]
      );
      return;
    }

    try {
      const db = await getDatabase();
      const sessionId = await startWorkoutSession(db, null, workoutName);

      // Log all completed sets
      for (const ex of exercises) {
        for (const s of ex.sets) {
          if (s.completed) {
            await logExerciseSet(
              db,
              sessionId,
              ex.name,
              s.setNumber,
              parseInt(s.reps, 10) || 10,
              parseFloat(s.weight) || 20
            );
          }
        }
      }

      await completeWorkoutSession(db, sessionId);
      stopRestTimer();

      // Automatically mark today's Gym schedule block as completed if exists
      try {
        const todayStr = getToday();
        const sched = await getScheduleForDate(db, todayStr);
        const gymBlock = sched.find(
          (b) =>
            b.category?.toLowerCase() === 'gym' ||
            b.title?.toLowerCase().includes('workout') ||
            b.title?.toLowerCase().includes('gym')
        );
        if (gymBlock && gymBlock.status !== 'completed') {
          await updateBlockStatus(db, gymBlock.id, 'completed');
        }
      } catch (e) {
        console.warn('Could not auto-mark gym schedule block:', e);
      }

      AppHaptics.success();
      triggerRefresh();

      Alert.alert(
        '🏆 Workout Completed!',
        `Logged ${completedSets} sets with ${totalVolumeKg.toLocaleString()} kg total volume in ${formatDuration(sessionDuration)}.\n\nGreat discipline!`,
        [{ text: 'Great!', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('Failed to save workout session:', err);
      Alert.alert('Save Error', 'Could not save workout session.');
    }
  };

  // Rest progress calculation
  const restProgress = restTimerTotal > 0 ? (restTimerSeconds / restTimerTotal) * 100 : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top', 'bottom']}>
      {/* Top Header Bar */}
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Pressable
          onPress={() => {
            if (workoutState === 'active' && completedSets > 0) {
              Alert.alert('Leave Workout?', 'Your session is actively recording. Are you sure you want to go back?', [
                { text: 'Stay', style: 'cancel' },
                {
                  text: 'Leave',
                  style: 'destructive',
                  onPress: () => {
                    stopRestTimer();
                    router.back();
                  },
                },
              ]);
            } else {
              stopRestTimer();
              router.back();
            }
          }}
          style={styles.closeBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Cancel workout"
          hitSlop={8}
        >
          <X size={22} color={colors.ink} />
        </Pressable>

        {/* Live Stopwatch / State Display */}
        <View style={styles.headerCenter}>
          <Pressable
            style={[
              styles.timerBadge,
              {
                backgroundColor:
                  workoutState === 'active'
                    ? colors.orangeSoft
                    : workoutState === 'paused'
                    ? '#FEF3C7'
                    : colors.surfaceMuted,
                borderColor:
                  workoutState === 'active'
                    ? colors.orange
                    : workoutState === 'paused'
                    ? colors.warning
                    : colors.line,
              },
            ]}
            onPress={workoutState !== 'ready' ? handleTogglePause : handleStartWorkout}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Session timer: ${formatDuration(sessionDuration)}. Tap to ${
              workoutState === 'active' ? 'pause' : 'start or resume'
            }`}
          >
            {workoutState === 'active' ? (
              <Timer size={16} color={colors.orangeDark} />
            ) : workoutState === 'paused' ? (
              <Pause size={16} color={colors.warning} />
            ) : (
              <Play size={16} color={colors.ink} fill={colors.ink} />
            )}
            <Text
              style={[
                Typography.sectionTitle,
                styles.tabularNums,
                {
                  color:
                    workoutState === 'active'
                      ? colors.orangeDark
                      : workoutState === 'paused'
                      ? '#B45309'
                      : colors.ink,
                  marginLeft: 6,
                },
              ]}
            >
              {formatDuration(sessionDuration)}
            </Text>
          </Pressable>
        </View>

        {/* Finish Button */}
        <Pressable
          style={[styles.finishBtn, { backgroundColor: colors.orange }]}
          onPress={handleFinishWorkout}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Finish and log workout"
        >
          <Text style={[Typography.button, { color: '#FFFFFF' }]}>Finish</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ─── HERO 1: READY STATE (START WORKOUT HERO) ─── */}
        {workoutState === 'ready' && (
          <View style={[styles.readyHeroCard, { backgroundColor: colors.orangeSoft, borderColor: colors.orange }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadgeRow}>
                <Flame size={16} color={colors.orangeDark} />
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', letterSpacing: 0.5, marginLeft: 4 }]}>
                  READY TO TRAIN
                </Text>
              </View>
              <Text style={[Typography.screenTitle, { color: colors.orangeDark, marginTop: 4 }]}>
                {workoutName}
              </Text>
              <Text style={[Typography.body, { color: colors.ink, marginTop: 2 }]}>
                {workoutFocus}
              </Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginTop: 6 }]}>
                {exercises.length} Exercises • {totalSets} Total Sets • Calibrated for Progressive Overload
              </Text>
            </View>

            <Pressable
              style={[styles.bigStartBtn, { backgroundColor: colors.orange }]}
              onPress={handleStartWorkout}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Start workout session and start timer"
            >
              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={[Typography.button, { color: '#FFFFFF', marginLeft: 8, fontSize: 16 }]}>
                START WORKOUT
              </Text>
            </Pressable>
          </View>
        )}

        {/* ─── HERO 2: ACTIVE SESSION DASHBOARD ─── */}
        {workoutState !== 'ready' && (
          <View style={[styles.activeDashboardCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.dashboardStatsRow}>
              <View style={styles.dashboardStat}>
                <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>ELAPSED</Text>
                <Text style={[Typography.metric, styles.tabularNums, { color: colors.ink, fontSize: 22, lineHeight: 28 }]}>
                  {formatDuration(sessionDuration)}
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.line }]} />

              <View style={styles.dashboardStat}>
                <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>SETS COMPLETED</Text>
                <Text style={[Typography.metric, styles.tabularNums, { color: colors.orange, fontSize: 22, lineHeight: 28 }]}>
                  {completedSets} <Text style={{ fontSize: 14, color: colors.inkMuted }}>/ {totalSets}</Text>
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.line }]} />

              <View style={styles.dashboardStat}>
                <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>VOLUME LIFTED</Text>
                <Text style={[Typography.metric, styles.tabularNums, { color: colors.ink, fontSize: 22, lineHeight: 28 }]}>
                  {totalVolumeKg > 0 ? `${totalVolumeKg.toLocaleString()}kg` : '0kg'}
                </Text>
              </View>
            </View>

            {/* Session Controller Controls (Pause / Resume) */}
            <View style={[styles.dashboardActionsRow, { borderTopColor: colors.line }]}>
              <Pressable
                style={[
                  styles.pauseResumeBtn,
                  { backgroundColor: workoutState === 'active' ? colors.surfaceMuted : colors.orangeSoft },
                ]}
                onPress={handleTogglePause}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={workoutState === 'active' ? 'Pause workout session' : 'Resume workout session'}
              >
                {workoutState === 'active' ? (
                  <>
                    <Pause size={14} color={colors.ink} />
                    <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '700', marginLeft: 6 }]}>
                      Pause Workout
                    </Text>
                  </>
                ) : (
                  <>
                    <Play size={14} color={colors.orangeDark} fill={colors.orangeDark} />
                    <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', marginLeft: 6 }]}>
                      Resume Workout
                    </Text>
                  </>
                )}
              </Pressable>

              <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                {workoutState === 'active' ? 'Workout Live' : 'Workout Paused'}
              </Text>
            </View>
          </View>
        )}

        {/* ─── REST TIMER HUD (ANIMATED & CONTROLLABLE) ─── */}
        {restTimerActive && (
          <View
            style={[styles.restHudCard, { backgroundColor: colors.orangeSoft, borderColor: colors.orange }]}
            accessible={true}
            accessibilityLiveRegion="polite"
          >
            <View style={styles.restTopRow}>
              <View style={styles.restTitleGroup}>
                <Flame size={20} color={colors.orangeDark} />
                <Text style={[Typography.sectionTitle, { color: colors.orangeDark, marginLeft: 6 }]}>
                  Resting Interval
                </Text>
              </View>
              {/* Countdown Digits */}
              <View style={styles.restDigitWrap}>
                <Text style={[styles.restDigits, styles.tabularNums, { color: colors.orangeDark }]}>
                  {formatDuration(restTimerSeconds)}
                </Text>
              </View>
            </View>

            {/* Rest Progress Track */}
            <View style={[styles.restProgressBg, { backgroundColor: colors.orange + '30' }]}>
              <View
                style={[
                  styles.restProgressFill,
                  {
                    width: `${Math.min(100, Math.max(0, restProgress))}%`,
                    backgroundColor: colors.orange,
                  },
                ]}
              />
            </View>

            {/* Next Up Preview */}
            {nextUpInfo && (
              <Text style={[Typography.captionSmall, { color: colors.ink, marginTop: 8, fontWeight: '600' }]} numberOfLines={1}>
                {nextUpInfo}
              </Text>
            )}

            {/* Rest Control Buttons */}
            <View style={styles.restControlsRow}>
              <Pressable
                onPress={() => {
                  AppHaptics.selection();
                  startRestTimer(Math.max(10, restTimerSeconds - 15));
                }}
                style={[styles.restControlPill, { backgroundColor: colors.surface }]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Subtract 15 seconds"
                hitSlop={6}
              >
                <Minus size={13} color={colors.ink} />
                <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '700', marginLeft: 2 }]}>
                  -15s
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  AppHaptics.selection();
                  startRestTimer(restTimerSeconds + 30);
                }}
                style={[styles.restControlPill, { backgroundColor: colors.surface }]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Add 30 seconds"
                hitSlop={6}
              >
                <Plus size={13} color={colors.ink} />
                <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '700', marginLeft: 2 }]}>
                  +30s
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  AppHaptics.impactLight();
                  stopRestTimer();
                }}
                style={[styles.restControlPill, { backgroundColor: colors.orange, borderColor: colors.orange }]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Skip rest and lift now"
                hitSlop={6}
              >
                <Text style={[Typography.captionSmall, { color: '#FFFFFF', fontWeight: '700' }]}>
                  Skip / Lift Now
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ─── REST FINISHED BANNER ─── */}
        {restJustFinished && !restTimerActive && (
          <View style={[styles.restFinishedBanner, { backgroundColor: colors.greenSoft, borderColor: colors.green }]}>
            <CheckCircle2 size={18} color={colors.greenDark} />
            <Text style={[Typography.caption, { color: colors.greenDark, fontWeight: '700', marginLeft: 6, flex: 1 }]}>
              Rest Complete! Time to crush your next set.
            </Text>
            <Pressable onPress={() => setRestJustFinished(false)} hitSlop={6}>
              <X size={16} color={colors.greenDark} />
            </Pressable>
          </View>
        )}

        {/* ─── QUICK REST SELECTOR BAR (ANYTIME REST) ─── */}
        <View style={styles.quickRestSection}>
          <View style={styles.quickRestHeader}>
            <Clock size={14} color={colors.inkMuted} />
            <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginLeft: 4, fontWeight: '600' }]}>
              REST TIMER PRESETS
            </Text>
          </View>
          <View style={styles.quickRestRow}>
            {[
              { label: '45s', secs: 45 },
              { label: '60s', secs: 60 },
              { label: '90s', secs: 90 },
              { label: '2 min', secs: 120 },
              { label: '3 min', secs: 180 },
            ].map((preset) => (
              <Pressable
                key={preset.secs}
                style={[
                  styles.quickRestBtn,
                  {
                    backgroundColor: defaultRestDuration === preset.secs ? colors.orangeSoft : colors.surface,
                    borderColor: defaultRestDuration === preset.secs ? colors.orange : colors.line,
                  },
                ]}
                onPress={() => handleTriggerRest(preset.secs)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Start ${preset.label} rest timer`}
              >
                <Text
                  style={[
                    Typography.captionSmall,
                    {
                      color: defaultRestDuration === preset.secs ? colors.orangeDark : colors.ink,
                      fontWeight: defaultRestDuration === preset.secs ? '700' : '500',
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ─── EXERCISES & SETS LIST ─── */}
        <View style={styles.sectionTitleRow}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>
            Workout Exercises ({exercises.length})
          </Text>
          <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
            Tap checkbox to complete & trigger rest
          </Text>
        </View>

        {exercises.map((ex, exIdx) => {
          const exDoneSets = ex.sets.filter((s) => s.completed).length;
          const isExComplete = ex.sets.length > 0 && exDoneSets === ex.sets.length;

          return (
            <View
              key={exIdx}
              style={[
                styles.exerciseCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isExComplete ? colors.green + '60' : colors.line,
                },
              ]}
            >
              {/* Exercise Header */}
              <View style={styles.exHeader}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[Typography.sectionTitle, { color: colors.ink, flex: 1 }]} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    {isExComplete && (
                      <View style={[styles.completedBadge, { backgroundColor: colors.greenSoft }]}>
                        <Check size={12} color={colors.greenDark} strokeWidth={3} />
                        <Text style={[Typography.captionSmall, { color: colors.greenDark, fontWeight: '700', marginLeft: 2, fontSize: 10 }]}>
                          DONE
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginTop: 2 }]}>
                    {exDoneSets} of {ex.sets.length} sets completed {ex.category ? `• ${ex.category}` : ''}
                  </Text>
                </View>

                {/* Quick Rest Button inside Exercise */}
                <Pressable
                  style={[styles.exRestBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}
                  onPress={() => handleTriggerRest(defaultRestDuration)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${defaultRestDuration} second rest`}
                >
                  <Flame size={12} color={colors.orange} />
                  <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '600', marginLeft: 4 }]}>
                    Rest {defaultRestDuration}s
                  </Text>
                </Pressable>
              </View>

              {/* Set Table Header */}
              <View style={[styles.setRowHeader, { backgroundColor: colors.surfaceMuted + '50' }]}>
                <Text style={[Typography.captionSmall, styles.tableHeaderCol, { width: 44, textAlign: 'center' }]}>
                  SET
                </Text>
                <Text style={[Typography.captionSmall, styles.tableHeaderCol, { flex: 1 }]}>
                  WEIGHT (KG)
                </Text>
                <Text style={[Typography.captionSmall, styles.tableHeaderCol, { flex: 1 }]}>
                  REPS
                </Text>
                <Text style={[Typography.captionSmall, styles.tableHeaderCol, { width: 50, textAlign: 'center' }]}>
                  DONE
                </Text>
              </View>

              {/* Set Rows */}
              {ex.sets.map((s, sIdx) => (
                <View
                  key={sIdx}
                  style={[
                    styles.setRow,
                    { borderTopColor: colors.line },
                    s.completed && { backgroundColor: colors.greenSoft + '20' },
                  ]}
                >
                  <View style={styles.setNumberCol}>
                    <Text
                      style={[
                        Typography.bodyMedium,
                        styles.tabularNums,
                        { color: s.completed ? colors.greenDark : colors.ink, fontWeight: '700' },
                      ]}
                    >
                      {s.setNumber}
                    </Text>
                  </View>

                  <View style={styles.inputWrap}>
                    <TextInput
                      style={[
                        styles.inputCell,
                        { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                      ]}
                      value={s.weight}
                      onChangeText={(val) => {
                        const updated = [...exercises];
                        updated[exIdx].sets[sIdx].weight = val;
                        setExercises(updated);
                      }}
                      keyboardType="numeric"
                      accessibilityLabel={`Set ${s.setNumber} weight in kilograms`}
                    />
                  </View>

                  <View style={styles.inputWrap}>
                    <TextInput
                      style={[
                        styles.inputCell,
                        { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line },
                      ]}
                      value={s.reps}
                      onChangeText={(val) => {
                        const updated = [...exercises];
                        updated[exIdx].sets[sIdx].reps = val;
                        setExercises(updated);
                      }}
                      keyboardType="numeric"
                      accessibilityLabel={`Set ${s.setNumber} repetitions count`}
                    />
                  </View>

                  {/* Complete Checkbox */}
                  <Pressable
                    style={[
                      styles.checkBtn,
                      {
                        backgroundColor: s.completed ? colors.green : colors.surfaceMuted,
                        borderColor: s.completed ? colors.green : colors.line,
                      },
                    ]}
                    onPress={() => handleToggleSet(exIdx, sIdx)}
                    accessible={true}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: s.completed }}
                    accessibilityLabel={`Set ${s.setNumber}: ${s.weight} kilograms, ${s.reps} reps, ${
                      s.completed ? 'completed' : 'incomplete'
                    }`}
                    accessibilityHint="Double tap to toggle set completion and trigger rest"
                    hitSlop={6}
                  >
                    {s.completed && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                  </Pressable>
                </View>
              ))}

              {/* Add & Remove Set Actions */}
              <View style={[styles.setActionsFooter, { borderTopColor: colors.line }]}>
                <Pressable
                  style={styles.addSetBtn}
                  onPress={() => handleAddSet(exIdx)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Add set to ${ex.name}`}
                  hitSlop={6}
                >
                  <Plus size={14} color={colors.orange} />
                  <Text style={[Typography.captionSmall, { color: colors.orange, fontWeight: '700', marginLeft: 4 }]}>
                    Add Set
                  </Text>
                </Pressable>

                {ex.sets.length > 1 && (
                  <Pressable
                    style={styles.removeSetBtn}
                    onPress={() => handleRemoveSet(exIdx)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove last set from ${ex.name}`}
                    hitSlop={6}
                  >
                    <Minus size={13} color={colors.inkMuted} />
                    <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginLeft: 2 }]}>
                      Remove Set
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {/* ─── BOTTOM FINISH BANNER ─── */}
        <View style={[styles.bottomFinishCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={{ flex: 1, marginRight: Spacing.sm }}>
            <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Workout Summary</Text>
            <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginTop: 2 }]}>
              {completedSets} sets completed • {totalVolumeKg.toLocaleString()} kg total volume
            </Text>
          </View>
          <Pressable
            style={[styles.bigFinishBtn, { backgroundColor: colors.orange }]}
            onPress={handleFinishWorkout}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Complete and save workout session"
          >
            <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={[Typography.button, { color: '#FFFFFF', marginLeft: 6 }]}>Save Workout</Text>
          </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  finishBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xxxl * 2,
  },
  readyHeroCard: {
    borderRadius: Radius.card,
    borderWidth: 1.5,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bigStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.button,
    marginTop: Spacing.base,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  activeDashboardCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  dashboardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dashboardStat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  dashboardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  pauseResumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  restHudCard: {
    borderRadius: Radius.card,
    borderWidth: 1.5,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    elevation: 2,
  },
  restTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restDigitWrap: {
    alignItems: 'flex-end',
  },
  restDigits: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  restProgressBg: {
    height: 6,
    borderRadius: Radius.full,
    width: '100%',
    marginTop: 8,
    overflow: 'hidden',
  },
  restProgressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  restControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  restControlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#E8DDD0',
  },
  restFinishedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  quickRestSection: {
    marginBottom: Spacing.base,
  },
  quickRestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickRestRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickRestBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    minHeight: 38,
  },
  sectionTitleRow: {
    marginBottom: Spacing.sm,
  },
  exerciseCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.base,
    overflow: 'hidden',
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  exRestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  setRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
  },
  tableHeaderCol: {
    color: '#585652',
    fontWeight: '700',
    fontSize: 11,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  setNumberCol: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    paddingHorizontal: 4,
  },
  inputCell: {
    height: 42,
    borderWidth: 1,
    borderRadius: Radius.sm,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  checkBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  setActionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  removeSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  bottomFinishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  bigFinishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.button,
  },
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
});
