package com.example.numera.data.network

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URISyntaxException

object SocketClient {
    private const val TAG = "SocketClient"
    private var currentSocketUrl = "http://10.100.94.164:3000"

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

    fun submitAnswer(roomId: String, userId: Int, isCorrect: Boolean, nextIndex: Int) {
        val data = JSONObject().apply {
            put("roomId", roomId)
            put("userId", userId)
            put("isCorrect", isCorrect)
            put("nextIndex", nextIndex)
        }
        mSocket?.emit("submit_answer", data)
        Log.d(TAG, "submit_answer: correct=$isCorrect idx=$nextIndex")
    }
}
