package com.daycraft.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
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
import com.daycraft.app.ui.theme.*
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudyActiveScreen(
    subjects: List<AcademicSubjectEntity>,
    initialSubjectId: String?,
    onFinishSession: (subjectId: String, durationSeconds: Int, notes: String) -> Unit,
    onClose: () -> Unit
) {
    var selectedSubjectId by remember {
        mutableStateOf(initialSubjectId ?: subjects.firstOrNull()?.id ?: "")
    }

    var isRunning by remember { mutableStateOf(true) }
    var elapsedSeconds by remember { mutableIntStateOf(0) }
    var notes by remember { mutableStateOf("") }

    // Live timer ticking
    LaunchedEffect(isRunning) {
        while (isRunning) {
            delay(1000)
            elapsedSeconds++
        }
    }

    val minutes = elapsedSeconds / 60
    val seconds = elapsedSeconds % 60
    val timeFormatted = String.format("%02d:%02d", minutes, seconds)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Active Focus Study", fontWeight = FontWeight.Bold, color = DaycraftInk) },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Section: Subject Selector
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("CURRENT FOCUS SUBJECT", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = DaycraftInkMuted, letterSpacing = 1.sp)
                Spacer(modifier = Modifier.height(10.dp))

                val currentSubject = subjects.find { it.id == selectedSubjectId }
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = DaycraftGreenSoft,
                    border = androidx.compose.foundation.BorderStroke(1.dp, DaycraftGreen)
                ) {
                    Text(
                        text = currentSubject?.name ?: "General Study",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = DaycraftGreenDark
                    )
                }
            }

            // Center Section: Big Timer Dial
            Box(
                modifier = Modifier
                    .size(240.dp)
                    .clip(CircleShape)
                    .background(DaycraftSurface)
                    .border(4.dp, DaycraftGreen, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = timeFormatted,
                        fontSize = 48.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = DaycraftInk,
                        letterSpacing = (-1).sp
                    )
                    Text(
                        text = if (isRunning) "FOCUSING" else "PAUSED",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isRunning) DaycraftGreen else DaycraftOrange,
                        letterSpacing = 1.5.sp
                    )
                }
            }

            // Controls & Notes Section
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Play / Pause / Reset Buttons
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = {
                            elapsedSeconds = 0
                            isRunning = false
                        },
                        modifier = Modifier
                            .size(50.dp)
                            .clip(CircleShape)
                            .background(DaycraftSurfaceMuted)
                    ) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "Reset", tint = DaycraftInk)
                    }

                    Button(
                        onClick = { isRunning = !isRunning },
                        modifier = Modifier
                            .height(56.dp)
                            .width(160.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isRunning) DaycraftOrange else DaycraftGreen
                        )
                    ) {
                        Icon(
                            imageVector = if (isRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = null,
                            tint = Color.White
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isRunning) "PAUSE" else "RESUME",
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    placeholder = { Text("Session notes or topics covered...") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )

                // Complete Button
                Button(
                    onClick = {
                        onFinishSession(selectedSubjectId, elapsedSeconds, notes)
                        onClose()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DaycraftInk)
                ) {
                    Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("FINISH & LOG SESSION", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}
