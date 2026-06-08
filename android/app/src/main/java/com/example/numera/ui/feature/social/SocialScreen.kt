package com.example.numera.ui.feature.social

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.MathAvatar
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.NumeraEmptyState
import com.example.numera.ui.components.EmptyIllustration
import com.example.numera.ui.components.LocalToast
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Preset friend nudges (keys must match the server's NUDGES catalog in routes/friends.js). Fixed
// set → no free text → nothing to moderate.
private val NUDGE_OPTIONS = listOf(
    "cheer" to "👏 Cheer on",
    "duel" to "⚔️ Challenge",
    "gg" to "🎮 Good game",
    "streak" to "🔥 Keep streak",
    "study" to "📚 Study?",
    "congrats" to "🎉 Congrats"
)

@Composable
fun SocialScreen() {
    val toast = LocalToast.current
    var nudgeMenuFriendId by remember { mutableStateOf<Int?>(null) }
    var searchUsername by remember { mutableStateOf("") }
    var friendsList by remember { mutableStateOf<List<Friend>>(emptyList()) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var statusIsError by remember { mutableStateOf(false) }
    var tab by remember { mutableStateOf("friends") } // friends | leaderboard
    var leaderboard by remember { mutableStateOf<List<FriendLeaderboardEntry>>(emptyList()) }
    val scope = rememberCoroutineScope()

    val fetchFriends = {
        scope.launch(Dispatchers.IO) {
            try {
                val list = RetrofitClient.apiService.getFriends(RetrofitClient.authToken ?: "")
                withContext(Dispatchers.Main) {
                    friendsList = list
                }
            } catch (e: Exception) {
                Log.e("Social", "Friends list fetch err: ${e.message}")
            }
        }
    }

    LaunchedEffect(Unit) {
        fetchFriends()
    }

    // Load the friends ranking lazily when that tab is opened.
    LaunchedEffect(tab) {
        if (tab == "leaderboard") {
            try {
                val list = withContext(Dispatchers.IO) { RetrofitClient.apiService.getFriendsLeaderboard(RetrofitClient.authToken ?: "") }
                leaderboard = list
            } catch (e: Exception) {
                Log.e("Social", "Leaderboard fetch err: ${e.message}")
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(Spacing.l),
        verticalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        // Add Friend Widget
        item {
            DuoCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(Spacing.xs),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    OutlinedTextField(
                        value = searchUsername,
                        onValueChange = { searchUsername = it },
                        label = { Text("Friend's Username") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    DuoButton(
                        text = "Add",
                        onClick = {
                            if (searchUsername.isBlank()) return@DuoButton
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    val res = RetrofitClient.apiService.requestFriend(
                                        token, FriendRequestPayload(searchUsername)
                                    )
                                    withContext(Dispatchers.Main) {
                                        statusMessage = res.message
                                        statusIsError = false
                                        searchUsername = ""
                                        fetchFriends()
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        statusMessage = "Failed: Username not found or link exists."
                                        statusIsError = true
                                    }
                                }
                            }
                        }
                    )
                }
            }
        }

        // Status banner
        statusMessage?.let { msg ->
            item {
                Text(
                    text = msg,
                    color = if (statusIsError) WrongRed else CorrectGreen,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.s)
                )
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth().padding(top = Spacing.s), horizontalArrangement = Arrangement.spacedBy(Spacing.s)) {
                FilterChip(selected = tab == "friends", onClick = { tab = "friends" }, label = { Text("Friends") })
                FilterChip(selected = tab == "leaderboard", onClick = { tab = "leaderboard" }, label = { Text("🏆 Leaderboard") })
            }
        }

        if (tab == "leaderboard") {
            item {
                Text(
                    text = "🏆 FRIENDS RANKING",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.padding(top = Spacing.s)
                )
            }
            if (leaderboard.isEmpty()) {
                item {
                    Text(
                        "Add friends to see how you rank against them.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            } else {
                items(leaderboard, key = { it.id }) { entry -> LeaderboardRow(entry) }
            }
        } else {

        item {
            Text(
                text = "MY FRIENDS",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.padding(top = Spacing.s)
            )
        }

        if (friendsList.isEmpty()) {
            item {
                NumeraEmptyState(
                    illustration = EmptyIllustration.Friends,
                    title = "No friends yet",
                    message = "Add someone with the field above to compare progress and climb the ranks together."
                )
            }
        } else {
            items(friendsList, key = { it.id }) { friend ->
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(Spacing.xs),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            if (!friend.avatar.isNullOrEmpty()) {
                                MathAvatar(
                                    avatarKey = friend.avatar,
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .border(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f), CircleShape),
                                    fallbackEmoji = when (friend.avatar) {
                                        "avatar_owl" -> "🦉"
                                        "avatar_fox" -> "🦊"
                                        "avatar_koala" -> "🐨"
                                        "avatar_panda" -> "🐼"
                                        else -> "📐"
                                    }
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.secondaryContainer),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = friend.username.first().uppercase(),
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSecondaryContainer
                                    )
                                }
                            }

                            Column {
                                Text(text = friend.username, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text(text = "${friend.rank} (Lvl ${friend.level})", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            }
                        }

                        // Incoming request → accept or decline. Outgoing request → just a pending
                        // label (you can't accept your own). Accepted → online indicator.
                        when {
                            friend.status == "pending" && friend.incoming -> {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                                ) {
                                    DuoButton(
                                        text = "Accept",
                                        onClick = {
                                            scope.launch(Dispatchers.IO) {
                                                try {
                                                    val token = RetrofitClient.authToken ?: ""
                                                    RetrofitClient.apiService.acceptFriend(
                                                        token, FriendAcceptPayload(friend.id)
                                                    )
                                                    withContext(Dispatchers.Main) { fetchFriends() }
                                                } catch (e: Exception) {
                                                    Log.e("Social", "Accept friend err: ${e.message}")
                                                }
                                            }
                                        }
                                    )
                                    TextButton(
                                        onClick = {
                                            scope.launch(Dispatchers.IO) {
                                                try {
                                                    val token = RetrofitClient.authToken ?: ""
                                                    RetrofitClient.apiService.declineFriend(
                                                        token, FriendAcceptPayload(friend.id)
                                                    )
                                                    withContext(Dispatchers.Main) { fetchFriends() }
                                                } catch (e: Exception) {
                                                    Log.e("Social", "Decline friend err: ${e.message}")
                                                }
                                            }
                                        }
                                    ) {
                                        Text("Decline", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 13.sp)
                                    }
                                }
                            }
                            friend.status == "pending" -> {
                                // Outgoing request still awaiting their response → let me cancel it.
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                                    Text("Requested", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                                    TextButton(
                                        onClick = {
                                            scope.launch(Dispatchers.IO) {
                                                try {
                                                    val token = RetrofitClient.authToken ?: ""
                                                    RetrofitClient.apiService.removeFriend(token, friend.id)
                                                    withContext(Dispatchers.Main) { fetchFriends() }
                                                } catch (e: Exception) {
                                                    Log.e("Social", "Cancel request err: ${e.message}")
                                                }
                                            }
                                        }
                                    ) {
                                        Text("Cancel", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 13.sp)
                                    }
                                }
                            }
                            else -> {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(Spacing.s)
                                            .clip(CircleShape)
                                            .background(CorrectGreen)
                                    )
                                    Text("Online", fontSize = 11.sp, color = CorrectGreen, fontWeight = FontWeight.Bold)
                                    // Friend nudge — send a canned encouragement (no free text).
                                    Box {
                                        TextButton(onClick = { nudgeMenuFriendId = friend.id }) {
                                            Text("👋", fontSize = 15.sp)
                                        }
                                        DropdownMenu(expanded = nudgeMenuFriendId == friend.id, onDismissRequest = { nudgeMenuFriendId = null }) {
                                            NUDGE_OPTIONS.forEach { (key, label) ->
                                                DropdownMenuItem(
                                                    text = { Text(label) },
                                                    onClick = {
                                                        nudgeMenuFriendId = null
                                                        scope.launch(Dispatchers.IO) {
                                                            try {
                                                                RetrofitClient.apiService.nudgeFriend(RetrofitClient.authToken ?: "", friend.id, NudgeRequest(key))
                                                                withContext(Dispatchers.Main) { toast.success("Nudge sent to ${friend.username}!") }
                                                            } catch (e: Exception) {
                                                                Log.e("Social", "Nudge err: ${e.message}")
                                                            }
                                                        }
                                                    }
                                                )
                                            }
                                        }
                                    }
                                    TextButton(
                                        onClick = {
                                            scope.launch(Dispatchers.IO) {
                                                try {
                                                    val token = RetrofitClient.authToken ?: ""
                                                    RetrofitClient.apiService.removeFriend(token, friend.id)
                                                    withContext(Dispatchers.Main) { fetchFriends() }
                                                } catch (e: Exception) {
                                                    Log.e("Social", "Remove friend err: ${e.message}")
                                                }
                                            }
                                        }
                                    ) {
                                        Text("Remove", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 13.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        } // end tab == "friends"
    }
}

@Composable
private fun LeaderboardRow(entry: FriendLeaderboardEntry) {
    DuoCard(
        modifier = Modifier.fillMaxWidth(),
        borderColor = if (entry.isMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(Spacing.m),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.m)
        ) {
            Text(
                "#${entry.position}",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 16.sp,
                color = when (entry.position) {
                    1 -> MilestoneGold
                    2 -> MedalSilver
                    3 -> MedalBronze
                    else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                },
                modifier = Modifier.width(36.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    if (entry.isMe) "${entry.username} (you)" else entry.username,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = if (entry.isMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                )
                Text("${entry.rank} · Lvl ${entry.level}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
            Text("${entry.xp} XP", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
        }
    }
}
