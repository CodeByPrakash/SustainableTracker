import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getActiveAlarms, type AlarmItem } from '../db/queries/alarmQueries';
import { formatTime12 } from './dateUtils';

export const ALARM_CHANNEL_ID = 'daycraft_wake_alarms';

/**
 * Configure dedicated high-priority alarm notification channel on Android
 */
export async function setupAlarmNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
        name: 'Wakeup Alarms',
        description: 'High-priority wake-up alarm notifications and morning calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 300, 500, 300, 800],
        lightColor: '#E87935',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
    } catch (err) {
      console.warn('Notice: Alarm notification channel fallback:', err);
    }
  }
}

/**
 * Request notification permissions for wake alarms
 */
export async function requestAlarmPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      await setupAlarmNotificationChannel();
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Could not request alarm permissions:', err);
    return false;
  }
}

/**
 * Schedules all enabled alarms in SQLite as recurring device notifications.
 */
export async function syncAlarmNotifications(db: SQLiteDatabase): Promise<number> {
  try {
    const hasPermission = await requestAlarmPermissions();
    if (!hasPermission) return 0;

    await setupAlarmNotificationChannel();

    // Get all scheduled notifications and cancel existing alarm notifications
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of allScheduled) {
      if (notif.content.data && notif.content.data.type === 'wake_alarm') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    const activeAlarms = await getActiveAlarms(db);
    let scheduledCount = 0;

    for (const alarm of activeAlarms) {
      const [hStr, mStr] = alarm.time.split(':');
      const hour = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);
      if (isNaN(hour) || isNaN(minute)) continue;

      const activeDays = alarm.days
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 0 && n <= 6);

      const timeFormatted = formatTime12(alarm.time);

      for (const d of activeDays) {
        // In Expo Notifications, Sunday is 1, Monday is 2, ..., Saturday is 7
        // Our activeDays uses 0=Sunday, 1=Monday, ..., 6=Saturday
        const expoWeekday = d + 1;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ ${alarm.label || 'Wake Up'} (${timeFormatted})`,
            body: `Time to rise and start your morning! Music: ${alarm.sound_name}`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: alarm.vibrate ? [0, 500, 300, 500, 300, 800] : undefined,
            data: {
              type: 'wake_alarm',
              alarmId: alarm.id,
              soundType: alarm.sound_type,
              soundUri: alarm.sound_uri,
              soundName: alarm.sound_name,
              snoozeMinutes: alarm.snooze_minutes,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: expoWeekday,
            hour,
            minute,
            channelId: ALARM_CHANNEL_ID,
          },
        });
        scheduledCount++;
      }
    }

    return scheduledCount;
  } catch (err) {
    console.warn('Could not sync alarm notifications:', err);
    return 0;
  }
}

/**
 * Schedule a snooze notification after specified minutes
 */
export async function scheduleSnoozeNotification(alarm: AlarmItem): Promise<void> {
  try {
    await setupAlarmNotificationChannel();
    const snoozeMs = (alarm.snooze_minutes || 9) * 60 * 1000;
    const triggerDate = new Date(Date.now() + snoozeMs);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Snooze Over: ${alarm.label || 'Wake Up'}`,
        body: `Time to get out of bed! Tap to stop music.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 300, 500, 300, 800],
        data: {
          type: 'wake_alarm',
          alarmId: alarm.id,
          soundType: alarm.sound_type,
          soundUri: alarm.sound_uri,
          soundName: alarm.sound_name,
          snoozeMinutes: alarm.snooze_minutes,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: ALARM_CHANNEL_ID,
      },
    });
  } catch (err) {
    console.warn('Could not schedule snooze notification:', err);
  }
}
