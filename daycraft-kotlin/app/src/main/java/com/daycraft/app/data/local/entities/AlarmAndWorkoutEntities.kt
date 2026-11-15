package com.daycraft.app.data.local.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(
    tableName = "alarms",
    indices = [Index("isEnabled")]
)
data class AlarmEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val time: String, // HH:mm 24-hr format (e.g. "05:45")
    val label: String = "Wake Up",
    val days: String = "0,1,2,3,4,5,6", // 0=Sun..6=Sat
    val isEnabled: Boolean = true,
    val soundType: String = "preset", // preset, custom
    val soundName: String = "Daycraft Chime",
    val soundUri: String? = null, // local file URI or null
    val snoozeMinutes: Int = 9,
    val vibrate: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "water_logs")
data class WaterLogEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val date: String, // YYYY-MM-DD
    val amountMl: Int,
    val loggedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "sleep_logs")
data class SleepLogEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val date: String, // YYYY-MM-DD
    val sleepTime: String? = null,
    val wakeTime: String? = null,
    val durationMinutes: Int? = null,
    val qualityRating: Int? = null,
    val notes: String? = null
)

@Entity(tableName = "workout_plans")
data class WorkoutPlanEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val dayOfWeek: Int, // 0=Sun..6=Sat
    val name: String,
    val focus: String,
    val sortOrder: Int = 0
)

@Entity(tableName = "exercises")
data class ExerciseEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val planId: String,
    val name: String,
    val targetSets: Int = 3,
    val targetReps: String = "10-12",
    val defaultWeightKg: Double = 20.0,
    val sortOrder: Int = 0
)
