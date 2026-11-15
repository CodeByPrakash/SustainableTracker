import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  Settings,
  Dumbbell,
  BookOpen,
  Code2,
  CheckCircle2,
  Plus,
  Play,
  Droplets,
  Calendar,
  Flame,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../../src/theme';
import { getDatabase } from '../../src/db/database';
import { seedDatabase } from '../../src/db/seeds';
import { getScheduleForDate, updateBlockStatus, checkAndAutoResetWeeklySchedule, ScheduleBlock } from '../../src/db/queries/scheduleQueries';
import { getActiveHabits, getHabitLogsForDate, toggleHabitLog, Habit, HabitLog } from '../../src/db/queries/habitQueries';
import { getWaterForDate, logWater } from '../../src/db/queries/healthQueries';
import { getToday, getGreeting, formatDateDisplay, formatTime12 } from '../../src/utils/dateUtils';
import { syncScheduleNotifications } from '../../src/utils/notifications';
import { ProgressRing } from '../../src/components/ui/ProgressRing';
import { CategoryCard } from '../../src/components/ui/CategoryCard';
import { TaskRow } from '../../src/components/ui/TaskRow';
import { QuickActionPill } from '../../src/components/ui/QuickActionPill';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { useAppStore } from '../../src/stores/appStore';

