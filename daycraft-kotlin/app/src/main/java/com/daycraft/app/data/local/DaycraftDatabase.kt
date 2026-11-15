package com.daycraft.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.daycraft.app.data.local.daos.*
import com.daycraft.app.data.local.entities.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID

@Database(
    entities = [
        HabitEntity::class,
        HabitLogEntity::class,
        ScheduleBlockEntity::class,
        AlarmEntity::class,
        WaterLogEntity::class,
        SleepLogEntity::class,
        WorkoutPlanEntity::class,
        ExerciseEntity::class,
        WorkoutSessionEntity::class,
        ExerciseSetEntity::class,
        BodyMeasurementEntity::class,
        AcademicSubjectEntity::class,
        AcademicTopicEntity::class,
        AssignmentEntity::class,
        ExamEntity::class,
        StudySessionEntity::class,
        SkillEntity::class,
        SkillSessionEntity::class,
        ProjectEntity::class,
        SettingEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class DaycraftDatabase : RoomDatabase() {

    abstract fun habitDao(): HabitDao
    abstract fun scheduleDao(): ScheduleDao
    abstract fun alarmDao(): AlarmDao
    abstract fun workoutDao(): WorkoutDao
    abstract fun workoutSessionDao(): WorkoutSessionDao
    abstract fun healthDao(): HealthDao
    abstract fun academicDao(): AcademicDao
    abstract fun skillDao(): SkillDao
    abstract fun settingsDao(): SettingsDao

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

                        // 3. Starter Schedule Blocks for Monday through Sunday
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

                        // 4. Starter Workout Split & Exercises
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

                        val p1Exercises = listOf(
                            ExerciseEntity(planId = "p1", name = "Incline Dumbbell Press", targetSets = 3, targetReps = "8-10", defaultWeightKg = 20.0, sortOrder = 1),
                            ExerciseEntity(planId = "p1", name = "Barbell Flat Bench", targetSets = 3, targetReps = "8-10", defaultWeightKg = 40.0, sortOrder = 2),
                            ExerciseEntity(planId = "p1", name = "Cable Chest Flyes", targetSets = 3, targetReps = "12-15", defaultWeightKg = 15.0, sortOrder = 3),
                            ExerciseEntity(planId = "p1", name = "Rope Triceps Pushdowns", targetSets = 3, targetReps = "12-15", defaultWeightKg = 17.5, sortOrder = 4)
                        )
                        database.workoutDao().insertExercises(p1Exercises)

                        // 5. Academic Subjects & Topics
                        val s1Id = UUID.randomUUID().toString()
                        val s2Id = UUID.randomUUID().toString()
                        val s3Id = UUID.randomUUID().toString()

                        database.academicDao().insertSubjects(
                            listOf(
                                AcademicSubjectEntity(id = s1Id, name = "Theory of Computation", code = "CS501", color = "#2F855A", sortOrder = 1),
                                AcademicSubjectEntity(id = s2Id, name = "Operating Systems", code = "CS502", color = "#3B82F6", sortOrder = 2),
                                AcademicSubjectEntity(id = s3Id, name = "Database Management", code = "CS503", color = "#E87935", sortOrder = 3)
                            )
                        )

                        database.academicDao().insertTopics(
                            listOf(
                                AcademicTopicEntity(subjectId = s1Id, name = "Deterministic Finite Automata (DFA)", unit = "Unit 1", status = "completed"),
                                AcademicTopicEntity(subjectId = s1Id, name = "Nondeterministic Finite Automata (NFA)", unit = "Unit 1", status = "pending"),
                                AcademicTopicEntity(subjectId = s1Id, name = "Regular Expressions & Pumping Lemma", unit = "Unit 2", status = "pending"),
                                AcademicTopicEntity(subjectId = s2Id, name = "Process Synchronization & Semaphores", unit = "Unit 2", status = "completed"),
                                AcademicTopicEntity(subjectId = s2Id, name = "Virtual Memory & Paging Algorithms", unit = "Unit 3", status = "pending")
                            )
                        )

                        // 6. Assignments & Exams
                        database.academicDao().insertAssignment(
                            AssignmentEntity(
                                title = "TOC Pushdown Automata Lab Assignment",
                                dueDate = "2026-11-20",
                                priority = "high",
                                status = "pending"
                            )
                        )

                        database.academicDao().insertExam(
                            ExamEntity(
                                title = "Operating Systems Mid-Semester Exam",
                                examDate = "2026-11-28",
                                targetScore = 95
                            )
                        )

                        // 7. Skills & Projects
                        val sk1Id = UUID.randomUUID().toString()
                        database.skillDao().insertSkills(
                            listOf(
                                SkillEntity(id = sk1Id, name = "Data Structures & Algorithms", category = "coding", currentLevel = "120 Solved", targetLevel = "300 Solved"),
                                SkillEntity(name = "Full-Stack Web Development", category = "coding", currentLevel = "Intermediate", targetLevel = "Production Ready")
                            )
                        )

                        database.skillDao().insertProject(
                            ProjectEntity(
                                skillId = sk1Id,
                                name = "Daycraft Native Kotlin App",
                                description = "Ultra-fast offline-first lifestyle OS built with Jetpack Compose & Room",
                                status = "in_progress",
                                githubUrl = "https://github.com/CodeByPrakash/SustainableTracker"
                            )
                        )

                        // 8. Starter Settings
                        database.settingsDao().setSetting(SettingEntity("target_wake_time", "05:45"))
                        database.settingsDao().setSetting(SettingEntity("target_sleep_time", "22:30"))
                        database.settingsDao().setSetting(SettingEntity("target_water_ml", "3000"))
                        database.settingsDao().setSetting(SettingEntity("target_study_minutes", "75"))
                        database.settingsDao().setSetting(SettingEntity("target_gym_minutes", "60"))
                    }
                }
            }
        }
    }
}
