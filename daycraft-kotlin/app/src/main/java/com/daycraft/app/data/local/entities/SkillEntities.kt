package com.daycraft.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "skills")
data class SkillEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val name: String,
    val category: String = "coding", // coding, design, language
    val currentLevel: String = "Intermediate",
    val targetLevel: String = "Advanced",
    val targetHoursPerWeek: Double = 10.0,
    val roadmapJson: String = "[]",
    val notes: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "skill_sessions")
data class SkillSessionEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val skillId: String,
    val date: String, // YYYY-MM-DD
    val durationSeconds: Int = 0,
    val problemsSolved: Int = 0,
    val notes: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "projects")
data class ProjectEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val skillId: String? = null,
    val name: String,
    val description: String? = null,
    val status: String = "planned", // planned, in_progress, completed
    val githubUrl: String? = null,
    val milestonesJson: String = "[]",
    val createdAt: Long = System.currentTimeMillis()
)
