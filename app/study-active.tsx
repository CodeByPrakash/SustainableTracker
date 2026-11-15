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
  RotateCcw,
  BookOpen,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../src/theme';
import { getDatabase } from '../src/db/database';
import { getSubjects, createStudySession, Subject } from '../src/db/queries/academicQueries';
import { formatDuration, getToday } from '../src/utils/dateUtils';
import { useAppStore } from '../src/stores/appStore';
import { useTimerStore } from '../src/stores/timerStore';

export default function StudyActiveModal() {
  const { colors } = useTheme();
  const router = useRouter();
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjId, setSelectedSubjId] = useState<string>('');
  const [sessionType, setSessionType] = useState('learning');
  const [notes, setNotes] = useState('');

  // Timer states
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  // Load subjects
  useEffect(() => {
    async function loadSubjs() {
      try {
        const db = await getDatabase();
        const list = await getSubjects(db);
        setSubjects(list);
        if (list.length > 0) {
          setSelectedSubjId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    }
    loadSubjs();
  }, []);

  // Stopwatch interval
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Finish and save focus session
  const handleFinish = async () => {
    if (!selectedSubjId) {
      Alert.alert('Subject Required', 'Please select a subject.');
      return;
    }
    try {
      const db = await getDatabase();
      await createStudySession(db, {
        subject_id: selectedSubjId,
        date: getToday(),
        duration_seconds: seconds,
        session_type: sessionType,
        notes: notes.trim() || null,
      });
      triggerRefresh();
      router.back();
    } catch (err) {
      console.error('Failed to save study session:', err);
      Alert.alert('Save Error', 'Could not record study session.');
    }
  };

  const types = ['learning', 'revision', 'problem_solving', 'mock_test'];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close study session"
          hitSlop={8}
        >
          <X size={22} color={colors.ink} />
        </Pressable>
        <Text style={[Typography.sectionTitle, { color: colors.greenDark }]} accessibilityRole="header">Deep Focus Study</Text>
        <Pressable
          style={[styles.finishBtn, { backgroundColor: colors.green }]}
          onPress={handleFinish}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Complete and save study session"
        >
          <Text style={[Typography.button, { color: '#FFFFFF' }]}>Complete</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Timer Hero Display */}
        <View style={[styles.timerCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text
            style={[styles.timerDigits, { color: colors.greenDark }]}
            accessible={true}
            accessibilityLabel={`Elapsed time: ${formatDuration(seconds)}`}
          >
            {formatDuration(seconds)}
          </Text>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginTop: 4 }]}>
            {isRunning ? 'Focusing... Stay off distractions' : 'Session Paused'}
          </Text>

          <View style={styles.controlsRow}>
            <Pressable
              style={[
                styles.playPauseBtn,
                { backgroundColor: isRunning ? colors.warning : colors.green },
              ]}
              onPress={() => setIsRunning(!isRunning)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={isRunning ? 'Pause timer' : 'Resume timer'}
            >
              {isRunning ? (
                <Pause size={24} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              )}
            </Pressable>
            <Pressable
              style={[styles.resetBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.line }]}
              onPress={() => setSeconds(0)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Reset timer to zero"
            >
              <RotateCcw size={20} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        {/* Subject Picker */}
        <Text style={[Typography.sectionTitle, { color: colors.ink, marginTop: Spacing.base, marginBottom: Spacing.xs }]}>
          Subject
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          {subjects.map((s) => {
            const isSelected = selectedSubjId === s.id;
            return (
              <Pressable
                key={s.id}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Subject: ${s.name}`}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected ? colors.green : colors.surface,
                    borderColor: isSelected ? colors.green : colors.line,
                  },
                ]}
                onPress={() => setSelectedSubjId(s.id)}
              >
                <Text
                  style={[
                    Typography.captionSmall,
                    { color: isSelected ? '#FFFFFF' : colors.ink, fontWeight: isSelected ? '700' : '500' },
                  ]}
                >
                  {s.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Session Type */}
        <Text style={[Typography.sectionTitle, { color: colors.ink, marginTop: Spacing.base, marginBottom: Spacing.xs }]}>
          Session Focus Type
        </Text>
        <View style={styles.typeGrid}>
          {types.map((t) => {
            const isSelected = sessionType === t;
            return (
              <Pressable
                key={t}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Focus type: ${t.replace('_', ' ')}`}
                style={[
                  styles.typePill,
                  {
                    backgroundColor: isSelected ? colors.greenSoft : colors.surface,
                    borderColor: isSelected ? colors.green : colors.line,
                  },
                ]}
                onPress={() => setSessionType(t)}
              >
                <Text
                  style={[
                    Typography.captionSmall,
                    {
                      color: isSelected ? colors.greenDark : colors.ink,
                      fontWeight: isSelected ? '700' : '500',
                      textTransform: 'capitalize',
                    },
                  ]}
                >
                  {t.replace('_', ' ')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Notes input */}
        <Text style={[Typography.sectionTitle, { color: colors.ink, marginTop: Spacing.base, marginBottom: Spacing.xs }]}>
          Session Notes (Optional)
        </Text>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.surface, color: colors.ink, borderColor: colors.line }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Topics covered, problems solved, or insights..."
          placeholderTextColor={colors.inkMuted}
          multiline
          numberOfLines={4}
        />
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
  finishBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  timerCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  timerDigits: {
    fontSize: 54,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  playPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  resetBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillsScroll: {
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.base,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
