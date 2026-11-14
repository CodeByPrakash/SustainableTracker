import { uuid } from '../../utils/uuid';
import type { SQLiteDatabase } from 'expo-sqlite';

// ─── Types ──────────────────────────────────────────────────────────
export interface Subject {
  id: string;
  name: string;
  code: string | null;
  color: string;
  target_hours_per_week: number;
  created_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  unit: string | null;
  status: string;
  sort_order: number;
}

export interface StudySession {
  id: string;
  subject_id: string;
  topic_id: string | null;
  date: string;
  start_time: string | null;
  duration_seconds: number;
  session_type: string;
  notes: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  subject_id: string | null;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Exam {
  id: string;
  subject_id: string | null;
  title: string;
  exam_date: string | null;
  target_score: number | null;
  checklist_json: string;
  notes: string | null;
  created_at: string;
}

export interface CreateStudySessionInput {
  subject_id: string;
  topic_id?: string | null;
  date: string;
  start_time?: string | null;
  duration_seconds: number;
  session_type?: string;
  notes?: string | null;
}

export interface CreateAssignmentInput {
  subject_id?: string | null;
  title: string;
  due_date?: string | null;
  priority?: string;
  status?: string;
  notes?: string | null;
}

export interface CreateSubjectInput {
  name: string;
  code?: string | null;
  color?: string;
  target_hours_per_week?: number;
}

// ─── Queries ────────────────────────────────────────────────────────

/**
 * Get all subjects.
 */
export async function getSubjects(db: SQLiteDatabase): Promise<Subject[]> {
  return db.getAllAsync<Subject>(
    `SELECT * FROM subjects ORDER BY name ASC`
  );
}

/**
 * Create a new subject.
 */
export async function createSubject(
  db: SQLiteDatabase,
  subject: CreateSubjectInput
): Promise<string> {
  const id = uuid();
  await db.runAsync(
    `INSERT INTO subjects (id, name, code, color, target_hours_per_week)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      subject.name,
      subject.code ?? null,
      subject.color ?? '#2F855A',
      subject.target_hours_per_week ?? 0,
    ]
  );
  return id;
}

/**
 * Update an existing subject.
 */
export async function updateSubject(
  db: SQLiteDatabase,
  id: string,
  name: string,
  code?: string | null,
  color?: string,
  targetHours?: number
): Promise<void> {
  await db.runAsync(
    `UPDATE subjects SET name = ?, code = ?, color = COALESCE(?, color), target_hours_per_week = COALESCE(?, target_hours_per_week) WHERE id = ?`,
    [name, code ?? null, color ?? null, targetHours ?? null, id]
  );
}

/**
 * Delete a subject and its topics.
 */
export async function deleteSubject(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM topics WHERE subject_id = ?`, [id]);
  await db.runAsync(`DELETE FROM subjects WHERE id = ?`, [id]);
}

/**
 * Get all topics for a subject.
 */
export async function getTopicsForSubject(
  db: SQLiteDatabase,
  subjectId: string
): Promise<Topic[]> {
  return db.getAllAsync<Topic>(
    `SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order ASC`,
    [subjectId]
  );
}

/**
 * Create a new topic for a subject.
 */
export async function createTopic(
  db: SQLiteDatabase,
  subjectId: string,
  name: string,
  unit?: string | null
): Promise<string> {
  const id = uuid();
  const count = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM topics WHERE subject_id = ?`,
    [subjectId]
  );
  await db.runAsync(
    `INSERT INTO topics (id, subject_id, name, unit, status, sort_order)
     VALUES (?, ?, ?, ?, 'not_started', ?)`,
    [id, subjectId, name, unit ?? null, count?.count ?? 0]
  );
  return id;
}

/**
 * Delete a topic.
 */
export async function deleteTopic(
  db: SQLiteDatabase,
  topicId: string
): Promise<void> {
  await db.runAsync(`DELETE FROM topics WHERE id = ?`, [topicId]);
}

/**
 * Update a topic's status (e.g. not_started → in_progress → completed).
 */
export async function updateTopicStatus(
  db: SQLiteDatabase,
  topicId: string,
  status: string
): Promise<void> {
  await db.runAsync(
    `UPDATE topics SET status = ? WHERE id = ?`,
    [status, topicId]
  );
}

/**
 * Create a study session log.
 */
export async function createStudySession(
  db: SQLiteDatabase,
  session: CreateStudySessionInput
): Promise<string> {
  const id = uuid();
  await db.runAsync(
    `INSERT INTO study_sessions (id, subject_id, topic_id, date, start_time, duration_seconds, session_type, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      session.subject_id,
      session.topic_id ?? null,
      session.date,
      session.start_time ?? null,
      session.duration_seconds,
      session.session_type ?? 'learning',
      session.notes ?? null,
    ]
  );
  return id;
}

