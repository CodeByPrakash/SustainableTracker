package com.daycraft.app.data.local.daos

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.daycraft.app.data.local.entities.ProjectEntity
import com.daycraft.app.data.local.entities.SkillEntity
import com.daycraft.app.data.local.entities.SkillSessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SkillDao {
    @Query("SELECT * FROM skills ORDER BY createdAt ASC")
    fun getAllSkills(): Flow<List<SkillEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSkills(skills: List<SkillEntity>)

    @Query("SELECT * FROM projects ORDER BY createdAt DESC")
    fun getAllProjects(): Flow<List<ProjectEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProject(project: ProjectEntity)

    @Query("UPDATE projects SET status = :status WHERE id = :id")
    suspend fun updateProjectStatus(id: String, status: String)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSkillSession(session: SkillSessionEntity)

    @Query("SELECT SUM(problemsSolved) FROM skill_sessions WHERE date = :date")
    fun getTotalProblemsSolvedForDate(date: String): Flow<Int?>
}
