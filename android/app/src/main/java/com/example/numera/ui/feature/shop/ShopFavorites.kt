package com.example.numera.ui.feature.shop

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Local "saved / wishlist" store for the shop (docs/ShopOverhaul.md §12). A plain Compose-observable
 * singleton backed by SharedPreferences — mirrors MotionManager/ThemeManager. Reading [ids] in a
 * composable subscribes it to changes, so the heart toggles update everywhere at once.
 *
 * Stage B keeps this client-local (no schema); Stage D migrates it to a server `user_wishlist` table
 * so saves follow the account across devices and can power "you're X coins away" nudges.
 */
object ShopFavorites {
    private const val PREF = "numera_prefs"
    private const val KEY = "shop_favorites"

    var ids by mutableStateOf<Set<String>>(emptySet())
        private set

    fun init(context: Context) {
        ids = context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .getStringSet(KEY, emptySet())?.toSet() ?: emptySet()
    }

    fun isFavorite(id: String): Boolean = ids.contains(id)

    fun toggle(context: Context, id: String) {
        ids = if (ids.contains(id)) ids - id else ids + id
        context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .edit().putStringSet(KEY, ids).apply()
    }
}
