package com.example.numera.ui.feature.social

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.ConceptPost
import com.example.numera.data.network.CreatePostPayload
import com.example.numera.data.network.RetrofitClient
import com.example.numera.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Per-concept discussion (audit #1.7/#1.18 — community). A flat message thread attached to a
// curriculum concept: ask/answer "how does this work" right where you study it. Posts are
// content-filtered + block-aware server-side; you can delete your own.
@Composable
fun ConceptDiscussionScreen(conceptId: String, conceptName: String, onBack: () -> Unit) {
    var posts by remember { mutableStateOf<List<ConceptPost>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var draft by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun refresh() {
        scope.launch {
            try {
                val token = RetrofitClient.authToken ?: ""
                val r = withContext(Dispatchers.IO) { RetrofitClient.apiService.getConceptPosts(token, conceptId) }
                posts = r.posts
            } catch (e: Exception) {
                Log.e("Discussion", "load err: ${e.message}")
            } finally {
                loading = false
            }
        }
    }
    LaunchedEffect(conceptId) { refresh() }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.m, vertical = Spacing.s),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("💬 Discussion", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
                Text(conceptName, fontSize = 12.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
            }
            TextButton(onClick = onBack) { Text("Close") }
        }

        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            when {
                loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                posts.isEmpty() -> Box(Modifier.fillMaxSize().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                    Text("No posts yet. Start the conversation — ask a question or share a tip.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = Spacing.l),
                    verticalArrangement = Arrangement.spacedBy(Spacing.s)
                ) {
                    items(posts, key = { it.id }) { post ->
                        PostCard(
                            post,
                            onDelete = {
                                scope.launch {
                                    try {
                                        val token = RetrofitClient.authToken ?: ""
                                        withContext(Dispatchers.IO) { RetrofitClient.apiService.deleteConceptPost(token, post.id) }
                                        refresh()
                                    } catch (e: Exception) {
                                        Log.e("Discussion", "delete err: ${e.message}")
                                    }
                                }
                            },
                            onUpvote = {
                                // Optimistic toggle; reconcile with the server's authoritative count.
                                posts = posts.map {
                                    if (it.id == post.id) it.copy(voted = !it.voted, votes = it.votes + if (it.voted) -1 else 1) else it
                                }
                                scope.launch {
                                    try {
                                        val token = RetrofitClient.authToken ?: ""
                                        val r = withContext(Dispatchers.IO) { RetrofitClient.apiService.upvoteConceptPost(token, post.id) }
                                        posts = posts.map { if (it.id == post.id) it.copy(voted = r.voted, votes = r.votes) else it }
                                    } catch (e: Exception) {
                                        Log.e("Discussion", "upvote err: ${e.message}")
                                        refresh() // roll back to server truth on failure
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }

        statusMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp, modifier = Modifier.padding(horizontal = Spacing.l, vertical = Spacing.xs))
        }

        // Composer.
        Row(
            modifier = Modifier.fillMaxWidth().padding(Spacing.m),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.s)
        ) {
            OutlinedTextField(
                value = draft,
                onValueChange = { if (it.length <= 500) draft = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("Ask or share a tip…") },
                maxLines = 4,
                shape = RoundedCornerShape(CornerRadius.m)
            )
            Button(
                onClick = {
                    val text = draft.trim()
                    if (text.isEmpty()) return@Button
                    sending = true
                    statusMessage = null
                    scope.launch {
                        try {
                            val token = RetrofitClient.authToken ?: ""
                            withContext(Dispatchers.IO) { RetrofitClient.apiService.createConceptPost(token, conceptId, CreatePostPayload(text)) }
                            draft = ""
                            refresh()
                        } catch (e: Exception) {
                            statusMessage = "Couldn't post. Keep it respectful and under 500 chars."
                            Log.e("Discussion", "post err: ${e.message}")
                        } finally {
                            sending = false
                        }
                    }
                },
                enabled = draft.isNotBlank() && !sending
            ) { Text(if (sending) "…" else "Post", fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun PostCard(post: ConceptPost, onDelete: () -> Unit, onUpvote: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.m),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(Spacing.m), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(if (post.mine) "${post.username} (you)" else post.username, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
                if (post.mine) {
                    TextButton(onClick = onDelete, contentPadding = PaddingValues(horizontal = Spacing.s)) {
                        Text("Delete", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    }
                }
            }
            Text(post.body, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (post.mine) {
                    // You can't upvote your own post — show the count only.
                    Text("▲ ${post.votes}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                } else {
                    val accent = if (post.voted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    TextButton(onClick = onUpvote, contentPadding = PaddingValues(horizontal = Spacing.s)) {
                        Text("▲ ${post.votes}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = accent)
                    }
                }
            }
        }
    }
}
