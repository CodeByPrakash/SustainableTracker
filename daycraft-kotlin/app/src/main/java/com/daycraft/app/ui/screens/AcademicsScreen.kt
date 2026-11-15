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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.daycraft.app.data.local.entities.AcademicSubjectEntity
import com.daycraft.app.data.local.entities.AcademicTopicEntity
import com.daycraft.app.data.local.entities.AssignmentEntity
import com.daycraft.app.data.local.entities.ExamEntity
import com.daycraft.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcademicsScreen(
    subjects: List<AcademicSubjectEntity>,
    topics: List<AcademicTopicEntity>,
    assignments: List<AssignmentEntity>,
    exams: List<ExamEntity>,
    onToggleTopic: (String, String) -> Unit,
    onStartStudySession: (String) -> Unit,
    onBack: () -> Unit
) {
    var selectedSubjectId by remember {
        mutableStateOf(subjects.firstOrNull()?.id ?: "")
    }

    LaunchedEffect(subjects) {
        if (selectedSubjectId.isEmpty() && subjects.isNotEmpty()) {
            selectedSubjectId = subjects.first().id
        }
    }

    val activeTopics = remember(selectedSubjectId, topics) {
        topics.filter { it.subjectId == selectedSubjectId }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Academics & Study", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = DaycraftInk)
                        Text("Semester syllabus & assignment pipeline", fontSize = 12.sp, color = DaycraftInkMuted)
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
            // 1. Hero Focus Study Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = DaycraftSurface),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, DaycraftGreen)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Deep Study Block",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = DaycraftInk
                                )
                                Text(
                                    text = "Pomodoro intervals with zero distractions",
                                    fontSize = 12.sp,
                                    color = DaycraftInkMuted
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(DaycraftGreenSoft),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.MenuBook,
                                    contentDescription = null,
                                    tint = DaycraftGreen,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = { onStartStudySession(selectedSubjectId) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DaycraftGreen)
                        ) {
                            Icon(imageVector = Icons.Default.PlayArrow, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("START FOCUS SESSION", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            // 2. Subjects Selector Tabs
            item {
                Text("Subjects (${subjects.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = DaycraftInk)
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(subjects, key = { it.id }) { subj ->
                        val isSelected = subj.id == selectedSubjectId
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedSubjectId = subj.id },
                            label = {
                                Text(
                                    text = subj.code ?: subj.name,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = DaycraftGreenSoft,
                                selectedLabelColor = DaycraftGreenDark
                            )
                        )
                    }
                }
            }

            // 3. Syllabus Topics for Selected Subject
            item {
                Text("Topics & Syllabus (${activeTopics.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = DaycraftInk)
            }

            if (activeTopics.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
                    ) {
                        Box(modifier = Modifier.padding(20.dp).fillMaxWidth(), contentAlignment = Alignment.Center) {
                            Text("No topics registered for this subject", color = DaycraftInkMuted)
                        }
                    }
                }
            } else {
                items(activeTopics, key = { it.id }) { topic ->
                    val isDone = topic.status == "completed"
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
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = topic.name,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp,
                                    color = DaycraftInk
                                )
                                Text(
                                    text = topic.unit ?: "Unit 1",
                                    fontSize = 12.sp,
                                    color = DaycraftInkMuted
                                )
                            }

                            IconButton(
                                onClick = {
                                    onToggleTopic(topic.id, if (isDone) "pending" else "completed")
                                },
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(if (isDone) DaycraftGreenSoft else DaycraftSurfaceMuted)
                            ) {
                                Icon(
                                    imageVector = if (isDone) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                    contentDescription = "Complete",
                                    tint = if (isDone) DaycraftGreen else DaycraftInkMuted,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }
                    }
                }
            }

            // 4. Assignments & Deadlines
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text("Upcoming Assignments (${assignments.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = DaycraftInk)
            }

            items(assignments, key = { it.id }) { assignment ->
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
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(assignment.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = DaycraftInk)
                            Text("Due: ${assignment.dueDate ?: "Soon"}", fontSize = 12.sp, color = DaycraftInkMuted)
                        }

                        // Priority Badge
                        val badgeColor = when (assignment.priority.lowercase()) {
                            "high" -> DaycraftDanger
                            "medium" -> DaycraftOrange
                            else -> DaycraftGreen
                        }
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = badgeColor.copy(alpha = 0.15f)
                        ) {
                            Text(
                                text = assignment.priority.uppercase(),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = badgeColor
                            )
                        }
                    }
                }
            }
        }
    }
}
