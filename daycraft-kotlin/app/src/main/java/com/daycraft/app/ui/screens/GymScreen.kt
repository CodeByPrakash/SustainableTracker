package com.daycraft.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.PlayArrow
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GymScreen(
    plan: WorkoutPlanEntity?,
    exercises: List<ExerciseEntity>,
    onStartWorkout: () -> Unit = {},
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Gym & Training", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = DaycraftInk)
                        Text(plan?.name ?: "Today's Workout Session", fontSize = 12.sp, color = DaycraftInkMuted)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back", tint = DaycraftInk)
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
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 40.dp)
        ) {
            // Hero Start Workout Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = DaycraftSurface),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, DaycraftOrange)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = plan?.name ?: "Push Split",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = DaycraftInk
                                )
                                Text(
                                    text = plan?.focus ?: "Chest, Shoulders & Triceps",
                                    fontSize = 13.sp,
                                    color = DaycraftOrangeDark,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(DaycraftOrangeSoft),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.FitnessCenter,
                                    contentDescription = null,
                                    tint = DaycraftOrange,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(18.dp))

                        Button(
                            onClick = onStartWorkout,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DaycraftOrange)
                        ) {
                            Icon(imageVector = Icons.Default.PlayArrow, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("START WORKOUT SESSION", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            item {
                Text(
                    text = "Planned Exercises (${exercises.size})",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = DaycraftInk
                )
            }

            if (exercises.isEmpty()) {
                item {
                    val defaultExercises = listOf(
                        "Barbell Incline Bench Press (3 sets • 8-10 reps)",
                        "Flat Dumbbell Press (3 sets • 10-12 reps)",
                        "Standing Overhead Press (3 sets • 8-10 reps)",
                        "Cable Lateral Raises (3 sets • 12-15 reps)",
                        "Rope Triceps Pushdowns (3 sets • 12-15 reps)"
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        defaultExercises.forEachIndexed { idx, name ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = DaycraftSurface),
                                border = androidx.compose.foundation.BorderStroke(1.dp, DaycraftLine)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(CircleShape)
                                            .background(DaycraftOrangeSoft),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("${idx + 1}", fontWeight = FontWeight.Bold, color = DaycraftOrangeDark, fontSize = 13.sp)
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = DaycraftInk)
                                }
                            }
                        }
                    }
                }
            } else {
                items(exercises, key = { it.id }) { exercise ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = DaycraftSurface),
                        border = androidx.compose.foundation.BorderStroke(1.dp, DaycraftLine)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(exercise.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = DaycraftInk)
                        }
                    }
                }
            }
        }
    }
}
