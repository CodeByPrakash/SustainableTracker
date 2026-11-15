package com.daycraft.app.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.daycraft.app.alarm.AlarmReceiver
import com.daycraft.app.alarm.AlarmRingingActivity
import com.daycraft.app.alarm.AlarmScheduler
import com.daycraft.app.data.local.entities.AlarmEntity
import com.daycraft.app.ui.theme.*
import java.util.UUID

val DAY_LETTERS = listOf("S", "M", "T", "W", "T", "F", "S")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlarmScreen(
    alarms: List<AlarmEntity>,
    onSaveAlarm: (AlarmEntity) -> Unit,
    onDeleteAlarm: (String) -> Unit,
    onToggleAlarm: (String, Boolean) -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var showDialog by remember { mutableStateOf(false) }
    var editingAlarm by remember { mutableStateOf<AlarmEntity?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Wakeup Alarms", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = DaycraftInk)
                        Text("Rise on time with your custom music", fontSize = 12.sp, color = DaycraftInkMuted)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back", tint = DaycraftInk)
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            editingAlarm = null
                            showDialog = true
                        },
                        modifier = Modifier
                            .padding(end = 8.dp)
                            .clip(CircleShape)
                            .background(DaycraftOrange)
                    ) {
                        Icon(imageVector = Icons.Default.Add, contentDescription = "Add Alarm", tint = Color.White)
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
            // Test Wakeup Hero Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = DaycraftSurface),
                    border = androidx.compose.foundation.BorderStroke(1.dp, DaycraftLine)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .background(DaycraftOrangeSoft),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = "Test",
                                    tint = DaycraftOrange
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("Test Wakeup Sound", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = DaycraftInk)
                                Text("Preview music & ringing controls", fontSize = 12.sp, color = DaycraftInkMuted)
                            }
                        }

                        Button(
                            onClick = {
                                val testIntent = Intent(context, AlarmRingingActivity::class.java).apply {
                                    putExtra("EXTRA_ALARM_LABEL", "Morning Wakeup (Test)")
                                    putExtra("EXTRA_ALARM_SOUND_NAME", "Daycraft Chime")
                                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                                }
                                context.startActivity(testIntent)
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DaycraftOrange)
                        ) {
                            Text("Test Now", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            // Alarms list
            items(alarms, key = { it.id }) { alarm ->
                AlarmCard(
                    alarm = alarm,
                    onToggle = { isChecked ->
                        onToggleAlarm(alarm.id, isChecked)
                        if (isChecked) {
                            AlarmScheduler.scheduleAlarm(context, alarm.copy(isEnabled = true))
                        } else {
                            AlarmScheduler.cancelAlarm(context, alarm.id)
                        }
                    },
                    onEdit = {
                        editingAlarm = alarm
                        showDialog = true
                    },
                    onDelete = {
                        AlarmScheduler.cancelAlarm(context, alarm.id)
                        onDeleteAlarm(alarm.id)
                    }
                )
            }
        }
    }

    if (showDialog) {
        AlarmEditDialog(
            alarm = editingAlarm,
            onDismiss = { showDialog = false },
            onConfirm = { savedAlarm ->
                onSaveAlarm(savedAlarm)
                if (savedAlarm.isEnabled) {
                    AlarmScheduler.scheduleAlarm(context, savedAlarm)
                }
                showDialog = false
            }
        )
    }
}

