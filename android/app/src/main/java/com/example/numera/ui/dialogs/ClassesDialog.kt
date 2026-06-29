package com.example.numera.ui.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import com.example.numera.ui.components.pressable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.numera.data.network.ClassCreateRequest
import com.example.numera.data.network.ClassJoinRequest
import com.example.numera.data.network.ClassRosterResponse
import com.example.numera.data.network.MyClassesResponse
import com.example.numera.data.network.RetrofitClient
import com.example.numera.theme.Spacing
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * The school channel surface (ultra review #86): create a class to get a join code to share, join a
 * class with a code, and — for classes you teach — see a roster of each student's plain-language
 * progress. Self-contained: loads /api/classes/mine on open and drives create/join/roster directly.
 */
@Composable
fun ClassesDialog(onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    val token = RetrofitClient.authToken ?: ""
    var data by remember { mutableStateOf<MyClassesResponse?>(null) }
    var newName by remember { mutableStateOf("") }
    var joinCode by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var roster by remember { mutableStateOf<ClassRosterResponse?>(null) }

    fun refresh() {
        scope.launch {
            data = runCatching { withContext(Dispatchers.IO) { RetrofitClient.apiService.getMyClasses(token) } }.getOrNull()
        }
    }
    LaunchedEffect(Unit) { refresh() }

    Dialog(onDismissRequest = onDismiss) {
        DuoCard(modifier = Modifier.fillMaxWidth().padding(Spacing.s)) {
            Column(
                modifier = Modifier.fillMaxWidth().heightIn(max = 560.dp).verticalScroll(rememberScrollState()).padding(Spacing.m),
                verticalArrangement = Arrangement.spacedBy(Spacing.s)
            ) {
                Text("Classes", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)

                // Inline roster view for a class you teach.
                val r = roster
                if (r != null) {
                    TextButton(onClick = { roster = null }) { Text("← Back to classes") }
                    Text(r.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text("Join code: ${r.code}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(Modifier.height(Spacing.xs))
                    if (r.members.isEmpty()) {
                        Text("No students have joined yet. Share the code above.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    } else {
                        r.members.forEach { m ->
                            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                                Column(modifier = Modifier.padding(Spacing.s)) {
                                    Text(m.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text(
                                        "Level ${m.level} · ${m.totalSolved} solved · ${m.streak}-day streak" +
                                            (m.topStrength?.let { " · strongest: $it" } ?: ""),
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                    )
                                }
                            }
                        }
                    }
                    return@Column
                }

                // Create + join forms.
                OutlinedTextField(
                    value = newName, onValueChange = { newName = it },
                    label = { Text("New class name") }, singleLine = true, modifier = Modifier.fillMaxWidth()
                )
                DuoButton(
                    text = "Create class",
                    onClick = {
                        if (newName.isBlank() || busy) return@DuoButton
                        busy = true; status = null
                        scope.launch {
                            val res = runCatching { withContext(Dispatchers.IO) { RetrofitClient.apiService.createClass(token, ClassCreateRequest(newName.trim())) } }.getOrNull()
                            busy = false
                            if (res != null) { status = "Created “${res.name}” — code ${res.code}"; newName = ""; refresh() }
                            else status = "Couldn't create the class."
                        }
                    },
                    modifier = Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.primary
                )

                Spacer(Modifier.height(Spacing.xs))
                OutlinedTextField(
                    value = joinCode, onValueChange = { joinCode = it },
                    label = { Text("Join with a class code") }, singleLine = true, modifier = Modifier.fillMaxWidth()
                )
                DuoButton(
                    text = "Join class",
                    onClick = {
                        if (joinCode.isBlank() || busy) return@DuoButton
                        busy = true; status = null
                        scope.launch {
                            val res = runCatching { withContext(Dispatchers.IO) { RetrofitClient.apiService.joinClass(token, ClassJoinRequest(joinCode.trim())) } }.getOrNull()
                            busy = false
                            if (res != null) { status = "Joined “${res.name}”"; joinCode = ""; refresh() }
                            else status = "No class found for that code."
                        }
                    },
                    modifier = Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.secondary
                )

                status?.let { Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Medium) }

                val d = data
                if (d != null) {
                    if (d.teaching.isNotEmpty()) {
                        Text("Classes you teach", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        d.teaching.forEach { c ->
                            Row(
                                modifier = Modifier.fillMaxWidth()
                                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                                    .pressable {
                                        scope.launch {
                                            roster = runCatching { withContext(Dispatchers.IO) { RetrofitClient.apiService.getClassRoster(token, c.id) } }.getOrNull()
                                        }
                                    }
                                    .padding(Spacing.s),
                                horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(c.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text("Code ${c.code} · ${c.memberCount} student${if (c.memberCount == 1) "" else "s"}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                }
                                Text("View →", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                    if (d.joined.isNotEmpty()) {
                        Text("Classes you're in", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        d.joined.forEach { c ->
                            Text("• ${c.name} (by ${c.teacher})", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f))
                        }
                    }
                }

                TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) { Text("Close") }
            }
        }
    }
}
