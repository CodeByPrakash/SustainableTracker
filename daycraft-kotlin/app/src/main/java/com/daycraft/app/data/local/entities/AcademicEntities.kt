package com.daycraft.app.data.local.entities

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "academic_subjects")
data class AcademicSubjectEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val name: String,
    val code: String? = null,
    val color: String = "#2F855A", // Green default
    val targetHoursPerWeek: Double = 6.0,
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "academic_topics",
    foreignKeys = [
        ForeignKey(
            entity = AcademicSubjectEntity::class,
            parentColumns = ["id"],
            childColumns = ["subjectId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("subjectId")]
)
data class AcademicTopicEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val subjectId: String,
    val name: String,
    val unit: String? = "Unit 1",
    val status: String = "pending", // pending, completed
    val sortOrder: Int = 0,
    val completedAt: Long? = null
)

@Entity(
    tableName = "study_sessions",
    indices = [Index("date"), Index("subjectId")]
)
data class StudySessionEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val subjectId: String,
    val topicId: String? = null,
    val date: String, // YYYY-MM-DD
    val startTime: String? = null,
    val durationSeconds: Int = 0,
    val sessionType: String = "pomodoro",
    val notes: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "assignments",
    indices = [Index("dueDate"), Index("status")]
)
data class AssignmentEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val subjectId: String? = null,
    val title: String,
    val dueDate: String? = null, // YYYY-MM-DD
    val priority: String = "medium", // high, medium, low
    val status: String = "pending", // pending, completed
    val notes: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "exams",
    indices = [Index("examDate")]
)
data class ExamEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val subjectId: String? = null,
    val title: String,
    val examDate: String? = null, // YYYY-MM-DD
    val targetScore: Int? = 90,
    val checklistJson: String = "[]",
    val notes: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
