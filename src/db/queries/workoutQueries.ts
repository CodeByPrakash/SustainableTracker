import { uuid } from '../../utils/uuid';
import type { SQLiteDatabase } from 'expo-sqlite';

// ─── Types ──────────────────────────────────────────────────────────
export interface WorkoutPlan {
  id: string;
  day_of_week: number;
  name: string;
  focus: string;
  sort_order: number;
  created_at: string;
}

export interface Exercise {
  id: string;
  plan_id: string | null;
  name: string;
  category: string | null;
  default_sets: number;
  default_reps: number;
  default_weight_kg?: number | null;
  notes: string | null;
  sort_order: number;
}

export interface WorkoutSession {
  id: string;
  plan_id: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number;
  name: string;
  notes: string | null;
  is_completed: number;
  created_at: string;
}

export interface ExerciseSet {
  id: string;
  session_id: string;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  is_completed: number;
  rpe: number | null;
  notes: string | null;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weight_kg: number | null;
  unit: string;
  notes: string | null;
  created_at: string;
}

// ─── Queries ────────────────────────────────────────────────────────

/**
 * Get the workout plan for a specific day of the week, including exercises.
 */
export async function getWorkoutPlanForDay(
  db: SQLiteDatabase,
  dayOfWeek: number
): Promise<(WorkoutPlan & { exercises: Exercise[] }) | null> {
  const plan = await db.getFirstAsync<WorkoutPlan>(
    `SELECT * FROM workout_plans WHERE day_of_week = ?`,
    [dayOfWeek]
  );

  if (!plan) return null;

  const exercises = await db.getAllAsync<Exercise>(
    `SELECT * FROM exercises WHERE plan_id = ? ORDER BY sort_order ASC`,
    [plan.id]
  );

  return { ...plan, exercises };
}

/**
 * Update an existing workout plan (e.g. rename or change focus)
 */
export async function updateWorkoutPlan(
  db: SQLiteDatabase,
  planId: string,
  name: string,
  focus: string
): Promise<void> {
  await db.runAsync(
    `UPDATE workout_plans SET name = ?, focus = ? WHERE id = ?`,
    [name, focus, planId]
  );
}

/**
 * Add a new exercise to a workout plan
 */
export async function addExerciseToPlan(
  db: SQLiteDatabase,
  planId: string,
  name: string,
  category: string,
  defaultSets: number = 3,
  defaultRps: number = 10,
  defaultWeightKg: number = 20
): Promise<string> {
  const id = uuid();
  const countRes = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM exercises WHERE plan_id = ?`,
    [planId]
  );
  const sortOrder = countRes?.count ?? 0;

  await db.runAsync(
    `INSERT INTO exercises (id, plan_id, name, category, default_sets, default_reps, default_weight_kg, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, planId, name, category, defaultSets, defaultRps, defaultWeightKg, sortOrder]
  );
  return id;
}

// ─── 55kg Calibrated Target Weights ──────────────────────────────────
export const WORKOUT_CALIBRATION_55KG: Record<string, { sets: number; reps: number; weight: number }> = {
  'Bench Press': { sets: 4, reps: 10, weight: 30 },
  'Incline Dumbbell Press': { sets: 3, reps: 12, weight: 10 },
  'Cable Fly': { sets: 3, reps: 15, weight: 15 },
  'Tricep Pushdown': { sets: 3, reps: 12, weight: 15 },
  'Overhead Extension': { sets: 3, reps: 10, weight: 10 },
  'Deadlift': { sets: 4, reps: 8, weight: 50 },
  'Barbell Row': { sets: 3, reps: 10, weight: 30 },
  'Lat Pulldown': { sets: 3, reps: 12, weight: 30 },
  'Barbell Curl': { sets: 3, reps: 12, weight: 15 },
  'Hammer Curl': { sets: 3, reps: 10, weight: 7.5 },
  'Barbell Squat': { sets: 4, reps: 10, weight: 40 },
  'Leg Press': { sets: 3, reps: 12, weight: 60 },
  'Romanian Deadlift': { sets: 3, reps: 10, weight: 35 },
  'Leg Curl': { sets: 3, reps: 12, weight: 25 },
  'Hanging Leg Raise': { sets: 3, reps: 15, weight: 55 },
  'Overhead Press': { sets: 4, reps: 10, weight: 20 },
  'Dumbbell Lateral Raise': { sets: 3, reps: 15, weight: 5 },
  'Face Pull': { sets: 3, reps: 15, weight: 15 },
  'Close-Grip Bench Press': { sets: 3, reps: 10, weight: 25 },
  'Tricep Dip': { sets: 3, reps: 12, weight: 55 },
  'Incline Bench Press': { sets: 4, reps: 10, weight: 25 },
  'Dumbbell Fly': { sets: 3, reps: 12, weight: 7.5 },
  'Pull-Up': { sets: 3, reps: 8, weight: 55 },
  'Seated Cable Row': { sets: 3, reps: 12, weight: 30 },
  'Chest Dip': { sets: 3, reps: 10, weight: 55 },
  'Front Squat': { sets: 4, reps: 10, weight: 30 },
  'Walking Lunge': { sets: 3, reps: 12, weight: 7.5 },
  'Standing Calf Raise': { sets: 3, reps: 15, weight: 35 },
  'Incline Dumbbell Curl': { sets: 3, reps: 12, weight: 7.5 },
  'Cable Crunch': { sets: 3, reps: 15, weight: 25 },
};

