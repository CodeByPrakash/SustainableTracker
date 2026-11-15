package com.daycraft.app.data.local.daos

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.daycraft.app.data.local.entities.BodyMeasurementEntity
import com.daycraft.app.data.local.entities.ExerciseSetEntity
import com.daycraft.app.data.local.entities.SettingEntity
import com.daycraft.app.data.local.entities.WorkoutSessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface WorkoutSessionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: WorkoutSessionEntity)

    @Update
    suspend fun updateSession(session: WorkoutSessionEntity)

    @Query("SELECT * FROM workout_sessions ORDER BY date DESC LIMIT 10")
    fun getRecentSessions(): Flow<List<WorkoutSessionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSets(sets: List<ExerciseSetEntity>)

    @Query("SELECT * FROM exercise_sets WHERE sessionId = :sessionId ORDER BY setNumber ASC")
    fun getSetsForSession(sessionId: String): Flow<List<ExerciseSetEntity>>

    @Update
    suspend fun updateSet(set: ExerciseSetEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun logBodyWeight(measurement: BodyMeasurementEntity)

    @Query("SELECT * FROM body_measurements ORDER BY date DESC LIMIT 1")
    fun getLatestWeight(): Flow<BodyMeasurementEntity?>
}

@Dao
interface SettingsDao {
    @Query("SELECT value FROM settings WHERE `key` = :key LIMIT 1")
    suspend fun getSetting(key: String): String?

    @Query("SELECT * FROM settings")
    fun getAllSettings(): Flow<List<SettingEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun setSetting(setting: SettingEntity)
}