export default function HomeScreen() {
  const { colors, mode } = useTheme();
  const router = useRouter();
  const refreshKey = useAppStore((state) => state.refreshKey);
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);

  const [refreshing, setRefreshing] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [waterTotal, setWaterTotal] = useState(0);
  const [waterSheetVisible, setWaterSheetVisible] = useState(false);

  const todayStr = getToday();
  const todayDate = new Date();

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      try {
        await checkAndAutoResetWeeklySchedule(db);
      } catch (e) {
        console.warn('Auto reset warning:', e);
      }

      let [schedData, habitData, logsData, waterData] = await Promise.all([
        getScheduleForDate(db, todayStr),
        getActiveHabits(db),
        getHabitLogsForDate(db, todayStr),
        getWaterForDate(db, todayStr),
      ]);

      // If today's schedule is empty (e.g. initial run on weekend or missing day seed), heal and re-query
      if (schedData.length === 0) {
        await seedDatabase(db);
        schedData = await getScheduleForDate(db, todayStr);
      }
      setSchedule(schedData);
      setHabits(habitData);
      setHabitLogs(logsData);
      setWaterTotal(waterData);

      // Sync upcoming to-do reminders safely in background
      syncScheduleNotifications(db).catch((e) => console.warn('Notification sync warning:', e));
    } catch (err) {
      console.error('Failed to load home data:', err);
    }
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Toggle schedule block status
  const handleToggleBlock = async (block: ScheduleBlock) => {
    const nextStatus = block.status === 'completed' ? 'pending' : 'completed';
    try {
      const db = await getDatabase();
      await updateBlockStatus(db, block.id, nextStatus);
      setSchedule((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, status: nextStatus } : b))
      );
      triggerRefresh();
    } catch (err) {
      console.error('Failed to update block status:', err);
    }
  };

  // Add water helper
  const handleAddWater = async (amount: number) => {
    try {
      const db = await getDatabase();
      await logWater(db, todayStr, amount);
      const updated = await getWaterForDate(db, todayStr);
      setWaterTotal(updated);
      setWaterSheetVisible(false);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to log water:', err);
    }
  };

  // Calculate daily progress
  const totalTasks = schedule.length;
  const completedTasks = schedule.filter((b) => b.status === 'completed').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Determine current/next activity
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeVal = currentHour * 60 + currentMinute;

  let activeIndex = -1;
  schedule.forEach((b, idx) => {
    const [h, m] = b.start_time.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const bTimeVal = h * 60 + m;
      if (bTimeVal <= currentTimeVal) {
        activeIndex = idx;
      }
    }
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.orange} />}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={[Typography.captionSmall, { color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 1.2 }]}>
              {formatDateDisplay(todayDate)}
            </Text>
            <Text style={[Typography.screenTitle, { color: colors.ink, marginTop: 2 }]}>
              {getGreeting()}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.line }]}
              onPress={() => router.push('/settings')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Settings size={20} color={colors.ink} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Daily Progress Card */}
        <View
          style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel={`Today's progress: ${progressPercent} percent, ${completedTasks} of ${totalTasks} commitments completed`}
        >
          <View style={styles.progressInfo}>
            <View style={styles.progressBadgeRow}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Today’s Progress</Text>
              <View style={[styles.streakBadge, { backgroundColor: colors.orangeSoft }]}>
                <Flame size={14} color={colors.orange} />
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', marginLeft: 4 }]}>
                  Active
                </Text>
              </View>
            </View>
            <Text style={[Typography.caption, { color: colors.inkMuted, marginTop: 4 }]}>
              {totalTasks > 0
                ? `${completedTasks} of ${totalTasks} commitments completed`
                : 'No scheduled commitments today'}
            </Text>
            <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginTop: 8, fontStyle: 'italic' }]}>
              Your discipline builds one session at a time.
            </Text>
          </View>
          <ProgressRing
            progress={progressPercent}
            size={90}
            strokeWidth={8}
            color={progressPercent === 100 ? colors.green : colors.orange}
          />
        </View>

        {/* Quick Actions Row */}
        <View style={styles.sectionHeader}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]} accessibilityRole="header">Quick Actions</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
          <QuickActionPill
            label="Start Workout"
            icon={Dumbbell}
            accentColor={colors.orange}
            onPress={() => router.push('/workout-active')}
          />
          <QuickActionPill
            label="Focus Study"
            icon={BookOpen}
            accentColor={colors.green}
            onPress={() => router.push('/study-active')}
          />
          <QuickActionPill
            label={`Log Water (${waterTotal}ml)`}
            icon={Droplets}
            accentColor="#3B82F6"
            onPress={() => setWaterSheetVisible(true)}
          />
          <QuickActionPill
            label="Habits"
            icon={CheckCircle2}
            accentColor={colors.warning}
            onPress={() => router.push('/habits')}
          />
        </ScrollView>

        {/* Category Shortcuts Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]} accessibilityRole="header">Workspaces</Text>
        </View>
        <View style={styles.categoryGrid}>
          <CategoryCard
            title="Gym"
            status={todayDate.getDay() === 0 ? 'Rest / Active Recovery' : todayDate.getDay() === 6 ? 'Legs + Biceps + Abs' : 'Push/Pull/Legs Split'}
            icon={Dumbbell}
            accentColor={colors.orange}
            softColor={colors.orangeSoft}
            onPress={() => router.push('/(tabs)/gym')}
          />
          <CategoryCard
            title="Academics"
            status={todayDate.getDay() === 0 ? 'Weekly Review & Synthesis' : todayDate.getDay() === 6 ? 'Lab Backlog & Revision' : 'Syllabus & Focus'}
            icon={BookOpen}
            accentColor={colors.green}
            softColor={colors.greenSoft}
            onPress={() => router.push('/(tabs)/academics')}
          />
          <CategoryCard
            title="Technical Skills"
            status={todayDate.getDay() === 6 ? 'Project Sprint & DSA' : todayDate.getDay() === 0 ? 'Tech Architecture & Podcast' : 'DSA & Projects'}
            icon={Code2}
            accentColor={colors.skillsChart}
            softColor={colors.surfaceMuted}
            onPress={() => router.push('/skills')}
          />
          <CategoryCard
            title="Daily Habits"
            status={`${habits.length} Active Habits`}
            icon={CheckCircle2}
            accentColor={colors.warning}
            softColor={colors.surfaceMuted}
            onPress={() => router.push('/habits')}
          />
        </View>

        {/* Today's Schedule Agenda */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]} accessibilityRole="header">Today's Schedule</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/plan')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="View full planner agenda"
            hitSlop={8}
          >
            <Text style={[Typography.caption, { color: colors.orange, fontWeight: '600' }]}>Full Agenda →</Text>
          </Pressable>
        </View>

        {schedule.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Clear Schedule"
            message="No activities scheduled for today. Tap below to add or load your default routine."
            actionLabel="View Planner"
            onAction={() => router.push('/(tabs)/plan')}
          />
        ) : (
          <View style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {schedule.map((block, idx) => (
              <TaskRow
                key={block.id}
                title={block.title}
                time={formatTime12(block.start_time)}
                category={block.category}
                status={block.status === 'completed' ? 'completed' : 'pending'}
                isActive={idx === activeIndex}
                onToggle={() => handleToggleBlock(block)}
                onPress={() => router.push('/(tabs)/plan')}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Water Intake Bottom Sheet */}
      <BottomSheet
        visible={waterSheetVisible}
        onClose={() => setWaterSheetVisible(false)}
        title="Log Water Intake"
      >
        <View style={styles.waterSheetContent}>
          <Text style={[Typography.body, { color: colors.inkMuted, textAlign: 'center', marginBottom: Spacing.md }]}>
            Current intake today: <Text style={{ color: '#3B82F6', fontWeight: '700' }}>{waterTotal} ml</Text>
          </Text>
          <View style={styles.waterButtonRow}>
            <Pressable
              style={[styles.waterButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}
              onPress={() => handleAddWater(250)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Add 250 milliliters, one glass"
            >
              <Droplets size={18} color="#3B82F6" />
              <Text style={[Typography.button, { color: colors.ink, marginTop: 4 }]}>+250 ml</Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>1 Glass</Text>
            </Pressable>
            <Pressable
              style={[styles.waterButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}
              onPress={() => handleAddWater(500)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Add 500 milliliters, one bottle"
            >
              <Droplets size={20} color="#3B82F6" />
              <Text style={[Typography.button, { color: colors.ink, marginTop: 4 }]}>+500 ml</Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>1 Bottle</Text>
            </Pressable>
            <Pressable
              style={[styles.waterButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}
              onPress={() => handleAddWater(750)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Add 750 milliliters, large bottle"
            >
              <Droplets size={22} color="#3B82F6" />
              <Text style={[Typography.button, { color: colors.ink, marginTop: 4 }]}>+750 ml</Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>Large Bottle</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.base,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginTop: Spacing.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  progressInfo: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  progressBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.base,
    marginBottom: Spacing.xs,
  },
  quickActionsScroll: {
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  timelineCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  waterSheetContent: {
    paddingVertical: Spacing.base,
  },
  waterButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  waterButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
});
