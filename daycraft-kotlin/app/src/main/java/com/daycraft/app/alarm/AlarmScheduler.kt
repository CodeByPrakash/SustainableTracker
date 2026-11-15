package com.daycraft.app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.daycraft.app.data.local.entities.AlarmEntity
import java.util.Calendar

object AlarmScheduler {

    fun scheduleAlarm(context: Context, alarm: AlarmEntity) {
        if (!alarm.isEnabled) return

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val nextTriggerTime = calculateNextTriggerTime(alarm.time, alarm.days)

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = "com.daycraft.app.ACTION_TRIGGER_ALARM"
            putExtra("EXTRA_ALARM_ID", alarm.id)
            putExtra("EXTRA_ALARM_LABEL", alarm.label)
            putExtra("EXTRA_ALARM_SOUND_URI", alarm.soundUri)
            putExtra("EXTRA_ALARM_SOUND_NAME", alarm.soundName)
            putExtra("EXTRA_ALARM_SNOOZE_MINUTES", alarm.snoozeMinutes)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarm.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val showIntent = PendingIntent.getActivity(
            context,
            alarm.id.hashCode(),
            Intent(context, AlarmRingingActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val clockInfo = AlarmManager.AlarmClockInfo(nextTriggerTime, showIntent)
        alarmManager.setAlarmClock(clockInfo, pendingIntent)
    }

    fun cancelAlarm(context: Context, alarmId: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarmId.hashCode(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    private fun calculateNextTriggerTime(time: String, daysStr: String): Long {
        val parts = time.split(":")
        val hour = parts[0].toIntOrNull() ?: 5
        val minute = parts[1].toIntOrNull() ?: 45

        val activeDays = daysStr.split(",")
            .mapNotNull { it.trim().toIntOrNull() }
            .map { dayIndex ->
                // Daycraft 0=Sun..6=Sat -> Calendar.SUNDAY=1..Calendar.SATURDAY=7
                dayIndex + 1
            }

        val now = Calendar.getInstance()
        var bestCalendar: Calendar? = null

        // Look over the next 8 days for the soonest matching active day
        for (offset in 0..7) {
            val candidate = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, offset)
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            if (candidate.timeInMillis > now.timeInMillis) {
                val candidateDayOfWeek = candidate.get(Calendar.DAY_OF_WEEK)
                if (activeDays.isEmpty() || activeDays.contains(candidateDayOfWeek)) {
                    if (bestCalendar == null || candidate.timeInMillis < bestCalendar.timeInMillis) {
                        bestCalendar = candidate
                        break
                    }
                }
            }
        }

        return bestCalendar?.timeInMillis ?: (now.timeInMillis + 24 * 60 * 60 * 1000)
    }
}
