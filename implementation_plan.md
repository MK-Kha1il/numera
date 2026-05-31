# Implementation Plan - Placement Test, Profile Banners, Rank Rewards, & Detailed Profile Tab

We will enhance the app by adding a scientifically-proven diagnostic placement test, customizable profile banners, rank rewards (unlocking banners and avatars upon ranking up), fixing the rank progression to have exactly 3 divisions per rank tier, and introducing a detailed Profile/Progress tab containing a dark mode toggle and friends list.

## User Review Required

> [!IMPORTANT]
> **Placement Assessment**: Upon registering or logging in for the first time, users can choose to take a **10-minute Placement Test** consisting of 10 adaptive questions across math categories (Arithmetic, Equations, Geometry, Sequences, Calculus). Completing the test skips basic content and sets their starting level/rank directly (up to Level 13, Gold III!).
>
> **Rank Rewards**: Players will earn rewards as they reach new rank milestones:
> - **Silver III**: Unlocks **Hypatia** avatar and **Fibonacci Golden Spiral** banner
> - **Gold III**: Unlocks **Newton** avatar and **Calculus integrals** banner
> - **Platinum III**: Unlocks **Lovelace** avatar and **Matrix code** banner
> - **Diamond III**: Unlocks **Euler** avatar and **Geometry blueprint** banner
> - **Master III**: Unlocks **Einstein** avatar and **Cosmic constellation** banner
>
> **Dedicated Profile Tab**: We will reorganize navigation to feature 5 clean bottom-bar icons:
> 1. **Learn (Path)**: Level Map, Spaced Repetition reviews, Diagnostic Test prompt.
> 2. **Arena**: Duel queue and invites.
> 3. **Quests**: Leaderboards and Achievements list.
> 4. **Shop**: Equipping themes and purchased active items.
> 5. **Profile**: Displays your custom Banner, Avatar, stats, rank rewards progress, Friends list, and Dark Mode toggle.

## Proposed Changes

### 1. Database & Backend Component (`server/`)

#### [MODIFY] [db.js](file:///C:/Users/khali/.gemini/antigravity/scratch/project1/server/db.js)
- Add migration `ALTER TABLE users ADD COLUMN active_banner TEXT DEFAULT 'banner_default'`.
- Add migration `ALTER TABLE users ADD COLUMN assessment_taken INTEGER DEFAULT 0`.

#### [MODIFY] [server.js](file:///C:/Users/khali/.gemini/antigravity/scratch/project1/server/server.js)
- Fix the Rank-calculation algorithm:
  - Each tier (Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster) has exactly 3 divisions (`III`, `II`, `I`) with 3 levels per division (e.g., Bronze III: levels 1-3, Bronze II: 4-6, Bronze I: 7-9; Silver III starts at level 10).
- Add rank rewards lookup that auto-grants matching avatars and banners into `user_inventory` when a user reaches a tier.
- Add `/api/assessment/questions` endpoint returning 10 structured diagnostic problems of increasing difficulty.
- Add `/api/assessment/submit` endpoint that takes the placement score and sets the user's starting level, rank, grants them unlocked rewards, and marks `assessment_taken = 1`.
- Add `/api/assessment/skip` endpoint that skips placement, setting `assessment_taken = 1` while starting at Level 1.
- Update `/api/auth/me`, `/api/friends`, `/api/leaderboard`, and `/api/shop/equip` to handle `active_banner` and `assessment_taken`.

---

### 2. Android Shared Models & Utilities

#### [MODIFY] [Models.kt](file:///C:/Users/khali/.gemini/antigravity/scratch/project1/android/app/src/main/java/com/example/numera/data/network/Models.kt)
- Update `User` and `Friend` models to include `active_banner` and `assessment_taken`.
- Add data classes: `AssessmentSubmitRequest`, `AssessmentSubmitResponse`.

#### [MODIFY] [ApiService.kt](file:///C:/Users/khali/.gemini/antigravity/scratch/project1/android/app/src/main/java/com/example/numera/data/network/ApiService.kt)
- Add `/api/assessment/questions`, `/api/assessment/submit`, and `/api/assessment/skip` retrofit definitions.

#### [MODIFY] [Avatar.kt](file:///C:/Users/khali/.gemini/antigravity/scratch/project1/android/app/src/main/java/com/example/numera/ui/components/Avatar.kt)
- Add `MathBanners` lookup helper defining banner labels, gradient backgrounds, or drawing compositions for:
  - `banner_default`
  - `banner_fibonacci`
  - `banner_calculus`
  - `banner_matrix`
  - `banner_geometry`
  - `banner_cosmos`

---

### 3. Android Screen Overhaul & Polish

#### [NEW] [PlacementTestScreen.kt](file:///C:/Users/khali/.gemini/antigravity/scratch/project1/android/app/src/main/java/com/example/numera/ui/screens/PlacementTestScreen.kt)
- Design an elegant placement test interface with a 10-minute countdown timer, progress bar, multi-choice adaptive math questions, and a final celebration screen highlighting the user's starting level, division, and unlocked items.

#### [MODIFY] [MainTabsScreen.kt](file:///C:/Users/khali/.gemini/antigravity/scratch/project1/android/app/src/main/java/com/example/numera/ui/screens/MainTabsScreen.kt)
- Reorganize bottom navigation tabs.
- **Learn Tab**: Display a welcoming card to take the diagnostic test if `assessment_taken == 0`.
- **Profile Tab**: Create a beautiful, full-width profile card rendering the equipped **Profile Banner**, overlapping avatar profile photo, user name, level progress slider, detailed stats grid (Solved, Duels Won, Streaks, Coins), a list of unlockable rank rewards, a full Friends list management panel, and settings (Dark Mode switch, theme chooser, and logout).

---

## Verification Plan

### Automated Tests
- Run Gradle compiler to verify:
  ```powershell
  $env:JAVA_HOME="C:\Users\khali\AppData\Roaming\.minecraft\runtime\java-runtime-gamma\windows\java-runtime-gamma"; .\gradlew.bat compileDebugKotlin
  ```

### Manual Verification
- Register a new account and verify the Diagnostic placement test card appears on the Learn map.
- Take the test, answer 8 questions correctly, and confirm you start at **Silver III (Level 10)** with the Hypatia avatar and Fibonacci banner unlocked.
- Verify that toggling Dark Mode inside the Profile tab updates the entire app (including headers, buttons, cards) to radiant obsidian styles.
