package com.example.numera.ui.components

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.performTextInput
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Guards the command palette (the home-page search) against the duplicate-key crash: the server's
 * /api/archive/search supplements results with procedurally-generated exercises that all share the
 * same title+category, which used to produce identical LazyColumn keys and crash the app
 * (IllegalArgumentException: "Key was already used") the moment search results rendered.
 *
 * The fix de-duplicates identical results and uses index-based keys. This test drives a search
 * whose provider returns ten identical-titled items and asserts the palette renders them without
 * crashing, collapsed to a single row.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class CommandPaletteTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun search_withDuplicateTitledResults_doesNotCrash_andDeduplicates() {
    val controller = CommandPaletteController()
    controller.open()

    // Mimic the server: 10 exercises with the SAME title + category (generated from one
    // category/stars pick). Pre-fix this crashed the LazyColumn via duplicate keys.
    val duplicates = List(10) {
      CommandItem(
        title = "Gauss Summation Series",
        category = CommandCategory.Exercises,
        icon = NumeraIconType.Learn,
        subtitle = "Arithmetic",
        keywords = "gauss sum",
      ) {}
    }

    compose.setContent {
      CommandPaletteHost(
        controller = controller,
        staticCommands = emptyList(),
        onSearch = { _ -> duplicates },
      )
    }

    // Type a query → debounced server search fires and the duplicate results render.
    compose.onNode(hasSetTextAction()).performTextInput("gauss")

    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Gauss Summation Series").fetchSemanticsNodes().isNotEmpty()
    }
    // No crash, and the ten identical rows collapse to one.
    compose.onAllNodesWithText("Gauss Summation Series").assertCountEquals(1)
  }
}
