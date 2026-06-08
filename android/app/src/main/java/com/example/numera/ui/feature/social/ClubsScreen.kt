package com.example.numera.ui.feature.social

import android.util.Log
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
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Clubs/teams (audit #1.7 — community beyond a friend list). In a club → your team + ranked
// members + leave. Not in one → create a club or browse and join. One club at a time; the club is
// deleted server-side when its last member leaves. Server-authoritative (routes/clubs.js).
@Composable
fun ClubsScreen(onBack: () -> Unit) {
    var mine by remember { mutableStateOf<MyClubResponse?>(null) }
    var clubs by remember { mutableStateOf<List<ClubSummary>>(emptyList()) }
    var topClubs by remember { mutableStateOf<List<ClubLeaderboardEntry>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf("") }
    var newDesc by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            try {
                val token = RetrofitClient.authToken ?: ""
                val m = withContext(Dispatchers.IO) { RetrofitClient.apiService.getMyClub(token) }
                mine = m
                clubs = if (m.club == null) withContext(Dispatchers.IO) { RetrofitClient.apiService.browseClubs(token) } else emptyList()
                topClubs = withContext(Dispatchers.IO) { RetrofitClient.apiService.clubsLeaderboard(token) }
            } catch (e: Exception) {
                Log.e("Clubs", "load err: ${e.message}")
            } finally {
                loading = false
            }
        }
    }
    LaunchedEffect(Unit) { reload() }

    fun act(block: suspend (String) -> Unit, failMsg: String) {
        if (busy) return
        busy = true
        error = null
        scope.launch {
            try {
                val token = RetrofitClient.authToken ?: ""
                withContext(Dispatchers.IO) { block(token) }
                reload()
            } catch (e: Exception) {
                error = failMsg
                Log.e("Clubs", "action err: ${e.message}")
            } finally {
                busy = false
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.m, vertical = Spacing.s),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("🛡️ Clubs", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
            TextButton(onClick = onBack) { Text("Close") }
        }

        if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            return@Column
        }

        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = Spacing.l).padding(bottom = Spacing.xxl),
            verticalArrangement = Arrangement.spacedBy(Spacing.m)
        ) {
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp) }

            val club = mine?.club
            if (club != null) {
                // ---- My club ----
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                        Text(club.name, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)
                        if (!club.description.isNullOrBlank()) {
                            Text(club.description, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                        }
                        Text("${mine?.members?.size ?: 0} members", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    }
                }
                Text("TEAM RANKING", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary)
                mine?.members?.forEach { m ->
                    val canManage = club.isOwner && m.id != club.ownerId
                    ClubMemberRow(
                        m = m,
                        isOwner = m.id == club.ownerId,
                        canManage = canManage,
                        onPromote = { act({ RetrofitClient.apiService.transferClubOwnership(it, club.id, ClubMemberActionRequest(m.id)) }, "Couldn't transfer ownership.") },
                        onKick = { act({ RetrofitClient.apiService.kickClubMember(it, club.id, ClubMemberActionRequest(m.id)) }, "Couldn't remove member.") }
                    )
                }
                OutlinedButton(onClick = { act({ RetrofitClient.apiService.leaveClub(it, club.id) }, "Couldn't leave the club.") }, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                    Text("Leave club")
                }
                if (club.isOwner) {
                    OutlinedButton(
                        onClick = { act({ RetrofitClient.apiService.disbandClub(it, club.id) }, "Couldn't disband the club.") },
                        enabled = !busy,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Disband club")
                    }
                }
            } else {
                // ---- Create a club ----
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                        Text("Start a Club", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.primary)
                        OutlinedTextField(value = newName, onValueChange = { if (it.length <= 30) newName = it }, label = { Text("Club name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(value = newDesc, onValueChange = { if (it.length <= 200) newDesc = it }, label = { Text("Description (optional)") }, modifier = Modifier.fillMaxWidth(), maxLines = 3)
                        DuoButton(
                            text = "Create",
                            onClick = { act({ RetrofitClient.apiService.createClub(it, CreateClubRequest(newName.trim(), newDesc.trim().ifBlank { null })) }, "Couldn't create — name may be taken or invalid.") },
                            enabled = !busy && newName.trim().length >= 3,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                // ---- Browse ----
                Text("BROWSE CLUBS", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary)
                if (clubs.isEmpty()) {
                    Text("No clubs yet — be the first to start one!", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                } else {
                    clubs.forEach { c ->
                        DuoCard(modifier = Modifier.fillMaxWidth()) {
                            Row(modifier = Modifier.fillMaxWidth().padding(Spacing.l), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(c.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text("${c.memberCount} ${if (c.memberCount == 1) "member" else "members"}${if (!c.description.isNullOrBlank()) " · ${c.description}" else ""}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), maxLines = 2)
                                }
                                DuoButton(text = "Join", onClick = { act({ RetrofitClient.apiService.joinClub(it, c.id) }, "Couldn't join.") }, enabled = !busy)
                            }
                        }
                    }
                }
            }

            // Top Clubs — the team league: every club ranked by its members' combined level.
            Text("🏆 TOP CLUBS", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary, modifier = Modifier.padding(top = Spacing.s))
            if (topClubs.isEmpty()) {
                Text("No clubs ranked yet.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            } else {
                topClubs.forEach { tc ->
                    val isMine = mine?.club?.id == tc.id
                    DuoCard(
                        modifier = Modifier.fillMaxWidth(),
                        borderColor = if (isMine) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth().padding(Spacing.m), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.m)) {
                            Text(
                                "#${tc.position}",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 15.sp,
                                color = when (tc.position) { 1 -> MilestoneGold; 2 -> MedalSilver; 3 -> MedalBronze; else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f) },
                                modifier = Modifier.width(36.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(if (isMine) "${tc.name} (your club)" else tc.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (isMine) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                                Text("${tc.memberCount} ${if (tc.memberCount == 1) "member" else "members"} · ${tc.totalLevel} total levels", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ClubMemberRow(
    m: ClubMember,
    isOwner: Boolean = false,
    canManage: Boolean = false,
    onPromote: () -> Unit = {},
    onKick: () -> Unit = {}
) {
    var menuOpen by remember { mutableStateOf(false) }
    DuoCard(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth().padding(Spacing.m), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.m)) {
            Text(
                "#${m.position}",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 15.sp,
                color = when (m.position) { 1 -> MilestoneGold; 2 -> MedalSilver; 3 -> MedalBronze; else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f) },
                modifier = Modifier.width(36.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Text(m.username, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    if (isOwner) Text("👑", fontSize = 12.sp)
                }
                Text("${m.rank} · Lvl ${m.level}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
            Text("${m.xp} XP", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
            if (canManage) {
                Box {
                    IconButton(onClick = { menuOpen = true }) { Text("⋮", fontSize = 18.sp, fontWeight = FontWeight.Bold) }
                    DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                        DropdownMenuItem(text = { Text("Make owner") }, onClick = { menuOpen = false; onPromote() })
                        DropdownMenuItem(text = { Text("Remove from club") }, onClick = { menuOpen = false; onKick() })
                    }
                }
            }
        }
    }
}