/**
 * Apply 55 kg calibrated sets, reps, and baseline weight across all exercises
 */
export async function applyCalibrationFor55Kg(db: SQLiteDatabase): Promise<void> {
  for (const [name, target] of Object.entries(WORKOUT_CALIBRATION_55KG)) {
    await db.runAsync(
      `UPDATE exercises 
       SET default_sets = ?, default_reps = ?, default_weight_kg = ?
       WHERE name LIKE ?`,
      [target.sets, target.reps, target.weight, `%${name}%`]
    );
  }

  // Ensure 55kg is recorded in body_measurements if none exists
  const existingWeight = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM body_measurements'
  );
  if (!existingWeight || existingWeight.count === 0) {
    const today = new Date().toISOString().split('T')[0];
    await db.runAsync(
      `INSERT INTO body_measurements (id, date, weight_kg, unit, notes)
       VALUES (?, ?, 55.0, 'kg', 'Baseline body weight')`,
      [uuid(), today]
    );
  }

  // Update user_body_weight_kg in settings
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('user_body_weight_kg', '55.0')`
  );
}

/**
 * Delete an exercise from a workout plan
 */
export async function deleteExercise(
  db: SQLiteDatabase,
  exerciseId: string
): Promise<void> {
  await db.runAsync(`DELETE FROM exercises WHERE id = ?`, [exerciseId]);
}

/**
 * Get all exercises for a specific plan.
 */
export async function getExercisesForPlan(
  db: SQLiteDatabase,
  planId: string
): Promise<Exercise[]> {
  return db.getAllAsync<Exercise>(
    `SELECT * FROM exercises WHERE plan_id = ? ORDER BY sort_order ASC`,
    [planId]
  );
}

/**
 * Start a new workout session.
 * Returns the newly created session ID.
 */
export async function startWorkoutSession(
  db: SQLiteDatabase,
  planId: string | null,
  name: string
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();
  const date = now.split('T')[0];

  await db.runAsync(
    `INSERT INTO workout_sessions (id, plan_id, date, start_time, name)
     VALUES (?, ?, ?, ?, ?)`,
    [id, planId, date, now, name]
  );

  return id;
}

/**
 * Log a single exercise set within a workout session.
 */
export async function logExerciseSet(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseName: string,
  setNumber: number,
  reps: number | null,
  weightKg: number | null
): Promise<string> {
  const id = uuid();
  await db.runAsync(
    `INSERT INTO exercise_sets (id, session_id, exercise_name, set_number, reps, weight_kg, is_completed)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [id, sessionId, exerciseName, setNumber, reps, weightKg]
  );
  return id;
}

/**
 * Mark a workout session as completed, recording end time and duration.
 */
export async function completeWorkoutSession(
  db: SQLiteDatabase,
  sessionId: string
): Promise<void> {
  const session = await db.getFirstAsync<WorkoutSession>(
    `SELECT * FROM workout_sessions WHERE id = ?`,
    [sessionId]
  );
  if (!session) return;

  const now = new Date().toISOString();
  let durationSeconds = 0;

  if (session.start_time) {
    const start = new Date(session.start_time).getTime();
    const end = new Date(now).getTime();
    durationSeconds = Math.round((end - start) / 1000);
  }

  await db.runAsync(
    `UPDATE workout_sessions
     SET end_time = ?, duration_seconds = ?, is_completed = 1
     WHERE id = ?`,
    [now, durationSeconds, sessionId]
  );
}

/**
 * Get recent workout sessions.
 */
export async function getWorkoutHistory(
  db: SQLiteDatabase,
  limit: number = 20
): Promise<WorkoutSession[]> {
  return db.getAllAsync<WorkoutSession>(
    `SELECT * FROM workout_sessions
     WHERE is_completed = 1
     ORDER BY date DESC, start_time DESC
     LIMIT ?`,
    [limit]
  );
}

/**
 * Get a workout session with all its exercise sets.
 */
export async function getWorkoutSessionDetail(
  db: SQLiteDatabase,
  sessionId: string
): Promise<(WorkoutSession & { sets: ExerciseSet[] }) | null> {
  const session = await db.getFirstAsync<WorkoutSession>(
    `SELECT * FROM workout_sessions WHERE id = ?`,
    [sessionId]
  );
  if (!session) return null;

  const sets = await db.getAllAsync<ExerciseSet>(
    `SELECT * FROM exercise_sets WHERE session_id = ? ORDER BY exercise_name ASC, set_number ASC`,
    [sessionId]
  );

  return { ...session, sets };
}

/**
 * Count completed workouts for the current week (Mon–Sun).
 */
export async function getWeeklyWorkoutCount(
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

  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM workout_sessions
     WHERE is_completed = 1 AND date BETWEEN ? AND ?`,
    [mondayStr, sundayStr]
  );

  return result?.count ?? 0;
}

/**
 * Get the latest body weight measurement.
 */
export async function getBodyWeight(
  db: SQLiteDatabase
): Promise<BodyMeasurement | null> {
  return db.getFirstAsync<BodyMeasurement>(
    `SELECT * FROM body_measurements ORDER BY date DESC LIMIT 1`
  );
}

/**
 * Log a body weight measurement.
 */
export async function logBodyWeight(
  db: SQLiteDatabase,
  weightKg: number,
  date: string
): Promise<string> {
  const id = uuid();
  await db.runAsync(
    `INSERT INTO body_measurements (id, date, weight_kg)
     VALUES (?, ?, ?)`,
    [id, date, weightKg]
  );
  return id;
}
