package com.daycraft.app.data.local.daos

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.daycraft.app.data.local.entities.AlarmEntity
import com.daycraft.app.data.local.entities.ExerciseEntity
import com.daycraft.app.data.local.entities.SleepLogEntity
import com.daycraft.app.data.local.entities.WaterLogEntity
import com.daycraft.app.data.local.entities.WorkoutPlanEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AlarmDao {
    @Query("SELECT * FROM alarms ORDER BY time ASC")
    fun getAllAlarms(): Flow<List<AlarmEntity>>

    @Query("SELECT * FROM alarms WHERE isEnabled = 1 ORDER BY time ASC")
    suspend fun getActiveAlarmsSync(): List<AlarmEntity>

    @Query("SELECT * FROM alarms WHERE id = :id")
    suspend fun getAlarmById(id: String): AlarmEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAlarm(alarm: AlarmEntity)

    @Update
    suspend fun updateAlarm(alarm: AlarmEntity)

    @Query("UPDATE alarms SET isEnabled = :isEnabled WHERE id = :id")
    suspend fun toggleAlarm(id: String, isEnabled: Boolean)

    @Query("DELETE FROM alarms WHERE id = :id")
    suspend fun deleteAlarm(id: String)
}

@Dao
interface WorkoutDao {
    @Query("SELECT * FROM workout_plans WHERE dayOfWeek = :dayOfWeek LIMIT 1")
    fun getPlanForDay(dayOfWeek: Int): Flow<WorkoutPlanEntity?>

    @Query("SELECT * FROM exercises WHERE planId = :planId ORDER BY sortOrder ASC")
    fun getExercisesForPlan(planId: String): Flow<List<ExerciseEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPlans(plans: List<WorkoutPlanEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExercises(exercises: List<ExerciseEntity>)
}

@Dao
interface HealthDao {
    @Query("SELECT SUM(amountMl) FROM water_logs WHERE date = :date")
    fun getWaterTotalForDate(date: String): Flow<Int?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun logWater(log: WaterLogEntity)

    @Query("SELECT * FROM sleep_logs WHERE date = :date LIMIT 1")
    fun getSleepLogForDate(date: String): Flow<SleepLogEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun logSleep(sleep: SleepLogEntity)
}
