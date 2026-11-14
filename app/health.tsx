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
  Moon,
  Droplets,
  Scale,
  Plus,
  Heart,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../src/theme';
import { getDatabase } from '../src/db/database';
import {
  getSleepLogs,
  logSleep,
  getWaterForDate,
  logWater,
  SleepLog,
} from '../src/db/queries/healthQueries';
import { getBodyWeight, logBodyWeight, BodyMeasurement } from '../src/db/queries/workoutQueries';
import { getToday, formatDurationHuman } from '../src/utils/dateUtils';
import { AppHeader } from '../src/components/ui/AppHeader';
import { MetricCard } from '../src/components/ui/MetricCard';
import { BottomSheet } from '../src/components/ui/BottomSheet';
import { useAppStore } from '../src/stores/appStore';

export default function HealthScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);

  const [waterTotal, setWaterTotal] = useState(0);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [latestWeight, setLatestWeight] = useState<BodyMeasurement | null>(null);

  // Sleep Modal
  const [sleepSheetVisible, setSleepSheetVisible] = useState(false);
  const [sleepTimeInput, setSleepTimeInput] = useState('23:00');
  const [wakeTimeInput, setWakeTimeInput] = useState('06:30');
  const [sleepHoursInput, setSleepHoursInput] = useState('7.5');

  const todayStr = getToday();

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [water, sleeps, weight] = await Promise.all([
        getWaterForDate(db, todayStr),
        getSleepLogs(db, 7),
        getBodyWeight(db),
      ]);
      setWaterTotal(water);
      setSleepLogs(sleeps);
      setLatestWeight(weight);
    } catch (err) {
      console.error('Failed to load health records:', err);
    }
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogSleep = async () => {
    const hours = parseFloat(sleepHoursInput);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      Alert.alert('Invalid Duration', 'Please enter valid sleep hours.');
      return;
    }
    try {
      const db = await getDatabase();
      await logSleep(db, todayStr, sleepTimeInput, wakeTimeInput, Math.round(hours * 60));
      setSleepSheetVisible(false);
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to log sleep:', err);
    }
  };

  const handleAddWater = async (amount: number) => {
    try {
      const db = await getDatabase();
      await logWater(db, todayStr, amount);
      const updated = await getWaterForDate(db, todayStr);
      setWaterTotal(updated);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to add water:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Header */}
      <AppHeader
        title="Health & Recovery"
        subtitle="Hydration, sleep quality & body measurements"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Honest Non-Medical Tracking Disclaimer */}
        <View style={[styles.disclaimerCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}>
          <ShieldCheck size={18} color={colors.inkMuted} />
          <Text style={[Typography.captionSmall, { color: colors.inkMuted, flex: 1, marginLeft: 8 }]}>
            Personal lifestyle metrics based on manually entered logs. No medical claims or automated diagnoses.
          </Text>
        </View>

        {/* Metric Cards */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Hydration Today"
            value={`${(waterTotal / 1000).toFixed(1)} L`}
            subtitle="Target: 3.0 Liters"
            icon={Droplets}
            accentColor="#3B82F6"
          />
          <MetricCard
            title="Last Night Sleep"
            value={sleepLogs.length > 0 && sleepLogs[0]?.duration_minutes ? `${((sleepLogs[0].duration_minutes ?? 0) / 60).toFixed(1)}h` : '7.5h'}
            subtitle="Target: 7–8 hours"
            icon={Moon}
            accentColor="#6366F1"
            onPress={() => setSleepSheetVisible(true)}
          />
        </View>

        {/* Water Logging Section */}
        <View style={styles.sectionHeader}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Hydration Tracker</Text>
          <Text style={[Typography.captionSmall, { color: '#3B82F6', fontWeight: '700' }]}>{waterTotal} ml</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, padding: Spacing.base }]}>
          <Text style={[Typography.bodyMedium, { color: colors.ink, marginBottom: Spacing.sm }]}>
            Quick Log Water
          </Text>
          <View style={styles.waterRow}>
            <Pressable
              style={[styles.waterPill, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}
              onPress={() => handleAddWater(250)}
            >
              <Droplets size={16} color="#3B82F6" />
              <Text style={[Typography.button, { color: colors.ink, marginLeft: 4 }]}>+250 ml</Text>
            </Pressable>
            <Pressable
              style={[styles.waterPill, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}
              onPress={() => handleAddWater(500)}
            >
              <Droplets size={16} color="#3B82F6" />
              <Text style={[Typography.button, { color: colors.ink, marginLeft: 4 }]}>+500 ml</Text>
            </Pressable>
            <Pressable
              style={[styles.waterPill, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}
              onPress={() => handleAddWater(1000)}
            >
              <Droplets size={16} color="#3B82F6" />
              <Text style={[Typography.button, { color: colors.ink, marginLeft: 4 }]}>+1 L</Text>
            </Pressable>
          </View>
        </View>

        {/* Sleep Logging Section */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Sleep Logs</Text>
          <Pressable onPress={() => setSleepSheetVisible(true)}>
            <Text style={[Typography.caption, { color: colors.orange, fontWeight: '600' }]}>+ Log Sleep</Text>
          </Pressable>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          {sleepLogs.length === 0 ? (
            <View style={{ padding: Spacing.base, alignItems: 'center' }}>
              <Text style={[Typography.body, { color: colors.inkMuted }]}>
                No sleep records yet. Tap above to log last night's rest.
              </Text>
            </View>
          ) : (
            sleepLogs.map((s) => (
              <View key={s.id} style={[styles.sleepRow, { borderBottomColor: colors.line }]}>
                <View style={[styles.sleepIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Moon size={18} color="#4F46E5" />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[Typography.bodyMedium, { color: colors.ink }]}>
                    {(((s.duration_minutes ?? 0) / 60)).toFixed(1)} Hours Slept
                  </Text>
                  <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                    {s.date} • Bed: {s.sleep_time || '23:00'} → Wake: {s.wake_time || '06:30'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sleep Modal */}
      <BottomSheet
        visible={sleepSheetVisible}
        onClose={() => setSleepSheetVisible(false)}
        title="Log Sleep Duration"
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Total Hours Slept
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={sleepHoursInput}
            onChangeText={setSleepHoursInput}
            keyboardType="numeric"
            placeholder="7.5"
            placeholderTextColor={colors.inkMuted}
          />

          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Bedtime</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={sleepTimeInput}
                onChangeText={setSleepTimeInput}
                placeholder="23:00"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Wake Time</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={wakeTimeInput}
                onChangeText={setWakeTimeInput}
                placeholder="06:30"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
          </View>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.ink, marginTop: Spacing.base }]}
            onPress={handleLogSleep}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Save Sleep Record</Text>
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
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
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
  waterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  waterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.button,
    borderWidth: 1,
  },
  sleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  sleepIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    justifyContent: 'center',
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
    marginBottom: Spacing.md,
  },
  twoCol: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  saveBtn: {
    height: 48,
    borderRadius: Radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
