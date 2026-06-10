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
import com.example.numera.ui.feature.onboarding.OnboardingFlow
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun MainNavigation() {
  val context = LocalContext.current

  // Always start at Login — we will push MainTabs after token validation if token is valid
  val backStack = rememberNavBackStack(Login)

  // On app launch: if a token is stored, validate it with the server.
  // If valid → navigate to MainTabs. If rejected (401/403) → clear and stay on Login.
  // If the server is unreachable, keep the token and proceed — never log out on a network blip.
  LaunchedEffect(Unit) {
    if (RetrofitClient.isUserLoggedIn) {
      try {
        val user = withContext(Dispatchers.IO) {
          RetrofitClient.apiService.getProfile(RetrofitClient.authToken ?: "")
        }
        // Token is valid — resume onboarding if it wasn't finished, else go to the main app.
        backStack.add(if ((user.onboarding_complete ?: 0) == 1) MainTabs else Onboarding)
      } catch (e: Exception) {
        if (isAuthRejection(e)) {
          // Token is invalid/expired/session deleted — clear it silently and stay on Login.
          android.util.Log.w("Navigation", "Stored token rejected (${e.message}), clearing and staying on Login")
          RetrofitClient.clearToken(context)
        } else {
          // Network failure / server hiccup — NOT an auth failure. Keep the token and proceed
          // optimistically; the global 401 logout listener below handles true expiry later.
          android.util.Log.w("Navigation", "Token check failed (${e.message}), keeping token and proceeding")
          backStack.add(MainTabs)
        }
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
          val loginScope = rememberCoroutineScope()
          LoginScreen(
            onNavigateToRegister = { backStack.add(Register) },
            onLoginSuccess = {
              // Returning users skip onboarding; anyone who never finished it resumes there.
              loginScope.launch {
                val complete = try {
                  (withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.getProfile(RetrofitClient.authToken ?: "")
                  }.onboarding_complete ?: 0) == 1
                } catch (e: Exception) { true } // never trap a user in onboarding on a fetch error
                backStack.add(if (complete) MainTabs else Onboarding)
              }
            }
          )
        }
        entry<Register> {
          RegisterScreen(
            onNavigateToLogin = { backStack.removeLastOrNull() },
            // New accounts always go through onboarding before the app.
            onRegisterSuccess = { backStack.add(Onboarding) }
          )
        }
        entry<Onboarding> {
          OnboardingFlow(
            onComplete = {
              backStack.add(MainTabs)
              // Drop the auth + onboarding entries so Back from the app doesn't re-enter onboarding.
              backStack.removeAll { it is Onboarding || it is Login || it is Register }
            }
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

// Only a definite server rejection of the credentials (401/403) justifies dropping the stored
// token. IOExceptions, timeouts, and 5xx responses mean the server couldn't be asked — the
// session may be perfectly valid, so the token must survive.
internal fun isAuthRejection(e: Exception): Boolean =
  e is retrofit2.HttpException && (e.code() == 401 || e.code() == 403)
