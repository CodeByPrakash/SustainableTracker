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
  BookOpen,
  Play,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  GraduationCap,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Layers,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../../src/theme';
import { getDatabase } from '../../src/db/database';
import {
  getSubjects,
  getTopicsForSubject,
  updateTopicStatus,
  createSubject,
  deleteSubject,
  createTopic,
  getAssignments,
  createAssignment,
  updateAssignmentStatus,
  getExams,
  Subject,
  Topic,
  StudySession,
  Assignment,
  Exam,
} from '../../src/db/queries/academicQueries';
import { getToday, formatDate, getStartOfWeek, formatDateDisplay, formatDurationHuman } from '../../src/utils/dateUtils';
import { TabBar } from '../../src/components/ui/TabBar';
import { MetricCard } from '../../src/components/ui/MetricCard';
import { WeeklyBarChart } from '../../src/components/charts/WeeklyBarChart';
import { SubjectProgressRow } from '../../src/components/charts/SubjectProgressRow';
import { ConsistencyHeatmap, HeatmapDay } from '../../src/components/charts/ConsistencyHeatmap';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAppStore } from '../../src/stores/appStore';
import { AppHaptics } from '../../src/utils/haptics';

export default function AcademicsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const refreshKey = useAppStore((state) => state.refreshKey);
  const triggerRefresh = useAppStore((state) => state.triggerRefresh);

  const [activeTab, setActiveTab] = useState(0); // 0: Overview, 1: Subjects, 2: Study Sessions, 3: Assignments & Exams
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectTopics, setSubjectTopics] = useState<Record<string, Topic[]>>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  // Assignment Modal
  const [assignmentSheetVisible, setAssignmentSheetVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState(getToday());
  const [newPriority, setNewPriority] = useState('medium');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Add Subject Modal
  const [subjectSheetVisible, setSubjectSheetVisible] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjHours, setNewSubjHours] = useState('6');

  // Add Topic Modal
  const [topicSheetVisible, setTopicSheetVisible] = useState(false);
  const [targetSubjId, setTargetSubjId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicUnit, setNewTopicUnit] = useState('Unit 1');

  // Collapsible state for subject units & subject cards
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});
  const [allUnitsCollapsed, setAllUnitsCollapsed] = useState(false);

  const toggleUnitCollapse = (subjId: string, unitName: string) => {
    const key = `${subjId}__${unitName}`;
    setCollapsedUnits((prev) => {
      const current = prev[key] !== undefined ? prev[key] : allUnitsCollapsed;
      return { ...prev, [key]: !current };
    });
  };

  const toggleSubjectCollapse = (subjId: string) => {
    setCollapsedSubjects((prev) => ({
      ...prev,
      [subjId]: !prev[subjId],
    }));
  };

  const handleToggleCollapseAll = () => {
    const nextState = !allUnitsCollapsed;
    setAllUnitsCollapsed(nextState);
    const updated: Record<string, boolean> = {};
    subjects.forEach((subj) => {
      const topics = subjectTopics[subj.id] || [];
      topics.forEach((t) => {
        const u = t.unit?.trim() || 'General Module';
        updated[`${subj.id}__${u}`] = nextState;
      });
    });
    setCollapsedUnits(updated);
  };

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [subjList, assignList, examList, sessList] = await Promise.all([
        getSubjects(db),
        getAssignments(db),
        getExams(db),
        db.getAllAsync<StudySession>('SELECT * FROM study_sessions ORDER BY date DESC LIMIT 20'),
      ]);
      setSubjects(subjList);
      setAssignments(assignList);
      setExams(examList);
      setSessions(sessList);

      if (subjList.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subjList[0].id);
      }

      // Load topics for all subjects
      const topicsMap: Record<string, Topic[]> = {};
      for (const subj of subjList) {
        topicsMap[subj.id] = await getTopicsForSubject(db, subj.id);
      }
      setSubjectTopics(topicsMap);
    } catch (err) {
      console.error('Failed to load academic data:', err);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Toggle Topic Status
  const handleCycleTopicStatus = async (topic: Topic) => {
    const order = ['not_started', 'in_progress', 'completed'];
    const currIdx = order.indexOf(topic.status);
    const nextStatus = order[(currIdx + 1) % order.length];

    try {
      const db = await getDatabase();
      await updateTopicStatus(db, topic.id, nextStatus);
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to update topic status:', err);
    }
  };

  // Toggle Assignment Status
  const handleToggleAssignment = async (assign: Assignment) => {
    const next = assign.status === 'completed' ? 'pending' : 'completed';
    try {
      const db = await getDatabase();
      await updateAssignmentStatus(db, assign.id, next);
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to update assignment status:', err);
    }
  };

  // Create Assignment
  const handleCreateAssignment = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter an assignment title.');
      return;
    }
    try {
      const db = await getDatabase();
      await createAssignment(db, {
        title: newTitle.trim(),
        due_date: newDueDate,
        priority: newPriority,
        subject_id: selectedSubjectId || null,
      });
      setAssignmentSheetVisible(false);
      setNewTitle('');
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to create assignment:', err);
    }
  };

  // Create Subject
  const handleCreateSubject = async () => {
    if (!newSubjName.trim()) {
      Alert.alert('Required', 'Please enter a subject name.');
      return;
    }
    try {
      const db = await getDatabase();
      await createSubject(db, {
        name: newSubjName.trim(),
        code: newSubjCode.trim() || null,
        target_hours_per_week: parseFloat(newSubjHours) || 6,
      });
      setSubjectSheetVisible(false);
      setNewSubjName('');
      setNewSubjCode('');
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to create subject:', err);
    }
  };

  // Create Topic
  const handleCreateTopic = async () => {
    if (!targetSubjId || !newTopicName.trim()) {
      Alert.alert('Required', 'Please enter a topic name.');
      return;
    }
    try {
      const db = await getDatabase();
      await createTopic(db, targetSubjId, newTopicName.trim(), newTopicUnit.trim() || null);
      setTopicSheetVisible(false);
      setNewTopicName('');
      await loadData();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to add topic:', err);
    }
  };

  // Delete Subject
  const handleDeleteSubject = async (subjId: string) => {
    Alert.alert(
      'Delete Subject',
      'Are you sure you want to delete this subject and all its syllabus topics?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await deleteSubject(db, subjId);
              await loadData();
              triggerRefresh();
            } catch (err) {
              console.error('Failed to delete subject:', err);
            }
          },
        },
      ]
    );
  };

  const tabs = ['Overview', 'Subjects', 'Study Sessions', 'Assignments & Exams'];

  // Calculate totals
  const totalStudySeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const totalStudyHours = (totalStudySeconds / 3600).toFixed(1);

  // Real study hours per day for the current week (Monday..Sunday)
  const monday = getStartOfWeek(new Date());
  const studyBarData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    const dayStr = formatDate(dayDate);
    const daySessions = sessions.filter((s) => s.date === dayStr);
    const seconds = daySessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const hours = Math.round((seconds / 3600) * 10) / 10;
    return {
      label,
      value: hours,
      fullLabel: `${label} (${hours}h)`,
    };
  });

  // Heatmap data
  const heatmapDays: HeatmapDay[] = Array.from({ length: 35 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (34 - i));
    const ds = d.toISOString().split('T')[0];
    const hasStudy = sessions.some((s) => s.date === ds);

    return {
      date: ds,
      status: hasStudy ? 'completed' : 'none',
      label: `${ds}: ${hasStudy ? 'Study session logged' : 'No study logged'}`,
    };
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: Spacing.sm }}>
          <View style={styles.badgeRow}>
            <Text style={[Typography.screenTitle, { color: colors.greenDark }]} numberOfLines={1}>
              Academics
            </Text>
            <View style={[styles.academicBadge, { backgroundColor: colors.greenSoft }]}>
              <GraduationCap size={13} color={colors.green} />
              <Text style={[Typography.captionSmall, { color: colors.greenDark, fontWeight: '700', marginLeft: 3 }]}>
                Focused Green
              </Text>
            </View>
          </View>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginTop: 2 }]} numberOfLines={1}>
            Engineering Curriculum & Syllabus
          </Text>
        </View>

        <Pressable
          style={[styles.focusButton, { backgroundColor: colors.green, flexShrink: 0 }]}
          onPress={() => router.push('/study-active')}
        >
          <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={[Typography.button, { color: '#FFFFFF', marginLeft: 4 }]}>Focus</Text>
        </Pressable>
      </View>

      {/* Sub Tabs */}
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={colors.green}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TAB 0: OVERVIEW */}
        {activeTab === 0 && (
          <View style={styles.tabContent}>
            {/* Metrics */}
            <View style={styles.metricsGrid}>
              <MetricCard
                title="Study Time Logged"
                value={`${totalStudyHours} hrs`}
                subtitle="This week's focus"
                icon={Clock}
                accentColor={colors.green}
              />
              <MetricCard
                title="Assignments Due"
                value={assignments.filter((a) => a.status !== 'completed').length}
                subtitle="Pending tasks"
                icon={AlertCircle}
                accentColor={colors.warning}
                onPress={() => setActiveTab(3)}
              />
            </View>

            {/* Subject Syllabus Progress */}
            <View style={styles.sectionHeader}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Syllabus Completion</Text>
              <Pressable onPress={() => setActiveTab(1)}>
                <Text style={[Typography.caption, { color: colors.green, fontWeight: '600' }]}>All Subjects →</Text>
              </Pressable>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, padding: Spacing.base }]}>
              {subjects.map((subj) => {
                const topics = subjectTopics[subj.id] || [];
                const completed = topics.filter((t) => t.status === 'completed').length;
                return (
                  <SubjectProgressRow
                    key={subj.id}
                    subjectName={subj.name}
                    code={subj.code || ''}
                    completedTopics={completed}
                    totalTopics={topics.length || 1}
                    color={subj.color || colors.green}
                  />
                );
              })}
            </View>

            {/* Study Hours Chart */}
            <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Daily Study Hours</Text>
            </View>
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <WeeklyBarChart data={studyBarData} color={colors.green} unit="hrs" />
            </View>

            {/* Study Consistency Heatmap */}
            <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Academic Consistency</Text>
            </View>
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <ConsistencyHeatmap days={heatmapDays} category="academics" />
            </View>
          </View>
        )}

        {/* TAB 1: SUBJECTS & UNITS */}
        {activeTab === 1 && (
          <View style={styles.tabContent}>
            <View style={[styles.sectionHeader, { marginBottom: Spacing.md }]}>
              <View style={{ flex: 1, marginRight: Spacing.xs }}>
                <Text style={[Typography.sectionTitle, { color: colors.ink }]} numberOfLines={1}>
                  Curriculum & Subjects
                </Text>
                <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                  {subjects.length} subjects • Tap units to collapse/expand
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Pressable
                  style={[styles.smallActionBtn, { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1 }]}
                  onPress={handleToggleCollapseAll}
                >
                  <Layers size={13} color={colors.ink} />
                  <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '600', marginLeft: 4 }]}>
                    {allUnitsCollapsed ? 'Expand Units' : 'Collapse Units'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.smallActionBtn, { backgroundColor: colors.greenSoft }]}
                  onPress={() => setSubjectSheetVisible(true)}
                >
                  <Plus size={14} color={colors.greenDark} />
                  <Text style={[Typography.captionSmall, { color: colors.greenDark, fontWeight: '700', marginLeft: 4 }]}>
                    Subject
                  </Text>
                </Pressable>
              </View>
            </View>

            {subjects.map((subj) => {
              const topics = subjectTopics[subj.id] || [];
              const completedCount = topics.filter((t) => t.status === 'completed').length;
              const isSubjCollapsed = !!collapsedSubjects[subj.id];
              const progressPct = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

              // Group topics by unit preserving arrival order
              const unitMap = new Map<string, Topic[]>();
              topics.forEach((t) => {
                const u = t.unit?.trim() || 'General Module';
                if (!unitMap.has(u)) {
                  unitMap.set(u, []);
                }
                unitMap.get(u)!.push(t);
              });
              const unitEntries = Array.from(unitMap.entries());

              return (
                <View key={subj.id} style={[styles.subjectBlock, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  {/* Subject Header */}
                  <Pressable
                    style={styles.subjectHeader}
                    onPress={() => {
                      AppHaptics.selection();
                      toggleSubjectCollapse(subj.id);
                    }}
                  >
                    <View style={{ flex: 1, marginRight: Spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[Typography.sectionTitle, { color: colors.ink, flex: 1 }]} numberOfLines={1}>
                          {subj.name}
                        </Text>
                        <View style={[styles.codeBadge, { backgroundColor: colors.greenSoft }]}>
                          <Text style={[Typography.captionSmall, { color: colors.greenDark, fontWeight: '700' }]}>
                            {subj.code || 'CORE'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[Typography.caption, { color: colors.inkMuted, marginTop: 3 }]}>
                        {unitEntries.length} Units • {completedCount}/{topics.length} topics ({progressPct}%)
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <Pressable
                        style={[styles.smallActionBtn, { backgroundColor: colors.surfaceMuted }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          setTargetSubjId(subj.id);
                          setTopicSheetVisible(true);
                        }}
                      >
                        <Plus size={12} color={colors.ink} />
                        <Text style={[Typography.captionSmall, { color: colors.ink, fontWeight: '600', marginLeft: 2 }]}>
                          Topic
                        </Text>
                      </Pressable>
                      <Pressable
                        style={{ padding: 6 }}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteSubject(subj.id);
                        }}
                      >
                        <AlertCircle size={16} color={colors.danger} />
                      </Pressable>
                      <View style={{ paddingLeft: 2 }}>
                        {isSubjCollapsed ? (
                          <ChevronRight size={18} color={colors.inkMuted} />
                        ) : (
                          <ChevronDown size={18} color={colors.ink} />
                        )}
                      </View>
                    </View>
                  </Pressable>

                  {/* Subtle Syllabus Progress Bar */}
                  <View style={[styles.subjectProgressBarBg, { backgroundColor: colors.surfaceMuted }]}>
                    <View
                      style={[
                        styles.subjectProgressBarFill,
                        {
                          width: `${progressPct}%`,
                          backgroundColor: progressPct === 100 ? colors.green : colors.green,
                        },
                      ]}
                    />
                  </View>

                  {/* Units Accordion Cards */}
                  {!isSubjCollapsed && (
                    <View style={styles.unitListWrapper}>
                      {unitEntries.length === 0 ? (
                        <View style={{ padding: Spacing.base, alignItems: 'center' }}>
                          <Text style={[Typography.captionSmall, { color: colors.inkMuted, fontStyle: 'italic' }]}>
                            No topics added yet. Tap "+ Topic" above to start curriculum.
                          </Text>
                        </View>
                      ) : (
                        unitEntries.map(([unitName, unitTopics]) => {
                          const unitKey = `${subj.id}__${unitName}`;
                          const isUnitCollapsed =
                            collapsedUnits[unitKey] !== undefined ? collapsedUnits[unitKey] : allUnitsCollapsed;
                          const unitDoneCount = unitTopics.filter((t) => t.status === 'completed').length;
                          const isUnitAllDone = unitTopics.length > 0 && unitDoneCount === unitTopics.length;

                          return (
                            <View
                              key={unitName}
                              style={[
                                styles.unitCard,
                                {
                                  borderColor: isUnitAllDone ? colors.green + '50' : colors.line,
                                  backgroundColor: colors.surface,
                                },
                              ]}
                            >
                              {/* Collapsible Unit Header */}
                              <Pressable
                                style={[
                                  styles.unitHeader,
                                  {
                                    backgroundColor: isUnitAllDone
                                      ? colors.greenSoft + '45'
                                      : colors.surfaceMuted + '70',
                                    borderBottomWidth: isUnitCollapsed ? 0 : 1,
                                    borderBottomColor: colors.line,
                                  },
                                ]}
                                onPress={() => {
                                  AppHaptics.selection();
                                  toggleUnitCollapse(subj.id, unitName);
                                }}
                              >
                                <View style={styles.unitTitleRow}>
                                  <View
                                    style={[
                                      styles.unitIndexBadge,
                                      {
                                        backgroundColor: isUnitAllDone ? colors.greenSoft : colors.surface,
                                        borderColor: isUnitAllDone ? colors.green : colors.line,
                                        borderWidth: 1,
                                      },
                                    ]}
                                  >
                                    <Layers size={13} color={isUnitAllDone ? colors.greenDark : colors.ink} />
                                  </View>
                                  <Text
                                    style={[
                                      Typography.bodyMedium,
                                      {
                                        color: colors.ink,
                                        fontWeight: '700',
                                        flex: 1,
                                      },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {unitName}
                                  </Text>
                                </View>

                                <View style={styles.unitMetaRow}>
                                  <View
                                    style={[
                                      styles.unitStatusBadge,
                                      {
                                        backgroundColor: isUnitAllDone ? colors.greenSoft : colors.surface,
                                        borderColor: isUnitAllDone ? colors.green : colors.line,
                                      },
                                    ]}
                                  >
                                    {isUnitAllDone ? (
                                      <CheckCircle2 size={12} color={colors.green} />
                                    ) : (
                                      <Clock size={12} color={colors.inkMuted} />
                                    )}
                                    <Text
                                      style={[
                                        Typography.captionSmall,
                                        {
                                          color: isUnitAllDone ? colors.greenDark : colors.inkMuted,
                                          fontWeight: '700',
                                          marginLeft: 4,
                                        },
                                      ]}
                                    >
                                      {unitDoneCount}/{unitTopics.length} done
                                    </Text>
                                  </View>

                                  <View style={styles.chevronWrapper}>
                                    {isUnitCollapsed ? (
                                      <ChevronRight size={16} color={colors.inkMuted} />
                                    ) : (
                                      <ChevronDown size={16} color={colors.ink} />
                                    )}
                                  </View>
                                </View>
                              </Pressable>

                              {/* Unit Topics (Rendered only when expanded) */}
                              {!isUnitCollapsed && (
                                <View style={styles.unitTopicsList}>
                                  {unitTopics.map((t) => {
                                    const isDone = t.status === 'completed';
                                    const isInProgress = t.status === 'in_progress';
                                    return (
                                      <Pressable
                                        key={t.id}
                                        style={[
                                          styles.topicRow,
                                          { borderTopColor: colors.line + '50' },
                                          isDone && { backgroundColor: colors.greenSoft + '20' },
                                        ]}
                                        onPress={() => {
                                          AppHaptics.selection();
                                          handleCycleTopicStatus(t);
                                        }}
                                      >
                                        <View style={styles.topicIndicator}>
                                          {isDone ? (
                                            <CheckCircle2 size={18} color={colors.green} />
                                          ) : isInProgress ? (
                                            <Sparkles size={18} color={colors.warning} />
                                          ) : (
                                            <Circle size={18} color={colors.inkMuted} />
                                          )}
                                        </View>
                                        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                                          <Text
                                            style={[
                                              Typography.bodyMedium,
                                              {
                                                color: isDone ? colors.inkMuted : colors.ink,
                                                textDecorationLine: isDone ? 'line-through' : 'none',
                                                fontWeight: isInProgress ? '600' : '400',
                                              },
                                            ]}
                                          >
                                            {t.name}
                                          </Text>
                                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                                            <View
                                              style={[
                                                styles.topicStatusPill,
                                                {
                                                  backgroundColor: isDone
                                                    ? colors.greenSoft
                                                    : isInProgress
                                                      ? '#FEF3C7'
                                                      : colors.surfaceMuted,
                                                },
                                              ]}
                                            >
                                              <Text
                                                style={[
                                                  Typography.captionSmall,
                                                  {
                                                    color: isDone
                                                      ? colors.greenDark
                                                      : isInProgress
                                                        ? '#B45309'
                                                        : colors.inkMuted,
                                                    fontWeight: '700',
                                                    fontSize: 10,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.5,
                                                  },
                                                ]}
                                              >
                                                {isDone ? 'Completed' : isInProgress ? 'In Progress' : 'Not Started'}
                                              </Text>
                                            </View>
                                          </View>
                                        </View>
                                      </Pressable>
                                    );
                                  })}
                                </View>
                              )}
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 2: STUDY SESSIONS */}
        {activeTab === 2 && (
          <View style={styles.tabContent}>
            <View style={[styles.focusCard, { backgroundColor: colors.greenSoft, borderColor: colors.green }]}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <Text style={[Typography.captionSmall, { color: colors.greenDark, textTransform: 'uppercase', letterSpacing: 1 }]}>
                  Deep Work Focus Timer
                </Text>
                <Text style={[Typography.screenTitle, { color: colors.greenDark, marginTop: 2 }]} numberOfLines={1}>
                  Start Study Session
                </Text>
                <Text style={[Typography.body, { color: colors.ink, marginTop: 4 }]}>
                  Track your focused learning and revision time.
                </Text>
              </View>
              <Pressable
                style={[styles.startFocusBtn, { backgroundColor: colors.green, flexShrink: 0 }]}
                onPress={() => router.push('/study-active')}
              >
                <Play size={15} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={[Typography.button, { color: '#FFFFFF', marginLeft: 6 }]}>Launch</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Session History</Text>
            </View>
            {sessions.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No Study Sessions"
                message="Start your first focused study timer to track learning hours."
                actionLabel="Start Focus Session"
                onAction={() => router.push('/study-active')}
              />
            ) : (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                {sessions.map((sess) => (
                  <View key={sess.id} style={[styles.sessionRow, { borderBottomColor: colors.line }]}>
                    <View style={[styles.sessIcon, { backgroundColor: colors.greenSoft }]}>
                      <BookOpen size={18} color={colors.greenDark} />
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.sm, marginRight: Spacing.xs }}>
                      <Text style={[Typography.bodyMedium, { color: colors.ink }]} numberOfLines={1}>
                        {sess.session_type.toUpperCase()} Focus
                      </Text>
                      <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                        {sess.date} • {formatDurationHuman(sess.duration_seconds)}
                      </Text>
                    </View>
                    <View style={[styles.historyStatus, { flexShrink: 0 }]}>
                      <CheckCircle2 size={16} color={colors.green} />
                      <Text style={[Typography.captionSmall, { color: colors.green, fontWeight: '700', marginLeft: 4 }]}>
                        Logged
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: ASSIGNMENTS & EXAMS */}
        {activeTab === 3 && (
          <View style={styles.tabContent}>
            {/* Assignments Section */}
            <View style={styles.sectionHeader}>
              <Text style={[Typography.sectionTitle, { color: colors.ink, flex: 1, marginRight: Spacing.sm }]} numberOfLines={1}>
                Assignments & Deadlines
              </Text>
              <Pressable
                style={[styles.smallActionBtn, { backgroundColor: colors.greenSoft, flexShrink: 0 }]}
                onPress={() => setAssignmentSheetVisible(true)}
              >
                <Plus size={14} color={colors.greenDark} />
                <Text style={[Typography.captionSmall, { color: colors.greenDark, fontWeight: '700', marginLeft: 4 }]}>
                  Add
                </Text>
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              {assignments.map((item) => {
                const isCompleted = item.status === 'completed';
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.assignmentRow, { borderBottomColor: colors.line }]}
                    onPress={() => handleToggleAssignment(item)}
                  >
                    <View style={{ marginRight: Spacing.sm }}>
                      {isCompleted ? (
                        <CheckCircle2 size={20} color={colors.green} />
                      ) : (
                        <Circle size={20} color={colors.inkMuted} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          Typography.bodyMedium,
                          {
                            color: isCompleted ? colors.inkMuted : colors.ink,
                            textDecorationLine: isCompleted ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                        Due: {item.due_date || 'No date'} • Priority: {item.priority.toUpperCase()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Exams Section */}
            <View style={[styles.sectionHeader, { marginTop: Spacing.base }]}>
              <Text style={[Typography.sectionTitle, { color: colors.ink }]}>Upcoming Exams</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              {exams.map((ex) => (
                <View key={ex.id} style={[styles.examRow, { borderBottomColor: colors.line }]}>
                  <View style={[styles.examIcon, { backgroundColor: colors.greenSoft }]}>
                    <GraduationCap size={18} color={colors.greenDark} />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text style={[Typography.bodyMedium, { color: colors.ink }]}>{ex.title}</Text>
                    <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                      Date: {ex.exam_date || 'Scheduled'} • Target: {ex.target_score ?? 90}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Assignment Bottom Sheet */}
      <BottomSheet
        visible={assignmentSheetVisible}
        onClose={() => setAssignmentSheetVisible(false)}
        title="Add Assignment"
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="e.g. OS Memory Management Lab"
            placeholderTextColor={colors.inkMuted}
          />

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4, marginTop: Spacing.sm }]}>
            Due Date (YYYY-MM-DD)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={newDueDate}
            onChangeText={setNewDueDate}
            placeholder="2026-11-20"
            placeholderTextColor={colors.inkMuted}
          />

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.green, marginTop: Spacing.base }]}
            onPress={handleCreateAssignment}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Create Assignment</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Add Subject Bottom Sheet */}
      <BottomSheet
        visible={subjectSheetVisible}
        onClose={() => setSubjectSheetVisible(false)}
        title="Add Academic Subject"
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Subject Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={newSubjName}
            onChangeText={setNewSubjName}
            placeholder="e.g. Theory of Computation, AI & ML"
            placeholderTextColor={colors.inkMuted}
          />

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4, marginTop: Spacing.sm }]}>
            Course Code (Optional)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={newSubjCode}
            onChangeText={setNewSubjCode}
            placeholder="e.g. CS301"
            placeholderTextColor={colors.inkMuted}
          />

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4, marginTop: Spacing.sm }]}>
            Target Hours per Week
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={newSubjHours}
            onChangeText={setNewSubjHours}
            keyboardType="numeric"
            placeholder="6"
            placeholderTextColor={colors.inkMuted}
          />

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.green, marginTop: Spacing.base }]}
            onPress={handleCreateSubject}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Add Subject</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Add Topic Bottom Sheet */}
      <BottomSheet
        visible={topicSheetVisible}
        onClose={() => setTopicSheetVisible(false)}
        title="Add Syllabus Topic"
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>Topic Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={newTopicName}
            onChangeText={setNewTopicName}
            placeholder="e.g. Regular Expressions & Automata"
            placeholderTextColor={colors.inkMuted}
          />

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4, marginTop: Spacing.sm }]}>
            Unit / Module Name
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={newTopicUnit}
            onChangeText={setNewTopicUnit}
            placeholder="e.g. Unit 1, Module 2"
            placeholderTextColor={colors.inkMuted}
          />

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.green, marginTop: Spacing.base }]}
            onPress={handleCreateTopic}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Add Topic to Syllabus</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xs,
    width: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  academicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  focusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    flexShrink: 0,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xxxl,
    width: '100%',
  },
  tabContent: {
    width: '100%',
    paddingBottom: Spacing.base,
  },
  metricsGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    width: '100%',
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  chartCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.base,
    alignItems: 'center',
    width: '100%',
  },
  subjectBlock: {
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    width: '100%',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    width: '100%',
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  subjectProgressBarBg: {
    height: 4,
    width: '100%',
    overflow: 'hidden',
  },
  subjectProgressBarFill: {
    height: '100%',
  },
  unitListWrapper: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    width: '100%',
  },
  unitCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    width: '100%',
  },
  unitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  unitIndexBadge: {
    padding: 6,
    borderRadius: Radius.sm,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  unitStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chevronWrapper: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitTopicsList: {
    width: '100%',
    paddingLeft: Spacing.sm,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: 1,
    width: '100%',
  },
  topicIndicator: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  topicStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  focusCard: {
    padding: Spacing.base,
    borderRadius: Radius.card,
    borderWidth: 1.5,
    marginBottom: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  startFocusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.button,
    flexShrink: 0,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    width: '100%',
  },
  sessIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  examIcon: {
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
    fontSize: 15,
  },
  saveBtn: {
    height: 48,
    borderRadius: Radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
