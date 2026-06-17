package com.example.numera.ui.feature.shop

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.example.numera.data.network.ShopItem
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Guards the seasonal-sink shop surfaces (ultra-review #66/#75): the token wallet shows the
 * balance + converts, and a prestige card shows its token price + claims. DuoButton uppercases
 * its label, so the action text is matched in upper case.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ShopCardsTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun walletShowsBalanceAndConvertsWhenAffordable() {
        var converted = false
        compose.setContent {
            SeasonTokenWallet(tokens = 5, coins = 600, onConvert = { converted = true })
        }
        compose.onNodeWithText("👑 Season Tokens").assertIsDisplayed()
        compose.onNodeWithText("5").assertIsDisplayed()
        compose.onNodeWithText("CONVERT", substring = true).performClick()
        assertTrue(converted)
    }

    @Test
    fun prestigeCardShowsTokenPriceAndClaims() {
        val item = ShopItem(
            id = "avatar_celestial",
            name = "Celestial Avatar",
            cost = 0,
            type = "avatar",
            value = "avatar_celestial",
            rarity = "Mythic",
            token_cost = 3,
        )
        var claimed = false
        compose.setContent {
            PrestigeTokenCard(item = item, tokens = 3, onClaim = { claimed = true })
        }
        compose.onNodeWithText("Celestial Avatar").assertIsDisplayed()
        compose.onNodeWithText("👑 3 tokens").assertIsDisplayed()
        compose.onNodeWithText("CLAIM", substring = true).performClick()
        assertTrue(claimed)
    }
}
