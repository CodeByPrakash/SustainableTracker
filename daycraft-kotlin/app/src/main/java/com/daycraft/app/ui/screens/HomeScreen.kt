package com.daycraft.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.daycraft.app.data.local.entities.HabitEntity
import com.daycraft.app.data.local.entities.ScheduleBlockEntity
import com.daycraft.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun HomeScreen(
    habits: List<HabitEntity>,
    schedule: List<ScheduleBlockEntity>,
    onToggleHabit: (String) -> Unit,
    onToggleSchedule: (String, String) -> Unit,
    onNavigateToAlarm: () -> Unit,
    onNavigateToGym: () -> Unit,
    onNavigateToAcademics: () -> Unit
) {
    val todayFormatted = remember {
        SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(Date())
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(DaycraftCanvas)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 90.dp)
    ) {
        // 1. Header with App Title & Date
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "DAYCRAFT",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = DaycraftInk,
                        letterSpacing = (-0.5).sp
                    )
                    Text(
                        text = todayFormatted,
                        fontSize = 13.sp,
                        color = DaycraftInkMuted,
                        fontWeight = FontWeight.Medium
                    )
                }

                IconButton(
                    onClick = onNavigateToAlarm,
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(DaycraftSurface)
                        .border(1.dp, DaycraftLine, CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Alarm,
                        contentDescription = "Alarms",
                        tint = DaycraftOrange
                    )
                }
            }
        }

        // 2. Quick Actions Row
        item {
            Text(
                text = "Quick Actions",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = DaycraftInk
            )
            Spacer(modifier = Modifier.height(10.dp))
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    QuickActionPill(
                        label = "Wakeup Alarm",
                        icon = Icons.Default.Alarm,
                        accentColor = DaycraftOrange,
                        onClick = onNavigateToAlarm
                    )
                }
                item {
                    QuickActionPill(
                        label = "Start Workout",
                        icon = Icons.Default.FitnessCenter,
                        accentColor = DaycraftOrange,
                        onClick = onNavigateToGym
                    )
                }
                item {
                    QuickActionPill(
                        label = "Focus Study",
                        icon = Icons.Default.MenuBook,
                        accentColor = DaycraftGreen,
                        onClick = onNavigateToAcademics
                    )
                }
            }
        }

        // 3. Today's Schedule Section
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Today's Schedule (${schedule.size})",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = DaycraftInk
                )
            }
        }

        if (schedule.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
                ) {
                    Box(modifier = Modifier.padding(24.dp).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text(text = "No scheduled blocks for today", color = DaycraftInkMuted)
                    }
                }
            }
        } else {
            items(schedule, key = { it.id }) { block ->
                ScheduleRow(
                    block = block,
                    onToggle = { newStatus -> onToggleSchedule(block.id, newStatus) }
                )
            }
        }

        // 4. Daily Habits Section
        item {
            Text(
                text = "Daily Habits (${habits.size})",
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = DaycraftInk
            )
        }

        items(habits, key = { it.id }) { habit ->
            HabitRow(
                habit = habit,
                onToggle = { onToggleHabit(habit.id) }
            )
        }
    }
}

@Composable
fun QuickActionPill(
    label: String,
    icon: ImageVector,
    accentColor: Color,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = DaycraftSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, DaycraftLine),
        modifier = Modifier.height(44.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = accentColor,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = DaycraftInk
            )
        }
    }
}

@Composable
fun ScheduleRow(
    block: ScheduleBlockEntity,
    onToggle: (String) -> Unit
) {
    val isDone = block.status == "completed"

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, if (isDone) DaycraftGreen else DaycraftLine, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(if (isDone) DaycraftGreenSoft else DaycraftSurfaceMuted)
                        .clickable { onToggle(if (isDone) "pending" else "completed") },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isDone) Icons.Default.Check else Icons.Default.Schedule,
                        contentDescription = "Status",
                        tint = if (isDone) DaycraftGreen else DaycraftInkMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = block.title,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = DaycraftInk
                    )
                    Text(
                        text = "${block.startTime} • ${block.category.replaceFirstChar { it.uppercase() }}",
                        fontSize = 12.sp,
                        color = DaycraftInkMuted
                    )
                }
            }
        }
    }
}

@Composable
fun HabitRow(
    habit: HabitEntity,
    onToggle: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, DaycraftLine, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = habit.name,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = DaycraftInk
                )
                Text(
                    text = "${habit.groupName.replaceFirstChar { it.uppercase() }} routine",
                    fontSize = 12.sp,
                    color = DaycraftInkMuted
                )
            }

            IconButton(
                onClick = onToggle,
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(DaycraftSurfaceMuted)
            ) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "Done",
                    tint = DaycraftGreen,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}
