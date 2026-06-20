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
        userId: Int,
        answer: String,
        nextIndex: Int,
        onResult: ((correct: Boolean, correctAnswer: String, explanation: String) -> Unit)? = null
    ) {
        val data = JSONObject().apply {
            put("roomId", roomId)
            put("userId", userId)
            put("answer", answer)
            put("nextIndex", nextIndex)
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
        Log.d(TAG, "submit_answer: answer=$answer idx=$nextIndex")
    }
}
