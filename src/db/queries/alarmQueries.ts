import type { SQLiteDatabase } from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';

export interface AlarmItem {
  id: string;
  time: string; // 'HH:mm' 24-hr format (e.g. '05:45')
  label: string;
  days: string; // '0,1,2,3,4,5,6' (0=Sun, 1=Mon, ..., 6=Sat)
  is_enabled: number; // 1 | 0
  sound_type: 'preset' | 'custom';
  sound_name: string;
  sound_uri: string | null;
  snooze_minutes: number;
  vibrate: number; // 1 | 0
  created_at?: string;
  updated_at?: string;
}

export async function getAllAlarms(db: SQLiteDatabase): Promise<AlarmItem[]> {
  try {
    const rows = await db.getAllAsync<AlarmItem>(
      'SELECT * FROM alarms ORDER BY time ASC'
    );
    return rows;
  } catch (error) {
    console.error('Error fetching alarms:', error);
    return [];
  }
}

export async function getActiveAlarms(db: SQLiteDatabase): Promise<AlarmItem[]> {
  try {
    const rows = await db.getAllAsync<AlarmItem>(
      'SELECT * FROM alarms WHERE is_enabled = 1 ORDER BY time ASC'
    );
    return rows;
  } catch (error) {
    console.error('Error fetching active alarms:', error);
    return [];
  }
}

export async function getAlarmById(db: SQLiteDatabase, id: string): Promise<AlarmItem | null> {
  try {
    const row = await db.getFirstAsync<AlarmItem>(
      'SELECT * FROM alarms WHERE id = ?',
      [id]
    );
    return row ?? null;
  } catch (error) {
    console.error(`Error fetching alarm ${id}:`, error);
    return null;
  }
}

export async function createAlarm(
  db: SQLiteDatabase,
  alarm: Omit<AlarmItem, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<AlarmItem> {
  const newAlarm: AlarmItem = {
    id: alarm.id || uuidv4(),
    time: alarm.time,
    label: alarm.label || 'Wake Up',
    days: alarm.days ?? '0,1,2,3,4,5,6',
    is_enabled: alarm.is_enabled ?? 1,
    sound_type: alarm.sound_type ?? 'preset',
    sound_name: alarm.sound_name ?? 'Daycraft Chime',
    sound_uri: alarm.sound_uri ?? null,
    snooze_minutes: alarm.snooze_minutes ?? 9,
    vibrate: alarm.vibrate ?? 1,
  };

  await db.runAsync(
    `INSERT INTO alarms (id, time, label, days, is_enabled, sound_type, sound_name, sound_uri, snooze_minutes, vibrate, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      newAlarm.id,
      newAlarm.time,
      newAlarm.label,
      newAlarm.days,
      newAlarm.is_enabled,
      newAlarm.sound_type,
      newAlarm.sound_name,
      newAlarm.sound_uri,
      newAlarm.snooze_minutes,
      newAlarm.vibrate,
    ]
  );

  return newAlarm;
}

export async function updateAlarm(
  db: SQLiteDatabase,
  alarm: Partial<AlarmItem> & { id: string }
): Promise<void> {
  const current = await getAlarmById(db, alarm.id);
  if (!current) return;

  const merged: AlarmItem = {
    ...current,
    ...alarm,
  };

  await db.runAsync(
    `UPDATE alarms
     SET time = ?, label = ?, days = ?, is_enabled = ?, sound_type = ?, sound_name = ?, sound_uri = ?, snooze_minutes = ?, vibrate = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      merged.time,
      merged.label,
      merged.days,
      merged.is_enabled,
      merged.sound_type,
      merged.sound_name,
      merged.sound_uri,
      merged.snooze_minutes,
      merged.vibrate,
      merged.id,
    ]
  );
}

export async function toggleAlarm(
  db: SQLiteDatabase,
  id: string,
  isEnabled: boolean
): Promise<void> {
  await db.runAsync(
    `UPDATE alarms SET is_enabled = ?, updated_at = datetime('now') WHERE id = ?`,
    [isEnabled ? 1 : 0, id]
  );
}

export async function deleteAlarm(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM alarms WHERE id = ?', [id]);
}
