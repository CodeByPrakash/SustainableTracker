package com.daycraft.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.daycraft.app.data.local.daos.AlarmDao
import com.daycraft.app.data.local.daos.HabitDao
import com.daycraft.app.data.local.daos.HealthDao
import com.daycraft.app.data.local.daos.ScheduleDao
import com.daycraft.app.data.local.daos.WorkoutDao
import com.daycraft.app.data.local.entities.AlarmEntity
import com.daycraft.app.data.local.entities.ExerciseEntity
import com.daycraft.app.data.local.entities.HabitEntity
import com.daycraft.app.data.local.entities.HabitLogEntity
import com.daycraft.app.data.local.entities.ScheduleBlockEntity
import com.daycraft.app.data.local.entities.SleepLogEntity
import com.daycraft.app.data.local.entities.WaterLogEntity
import com.daycraft.app.data.local.entities.WorkoutPlanEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        HabitEntity::class,
        HabitLogEntity::class,
        ScheduleBlockEntity::class,
        AlarmEntity::class,
        WaterLogEntity::class,
        SleepLogEntity::class,
        WorkoutPlanEntity::class,
        ExerciseEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class DaycraftDatabase : RoomDatabase() {

    abstract fun habitDao(): HabitDao
    abstract fun scheduleDao(): ScheduleDao
    abstract fun alarmDao(): AlarmDao
    abstract fun workoutDao(): WorkoutDao
    abstract fun healthDao(): HealthDao

    companion object {
        @Volatile
        private var INSTANCE: DaycraftDatabase? = null

        fun getDatabase(context: Context): DaycraftDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    DaycraftDatabase::class.java,
                    "daycraft_native.db"
                )
                    .addCallback(SeedCallback())
                    .build()
                INSTANCE = instance
                instance
            }
        }

        private class SeedCallback : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                CoroutineScope(Dispatchers.IO).launch {
                    INSTANCE?.let { database ->
                        // 1. Starter Alarm
                        database.alarmDao().insertAlarm(
                            AlarmEntity(
                                id = "default_alarm",
                                time = "05:45",
                                label = "Morning Wake Up",
                                days = "0,1,2,3,4,5,6",
                                isEnabled = true,
                                soundType = "preset",
                                soundName = "Daycraft Chime"
                            )
                        )

                        // 2. Starter Habits
                        val initialHabits = listOf(
                            HabitEntity(name = "Drink 500ml Water", groupName = "morning", sortOrder = 1),
                            HabitEntity(name = "Cold Shower & Skincare", groupName = "morning", sortOrder = 2),
                            HabitEntity(name = "Daily Gym Workout", groupName = "morning", sortOrder = 3),
                            HabitEntity(name = "Deep Focus Study Session", groupName = "afternoon", sortOrder = 4),
                            HabitEntity(name = "Read 10 Pages", groupName = "evening", sortOrder = 5)
                        )
                        database.habitDao().insertHabits(initialHabits)

                        // 3. Starter Schedule Blocks for Monday (dayOfWeek = 1)
                        for (d in 0..6) {
                            database.scheduleDao().insertScheduleBlocks(
                                listOf(
                                    ScheduleBlockEntity(title = "Morning Wakeup & Hydration", startTime = "05:45", endTime = "06:15", category = "routine", dayOfWeek = d),
                                    ScheduleBlockEntity(title = "Gym Workout Session", startTime = "06:30", endTime = "07:30", category = "gym", dayOfWeek = d),
                                    ScheduleBlockEntity(title = "Deep Study Block", startTime = "14:00", endTime = "16:00", category = "study", dayOfWeek = d),
                                    ScheduleBlockEntity(title = "Evening Wind Down", startTime = "22:00", endTime = "22:30", category = "routine", dayOfWeek = d)
                                )
                            )
                        }

                        // 4. Starter Workout Split
                        val plans = listOf(
                            WorkoutPlanEntity(id = "p1", dayOfWeek = 1, name = "Chest & Triceps", focus = "Hypertrophy Push"),
                            WorkoutPlanEntity(id = "p2", dayOfWeek = 2, name = "Back & Biceps", focus = "Pull & Lats"),
                            WorkoutPlanEntity(id = "p3", dayOfWeek = 3, name = "Legs & Core", focus = "Quads & Hamstrings"),
                            WorkoutPlanEntity(id = "p4", dayOfWeek = 4, name = "Shoulders & Arms", focus = "Delts & Traps"),
                            WorkoutPlanEntity(id = "p5", dayOfWeek = 5, name = "Full Body Circuit", focus = "Endurance & Core"),
                            WorkoutPlanEntity(id = "p6", dayOfWeek = 6, name = "Legs + Abs", focus = "Leg Volume"),
                            WorkoutPlanEntity(id = "p0", dayOfWeek = 0, name = "Rest / Recovery", focus = "Active Recovery")
                        )
                        database.workoutDao().insertPlans(plans)
                    }
                }
            }
        }
    }
}