@Composable
fun AlarmCard(
    alarm: AlarmEntity,
    onToggle: (Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val activeDays = remember(alarm.days) {
        alarm.days.split(",").mapNotNull { it.trim().toIntOrNull() }
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = 1.5.dp,
                color = if (alarm.isEnabled) DaycraftOrange else DaycraftLine,
                shape = RoundedCornerShape(20.dp)
            ),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.clickable { onEdit() }) {
                    Text(
                        text = alarm.time,
                        fontSize = 34.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = DaycraftInk,
                        letterSpacing = (-0.5).sp
                    )
                    Text(
                        text = alarm.label,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = DaycraftInkMuted
                    )
                }

                Switch(
                    checked = alarm.isEnabled,
                    onCheckedChange = onToggle,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = DaycraftOrange
                    )
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Repeat Days Row
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                DAY_LETTERS.forEachIndexed { index, letter ->
                    val isActive = activeDays.contains(index)
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(if (isActive && alarm.isEnabled) DaycraftOrangeSoft else DaycraftSurfaceMuted)
                            .border(1.dp, if (isActive && alarm.isEnabled) DaycraftOrange else DaycraftLine, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = letter,
                            fontSize = 12.sp,
                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
                            color = if (isActive && alarm.isEnabled) DaycraftOrangeDark else DaycraftInkMuted
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
            HorizontalDivider(color = DaycraftLine)
            Spacer(modifier = Modifier.height(12.dp))

            // Footer with Sound & Delete
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(DaycraftSurfaceMuted)
                        .border(1.dp, DaycraftLine, RoundedCornerShape(16.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (alarm.soundType == "custom") Icons.Default.MusicNote else Icons.Default.VolumeUp,
                        contentDescription = "Sound",
                        tint = DaycraftOrange,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = alarm.soundName,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = DaycraftInk
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(
                        onClick = onEdit,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(DaycraftSurfaceMuted)
                    ) {
                        Icon(imageVector = Icons.Default.Edit, contentDescription = "Edit", tint = DaycraftInk, modifier = Modifier.size(16.dp))
                    }
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(DaycraftSurfaceMuted)
                    ) {
                        Icon(imageVector = Icons.Default.Delete, contentDescription = "Delete", tint = DaycraftDanger, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun AlarmEditDialog(
    alarm: AlarmEntity?,
    onDismiss: () -> Unit,
    onConfirm: (AlarmEntity) -> Unit
) {
    var time by remember { mutableStateOf(alarm?.time ?: "05:45") }
    var label by remember { mutableStateOf(alarm?.label ?: "Wake Up") }
    var soundName by remember { mutableStateOf(alarm?.soundName ?: "Daycraft Chime") }
    var soundType by remember { mutableStateOf(alarm?.soundType ?: "preset") }
    var soundUri by remember { mutableStateOf(alarm?.soundUri) }
    var snoozeMinutes by remember { mutableIntStateOf(alarm?.snoozeMinutes ?: 9) }

    // Audio file picker launcher
    val audioPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            soundUri = it.toString()
            soundType = "custom"
            soundName = it.lastPathSegment?.substringAfterLast('/') ?: "Custom Song"
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(if (alarm == null) "New Wakeup Alarm" else "Edit Alarm", fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                OutlinedTextField(
                    value = time,
                    onValueChange = { time = it },
                    label = { Text("Time (HH:mm)") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = label,
                    onValueChange = { label = it },
                    label = { Text("Alarm Label") },
                    modifier = Modifier.fillMaxWidth()
                )

                // Custom Music Picker Button
                OutlinedButton(
                    onClick = { audioPicker.launch("audio/*") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(imageVector = Icons.Default.MusicNote, contentDescription = null, tint = DaycraftOrange)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (soundType == "custom") "Music: $soundName" else "+ Pick Custom Music / Song",
                        color = DaycraftOrange,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Snooze Minutes
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Snooze Duration", fontWeight = FontWeight.Medium, fontSize = 14.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(5, 9, 15).forEach { mins ->
                            FilterChip(
                                selected = snoozeMinutes == mins,
                                onClick = { snoozeMinutes = mins },
                                label = { Text("${mins}m") }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val finalAlarm = alarm?.copy(
                        time = time,
                        label = label,
                        soundType = soundType,
                        soundName = soundName,
                        soundUri = soundUri,
                        snoozeMinutes = snoozeMinutes
                    ) ?: AlarmEntity(
                        id = UUID.randomUUID().toString(),
                        time = time,
                        label = label,
                        soundType = soundType,
                        soundName = soundName,
                        soundUri = soundUri,
                        snoozeMinutes = snoozeMinutes
                    )
                    onConfirm(finalAlarm)
                },
                colors = ButtonDefaults.buttonColors(containerColor = DaycraftOrange)
            ) {
                Text("Save", color = Color.White, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = DaycraftInkMuted)
            }
        }
    )
}
