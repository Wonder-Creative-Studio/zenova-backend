# Gamification Integration

## Overview
- `src/services/gamificationServiceV2.js` is the single entry point for activity-driven gamification.
- Activity controllers should call `processActivityV2(userId, activity)` immediately after saving the source log.
- The V2 service updates:
  - `UserStats` daily and weekly counters
  - regular streak and Nova-streak progress
  - medals, level, and rank
  - Nova Coin transaction history
  - quest completion checks
  - level-up gifts

## Activity Flow
1. Save the source activity log, such as meal, mood, workout, meditation, yoga, sleep, steps, or reading.
2. Call `gamificationServiceV2.processActivityV2(...)` with:
   - `type`
   - `logId`
   - `logModel`
   - optional activity `data`
3. Return `gamificationServiceV2.formatGamificationResponse(result)` to the app.

## Coins, Medals, and Caps
- Base tracking follows `src/config/gamificationV2.js`.
- Rank multiplier and streak multiplier both affect earned Nova Coins.
- Daily medal cap applies only to standard medals.
- Nova-streak medals bypass the standard daily medal cap.
- Daily Nova Coin cap is enforced from rank config, then increased by streak boosts.

## Streaks
- Regular streak starts when the user logs any supported activity on consecutive days.
- Nova-streak starts when the user logs all 3 core categories in one day:
  - `eat`
  - `move`
  - `thrive`
- Every 7 regular streak days increases the coin boost by 10%, capped at 150%.
- Every 7 Nova-streak days increases the coin boost by 20%, capped at 200%.
- When both apply, Nova-streak boost takes precedence.

## Quests
- Quest definitions live in the `quests` collection.
- Supported quest categories:
  - `daily`
  - `weekly`
  - `monthly`
  - `milestone`
  - `special`
- Completion rewards come from the quest document:
  - `rewardCoins`
  - `rewardMedals`
- Quest completion is idempotent per reset window:
  - once per day for `daily`
  - once per week for `weekly`
  - once per month for `monthly`
  - once ever for one-shot quests

## Onboarding Reward
- Completing onboarding credits `1000` Nova Coins once.
- The onboarding controller checks the prior `isOnboarded` state to keep the reward idempotent.

## Meals
- Meal logs now support `isLiked`.
- Meal APIs include:
  - per-slot meal regeneration
  - delete meal log
  - like or unlike meal log

## Mood Suggestions
- Mood suggestions are rule-based for now.
- Mood APIs return a structured suggestion card with:
  - activity type
  - duration
  - CTA label
  - reward info
  - completion state
- Supported activity completions can auto-close the pending suggestion and award the extra mood reward:
  - `meditation`
  - `yoga`
  - `workout`

## Requirement Sheet Notes
- Preserved from the current V2 logic:
  - onboarding reward of 1000 Nova Coins
  - rank multipliers
  - daily medal cap
  - daily Nova Coin cap
  - regular streak and Nova-streak boost behavior
- Intentional backend choice:
  - quest reward source is the quest document, not a second hardcoded reward layer
  - mood suggestions remain rule-based rather than AI-generated or hard-linked to content records
