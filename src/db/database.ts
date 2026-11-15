import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the singleton database instance, opening it if necessary.
 * Uses WAL journal mode for concurrent-read performance.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('daycraft.db');
  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
  } catch (e) {
    // Graceful fallback on environments where WAL or foreign keys are restricted
  }
  return db;
}

/**
 * Creates all 19 tables, indexes, and enables WAL + foreign keys.
 * Safe to call multiple times (uses IF NOT EXISTS).
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await getDatabase();

  await database.execAsync(`
    -- ───────────────────── Settings ─────────────────────
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    -- ───────────────────── Schedule ─────────────────────
    CREATE TABLE IF NOT EXISTS schedule_blocks (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      start_time  TEXT NOT NULL,
      end_time    TEXT,
      category    TEXT NOT NULL DEFAULT 'routine',
      day_of_week INTEGER,
      is_recurring INTEGER NOT NULL DEFAULT 1,
      status      TEXT NOT NULL DEFAULT 'pending',
      date        TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ───────────────────── Habits ───────────────────────
    CREATE TABLE IF NOT EXISTS habits (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      group_name  TEXT NOT NULL DEFAULT 'morning',
      category    TEXT NOT NULL DEFAULT 'routine',
      frequency   TEXT NOT NULL DEFAULT 'daily',
      target_days TEXT DEFAULT '0,1,2,3,4,5,6',
      is_paused   INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id           TEXT PRIMARY KEY,
      habit_id     TEXT NOT NULL,
      date         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      notes        TEXT,
      completed_at TEXT,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    -- ───────────────────── Workouts ─────────────────────
    CREATE TABLE IF NOT EXISTS workout_plans (
      id          TEXT PRIMARY KEY,
      day_of_week INTEGER NOT NULL,
      name        TEXT NOT NULL,
      focus       TEXT NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id               TEXT PRIMARY KEY,
      plan_id          TEXT,
      date             TEXT NOT NULL,
      start_time       TEXT,
      end_time         TEXT,
      duration_seconds INTEGER DEFAULT 0,
      name             TEXT NOT NULL,
      notes            TEXT,
      is_completed     INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (plan_id) REFERENCES workout_plans(id)
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id           TEXT PRIMARY KEY,
      plan_id      TEXT,
      name         TEXT NOT NULL,
      category     TEXT,
      default_sets INTEGER DEFAULT 3,
      default_reps INTEGER DEFAULT 10,
      default_weight_kg REAL DEFAULT 20,
      notes        TEXT,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercise_sets (
      id            TEXT PRIMARY KEY,
      session_id    TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      set_number    INTEGER NOT NULL,
      reps          INTEGER,
      weight_kg     REAL,
      is_completed  INTEGER NOT NULL DEFAULT 0,
      rpe           INTEGER,
      notes         TEXT,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS body_measurements (
      id         TEXT PRIMARY KEY,
      date       TEXT NOT NULL,
      weight_kg  REAL,
      unit       TEXT NOT NULL DEFAULT 'kg',
      notes      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ───────────────────── Academics ────────────────────
    CREATE TABLE IF NOT EXISTS subjects (
      id                   TEXT PRIMARY KEY,
      name                 TEXT NOT NULL,
      code                 TEXT,
      color                TEXT DEFAULT '#2F855A',
      target_hours_per_week REAL DEFAULT 0,
      created_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS topics (
      id         TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      name       TEXT NOT NULL,
      unit       TEXT,
      status     TEXT NOT NULL DEFAULT 'not_started',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id               TEXT PRIMARY KEY,
      subject_id       TEXT NOT NULL,
      topic_id         TEXT,
      date             TEXT NOT NULL,
      start_time       TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      session_type     TEXT DEFAULT 'learning',
      notes            TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id         TEXT PRIMARY KEY,
      subject_id TEXT,
      title      TEXT NOT NULL,
      due_date   TEXT,
      priority   TEXT NOT NULL DEFAULT 'medium',
      status     TEXT NOT NULL DEFAULT 'pending',
      notes      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS exams (
      id             TEXT PRIMARY KEY,
      subject_id     TEXT,
      title          TEXT NOT NULL,
      exam_date      TEXT,
      target_score   INTEGER,
      checklist_json TEXT DEFAULT '[]',
      notes          TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    -- ───────────────────── Skills ───────────────────────
    CREATE TABLE IF NOT EXISTS skills (
      id                     TEXT PRIMARY KEY,
      name                   TEXT NOT NULL,
      category               TEXT NOT NULL DEFAULT 'general',
      target_hours_per_week  REAL DEFAULT 0,
      total_problems_solved  INTEGER DEFAULT 0,
      roadmap_json           TEXT DEFAULT '[]',
      notes                  TEXT,
      created_at             TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skill_sessions (
      id               TEXT PRIMARY KEY,
      skill_id         TEXT NOT NULL,
      date             TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      problems_solved  INTEGER DEFAULT 0,
      notes            TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (skill_id) REFERENCES skills(id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id               TEXT PRIMARY KEY,
      skill_id         TEXT,
      name             TEXT NOT NULL,
      description      TEXT,
      status           TEXT NOT NULL DEFAULT 'planned',
      github_url       TEXT,
      milestones_json  TEXT DEFAULT '[]',
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (skill_id) REFERENCES skills(id)
    );

    -- ───────────────────── Health ───────────────────────
    CREATE TABLE IF NOT EXISTS sleep_logs (
      id               TEXT PRIMARY KEY,
      date             TEXT NOT NULL UNIQUE,
      sleep_time       TEXT,
      wake_time        TEXT,
      duration_minutes INTEGER,
      quality_rating   INTEGER,
      notes            TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id        TEXT PRIMARY KEY,
      date      TEXT NOT NULL,
      amount_ml INTEGER NOT NULL,
      logged_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ───────────────────── Skincare Products ─────────────
    CREATE TABLE IF NOT EXISTS skincare_products (
      id           TEXT PRIMARY KEY,
      routine_type TEXT NOT NULL, -- 'morning' | 'night'
      step_number  INTEGER NOT NULL,
      name         TEXT NOT NULL,
      notes        TEXT,
      is_active    INTEGER NOT NULL DEFAULT 1
    );

    -- ───────────────────── Alarms & Wakeup ────────────────
    CREATE TABLE IF NOT EXISTS alarms (
      id             TEXT PRIMARY KEY,
      time           TEXT NOT NULL, -- '05:45' (24h HH:mm)
      label          TEXT NOT NULL DEFAULT 'Wake Up',
      days           TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6', -- comma separated days 0=Sun..6=Sat
      is_enabled     INTEGER NOT NULL DEFAULT 1,
      sound_type     TEXT NOT NULL DEFAULT 'preset', -- 'preset' | 'custom'
      sound_name     TEXT NOT NULL DEFAULT 'Daycraft Chime',
      sound_uri      TEXT, -- local file path for custom music/audio
      snooze_minutes INTEGER NOT NULL DEFAULT 9,
      vibrate        INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ───────────────────── Indexes ──────────────────────
    CREATE INDEX IF NOT EXISTS idx_habit_logs_date       ON habit_logs(date);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id   ON habit_logs(habit_id);
    CREATE INDEX IF NOT EXISTS idx_exercise_sets_session  ON exercise_sets(session_id);
    CREATE INDEX IF NOT EXISTS idx_study_sessions_date   ON study_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON study_sessions(subject_id);
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_water_logs_date       ON water_logs(date);
    CREATE INDEX IF NOT EXISTS idx_sleep_logs_date       ON sleep_logs(date);
    CREATE INDEX IF NOT EXISTS idx_schedule_blocks_dow   ON schedule_blocks(day_of_week);
    CREATE INDEX IF NOT EXISTS idx_alarms_enabled        ON alarms(is_enabled);
  `);

  // Ensure default wakeup alarm exists
  try {
    const existing = await database.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM alarms');
    if (!existing || existing.count === 0) {
      await database.runAsync(`
        INSERT INTO alarms (id, time, label, days, is_enabled, sound_type, sound_name, snooze_minutes, vibrate)
        VALUES ('default_wake_alarm', '05:45', 'Wake Up', '0,1,2,3,4,5,6', 1, 'preset', 'Daycraft Chime', 9, 1);
      `);
    }
  } catch (err) {
    // Graceful fallback if table is newly created
  }

  // Safe schema migration for default_weight_kg in existing databases
  try {
    await database.execAsync(`ALTER TABLE exercises ADD COLUMN default_weight_kg REAL DEFAULT 20;`);
  } catch {
    // Column already exists
  }

  return database;
}
