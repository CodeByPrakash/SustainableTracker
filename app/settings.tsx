import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Paths, File } from 'expo-file-system';
import {
  Moon,
  Sun,
  Bell,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Shield,
  Info,
  CheckCircle2,
  Target,
  Save,
  Volume2,
  BellRing,
  Music,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../src/theme';
import { getDatabase } from '../src/db/database';
import { seedDatabase } from '../src/db/seeds';
import { AppHeader } from '../src/components/ui/AppHeader';
import { ConfirmDialog } from '../src/components/ui/ConfirmDialog';
import { useAppStore } from '../src/stores/appStore';
import {
  syncScheduleNotifications,
  sendImmediateTestNotification,
  cancelDailyReminders,
  setupAndroidNotificationChannel,
} from '../src/utils/notifications';
import { AppHaptics } from '../src/utils/haptics';
import { uuid } from '../src/utils/uuid';

export default function SettingsScreen() {
  const { mode, colors, toggleTheme } = useTheme();
  const router = useRouter();
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);

  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [notificationLeadMinutes, setNotificationLeadMinutes] = useState('5');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Editable Discipline Targets
  const [targetWake, setTargetWake] = useState('05:45');
  const [targetSleep, setTargetSleep] = useState('22:30');
  const [targetWater, setTargetWater] = useState('3000');
  const [targetStudy, setTargetStudy] = useState('75');
  const [targetSkill, setTargetSkill] = useState('60');
  const [targetGym, setTargetGym] = useState('60');
  const [targetBodyWeight, setTargetBodyWeight] = useState('55.0');

  const loadSettings = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
      const settingsMap = new Map(rows.map((r) => [r.key, r.value]));

      if (settingsMap.has('notifications_enabled')) {
        setRemindersEnabled(settingsMap.get('notifications_enabled') !== 'false');
      }
      if (settingsMap.has('notification_lead_minutes')) {
        setNotificationLeadMinutes(settingsMap.get('notification_lead_minutes')!);
      }
      if (settingsMap.has('target_wake_time')) setTargetWake(settingsMap.get('target_wake_time')!);
      if (settingsMap.has('target_sleep_time')) setTargetSleep(settingsMap.get('target_sleep_time')!);
      if (settingsMap.has('target_water_ml')) setTargetWater(settingsMap.get('target_water_ml')!);
      if (settingsMap.has('target_study_minutes_weekday')) setTargetStudy(settingsMap.get('target_study_minutes_weekday')!);
      if (settingsMap.has('target_skill_minutes_weekday')) setTargetSkill(settingsMap.get('target_skill_minutes_weekday')!);
      if (settingsMap.has('target_gym_minutes')) setTargetGym(settingsMap.get('target_gym_minutes')!);
      if (settingsMap.has('user_body_weight_kg')) setTargetBodyWeight(settingsMap.get('user_body_weight_kg')!);
    } catch (err) {
      console.error('Failed to load settings from db:', err);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveTargets = async () => {
    try {
      const db = await getDatabase();
      const entries = [
        ['target_wake_time', targetWake.trim()],
        ['target_sleep_time', targetSleep.trim()],
        ['target_water_ml', targetWater.trim()],
        ['target_study_minutes_weekday', targetStudy.trim()],
        ['target_skill_minutes_weekday', targetSkill.trim()],
        ['target_gym_minutes', targetGym.trim()],
        ['user_body_weight_kg', targetBodyWeight.trim()],
      ];

      for (const [key, val] of entries) {
        await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, val]);
      }

      // Also record weight to body_measurements
      const parsedWeight = parseFloat(targetBodyWeight);
      if (!isNaN(parsedWeight) && parsedWeight > 0) {
        await db.runAsync(
          `INSERT INTO body_measurements (id, date, weight_kg, unit, notes)
           VALUES (?, date('now'), ?, 'kg', 'Target updated from settings')`,
          [uuid(), parsedWeight]
        );
      }

      AppHaptics.success();
      setStatusMessage('Targets updated successfully!');
      triggerRefresh();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save targets.');
    }
  };

  // Export JSON Backup
  const handleExportBackup = async () => {
    try {
      const db = await getDatabase();
      const tables = [
        'settings',
        'schedule_blocks',
        'habits',
        'habit_logs',
        'workout_plans',
        'workout_sessions',
        'exercises',
        'exercise_sets',
        'body_measurements',
        'subjects',
        'topics',
        'study_sessions',
        'assignments',
        'exams',
        'skills',
        'skill_sessions',
        'projects',
        'sleep_logs',
        'water_logs',
      ];

      const backupData: Record<string, any[]> = {
        meta: [
          {
            app: 'DAYCRAFT',
            exportedAt: new Date().toISOString(),
            version: '1.0.0',
          },
        ],
      };

      for (const t of tables) {
        backupData[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const backupFile = new File(Paths.document, `daycraft_backup_${Date.now()}.json`);
      backupFile.create();
      backupFile.write(jsonStr);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupFile.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export DAYCRAFT Backup',
        });
      } else {
        Alert.alert('Backup Saved', `Saved locally at ${backupFile.uri}`);
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Could not export backup.');
    }
  };

  // Restore JSON Backup
  const handleRestoreBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileToRestore = new File(fileUri);
      const fileContent = await fileToRestore.text();
      const parsed = JSON.parse(fileContent);

      if (!parsed.meta || parsed.meta[0]?.app !== 'DAYCRAFT') {
        Alert.alert('Invalid Backup', 'The selected file is not a valid DAYCRAFT backup.');
        return;
      }

      const db = await getDatabase();
      // Import records
      for (const [table, rows] of Object.entries(parsed)) {
        if (table === 'meta' || !Array.isArray(rows) || rows.length === 0) continue;
        for (const row of rows) {
          const keys = Object.keys(row);
          const placeholders = keys.map(() => '?').join(', ');
          const values = Object.values(row);
          try {
            await db.runAsync(
              `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
              values as (string | number | null)[]
            );
          } catch (e) {
            console.warn(`Failed restoring row in ${table}:`, e);
          }
        }
      }

      setStatusMessage('Backup restored successfully!');
      triggerRefresh();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      Alert.alert('Restore Failed', err.message || 'Could not parse backup.');
    }
  };

  // Re-seed Database
  const handleResetDemo = async () => {
    try {
      const db = await getDatabase();
      await seedDatabase(db);
      setResetConfirmOpen(false);
      setStatusMessage('Default schedules and splits reloaded!');
      triggerRefresh();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to reset demo data:', err);
    }
  };

  // Clear Database
  const handleClearAll = async () => {
    try {
      const db = await getDatabase();
      const tables = [
        'schedule_blocks',
        'habits',
        'habit_logs',
        'workout_sessions',
        'exercise_sets',
        'study_sessions',
        'assignments',
        'exams',
        'skill_sessions',
        'sleep_logs',
        'water_logs',
        'body_measurements',
      ];
      for (const t of tables) {
        await db.runAsync(`DELETE FROM ${t}`);
      }
      setClearConfirmOpen(false);
      setStatusMessage('All personal logs cleared.');
      triggerRefresh();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to clear database:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Header */}
      <AppHeader
        title="Settings & Data"
        subtitle="App preferences, theme & offline backups"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Toast */}
        {statusMessage && (
          <View style={[styles.toast, { backgroundColor: colors.greenSoft, borderColor: colors.green }]}>
            <CheckCircle2 size={16} color={colors.greenDark} />
            <Text style={[Typography.captionSmall, { color: colors.greenDark, marginLeft: 6, fontWeight: '700' }]}>
              {statusMessage}
            </Text>
          </View>
        )}

        {/* Appearance Section */}
        <View style={styles.sectionHeader}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Appearance</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              {mode === 'dark' ? <Moon size={20} color={colors.ink} /> : <Sun size={20} color={colors.orange} />}
              <View style={{ marginLeft: Spacing.sm }}>
                <Text style={[Typography.bodyMedium, { color: colors.ink }]}>Dark Mode</Text>
                <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                  {mode === 'dark' ? 'Night palette active' : 'Warm cream canvas active'}
                </Text>
              </View>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggleTheme}
              accessible={true}
              accessibilityRole="switch"
              accessibilityLabel="Dark mode switch"
              accessibilityState={{ checked: mode === 'dark' }}
              trackColor={{ false: colors.surfaceMuted, true: colors.orange }}
              thumbColor={mode === 'dark' ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Android System Notifications Section */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]} accessibilityRole="header">Android System Notifications</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <BellRing size={20} color={colors.orange} />
              <View style={{ marginLeft: Spacing.sm, flex: 1, marginRight: Spacing.sm }}>
                <Text style={[Typography.bodyMedium, { color: colors.ink }]}>Upcoming To-Do Reminders</Text>
                <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                  Android system tray alerts for upcoming commitments
                </Text>
              </View>
            </View>
            <Switch
              value={remindersEnabled}
              accessible={true}
              accessibilityRole="switch"
              accessibilityLabel="Upcoming to-do reminders switch"
              accessibilityState={{ checked: remindersEnabled }}
              onValueChange={async (val) => {
                setRemindersEnabled(val);
                AppHaptics.selection();
                try {
                  const db = await getDatabase();
                  await db.runAsync(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES ('notifications_enabled', ?)",
                    [val ? 'true' : 'false']
                  );
                  if (val) {
                    await syncScheduleNotifications(db);
                    setStatusMessage('Android reminders active with custom sound.');
                  } else {
                    await cancelDailyReminders();
                    setStatusMessage('Reminders paused.');
                  }
                  setTimeout(() => setStatusMessage(null), 3000);
                } catch (err) {
                  console.error('Failed to toggle notifications:', err);
                }
              }}
              trackColor={{ false: colors.surfaceMuted, true: colors.orange }}
            />
          </View>

          {remindersEnabled && (
            <>
              {/* Custom Sound Info */}
              <View style={[styles.subRow, { borderTopColor: colors.line, backgroundColor: colors.surfaceMuted + '40' }]}>
                <Volume2 size={16} color={colors.orange} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '700' }]}>
                    Audio Alerts
                  </Text>
                  <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                    High-priority notification chime for upcoming to-dos
                  </Text>
                </View>
              </View>

              {/* Lead Time Selection */}
              <View style={[styles.subRow, { borderTopColor: colors.line }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '700', marginBottom: 6 }]}>
                    Reminder Timing Before Activity
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[
                      { label: 'Exact Time', value: '0' },
                      { label: '5m Before', value: '5' },
                      { label: '10m Before', value: '10' },
                      { label: '15m Before', value: '15' },
                    ].map((opt) => {
                      const isSel = notificationLeadMinutes === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          style={[
                            styles.leadPill,
                            {
                              backgroundColor: isSel ? colors.orange : colors.canvas,
                              borderColor: isSel ? colors.orange : colors.line,
                            },
                          ]}
                          onPress={async () => {
                            setNotificationLeadMinutes(opt.value);
                            AppHaptics.selection();
                            const db = await getDatabase();
                            await db.runAsync(
                              "INSERT OR REPLACE INTO settings (key, value) VALUES ('notification_lead_minutes', ?)",
                              [opt.value]
                            );
                            await syncScheduleNotifications(db);
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
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Test Notification Button */}
              <Pressable
                style={[styles.testNotifBtn, { borderTopColor: colors.line, backgroundColor: colors.orangeSoft }]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Test Android notification and chime"
                hitSlop={6}
                onPress={async () => {
                  AppHaptics.success();
                  const sent = await sendImmediateTestNotification();
                  if (sent) {
                    Alert.alert(
                      '🔔 Notification Dispatched',
                      'Check your Android notification status bar! The upcoming to-do reminder with custom chime has fired.'
                    );
                  } else {
                    Alert.alert(
                      'Permission Required',
                      'Please allow notification permissions in your Android system settings to receive reminders.'
                    );
                  }
                }}
              >
                <Bell size={15} color={colors.orangeDark} />
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', marginLeft: 6 }]}>
                  Test Android Notification & Sound Now
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Wakeup Alarms Section */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Wakeup Alarms & Music</Text>
        </View>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.orange,
              borderWidth: 1.5,
              padding: Spacing.base,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
          ]}
          onPress={() => router.push('/alarm')}
          accessibilityRole="button"
          accessibilityLabel="Manage wakeup alarms and custom music"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.orangeSoft,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
            >
              <Music size={22} color={colors.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.bodyMedium, { color: colors.ink, fontWeight: '700' }]}>
                Wakeup Alarms & Custom Music
              </Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginTop: 2 }]}>
                Set repeat alarms with custom audio, snooze & high priority call
              </Text>
            </View>
          </View>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: colors.orange,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Open</Text>
          </View>
        </Pressable>

        {/* Personal Discipline Targets Section */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Daily Discipline Targets</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, padding: Spacing.base }]}>
          <View style={styles.targetsGrid}>
            <View style={styles.targetField}>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginBottom: 4 }]}>Wake-up Target</Text>
              <TextInput
                style={[styles.targetInput, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={targetWake}
                onChangeText={setTargetWake}
                placeholder="05:45"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
            <View style={styles.targetField}>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginBottom: 4 }]}>Sleep Target</Text>
              <TextInput
                style={[styles.targetInput, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={targetSleep}
                onChangeText={setTargetSleep}
                placeholder="22:30"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
          </View>

          <View style={[styles.targetsGrid, { marginTop: Spacing.sm }]}>
            <View style={styles.targetField}>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginBottom: 4 }]}>Daily Water (ml)</Text>
              <TextInput
                style={[styles.targetInput, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={targetWater}
                onChangeText={setTargetWater}
                keyboardType="number-pad"
                placeholder="3000"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
            <View style={styles.targetField}>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginBottom: 4 }]}>Study Target (min)</Text>
              <TextInput
                style={[styles.targetInput, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={targetStudy}
                onChangeText={setTargetStudy}
                keyboardType="number-pad"
                placeholder="75"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
          </View>

          <View style={[styles.targetsGrid, { marginTop: Spacing.sm }]}>
            <View style={styles.targetField}>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginBottom: 4 }]}>Coding Target (min)</Text>
              <TextInput
                style={[styles.targetInput, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={targetSkill}
                onChangeText={setTargetSkill}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
            <View style={styles.targetField}>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginBottom: 4 }]}>Gym Target (min)</Text>
              <TextInput
                style={[styles.targetInput, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={targetGym}
                onChangeText={setTargetGym}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
          </View>

          <View style={[styles.targetsGrid, { marginTop: Spacing.sm }]}>
            <View style={styles.targetField}>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginBottom: 4 }]}>Target Body Weight (kg)</Text>
              <TextInput
                style={[styles.targetInput, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={targetBodyWeight}
                onChangeText={setTargetBodyWeight}
                keyboardType="numeric"
                placeholder="55.0"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
          </View>

          <Pressable
            style={[styles.saveTargetsBtn, { backgroundColor: colors.orange, marginTop: Spacing.base }]}
            onPress={handleSaveTargets}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Save personal discipline targets"
          >
            <Save size={16} color="#FFFFFF" />
            <Text style={[Typography.button, { color: '#FFFFFF', marginLeft: 6 }]}>Save Targets</Text>
          </Pressable>
        </View>

        {/* Offline Backup & Restore Section */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]} accessibilityRole="header">Offline Data & Backup</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Pressable
            style={[styles.actionRow, { borderBottomColor: colors.line }]}
            onPress={handleExportBackup}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Export JSON backup to device"
          >
            <Download size={20} color={colors.orange} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[Typography.bodyMedium, { color: colors.ink }]}>Export JSON Backup</Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                Save complete SQLite database to local JSON file
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.actionRow}
            onPress={handleRestoreBackup}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Restore JSON backup from file"
          >
            <Upload size={20} color={colors.green} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[Typography.bodyMedium, { color: colors.ink }]}>Restore JSON Backup</Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                Restore records from a previously exported file
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Maintenance Section */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]} accessibilityRole="header">Database Management</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Pressable
            style={[styles.actionRow, { borderBottomColor: colors.line }]}
            onPress={() => setResetConfirmOpen(true)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Reload default schedule and timetable"
          >
            <RefreshCw size={20} color={colors.ink} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[Typography.bodyMedium, { color: colors.ink }]}>Reload Default Schedule</Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                Restore engineering timetable and workout split
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.actionRow}
            onPress={() => setClearConfirmOpen(true)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Clear all personal tracking logs"
          >
            <Trash2 size={20} color={colors.danger} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[Typography.bodyMedium, { color: colors.danger }]}>Clear All Tracking Logs</Text>
              <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                Reset all workout, study, and habit records
              </Text>
            </View>
          </Pressable>
        </View>

        {/* About App Card */}
        <View style={[styles.aboutCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>DAYCRAFT v1.0.0</Text>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginTop: 4 }]}>
            Your Personal Discipline System. Fully offline-first, local SQLite storage, private by design.
          </Text>
        </View>
      </ScrollView>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        visible={resetConfirmOpen}
        title="Reload Default Schedule"
        message="This will re-seed the default engineering student timetable, workout split, and habits without deleting your custom entries."
        confirmLabel="Reload"
        cancelLabel="Cancel"
        onConfirm={handleResetDemo}
        onCancel={() => setResetConfirmOpen(false)}
      />

      {/* Confirm Clear Dialog */}
      <ConfirmDialog
        visible={clearConfirmOpen}
        title="Clear All Tracking Data"
        message="Are you sure? This will delete all logged workout sessions, study timers, and habit logs. This action cannot be undone."
        confirmLabel="Clear Data"
        cancelLabel="Cancel"
        onConfirm={handleClearAll}
        onCancel={() => setClearConfirmOpen(false)}
        destructive
      />
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
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderTopWidth: 1,
  },
  leadPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  testNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  aboutCard: {
    padding: Spacing.base,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  targetsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  targetField: {
    flex: 1,
  },
  targetInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    fontSize: 15,
  },
  saveTargetsBtn: {
    flexDirection: 'row',
    height: 44,
    borderRadius: Radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
