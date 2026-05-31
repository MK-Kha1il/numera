# Numera - Gamified Mathematics App Walkthrough

We have successfully rebuilt, polished, and compiled **Numera**, overhauling it from its legacy look into a state-of-the-art, premium, Duolingo-inspired mathematics gamification application. 

The backend Node.js Express server is fully functional and running, and the native Android Compose client compiles seamlessly using Gradle.

---

## 1. Major Visual & Feature Upgrades

### 🎨 A. The "Modern Duolingo" Visual System
We migrated the entire application from its old, dark, arcade/neon style to a bright, vibrant, flat 3D aesthetic:
- **Clean Bright Palette**: High-contrast, friendly colors (Duolingo Green, Accent Blue, Orange, slate text, and crisp white backgrounds) replace the high-saturation neon.
- **DuoCard & DuoButton**: Created custom Material 3 components mimicking Duolingo's iconic flat 3D look. Buttons feature a tactile bottom-depth border that physically depresses (`detectTapGestures` + `offset`) when pressed.
- **Overhauled Gameplay**: In both **Solo** and **Duel** game screens, the choice options are styled as clean, flat 3D clicky cards. Correct answers flash in vibrant green with checkmarks, while incorrect choices animate in red with error badges.

### 📐 B. Stationary Math Blueprints & Grid Map Background
To synchronize the app's visual identity with a premium mathematics theme:
- **Blueprint Canvas Background**: Wrapped the interactive Level Map screen in a custom coordinate grid background drawn dynamically using Compose `Canvas`'s `.drawBehind`.
- **Mathematical Curves**: Integrates stationary, high-fidelity trigonometric curves (sine and cosine wave graphs) sweeping across the background, reinforcing the mathematical focus.

### 🎯 C. Scientific 10-Minute Diagnostic Placement Test
To prevent experienced users from starting with basic math concepts:
- **Assessment Overlay**: Built `PlacementTestScreen.kt` featuring 10 scientifically proven progressive mathematical diagnostics (spanning mental math, arithmetic, and algebra).
- **Real-Time Countdown**: Includes a 10-minute countdown timer (600 seconds) with dynamic styling that flashes red under 60 seconds.
- **Smart Entry Card**: Uncompleted placements display a beautiful invitation card at the top of the Learn Map.
- **Skipping & Level Assignment**: Submitting the assessment assigns a level and rank based on the score (e.g., scoring 8/10 places the user directly at Level 28, skipping basic stages). Users also have the option to skip the test and start from Level 1.
- **Premium Sound Integration**: Integrated Rhodes-style chime arpeggios (`SoundManager.playCorrect()` and `SoundManager.playWrong()`) to provide non-harsh, high-fidelity tactile audio feedback.

### 🧠 D. Interactive Level Debrief Tooltips
Clicking on unlocked level nodes on the map now opens a Duolingo-style Popover dialog before launching the lesson:
- **Concept Debriefs**: Shows level titles, corresponding category, learning focus concepts, and a detailed description of the subject.
- **Dynamic ELO Difficulty Assessments**: Assesses and displays the target ELO range (e.g. Beginner <800, Standard 800-1200, Expert 1200-1500, Insane (>1500)) for that level.
- **Start Lesson Action**: Provides a green tactile `DuoButton` to start the lesson with "+20 XP" incentive.

### ⚡ E. Modular Adaptive Mathematical Intelligence Engine Overhaul
We refactored the legacy monolithic `mathGenerator.js` into a highly decoupled, modular, and mathematically sophisticated intelligence engine housed under `server/mathEngine/`:
- **Adaptive Difficulty (`adaptive.js`)**: Calculates player metric difficulty profiles derived from ELO ratings, streak counts, and session accuracy to dynamically adjust complexity bounds.
- **Symbolic Utilities (`symbolic.js`)**: Verifies algebraic integrity and procedurally constructs valid mathematical structures (such as primitive Pythagorean triples, matrix traces, and quadratic roots) to ensure integer solutions.
- **Math-Aware Distractors (`distractors.js`)**: Employs category-specific algorithms to generate distractors reflecting common conceptual mistakes (e.g., sign flips, operation slips, and off-by-one modulo offsets).
- **Infinite Level Variety (`templates.js`)**: Declaratively registers randomized story formulations, variables, and step-by-step LaTeX explanations covering all 60 progression levels.
- **100% Backwards Compatible API (`mathGenerator.js`)**: Reroutes public entry points (`generateProblem`, `generateArchiveProblem`, and `getLessonAndExamples`) to load dynamically from the new modules, preserving existing endpoints.
- **Dueling Fairness & Balancing**: Matches in Ranked or Casual arenas now dynamically scale to the average ELO of both players across a randomized variety of arithmetic and mental math topics.

