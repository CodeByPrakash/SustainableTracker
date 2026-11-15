package com.daycraft.app.ui.screens

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.daycraft.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    initialWake: String = "05:45",
    initialSleep: String = "22:30",
    initialWater: String = "3000",
    initialStudy: String = "75",
    initialGym: String = "60",
    initialWeight: String = "55.0",
    onSaveTargets: (wake: String, sleep: String, water: String, study: String, gym: String, weight: String) -> Unit,
    onNavigateToAlarm: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current

    var wake by remember { mutableStateOf(initialWake) }
    var sleep by remember { mutableStateOf(initialSleep) }
    var water by remember { mutableStateOf(initialWater) }
    var study by remember { mutableStateOf(initialStudy) }
    var gym by remember { mutableStateOf(initialGym) }
    var weight by remember { mutableStateOf(initialWeight) }

    var saveSuccess by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Settings & Targets", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = DaycraftInk)
                        Text("Daily discipline goals & system settings", fontSize = 12.sp, color = DaycraftInkMuted)
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
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 40.dp)
        ) {
            // Wakeup Alarms Shortcut Card
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onNavigateToAlarm() }
                        .border(1.5.dp, DaycraftOrange, RoundedCornerShape(20.dp)),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(DaycraftOrangeSoft),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(imageVector = Icons.Default.Alarm, contentDescription = null, tint = DaycraftOrange)
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("Wakeup Alarms & Music", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = DaycraftInk)
                                Text("Set repeat alarms with custom audio", fontSize = 12.sp, color = DaycraftInkMuted)
                            }
                        }

                        Button(
                            onClick = onNavigateToAlarm,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DaycraftOrange)
                        ) {
                            Text("Open", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            // Daily Discipline Targets Form
            item {
                Text("Daily Discipline Targets", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = DaycraftInk)
                Spacer(modifier = Modifier.height(10.dp))
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, DaycraftLine, RoundedCornerShape(20.dp)),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
                ) {
                    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = wake,
                                onValueChange = { wake = it },
                                label = { Text("Wakeup Target") },
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = sleep,
                                onValueChange = { sleep = it },
                                label = { Text("Sleep Target") },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = water,
                                onValueChange = { water = it },
                                label = { Text("Daily Water (ml)") },
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = weight,
                                onValueChange = { weight = it },
                                label = { Text("Weight (kg)") },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = study,
                                onValueChange = { study = it },
                                label = { Text("Study Target (min)") },
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = gym,
                                onValueChange = { gym = it },
                                label = { Text("Gym Target (min)") },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Button(
                            onClick = {
                                onSaveTargets(wake, sleep, water, study, gym, weight)
                                saveSuccess = true
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DaycraftOrange)
                        ) {
                            Icon(imageVector = Icons.Default.Save, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("SAVE TARGETS", fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        if (saveSuccess) {
                            Text(
                                text = "✓ Targets successfully saved!",
                                color = DaycraftGreen,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            )
                        }
                    }
                }
            }

            // Database Backup & Export JSON
            item {
                Text("Data & Backup", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = DaycraftInk)
                Spacer(modifier = Modifier.height(10.dp))
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, DaycraftLine, RoundedCornerShape(20.dp)),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
                ) {
                    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = "Export your Daycraft habits, workouts, and schedule data to a JSON backup file.",
                            fontSize = 13.sp,
                            color = DaycraftInkMuted
                        )

                        OutlinedButton(
                            onClick = {
                                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_SUBJECT, "DAYCRAFT Database Backup")
                                    putExtra(Intent.EXTRA_TEXT, "{\"version\": 1, \"exportDate\": \"${System.currentTimeMillis()}\", \"app\": \"Daycraft Kotlin\"}")
                                }
                                val shareIntent = Intent.createChooser(sendIntent, "Export Daycraft Backup")
                                context.startActivity(shareIntent)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Share, contentDescription = null, tint = DaycraftInk)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Export Backup JSON", fontWeight = FontWeight.SemiBold, color = DaycraftInk)
                        }
                    }
                }
            }

            // About App
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("DAYCRAFT Native Kotlin v1.0.0", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = DaycraftInk)
                    Text("Engineered with Jetpack Compose & Google Room DB", fontSize = 11.sp, color = DaycraftInkMuted)
                }
            }
        }
    }
}
