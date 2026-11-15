package com.daycraft.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.daycraft.app.data.local.entities.HabitEntity
import com.daycraft.app.data.local.entities.HabitLogEntity
import com.daycraft.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HabitsScreen(
    habits: List<HabitEntity>,
    logs: List<HabitLogEntity>,
    onToggleHabit: (String) -> Unit,
    onAddHabit: (HabitEntity) -> Unit,
    onBack: () -> Unit
) {
    var selectedGroup by remember { mutableStateOf("all") } // all, morning, afternoon, evening
    var showAddDialog by remember { mutableStateOf(false) }

    val completedIds = remember(logs) {
        logs.filter { it.status == "completed" }.map { it.habitId }.toSet()
    }

    val filteredHabits = remember(habits, selectedGroup) {
        if (selectedGroup == "all") habits else habits.filter { it.groupName.equals(selectedGroup, ignoreCase = true) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Habits & Consistency", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = DaycraftInk)
                        Text("Daily routines and streak tracker", fontSize = 12.sp, color = DaycraftInkMuted)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back", tint = DaycraftInk)
                    }
                },
                actions = {
                    IconButton(
                        onClick = { showAddDialog = true },
                        modifier = Modifier
                            .padding(end = 8.dp)
                            .clip(CircleShape)
                            .background(DaycraftOrange)
                    ) {
                        Icon(imageVector = Icons.Default.Add, contentDescription = "Add Habit", tint = Color.White)
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
            // Group Filter Pills
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("all", "morning", "afternoon", "evening").forEach { group ->
                        val isSelected = selectedGroup == group
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedGroup = group },
                            label = {
                                Text(
                                    text = group.replaceFirstChar { it.uppercase() },
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = DaycraftOrangeSoft,
                                selectedLabelColor = DaycraftOrangeDark
                            )
                        )
                    }
                }
            }

            // Habits List
            items(filteredHabits, key = { it.id }) { habit ->
                val isCompleted = completedIds.contains(habit.id)

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(
                            width = 1.dp,
                            color = if (isCompleted) DaycraftGreen else DaycraftLine,
                            shape = RoundedCornerShape(18.dp)
                        ),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = habit.name,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = DaycraftInk
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = DaycraftSurfaceMuted
                                ) {
                                    Text(
                                        text = habit.groupName.uppercase(),
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = DaycraftInkMuted
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "🔥 Daily",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = DaycraftOrangeDark
                                )
                            }
                        }

                        IconButton(
                            onClick = { onToggleHabit(habit.id) },
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(if (isCompleted) DaycraftGreen else DaycraftSurfaceMuted)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = "Toggle",
                                tint = if (isCompleted) Color.White else DaycraftInkMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        var name by remember { mutableStateOf("") }
        var group by remember { mutableStateOf("morning") }

        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("New Daily Habit", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Habit Name") },
                        placeholder = { Text("e.g. Read 15 mins, Stretch") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text("Routine Time", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("morning", "afternoon", "evening").forEach { g ->
                            FilterChip(
                                selected = group == g,
                                onClick = { group = g },
                                label = { Text(g.replaceFirstChar { it.uppercase() }) }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            onAddHabit(HabitEntity(name = name.trim(), groupName = group))
                            showAddDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DaycraftOrange)
                ) {
                    Text("Add Habit", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("Cancel", color = DaycraftInkMuted)
                }
            }
        )
    }
}
