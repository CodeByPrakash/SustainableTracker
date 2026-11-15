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
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Flame,
  Shield,
  Plus,
  Trash2,
  Edit2,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../src/theme';
import { getDatabase } from '../src/db/database';
import {
  getActiveHabits,
  getHabitLogsForDate,
  toggleHabitLog,
  getHabitStreak,
  createHabit,
  deleteHabit,
  getSkincareProducts,
  addSkincareProduct,
  deleteSkincareProduct,
  Habit,
  HabitLog,
  SkincareProduct,
} from '../src/db/queries/habitQueries';
import { getToday } from '../src/utils/dateUtils';
import { AppHeader } from '../src/components/ui/AppHeader';
import { HabitCheckRow } from '../src/components/ui/HabitCheckRow';
import { BottomSheet } from '../src/components/ui/BottomSheet';
import { ConfirmDialog } from '../src/components/ui/ConfirmDialog';
import { EmptyState } from '../src/components/ui/EmptyState';
import { useAppStore } from '../src/stores/appStore';

export default function HabitsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'checklist' | 'skincare'>('checklist');

  // Skincare state from SQLite
  const [morningSkincare, setMorningSkincare] = useState<SkincareProduct[]>([]);
  const [nightSkincare, setNightSkincare] = useState<SkincareProduct[]>([]);

  // Add Habit Sheet
  const [habitSheetVisible, setHabitSheetVisible] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitGroup, setNewHabitGroup] = useState<'morning' | 'college' | 'evening' | 'night'>('morning');

  // Add Skincare Sheet
  const [skincareSheetVisible, setSkincareSheetVisible] = useState(false);
  const [newProductRoutine, setNewProductRoutine] = useState<'morning' | 'night'>('morning');
  const [newProductName, setNewProductName] = useState('');
  const [newProductNotes, setNewProductNotes] = useState('');

  // Delete Confirm
  const [itemToDelete, setItemToDelete] = useState<{ type: 'habit' | 'skincare'; id: string; name: string } | null>(null);

  const todayStr = getToday();

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [habitList, logList, mProducts, nProducts] = await Promise.all([
        getActiveHabits(db),
        getHabitLogsForDate(db, todayStr),
        getSkincareProducts(db, 'morning'),
        getSkincareProducts(db, 'night'),
      ]);
      setHabits(habitList);
      setLogs(logList);
      setMorningSkincare(mProducts);
      setNightSkincare(nProducts);

      const streakMap: Record<string, number> = {};
      for (const h of habitList) {
        streakMap[h.id] = await getHabitStreak(db, h.id);
      }
      setStreaks(streakMap);
    } catch (err) {
      console.error('Failed to load habits and skincare:', err);
    }
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (habitId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'pending' : 'done';
    try {
      const db = await getDatabase();
      await toggleHabitLog(db, habitId, todayStr, nextStatus);
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  };

  const handleCreateHabit = async () => {
    if (!newHabitName.trim()) {
      Alert.alert('Required', 'Please enter a habit name.');
      return;
    }
    try {
      const db = await getDatabase();
      await createHabit(db, {
        name: newHabitName.trim(),
        group_name: newHabitGroup,
        category: 'routine',
        frequency: 'daily',
      });
      setHabitSheetVisible(false);
      setNewHabitName('');
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to create habit:', err);
    }
  };

  const handleAddSkincareProduct = async () => {
    if (!newProductName.trim()) {
      Alert.alert('Required', 'Please enter a product name.');
      return;
    }
    try {
      const db = await getDatabase();
      await addSkincareProduct(
        db,
        newProductRoutine,
        newProductName.trim(),
        newProductNotes.trim() || null
      );
      setSkincareSheetVisible(false);
      setNewProductName('');
      setNewProductNotes('');
      await loadData();
    } catch (err) {
      console.error('Failed to add skincare product:', err);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!itemToDelete) return;
    try {
      const db = await getDatabase();
      if (itemToDelete.type === 'habit') {
        await deleteHabit(db, itemToDelete.id);
      } else {
        await deleteSkincareProduct(db, itemToDelete.id);
      }
      setItemToDelete(null);
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const getLogStatus = (habitId: string): 'done' | 'partial' | 'missed' | 'pending' => {
    const log = logs.find((l) => l.habit_id === habitId);
    if (!log) return 'pending';
    if (log.status === 'done') return 'done';
    if (log.status === 'partial') return 'partial';
    if (log.status === 'missed') return 'missed';
    return 'pending';
  };

  const groups: Array<{ key: 'morning' | 'college' | 'evening' | 'night'; label: string }> = [
    { key: 'morning', label: 'Morning Routine' },
    { key: 'college', label: 'College Routine' },
    { key: 'evening', label: 'Evening Routine' },
    { key: 'night', label: 'Night Routine' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Header */}
      <AppHeader
        title="Habits & Skincare"
        subtitle="Daily routines, checklists & skincare protocol"
        showBack
        onBack={() => router.back()}
      />

      {/* Switcher Tab */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'checklist' && { borderBottomColor: colors.orange, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('checklist')}
          accessible={true}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'checklist' }}
          accessibilityLabel="Daily habits checklist"
        >
          <Text
            style={[
              Typography.button,
              { color: activeTab === 'checklist' ? colors.orange : colors.inkMuted },
            ]}
          >
            Daily Habits Checklist
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'skincare' && { borderBottomColor: colors.orange, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('skincare')}
          accessible={true}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'skincare' }}
          accessibilityLabel="Skincare protocol"
        >
          <Text
            style={[
              Typography.button,
              { color: activeTab === 'skincare' ? colors.orange : colors.inkMuted },
            ]}
          >
            Skincare Protocol
          </Text>
        </Pressable>
      </View>

      {/* Subheader Action Bar */}
      <View style={styles.tabActionHeader}>
        <Text style={[Typography.sectionTitle, { color: colors.ink }]} accessibilityRole="header">
          {activeTab === 'checklist' ? "Today's Routine Checklists" : 'Dermatologist-Clean Protocol'}
        </Text>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.orange }]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={activeTab === 'checklist' ? 'Add habit' : 'Add product'}
          hitSlop={6}
          onPress={() => {
            if (activeTab === 'checklist') {
              setHabitSheetVisible(true);
            } else {
              setSkincareSheetVisible(true);
            }
          }}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={[Typography.captionSmall, { color: '#FFFFFF', fontWeight: '700', marginLeft: 4 }]}>
            {activeTab === 'checklist' ? 'Add Habit' : 'Add Product'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'checklist' ? (
          <View>
            {habits.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No Habits Configured"
                message="Add your daily morning, college, evening, and night habits."
              />
            ) : (
              groups.map((grp) => {
                const groupHabits = habits.filter((h) => h.group_name === grp.key);
                if (groupHabits.length === 0) return null;

                return (
                  <View key={grp.key} style={styles.groupSection}>
                    <View style={styles.groupHeader}>
                      <Text style={[Typography.sectionTitle, { color: colors.ink }]}>
                        {grp.label}
                      </Text>
                      <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                        {groupHabits.filter((h) => getLogStatus(h.id) === 'done').length}/{groupHabits.length} Done
                      </Text>
                    </View>

                    <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                      {groupHabits.map((h, idx) => {
                        const status = getLogStatus(h.id);
                        const streak = streaks[h.id] || 0;
                        return (
                          <View
                            key={h.id}
                            style={[
                              styles.habitRowWrapper,
                              idx > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
                            ]}
                          >
                            <View style={styles.habitRowFlex}>
                              <View style={{ flex: 1 }}>
                                <HabitCheckRow
                                  name={h.name}
                                  status={status}
                                  onToggle={() => handleToggle(h.id, status)}
                                />
                              </View>
                              <Pressable
                                style={styles.trashBtn}
                                onPress={() => setItemToDelete({ type: 'habit', id: h.id, name: h.name })}
                                accessible={true}
                                accessibilityRole="button"
                                accessibilityLabel={`Delete habit ${h.name}`}
                                hitSlop={8}
                              >
                                <Trash2 size={16} color={colors.inkMuted} />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.skincareContent}>
            {/* Morning Protocol */}
            <View style={[styles.routineCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.routineHeader}>
                <View style={[styles.iconCircle, { backgroundColor: colors.orangeSoft }]}>
                  <Sun size={20} color={colors.orangeDark} />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Morning Protocol</Text>
                  <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                    Cleanse, protect & barrier defense before college
                  </Text>
                </View>
              </View>

              <View style={styles.stepsList}>
                {morningSkincare.length === 0 ? (
                  <Text style={[Typography.caption, { color: colors.inkMuted, paddingVertical: Spacing.md }]}>
                    No morning products added yet.
                  </Text>
                ) : (
                  morningSkincare.map((prod, idx) => (
                    <View key={prod.id} style={[styles.stepItem, { borderTopColor: colors.line }]}>
                      <View style={[styles.stepNum, { backgroundColor: colors.surfaceMuted }]}>
                        <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '700' }]}>
                          {idx + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <Text style={[Typography.bodyMedium, { color: colors.ink }]}>{prod.name}</Text>
                        {prod.notes ? (
                          <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>{prod.notes}</Text>
                        ) : null}
                      </View>
                      <Pressable
                        style={styles.trashBtn}
                        onPress={() => setItemToDelete({ type: 'skincare', id: prod.id, name: prod.name })}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete product ${prod.name}`}
                        hitSlop={8}
                      >
                        <Trash2 size={16} color={colors.inkMuted} />
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Night Protocol */}
            <View
              style={[
                styles.routineCard,
                { backgroundColor: colors.surface, borderColor: colors.line, marginTop: Spacing.base },
              ]}
            >
              <View style={styles.routineHeader}>
                <View style={[styles.iconCircle, { backgroundColor: '#E0E7FF' }]}>
                  <Moon size={20} color="#4338CA" />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Night Protocol</Text>
                  <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                    Purification, active repair & hydration while sleeping
                  </Text>
                </View>
              </View>

              <View style={styles.stepsList}>
                {nightSkincare.length === 0 ? (
                  <Text style={[Typography.caption, { color: colors.inkMuted, paddingVertical: Spacing.md }]}>
                    No night products added yet.
                  </Text>
                ) : (
                  nightSkincare.map((prod, idx) => (
                    <View key={prod.id} style={[styles.stepItem, { borderTopColor: colors.line }]}>
                      <View style={[styles.stepNum, { backgroundColor: colors.surfaceMuted }]}>
                        <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '700' }]}>
                          {idx + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <Text style={[Typography.bodyMedium, { color: colors.ink }]}>{prod.name}</Text>
                        {prod.notes ? (
                          <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>{prod.notes}</Text>
                        ) : null}
                      </View>
                      <Pressable
                        style={styles.trashBtn}
                        onPress={() => setItemToDelete({ type: 'skincare', id: prod.id, name: prod.name })}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete product ${prod.name}`}
                        hitSlop={8}
                      >
                        <Trash2 size={16} color={colors.inkMuted} />
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Habit Bottom Sheet */}
      <BottomSheet
        visible={habitSheetVisible}
        onClose={() => setHabitSheetVisible(false)}
        title="Add Daily Habit"
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Habit Name
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            placeholder="e.g. 500ml Water, Pushups, Read Documentation"
            placeholderTextColor={colors.inkMuted}
            value={newHabitName}
            onChangeText={setNewHabitName}
          />

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Routine Group
          </Text>
          <View style={styles.selectorRow}>
            {(['morning', 'college', 'evening', 'night'] as const).map((g) => (
              <Pressable
                key={g}
                style={[
                  styles.selectorPill,
                  { borderColor: colors.line, backgroundColor: colors.canvas },
                  newHabitGroup === g && { backgroundColor: colors.orange, borderColor: colors.orange },
                ]}
                onPress={() => setNewHabitGroup(g)}
              >
                <Text
                  style={[
                    Typography.captionSmall,
                    {
                      color: newHabitGroup === g ? '#FFFFFF' : colors.ink,
                      fontWeight: '700',
                      textTransform: 'capitalize',
                    },
                  ]}
                >
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.orange, marginTop: Spacing.lg }]}
            onPress={handleCreateHabit}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Create Habit</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Add Skincare Product Bottom Sheet */}
      <BottomSheet
        visible={skincareSheetVisible}
        onClose={() => setSkincareSheetVisible(false)}
        title="Add Skincare Product"
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Protocol
          </Text>
          <View style={styles.selectorRow}>
            {(['morning', 'night'] as const).map((r) => (
              <Pressable
                key={r}
                style={[
                  styles.selectorPill,
                  { flex: 1, borderColor: colors.line, backgroundColor: colors.canvas },
                  newProductRoutine === r && { backgroundColor: colors.orange, borderColor: colors.orange },
                ]}
                onPress={() => setNewProductRoutine(r)}
              >
                <Text
                  style={[
                    Typography.captionSmall,
                    {
                      color: newProductRoutine === r ? '#FFFFFF' : colors.ink,
                      fontWeight: '700',
                      textTransform: 'capitalize',
                    },
                  ]}
                >
                  {r} Routine
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4, marginTop: Spacing.sm }]}>
            Product Name & Brand
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            placeholder="e.g. Mamaearth Rice Face Wash, Pilgrim Niacinamide"
            placeholderTextColor={colors.inkMuted}
            value={newProductName}
            onChangeText={setNewProductName}
          />

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Instructions / Step Notes (Optional)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            placeholder="e.g. Apply evenly on damp skin, UV protection SPF 50"
            placeholderTextColor={colors.inkMuted}
            value={newProductNotes}
            onChangeText={setNewProductNotes}
          />

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.orange, marginTop: Spacing.sm }]}
            onPress={handleAddSkincareProduct}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Add Product</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        visible={itemToDelete !== null}
        title={`Delete ${itemToDelete?.type === 'habit' ? 'Habit' : 'Product'}`}
        message={`Are you sure you want to delete "${itemToDelete?.name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setItemToDelete(null)}
        destructive
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  tabActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xs,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
  },
  groupSection: {
    marginBottom: Spacing.base,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  groupCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  habitRowWrapper: {
    width: '100%',
  },
  habitRowFlex: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trashBtn: {
    padding: Spacing.md,
  },
  skincareContent: {
    paddingBottom: Spacing.base,
  },
  routineCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.base,
    overflow: 'hidden',
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsList: {
    marginTop: Spacing.xs,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  stepNum: {
    width: 26,
    height: 26,
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
    fontSize: 15,
    marginBottom: Spacing.base,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  selectorPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  saveBtn: {
    height: 48,
    borderRadius: Radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
