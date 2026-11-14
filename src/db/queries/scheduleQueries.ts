import { uuid } from '../../utils/uuid';
import { formatDate, getStartOfWeek } from '../../utils/dateUtils';
import type { SQLiteDatabase } from 'expo-sqlite';

// ─── Types ──────────────────────────────────────────────────────────
export interface ScheduleBlock {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  category: string;
  day_of_week: number | null;
  is_recurring: number;
  status: string;
  date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBlockInput {
  title: string;
  start_time: string;
  end_time?: string | null;
  category?: string;
  day_of_week?: number | null;
  is_recurring?: number;
  date?: string | null;
  sort_order?: number;
}

export interface UpdateBlockInput {
  title?: string;
  start_time?: string;
  end_time?: string | null;
  category?: string;
  day_of_week?: number | null;
  is_recurring?: number;
  status?: string;
  date?: string | null;
  sort_order?: number;
}

// ─── Queries ────────────────────────────────────────────────────────

/**
 * Get all recurring schedule blocks for a specific day of the week.
 * @param dayOfWeek 0=Sun … 6=Sat (or 1=Mon … 7=Sun per seed convention)
 */
export async function getScheduleForDay(
  db: SQLiteDatabase,
  dayOfWeek: number
): Promise<ScheduleBlock[]> {
  return db.getAllAsync<ScheduleBlock>(
    `SELECT * FROM schedule_blocks
     WHERE day_of_week = ? AND is_recurring = 1
     ORDER BY sort_order ASC`,
    [dayOfWeek]
  );
}

/**
 * Get the full schedule for a specific date — both recurring blocks
 * for the weekday AND any one-off blocks created for that date.
 * @param date ISO date string (YYYY-MM-DD)
 */
export async function getScheduleForDate(
  db: SQLiteDatabase,
  date: string
): Promise<ScheduleBlock[]> {
  // Derive day-of-week from the date (JS: 0=Sun … 6=Sat → seed: 1=Mon … 7=Sun)
  const d = new Date(date);
  const jsDow = d.getUTCDay(); // 0=Sun
  const seedDow = jsDow === 0 ? 7 : jsDow; // 1=Mon … 7=Sun

  return db.getAllAsync<ScheduleBlock>(
    `SELECT * FROM schedule_blocks
     WHERE (day_of_week = ? AND is_recurring = 1)
        OR (date = ? AND is_recurring = 0)
     ORDER BY sort_order ASC`,
    [seedDow, date]
  );
}

/**
 * Update the completion status of a schedule block.
 */
export async function updateBlockStatus(
  db: SQLiteDatabase,
  blockId: string,
  status: string
): Promise<void> {
  await db.runAsync(
    `UPDATE schedule_blocks SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    [status, blockId]
  );
}

/**
 * Create a new schedule block.
 */
export async function createBlock(
  db: SQLiteDatabase,
  block: CreateBlockInput
): Promise<string> {
  const id = uuid();
  await db.runAsync(
    `INSERT INTO schedule_blocks (id, title, start_time, end_time, category, day_of_week, is_recurring, date, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      block.title,
      block.start_time,
      block.end_time ?? null,
      block.category ?? 'routine',
      block.day_of_week ?? null,
      block.is_recurring ?? 1,
      block.date ?? null,
      block.sort_order ?? 0,
    ]
  );
  return id;
}

/**
 * Update an existing schedule block.
 */
export async function updateBlock(
  db: SQLiteDatabase,
  id: string,
  updates: UpdateBlockInput
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.title !== undefined)       { fields.push('title = ?');       values.push(updates.title); }
  if (updates.start_time !== undefined)   { fields.push('start_time = ?'); values.push(updates.start_time); }
  if (updates.end_time !== undefined)     { fields.push('end_time = ?');   values.push(updates.end_time); }
  if (updates.category !== undefined)     { fields.push('category = ?');   values.push(updates.category); }
  if (updates.day_of_week !== undefined)  { fields.push('day_of_week = ?');values.push(updates.day_of_week); }
  if (updates.is_recurring !== undefined) { fields.push('is_recurring = ?');values.push(updates.is_recurring); }
  if (updates.status !== undefined)       { fields.push('status = ?');     values.push(updates.status); }
  if (updates.date !== undefined)         { fields.push('date = ?');       values.push(updates.date); }
  if (updates.sort_order !== undefined)   { fields.push('sort_order = ?'); values.push(updates.sort_order); }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.runAsync(
    `UPDATE schedule_blocks SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete a schedule block.
 */
export async function deleteBlock(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM schedule_blocks WHERE id = ?', [id]);
}

// ─── Special Saturday & Sunday Weekend Agendas ────────────────────────
export const SPECIAL_SATURDAY_AGENDA = [
  { title: 'Wake up & hydrate (500ml)', startTime: '05:45', endTime: '06:00', category: 'Personal', sortOrder: 0 },
  { title: 'Gym: Legs + Biceps + Abs', startTime: '06:00', endTime: '07:15', category: 'Gym', sortOrder: 1 },
  { title: 'Cool down, shower & morning skincare', startTime: '07:15', endTime: '07:45', category: 'Habits', sortOrder: 2 },
  { title: 'Saturday breakfast & tea', startTime: '07:45', endTime: '08:30', category: 'Meal', sortOrder: 3 },
  { title: 'Lab assignments & academic backlog', startTime: '08:30', endTime: '10:00', category: 'Academics', sortOrder: 4 },
  { title: 'Saturday Project Sprint (Deep Work)', startTime: '10:00', endTime: '13:30', category: 'Skills', sortOrder: 5 },
  { title: 'Lunch & recharge', startTime: '13:30', endTime: '14:30', category: 'Meal', sortOrder: 6 },
  { title: 'DSA practice & competitive coding', startTime: '14:30', endTime: '17:00', category: 'Skills', sortOrder: 7 },
  { title: 'Weekend outing & social walk', startTime: '17:00', endTime: '19:30', category: 'Personal', sortOrder: 8 },
  { title: 'Dinner & personal time', startTime: '19:30', endTime: '20:15', category: 'Meal', sortOrder: 9 },
  { title: 'Tech exploration & architecture', startTime: '20:15', endTime: '21:15', category: 'Skills', sortOrder: 10 },
  { title: 'Night skincare protocol', startTime: '21:15', endTime: '21:45', category: 'Habits', sortOrder: 11 },
  { title: 'Wind down & screen-off reading', startTime: '21:45', endTime: '22:30', category: 'Recovery', sortOrder: 12 },
  { title: 'Restorative sleep', startTime: '22:30', endTime: '06:30', category: 'Sleep', sortOrder: 13 },
];

export const SPECIAL_SUNDAY_AGENDA = [
  { title: 'Wake up & warm lemon water', startTime: '06:30', endTime: '07:00', category: 'Personal', sortOrder: 0 },
  { title: 'Active recovery walk & mobility stretching', startTime: '07:00', endTime: '07:45', category: 'Recovery', sortOrder: 1 },
  { title: 'Shower & Sunday skincare', startTime: '07:45', endTime: '08:15', category: 'Habits', sortOrder: 2 },
  { title: 'Leisurely breakfast & personal time', startTime: '08:15', endTime: '09:15', category: 'Meal', sortOrder: 3 },
  { title: 'Weekly academic synthesis & revision', startTime: '09:15', endTime: '11:30', category: 'Academics', sortOrder: 4 },
  { title: 'Personal engineering project & refactoring', startTime: '11:30', endTime: '13:30', category: 'Skills', sortOrder: 5 },
  { title: 'Sunday family lunch', startTime: '13:30', endTime: '14:30', category: 'Meal', sortOrder: 6 },
  { title: 'Rest, afternoon nap & reading', startTime: '14:30', endTime: '16:30', category: 'Recovery', sortOrder: 7 },
  { title: 'Tech podcast & industry review', startTime: '16:30', endTime: '17:30', category: 'Skills', sortOrder: 8 },
  { title: 'Evening walk, coffee & relaxation', startTime: '17:30', endTime: '19:30', category: 'Personal', sortOrder: 9 },
  { title: 'Dinner & relaxing time', startTime: '19:30', endTime: '20:30', category: 'Meal', sortOrder: 10 },
  { title: 'Weekly Blueprint & Monday prep', startTime: '20:30', endTime: '21:30', category: 'Personal', sortOrder: 11 },
  { title: 'Night skincare protocol', startTime: '21:30', endTime: '22:00', category: 'Habits', sortOrder: 12 },
  { title: 'Wind down & mind relaxation', startTime: '22:00', endTime: '22:30', category: 'Recovery', sortOrder: 13 },
  { title: 'Deep sleep before Monday morning', startTime: '22:30', endTime: '05:45', category: 'Sleep', sortOrder: 14 },
];

/**
 * Apply special curated weekend schedule for Saturday (dow=6) or Sunday (dow=7)
 */
export async function applySpecialWeekendDay(db: SQLiteDatabase, dayOfWeek: 6 | 7): Promise<void> {
  await db.runAsync('DELETE FROM schedule_blocks WHERE day_of_week = ? AND is_recurring = 1', [dayOfWeek]);
  const agenda = dayOfWeek === 6 ? SPECIAL_SATURDAY_AGENDA : SPECIAL_SUNDAY_AGENDA;
  for (const block of agenda) {
    await db.runAsync(
      `INSERT INTO schedule_blocks (id, title, start_time, end_time, category, day_of_week, is_recurring, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [uuid(), block.title, block.startTime, block.endTime, block.category, dayOfWeek, block.sortOrder]
    );
  }
}

