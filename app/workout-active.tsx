import React, { useState, useEffect } from 'react';
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
  X,
  Play,
  Pause,
  Timer,
  Check,
  Plus,
  Dumbbell,
  Flame,
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
import { formatDuration, getToday } from '../src/utils/dateUtils';
import { useAppStore } from '../src/stores/appStore';
import { useTimerStore } from '../src/stores/timerStore';

interface ActiveSet {
  setNumber: number;
  reps: string;
  weight: string;
  completed: boolean;
}

interface ActiveExercise {
  name: string;
  sets: ActiveSet[];
}

export default function WorkoutActiveModal() {
  const { colors } = useTheme();
  const router = useRouter();
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);

  const [sessionDuration, setSessionDuration] = useState(0);
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [workoutName, setWorkoutName] = useState('Today’s Workout');

  // Rest Timer from store
  const { restTimerActive, restTimerSeconds, startRestTimer, tickRestTimer, stopRestTimer } =
    useTimerStore();

  // Load default exercises for today's plan
  useEffect(() => {
    async function loadPlan() {
      try {
        const db = await getDatabase();
        const dow = new Date().getDay() === 0 ? 7 : new Date().getDay();
        const plan = await getWorkoutPlanForDay(db, dow);
        if (plan) {
          setWorkoutName(plan.name);
          const initialExs: ActiveExercise[] = plan.exercises.map((ex) => ({
            name: ex.name,
            sets: Array.from({ length: ex.default_sets }).map((_, i) => ({
              setNumber: i + 1,
              reps: String(ex.default_reps),
              weight: String(ex.default_weight_kg || 20),
              completed: false,
            })),
          }));
          setExercises(initialExs);
        } else {
          setExercises([
            {
              name: 'Barbell Bench Press',
              sets: [
                { setNumber: 1, reps: '10', weight: '30', completed: false },
                { setNumber: 2, reps: '10', weight: '30', completed: false },
                { setNumber: 3, reps: '8', weight: '35', completed: false },
              ],
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to load active workout:', err);
      }
    }
    loadPlan();
  }, []);

  // Stopwatch effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rest timer tick effect
  useEffect(() => {
    if (!restTimerActive) return;
    const interval = setInterval(() => {
      tickRestTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimerActive, tickRestTimer]);

  // Toggle set completion
  const handleToggleSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const target = updated[exIdx].sets[setIdx];
      const isNowCompleted = !target.completed;
      target.completed = isNowCompleted;

      // Start rest timer automatically on set completion
      if (isNowCompleted) {
        startRestTimer(90); // 90 seconds default rest
      }
      return updated;
    });
  };

  // Add set to exercise
  const handleAddSet = (exIdx: number) => {
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

  // Finish and save workout
  const handleFinishWorkout = async () => {
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
      triggerRefresh();
      router.back();
    } catch (err) {
      console.error('Failed to save workout session:', err);
      Alert.alert('Save Error', 'Could not save workout session.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Cancel workout"
          hitSlop={8}
        >
          <X size={22} color={colors.ink} />
        </Pressable>
        <View
          style={styles.timerBadge}
          accessible={true}
          accessibilityLabel={`Workout duration: ${formatDuration(sessionDuration)}`}
        >
          <Timer size={16} color={colors.orange} />
          <Text style={[Typography.sectionTitle, { color: colors.orange, marginLeft: 6 }]}>
            {formatDuration(sessionDuration)}
          </Text>
        </View>
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

      {/* Rest Timer Banner */}
      {restTimerActive && (
        <View
          style={[styles.restBanner, { backgroundColor: colors.orangeSoft, borderColor: colors.orange }]}
          accessible={true}
          accessibilityLiveRegion="polite"
        >
          <View style={styles.restTextRow}>
            <Flame size={18} color={colors.orangeDark} />
            <Text style={[Typography.bodyMedium, { color: colors.orangeDark, marginLeft: 6 }]}>
              Resting: {restTimerSeconds}s
            </Text>
          </View>
          <View style={styles.restActions}>
            <Pressable
              onPress={() => startRestTimer(restTimerSeconds + 30)}
              style={styles.restPill}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Add 30 seconds to rest timer"
            >
              <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700' }]}>+30s</Text>
            </Pressable>
            <Pressable
              onPress={stopRestTimer}
              style={[styles.restPill, { backgroundColor: colors.orange }]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Skip rest timer"
            >
              <Text style={[Typography.captionSmall, { color: '#FFFFFF', fontWeight: '700' }]}>Skip</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Exercises List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.screenTitle, { color: colors.ink, marginBottom: Spacing.base }]}>
          {workoutName}
        </Text>

        {exercises.map((ex, exIdx) => (
          <View
            key={exIdx}
            style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <View style={styles.exHeader}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>{ex.name}</Text>
            </View>

            {/* Set Table Header */}
            <View style={styles.setRowHeader}>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, width: 40 }]}>SET</Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, flex: 1 }]}>KG</Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, flex: 1 }]}>REPS</Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, width: 44, textAlign: 'center' }]}>
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
                  s.completed && { backgroundColor: colors.orangeSoft + '40' },
                ]}
              >
                <Text style={[Typography.bodyMedium, { color: colors.ink, width: 40 }]}>{s.setNumber}</Text>
                <TextInput
                  style={[styles.inputCell, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                  value={s.weight}
                  onChangeText={(val) => {
                    const updated = [...exercises];
                    updated[exIdx].sets[sIdx].weight = val;
                    setExercises(updated);
                  }}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.inputCell, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                  value={s.reps}
                  onChangeText={(val) => {
                    const updated = [...exercises];
                    updated[exIdx].sets[sIdx].reps = val;
                    setExercises(updated);
                  }}
                  keyboardType="numeric"
                />
                <Pressable
                  style={[
                    styles.checkBtn,
                    {
                      backgroundColor: s.completed ? colors.orange : colors.surfaceMuted,
                      borderColor: s.completed ? colors.orange : colors.line,
                    },
                  ]}
                  onPress={() => handleToggleSet(exIdx, sIdx)}
                  accessible={true}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: s.completed }}
                  accessibilityLabel={`Set ${s.setNumber}: ${s.weight} kilograms, ${s.reps} reps, ${s.completed ? 'completed' : 'incomplete'}`}
                  accessibilityHint="Double tap to toggle set completion"
                  hitSlop={6}
                >
                  {s.completed && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                </Pressable>
              </View>
            ))}

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
          </View>
        ))}
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
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  finishBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  restBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1.5,
  },
  restTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  restPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  exerciseCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  exHeader: {
    marginBottom: Spacing.sm,
  },
  setRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
  },
  inputCell: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: Radius.sm,
    textAlign: 'center',
    marginHorizontal: 4,
    fontSize: 15,
    fontWeight: '600',
  },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