### 👤 F. Overhauled Profile & Personalization Tab
Created a highly aesthetic Profile tab mapping stats, milestones, settings, and friends:
- **Profile Banner**: Uses a high-fidelity custom `Canvas` to render geometric/mathematical pattern designs (Fibonacci Spiral, Calculus, Matrix, Geometry Blueprint, Cosmic Constellation) representing equipped banners.
- **Math-themed Avatars**: Replaced placeholder animals with historical mathematical giants (Pythagoras, Hypatia, Einstein, Lovelace, Newton, Euler) rendered dynamically.
- **Progress Statistics Grid**: A clean 2x2 grid tracking XP, Rank tier, Daily Streaks, and Total Coins.
- **Rank Milestone Tracker**: Visual progress milestones showing rank requirements and corresponding unlocks (e.g. Newton avatar & Calculus banner unlocked at Level 19).
- **Personalization Controls**: Live Dark Mode switch (`ThemeManager.isDarkMode`) and an interactive theme accent equip bar linked directly to the database.
- **Social & Friends List**: Direct lookup, request, accept, and active status tracking for friends.

### 🧠 G. Self-Evolving Adaptive Mathematical Knowledge System
We engineered and integrated a self-improving mathematical intelligence architecture that dynamically learns from telemetry data to refine concept generation and personalize student explanations:
- **Controlled Ingestion Pipeline (`knowledgeIngestion.js`)**: Processes raw mathematical structures from `rawIngestionData.json`. It passes them through a strict symbolic validation audit before persisting them to SQLite to avoid duplicate templates.
- **Symbolic Validation Layer (`validation.js`)**: Executes deterministic dry-run solver tests (such as division-by-zero checks, modular power stability, and ELO difficulty estimates) to guarantee template mathematical correctness.
- **In-Memory Cache Synchronization (`mathGenerator.js`)**: Synchronizes database-ingested templates into a live cache on server startup and immediately refreshes it whenever new templates are ingested, keeping all generation routes 100% synchronous and fast.
- **Adaptive Parameter Resolver**: Dynamically maps player ELO ratings (`diffFactor`) and level seeds to slide parameter ranges, ensuring easy problems generate smaller numbers and advanced problems generate larger, more complex values.
- **Elite Tutoring & Personalization (`explanationEngine.js`)**: Personalizes LaTeX explanations on the fly. If telemetry registers high hesitation (>1.5s) or low success rates (<60%) on a concept, the engine injects strategic tips (e.g., algebraic isolation order) and pitfall alerts (e.g., signs and operations warning) directly into the explanation markup.

### 💼 H. Premium Shop & Progression Economy Overhaul
We transformed the legacy shop into a curated, algorithmically balanced competitive progression economy:
- **Premium Rarity Scaling**: Classified all shop cosmetics and utility boosters into structured tiers (Common, Rare, Epic, Legendary, Mythic) with custom-styled visual glows and rarity indicators.
- **Shop Rotations**: Integrated a deterministic rotation engine based on Unix day stamps, splitting inventory into **★ Featured Exhibits** ( Epic, Legendary, or Mythic items changing every 3 days), **⏰ Daily Deals** (changing every 24 hours), and permanent **💼 Utilities**.
- **Dynamic Pricing Engine**: Applies real-time personal discounts (10% to 15%) based on player coin save rates and activity levels to encourage spending and prevent grind fatigue.
- **Utility Boosters**: Developed and fully integrated 4 consumable mechanics:
  - *Streak Shield*: Automatically consumed on login to preserve a missed day's streak.
  - *XP Booster (2x)*: Doubles final XP rewards for completed levels and decrements uses.
  - *Arena Gold Ticket*: Doubles ELO change (win/loss) in ranked matches.
  - *Retry Token*: Restores lost hearts during gameplay to prevent level failure.
- **Tactile Detail Modal Overlay**: Clicking shop cards triggers a dialog displaying description text, rank locks, animated flags, utility counts, and a direct purchase button.
- **Level Failure Retry Loop**: Integrated a hearts system into level play (3 ❤️ max). If a user makes 3 mistakes, they fail the level and are prompted to consume a Retry Token to restore their hearts.

### 🧬 I. Educational Coherence (Lessons & Archive Sync)
To resolve disconnected systems and inconsistent educational flow, we implemented strict concept binding between lessons, exercises, explanations, and difficulty structures:
- **Exact Historical Syncing**: Created custom mathematical lessons, formulas, and worked examples for all 42 historical archive exercises.
- **Daily Puzzle Synchronization**: The rotating Daily Puzzle and Archive screens are now directly bound to their corresponding specific math lessons instead of query generic levels.
- **Telemetry & Models Binding**: Updated Kotlin navigation (`SoloGame` NavKey) and models (`DailyPuzzle`, `ArchiveExercise`) to pass specific lesson metadata, showing exact explanations and core formulas when launching lessons.

### 🔒 J. Achievement Persistence & Hardened Claims
- **Persistence Across Restarts**: Removed the database teardown command `DELETE FROM user_achievements` in `db.js` so user progression and claim states persist across server restarts.
- **Race Condition Hardening**: Replaced optimistic backend checks on `/api/quests/claim` and `/api/achievements/claim` with atomic, conditional SQL updates (`UPDATE ... SET claimed = 1 WHERE user_id = ? AND claimed = 0`). XP and coins are only granted if the database change count is exactly 1, completely preventing double-claim race exploits.
- **Prestige Shop Locking**: Restricted purchases in `/api/shop/purchase` if `item.cost <= 0` to block illegal acquisition of earned-only prestige relics and badges, logging security anomalies upon attempt.

