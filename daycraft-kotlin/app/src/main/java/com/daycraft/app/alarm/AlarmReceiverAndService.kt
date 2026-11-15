package com.daycraft.app.alarm

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.daycraft.app.DaycraftApp

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getStringExtra("EXTRA_ALARM_ID") ?: return
        val label = intent.getStringExtra("EXTRA_ALARM_LABEL") ?: "Wake Up"
        val soundUri = intent.getStringExtra("EXTRA_ALARM_SOUND_URI")
        val soundName = intent.getStringExtra("EXTRA_ALARM_SOUND_NAME") ?: "Daycraft Chime"
        val snoozeMinutes = intent.getIntExtra("EXTRA_ALARM_SNOOZE_MINUTES", 9)

        // 1. Start foreground alarm playback service
        val serviceIntent = Intent(context, AlarmService::class.java).apply {
            putExtra("EXTRA_ALARM_ID", alarmId)
            putExtra("EXTRA_ALARM_LABEL", label)
            putExtra("EXTRA_ALARM_SOUND_URI", soundUri)
            putExtra("EXTRA_ALARM_SOUND_NAME", soundName)
            putExtra("EXTRA_ALARM_SNOOZE_MINUTES", snoozeMinutes)
        }
        context.startForegroundService(serviceIntent)

        // 2. Open full-screen Wakeup Ringing Activity
        val activityIntent = Intent(context, AlarmRingingActivity::class.java).apply {
            putExtra("EXTRA_ALARM_ID", alarmId)
            putExtra("EXTRA_ALARM_LABEL", label)
            putExtra("EXTRA_ALARM_SOUND_NAME", soundName)
            putExtra("EXTRA_ALARM_SNOOZE_MINUTES", snoozeMinutes)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        context.startActivity(activityIntent)
    }
}

class AlarmService : Service() {
    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_ALARM) {
            stopAlarm()
            stopSelf()
            return START_NOT_STICKY
        }

        val label = intent?.getStringExtra("EXTRA_ALARM_LABEL") ?: "Wake Up"
        val soundUri = intent?.getStringExtra("EXTRA_ALARM_SOUND_URI")

        acquireWakeLock()
        startForeground(NOTIFICATION_ID, buildForegroundNotification(label))
        playAudio(soundUri)

        return START_STICKY
    }

    private fun playAudio(soundUri: String?) {
        try {
            mediaPlayer?.release()
            val uri = if (!soundUri.isNullOrEmpty()) {
                Uri.parse(soundUri)
            } else {
                android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI
            }

            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                setDataSource(applicationContext, uri)
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            // Fallback to system default alarm sound if custom file fails
            try {
                mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build()
                    )
                    setDataSource(applicationContext, android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI)
                    isLooping = true
                    prepare()
                    start()
                }
            } catch (_: Exception) {}
        }
    }

    private fun buildForegroundNotification(label: String): Notification {
        val stopIntent = Intent(this, AlarmService::class.java).apply {
            action = ACTION_STOP_ALARM
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            100,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, DaycraftApp.ALARM_CHANNEL_ID)
            .setContentTitle("⏰ $label")
            .setContentText("Tap to dismiss or snooze morning wake alarm")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", stopPendingIntent)
            .build()
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "Daycraft:AlarmWakeLock"
        ).apply {
            acquire(10 * 60 * 1000L) // 10 minutes max
        }
    }

    private fun stopAlarm() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
    }

    override fun onDestroy() {
        stopAlarm()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val NOTIFICATION_ID = 9999
        const val ACTION_STOP_ALARM = "com.daycraft.app.ACTION_STOP_ALARM"
    }
}
