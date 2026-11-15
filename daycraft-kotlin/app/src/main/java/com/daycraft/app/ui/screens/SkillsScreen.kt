package com.daycraft.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import com.daycraft.app.data.local.entities.ProjectEntity
import com.daycraft.app.data.local.entities.SkillEntity
import com.daycraft.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SkillsScreen(
    skills: List<SkillEntity>,
    projects: List<ProjectEntity>,
    onAddProblemSolved: (skillId: String) -> Unit,
    onAddProject: (ProjectEntity) -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var selectedTab by remember { mutableStateOf("skills") } // "skills" or "projects"

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Skills & Engineering", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = DaycraftInk)
                        Text("DSA problem tracker & project portfolio", fontSize = 12.sp, color = DaycraftInkMuted)
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
            // Segment Switcher: Skills vs Projects
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(DaycraftSurface)
                        .border(1.dp, DaycraftLine, RoundedCornerShape(14.dp))
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    val isSkills = selectedTab == "skills"
                    Button(
                        onClick = { selectedTab = "skills" },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isSkills) DaycraftOrange else Color.Transparent,
                            contentColor = if (isSkills) Color.White else DaycraftInk
                        )
                    ) {
                        Text("Skills & DSA", fontWeight = FontWeight.Bold)
                    }

                    val isProjects = selectedTab == "projects"
                    Button(
                        onClick = { selectedTab = "projects" },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isProjects) DaycraftOrange else Color.Transparent,
                            contentColor = if (isProjects) Color.White else DaycraftInk
                        )
                    ) {
                        Text("Projects (${projects.size})", fontWeight = FontWeight.Bold)
                    }
                }
            }

            if (selectedTab == "skills") {
                items(skills, key = { it.id }) { skill ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, DaycraftLine, RoundedCornerShape(20.dp)),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(DaycraftOrangeSoft),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(imageVector = Icons.Default.Code, contentDescription = null, tint = DaycraftOrange)
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(skill.name, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = DaycraftInk)
                                        Text("Target: ${skill.targetLevel}", fontSize = 12.sp, color = DaycraftInkMuted)
                                    }
                                }

                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = DaycraftOrangeSoft
                                ) {
                                    Text(
                                        text = skill.currentLevel,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = DaycraftOrangeDark
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Quick Problem Counter
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Log Completed Problem", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = DaycraftInk)
                                Button(
                                    onClick = { onAddProblemSolved(skill.id) },
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = DaycraftOrange)
                                ) {
                                    Icon(imageVector = Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("+1 Solved", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                }
            } else {
                items(projects, key = { it.id }) { project ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, DaycraftLine, RoundedCornerShape(20.dp)),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = DaycraftSurface)
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(project.name, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = DaycraftInk)

                                val statusColor = when (project.status.lowercase()) {
                                    "completed" -> DaycraftGreen
                                    "in_progress" -> DaycraftOrange
                                    else -> DaycraftInkMuted
                                }
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = statusColor.copy(alpha = 0.15f)
                                ) {
                                    Text(
                                        text = project.status.replace("_", " ").uppercase(),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = statusColor
                                    )
                                }
                            }

                            project.description?.let { desc ->
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(desc, fontSize = 13.sp, color = DaycraftInkMuted)
                            }

                            project.githubUrl?.let { url ->
                                Spacer(modifier = Modifier.height(14.dp))
                                OutlinedButton(
                                    onClick = {
                                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                        context.startActivity(browserIntent)
                                    },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(imageVector = Icons.Default.OpenInNew, contentDescription = null, tint = DaycraftInk, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("View on GitHub", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = DaycraftInk)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