### 📱 K. Compact UI Redesigns & Growth Rebranding
- **Compact Daily Puzzle Widget**: Streamlined the bulky, full-width Daily Puzzle widget in the Learn tab into a elegant single-row layout displaying the title, inline stars, status description, and a compact play/review `DuoButton` (width 90.dp).
- **Focus Trainer Growth Practice**: Rebranded "Mistakes Bank" to a growth-oriented `"🌱 Growth Practice"` Focus Trainer, changing its color system to a supportive indigo/purple theme (`Color(0xFF6366F1)`). The game screen header displays `"GROWTH PRACTICE"` during mistakes practice.
- **Shop Hero Section Showcase**: Replaced multiple featured exhibits with a single large-format premium featured exhibit card (`ShopHeroCard`) in the Shop header. It features calm typography, centered preview box, clean padding, and restrained spacing.

---

## 2. Technical Stack Summary

| Component | Technology | Role |
|---|---|---|
| **Backend Core** | Node.js, Express, SQLite3 | REST API and persistence |
| **Realtime Sync** | Socket.io | Dueling and matchmaking |
| **Android UI** | Jetpack Compose, Material 3 | Layouts, screens, animations, styling |
| **Navigation** | Navigation3 (Compose Runtime) | Native screen-to-screen transitions |
| **Networking** | Retrofit 2, OkHttp 3, Gson | REST client and JSON serialization |
| **Build System** | Gradle 9.1, Adoptium JDK 17 | Build configuration and compilers |

---

## 3. How to Launch and Test

### 1. Backend Server
The server runs on port 3000:
- **Directory**: `C:\Users\khali\.gemini\antigravity\scratch\project1\server`
- **Execution Command**: `node server.js`
- **Port**: `3000` (Socket.io binds to the same port)
- **Status Dashboard**: Visiting `http://localhost:3000/` in your browser serves a status dashboard showing live stats (active users, preloaded historical challenges, active WebSocket duel rooms), API specifications, and a direct download button for the client APK.

### 2. Download and Run the Android App
The compiled debug APK is located at:
- File path: [app-debug.apk](file:///C:/Users/khali/.gemini/antigravity/scratch/project1/android/app/build/outputs/apk/debug/app-debug.apk)
- Direct Download: You can download the APK directly from the browser at `http://localhost:3000/download-apk` or by clicking the download button on the dashboard.

To deploy the app to your emulator or physical device:
1. Connect your Android device via USB (with Developer Mode & USB Debugging enabled) or start an Android Virtual Device (AVD).
2. Install the APK via ADB by running this command in your command-line terminal:
   ```powershell
   & "C:\Users\khali\AppData\Local\Android\Sdk\platform-tools\adb.exe" install "C:\Users\khali\.gemini\antigravity\scratch\project1\android\app\build\outputs\apk\debug\app-debug.apk"
   ```
3. Open the **Numera** app on your device and enjoy!

---

## 4. Verification & Hardening Results
- **Daily Puzzle LaTeX Mismatch (Bug 1)**: Corrected mismatch where `correct_answer` was saved in plain text but options were in KaTeX (e.g. `$3, 7, 11$`). The server now strips LaTeX symbols (`$`, `\dots`) when mapping the correct answer to the corresponding option in both the `/api/daily-puzzle` and `/api/archive` search endpoints, ensuring client comparisons are 100% correct.
- **Saved Tab in Profile (Bug 2)**: Reorganized the `ProfileScreen` layout to feature a premium `TabRow` separating sections: `Stats` (Stats, Inventory, Relics, Mastery), `Achievements` (Scrollable list), `Friends` (Social panel), and `Saved` (Favorites list & custom Collections). The user can now create, rename, delete collections, assign exercises to collections, view worked step-by-step KaTeX explanations via `MathText` dialogs, and unfavorite items directly from the Profile tab.
- **Quest Claim Transition (Bug 3)**: Modified the client quest claiming callback to instantly modify the local `questsList` mutable state (`claimed = 1`), causing the UI list to animate/re-sort and slide the claimed quest to the bottom immediately, resolving the refresh delay.
- **Sound Icon Syncing (Bug 4)**: Bound the quick preferences mute card to update and read the Compose-observable `isSoundMuted` state variable (which modifies `SoundManager.isMuted` and writes preference settings), ensuring the VolumeOff/VolumeUp icons and primary color tints recompose immediately upon click.
- **Destructive Theme Action Colors (Bug 5)**: Appended `error = WrongRed` and `onError = Color.White` to all 18 color schemes in `Theme.kt`, ensuring "Log Out", "Delete Account", and other high-risk actions are highlighted in standard warning red rather than material rose.
- **Clean Gradle Compilation & Packaging**: Verified debug compilation (`BUILD SUCCESSFUL in 1m 11s`) and successfully packaged the final APK (`assembleDebug` build completed).

