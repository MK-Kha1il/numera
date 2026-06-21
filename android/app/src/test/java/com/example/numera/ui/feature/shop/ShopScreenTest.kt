package com.example.numera.ui.feature.shop

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.ShopItem
import com.example.numera.data.network.ShopResponse
import com.example.numera.data.network.ShopSeasonInfo
import com.example.numera.data.network.User
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Screen-level test (review #81) that also verifies the seasonal-sink client wiring end-to-end: a
 * mocked shop with a season-exclusive cosmetic renders the season item + Season Tokens wallet. After
 * the Vault was tabbed (docs/ShopOverhaul.md Stage B), that content lives on the "Seasonal" tab, so
 * the test selects it first.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ShopScreenTest {
    @get:Rule val compose = createComposeRule()

    private val me = User(id = 99, username = "me", xp = 0, level = 1, coins = 600, rank = "Bronze", streak = 0)

    @Test
    fun rendersSeasonSinkSurfaces() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getShop(any()) } returns ShopResponse(
            items = emptyList(),
            inventory = emptyList(),
            catalogItems = emptyList(),
            seasonItems = listOf(
                ShopItem(id = "avatar_comet", name = "Comet Avatar", cost = 800, type = "avatar", value = "avatar_comet", rarity = "Epic", season_slot = 0),
            ),
            tokenItems = emptyList(),
            seasonInfo = ShopSeasonInfo(seasonId = 1, seasonName = "Season 1", slot = 0, endsAt = 0),
            seasonTokens = 5,
        )
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { ShopScreen(user = me, onPurchaseComplete = {}) }

        // The Vault is tabbed; seasonal content lives on the "Seasonal" tab. Select it (scrolling the
        // chip row into view first, since it sits past the visible chips).
        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("Seasonal", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("Seasonal", substring = true).performScrollTo().performClick()

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("Comet Avatar", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("Comet Avatar", substring = true).assertIsDisplayed()
        compose.onNodeWithText("👑 Season Tokens", substring = true).assertIsDisplayed()
    }
}
