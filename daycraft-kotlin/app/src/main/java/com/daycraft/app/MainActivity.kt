package com.daycraft.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.lifecycleScope
import com.daycraft.app.data.local.entities.AlarmEntity
import com.daycraft.app.data.local.entities.HabitEntity
import com.daycraft.app.data.local.entities.HabitLogEntity
import com.daycraft.app.data.local.entities.ScheduleBlockEntity
import com.daycraft.app.ui.screens.AlarmScreen
import com.daycraft.app.ui.screens.GymScreen
import com.daycraft.app.ui.screens.HomeScreen
import com.daycraft.app.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

enum class Screen(val title: String, val icon: ImageVector) {
    HOME("Home", Icons.Default.Home),
    GYM("Gym", Icons.Default.FitnessCenter),
    ALARM("Alarms", Icons.Default.Alarm)
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = application as DaycraftApp
        val db = app.database

        setContent {
            DaycraftTheme {
                val calendar = remember { Calendar.getInstance() }
                // Calendar.SUNDAY=1..Calendar.SATURDAY=7 -> 0=Sun..6=Sat
                val dayOfWeek = remember { calendar.get(Calendar.DAY_OF_WEEK) - 1 }
                val todayStr = remember {
                    SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                }

                var currentScreen by remember { mutableStateOf(Screen.HOME) }

                val habits by db.habitDao().getAllActiveHabits().collectAsState(initial = emptyList())
                val schedule by db.scheduleDao().getScheduleForDay(dayOfWeek, todayStr).collectAsState(initial = emptyList())
                val alarms by db.alarmDao().getAllAlarms().collectAsState(initial = emptyList())
                val workoutPlan by db.workoutDao().getPlanForDay(dayOfWeek).collectAsState(initial = null)
                val exercises by remember(workoutPlan?.id) {
                    if (workoutPlan != null) {
                        db.workoutDao().getExercisesForPlan(workoutPlan!!.id)
                    } else {
                        kotlinx.coroutines.flow.flowOf(emptyList())
                    }
                }.collectAsState(initial = emptyList())

                Scaffold(
                    bottomBar = {
                        NavigationBar(
                            containerColor = DaycraftSurface,
                            contentColor = DaycraftInk
                        ) {
                            Screen.values().forEach { screen ->
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
                    },
                    containerColor = DaycraftCanvas
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
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
                                onNavigateToAcademics = { /* Academics */ }
                            )

                            Screen.GYM -> GymScreen(
                                plan = workoutPlan,
                                exercises = exercises,
                                onBack = { currentScreen = Screen.HOME }
                            )

                            Screen.ALARM -> AlarmScreen(
                                alarms = alarms,
                                onSaveAlarm = { alarm ->
                                    lifecycleScope.launch {
                                        db.alarmDao().insertAlarm(alarm)
                                    }
                                },
                                onDeleteAlarm = { alarmId ->
                                    lifecycleScope.launch {
                                        db.alarmDao().deleteAlarm(alarmId)
                                    }
                                },
                                onToggleAlarm = { alarmId, isEnabled ->
                                    lifecycleScope.launch {
                                        db.alarmDao().toggleAlarm(alarmId, isEnabled)
                                    }
                                },
                                onBack = { currentScreen = Screen.HOME }
                            )
                        }
                    }
                }
            }
        }
    }
}
