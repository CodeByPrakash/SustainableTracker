package com.daycraft.app.data.local.daos

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.daycraft.app.data.local.entities.HabitEntity
import com.daycraft.app.data.local.entities.HabitLogEntity
import com.daycraft.app.data.local.entities.ScheduleBlockEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface HabitDao {
    @Query("SELECT * FROM habits WHERE isArchived = 0 ORDER BY sortOrder ASC")
    fun getAllActiveHabits(): Flow<List<HabitEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHabit(habit: HabitEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHabits(habits: List<HabitEntity>)

    @Query("SELECT * FROM habit_logs WHERE date = :date")
    fun getLogsForDate(date: String): Flow<List<HabitLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun logHabit(log: HabitLogEntity)

    @Query("DELETE FROM habit_logs WHERE habitId = :habitId AND date = :date")
    suspend fun deleteHabitLog(habitId: String, date: String)
}

@Dao
interface ScheduleDao {
    @Query("SELECT * FROM schedule_blocks WHERE (dayOfWeek = :dayOfWeek AND isRecurring = 1) OR date = :date ORDER BY startTime ASC")
    fun getScheduleForDay(dayOfWeek: Int, date: String): Flow<List<ScheduleBlockEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScheduleBlock(block: ScheduleBlockEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScheduleBlocks(blocks: List<ScheduleBlockEntity>)

    @Update
    suspend fun updateScheduleBlock(block: ScheduleBlockEntity)

    @Query("UPDATE schedule_blocks SET status = :status WHERE id = :id")
    suspend fun updateBlockStatus(id: String, status: String)

    @Query("DELETE FROM schedule_blocks WHERE id = :id")
    suspend fun deleteBlock(id: String)
}
