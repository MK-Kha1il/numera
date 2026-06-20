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

    // Value-first guest entry: an ephemeral account so a visitor can try Numera before signing up.
    @POST("api/auth/guest")
    suspend fun guestLogin(): AuthResponse

    // Upgrade a guest into a full account in place (keeps all progress earned as a guest).
    @POST("api/auth/convert")
    suspend fun convertGuest(
        @Header("Authorization") token: String,
        @Body request: ConvertRequest
    ): AuthResponse

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

    // Per-answer cognitive telemetry — fire-and-forget; feeds the learning-intelligence engine.
    @POST("api/math/telemetry")
    suspend fun logTelemetry(
        @Header("Authorization") token: String,
        @Body request: TelemetryRequest
    ): TelemetryResponse

    // Learner-facing Growth Insights (strengths + error habits to watch).
    @GET("api/engine/growth-profile")
    suspend fun getGrowthProfile(
        @Header("Authorization") token: String
    ): GrowthProfileResponse

    // School channel: create/join a class and read my classes / a class roster.
    @POST("api/classes")
    suspend fun createClass(
        @Header("Authorization") token: String,
        @Body request: ClassCreateRequest
    ): ClassCreateResponse

    @POST("api/classes/join")
    suspend fun joinClass(
        @Header("Authorization") token: String,
        @Body request: ClassJoinRequest
    ): ClassJoinResponse

    @GET("api/classes/mine")
    suspend fun getMyClasses(
        @Header("Authorization") token: String
    ): MyClassesResponse

    @GET("api/classes/{id}/roster")
    suspend fun getClassRoster(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): ClassRosterResponse

    // Parent channel: set/clear the guardian email, preview the report, and send it.
    @POST("api/account/guardian")
    suspend fun setGuardian(
        @Header("Authorization") token: String,
        @Body request: GuardianRequest
    ): GuardianResponse

    @GET("api/account/progress-report")
    suspend fun getProgressReport(
        @Header("Authorization") token: String
    ): ProgressReportResponse

    @POST("api/account/progress-report/send")
    suspend fun sendProgressReport(
        @Header("Authorization") token: String
    ): SendProgressResponse

    // Privacy-first product analytics: report one allowlisted event (aggregate count, no PII).
    @POST("api/analytics/event")
    suspend fun logAnalyticsEvent(
        @Header("Authorization") token: String,
        @Body request: AnalyticsEventRequest
    ): AnalyticsEventResponse

    // A mixed-strand cumulative checkpoint exam for exam-readiness practice.
    @GET("api/math/checkpoint-exam")
    suspend fun getCheckpointExam(
        @Header("Authorization") token: String,
        @Query("count") count: Int = 8
    ): CheckpointExamResponse

    // Applied, real-world word problems (shopping, discounts, rates, tips).
    @GET("api/math/word-problems")
    suspend fun getWordProblems(
        @Header("Authorization") token: String,
        @Query("count") count: Int = 5
    ): WordProblemResponse

    // Estimation / number-sense problems ("about how big is …?").
    @GET("api/math/estimation")
    suspend fun getEstimation(
        @Header("Authorization") token: String,
        @Query("count") count: Int = 5
    ): EstimationResponse

    // Flag a generated exercise as wrong/confusing/etc. (content-quality feedback loop).
    @POST("api/math/report")
    suspend fun reportProblem(
        @Header("Authorization") token: String,
        @Body request: ProblemReportRequest
    ): ProblemReportResponse

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

    @POST("api/shop/convert-coins")
    suspend fun convertCoinsToTokens(
        @Header("Authorization") token: String,
        @Body request: ConvertCoinsRequest
    ): ConvertCoinsResponse

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

    @POST("api/friends/decline")
    suspend fun declineFriend(
        @Header("Authorization") token: String,
        @Body request: FriendAcceptPayload
    ): SimpleResponse

    @DELETE("api/friends/{friendId}")
    suspend fun removeFriend(
        @Header("Authorization") token: String,
        @Path("friendId") friendId: Int
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

    @GET("api/leaderboard/friends")
    suspend fun getFriendsLeaderboard(
        @Header("Authorization") token: String
    ): List<FriendLeaderboardEntry>

    @GET("api/clubs")
    suspend fun browseClubs(
        @Header("Authorization") token: String
    ): List<ClubSummary>

    @GET("api/clubs/mine")
    suspend fun getMyClub(
        @Header("Authorization") token: String
    ): MyClubResponse

    @GET("api/clubs/leaderboard")
    suspend fun clubsLeaderboard(
        @Header("Authorization") token: String
    ): List<ClubLeaderboardEntry>

    // Club SKILL ladder — ranked by avg competitive rating, not XP (audit #17).
    @GET("api/clubs/leaderboard/skill")
    suspend fun clubsSkillLeaderboard(
        @Header("Authorization") token: String
    ): List<ClubSkillEntry>

    @POST("api/clubs")
    suspend fun createClub(
        @Header("Authorization") token: String,
        @Body request: CreateClubRequest
    ): SimpleResponse

    @POST("api/clubs/{id}/join")
    suspend fun joinClub(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): SimpleResponse

    @POST("api/clubs/{id}/leave")
    suspend fun leaveClub(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): SimpleResponse

    @POST("api/clubs/{id}/kick")
    suspend fun kickClubMember(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Body request: ClubMemberActionRequest
    ): SimpleResponse

    @POST("api/clubs/{id}/transfer")
    suspend fun transferClubOwnership(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Body request: ClubMemberActionRequest
    ): SimpleResponse

    @DELETE("api/clubs/{id}")
    suspend fun disbandClub(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): SimpleResponse

    @GET("api/clubs/wars")
    suspend fun getClubWars(@Header("Authorization") token: String): ClubWarsResponse

    @POST("api/clubs/wars/challenge")
    suspend fun challengeClub(
        @Header("Authorization") token: String,
        @Body request: ChallengeClubRequest
    ): SimpleResponse

    @GET("api/clubs/wars/{id}")
    suspend fun getClubWar(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): ClubWar

    @POST("api/clubs/wars/{id}/play")
    suspend fun playClubWar(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Body request: TournamentPlayRequest
    ): ClubWarPlayResponse

    @POST("api/friends/{friendId}/nudge")
    suspend fun nudgeFriend(
        @Header("Authorization") token: String,
        @Path("friendId") friendId: Int,
        @Body request: NudgeRequest
    ): SimpleResponse

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

    @POST("api/assessment/adaptive/start")
    suspend fun startAdaptiveDiagnostic(
        @Header("Authorization") token: String
    ): AdaptiveStartResponse

    @POST("api/assessment/adaptive/answer")
    suspend fun answerAdaptiveDiagnostic(
        @Header("Authorization") token: String,
        @Body request: AdaptiveAnswerRequest
    ): AdaptiveAnswerResponse

    @GET("api/engine/skill-tree")
    suspend fun getSkillTree(
        @Header("Authorization") token: String
    ): SkillTreeResponse

    @GET("api/engine/weekly-recap")
    suspend fun getWeeklyRecap(
        @Header("Authorization") token: String
    ): WeeklyRecap

    @GET("api/concepts/{conceptId}/posts")
    suspend fun getConceptPosts(
        @Header("Authorization") token: String,
        @Path("conceptId") conceptId: String
    ): ConceptPostsResponse

    @POST("api/concepts/{conceptId}/posts")
    suspend fun createConceptPost(
        @Header("Authorization") token: String,
        @Path("conceptId") conceptId: String,
        @Body request: CreatePostPayload
    ): SimpleResponse

    @DELETE("api/concepts/posts/{postId}")
    suspend fun deleteConceptPost(
        @Header("Authorization") token: String,
        @Path("postId") postId: Int
    ): SimpleResponse

    @POST("api/concepts/posts/{postId}/upvote")
    suspend fun upvoteConceptPost(
        @Header("Authorization") token: String,
        @Path("postId") postId: Int
    ): VoteResponse

    @GET("api/account/goal")
    suspend fun getGoal(
        @Header("Authorization") token: String
    ): GoalResponse

    @PUT("api/account/goal")
    suspend fun setGoal(
        @Header("Authorization") token: String,
        @Body request: SetGoalPayload
    ): SimpleResponse

    @DELETE("api/account/goal")
    suspend fun deleteGoal(
        @Header("Authorization") token: String
    ): SimpleResponse

    @POST("api/assessment/skip")
    suspend fun skipAssessment(
        @Header("Authorization") token: String
    ): SimpleResponse

    // ---- Onboarding (first launch → habit) ----
    @GET("api/onboarding/state")
    suspend fun getOnboardingState(
        @Header("Authorization") token: String
    ): OnboardingStateResponse

    @POST("api/onboarding/motivations")
    suspend fun saveMotivations(
        @Header("Authorization") token: String,
        @Body request: MotivationsRequest
    ): SimpleResponse

    @POST("api/onboarding/profile")
    suspend fun saveOnboardingProfile(
        @Header("Authorization") token: String,
        @Body request: OnboardingProfileRequest
    ): SimpleResponse

    @GET("api/onboarding/roadmap")
    suspend fun getOnboardingRoadmap(
        @Header("Authorization") token: String
    ): RoadmapResponse

    @POST("api/onboarding/aha/start")
    suspend fun startOnboardingAha(
        @Header("Authorization") token: String
    ): AhaStartResponse

    @POST("api/onboarding/aha/answer")
    suspend fun answerOnboardingAha(
        @Header("Authorization") token: String,
        @Body request: AhaAnswerRequest
    ): AhaAnswerResponse

    @POST("api/onboarding/commitment")
    suspend fun saveOnboardingCommitment(
        @Header("Authorization") token: String,
        @Body request: CommitmentRequest
    ): SimpleResponse

    @POST("api/onboarding/notifications")
    suspend fun saveOnboardingNotificationOptIn(
        @Header("Authorization") token: String,
        @Body request: NotificationOptInRequest
    ): SimpleResponse

    @POST("api/onboarding/complete")
    suspend fun completeOnboarding(
        @Header("Authorization") token: String
    ): SimpleResponse

    @POST("api/onboarding/event")
    suspend fun logOnboardingEvent(
        @Header("Authorization") token: String,
        @Body request: OnboardingEventRequest
    ): SimpleResponse

    // ---- Progressive disclosure (Phase 11) ----
    @GET("api/onboarding/spotlights")
    suspend fun getSpotlights(
        @Header("Authorization") token: String
    ): SpotlightsResponse

    @POST("api/onboarding/spotlights/seen")
    suspend fun markSpotlightSeen(
        @Header("Authorization") token: String,
        @Body request: SpotlightSeenRequest
    ): SimpleResponse

    // ---- Push registration (FCM) ----
    @POST("api/notifications/push-token")
    suspend fun registerPushToken(
        @Header("Authorization") token: String,
        @Body request: PushTokenRequest
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

    @GET("api/today")
    suspend fun getToday(
        @Header("Authorization") token: String
    ): TodayResponse

    // Anonymous by contract — no Authorization header, ever (see CrashReporter).
    @POST("api/crash")
    suspend fun reportCrash(
        @Body request: CrashReportRequest
    ): SimpleResponse

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

    // Buy back a fully-lost streak within the grace window (streak repair — the second valve).
    @POST("api/commitment/streak-repair")
    suspend fun repairStreak(
        @Header("Authorization") token: String
    ): StreakRepairResponse

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

    @POST("api/duel/bot/start")
    suspend fun startBotDuel(
        @Header("Authorization") token: String,
        @Body request: BotStartRequest
    ): BotDuelStartResponse

    @POST("api/duel/bot/{id}/play")
    suspend fun playBotDuel(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Body request: BotPlayRequest
    ): BotPlayResponse

    // ---- Learning plan (goal-driven concept path) ----
    @GET("api/engine/learning-plan")
    suspend fun getLearningPlan(@Header("Authorization") token: String): LearningPlanResponse

    // ---- Ranked seasons ----
    @GET("api/rating/season/leaderboard")
    suspend fun getSeasonLeaderboard(@Header("Authorization") token: String): SeasonLeaderboardResponse

    // ---- Unified competitive rating (per-domain NRS ranks) ----
    @GET("api/rating/profile")
    suspend fun getRatingProfile(@Header("Authorization") token: String): RatingProfileResponse

    // ---- Shareable rank card (viral loop, audit #22) ----
    @GET("api/rating/share-card")
    suspend fun getShareCard(@Header("Authorization") token: String): ShareCardResponse

    // ---- Live group/class competitive rooms (audit #19) ----
    @POST("api/live-rooms")
    suspend fun createLiveRoom(@Header("Authorization") token: String, @Body req: CreateLiveRoomRequest = CreateLiveRoomRequest()): LiveRoomResponse

    @POST("api/live-rooms/{code}/join")
    suspend fun joinLiveRoom(@Header("Authorization") token: String, @Path("code") code: String): LiveRoomResponse

    @POST("api/live-rooms/{id}/start")
    suspend fun startLiveRoom(@Header("Authorization") token: String, @Path("id") id: Int): LiveStartResponse

    @GET("api/live-rooms/{id}")
    suspend fun getLiveRoom(@Header("Authorization") token: String, @Path("id") id: Int): LiveRoomState

    @POST("api/live-rooms/{id}/answer")
    suspend fun answerLiveRoom(@Header("Authorization") token: String, @Path("id") id: Int, @Body req: LiveAnswerRequest): LiveAnswerResponse

    @POST("api/live-rooms/{id}/finish")
    suspend fun finishLiveRoom(@Header("Authorization") token: String, @Path("id") id: Int): LiveFinishResponse

    // ---- Apex tier (leaderboard-only standing above the rank thresholds) ----
    @GET("api/rating/apex")
    suspend fun getApex(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int = 10
    ): ApexResponse

    // ---- Rating timeline (recent rated results) ----
    @GET("api/rating/history")
    suspend fun getRatingHistory(
        @Header("Authorization") token: String,
        @Query("domain") domain: String,
        @Query("limit") limit: Int
    ): List<RatingHistoryEntry>

    // ---- Competitive match history (opponents, scorelines, W/L) ----
    @GET("api/rating/matches")
    suspend fun getMatchHistory(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int
    ): List<MatchHistoryEntry>

    // ---- Honor / commendation system (audit #24) ----
    @POST("api/rating/commend")
    suspend fun commendOpponent(
        @Header("Authorization") token: String,
        @Body req: CommendRequest
    ): CommendResponse

    @GET("api/rating/honor")
    suspend fun getHonor(@Header("Authorization") token: String): HonorResponse

    // ---- Competitive onboarding: mark the one-time placement rank-reveal as seen (audit #20) ----
    @POST("api/rating/reveal-seen")
    suspend fun markRankRevealSeen(@Header("Authorization") token: String): SimpleResponse

    // ---- Head-to-head rivals ----
    @GET("api/rating/rivals")
    suspend fun getRivals(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int
    ): List<RivalEntry>

    // ---- Competitive titles ----
    @GET("api/rating/titles")
    suspend fun getTitles(@Header("Authorization") token: String): TitlesResponse

    @POST("api/rating/titles/select")
    suspend fun selectTitle(@Header("Authorization") token: String, @Body req: SelectTitleRequest): SelectTitleResponse

    // ---- Season peak badges (Act Rank) ----
    @GET("api/rating/season-history")
    suspend fun getSeasonHistory(@Header("Authorization") token: String): SeasonHistoryResponse

    // ---- Reasoning Arena (understanding-gated ranked mode) ----
    @GET("api/reasoning-duel/domains")
    suspend fun getReasoningDomains(@Header("Authorization") token: String): ReasoningDomainsResponse

    @POST("api/reasoning-duel/start")
    suspend fun startReasoningDuel(
        @Header("Authorization") token: String,
        @Body req: ReasoningStartRequest = ReasoningStartRequest()
    ): ReasoningStartResponse

    @POST("api/reasoning-duel/{id}/submit")
    suspend fun submitReasoningDuel(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Body req: ReasoningSubmitRequest
    ): ReasoningSubmitResponse

    @GET("api/reasoning-duel/{id}/review")
    suspend fun getReasoningReview(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): ReasoningReviewResponse

    // ---- Seasonal Rank Reward track ----
    @GET("api/rating/reward-track")
    suspend fun getRewardTrack(@Header("Authorization") token: String): RewardTrackResponse

    @POST("api/rating/reward-track/claim")
    suspend fun claimRewardTier(@Header("Authorization") token: String, @Body req: ClaimTierRequest): RewardClaimResponse

    // ---- Weekly tournaments (async global event) ----
    @GET("api/tournaments/current")
    suspend fun getCurrentTournament(@Header("Authorization") token: String): TournamentCurrentResponse

    @POST("api/tournaments/{id}/start")
    suspend fun startTournament(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): TournamentStartResponse

    @POST("api/tournaments/{id}/play")
    suspend fun playTournament(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Body request: TournamentPlayRequest
    ): TournamentPlayResponse

    // ---- Custom Challenges (user-created problem sets) ----
    @GET("api/challenges/concepts")
    suspend fun getChallengeConcepts(@Header("Authorization") token: String): ChallengeConceptsResponse

    @GET("api/challenges")
    suspend fun getMyChallenges(@Header("Authorization") token: String): ChallengeListResponse

    @POST("api/challenges")
    suspend fun createChallenge(
        @Header("Authorization") token: String,
        @Body request: CreateChallengeRequest
    ): CreateChallengeResponse

    @GET("api/challenges/{code}")
    suspend fun getChallenge(
        @Header("Authorization") token: String,
        @Path("code") code: String
    ): ChallengeDetailResponse

    @POST("api/challenges/{code}/play")
    suspend fun playChallenge(
        @Header("Authorization") token: String,
        @Path("code") code: String,
        @Body request: PlayChallengeRequest
    ): PlayChallengeResponse

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

    // CAS — solve an equation and return a worked, step-by-step solution (exact JS for linear,
    // SymPy for quadratics and beyond). Powers the "Show me how" solver tool.
    @POST("api/cas/solve")
    suspend fun casSolve(
        @Header("Authorization") token: String,
        @Body request: CasSolveRequest
    ): CasSolveResponse
}
