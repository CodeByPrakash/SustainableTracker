import type { SQLiteDatabase } from 'expo-sqlite';

// ─── Types ──────────────────────────────────────────────────────────
export interface DailyCompletionTrend {
  date: string;
  percentage: number;
}

export interface HeatmapEntry {
  date: string;
  status: string; // 'none' | 'partial' | 'full'
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Count the total number of days between two date strings (inclusive).
 */
function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

// ─── Queries ────────────────────────────────────────────────────────

/**
 * Overall consistency: ratio of completed commitments (habits marked done +
 * schedule blocks completed) vs total eligible over a date range.
 */
export async function getOverallConsistency(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<number> {
  const habitsResult = await db.getFirstAsync<{ done: number; total: number }>(
    `SELECT
       COUNT(CASE WHEN status = 'done' THEN 1 END) AS done,
       COUNT(*) AS total
     FROM habit_logs
     WHERE date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  const scheduleResult = await db.getFirstAsync<{ done: number; total: number }>(
    `SELECT
       COUNT(CASE WHEN status = 'completed' THEN 1 END) AS done,
       COUNT(*) AS total
     FROM schedule_blocks
     WHERE (date BETWEEN ? AND ?)
        OR (is_recurring = 1 AND day_of_week IS NOT NULL)`,
    [startDate, endDate]
  );

  const totalDone = (habitsResult?.done ?? 0) + (scheduleResult?.done ?? 0);
  const totalEligible = (habitsResult?.total ?? 0) + (scheduleResult?.total ?? 0);

  if (totalEligible === 0) return 0;
  return Math.round((totalDone / totalEligible) * 100) / 100;
}

/**
 * Gym consistency: ratio of completed workout sessions vs planned
 * workout days (non-rest plans) in the date range.
 */
export async function getGymConsistency(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<number> {
  // Count non-rest workout plan days
  const planDays = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM workout_plans WHERE focus != 'rest'`
  );
  const totalDays = daysBetween(startDate, endDate);
  const weeks = Math.max(1, totalDays / 7);
  const plannedSessions = Math.round((planDays?.count ?? 0) * weeks);

  // Count completed sessions
  const completed = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM workout_sessions
     WHERE is_completed = 1 AND date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  if (plannedSessions === 0) return 0;
  return Math.round(((completed?.count ?? 0) / plannedSessions) * 100) / 100;
}

/**
 * Academic consistency: ratio of days with at least one study session
 * vs total weekdays (Mon–Fri) in the range.
 */
export async function getAcademicConsistency(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<number> {
  // Count distinct study days
  const studyDays = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT date) AS count FROM study_sessions
     WHERE date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  // Count weekdays in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  let weekdays = 0;
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay();
    if (dow >= 1 && dow <= 5) weekdays++;
    current.setDate(current.getDate() + 1);
  }

  if (weekdays === 0) return 0;
  return Math.round(((studyDays?.count ?? 0) / weekdays) * 100) / 100;
}

/**
 * Habit completion rate: done habits / total habit logs in the range.
 */
export async function getHabitCompletionRate(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<number> {
  const result = await db.getFirstAsync<{ done: number; total: number }>(
    `SELECT
       COUNT(CASE WHEN status = 'done' THEN 1 END) AS done,
       COUNT(*) AS total
     FROM habit_logs
     WHERE date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  if (!result || result.total === 0) return 0;
  return Math.round((result.done / result.total) * 100) / 100;
}

/**
 * Daily completion trend: per-day habit completion percentage.
 */
export async function getDailyCompletionTrend(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<DailyCompletionTrend[]> {
  const rows = await db.getAllAsync<{ date: string; done: number; total: number }>(
    `SELECT
       date,
       COUNT(CASE WHEN status = 'done' THEN 1 END) AS done,
       COUNT(*) AS total
     FROM habit_logs
     WHERE date BETWEEN ? AND ?
     GROUP BY date
     ORDER BY date ASC`,
    [startDate, endDate]
  );

  return rows.map((row) => ({
    date: row.date,
    percentage: row.total > 0
      ? Math.round((row.done / row.total) * 100)
      : 0,
  }));
}

/**
 * Heatmap data: per-day status for a given category.
 * Returns 'none' (no activity), 'partial' (some done), or 'full' (all done).
 */
export async function getHeatmapData(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
  category: string
): Promise<HeatmapEntry[]> {
  let query: string;
  let params: (string | number)[];

  if (category === 'habits') {
    query = `
      SELECT
        date,
        COUNT(CASE WHEN status = 'done' THEN 1 END) AS done,
        COUNT(*) AS total
      FROM habit_logs
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date ASC`;
    params = [startDate, endDate];
  } else if (category === 'workouts') {
    query = `
      SELECT
        date,
        COUNT(CASE WHEN is_completed = 1 THEN 1 END) AS done,
        COUNT(*) AS total
      FROM workout_sessions
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date ASC`;
    params = [startDate, endDate];
  } else if (category === 'study') {
    query = `
      SELECT
        date,
        COUNT(*) AS done,
        COUNT(*) AS total
      FROM study_sessions
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date ASC`;
    params = [startDate, endDate];
  } else {
    // Fallback: habit logs
    query = `
      SELECT
        date,
        COUNT(CASE WHEN status = 'done' THEN 1 END) AS done,
        COUNT(*) AS total
      FROM habit_logs
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date ASC`;
    params = [startDate, endDate];
  }

  const rows = await db.getAllAsync<{ date: string; done: number; total: number }>(
    query,
    params
  );

  return rows.map((row) => {
    let status: string;
    if (row.done === 0) {
      status = 'none';
    } else if (row.done >= row.total) {
      status = 'full';
    } else {
      status = 'partial';
    }
    return { date: row.date, status };
  });
}

/**
 * Real 5-week trend points computed from actual database records (W1 to W5).
 * Returns real completion percentage (0 if nothing done).
 */
export async function getRealWeeklyTrends(
  db: SQLiteDatabase
): Promise<{ label: string; value: number }[]> {
  const points: { label: string; value: number }[] = [];
  const now = new Date();

  for (let w = 4; w >= 0; w--) {
    const weekLabel = `W${5 - w}`;
    const start = new Date(now);
    start.setDate(now.getDate() - w * 7 - 6);
    const end = new Date(now);
    end.setDate(now.getDate() - w * 7);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const [habitsRow, workoutRow, studyRow] = await Promise.all([
      db.getFirstAsync<{ done: number; total: number }>(
        `SELECT
           COUNT(CASE WHEN status = 'done' THEN 1 END) as done,
           COUNT(*) as total
         FROM habit_logs
         WHERE date BETWEEN ? AND ?`,
        [startStr, endStr]
      ),
      db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM workout_sessions
         WHERE is_completed = 1 AND date BETWEEN ? AND ?`,
        [startStr, endStr]
      ),
      db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM study_sessions
         WHERE date BETWEEN ? AND ?`,
        [startStr, endStr]
      ),
    ]);

    const totalDone = (habitsRow?.done || 0) + (workoutRow?.count || 0) + (studyRow?.count || 0);
    // 5 workouts + 5 study + habits per week benchmark
    const expected = Math.max(1, (habitsRow?.total || 14) + 5 + 5);
    const pct = Math.min(100, Math.round((totalDone / expected) * 100));

    points.push({ label: weekLabel, value: pct });
  }

  return points;
}

/**
 * Real 35-day consistency heatmap entries computed from actual SQLite logs.
 * No fake hashes, no random demo patterns.
 */
export async function getRealHeatmap(
  db: SQLiteDatabase,
  category: 'all' | 'gym' | 'academics' | 'habits',
  todayStr: string
): Promise<{ date: string; status: 'completed' | 'partial' | 'missed' | 'none'; label: string }[]> {
  const startDateObj = new Date(todayStr);
  startDateObj.setDate(startDateObj.getDate() - 34);
  const startDateStr = startDateObj.toISOString().split('T')[0];

  const [workoutRows, studyRows, habitRows] = await Promise.all([
    db.getAllAsync<{ date: string }>(
      `SELECT date FROM workout_sessions WHERE is_completed = 1 AND date BETWEEN ? AND ?`,
      [startDateStr, todayStr]
    ),
    db.getAllAsync<{ date: string }>(
      `SELECT date FROM study_sessions WHERE date BETWEEN ? AND ?`,
      [startDateStr, todayStr]
    ),
    db.getAllAsync<{ date: string; done: number; total: number }>(
      `SELECT date,
              COUNT(CASE WHEN status = 'done' THEN 1 END) as done,
              COUNT(*) as total
       FROM habit_logs
       WHERE date BETWEEN ? AND ?
       GROUP BY date`,
      [startDateStr, todayStr]
    ),
  ]);

  const workoutDates = new Set(workoutRows.map((r) => r.date));
  const studyDates = new Set(studyRows.map((r) => r.date));
  const habitMap = new Map<string, { done: number; total: number }>();
  habitRows.forEach((r) => habitMap.set(r.date, { done: r.done, total: r.total }));

  const days: { date: string; status: 'completed' | 'partial' | 'missed' | 'none'; label: string }[] = [];

  for (let i = 34; i >= 0; i--) {
    const d = new Date(todayStr);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const dow = d.getDay(); // 0=Sun
    const isPast = ds < todayStr;
    const isToday = ds === todayStr;

    if (category === 'gym') {
      const didWorkout = workoutDates.has(ds);
      if (didWorkout) {
        days.push({ date: ds, status: 'completed', label: `${ds}: Workout completed` });
      } else if (dow === 0) {
        days.push({ date: ds, status: 'none', label: `${ds}: Scheduled rest day` });
      } else if (isPast) {
        days.push({ date: ds, status: 'missed', label: `${ds}: Rest / No workout logged` });
      } else {
        days.push({ date: ds, status: 'none', label: `${ds}: Today's training pending` });
      }
    } else if (category === 'academics') {
      const didStudy = studyDates.has(ds);
      if (didStudy) {
        days.push({ date: ds, status: 'completed', label: `${ds}: Study session logged` });
      } else if (dow === 0) {
        days.push({ date: ds, status: 'none', label: `${ds}: Sunday academic synthesis` });
      } else if (isPast) {
        days.push({ date: ds, status: 'missed', label: `${ds}: No study logged` });
      } else {
        days.push({ date: ds, status: 'none', label: `${ds}: Today's study pending` });
      }
    } else if (category === 'habits') {
      const hData = habitMap.get(ds);
      if (hData && hData.done > 0 && hData.done >= hData.total) {
        days.push({ date: ds, status: 'completed', label: `${ds}: All ${hData.done} habits completed` });
      } else if (hData && hData.done > 0) {
        days.push({ date: ds, status: 'partial', label: `${ds}: ${hData.done}/${hData.total} habits completed` });
      } else if (isPast) {
        days.push({ date: ds, status: 'missed', label: `${ds}: 0 habits logged` });
      } else {
        days.push({ date: ds, status: 'none', label: `${ds}: Habits pending for today` });
      }
    } else {
      // 'all' category
      const didWorkout = workoutDates.has(ds);
      const didStudy = studyDates.has(ds);
      const hData = habitMap.get(ds);
      const doneHabits = hData?.done || 0;

      const totalSignals = (didWorkout ? 1 : 0) + (didStudy ? 1 : 0) + (doneHabits > 0 ? 1 : 0);

      if (totalSignals >= 2) {
        days.push({ date: ds, status: 'completed', label: `${ds}: High discipline day` });
      } else if (totalSignals === 1) {
        days.push({ date: ds, status: 'partial', label: `${ds}: Partial discipline completed` });
      } else if (isPast) {
        days.push({ date: ds, status: 'missed', label: `${ds}: No logs recorded` });
      } else {
        days.push({ date: ds, status: 'none', label: `${ds}: In progress` });
      }
    }
  }

  return days;
}
