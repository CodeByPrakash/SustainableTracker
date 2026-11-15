import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getScheduleForDate } from '../db/queries/scheduleQueries';
import { getToday, formatTime12 } from './dateUtils';

// Android Notification Channel ID
export const ANDROID_CHANNEL_ID = 'daycraft_upcoming_todo';

let channelSetupAttempted = false;
export let isAndroidChannelSupported = true;

// Configure notification behavior to show alert, play sound, and show in Android drawer
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPresentAlert: true,
  }),
});

/**
 * Configure Android notification channel safely with high importance and audio sound
 */
export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android' && !channelSetupAttempted) {
    channelSetupAttempted = true;
    try {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Upcoming Commitments & Reminders',
        description: 'System notification reminding of upcoming schedule to-dos and sessions.',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E87935',
        enableVibrate: true,
        showBadge: true,
      });
      isAndroidChannelSupported = true;
    } catch {
      // In Expo Go on Android, custom notification channels are sandboxed/unsupported for guest apps
      isAndroidChannelSupported = false;
    }
  }
}

/**
 * Request notification permissions on device
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      await setupAndroidNotificationChannel();
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Could not request notification permissions:', err);
    return false;
  }
}

/**
 * Sync and schedule Android system notifications for today's upcoming to-dos from SQLite.
 * Uses high priority Android channel and system sound.
 */
export async function syncScheduleNotifications(db: SQLiteDatabase): Promise<number> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return 0;

    await setupAndroidNotificationChannel();

    // Check if notifications are enabled in settings
    const enabledSetting = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'notifications_enabled'"
    );
    if (enabledSetting && enabledSetting.value === 'false') {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return 0;
    }

    // Get lead time preference (e.g. 0, 5, 10 minutes before)
    const leadSetting = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'notification_lead_minutes'"
    );
    const leadMinutes = leadSetting ? parseInt(leadSetting.value, 10) || 0 : 5;

    // Clear previous scheduled reminders
    await Notifications.cancelAllScheduledNotificationsAsync();

    const todayStr = getToday();
    const blocks = await getScheduleForDate(db, todayStr);
    const now = new Date();
    let scheduledCount = 0;

    for (const block of blocks) {
      if (block.status === 'completed') continue; // Don't remind for completed blocks

      const [hourStr, minStr] = block.start_time.split(':');
      const h = parseInt(hourStr, 10);
      const m = parseInt(minStr, 10);
      if (isNaN(h) || isNaN(m)) continue;

      // Calculate scheduled date/time for today
      const targetDate = new Date();
      targetDate.setHours(h, m, 0, 0);

      // Subtract lead time
      const triggerDate = new Date(targetDate.getTime() - leadMinutes * 60 * 1000);

      // Only schedule if the trigger time is in the future
      if (triggerDate.getTime() > now.getTime()) {
        const timeDisplay = formatTime12(block.start_time);
        const leadText = leadMinutes > 0 ? `Starts in ${leadMinutes}m (${timeDisplay})` : `Starting now at ${timeDisplay}`;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `DAYCRAFT — Upcoming: ${block.title}`,
            body: `${leadText} • Category: ${block.category}. Tap to open Daycraft.`,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
            data: { blockId: block.id, category: block.category },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            ...(isAndroidChannelSupported && Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
          },
        });
        scheduledCount++;
      }
    }

    return scheduledCount;
  } catch (err) {
    console.warn('Could not sync schedule notifications:', err);
    return 0;
  }
}

/**
 * Send an immediate Android system notification to test sound and banner
 */
export async function sendImmediateTestNotification(): Promise<boolean> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    await setupAndroidNotificationChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DAYCRAFT — Upcoming Commitment',
        body: '🔔 Gym Workout starts in 10 minutes (06:00 AM). Notification audio chime verified.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
      },
      trigger: {
        ...(isAndroidChannelSupported && Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      } as any,
    });

    return true;
  } catch (err) {
    console.warn('Could not send immediate test notification:', err);
    return false;
  }
}

/**
 * Cancel all active local reminders
 */
export async function cancelDailyReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn('Could not cancel notifications:', err);
  }
}
