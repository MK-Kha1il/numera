package com.example.numera.ui.feature.game

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.numera.theme.CorrectGreen
import com.example.numera.theme.Spacing
import com.example.numera.ui.components.DuoButton

/**
 * Shown when a learner runs the 3 hearts down in a LEARNING level (ultra-review #15 / UX-10).
 *
 * This replaces the old "💔 OUT OF HEARTS — you failed the level" paywall, which taxed the
 * learners who fail most by gating continuation behind a purchasable Retry Token. Errors are
 * the learning signal; in a learning mode they must never cost a resource or end the session.
 * So the primary action is always **free**: "Keep going" restores the hearts and continues
 * with no progress lost and no failure framing. The Retry Token is kept only as an *optional*
 * instant-skip for players who already own one — never required, never the only path out.
 *
 * Stakes still belong in competitive modes (duels, tournaments); those don't use hearts.
 * Guarded by GameplayScreenTest (three mistakes -> this dialog renders).
 */
@Composable
fun KeepGoingDialog(
    retryTokensLeft: Int,
    onKeepGoing: () -> Unit,
    onUseRetryToken: () -> Unit,
    onExit: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = {},
        title = {
            Text(
                text = "🌱 Let's slow down",
                fontWeight = FontWeight.Black,
                fontSize = 18.sp,
                color = CorrectGreen
            )
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(Spacing.m)
            ) {
                Text(
                    text = "Three slips on this level — that's the learning happening, not a failure.",
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Take a breath and keep going. No progress lost.",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f)
                )
                if (retryTokensLeft > 0) {
                    Text(
                        text = "You have $retryTokensLeft Retry Token${if (retryTokensLeft == 1) "" else "s"} — optional, you can keep going for free.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                    )
                }
            }
        },
        confirmButton = {
            DuoButton(
                text = "Keep going",
                onClick = onKeepGoing,
                color = CorrectGreen
            )
        },
        dismissButton = {
            // Optional instant-skip for existing token holders, plus a quiet leave path.
            // Neither is required: "Keep going" above is always free.
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                if (retryTokensLeft > 0) {
                    TextButton(onClick = onUseRetryToken) {
                        Text(
                            "Use a Retry Token instead",
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                TextButton(onClick = onExit) {
                    Text(
                        "Leave for now",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
        }
    )
}
