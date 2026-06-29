package com.example.numera.ui.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import com.example.numera.ui.components.pressable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.*
import androidx.compose.animation.core.*
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
import com.example.numera.data.network.*
import com.example.numera.theme.*
import androidx.compose.foundation.BorderStroke
import com.example.numera.ui.components.NumeraEmptyState
import com.example.numera.ui.components.EmptyIllustration

fun formatRelativeTime(timestampSeconds: Long): String {
    val diff = (System.currentTimeMillis() / 1000) - timestampSeconds
    if (diff < 60) return "Just now"
    val mins = diff / 60
    if (mins < 60) return "${mins}m ago"
    val hours = mins / 60
    if (hours < 24) return "${hours}h ago"
    val days = hours / 24
    return "${days}d ago"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsDialog(
    notifications: List<NotificationItemDto>,
    onDismissRequest: () -> Unit,
    onMarkAllRead: () -> Unit,
    onMarkSingleRead: (Int) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismissRequest,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),
        modifier = Modifier
            .fillMaxWidth(0.92f)
            .wrapContentHeight()
            .clip(RoundedCornerShape(CornerRadius.xl)),
        confirmButton = {},
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Inbox",
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (notifications.any { it.read_state == 0 }) {
                    TextButton(onClick = onMarkAllRead) {
                        Text(
                            text = "Mark all read",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 400.dp)
            ) {
                if (notifications.isEmpty()) {
                    NumeraEmptyState(
                        illustration = EmptyIllustration.Notifications,
                        title = "You're all caught up",
                        message = "No new notifications right now. We'll let you know the moment something happens.",
                        ctaLabel = "Continue Learning",
                        onCta = onDismissRequest
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(Spacing.s)
                    ) {
                        items(notifications, key = { it.id }) { item ->
                            val isUnread = item.read_state == 0
                            val cardBg = if (isUnread) MaterialTheme.colorScheme.primary.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                            val cardBorder = if (isUnread) MaterialTheme.colorScheme.primary.copy(alpha = 0.25f) else MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)
                            
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .pressable {
                                        if (isUnread) {
                                            onMarkSingleRead(item.id)
                                        }
                                    },
                                shape = RoundedCornerShape(CornerRadius.l),
                                colors = CardDefaults.cardColors(containerColor = cardBg),
                                border = BorderStroke(1.dp, cardBorder)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(Spacing.m),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(
                                                when (item.type) {
                                                    "welcome" -> Color(0xFFE3F2FD)
                                                    "levelup" -> Color(0xFFFFF9C4)
                                                    "achievement" -> Color(0xFFE8F5E9)
                                                    "social" -> Color(0xFFF3E5F5)
                                                    else -> Color(0xFFECEFF1)
                                                }
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = when (item.type) {
                                                "welcome" -> "🚀"
                                                "levelup" -> "🌟"
                                                "achievement" -> "🏆"
                                                "social" -> "🤝"
                                                else -> "🔔"
                                            },
                                            fontSize = 18.sp
                                        )
                                    }
                                    
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = item.title,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 14.sp,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                            Text(
                                                text = formatRelativeTime(item.created_at),
                                                fontSize = 10.sp,
                                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = item.message,
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                                        )
                                    }
                                    
                                    if (isUnread) {
                                        Box(
                                            modifier = Modifier
                                                .size(6.dp)
                                                .clip(CircleShape)
                                                .background(WrongRed)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    )
}
