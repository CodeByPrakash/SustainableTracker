package com.daycraft.app.data.local.entities

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "habits")
data class HabitEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val name: String,
    val groupName: String = "morning", // morning, afternoon, evening
    val category: String = "routine",
    val frequency: String = "daily",
    val targetDays: String = "0,1,2,3,4,5,6",
    val isPaused: Boolean = false,
    val isArchived: Boolean = false,
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "habit_logs",
    foreignKeys = [
        ForeignKey(
            entity = HabitEntity::class,
            parentColumns = ["id"],
            childColumns = ["habitId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index("date"),
        Index("habitId")
    ]
)
data class HabitLogEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val habitId: String,
    val date: String, // YYYY-MM-DD
    val status: String = "pending", // pending, completed, skipped
    val notes: String? = null,
    val completedAt: Long? = null
)

@Entity(
    tableName = "schedule_blocks",
    indices = [Index("dayOfWeek")]
)
data class ScheduleBlockEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val title: String,
    val startTime: String, // HH:mm
    val endTime: String? = null,
    val category: String = "routine", // gym, study, skill, routine, flex
    val dayOfWeek: Int? = null, // 0=Sun..6=Sat
    val isRecurring: Boolean = true,
    val status: String = "pending", // pending, in_progress, completed, skipped
    val date: String? = null, // for date-specific blocks
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)
