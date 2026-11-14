import { uuid } from '../../utils/uuid';
import type { SQLiteDatabase } from 'expo-sqlite';

// ─── Types ──────────────────────────────────────────────────────────
export interface SleepLog {
  id: string;
  date: string;
  sleep_time: string | null;
  wake_time: string | null;
  duration_minutes: number | null;
  quality_rating: number | null;
  notes: string | null;
  created_at: string;
}

export interface WaterLog {
  id: string;
  date: string;
  amount_ml: number;
  logged_at: string;
}

// ─── Queries ────────────────────────────────────────────────────────

/**
 * Log a sleep entry. Uses INSERT OR REPLACE because date is UNIQUE.
 */
export async function logSleep(
  db: SQLiteDatabase,
  date: string,
  sleepTime: string | null,
  wakeTime: string | null,
  durationMinutes: number | null
): Promise<string> {
  // Check for existing entry on this date
  const existing = await db.getFirstAsync<SleepLog>(
    `SELECT * FROM sleep_logs WHERE date = ?`,
    [date]
  );

  if (existing) {
    await db.runAsync(
      `UPDATE sleep_logs
       SET sleep_time = ?, wake_time = ?, duration_minutes = ?
       WHERE id = ?`,
      [sleepTime, wakeTime, durationMinutes, existing.id]
    );
    return existing.id;
  }

  const id = uuid();
  await db.runAsync(
    `INSERT INTO sleep_logs (id, date, sleep_time, wake_time, duration_minutes)
     VALUES (?, ?, ?, ?, ?)`,
    [id, date, sleepTime, wakeTime, durationMinutes]
  );
  return id;
}

/**
 * Get recent sleep logs.
 */
export async function getSleepLogs(
  db: SQLiteDatabase,
  limit: number = 30
): Promise<SleepLog[]> {
  return db.getAllAsync<SleepLog>(
    `SELECT * FROM sleep_logs ORDER BY date DESC LIMIT ?`,
    [limit]
  );
}

/**
 * Log a water intake entry.
 */
export async function logWater(
  db: SQLiteDatabase,
  date: string,
  amountMl: number
): Promise<string> {
  const id = uuid();
  await db.runAsync(
    `INSERT INTO water_logs (id, date, amount_ml)
     VALUES (?, ?, ?)`,
    [id, date, amountMl]
  );
  return id;
}

/**
 * Get total water intake in ml for a specific date.
 */
export async function getWaterForDate(
  db: SQLiteDatabase,
  date: string
): Promise<number> {
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount_ml) AS total FROM water_logs WHERE date = ?`,
    [date]
  );
  return result?.total ?? 0;
}

/**
 * Get all individual water log entries for a specific date.
 */
export async function getWaterLogs(
  db: SQLiteDatabase,
  date: string
): Promise<WaterLog[]> {
  return db.getAllAsync<WaterLog>(
    `SELECT * FROM water_logs WHERE date = ? ORDER BY logged_at ASC`,
    [date]
  );
}