/**
 * Get study sessions for a specific date.
 */
export async function getStudySessionsForDate(
  db: SQLiteDatabase,
  date: string
): Promise<(StudySession & { subject_name: string })[]> {
  return db.getAllAsync<StudySession & { subject_name: string }>(
    `SELECT ss.*, s.name AS subject_name
     FROM study_sessions ss
     JOIN subjects s ON s.id = ss.subject_id
     WHERE ss.date = ?
     ORDER BY ss.created_at ASC`,
    [date]
  );
}

/**
 * Get total study hours for the current week (Mon–Sun).
 */
export async function getWeeklyStudyHours(
  db: SQLiteDatabase
): Promise<number> {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const mondayStr = monday.toISOString().split('T')[0];

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sundayStr = sunday.toISOString().split('T')[0];

  const result = await db.getFirstAsync<{ total_seconds: number | null }>(
    `SELECT SUM(duration_seconds) as total_seconds
     FROM study_sessions
     WHERE date BETWEEN ? AND ?`,
    [mondayStr, sundayStr]
  );

  const totalSeconds = result?.total_seconds ?? 0;
  return Math.round((totalSeconds / 3600) * 10) / 10;
}

/**
 * Get all assignments, with optional subject name.
 */
export async function getAssignments(
  db: SQLiteDatabase
): Promise<(Assignment & { subject_name: string | null })[]> {
  return db.getAllAsync<Assignment & { subject_name: string | null }>(
    `SELECT a.*, s.name AS subject_name
     FROM assignments a
     LEFT JOIN subjects s ON s.id = a.subject_id
     ORDER BY
       CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END,
       a.due_date ASC NULLS LAST,
       a.created_at DESC`
  );
}

/**
 * Create a new assignment.
 */
export async function createAssignment(
  db: SQLiteDatabase,
  assignment: CreateAssignmentInput
): Promise<string> {
  const id = uuid();
  await db.runAsync(
    `INSERT INTO assignments (id, subject_id, title, due_date, priority, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      assignment.subject_id ?? null,
      assignment.title,
      assignment.due_date ?? null,
      assignment.priority ?? 'medium',
      assignment.status ?? 'pending',
      assignment.notes ?? null,
    ]
  );
  return id;
}

/**
 * Update an assignment's status.
 */
export async function updateAssignmentStatus(
  db: SQLiteDatabase,
  id: string,
  status: string
): Promise<void> {
  await db.runAsync(
    `UPDATE assignments SET status = ? WHERE id = ?`,
    [status, id]
  );
}

/**
 * Delete an assignment.
 */
export async function deleteAssignment(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM assignments WHERE id = ?`, [id]);
}

/**
 * Get all exams, with optional subject name.
 */
export async function getExams(
  db: SQLiteDatabase
): Promise<(Exam & { subject_name: string | null })[]> {
  return db.getAllAsync<Exam & { subject_name: string | null }>(
    `SELECT e.*, s.name AS subject_name
     FROM exams e
     LEFT JOIN subjects s ON s.id = e.subject_id
     ORDER BY e.exam_date ASC NULLS LAST`
  );
}

/**
 * Create a new exam.
 */
export async function createExam(
  db: SQLiteDatabase,
  title: string,
  examDate?: string | null,
  targetScore?: number | null,
  subjectId?: string | null
): Promise<string> {
  const id = uuid();
  await db.runAsync(
    `INSERT INTO exams (id, subject_id, title, exam_date, target_score)
     VALUES (?, ?, ?, ?, ?)`,
    [id, subjectId ?? null, title, examDate ?? null, targetScore ?? null]
  );
  return id;
}
