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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun SocialScreen() {
    var searchUsername by remember { mutableStateOf("") }
    var friendsList by remember { mutableStateOf<List<Friend>>(emptyList()) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var statusIsError by remember { mutableStateOf(false) }
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
            items(friendsList) { friend ->
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

                        // Status / Accept request
                        if (friend.status == "pending") {
                            DuoButton(
                                text = "Accept",
                                onClick = {
                                    scope.launch(Dispatchers.IO) {
                                        try {
                                            val token = RetrofitClient.authToken ?: ""
                                            RetrofitClient.apiService.acceptFriend(
                                                token, FriendAcceptPayload(friend.id)
                                            )
                                            withContext(Dispatchers.Main) {
                                                fetchFriends()
                                            }
                                        } catch (e: Exception) {
                                            Log.e("Social", "Accept friend err: ${e.message}")
                                        }
                                    }
                                }
                            )
                        } else {
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
                            }
                        }
                    }
                }
            }
        }
    }
}
