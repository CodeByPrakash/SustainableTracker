package com.daycraft.app.data.local.daos

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.daycraft.app.data.local.entities.AcademicSubjectEntity
import com.daycraft.app.data.local.entities.AcademicTopicEntity
import com.daycraft.app.data.local.entities.AssignmentEntity
import com.daycraft.app.data.local.entities.ExamEntity
import com.daycraft.app.data.local.entities.StudySessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AcademicDao {
    @Query("SELECT * FROM academic_subjects ORDER BY sortOrder ASC")
    fun getAllSubjects(): Flow<List<AcademicSubjectEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSubjects(subjects: List<AcademicSubjectEntity>)

    @Query("SELECT * FROM academic_topics ORDER BY sortOrder ASC")
    fun getAllTopics(): Flow<List<AcademicTopicEntity>>

    @Query("SELECT * FROM academic_topics WHERE subjectId = :subjectId ORDER BY sortOrder ASC")
    fun getTopicsForSubject(subjectId: String): Flow<List<AcademicTopicEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTopics(topics: List<AcademicTopicEntity>)

    @Query("UPDATE academic_topics SET status = :status, completedAt = :completedAt WHERE id = :id")
    suspend fun updateTopicStatus(id: String, status: String, completedAt: Long?)

    @Query("SELECT * FROM assignments ORDER BY dueDate ASC")
    fun getAllAssignments(): Flow<List<AssignmentEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAssignment(assignment: AssignmentEntity)

    @Query("UPDATE assignments SET status = :status WHERE id = :id")
    suspend fun updateAssignmentStatus(id: String, status: String)

    @Query("SELECT * FROM exams ORDER BY examDate ASC")
    fun getAllExams(): Flow<List<ExamEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExam(exam: ExamEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStudySession(session: StudySessionEntity)

    @Query("SELECT SUM(durationSeconds) FROM study_sessions WHERE date = :date")
    fun getTotalStudySecondsForDate(date: String): Flow<Int?>
}
