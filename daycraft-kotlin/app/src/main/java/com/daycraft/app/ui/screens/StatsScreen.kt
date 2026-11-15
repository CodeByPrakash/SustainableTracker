package com.daycraft.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.daycraft.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatsScreen(
    habitRate: Int = 85,
    gymConsistency: Int = 90,
    academicHours: Double = 14.5,
    waterMl: Int = 2250,
    onNavigateToSettings: () -> Unit = {},
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Analytics & Stats", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = DaycraftInk)
                        Text("Consistency metrics and progress trends", fontSize = 12.sp, color = DaycraftInkMuted)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back", tint = DaycraftInk)
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(imageVector = Icons.Default.Settings, contentDescription = "Settings", tint = DaycraftInk)
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
            // Overall Consistency Hero
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = DaycraftSurface),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, DaycraftOrange)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("OVERALL CONSISTENCY", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = DaycraftInkMuted, letterSpacing = 1.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "${(habitRate + gymConsistency) / 2}%",
                            fontSize = 48.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = DaycraftOrangeDark,
                            letterSpacing = (-1).sp
                        )
                        Text("Weekly targets met with high momentum", fontSize = 13.sp, color = DaycraftInkMuted)
                    }
                }
            }

            // Key Metrics Grid
            item {
                Text("Discipline Metrics", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = DaycraftInk)
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetricBox(
                        title = "Habits Done",
                        value = "$habitRate%",
                        subtitle = "7-day average",
                        icon = Icons.Default.CheckCircle,
                        color = DaycraftGreen,
                        modifier = Modifier.weight(1f)
                    )
                    MetricBox(
                        title = "Gym Sessions",
                        value = "$gymConsistency%",
                        subtitle = "5 of 6 completed",
                        icon = Icons.Default.FitnessCenter,
                        color = DaycraftOrange,
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetricBox(
                        title = "Study Time",
                        value = "${academicHours}h",
                        subtitle = "Logged this week",
                        icon = Icons.Default.MenuBook,
                        color = Color(0xFF3B82F6),
                        modifier = Modifier.weight(1f)
                    )
                    MetricBox(
                        title = "Water Intake",
                        value = "${waterMl}ml",
                        subtitle = "Goal: 3000ml",
                        icon = Icons.Default.WaterDrop,
                        color = Color(0xFF0EA5E9),
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
fun MetricBox(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.border(1.dp, DaycraftLine, RoundedCornerShape(18.dp)),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = DaycraftInk)
            Text(title, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = DaycraftInkMuted)
            Text(subtitle, fontSize = 10.sp, color = DaycraftInkMuted)
        }
    }
}
