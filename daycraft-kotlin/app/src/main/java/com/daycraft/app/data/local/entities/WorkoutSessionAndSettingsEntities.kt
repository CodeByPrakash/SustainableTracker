package com.daycraft.app.data.local.entities

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(
    tableName = "workout_sessions",
    indices = [Index("date")]
)
data class WorkoutSessionEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val planId: String? = null,
    val date: String, // YYYY-MM-DD
    val startTime: String? = null,
    val endTime: String? = null,
    val durationSeconds: Int = 0,
    val name: String,
    val notes: String? = null,
    val isCompleted: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "exercise_sets",
    foreignKeys = [
        ForeignKey(
            entity = WorkoutSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("sessionId")]
)
data class ExerciseSetEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val sessionId: String,
    val exerciseName: String,
    val setNumber: Int,
    val reps: Int? = 10,
    val weightKg: Double? = 20.0,
    val isCompleted: Boolean = false,
    val rpe: Double? = null,
    val notes: String? = null,
    val completedAt: Long? = null
)

@Entity(tableName = "body_measurements")
data class BodyMeasurementEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val date: String,
    val weightKg: Double = 55.0,
    val unit: String = "kg",
    val notes: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "settings")
data class SettingEntity(
    @PrimaryKey val key: String,
    val value: String
)