// ─── Weekly Agenda Reset Logic ────────────────────────────────────────

/**
 * Resets all recurring schedule block checkboxes across all 7 days to 'pending'.
 * Updates settings.last_schedule_week to the current week's starting Monday.
 */
export async function resetWeeklySchedule(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    `UPDATE schedule_blocks SET status = 'pending', updated_at = datetime('now') WHERE is_recurring = 1`
  );
  const currentWeekStart = formatDate(getStartOfWeek(new Date()));
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('last_schedule_week', ?)`,
    [currentWeekStart]
  );
}

/**
 * Resets recurring schedule blocks for a specific day of week (1=Mon ... 7=Sun) to 'pending'.
 */
export async function resetDaySchedule(db: SQLiteDatabase, dayOfWeek: number): Promise<void> {
  await db.runAsync(
    `UPDATE schedule_blocks SET status = 'pending', updated_at = datetime('now') WHERE day_of_week = ? AND is_recurring = 1`,
    [dayOfWeek]
  );
}

/**
 * Checks if the calendar week has transitioned since the last recorded week.
 * If current week's Monday is newer than settings.last_schedule_week,
 * automatically resets all recurring blocks to 'pending' and saves the new week.
 * Returns true if an automatic reset was executed.
 */
export async function checkAndAutoResetWeeklySchedule(db: SQLiteDatabase): Promise<boolean> {
  try {
    const currentWeekStart = formatDate(getStartOfWeek(new Date()));
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'last_schedule_week'`
    );
    if (!row) {
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('last_schedule_week', ?)`,
        [currentWeekStart]
      );
      return false;
    }
    if (row.value !== currentWeekStart) {
      // Transitioned into a new week! Reset all recurring checkboxes
      await db.runAsync(
        `UPDATE schedule_blocks SET status = 'pending', updated_at = datetime('now') WHERE is_recurring = 1`
      );
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('last_schedule_week', ?)`,
        [currentWeekStart]
      );
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed checking auto-reset weekly schedule:', err);
    return false;
  }
}
