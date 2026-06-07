package com.example.numera.data.network

import retrofit2.http.*

// Separate, dependency-free interface for the token refresh call. Synchronous (Call, not suspend)
// so the OkHttp Authenticator can invoke it on its background thread without the main auth client's
// interceptors/authenticator (which would recurse).
interface TokenRefreshApi {
    @POST("api/auth/refresh")
    fun refresh(@Body request: RefreshRequest): retrofit2.Call<AuthResponse>
}

interface ApiService {
    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @GET("api/auth/me")
    suspend fun getProfile(@Header("Authorization") token: String): User

    // ---- Password reset ----
    @POST("api/auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): GenericMessageResponse

    @POST("api/auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): GenericMessageResponse

    // ---- MFA ----
    @POST("api/auth/mfa/login")
    suspend fun mfaLogin(@Body request: MfaLoginRequest): AuthResponse

    @GET("api/auth/mfa/status")
    suspend fun mfaStatus(@Header("Authorization") token: String): MfaStatusResponse

    @POST("api/auth/mfa/setup")
    suspend fun mfaSetup(@Header("Authorization") token: String): MfaSetupResponse

    @POST("api/auth/mfa/enable")
    suspend fun mfaEnable(
        @Header("Authorization") token: String,
        @Body request: MfaEnableRequest
    ): MfaEnableResponse

    @POST("api/auth/mfa/disable")
    suspend fun mfaDisable(
        @Header("Authorization") token: String,
        @Body request: MfaDisableRequest
    ): GenericMessageResponse

    @GET("api/math/problems")
    suspend fun getProblems(
        @Header("Authorization") token: String,
        @Query("category") category: String,
        @Query("level") level: Int,
        @Query("count") count: Int = 3
    ): MathLevelResponse

    @POST("api/math/complete")
    suspend fun completeSession(
        @Header("Authorization") token: String,
        @Body request: CompleteSessionRequest
    ): CompleteSessionResponse

    @POST("api/math/calculator/log")
    suspend fun logCalculatorUsage(
        @Header("Authorization") token: String,
        @Body request: CalculatorLogRequest
    ): CalculatorLogResponse

    @GET("api/math/srs/due")
    suspend fun getSrsDue(
        @Header("Authorization") token: String
    ): List<SrsDueItem>

    @POST("api/math/srs/review")
    suspend fun submitSrsReview(
        @Header("Authorization") token: String,
        @Body request: SrsReviewRequest
    ): SrsReviewResponse

    @DELETE("api/math/srs/dismiss/{topic}")
    suspend fun dismissSrsItem(
        @Header("Authorization") token: String,
        @Path("topic") topic: String
    ): retrofit2.Response<Unit>

    @GET("api/legacy/puzzles")
    suspend fun getLegacyPuzzles(
        @Header("Authorization") token: String
    ): List<LegacyExercise>

    @GET("api/shop")
    suspend fun getShop(
        @Header("Authorization") token: String
    ): ShopResponse

    @POST("api/shop/purchase")
    suspend fun purchaseItem(
        @Header("Authorization") token: String,
        @Body request: PurchaseRequest
    ): PurchaseResponse

    @POST("api/shop/equip")
    suspend fun equipItem(
        @Header("Authorization") token: String,
        @Body request: EquipRequest
    ): EquipResponse

    @POST("api/shop/consume-retry")
    suspend fun consumeRetryToken(
        @Header("Authorization") token: String
    ): SimpleResponse

    @GET("api/friends")
    suspend fun getFriends(
        @Header("Authorization") token: String
    ): List<Friend>

    @POST("api/friends/request")
    suspend fun requestFriend(
        @Header("Authorization") token: String,
        @Body request: FriendRequestPayload
    ): SimpleResponse

    @POST("api/friends/accept")
    suspend fun acceptFriend(
        @Header("Authorization") token: String,
        @Body request: FriendAcceptPayload
    ): SimpleResponse

    // ---- UGC moderation: block & report -----------------------------------
    @POST("api/blocks")
    suspend fun blockUser(
        @Header("Authorization") token: String,
        @Body request: BlockRequest
    ): SimpleResponse

    @DELETE("api/blocks/{userId}")
    suspend fun unblockUser(
        @Header("Authorization") token: String,
        @Path("userId") userId: Int
    ): SimpleResponse

    @GET("api/blocks")
    suspend fun getBlocks(
        @Header("Authorization") token: String
    ): List<BlockedUser>

    @POST("api/reports")
    suspend fun reportContent(
        @Header("Authorization") token: String,
        @Body request: ReportRequest
    ): SimpleResponse

    @GET("api/leaderboard")
    suspend fun getLeaderboard(
        @Header("Authorization") token: String
    ): List<User>

    @GET("api/achievements")
    suspend fun getAchievements(
        @Header("Authorization") token: String
    ): List<Achievement>

    @POST("api/achievements/claim")
    suspend fun claimAchievement(
        @Header("Authorization") token: String,
        @Body request: AchievementClaimRequest
    ): AchievementClaimResponse

    @GET("api/assessment/questions")
    suspend fun getAssessmentQuestions(
        @Header("Authorization") token: String
    ): List<MathProblem>

    @POST("api/assessment/submit")
    suspend fun submitAssessment(
        @Header("Authorization") token: String,
        @Body request: AssessmentSubmitRequest
    ): AssessmentSubmitResponse

    @POST("api/assessment/skip")
    suspend fun skipAssessment(
        @Header("Authorization") token: String
    ): SimpleResponse

    @GET("api/archive/search")
    suspend fun searchArchive(
        @Header("Authorization") token: String,
        @Query("category") category: String?,
        @Query("stars") stars: Int?,
        @Query("q") query: String?,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): List<ArchiveExercise>

    @GET("api/engine/learner")
    suspend fun getLearnerModel(
        @Header("Authorization") token: String
    ): LearnerModelResponse

    @GET("api/engine/next")
    suspend fun getNextRecommendation(
        @Header("Authorization") token: String,
        @Query("level") level: Int? = null,
        @Query("category") category: String? = null
    ): NextRecommendationResponse

    @GET("api/math/transfer/challenge")
    suspend fun getTransferChallenge(
        @Header("Authorization") token: String,
        @Query("concept") concept: String? = null
    ): TransferChallengeResponse

    @POST("api/math/transfer/result")
    suspend fun submitTransferResult(
        @Header("Authorization") token: String,
        @Body request: TransferResultRequest
    ): SimpleResponse

    @GET("api/mistakes")
    suspend fun getMistakes(
        @Header("Authorization") token: String
    ): List<Mistake>

    @POST("api/mistakes")
    suspend fun addMistake(
        @Header("Authorization") token: String,
        @Body request: AddMistakeRequest
    ): SimpleResponse

    @POST("api/mistakes/resolve")
    suspend fun resolveMistake(
        @Header("Authorization") token: String,
        @Body request: ResolveMistakeRequest
    ): ResolveMistakeResponse

    @GET("api/quests")
    suspend fun getQuests(
        @Header("Authorization") token: String
    ): List<Quest>

    @POST("api/quests/claim")
    suspend fun claimQuest(
        @Header("Authorization") token: String,
        @Body request: ClaimQuestRequest
    ): ClaimQuestResponse

    @GET("api/math/daily-puzzle")
    suspend fun getDailyPuzzle(
        @Header("Authorization") token: String
    ): DailyPuzzle

    @POST("api/math/daily-puzzle/submit")
    suspend fun submitDailyPuzzle(
        @Header("Authorization") token: String,
        @Body request: DailyPuzzleSubmitRequest
    ): DailyPuzzleSubmitResponse

    @GET("api/league/leaderboard")
    suspend fun getLeagueLeaderboard(
        @Header("Authorization") token: String
    ): LeagueLeaderboardResponse

    @POST("api/user/settings")
    suspend fun changePassword(
        @Header("Authorization") token: String,
        @Body request: PasswordChangeRequest
    ): PasswordChangeResponse

    @GET("api/user/{userId}")
    suspend fun getUserProfile(
        @Header("Authorization") token: String,
        @Path("userId") userId: Int
    ): PublicProfile

    @GET("api/commitment/status")
    suspend fun getCommitmentStatus(
        @Header("Authorization") token: String
    ): CommitmentStatusResponse

    @POST("api/commitment/recommit")
    suspend fun recommitClimb(
        @Header("Authorization") token: String,
        @Body request: RecommitRequest
    ): RecommitResponse

    @GET("api/favorites")
    suspend fun getFavorites(
        @Header("Authorization") token: String
    ): List<ArchiveExercise>

    @POST("api/favorites/toggle")
    suspend fun toggleFavorite(
        @Header("Authorization") token: String,
        @Body request: ToggleFavoriteRequest
    ): ToggleFavoriteResponse

    @GET("api/notifications")
    suspend fun getNotifications(
        @Header("Authorization") token: String
    ): List<NotificationItemDto>

    @POST("api/notifications/read")
    suspend fun markNotificationsRead(
        @Header("Authorization") token: String,
        @Body request: MarkReadRequest
    ): SimpleResponse

    @GET("api/notifications/preferences")
    suspend fun getNotificationPreferences(
        @Header("Authorization") token: String
    ): NotificationPreferencesDto

    @POST("api/notifications/preferences")
    suspend fun updateNotificationPreferences(
        @Header("Authorization") token: String,
        @Body request: NotificationPreferencesUpdateRequest
    ): NotificationPreferencesResponse

    @POST("api/puzzle-rush/start")
    suspend fun startPuzzleRush(
        @Header("Authorization") token: String
    ): PuzzleRushStartResponse

    @POST("api/puzzle-rush/submit")
    suspend fun submitPuzzleRush(
        @Header("Authorization") token: String,
        @Body request: PuzzleRushSubmitRequest
    ): PuzzleRushSubmitResponse

    @GET("api/puzzle-rush/leaderboard")
    suspend fun puzzleRushLeaderboard(
        @Header("Authorization") token: String
    ): PuzzleRushLeaderboardResponse

    @POST("api/duel/async/challenge")
    suspend fun asyncChallenge(
        @Header("Authorization") token: String,
        @Body request: AsyncChallengeRequest
    ): AsyncChallengeResponse

    @GET("api/duel/async/active")
    suspend fun asyncActiveDuels(
        @Header("Authorization") token: String
    ): List<AsyncMatchSummary>

    @GET("api/duel/async/{id}")
    suspend fun asyncFetchDuel(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): AsyncPlayFetchResponse

    @POST("api/duel/async/{id}/play")
    suspend fun asyncPlayDuel(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Body request: AsyncPlayRequest
    ): AsyncPlayResponse

    @POST("api/user/change-username")
    suspend fun changeUsername(
        @Header("Authorization") token: String,
        @Body request: ChangeUsernameRequest
    ): SimpleResponse

    @POST("api/user/change-email/request")
    suspend fun requestEmailChange(
        @Header("Authorization") token: String,
        @Body request: RequestEmailChangePayload
    ): RequestEmailChangeResponse

    @POST("api/user/change-email/verify")
    suspend fun verifyEmailChange(
        @Header("Authorization") token: String,
        @Body request: VerifyEmailChangePayload
    ): SimpleResponse

    @POST("api/user/privacy")
    suspend fun updatePrivacy(
        @Header("Authorization") token: String,
        @Body request: PrivacyUpdateRequest
    ): SimpleResponse

    @GET("api/user/sessions")
    suspend fun getSessions(
        @Header("Authorization") token: String
    ): List<UserSessionDto>

    @POST("api/user/sessions/revoke")
    suspend fun revokeSession(
        @Header("Authorization") token: String,
        @Body request: RevokeSessionRequest
    ): SimpleResponse

    @GET("api/user/security-logs")
    suspend fun getSecurityLogs(
        @Header("Authorization") token: String
    ): List<SecurityLogDto>

    @GET("api/user/export-data")
    suspend fun exportData(
        @Header("Authorization") token: String
    ): okhttp3.ResponseBody

    @POST("api/user/delete-account")
    suspend fun deleteAccount(
        @Header("Authorization") token: String
    ): SimpleResponse

    @GET("api/collections")
    suspend fun getCollections(
        @Header("Authorization") token: String
    ): List<SavedCollection>

    @POST("api/collections")
    suspend fun createCollection(
        @Header("Authorization") token: String,
        @Body request: CreateCollectionRequest
    ): SavedCollection

    @PUT("api/collections/{id}")
    suspend fun updateCollection(
        @Header("Authorization") token: String,
        @Path("id") collectionId: Int,
        @Body request: UpdateCollectionRequest
    ): SimpleResponse

    @DELETE("api/collections/{id}")
    suspend fun deleteCollection(
        @Header("Authorization") token: String,
        @Path("id") collectionId: Int
    ): SimpleResponse

    @POST("api/favorites/assign-collection")
    suspend fun assignCollection(
        @Header("Authorization") token: String,
        @Body request: AssignCollectionRequest
    ): SimpleResponse

    @GET("api/user/{userId}/public-collections")
    suspend fun getPublicCollections(
        @Header("Authorization") token: String,
        @Path("userId") userId: Int
    ): List<PublicCollectionDto>
}
