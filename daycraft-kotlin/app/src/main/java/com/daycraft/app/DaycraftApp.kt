package com.daycraft.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.os.Build
import com.daycraft.app.data.local.DaycraftDatabase

class DaycraftApp : Application() {

    val database: DaycraftDatabase by lazy {
        DaycraftDatabase.getDatabase(this)
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)

            // 1. High Priority Wakeup Alarm Channel
            val alarmChannel = NotificationChannel(
                ALARM_CHANNEL_ID,
                "Wakeup Alarms",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High-priority wake-up alarm chimes and morning calls"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 300, 500, 300, 800)
                setBypassDnd(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                setSound(android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI, audioAttributes)
            }

            // 2. Upcoming Schedule To-Dos Channel
            val todoChannel = NotificationChannel(
                TODO_CHANNEL_ID,
                "Schedule & Commitments",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Reminders for upcoming time-blocked schedule sessions"
            }

            notificationManager.createNotificationChannel(alarmChannel)
            notificationManager.createNotificationChannel(todoChannel)
        }
    }

    companion object {
        const val ALARM_CHANNEL_ID = "daycraft_wake_alarms"
        const val TODO_CHANNEL_ID = "daycraft_upcoming_todo"
    }
}
