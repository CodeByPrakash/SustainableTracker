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
import {
  Plus,
  Calendar,
  Clock,
  Trash2,
  CheckCircle2,
  Circle,
  XCircle,
  Tag,
  Sparkles,
  RotateCcw,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../../src/theme';
import { getDatabase } from '../../src/db/database';
import {
  getScheduleForDay,
  createBlock,
  updateBlock,
  updateBlockStatus,
  deleteBlock,
  applySpecialWeekendDay,
  resetWeeklySchedule,
  resetDaySchedule,
  checkAndAutoResetWeeklySchedule,
  ScheduleBlock,
} from '../../src/db/queries/scheduleQueries';
import { formatTime12, DAY_NAMES_SHORT, DAY_NAMES } from '../../src/utils/dateUtils';
import { TaskRow } from '../../src/components/ui/TaskRow';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { useAppStore } from '../../src/stores/appStore';
import { syncScheduleNotifications } from '../../src/utils/notifications';

export default function PlanScreen() {
  const { colors } = useTheme();
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);

  // Default day of week: current day (1=Mon ... 7=Sun)
  const currentDayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const [selectedDay, setSelectedDay] = useState<number>(currentDayOfWeek);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formCategory, setFormCategory] = useState('routine');

  const loadSchedule = useCallback(async () => {
    try {
      const db = await getDatabase();
      const didAutoReset = await checkAndAutoResetWeeklySchedule(db);
      if (didAutoReset) {
        triggerRefresh();
      }
      const blocks = await getScheduleForDay(db, selectedDay);
      setSchedule(blocks);
    } catch (err) {
      console.error('Failed to load schedule for day:', err);
    }
  }, [selectedDay, triggerRefresh]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Reset agenda checkboxes (Weekly or Daily)
  const handlePromptReset = () => {
    Alert.alert(
      'Reset Agenda Checkboxes',
      'Select whether to reset checkboxes for today or reset the entire week across all 7 days for a fresh start:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Reset ${DAY_NAMES[selectedDay - 1]} Only`,
          onPress: async () => {
            try {
              const db = await getDatabase();
              await resetDaySchedule(db, selectedDay);
              await loadSchedule();
              triggerRefresh();
            } catch (err) {
              console.error('Failed to reset day schedule:', err);
            }
          },
        },
        {
          text: 'Reset Entire Week (All 7 Days)',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await resetWeeklySchedule(db);
              await loadSchedule();
              triggerRefresh();
              Alert.alert('Week Reset Complete', 'All agenda commitments across all 7 days have been unchecked for the new week.');
            } catch (err) {
              console.error('Failed to reset weekly schedule:', err);
            }
          },
        },
      ]
    );
  };

  // Toggle status
  const handleToggleStatus = async (block: ScheduleBlock) => {
    const next = block.status === 'completed' ? 'pending' : 'completed';
    try {
      const db = await getDatabase();
      await updateBlockStatus(db, block.id, next);
      setSchedule((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, status: next } : b))
      );
      triggerRefresh();
    } catch (err) {
      console.error('Failed to update block status:', err);
    }
  };

  // Apply Special Weekend Agenda (Saturday=6, Sunday=7)
  const handleApplySpecialWeekend = async (dayNum: 6 | 7) => {
    try {
      const db = await getDatabase();
      await applySpecialWeekendDay(db, dayNum);
      await syncScheduleNotifications(db);
      await loadSchedule();
      triggerRefresh();
      Alert.alert(
        dayNum === 6 ? 'Saturday Agenda Applied' : 'Sunday Blueprint Applied',
        dayNum === 6
          ? 'Special Saturday Project Sprint, High-Volume Gym & Social Outing agenda loaded!'
          : 'Special Sunday Recovery, Academic Synthesis & Weekly Reset blueprint loaded!'
      );
    } catch (err) {
      console.error('Failed to apply special weekend:', err);
    }
  };

  // Open modal for new block
  const handleOpenNew = () => {
    setEditingBlock(null);
    setFormTitle('');
    setFormStartTime('08:00');
    setFormEndTime('09:00');
    setFormCategory('routine');
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setFormTitle(block.title);
    setFormStartTime(block.start_time);
    setFormEndTime(block.end_time || '');
    setFormCategory(block.category);
    setIsModalOpen(true);
  };

  // Save Block
  const handleSaveBlock = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Required', 'Please enter an activity title.');
      return;
    }
    if (!formStartTime.trim()) {
      Alert.alert('Required', 'Please enter a valid start time.');
      return;
    }

    try {
      const db = await getDatabase();
      if (editingBlock) {
        await updateBlock(db, editingBlock.id, {
          title: formTitle.trim(),
          start_time: formStartTime.trim(),
          end_time: formEndTime.trim() || null,
          category: formCategory,
          day_of_week: selectedDay,
        });
      } else {
        await createBlock(db, {
          title: formTitle.trim(),
          start_time: formStartTime.trim(),
          end_time: formEndTime.trim() || null,
          category: formCategory,
          day_of_week: selectedDay,
          is_recurring: 1,
          sort_order: schedule.length,
        });
      }
      setIsModalOpen(false);
      await syncScheduleNotifications(db);
      await loadSchedule();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to save block:', err);
    }
  };

  // Confirm delete
  const handleDeleteBlock = async () => {
    if (!blockToDelete) return;
    try {
      const db = await getDatabase();
      await deleteBlock(db, blockToDelete);
      setDeleteConfirmOpen(false);
      setBlockToDelete(null);
      await syncScheduleNotifications(db);
      await loadSchedule();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to delete block:', err);
    }
  };

  const categories = ['Personal', 'Gym', 'Academics', 'Skills', 'College', 'Meal', 'Recovery'];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: Spacing.sm }}>
          <Text style={[Typography.screenTitle, { color: colors.ink }]}>Planner & Agenda</Text>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginTop: 2 }]}>
            Editable timetable for {DAY_NAMES[selectedDay - 1]}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexShrink: 0 }}>
          <Pressable
            style={[styles.resetHeaderBtn, { backgroundColor: colors.surface, borderColor: colors.line }]}
            onPress={handlePromptReset}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Reset agenda checkboxes"
            hitSlop={6}
          >
            <RotateCcw size={14} color={colors.ink} />
            <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '600', marginLeft: 4 }]}>
              Reset Week
            </Text>
          </Pressable>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.orange }]}
            onPress={handleOpenNew}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Add new commitment"
            hitSlop={6}
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {/* Weekday Strip */}
      <View style={[styles.dayStrip, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        {DAY_NAMES_SHORT.map((name, idx) => {
          const dayNum = idx + 1; // 1=Mon ... 7=Sun
          const isSelected = selectedDay === dayNum;
          return (
            <Pressable
              key={dayNum}
              accessible={true}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${DAY_NAMES[idx]}`}
              style={[
                styles.dayTab,
                isSelected && { backgroundColor: colors.ink, borderColor: colors.ink },
              ]}
              onPress={() => setSelectedDay(dayNum)}
            >
              <Text
                style={[
                  Typography.captionSmall,
                  {
                    color: isSelected ? '#FFFFFF' : colors.inkMuted,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Schedule List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Special Saturday Banner */}
        {selectedDay === 6 && (
          <View style={[styles.weekendBanner, { backgroundColor: colors.orangeSoft, borderColor: colors.orange }]}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sparkles size={14} color={colors.orangeDark} />
                <Text style={[Typography.captionSmall, { color: colors.orangeDark, fontWeight: '700', letterSpacing: 0.5, marginLeft: 4 }]}>
                  SATURDAY BUILD & SPRINT AGENDA
                </Text>
              </View>
              <Text style={[Typography.captionSmall, { color: colors.ink, marginTop: 3 }]}>
                Major project sprint, high-volume leg day, DSA problem solving & evening social outing.
              </Text>
            </View>
            <Pressable
              style={[styles.specialBtn, { backgroundColor: colors.orange }]}
              onPress={() => handleApplySpecialWeekend(6)}
            >
              <RotateCcw size={12} color="#FFFFFF" />
              <Text style={[Typography.captionSmall, { color: '#FFFFFF', fontWeight: '700', marginLeft: 4 }]}>
                Special Plan
              </Text>
            </Pressable>
          </View>
        )}

        {/* Special Sunday Banner */}
        {selectedDay === 7 && (
          <View style={[styles.weekendBanner, { backgroundColor: colors.greenSoft, borderColor: colors.green }]}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sparkles size={14} color={colors.greenDark} />
                <Text style={[Typography.captionSmall, { color: colors.greenDark, fontWeight: '700', letterSpacing: 0.5, marginLeft: 4 }]}>
                  SUNDAY RECOVERY & WEEKLY RESET
                </Text>
              </View>
              <Text style={[Typography.captionSmall, { color: colors.ink, marginTop: 3 }]}>
                Active recovery walk, weekly academic synthesis, relaxation & setting next week's blueprint.
              </Text>
            </View>
            <View style={{ gap: 6, flexShrink: 0 }}>
              <Pressable
                style={[styles.specialBtn, { backgroundColor: colors.green }]}
                onPress={() => handleApplySpecialWeekend(7)}
              >
                <RotateCcw size={12} color="#FFFFFF" />
                <Text style={[Typography.captionSmall, { color: '#FFFFFF', fontWeight: '700', marginLeft: 4 }]}>
                  Special Plan
                </Text>
              </Pressable>
              <Pressable
                style={[styles.specialBtn, { backgroundColor: colors.surface, borderColor: colors.green, borderWidth: 1 }]}
                onPress={handlePromptReset}
              >
                <RotateCcw size={12} color={colors.greenDark} />
                <Text style={[Typography.captionSmall, { color: colors.greenDark, fontWeight: '700', marginLeft: 4 }]}>
                  Reset Week
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.listSummary}>
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>
            {DAY_NAMES[selectedDay - 1]}'s Commitments ({schedule.length})
          </Text>
          <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
            Tap checkbox to complete, tap text to edit
          </Text>
        </View>

        <View style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          {schedule.map((block) => (
            <View key={block.id} style={styles.blockRowWrapper}>
              <View style={styles.blockRowContent}>
                <TaskRow
                  title={block.title}
                  time={formatTime12(block.start_time) + (block.end_time ? ` – ${formatTime12(block.end_time)}` : '')}
                  category={block.category}
                  status={block.status === 'completed' ? 'completed' : 'pending'}
                  onToggle={() => handleToggleStatus(block)}
                  onPress={() => handleOpenEdit(block)}
                />
              </View>
              <Pressable
                style={styles.deleteAction}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${block.title}`}
                hitSlop={8}
                onPress={() => {
                  setBlockToDelete(block.id);
                  setDeleteConfirmOpen(true);
                }}
              >
                <Trash2 size={16} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add / Edit BottomSheet */}
      <BottomSheet
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBlock ? 'Edit Commitment' : 'Add New Commitment'}
      >
        <View style={styles.formContainer}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Activity Name
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={formTitle}
            onChangeText={setFormTitle}
            placeholder="e.g. Academic Revision, Gym Workout"
            placeholderTextColor={colors.inkMuted}
          />

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
                Start Time (HH:MM)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={formStartTime}
                onChangeText={setFormStartTime}
                placeholder="08:00"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
                End Time (Optional)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
                value={formEndTime}
                onChangeText={setFormEndTime}
                placeholder="09:00"
                placeholderTextColor={colors.inkMuted}
              />
            </View>
          </View>

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 6, marginTop: Spacing.sm }]}>
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContainer}
            style={styles.categoryScrollView}
          >
            {categories.map((cat) => {
              const isSelected = formCategory === cat;
              return (
                <Pressable
                  key={cat}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Category: ${cat}`}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: isSelected ? colors.ink : colors.surfaceMuted,
                      borderColor: isSelected ? colors.ink : colors.line,
                    },
                  ]}
                  onPress={() => setFormCategory(cat)}
                >
                  <Text
                    style={[
                      Typography.captionSmall,
                      {
                        color: isSelected ? '#FFFFFF' : colors.ink,
                        textTransform: 'capitalize',
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.orange, marginTop: Spacing.lg }]}
            onPress={handleSaveBlock}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>
              {editingBlock ? 'Save Changes' : 'Add to Schedule'}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Delete Confirmation */}
      <ConfirmDialog
        visible={deleteConfirmOpen}
        title="Delete Commitment"
        message="Are you sure you want to delete this schedule commitment from your timetable?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteBlock}
        onCancel={() => setDeleteConfirmOpen(false)}
        destructive
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
    paddingBottom: Spacing.sm,
  },
  resetHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dayStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  dayTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  listSummary: {
    marginBottom: Spacing.sm,
  },
  timelineCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingVertical: Spacing.xs,
    overflow: 'hidden',
  },
  blockRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockRowContent: {
    flex: 1,
  },
  deleteAction: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  formContainer: {
    paddingVertical: Spacing.sm,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    fontSize: 15,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  categoryScrollView: {
    marginHorizontal: -Spacing.xs,
  },
  categoryScrollContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
  },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  saveButton: {
    height: 48,
    borderRadius: Radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekendBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  specialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
});
