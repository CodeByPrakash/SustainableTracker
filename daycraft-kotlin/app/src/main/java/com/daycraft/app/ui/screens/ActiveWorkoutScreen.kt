package com.daycraft.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.daycraft.app.data.local.entities.ExerciseEntity
import com.daycraft.app.data.local.entities.WorkoutPlanEntity
import com.daycraft.app.ui.theme.*
import kotlinx.coroutines.delay

data class ActiveWorkoutSet(
    val setNumber: Int,
    var weight: Double,
    var reps: Int,
    var isCompleted: Boolean = false
)

data class ActiveWorkoutExercise(
    val name: String,
    val sets: MutableList<ActiveWorkoutSet>
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveWorkoutScreen(
    plan: WorkoutPlanEntity?,
    exercises: List<ExerciseEntity>,
    onFinishWorkout: (durationSeconds: Int, totalVolumeKg: Double) -> Unit,
    onClose: () -> Unit
) {
    // Session state: "ready", "active", "paused"
    var workoutState by remember { mutableStateOf("ready") }
    var elapsedSeconds by remember { mutableIntStateOf(0) }

    // Rest timer state
    var restTimerSeconds by remember { mutableIntStateOf(0) }
    var isRestActive by remember { mutableStateOf(false) }

    // Exercises state
    val activeExercises = remember(exercises) {
        val list = mutableStateListOf<ActiveWorkoutExercise>()
        if (exercises.isNotEmpty()) {
            exercises.forEach { ex ->
                val sets = (1..ex.targetSets).map { setNum ->
                    ActiveWorkoutSet(
                        setNumber = setNum,
                        weight = ex.defaultWeightKg,
                        reps = ex.targetReps.split("-").firstOrNull()?.toIntOrNull() ?: 10
                    )
                }.toMutableList()
                list.add(ActiveWorkoutExercise(ex.name, sets))
            }
        } else {
            // Default chest & triceps
            val defaultExs = listOf("Incline Dumbbell Press", "Barbell Flat Bench", "Cable Flyes", "Triceps Pushdowns")
            defaultExs.forEach { name ->
                val sets = (1..3).map { setNum ->
                    ActiveWorkoutSet(setNumber = setNum, weight = 20.0, reps = 10)
                }.toMutableList()
                list.add(ActiveWorkoutExercise(name, sets))
            }
        }
        list
    }

    // Workout Stopwatch
    LaunchedEffect(workoutState) {
        while (workoutState == "active") {
            delay(1000)
            elapsedSeconds++
        }
    }

    // Rest Timer countdown
    LaunchedEffect(isRestActive, restTimerSeconds) {
        if (isRestActive && restTimerSeconds > 0) {
            delay(1000)
            restTimerSeconds--
            if (restTimerSeconds == 0) {
                isRestActive = false
            }
        }
    }

    // Live Metrics
    val completedSetsCount = activeExercises.sumOf { ex -> ex.sets.count { it.isCompleted } }
    val totalVolumeKg = activeExercises.sumOf { ex ->
        ex.sets.filter { it.isCompleted }.sumOf { it.weight * it.reps }
    }

    val elapsedMins = elapsedSeconds / 60
    val elapsedSecs = elapsedSeconds % 60
    val elapsedFormatted = String.format("%02d:%02d", elapsedMins, elapsedSecs)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(plan?.name ?: "Workout Session", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = DaycraftInk)
                        Text(
                            text = if (workoutState == "active") "Active • $elapsedFormatted" else "Ready to start",
                            fontSize = 12.sp,
                            color = if (workoutState == "active") DaycraftOrange else DaycraftInkMuted
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = DaycraftInk)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DaycraftSurface)
            )
        },
        containerColor = DaycraftCanvas
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 40.dp)
        ) {
            // 1. Live Session Controller HUD
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = DaycraftSurface),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, DaycraftOrange)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = if (workoutState == "ready") "00:00" else elapsedFormatted,
                                    fontSize = 36.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = DaycraftInk,
                                    letterSpacing = (-1).sp
                                )
                                Text(
                                    text = when (workoutState) {
                                        "active" -> "WORKOUT IN PROGRESS"
                                        "paused" -> "SESSION PAUSED"
                                        else -> "READY TO TRAIN"
                                    },
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (workoutState == "active") DaycraftOrange else DaycraftInkMuted,
                                    letterSpacing = 1.sp
                                )
                            }

                            if (workoutState == "ready") {
                                Button(
                                    onClick = { workoutState = "active" },
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = DaycraftOrange),
                                    modifier = Modifier.height(48.dp)
                                ) {
                                    Icon(imageVector = Icons.Default.PlayArrow, contentDescription = null, tint = Color.White)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("START", fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            } else {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    IconButton(
                                        onClick = {
                                            workoutState = if (workoutState == "active") "paused" else "active"
                                        },
                                        modifier = Modifier
                                            .size(44.dp)
                                            .clip(CircleShape)
                                            .background(DaycraftSurfaceMuted)
                                    ) {
                                        Icon(
                                            imageVector = if (workoutState == "active") Icons.Default.Pause else Icons.Default.PlayArrow,
                                            contentDescription = "Toggle",
                                            tint = DaycraftInk
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))
                        HorizontalDivider(color = DaycraftLine)
                        Spacer(modifier = Modifier.height(12.dp))

                        // Live Stats Metrics
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("$completedSetsCount", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = DaycraftInk)
                                Text("SETS DONE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = DaycraftInkMuted)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("${totalVolumeKg.toInt()} kg", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = DaycraftOrangeDark)
                                Text("VOLUME LIFTED", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = DaycraftInkMuted)
                            }
                        }
                    }
                }
            }

            // 2. Rest Timer Countdown HUD (if active)
            if (isRestActive) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = DaycraftInk)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("REST TIMER", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = DaycraftOrangeSoft)
                                Text(
                                    text = "${restTimerSeconds}s",
                                    fontSize = 32.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White
                                )
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { restTimerSeconds += 30 },
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Text("+30s", fontWeight = FontWeight.Bold)
                                }
                                Button(
                                    onClick = {
                                        isRestActive = false
                                        restTimerSeconds = 0
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = DaycraftOrange),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Text("Skip", fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                }
            }

            // 3. Rest Presets Bar
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Rest Presets:", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = DaycraftInkMuted)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(45, 60, 90, 120).forEach { seconds ->
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = DaycraftSurface,
                                border = androidx.compose.foundation.BorderStroke(1.dp, DaycraftLine),
                                modifier = Modifier.clickable {
                                    restTimerSeconds = seconds
                                    isRestActive = true
                                }
                            ) {
                                Text(
                                    text = if (seconds < 60) "${seconds}s" else "${seconds / 60}m",
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = DaycraftOrangeDark
                                )
                            }
                        }
                    }
                }
            }

            // 4. Exercise & Sets Logger
            itemsIndexed(activeExercises) { exIndex, exercise ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = DaycraftSurface),
                    border = androidx.compose.foundation.BorderStroke(1.dp, DaycraftLine)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "${exIndex + 1}. ${exercise.name}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = DaycraftInk
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        exercise.sets.forEach { setItem ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("SET ${setItem.setNumber}", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = DaycraftInkMuted)

                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text("${setItem.weight} kg", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                    Text("×", color = DaycraftInkMuted)
                                    Text("${setItem.reps} reps", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                }

                                IconButton(
                                    onClick = {
                                        setItem.isCompleted = !setItem.isCompleted
                                        if (setItem.isCompleted) {
                                            restTimerSeconds = 90
                                            isRestActive = true
                                        }
                                    },
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(if (setItem.isCompleted) DaycraftGreen else DaycraftSurfaceMuted)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = "Complete Set",
                                        tint = if (setItem.isCompleted) Color.White else DaycraftInkMuted,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 5. Finish Workout Button
            item {
                Spacer(modifier = Modifier.height(10.dp))
                Button(
                    onClick = {
                        onFinishWorkout(elapsedSeconds, totalVolumeKg)
                        onClose()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DaycraftOrange)
                ) {
                    Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("FINISH WORKOUT", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                }
            }
        }
    }
}
