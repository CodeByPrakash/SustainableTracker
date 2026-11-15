import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Bell,
  Music,
  Volume2,
  Trash2,
  Edit2,
  Play,
  Square,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../src/theme';
import { getDatabase } from '../src/db/database';
import {
  getAllAlarms,
  createAlarm,
  updateAlarm,
  deleteAlarm,
  toggleAlarm,
  type AlarmItem,
} from '../src/db/queries/alarmQueries';
import {
  pickCustomAlarmAudio,
  playAlarmSound,
  stopAlarmSound,
  previewAlarmSound,
} from '../src/utils/alarmAudio';
import {
  syncAlarmNotifications,
  scheduleSnoozeNotification,
} from '../src/utils/alarmNotifications';
import { AlarmRingingModal } from '../src/components/AlarmRingingModal';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AlarmScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Playing preview state
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Ringing modal state (for testing or wake events)
  const [ringingAlarm, setRingingAlarm] = useState<AlarmItem | null>(null);
  const [ringingVisible, setRingingVisible] = useState<boolean>(false);

  // Editor modal state
  const [editorVisible, setEditorVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hour12, setHour12] = useState<number>(5);
  const [minute, setMinute] = useState<number>(45);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [label, setLabel] = useState<string>('Wake Up');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [soundType, setSoundType] = useState<'preset' | 'custom'>('preset');
  const [soundName, setSoundName] = useState<string>('Daycraft Chime');
  const [soundUri, setSoundUri] = useState<string | null>(null);
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(9);
  const [vibrate, setVibrate] = useState<boolean>(true);
  const [isEditorPreviewing, setIsEditorPreviewing] = useState<boolean>(false);

  const loadAlarms = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const list = await getAllAlarms(db);
      setAlarms(list);
    } catch (err) {
      console.error('Failed to load alarms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlarms();
    return () => {
      stopAlarmSound();
    };
  }, [loadAlarms]);

  // Format 24-hr string into 12-hr representation
  const parseAlarmTime = (time24: string) => {
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return {
      hour: h,
      minute: m,
      period: ampm,
      minuteFormatted: m.toString().padStart(2, '0'),
    };
  };

  const handleToggle = async (id: string, currentEnabled: number) => {
    try {
      const nextEnabled = currentEnabled === 1 ? 0 : 1;
      const db = await getDatabase();
      await toggleAlarm(db, id, nextEnabled === 1);
      await syncAlarmNotifications(db);
      setAlarms((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_enabled: nextEnabled } : a))
      );
    } catch (err) {
      console.error('Error toggling alarm:', err);
    }
  };

  const handleDelete = (id: string, alarmLabel: string) => {
    Alert.alert(
      'Delete Alarm',
      `Are you sure you want to delete "${alarmLabel}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await deleteAlarm(db, id);
              await syncAlarmNotifications(db);
              setAlarms((prev) => prev.filter((a) => a.id !== id));
            } catch (err) {
              console.error('Error deleting alarm:', err);
            }
          },
        },
      ]
    );
  };

  const handleOpenEditor = (alarm?: AlarmItem) => {
    stopAlarmSound();
    setPreviewingId(null);
    setIsEditorPreviewing(false);

    if (alarm) {
      const parsed = parseAlarmTime(alarm.time);
      setEditingId(alarm.id);
      setHour12(parsed.hour);
      setMinute(parsed.minute);
      setPeriod(parsed.period as 'AM' | 'PM');
      setLabel(alarm.label);
      setSelectedDays(
        alarm.days.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
      );
      setSoundType(alarm.sound_type);
      setSoundName(alarm.sound_name);
      setSoundUri(alarm.sound_uri);
      setSnoozeMinutes(alarm.snooze_minutes);
      setVibrate(alarm.vibrate === 1);
    } else {
      setEditingId(null);
      setHour12(5);
      setMinute(45);
      setPeriod('AM');
      setLabel('Wake Up');
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      setSoundType('preset');
      setSoundName('Daycraft Chime');
      setSoundUri(null);
      setSnoozeMinutes(9);
      setVibrate(true);
    }
    setEditorVisible(true);
  };

  const handlePickCustomMusic = async () => {
    const picked = await pickCustomAlarmAudio();
    if (picked) {
      setSoundType('custom');
      setSoundName(picked.name);
      setSoundUri(picked.uri);
      // Auto-preview picked sound
      setIsEditorPreviewing(true);
      await previewAlarmSound(picked.uri, 6000);
    }
  };

  const handleToggleEditorPreview = async () => {
    if (isEditorPreviewing) {
      await stopAlarmSound();
      setIsEditorPreviewing(false);
    } else {
      setIsEditorPreviewing(true);
      await previewAlarmSound(soundType === 'custom' ? soundUri : null, 8000);
      setTimeout(() => {
        setIsEditorPreviewing(false);
      }, 8000);
    }
  };

  const handleSaveAlarm = async () => {
    try {
      await stopAlarmSound();
      setIsEditorPreviewing(false);

      // Convert 12h to 24h
      let h24 = hour12;
      if (period === 'PM' && h24 < 12) h24 += 12;
      if (period === 'AM' && h24 === 12) h24 = 0;
      const time24 = `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      const daysStr = selectedDays.length > 0 ? selectedDays.sort((a, b) => a - b).join(',') : '0,1,2,3,4,5,6';

      const db = await getDatabase();
      if (editingId) {
        await updateAlarm(db, {
          id: editingId,
          time: time24,
          label: label.trim() || 'Wake Up',
          days: daysStr,
          sound_type: soundType,
          sound_name: soundName,
          sound_uri: soundType === 'custom' ? soundUri : null,
          snooze_minutes: snoozeMinutes,
          vibrate: vibrate ? 1 : 0,
        });
      } else {
        await createAlarm(db, {
          time: time24,
          label: label.trim() || 'Wake Up',
          days: daysStr,
          is_enabled: 1,
          sound_type: soundType,
          sound_name: soundName,
          sound_uri: soundType === 'custom' ? soundUri : null,
          snooze_minutes: snoozeMinutes,
          vibrate: vibrate ? 1 : 0,
        });
      }

      await syncAlarmNotifications(db);
      setEditorVisible(false);
      await loadAlarms();
    } catch (err) {
      console.error('Error saving alarm:', err);
      Alert.alert('Error', 'Failed to save alarm. Please try again.');
    }
  };

  const handleToggleListPreview = async (alarm: AlarmItem) => {
    if (previewingId === alarm.id) {
      await stopAlarmSound();
      setPreviewingId(null);
    } else {
      setPreviewingId(alarm.id);
      await previewAlarmSound(alarm.sound_type === 'custom' ? alarm.sound_uri : null, 8000);
      setTimeout(() => {
        setPreviewingId((current) => (current === alarm.id ? null : current));
      }, 8000);
    }
  };

  const handleTestAlarmNow = async (alarmToTest?: AlarmItem) => {
    const target = alarmToTest || alarms[0];
    if (!target) return;
    setRingingAlarm(target);
    setRingingVisible(true);
    await playAlarmSound(target.sound_type === 'custom' ? target.sound_uri : null, true);
  };

  const handleDismissRinging = async () => {
    await stopAlarmSound();
    setRingingVisible(false);
    setRingingAlarm(null);
  };

  const handleSnoozeRinging = async (alarm: AlarmItem) => {
    await stopAlarmSound();
    setRingingVisible(false);
    setRingingAlarm(null);
    await scheduleSnoozeNotification(alarm);
    Alert.alert(
      'Alarm Snoozed',
      `Snoozed for ${alarm.snooze_minutes || 9} minutes. Sleep well for a bit!`
    );
  };

  const toggleDaySelection = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      if (selectedDays.length === 1) return; // Keep at least one day
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.line, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.ink }]} accessibilityRole="header">
            Wakeup Alarms
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
            Wake up on time with your custom music
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.orange }]}
          onPress={() => handleOpenEditor()}
          accessibilityRole="button"
          accessibilityLabel="Add New Alarm"
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Test Alarm Hero Card */}
        {alarms.length > 0 && (
          <View style={[styles.testHeroCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.testHeroLeft}>
              <View style={[styles.heroIconBadge, { backgroundColor: colors.orangeSoft }]}>
                <Sparkles size={20} color={colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroTitle, { color: colors.ink }]}>
                  Test Wakeup Sound
                </Text>
                <Text style={[styles.heroSubtitle, { color: colors.inkMuted }]}>
                  Preview custom music and dismiss controls
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.testHeroButton, { backgroundColor: colors.orange }]}
              onPress={() => handleTestAlarmNow(alarms[0])}
              accessibilityRole="button"
              accessibilityLabel="Test Alarm Now"
            >
              <Play size={14} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.testHeroButtonText}>Test Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Alarm List Header */}
        <View style={styles.listSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]} accessibilityRole="header">
            Your Alarms ({alarms.length})
          </Text>
        </View>

        {alarms.length === 0 && !loading && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Bell size={40} color={colors.inkMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>No Alarms Set</Text>
            <Text style={[styles.emptyText, { color: colors.inkMuted }]}>
              Create a wake-up alarm to rise energized with your favorite morning music.
            </Text>
            <TouchableOpacity
              style={[styles.createFirstButton, { backgroundColor: colors.orange }]}
              onPress={() => handleOpenEditor()}
              accessibilityRole="button"
            >
              <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.createFirstButtonText}>Create Wakeup Alarm</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Alarm Cards */}
        {alarms.map((alarm) => {
          const parsed = parseAlarmTime(alarm.time);
          const activeDaysArray = alarm.days
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n));
          const isEnabled = alarm.is_enabled === 1;
          const isPreviewing = previewingId === alarm.id;

          return (
            <View
              key={alarm.id}
              style={[
                styles.alarmCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isEnabled ? colors.orange : colors.line,
                  opacity: isEnabled ? 1 : 0.65,
                },
              ]}
            >
              {/* Card Top Row: Time & Switch */}
              <View style={styles.alarmCardTop}>
                <TouchableOpacity
                  style={styles.timePressArea}
                  onPress={() => handleOpenEditor(alarm)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit alarm ${alarm.label} at ${parsed.hour}:${parsed.minuteFormatted} ${parsed.period}`}
                >
                  <View style={styles.timeDisplayWrap}>
                    <Text style={[styles.cardTimeText, { color: colors.ink }]}>
                      {parsed.hour}:{parsed.minuteFormatted}
                    </Text>
                    <Text style={[styles.cardPeriodText, { color: colors.orange }]}>
                      {parsed.period}
                    </Text>
                  </View>
                  <Text style={[styles.cardLabelText, { color: colors.inkMuted }]}>
                    {alarm.label}
                  </Text>
                </TouchableOpacity>

                <View style={styles.cardSwitchWrap}>
                  <Switch
                    value={isEnabled}
                    onValueChange={() => handleToggle(alarm.id, alarm.is_enabled)}
                    trackColor={{ false: colors.line, true: colors.orange }}
                    thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                    accessibilityRole="switch"
                    accessibilityLabel={`Toggle alarm ${alarm.label}`}
                  />
                </View>
              </View>

              {/* Day Chips */}
              <View style={styles.daysRow}>
                {DAY_LABELS.map((dayLabel, idx) => {
                  const isActiveDay = activeDaysArray.includes(idx);
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: isActiveDay && isEnabled ? colors.orangeSoft : colors.surfaceMuted,
                          borderColor: isActiveDay && isEnabled ? colors.orange : colors.line,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          {
                            color: isActiveDay && isEnabled ? colors.orangeDark : colors.inkMuted,
                            fontFamily: isActiveDay ? 'Inter_700Bold' : 'Inter_400Regular',
                          },
                        ]}
                      >
                        {dayLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Card Footer: Music & Actions */}
              <View style={[styles.alarmCardFooter, { borderTopColor: colors.line }]}>
                {/* Sound Pill & Preview */}
                <TouchableOpacity
                  style={[
                    styles.soundPill,
                    {
                      backgroundColor: isPreviewing ? colors.orangeSoft : colors.surfaceMuted,
                      borderColor: isPreviewing ? colors.orange : colors.line,
                    },
                  ]}
                  onPress={() => handleToggleListPreview(alarm)}
                  accessibilityRole="button"
                  accessibilityLabel={isPreviewing ? 'Stop audio preview' : `Preview sound ${alarm.sound_name}`}
                >
                  {alarm.sound_type === 'custom' ? (
                    <Music size={14} color={colors.orange} style={{ marginRight: 6 }} />
                  ) : (
                    <Volume2 size={14} color={colors.orange} style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.soundPillText, { color: colors.ink }]} numberOfLines={1}>
                    {alarm.sound_name}
                  </Text>
                  {isPreviewing ? (
                    <Square size={12} color={colors.orange} fill={colors.orange} style={{ marginLeft: 6 }} />
                  ) : (
                    <Play size={12} color={colors.inkMuted} style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>

                {/* Edit & Delete Action Buttons */}
                <View style={styles.cardActionsWrap}>
                  <TouchableOpacity
                    style={[styles.actionIconBtn, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => handleOpenEditor(alarm)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit Alarm"
                  >
                    <Edit2 size={16} color={colors.ink} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionIconBtn, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => handleDelete(alarm.id, alarm.label)}
                    accessibilityRole="button"
                    accessibilityLabel="Delete Alarm"
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Editor Modal / Sheet */}
      <Modal
        visible={editorVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          stopAlarmSound();
          setEditorVisible(false);
        }}
      >
        <View style={[styles.editorContainer, { backgroundColor: colors.canvas }]}>
          {/* Editor Header */}
          <View style={[styles.editorHeader, { borderBottomColor: colors.line, backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => {
                stopAlarmSound();
                setEditorVisible(false);
              }}
              style={styles.editorHeaderBtn}
              accessibilityRole="button"
            >
              <Text style={[styles.editorHeaderBtnText, { color: colors.inkMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.editorHeaderTitle, { color: colors.ink }]}>
              {editingId ? 'Edit Alarm' : 'New Wakeup Alarm'}
            </Text>
            <TouchableOpacity
              onPress={handleSaveAlarm}
              style={[styles.editorHeaderBtn, { backgroundColor: colors.orange, borderRadius: 10, paddingHorizontal: 14 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.editorHeaderBtnText, { color: '#FFFFFF', fontFamily: 'Inter_700Bold' }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.editorScroll}>
            {/* Time Selector Section */}
            <View style={[styles.editorCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={[styles.editorSectionTitle, { color: colors.inkMuted }]}>
                SET WAKE TIME
              </Text>

              <View style={styles.timeEditorRow}>
                {/* Hour */}
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => setHour12((h) => (h === 1 ? 12 : h - 1))}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease hour"
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.ink }]}>−</Text>
                  </TouchableOpacity>
                  <View style={[styles.timeBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}>
                    <Text style={[styles.timeBoxText, { color: colors.ink }]}>
                      {hour12.toString().padStart(2, '0')}
                    </Text>
                    <Text style={[styles.timeBoxSub, { color: colors.inkMuted }]}>HOUR</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => setHour12((h) => (h === 12 ? 1 : h + 1))}
                    accessibilityRole="button"
                    accessibilityLabel="Increase hour"
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.ink }]}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.timeColon, { color: colors.ink }]}>:</Text>

                {/* Minute */}
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => setMinute((m) => (m === 0 ? 59 : m - 1))}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease minute"
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.ink }]}>−</Text>
                  </TouchableOpacity>
                  <View style={[styles.timeBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}>
                    <Text style={[styles.timeBoxText, { color: colors.ink }]}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                    <Text style={[styles.timeBoxSub, { color: colors.inkMuted }]}>MIN</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => setMinute((m) => (m === 59 ? 0 : m + 1))}
                    accessibilityRole="button"
                    accessibilityLabel="Increase minute"
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.ink }]}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* AM / PM Toggle */}
                <View style={styles.ampmWrap}>
                  <TouchableOpacity
                    style={[
                      styles.ampmBtn,
                      {
                        backgroundColor: period === 'AM' ? colors.orange : colors.surfaceMuted,
                      },
                    ]}
                    onPress={() => setPeriod('AM')}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.ampmBtnText,
                        { color: period === 'AM' ? '#FFFFFF' : colors.inkMuted },
                      ]}
                    >
                      AM
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.ampmBtn,
                      {
                        backgroundColor: period === 'PM' ? colors.orange : colors.surfaceMuted,
                      },
                    ]}
                    onPress={() => setPeriod('PM')}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.ampmBtnText,
                        { color: period === 'PM' ? '#FFFFFF' : colors.inkMuted },
                      ]}
                    >
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick 5-min buttons */}
              <View style={styles.quickMinuteRow}>
                {[-15, -5, +5, +15].map((delta) => (
                  <TouchableOpacity
                    key={delta}
                    style={[styles.quickMinuteBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}
                    onPress={() => {
                      let nextM = minute + delta;
                      let nextH = hour12;
                      if (nextM >= 60) {
                        nextM %= 60;
                        nextH = nextH === 12 ? 1 : nextH + 1;
                      } else if (nextM < 0) {
                        nextM = 60 + nextM;
                        nextH = nextH === 1 ? 12 : nextH - 1;
                      }
                      setMinute(nextM);
                      setHour12(nextH);
                    }}
                  >
                    <Text style={[styles.quickMinuteBtnText, { color: colors.ink }]}>
                      {delta > 0 ? `+${delta}m` : `${delta}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Label Input */}
            <View style={[styles.editorCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={[styles.editorSectionTitle, { color: colors.inkMuted }]}>
                ALARM LABEL
              </Text>
              <TextInput
                style={[
                  styles.labelInput,
                  {
                    color: colors.ink,
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.line,
                  },
                ]}
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Morning Wakeup, Gym Rise"
                placeholderTextColor={colors.inkMuted}
                accessibilityLabel="Alarm label input"
              />
            </View>

            {/* Repeat Days Section */}
            <View style={[styles.editorCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.editorSectionTitle, { color: colors.inkMuted }]}>
                  REPEAT ON
                </Text>
                <View style={styles.presetDaysRow}>
                  <TouchableOpacity
                    onPress={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                    style={[styles.presetDayLink]}
                  >
                    <Text style={[styles.presetDayLinkText, { color: colors.orange }]}>Every day</Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.inkMuted }}>•</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedDays([1, 2, 3, 4, 5])}
                    style={[styles.presetDayLink]}
                  >
                    <Text style={[styles.presetDayLinkText, { color: colors.orange }]}>Weekdays</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.editorDaysRow}>
                {DAY_NAMES.map((name, idx) => {
                  const isSelected = selectedDays.includes(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.editorDayButton,
                        {
                          backgroundColor: isSelected ? colors.orange : colors.surfaceMuted,
                          borderColor: isSelected ? colors.orange : colors.line,
                        },
                      ]}
                      onPress={() => toggleDaySelection(idx)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`Repeat on ${name}`}
                    >
                      <Text
                        style={[
                          styles.editorDayButtonText,
                          { color: isSelected ? '#FFFFFF' : colors.ink },
                        ]}
                      >
                        {name[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Music & Sound Picker Section */}
            <View style={[styles.editorCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={[styles.editorSectionTitle, { color: colors.inkMuted }]}>
                ALARM MUSIC & SOUND
              </Text>

              {/* Sound Mode Selector */}
              <View style={styles.soundTypeSwitchRow}>
                <TouchableOpacity
                  style={[
                    styles.soundTypeBtn,
                    {
                      backgroundColor: soundType === 'preset' ? colors.orangeSoft : colors.surfaceMuted,
                      borderColor: soundType === 'preset' ? colors.orange : colors.line,
                    },
                  ]}
                  onPress={() => {
                    setSoundType('preset');
                    setSoundName('Daycraft Chime');
                    setSoundUri(null);
                  }}
                  accessibilityRole="button"
                >
                  <Volume2 size={16} color={soundType === 'preset' ? colors.orangeDark : colors.inkMuted} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.soundTypeBtnText,
                      { color: soundType === 'preset' ? colors.orangeDark : colors.ink },
                    ]}
                  >
                    Default Preset
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.soundTypeBtn,
                    {
                      backgroundColor: soundType === 'custom' ? colors.orangeSoft : colors.surfaceMuted,
                      borderColor: soundType === 'custom' ? colors.orange : colors.line,
                    },
                  ]}
                  onPress={handlePickCustomMusic}
                  accessibilityRole="button"
                >
                  <Music size={16} color={soundType === 'custom' ? colors.orangeDark : colors.inkMuted} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.soundTypeBtnText,
                      { color: soundType === 'custom' ? colors.orangeDark : colors.ink },
                    ]}
                  >
                    Custom Music
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Current Sound Display & Audio Actions */}
              <View style={[styles.currentSoundCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.currentSoundType, { color: colors.inkMuted }]}>
                    {soundType === 'custom' ? 'CUSTOM AUDIO FILE' : 'PRESET CHIME'}
                  </Text>
                  <Text style={[styles.currentSoundName, { color: colors.ink }]} numberOfLines={1}>
                    {soundName}
                  </Text>
                </View>

                {/* Preview Sound Button */}
                <TouchableOpacity
                  style={[styles.previewAudioBtn, { backgroundColor: colors.surface, borderColor: colors.line }]}
                  onPress={handleToggleEditorPreview}
                  accessibilityRole="button"
                  accessibilityLabel={isEditorPreviewing ? 'Stop music preview' : 'Listen to preview'}
                >
                  {isEditorPreviewing ? (
                    <>
                      <Square size={14} color={colors.orange} fill={colors.orange} style={{ marginRight: 6 }} />
                      <Text style={[styles.previewAudioBtnText, { color: colors.orange }]}>Stop</Text>
                    </>
                  ) : (
                    <>
                      <Play size={14} color={colors.ink} style={{ marginRight: 6 }} />
                      <Text style={[styles.previewAudioBtnText, { color: colors.ink }]}>Preview</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Button to Choose / Change Custom Music */}
              <TouchableOpacity
                style={[styles.pickAudioButton, { borderColor: colors.orange, backgroundColor: colors.canvas }]}
                onPress={handlePickCustomMusic}
                accessibilityRole="button"
                accessibilityLabel="Choose custom music file from device"
              >
                <Music size={18} color={colors.orange} style={{ marginRight: 8 }} />
                <Text style={[styles.pickAudioButtonText, { color: colors.orange }]}>
                  {soundType === 'custom' ? 'Change Custom Audio File...' : '+ Choose Custom Music From Device'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Snooze & Vibration Section */}
            <View style={[styles.editorCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.editorSectionTitle, { color: colors.inkMuted }]}>
                  SNOOZE DURATION
                </Text>
              </View>
              <View style={styles.snoozeRow}>
                {[5, 9, 10, 15].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.snoozeChip,
                      {
                        backgroundColor: snoozeMinutes === mins ? colors.orange : colors.surfaceMuted,
                        borderColor: snoozeMinutes === mins ? colors.orange : colors.line,
                      },
                    ]}
                    onPress={() => setSnoozeMinutes(mins)}
                  >
                    <Text
                      style={[
                        styles.snoozeChipText,
                        { color: snoozeMinutes === mins ? '#FFFFFF' : colors.ink },
                      ]}
                    >
                      {mins} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.vibrateRow, { borderTopColor: colors.line, marginTop: 16, paddingTop: 16 }]}>
                <Text style={[styles.vibrateLabel, { color: colors.ink }]}>Vibrate on Alarm</Text>
                <Switch
                  value={vibrate}
                  onValueChange={setVibrate}
                  trackColor={{ false: colors.line, true: colors.orange }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Ringing Modal for Alarms */}
      <AlarmRingingModal
        visible={ringingVisible}
        alarm={ringingAlarm}
        onDismiss={handleDismissRinging}
        onSnooze={handleSnoozeRinging}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  testHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  testHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  heroIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  testHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  testHeroButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  listSectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  createFirstButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  alarmCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 14,
  },
  alarmCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timePressArea: {
    flex: 1,
  },
  timeDisplayWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardTimeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    letterSpacing: -0.5,
  },
  cardPeriodText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    marginLeft: 6,
  },
  cardLabelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginTop: 2,
  },
  cardSwitchWrap: {
    paddingLeft: 12,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  dayChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipText: {
    fontSize: 12,
  },
  alarmCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  soundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: '70%',
  },
  soundPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    flexShrink: 1,
  },
  cardActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Editor Styles
  editorContainer: {
    flex: 1,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  editorHeaderBtn: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  editorHeaderBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  editorHeaderTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  editorScroll: {
    padding: 16,
    gap: 16,
  },
  editorCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  editorSectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  timeEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  stepperWrap: {
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  timeBox: {
    width: 68,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBoxText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  timeBoxSub: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    marginTop: -2,
  },
  timeColon: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    marginHorizontal: 2,
    marginBottom: 20,
  },
  ampmWrap: {
    marginLeft: 8,
    gap: 8,
  },
  ampmBtn: {
    width: 50,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ampmBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  quickMinuteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  quickMinuteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickMinuteBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  labelInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  presetDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetDayLink: {
    paddingVertical: 2,
  },
  presetDayLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  editorDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  editorDayButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorDayButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  soundTypeSwitchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  soundTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  soundTypeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  currentSoundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  currentSoundType: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 2,
  },
  currentSoundName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  previewAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewAudioBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  pickAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    minHeight: 48,
  },
  pickAudioButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  snoozeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  snoozeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  vibrateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vibrateLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
});
