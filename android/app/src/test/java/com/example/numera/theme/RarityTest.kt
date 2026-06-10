package com.example.numera.theme

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The rarity ladder is the cross-feature collectible contract (shop cards, purchase
 * reveal, profile collection). Lock down parsing tolerance and tier ordering so a
 * server string never silently demotes an item's presentation.
 */
class RarityTest {

    @Test
    fun `parses server strings case- and whitespace-insensitively`() {
        assertEquals(Rarity.Mythic, Rarity.from("Mythic"))
        assertEquals(Rarity.Legendary, Rarity.from("LEGENDARY"))
        assertEquals(Rarity.Epic, Rarity.from(" epic "))
        assertEquals(Rarity.Rare, Rarity.from("rare"))
        assertEquals(Rarity.Common, Rarity.from("Common"))
    }

    @Test
    fun `unknown or missing rarity falls back to Common`() {
        assertEquals(Rarity.Common, Rarity.from(null))
        assertEquals(Rarity.Common, Rarity.from(""))
        assertEquals(Rarity.Common, Rarity.from("ultra-secret"))
    }

    @Test
    fun `tier ordering supports threshold checks`() {
        assertTrue(Rarity.Mythic > Rarity.Legendary)
        assertTrue(Rarity.Legendary > Rarity.Epic)
        assertTrue(Rarity.Epic > Rarity.Rare)
        assertTrue(Rarity.Rare > Rarity.Common)
    }

    @Test
    fun `prestige treatments start at Epic`() {
        assertFalse(Rarity.Common.isPrestige)
        assertFalse(Rarity.Rare.isPrestige)
        assertTrue(Rarity.Epic.isPrestige)
        assertTrue(Rarity.Legendary.isPrestige)
        assertTrue(Rarity.Mythic.isPrestige)
    }

    @Test
    fun `glow strength escalates with tier`() {
        val ordered = Rarity.entries.sorted()
        ordered.zipWithNext().forEach { (lower, higher) ->
            assertTrue("${higher.name} should glow more than ${lower.name}", higher.glow > lower.glow)
        }
    }
}
