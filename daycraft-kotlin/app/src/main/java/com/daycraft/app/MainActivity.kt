package com.daycraft.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.lifecycleScope
import com.daycraft.app.alarm.AlarmScheduler
import com.daycraft.app.data.local.entities.*
import com.daycraft.app.ui.screens.*
import com.daycraft.app.ui.theme.*
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.UUID

enum class Screen(val title: String, val icon: ImageVector, val isBottomBar: Boolean = true) {
    HOME("Home", Icons.Default.Home, true),
    GYM("Gym", Icons.Default.FitnessCenter, true),
    ACADEMICS("Academics", Icons.Default.School, true),
    SKILLS("Skills", Icons.Default.Code, true),
    STATS("Stats", Icons.Default.BarChart, true),

    // Sub-screens & Active HUDs
    ALARM("Alarms", Icons.Default.Alarm, false),
    HABITS("Habits", Icons.Default.CheckCircle, false),
    SETTINGS("Settings", Icons.Default.Settings, false),
    WORKOUT_ACTIVE("Workout Session", Icons.Default.PlayArrow, false),
    STUDY_ACTIVE("Focus Timer", Icons.Default.Timer, false)
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = application as DaycraftApp
        val db = app.database

        setContent {
            DaycraftTheme {
                val context = LocalContext.current
                val calendar = remember { Calendar.getInstance() }
                // Calendar.SUNDAY=1..Calendar.SATURDAY=7 -> 0=Sun..6=Sat
                val dayOfWeek = remember { calendar.get(Calendar.DAY_OF_WEEK) - 1 }
                val todayStr = remember {
                    SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                }

                var currentScreen by remember { mutableStateOf(Screen.HOME) }
                var activeStudySubjectId by remember { mutableStateOf<String?>(null) }

                // Reactive data streams from Room Database
                val habits by db.habitDao().getAllActiveHabits().collectAsState(initial = emptyList())
                val habitLogs by remember(todayStr) {
                    db.habitDao().getLogsForDate(todayStr)
                }.collectAsState(initial = emptyList())

                val schedule by db.scheduleDao().getScheduleForDay(dayOfWeek, todayStr).collectAsState(initial = emptyList())
                val alarms by db.alarmDao().getAllAlarms().collectAsState(initial = emptyList())

                val workoutPlan by db.workoutDao().getPlanForDay(dayOfWeek).collectAsState(initial = null)
                val exercises by remember(workoutPlan?.id) {
                    if (workoutPlan != null) {
                        db.workoutDao().getExercisesForPlan(workoutPlan!!.id)
                    } else {
                        flowOf(emptyList())
                    }
                }.collectAsState(initial = emptyList())

                val subjects by db.academicDao().getAllSubjects().collectAsState(initial = emptyList())
                val topics by db.academicDao().getAllTopics().collectAsState(initial = emptyList())
                val assignments by db.academicDao().getAllAssignments().collectAsState(initial = emptyList())
                val exams by db.academicDao().getAllExams().collectAsState(initial = emptyList())

                val skills by db.skillDao().getAllSkills().collectAsState(initial = emptyList())
                val projects by db.skillDao().getAllProjects().collectAsState(initial = emptyList())

                Scaffold(
                    bottomBar = {
                        if (currentScreen.isBottomBar) {
                            NavigationBar(
                                containerColor = DaycraftSurface,
                                contentColor = DaycraftInk
                            ) {
                                Screen.values().filter { it.isBottomBar }.forEach { screen ->
                                    val selected = currentScreen == screen
                                    NavigationBarItem(
                                        selected = selected,
                                        onClick = { currentScreen = screen },
                                        icon = {
                                            Icon(
                                                imageVector = screen.icon,
                                                contentDescription = screen.title
                                            )
                                        },
                                        label = { Text(screen.title) },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = DaycraftOrangeDark,
                                            selectedTextColor = DaycraftOrangeDark,
                                            indicatorColor = DaycraftOrangeSoft,
                                            unselectedIconColor = DaycraftInkMuted,
                                            unselectedTextColor = DaycraftInkMuted
                                        )
                                    )
                                }
                            }
                        }
                    },
                    containerColor = DaycraftCanvas
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(if (currentScreen.isBottomBar) innerPadding else androidx.compose.foundation.layout.PaddingValues())
                    ) {
                        when (currentScreen) {
                            Screen.HOME -> HomeScreen(
                                habits = habits,
                                schedule = schedule,
                                onToggleHabit = { habitId ->
                                    lifecycleScope.launch {
                                        db.habitDao().logHabit(
                                            HabitLogEntity(
                                                habitId = habitId,
                                                date = todayStr,
                                                status = "completed",
                                                completedAt = System.currentTimeMillis()
                                            )
                                        )
                                    }
                                },
                                onToggleSchedule = { blockId, status ->
                                    lifecycleScope.launch {
                                        db.scheduleDao().updateBlockStatus(blockId, status)
                                    }
                                },
                                onNavigateToAlarm = { currentScreen = Screen.ALARM },
                                onNavigateToGym = { currentScreen = Screen.GYM },
                                onNavigateToAcademics = { currentScreen = Screen.ACADEMICS },
                                onNavigateToHabits = { currentScreen = Screen.HABITS },
                                onNavigateToSkills = { currentScreen = Screen.SKILLS },
                                onNavigateToSettings = { currentScreen = Screen.SETTINGS },
                                onNavigateToWorkout = { currentScreen = Screen.WORKOUT_ACTIVE },
                                onNavigateToStudy = { currentScreen = Screen.STUDY_ACTIVE }
                            )

                            Screen.GYM -> GymScreen(
                                plan = workoutPlan,
                                exercises = exercises,
                                onStartWorkout = { currentScreen = Screen.WORKOUT_ACTIVE },
                                onBack = { currentScreen = Screen.HOME }
                            )

                            Screen.WORKOUT_ACTIVE -> ActiveWorkoutScreen(
                                plan = workoutPlan,
                                exercises = exercises,
                                onFinishWorkout = { durationSeconds, totalVolumeKg ->
                                    lifecycleScope.launch {
                                        val session = WorkoutSessionEntity(
                                            id = UUID.randomUUID().toString(),
                                            planId = workoutPlan?.id,
                                            date = todayStr,
                                            durationSeconds = durationSeconds,
                                            name = workoutPlan?.name ?: "Workout Session",
                                            notes = "Logged volume: ${"%.1f".format(totalVolumeKg)} kg",
                                            isCompleted = true
                                        )
                                        db.workoutSessionDao().insertSession(session)
                                        currentScreen = Screen.GYM
                                    }
                                },
                                onClose = { currentScreen = Screen.GYM }
                            )

                            Screen.ACADEMICS -> AcademicsScreen(
                                subjects = subjects,
                                topics = topics,
                                assignments = assignments,
                                exams = exams,
                                onToggleTopic = { topicId, currentStatus ->
                                    lifecycleScope.launch {
                                        val newStatus = if (currentStatus == "completed") "pending" else "completed"
                                        val completedAt = if (newStatus == "completed") System.currentTimeMillis() else null
                                        db.academicDao().updateTopicStatus(topicId, newStatus, completedAt)
                                    }
                                },
                                onStartStudySession = { subjectId ->
                                    activeStudySubjectId = subjectId
                                    currentScreen = Screen.STUDY_ACTIVE
                                },
                                onBack = { currentScreen = Screen.HOME }
                            )

                            Screen.STUDY_ACTIVE -> StudyActiveScreen(
                                subjects = subjects,
                                initialSubjectId = activeStudySubjectId,
                                onFinishSession = { subjectId, durationSeconds, notes ->
                                    lifecycleScope.launch {
                                        val session = StudySessionEntity(
                                            id = UUID.randomUUID().toString(),
                                            subjectId = subjectId,
                                            date = todayStr,
                                            durationSeconds = durationSeconds,
                                            sessionType = "pomodoro",
                                            notes = notes
                                        )
                                        db.academicDao().insertStudySession(session)
                                        currentScreen = Screen.ACADEMICS
                                    }
                                },
                                onClose = { currentScreen = Screen.ACADEMICS }
                            )

                            Screen.SKILLS -> SkillsScreen(
                                skills = skills,
                                projects = projects,
                                onAddProblemSolved = { skillId ->
                                    lifecycleScope.launch {
                                        val session = SkillSessionEntity(
                                            id = UUID.randomUUID().toString(),
                                            skillId = skillId,
                                            date = todayStr,
                                            problemsSolved = 1,
                                            durationSeconds = 1200
                                        )
                                        db.skillDao().insertSkillSession(session)
                                    }
                                },
                                onAddProject = { project ->
                                    lifecycleScope.launch {
                                        db.skillDao().insertProject(project)
                                    }
                                },
                                onBack = { currentScreen = Screen.HOME }
                            )

                            Screen.HABITS -> HabitsScreen(
                                habits = habits,
                                logs = habitLogs,
                                onToggleHabit = { habitId ->
                                    lifecycleScope.launch {
                                        db.habitDao().logHabit(
                                            HabitLogEntity(
                                                habitId = habitId,
                                                date = todayStr,
                                                status = "completed",
                                                completedAt = System.currentTimeMillis()
                                            )
                                        )
                                    }
                                },
                                onAddHabit = { newHabit ->
                                    lifecycleScope.launch {
                                        db.habitDao().insertHabits(listOf(newHabit))
                                    }
                                },
                                onBack = { currentScreen = Screen.HOME }
                            )

                            Screen.ALARM -> AlarmScreen(
                                alarms = alarms,
                                onSaveAlarm = { alarm ->
                                    lifecycleScope.launch {
                                        db.alarmDao().insertAlarm(alarm)
                                        AlarmScheduler.scheduleAlarm(context, alarm)
                                    }
                                },
                                onDeleteAlarm = { alarmId ->
                                    lifecycleScope.launch {
                                        db.alarmDao().deleteAlarm(alarmId)
                                        AlarmScheduler.cancelAlarm(context, alarmId)
                                    }
                                },
                                onToggleAlarm = { alarmId, isEnabled ->
                                    lifecycleScope.launch {
                                        db.alarmDao().toggleAlarm(alarmId, isEnabled)
                                        val target = alarms.find { it.id == alarmId }
                                        if (target != null) {
                                            val updated = target.copy(isEnabled = isEnabled)
                                            if (isEnabled) {
                                                AlarmScheduler.scheduleAlarm(context, updated)
                                            } else {
                                                AlarmScheduler.cancelAlarm(context, alarmId)
                                            }
                                        }
                                    }
                                },
                                onBack = { currentScreen = Screen.HOME }
                            )

                            Screen.STATS -> StatsScreen(
                                habitRate = if (habits.isNotEmpty()) ((habitLogs.size.toFloat() / habits.size) * 100).toInt().coerceAtMost(100) else 85,
                                gymConsistency = 92,
                                academicHours = 14.5,
                                waterMl = 2500,
                                onNavigateToSettings = { currentScreen = Screen.SETTINGS },
                                onBack = { currentScreen = Screen.HOME }
                            )

                            Screen.SETTINGS -> SettingsScreen(
                                onSaveTargets = { wake, sleep, water, study, gym, weight ->
                                    lifecycleScope.launch {
                                        db.settingsDao().setSetting(SettingEntity("target_wake_time", wake))
                                        db.settingsDao().setSetting(SettingEntity("target_sleep_time", sleep))
                                        db.settingsDao().setSetting(SettingEntity("target_water_ml", water))
                                        db.settingsDao().setSetting(SettingEntity("target_study_minutes", study))
                                        db.settingsDao().setSetting(SettingEntity("target_gym_minutes", gym))
                                        db.settingsDao().setSetting(SettingEntity("target_body_weight", weight))
                                    }
                                },
                                onNavigateToAlarm = { currentScreen = Screen.ALARM },
                                onBack = { currentScreen = Screen.HOME }
                            )
                        }
                    }
                }
            }
        }
    }
}
