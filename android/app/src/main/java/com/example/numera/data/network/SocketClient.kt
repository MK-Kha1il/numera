package com.example.numera.data.network

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URISyntaxException

object SocketClient {
    private const val TAG = "SocketClient"
    private var currentSocketUrl = "http://10.0.2.2:3000"

    private var mSocket: Socket? = null

    val socket: Socket?
        get() = mSocket

    val isConnected: Boolean
        get() = mSocket?.connected() == true

    // Duel handoff: set when a match is found (just before navigating ArenaScreen →
    // DuelGameScreen). ArenaScreen leaves the composition during that navigation, and its
    // onDispose used to unconditionally disconnect() — killing the socket (and wiping the duel
    // screen's freshly-registered listeners via off()) right as the match began. That race was
    // the root cause of duels that froze on "waiting for the arena" or never received duel_end.
    // The screen that OWNS the socket at any moment is: Arena while queueing, Duel once handed off.
    @Volatile
    var duelHandoffActive: Boolean = false

    fun updateUrl(newUrl: String) {
        if (currentSocketUrl == newUrl) return
        currentSocketUrl = newUrl
        disconnect()
    }

    fun connect() {
        if (isConnected) return

        try {
            val opts = IO.Options().apply {
                reconnection = true
                reconnectionAttempts = 8
                reconnectionDelay = 1000
                reconnectionDelayMax = 10000
                RetrofitClient.authToken?.let { token ->
                    auth = mapOf("token" to token.removePrefix("Bearer ").trim())
                }
            }

            val socket = IO.socket(currentSocketUrl, opts)

            socket.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Connected to $currentSocketUrl")
            }
            socket.on(Socket.EVENT_DISCONNECT) { args ->
                val reason = args.firstOrNull()?.toString() ?: "unknown"
                Log.w(TAG, "Disconnected: $reason")
            }
            socket.on(Socket.EVENT_CONNECT_ERROR) { args ->
                val err = args.firstOrNull()?.toString() ?: "unknown error"
                Log.e(TAG, "Connection error: $err")
            }

            mSocket = socket
            socket.connect()
            Log.d(TAG, "Connecting to $currentSocketUrl")
        } catch (e: URISyntaxException) {
            Log.e(TAG, "Invalid socket URL: ${e.message}")
        }
    }

    fun disconnect() {
        duelHandoffActive = false
        mSocket?.disconnect()
        mSocket?.off()
        mSocket = null
        Log.d(TAG, "Socket disconnected")
    }

    fun joinQueue(mode: String) {
        mSocket?.emit("join_queue", JSONObject().put("mode", mode))
        Log.d(TAG, "Joined queue: $mode")
    }

    fun leaveQueue() {
        mSocket?.emit("leave_queue")
        Log.d(TAG, "Left queue")
    }

    fun createFriendRoom() {
        mSocket?.emit("create_friend_room")
        Log.d(TAG, "create_friend_room emitted")
    }

    fun joinFriendRoom(roomCode: String) {
        mSocket?.emit("join_friend_room", JSONObject().put("roomCode", roomCode))
        Log.d(TAG, "join_friend_room: $roomCode")
    }

    // Accept the server's matchmaking bot offer: the server pulls us from the queue and starts a
    // clearly-labeled, rating-neutral practice duel in the same live-duel experience.
    fun acceptBotOffer() {
        mSocket?.emit("accept_bot")
        Log.d(TAG, "accept_bot emitted")
    }

    // Explicit mid-duel exit (back button / leave): the server forfeits the match to the
    // opponent immediately, so they aren't left waiting out a disconnect grace period.
    fun leaveDuel(roomId: String) {
        mSocket?.emit("leave_duel", JSONObject().put("roomId", roomId))
        Log.d(TAG, "leave_duel: $roomId")
    }

    // "Run it back" from the result screen: first accepter waits, second accepter starts the
    // rematch (the server replies rematch_pending / rematch_requested / rematch_unavailable /
    // a fresh duel_start).
    fun requestRematch(roomId: String) {
        mSocket?.emit("request_rematch", JSONObject().put("roomId", roomId))
        Log.d(TAG, "request_rematch: $roomId")
    }

    // Process-death rejoin: ask the server whether we have a live match (the arena calls this on
    // entry and offers "return to your match" — the disconnect grace is still ticking).
    fun findMyDuel(onResult: (roomId: String?, opponentName: String, opponentRank: String?, ranked: Boolean) -> Unit) {
        mSocket?.emit("find_my_duel", io.socket.client.Ack { ackArgs ->
            val res = ackArgs.getOrNull(0) as? JSONObject
            val roomId = res?.optString("roomId")?.takeIf { it.isNotEmpty() && it != "null" }
            onResult(
                roomId,
                res?.optString("opponentName", "Opponent") ?: "Opponent",
                res?.optString("opponentRank")?.takeIf { it.isNotEmpty() && it != "null" },
                res?.optBoolean("ranked", false) ?: false
            )
        })
    }

    // Positive-only duel emote (server allowlist + rate limit; relayed to the opponent only).
    fun sendEmote(roomId: String, emote: String) {
        mSocket?.emit("duel_emote", JSONObject().put("roomId", roomId).put("emote", emote))
    }

    // Live-room liveness: subscribe to a room's socket channel so server-side state changes (a player
    // joined, the host started, a score moved, the host ended it) push an instant refresh instead of
    // waiting for the next poll. The event carries no game state — the screen re-fetches the room over
    // REST — so this only collapses latency; it adds no trust surface.
    fun joinLiveRoom(roomId: Int) {
        mSocket?.emit("join_live_room", JSONObject().put("roomId", roomId))
        Log.d(TAG, "join_live_room: $roomId")
    }

    fun leaveLiveRoom(roomId: Int) {
        mSocket?.emit("leave_live_room", JSONObject().put("roomId", roomId))
        Log.d(TAG, "leave_live_room: $roomId")
    }

    fun onLiveRoomUpdate(listener: () -> Unit) {
        mSocket?.off("live_room_update") // avoid stacking duplicate listeners across recompositions
        mSocket?.on("live_room_update") { listener() }
    }

    fun offLiveRoomUpdate() {
        mSocket?.off("live_room_update")
    }

    // Send the player's ACTUAL answer (selected option / typed value), not a self-judged boolean —
    // the server is authoritative and grades it against the canonical answer it kept (which it never
    // sent us). This closes the last client-trusted scoring path in ranked duels.
    //
    // The server replies via an ack with its verdict + the canonical answer + the worked solution
    // (all disclosed only AFTER this irreversible submission, never bundled with the live problem),
    // which the caller uses to drive the answer-reveal animation and the favorite/archive payload.
    fun submitAnswer(
        roomId: String,
        answer: String,
        onResult: ((correct: Boolean, correctAnswer: String, explanation: String) -> Unit)? = null
    ) {
        val data = JSONObject().apply {
            put("roomId", roomId)
            put("answer", answer)
        }
        if (onResult != null) {
            mSocket?.emit("submit_answer", arrayOf<Any>(data), io.socket.client.Ack { ackArgs ->
                val res = ackArgs.getOrNull(0) as? JSONObject
                val correct = res?.optBoolean("correct", false) ?: false
                val correctAnswer = res?.optString("correctAnswer", "") ?: ""
                val explanation = res?.optString("explanation", "") ?: ""
                onResult(correct, correctAnswer, explanation)
            })
        } else {
            mSocket?.emit("submit_answer", data)
        }
        Log.d(TAG, "submit_answer: answer=$answer")
    }
}
