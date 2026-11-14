import { uuid } from '../../utils/uuid';
import type { SQLiteDatabase } from 'expo-sqlite';

// ─── Types ──────────────────────────────────────────────────────────
export interface Habit {
  id: string;
  name: string;
  group_name: string;
  category: string;
  frequency: string;
  target_days: string;
  is_paused: number;
  is_archived: number;
  sort_order: number;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string;
  status: string;
  notes: string | null;
  completed_at: string | null;
}

export interface SkincareProduct {
  id: string;
  routine_type: string;
  step_number: number;
  name: string;
  notes: string | null;
  is_active: number;
}

export interface CreateHabitInput {
  name: string;
  group_name?: string;
  category?: string;
  frequency?: string;
  target_days?: string;
  sort_order?: number;
}

export interface UpdateHabitInput {
  name?: string;
  group_name?: string;
  category?: string;
  frequency?: string;
  target_days?: string;
  is_paused?: number;
  is_archived?: number;
  sort_order?: number;
}

// ─── Queries ────────────────────────────────────────────────────────

/**
 * Get all habits that are not archived.
 */
export async function getActiveHabits(
  db: SQLiteDatabase
): Promise<Habit[]> {
  return db.getAllAsync<Habit>(
    `SELECT * FROM habits
     WHERE is_archived = 0
     ORDER BY sort_order ASC, name ASC`
  );
}

/**
 * Get all habit logs for a specific date (YYYY-MM-DD).
 */
export async function getHabitLogsForDate(
  db: SQLiteDatabase,
  date: string
): Promise<HabitLog[]> {
  return db.getAllAsync<HabitLog>(
    `SELECT * FROM habit_logs WHERE date = ?`,
    [date]
  );
}

/**
 * Toggle or upsert a habit log for a given date and status.
 */
export async function toggleHabitLog(
  db: SQLiteDatabase,
  habitId: string,
  date: string,
  status: string = 'done'
): Promise<void> {
  const existing = await db.getFirstAsync<HabitLog>(
    `SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?`,
    [habitId, date]
  );

  const now = new Date().toISOString();

  if (existing) {
    await db.runAsync(
      `UPDATE habit_logs SET status = ?, completed_at = ? WHERE id = ?`,
      [status, status === 'done' ? now : null, existing.id]
    );
  } else {
    const id = uuid();
    await db.runAsync(
      `INSERT INTO habit_logs (id, habit_id, date, status, completed_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, habitId, date, status, status === 'done' ? now : null]
    );
  }
}

/**
 * Calculate the current streak (consecutive active scheduled days) for a habit.
 */
export async function getHabitStreak(
  db: SQLiteDatabase,
  habitId: string
): Promise<number> {
  const logs = await db.getAllAsync<{ date: string; status: string }>(
    `SELECT date, status FROM habit_logs
     WHERE habit_id = ? AND status = 'done'
     ORDER BY date DESC
     LIMIT 60`,
    [habitId]
  );

  if (logs.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  const completedDates = new Set(logs.map((l) => l.date));

  // If today is not completed yet, start check from yesterday
  const todayStr = today.toISOString().split('T')[0];
  if (!completedDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (completedDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Create a new habit.
 */
export async function createHabit(
  db: SQLiteDatabase,
  habit: CreateHabitInput
): Promise<string> {
  const id = uuid();
  await db.runAsync(
    `INSERT INTO habits (id, name, group_name, category, frequency, target_days, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      habit.name,
      habit.group_name ?? 'morning',
      habit.category ?? 'routine',
      habit.frequency ?? 'daily',
      habit.target_days ?? '0,1,2,3,4,5,6',
      habit.sort_order ?? 0,
    ]
  );
  return id;
}

/**
 * Delete a habit.
 */
export async function deleteHabit(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM habit_logs WHERE habit_id = ?`, [id]);
  await db.runAsync(`DELETE FROM habits WHERE id = ?`, [id]);
}

// ─── Skincare Products Queries ──────────────────────────────────────

/**
 * Get skincare products for morning or night routine.
 */
export async function getSkincareProducts(
  db: SQLiteDatabase,
  routineType: 'morning' | 'night'
): Promise<SkincareProduct[]> {
  return db.getAllAsync<SkincareProduct>(
    `SELECT * FROM skincare_products
     WHERE routine_type = ? AND is_active = 1
     ORDER BY step_number ASC`,
    [routineType]
  );
}

/**
 * Add a new skincare product to a routine.
 */
export async function addSkincareProduct(
  db: SQLiteDatabase,
  routineType: 'morning' | 'night',
  name: string,
  notes?: string | null
): Promise<string> {
  const id = uuid();
  const count = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM skincare_products WHERE routine_type = ?`,
    [routineType]
  );
  const stepNumber = (count?.count ?? 0) + 1;

  await db.runAsync(
    `INSERT INTO skincare_products (id, routine_type, step_number, name, notes, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [id, routineType, stepNumber, name, notes ?? null]
  );
  return id;
}

/**
 * Update a skincare product.
 */
export async function updateSkincareProduct(
  db: SQLiteDatabase,
  id: string,
  name: string,
  notes?: string | null,
  isActive: number = 1
): Promise<void> {
  await db.runAsync(
    `UPDATE skincare_products SET name = ?, notes = ?, is_active = ? WHERE id = ?`,
    [name, notes ?? null, isActive, id]
  );
}

/**
 * Delete a skincare product.
 */
export async function deleteSkincareProduct(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM skincare_products WHERE id = ?`, [id]);
}
