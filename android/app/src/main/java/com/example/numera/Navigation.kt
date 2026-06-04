package com.example.numera

import androidx.compose.animation.*
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import androidx.compose.ui.platform.LocalContext
import com.example.numera.data.network.RetrofitClient
import com.example.numera.theme.AnimDuration
import com.example.numera.ui.screens.*
import com.example.numera.ui.feature.game.SoloGameScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun MainNavigation() {
  val context = LocalContext.current

  // Always start at Login — we will push MainTabs after token validation if token is valid
  val backStack = rememberNavBackStack(Login)

  // On app launch: if a token is stored, validate it with the server.
  // If valid → navigate to MainTabs. If invalid/expired → clear and stay on Login.
  LaunchedEffect(Unit) {
    if (RetrofitClient.isUserLoggedIn) {
      try {
        withContext(Dispatchers.IO) {
          RetrofitClient.apiService.getProfile(RetrofitClient.authToken ?: "")
        }
        // Token is valid — go to main app
        backStack.add(MainTabs)
      } catch (e: Exception) {
        // Token is invalid/expired/session deleted — clear it silently
        android.util.Log.w("Navigation", "Stored token invalid (${e.message}), clearing and staying on Login")
        RetrofitClient.clearToken(context)
        // Stay on Login (already there)
      }
    }
  }

  // Global logout listener — fires when any API call returns 401
  LaunchedEffect(Unit) {
    RetrofitClient.logoutEventFlow.collect {
      android.util.Log.d("Navigation", "Collected global logout event, navigating to Login")
      RetrofitClient.clearToken(context)
      // Clear backstack to Login
      while (backStack.size > 1) {
        backStack.removeLastOrNull()
      }
      // Ensure Login is on the stack
      if (backStack.lastOrNull() !is Login) {
        backStack.add(Login)
      }
    }
  }

  NavDisplay(
    backStack = backStack,
    onBack = { backStack.removeLastOrNull() },
    transitionSpec = {
      val targetKey = targetState.key
      val initialKey = initialState.key
      if (targetKey is MainTabs && (initialKey is Login || initialKey is Register)) {
        val exit = fadeOut(animationSpec = tween(durationMillis = AnimDuration.xslow, easing = CubicBezierEasing(0.22f, 1f, 0.36f, 1f))) +
                   scaleOut(targetScale = 0.92f, animationSpec = tween(durationMillis = AnimDuration.xslow, easing = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)))
        val enter = fadeIn(animationSpec = tween(durationMillis = AnimDuration.entrance, delayMillis = 150, easing = CubicBezierEasing(0.22f, 1f, 0.36f, 1f))) +
                    scaleIn(initialScale = 1.08f, animationSpec = tween(durationMillis = AnimDuration.entrance, delayMillis = 150, easing = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)))
        enter togetherWith exit
      } else {
        slideInHorizontally(
          initialOffsetX = { it },
          animationSpec = tween(durationMillis = AnimDuration.slow, easing = FastOutSlowInEasing)
        ) + fadeIn(animationSpec = tween(AnimDuration.slow)) togetherWith
        slideOutHorizontally(
          targetOffsetX = { -it },
          animationSpec = tween(durationMillis = AnimDuration.slow, easing = FastOutSlowInEasing)
        ) + fadeOut(animationSpec = tween(AnimDuration.slow))
      }
    },
    popTransitionSpec = {
      val targetKey = targetState.key
      val initialKey = initialState.key
      if ((targetKey is Login || targetKey is Register) && initialKey is MainTabs) {
        val exit = fadeOut(animationSpec = tween(durationMillis = AnimDuration.xslow, easing = CubicBezierEasing(0.22f, 1f, 0.36f, 1f))) +
                   scaleOut(targetScale = 1.08f, animationSpec = tween(durationMillis = AnimDuration.xslow, easing = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)))
        val enter = fadeIn(animationSpec = tween(durationMillis = AnimDuration.entrance, delayMillis = 150, easing = CubicBezierEasing(0.22f, 1f, 0.36f, 1f))) +
                    scaleIn(initialScale = 0.92f, animationSpec = tween(durationMillis = AnimDuration.entrance, delayMillis = 150, easing = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)))
        enter togetherWith exit
      } else {
        slideInHorizontally(
          initialOffsetX = { -it },
          animationSpec = tween(durationMillis = AnimDuration.slow, easing = FastOutSlowInEasing)
        ) + fadeIn(animationSpec = tween(AnimDuration.slow)) togetherWith
        slideOutHorizontally(
          targetOffsetX = { it },
          animationSpec = tween(durationMillis = AnimDuration.slow, easing = FastOutSlowInEasing)
        ) + fadeOut(animationSpec = tween(AnimDuration.slow))
      }
    },
    entryProvider =
      entryProvider {
        entry<Login> {
          LoginScreen(
            onNavigateToRegister = { backStack.add(Register) },
            onLoginSuccess = { backStack.add(MainTabs) }
          )
        }
        entry<Register> {
          RegisterScreen(
            onNavigateToLogin = { backStack.removeLastOrNull() },
            onRegisterSuccess = { backStack.add(MainTabs) }
          )
        }
        entry<MainTabs> {
          MainTabsScreen(
            onStartSoloGame = { soloGame -> backStack.add(soloGame) },
            onStartDuelGame = { roomId, opponentName -> backStack.add(DuelGame(roomId, opponentName)) },
            onStartLegacyGame = { puzzleId -> backStack.add(LegacyGame(puzzleId)) },
            onLogout = {
              android.util.Log.d("Navigation", "onLogout callback executed, clearing token and navigating to Login")
              RetrofitClient.clearToken(context)
              while (backStack.size > 1) {
                backStack.removeLastOrNull()
              }
              backStack.add(Login)
            }
          )
        }
        entry<SoloGame> { navKey ->
          SoloGameScreen(
            category = navKey.category,
            level = navKey.level,
            isLegacyPuzzle = navKey.isLegacyPuzzle,
            legacyPuzzleId = navKey.legacyPuzzleId,
            gameMode = navKey.gameMode,
            passedQuestion = navKey.question,
            passedCorrectAnswer = navKey.correctAnswer,
            passedOptionsJson = navKey.optionsJson,
            passedExplanation = navKey.explanation,
            passedLessonTitle = navKey.lessonTitle,
            passedLessonContent = navKey.lessonContent,
            passedLessonFormula = navKey.lessonFormula,
            passedExamplesJson = navKey.examplesJson,
            onFinishGame = { backStack.removeLastOrNull() }
          )
        }
        entry<DuelGame> { navKey ->
          DuelGameScreen(
            roomId = navKey.roomId,
            opponentName = navKey.opponentName,
            onFinishGame = { backStack.removeLastOrNull() }
          )
        }
        entry<LegacyGame> { navKey ->
          SoloGameScreen(
            category = "",
            level = 0,
            isLegacyPuzzle = true,
            legacyPuzzleId = navKey.puzzleId,
            gameMode = "legacy_puzzle",
            onFinishGame = { backStack.removeLastOrNull() }
          )
        }
      },
      modifier = Modifier.fillMaxSize()
  )
}
