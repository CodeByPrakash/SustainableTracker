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
  Code2,
  Terminal,
  FolderGit2,
  CheckCircle2,
  Circle,
  Plus,
  Play,
  ArrowLeft,
  Flame,
  Award,
  Trash2,
  ExternalLink,
} from 'lucide-react-native';
import { useTheme, Typography, Spacing, Radius } from '../src/theme';
import { getDatabase } from '../src/db/database';
import { uuid } from '../src/utils/uuid';
import { AppHeader } from '../src/components/ui/AppHeader';
import { MetricCard } from '../src/components/ui/MetricCard';
import { BottomSheet } from '../src/components/ui/BottomSheet';
import { EmptyState } from '../src/components/ui/EmptyState';
import { ConfirmDialog } from '../src/components/ui/ConfirmDialog';

interface SkillItem {
  id: string;
  name: string;
  category: string;
  target_hours_per_week: number;
  total_problems_solved: number;
  notes: string | null;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  github_url: string | null;
}

export default function SkillsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [activeTab, setActiveTab] = useState<'skills' | 'projects'>('skills');

  // Modal for logging problems solved
  const [problemSheetVisible, setProblemSheetVisible] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
  const [problemCountInput, setProblemCountInput] = useState('1');

  // Add Project Modal
  const [projectSheetVisible, setProjectSheetVisible] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjStatus, setNewProjStatus] = useState('in_progress');
  const [newProjUrl, setNewProjUrl] = useState('');

  // Add Skill Modal
  const [skillSheetVisible, setSkillSheetVisible] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('technical');
  const [newSkillHours, setNewSkillHours] = useState('5');

  // Delete Confirm
  const [itemToDelete, setItemToDelete] = useState<{ type: 'skill' | 'project'; id: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [skillsList, projList] = await Promise.all([
        db.getAllAsync<SkillItem>('SELECT * FROM skills ORDER BY name ASC'),
        db.getAllAsync<ProjectItem>('SELECT * FROM projects ORDER BY created_at DESC'),
      ]);
      setSkills(skillsList);
      setProjects(projList);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddProblems = async () => {
    if (!selectedSkill) return;
    const added = parseInt(problemCountInput, 10);
    if (isNaN(added) || added <= 0) return;

    try {
      const db = await getDatabase();
      const updatedCount = (selectedSkill.total_problems_solved || 0) + added;
      await db.runAsync(
        'UPDATE skills SET total_problems_solved = ? WHERE id = ?',
        [updatedCount, selectedSkill.id]
      );
      setProblemSheetVisible(false);
      setProblemCountInput('1');
      await loadData();
    } catch (err) {
      console.error('Failed to log problems:', err);
    }
  };

  const handleCreateSkill = async () => {
    if (!newSkillName.trim()) {
      Alert.alert('Required', 'Please enter a skill or roadmap name.');
      return;
    }
    const hours = parseFloat(newSkillHours) || 5;
    try {
      const db = await getDatabase();
      const id = uuid();
      await db.runAsync(
        `INSERT INTO skills (id, name, category, target_hours_per_week, total_problems_solved)
         VALUES (?, ?, ?, ?, 0)`,
        [id, newSkillName.trim(), newSkillCategory, hours]
      );
      setSkillSheetVisible(false);
      setNewSkillName('');
      setNewSkillHours('5');
      await loadData();
    } catch (err) {
      console.error('Failed to create skill:', err);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjName.trim()) {
      Alert.alert('Required', 'Please enter a project title.');
      return;
    }
    try {
      const db = await getDatabase();
      const id = uuid();
      await db.runAsync(
        `INSERT INTO projects (id, name, description, status, github_url)
         VALUES (?, ?, ?, ?, ?)`,
        [id, newProjName.trim(), newProjDesc.trim() || null, newProjStatus, newProjUrl.trim() || null]
      );
      setProjectSheetVisible(false);
      setNewProjName('');
      setNewProjDesc('');
      setNewProjUrl('');
      setNewProjStatus('in_progress');
      await loadData();
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleToggleProjectStatus = async (proj: ProjectItem) => {
    const nextStatus = proj.status === 'completed' ? 'in_progress' : 'completed';
    try {
      const db = await getDatabase();
      await db.runAsync('UPDATE projects SET status = ? WHERE id = ?', [nextStatus, proj.id]);
      await loadData();
    } catch (err) {
      console.error('Failed to toggle project status:', err);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!itemToDelete) return;
    try {
      const db = await getDatabase();
      if (itemToDelete.type === 'skill') {
        await db.runAsync('DELETE FROM skills WHERE id = ?', [itemToDelete.id]);
      } else {
        await db.runAsync('DELETE FROM projects WHERE id = ?', [itemToDelete.id]);
      }
      setItemToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const totalProblems = skills.reduce((sum, s) => sum + (s.total_problems_solved || 0), 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Header */}
      <AppHeader
        title="Skills & Projects"
        subtitle="Independent technical engineering roadmap"
        showBack
        onBack={() => router.back()}
      />

      {/* Metric Cards */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="DSA Problems Solved"
            value={totalProblems}
            subtitle="LeetCode & Codeforces"
            icon={Code2}
            accentColor={colors.skillsChart}
          />
          <MetricCard
            title="Active Projects"
            value={projects.filter((p) => p.status === 'in_progress').length}
            subtitle="Portfolio & Web Apps"
            icon={FolderGit2}
            accentColor={colors.orange}
            onPress={() => setActiveTab('projects')}
          />
        </View>
      </View>

      {/* Switcher Tab */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'skills' && { borderBottomColor: colors.skillsChart, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('skills')}
        >
          <Text
            style={[
              Typography.button,
              { color: activeTab === 'skills' ? colors.skillsChart : colors.inkMuted },
            ]}
          >
            Technical Roadmaps ({skills.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'projects' && { borderBottomColor: colors.skillsChart, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('projects')}
        >
          <Text
            style={[
              Typography.button,
              { color: activeTab === 'projects' ? colors.skillsChart : colors.inkMuted },
            ]}
          >
            Engineering Projects ({projects.length})
          </Text>
        </Pressable>
      </View>

      {/* Tab Subheader with Add Button */}
      <View style={styles.tabActionHeader}>
        <Text style={[Typography.sectionTitle, { color: colors.ink }]}>
          {activeTab === 'skills' ? 'Tracked Engineering Skills' : 'Portfolio & System Builds'}
        </Text>
        <Pressable
          style={[styles.addBtn, { backgroundColor: activeTab === 'skills' ? colors.skillsChart : colors.orange }]}
          onPress={() => {
            if (activeTab === 'skills') {
              setSkillSheetVisible(true);
            } else {
              setProjectSheetVisible(true);
            }
          }}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={[Typography.captionSmall, { color: '#FFFFFF', fontWeight: '700', marginLeft: 4 }]}>
            {activeTab === 'skills' ? 'Add Skill' : 'Add Project'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'skills' ? (
          <View>
            {skills.length === 0 ? (
              <EmptyState
                icon={Code2}
                title="No Skills Added"
                message="Create a technical roadmap to log DSA problems and track hours."
              />
            ) : (
              skills.map((skill) => (
                <View
                  key={skill.id}
                  style={[styles.skillCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
                >
                  <View style={styles.skillHeader}>
                    <View style={[styles.skillIcon, { backgroundColor: colors.surfaceMuted }]}>
                      <Terminal size={20} color={colors.skillsChart} />
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Text style={[Typography.sectionTitle, { color: colors.ink }]}>{skill.name}</Text>
                      <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>
                        Target: {skill.target_hours_per_week}h/week • {skill.category.toUpperCase()}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.logProblemBtn, { borderColor: colors.skillsChart }]}
                      onPress={() => {
                        setSelectedSkill(skill);
                        setProblemSheetVisible(true);
                      }}
                    >
                      <Text style={[Typography.captionSmall, { color: colors.skillsChart, fontWeight: '700' }]}>
                        + Log DSA
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteIconBtn}
                      onPress={() => setItemToDelete({ type: 'skill', id: skill.id, name: skill.name })}
                    >
                      <Trash2 size={16} color={colors.inkMuted} />
                    </Pressable>
                  </View>

                  <View style={[styles.skillFooter, { borderTopColor: colors.line }]}>
                    <Text style={[Typography.caption, { color: colors.ink }]}>
                      Total Problems Solved:{' '}
                      <Text style={{ fontWeight: '700', color: colors.skillsChart }}>
                        {skill.total_problems_solved || 0}
                      </Text>
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View>
            {projects.length === 0 ? (
              <EmptyState
                icon={FolderGit2}
                title="No Projects Logged"
                message="Add an engineering or software project to track progress."
              />
            ) : (
              projects.map((proj) => (
                <View
                  key={proj.id}
                  style={[styles.skillCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
                >
                  <View style={styles.skillHeader}>
                    <Pressable
                      style={[
                        styles.skillIcon,
                        {
                          backgroundColor:
                            proj.status === 'completed' ? colors.greenSoft : colors.orangeSoft,
                        },
                      ]}
                      onPress={() => handleToggleProjectStatus(proj)}
                    >
                      {proj.status === 'completed' ? (
                        <CheckCircle2 size={20} color={colors.green} />
                      ) : (
                        <FolderGit2 size={20} color={colors.orangeDark} />
                      )}
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Text style={[Typography.sectionTitle, { color: colors.ink }]}>{proj.name}</Text>
                      <Text
                        style={[
                          Typography.captionSmall,
                          {
                            color: proj.status === 'completed' ? colors.green : colors.orangeDark,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {proj.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.deleteIconBtn}
                      onPress={() => setItemToDelete({ type: 'project', id: proj.id, name: proj.name })}
                    >
                      <Trash2 size={16} color={colors.inkMuted} />
                    </Pressable>
                  </View>
                  {proj.description ? (
                    <Text style={[Typography.body, { color: colors.inkMuted, marginTop: Spacing.sm }]}>
                      {proj.description}
                    </Text>
                  ) : null}
                  {proj.github_url ? (
                    <View style={styles.linkRow}>
                      <ExternalLink size={14} color={colors.inkMuted} />
                      <Text style={[Typography.captionSmall, { color: colors.inkMuted, marginLeft: 4 }]}>
                        {proj.github_url}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Problem count bottom sheet */}
      <BottomSheet
        visible={problemSheetVisible}
        onClose={() => setProblemSheetVisible(false)}
        title={`Log Solved Problems — ${selectedSkill?.name}`}
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 6 }]}>
            Number of problems solved
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            value={problemCountInput}
            onChangeText={setProblemCountInput}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={colors.inkMuted}
          />
          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.skillsChart }]}
            onPress={handleAddProblems}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Confirm & Save</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Add Skill Bottom Sheet */}
      <BottomSheet
        visible={skillSheetVisible}
        onClose={() => setSkillSheetVisible(false)}
        title="Add Technical Roadmap"
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Skill / Domain Name
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            placeholder="e.g. Data Structures & Algorithms, Rust, System Design"
            placeholderTextColor={colors.inkMuted}
            value={newSkillName}
            onChangeText={setNewSkillName}
          />

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Target Hours Per Week
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            placeholder="e.g. 5"
            placeholderTextColor={colors.inkMuted}
            keyboardType="number-pad"
            value={newSkillHours}
            onChangeText={setNewSkillHours}
          />

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.skillsChart, marginTop: Spacing.sm }]}
            onPress={handleCreateSkill}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Create Roadmap</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Add Project Bottom Sheet */}
      <BottomSheet
        visible={projectSheetVisible}
        onClose={() => setProjectSheetVisible(false)}
        title="Add Engineering Project"
      >
        <View style={styles.sheetContent}>
          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Project Title
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            placeholder="e.g. DAYCRAFT Mobile App, Distributed Cache"
            placeholderTextColor={colors.inkMuted}
            value={newProjName}
            onChangeText={setNewProjName}
          />

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            Description / Tech Stack
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            placeholder="e.g. React Native, Expo, SQLite, TypeScript"
            placeholderTextColor={colors.inkMuted}
            value={newProjDesc}
            onChangeText={setNewProjDesc}
          />

          <Text style={[Typography.caption, { color: colors.inkMuted, marginBottom: 4 }]}>
            GitHub / Repo URL (Optional)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.line }]}
            placeholder="e.g. github.com/user/project"
            placeholderTextColor={colors.inkMuted}
            value={newProjUrl}
            onChangeText={setNewProjUrl}
          />

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.orange, marginTop: Spacing.sm }]}
            onPress={handleCreateProject}
          >
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>Create Project</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        visible={itemToDelete !== null}
        title={`Delete ${itemToDelete?.type === 'skill' ? 'Roadmap' : 'Project'}`}
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
  metricsContainer: {
    paddingHorizontal: Spacing.screenH,
    marginTop: Spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: Spacing.base,
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
  skillCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logProblemBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  deleteIconBtn: {
    padding: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  skillFooter: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
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
  saveBtn: {
    height: 48,
    borderRadius: Radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
