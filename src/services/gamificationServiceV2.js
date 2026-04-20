// src/services/gamificationServiceV2.js
import User from '~/models/userModel';
import UserStats from '~/models/userStatsModel';
import LevelReward from '~/models/levelRewardModel';
import configV2 from '~/config/gamificationV2';
import novaCoinsService from '~/services/novaCoinsService';

// ─── Helper: map activity types to the 3 Core Nova Categories ────────────
const getNovaCategory = (activityType) => {
    const move = ['workout', 'steps', 'yoga'];
    const eat = ['meal', 'water'];
    const thrive = ['mood', 'meditation', 'sleep', 'reading', 'habit', 'screen_time'];
    if (move.includes(activityType)) return 'move';
    if (eat.includes(activityType)) return 'eat';
    if (thrive.includes(activityType)) return 'thrive';
    return null;
};

// ─── Helper: awardCoins wrapper (skips test stubs) ────────────────────────
const award = async (userId, payload, logId = null, logModel = null) => {
    const p = { ...payload };
    if (logId && logId !== 'test_log') {
        p.refId = logId;
        p.refModel = logModel;
    }
    return novaCoinsService.awardCoins(userId, p);
};

// ─── Helper: apply medals with or without the daily cap ──────────────────
const applyMedals = (base, bypassLimit, stats) => {
    if (bypassLimit) return base;
    const spaceLeft = configV2.DAILY_MEDAL_LIMIT - (stats.today.medalsEarnedStandard || 0);
    if (spaceLeft <= 0) return 0;
    return Math.min(base, spaceLeft);
};

// ─── Main V2 processing function ─────────────────────────────────────────
export const processActivityV2 = async (userId, activity) => {
    try {
        const { type, logId, logModel } = activity;
        const now = new Date();

        // ── Load or create user & stats ──────────────────────────────────
        let stats = await UserStats.findOne({ userId });
        if (!stats) stats = await UserStats.create({ userId });

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // ── Resolve rank config ───────────────────────────────────────────
        const rankName = user.rank || 'Awakener';
        const rankConfig = configV2.RANKS_CONFIG.find(r => r.name === rankName) || configV2.RANKS_CONFIG[0];

        // ── Daily reset ───────────────────────────────────────────────────
        const todayDate = stats.today?.date ? new Date(stats.today.date) : new Date(0);
        const isNewDay = todayDate.getDate() !== now.getDate() ||
            todayDate.getMonth() !== now.getMonth() ||
            todayDate.getFullYear() !== now.getFullYear();

        if (isNewDay) {
            stats.today.medalsEarnedStandard = 0;
            stats.today.coinsEarned = 0;
            stats.today.categoriesTracked = [];
            stats.today.date = now;
        }

        // ── Accumulators for this call ────────────────────────────────────
        let totalMedalsFromTracking = 0; // contributes toward daily cap
        let totalMedalsBonus = 0; // bypass-limit medals
        let totalNC = 0;
        const events = [];

        // ═══════════════════════════════════════════════════════════════════
        // 1. TRACK ITEM — base 1 medal, not capped per item but overall cap applies
        // ═══════════════════════════════════════════════════════════════════
        const trackMedals = applyMedals(
            configV2.ACTIONS_CONFIG.track_item.medals,
            configV2.ACTIONS_CONFIG.track_item.bypassLimit,
            stats
        );
        const trackNC = configV2.ACTIONS_CONFIG.track_item.baseNC;

        stats.today.medalsEarnedStandard += trackMedals;
        totalMedalsFromTracking += trackMedals;
        totalNC += trackNC;
        events.push({ event: `Tracked ${type}`, medals: trackMedals, nc: trackNC });

        // ═══════════════════════════════════════════════════════════════════
        // 2. REGULAR STREAK — update daily streak, award streak bonuses
        // ═══════════════════════════════════════════════════════════════════
        let isStreakContinued = false;
        let isNewRegularStreak = false; // first day of a fresh streak
        let regStreakBonusMedals = 0;
        let regStreakBonusNC = 0;

        const lastActive = stats.streaks?.lastActiveDate
            ? new Date(stats.streaks.lastActiveDate)
            : null;

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (!lastActive) {
            // Brand new streak
            isNewRegularStreak = true;
            stats.streaks.current = 1;
        } else {
            const lastDay = lastActive.getDate();
            const lastMon = lastActive.getMonth();
            const lastYr = lastActive.getFullYear();

            const isToday = lastDay === now.getDate() && lastMon === now.getMonth() && lastYr === now.getFullYear();
            const isYesterday = lastDay === yesterday.getDate() && lastMon === yesterday.getMonth() && lastYr === yesterday.getFullYear();

            if (isToday) {
                // Already tracked today — streak continues but no additional streak bonus this call
                isStreakContinued = true;
            } else if (isYesterday) {
                // Consecutive day → increment streak
                stats.streaks.current = (stats.streaks.current || 0) + 1;
                isNewRegularStreak = true;
            } else {
                // Streak broken — check if pause is active (covers the missed day)
                const pausedUntil = stats.streaks.regularPausedUntil
                    ? new Date(stats.streaks.regularPausedUntil)
                    : null;
                const dayBeforeNow = new Date(now);
                dayBeforeNow.setDate(dayBeforeNow.getDate() - 1);
                dayBeforeNow.setHours(0, 0, 0, 0);

                if (pausedUntil && pausedUntil >= dayBeforeNow) {
                    // Pause covers the missed day — keep streak, just increment as if yesterday
                    stats.streaks.current = (stats.streaks.current || 0) + 1;
                    isNewRegularStreak = true;
                } else {
                    // No pause — streak broken, restart
                    stats.streaks.current = 1;
                    isNewRegularStreak = true;
                }
                // Consume the pause regardless (one-time use)
                stats.streaks.regularPausedUntil = null;
            }
        }

        if (stats.streaks.current > (stats.streaks.longest || 0)) {
            stats.streaks.longest = stats.streaks.current;
        }
        stats.streaks.lastActiveDate = now;

        // Award daily streak bonus only on a new streak day (not duplicate in same day)
        if (isNewRegularStreak) {
            const dailyStreakMedals = applyMedals(
                configV2.ACTIONS_CONFIG.daily_regular_streak_bonus.medals,
                configV2.ACTIONS_CONFIG.daily_regular_streak_bonus.bypassLimit,
                stats
            );
            regStreakBonusMedals += dailyStreakMedals;
            regStreakBonusNC += configV2.ACTIONS_CONFIG.daily_regular_streak_bonus.baseNC;
            stats.today.medalsEarnedStandard += dailyStreakMedals;

            // 7-day streak milestone
            if (stats.streaks.current % 7 === 0) {
                const sevenDayMedals = applyMedals(
                    configV2.ACTIONS_CONFIG.seven_day_regular_streak_bonus.medals,
                    configV2.ACTIONS_CONFIG.seven_day_regular_streak_bonus.bypassLimit,
                    stats
                );
                regStreakBonusMedals += sevenDayMedals;
                regStreakBonusNC += configV2.ACTIONS_CONFIG.seven_day_regular_streak_bonus.baseNC;
                stats.today.medalsEarnedStandard += sevenDayMedals;
                events.push({ event: `${stats.streaks.current}-Day Streak Milestone!`, medals: sevenDayMedals, nc: configV2.ACTIONS_CONFIG.seven_day_regular_streak_bonus.baseNC });
            }

            events.push({ event: 'Daily Streak Bonus', medals: regStreakBonusMedals, nc: regStreakBonusNC });
        }

        // ═══════════════════════════════════════════════════════════════════
        // 3. CATEGORY ACTIVATION — first item per Eat / Move / Thrive today
        // ═══════════════════════════════════════════════════════════════════
        const novaCategory = getNovaCategory(type);
        let categoriesTrackedToday = stats.today?.categoriesTracked || [];
        let isFirstOfCategory = false;
        let didActivateNovaStreak = false;
        let novaBonusMedals = 0;
        let novaBonusNC = 0;

        if (novaCategory && !categoriesTrackedToday.includes(novaCategory)) {
            categoriesTrackedToday.push(novaCategory);
            isFirstOfCategory = true;

            const catMedals = applyMedals(
                configV2.ACTIONS_CONFIG.category_activation.bonusMedal,
                configV2.ACTIONS_CONFIG.category_activation.bypassLimit,
                stats
            );
            stats.today.medalsEarnedStandard += catMedals;
            totalMedalsFromTracking += catMedals;
            totalNC += configV2.ACTIONS_CONFIG.category_activation.baseNC;
            events.push({ event: `${novaCategory} Category Activated`, medals: catMedals, nc: configV2.ACTIONS_CONFIG.category_activation.baseNC });

            // ─── Nova-streak activation: all 3 categories done today ──────
            if (
                categoriesTrackedToday.includes('move') &&
                categoriesTrackedToday.includes('eat') &&
                categoriesTrackedToday.includes('thrive')
            ) {
                didActivateNovaStreak = true;

                const nsConfig = configV2.ACTIONS_CONFIG.nova_streak_activation;
                novaBonusMedals += nsConfig.medals; // bypass — added separately
                novaBonusNC += nsConfig.baseNC;
                totalMedalsBonus += nsConfig.medals;

                // Update Nova-streak counts
                let nsCurrent = stats.streaks.novaCurrent || 0;
                let nsLongest = stats.streaks.novaLongest || 0;
                nsCurrent += 1;
                if (nsCurrent > nsLongest) nsLongest = nsCurrent;
                stats.streaks.novaCurrent = nsCurrent;
                stats.streaks.novaLongest = nsLongest;
                stats.streaks.lastNovaLogDate = now;

                events.push({ event: 'Nova-streak Activated! Logged Eat, Move & Thrive!', medals: nsConfig.medals, nc: nsConfig.baseNC, bypassLimit: true });

                // 7-day Nova-streak milestone
                if (nsCurrent % 7 === 0) {
                    const nsBonus = configV2.ACTIONS_CONFIG.seven_day_nova_streak_bonus;
                    novaBonusMedals += nsBonus.medals;
                    novaBonusNC += nsBonus.baseNC;
                    totalMedalsBonus += nsBonus.medals;
                    events.push({ event: `${nsCurrent}-Day Nova-streak Milestone!`, medals: nsBonus.medals, nc: nsBonus.baseNC, bypassLimit: true });
                }
            }
        }

        stats.today.categoriesTracked = categoriesTrackedToday;

        // ═══════════════════════════════════════════════════════════════════
        // 4. COMPUTE NC with rank multiplier + streak boosts + daily cap
        // ═══════════════════════════════════════════════════════════════════
        // Nova-streak boost (20%/week, cap 200%) supersedes regular streak boost (10%/week, cap 150%)
        const regStreakWeeks = Math.floor((stats.streaks.current || 0) / 7);
        const novaStreakWeeks = Math.floor((stats.streaks.novaCurrent || 0) / 7);

        let maxBoost = 1.0;
        if (novaStreakWeeks > 0) {
            maxBoost = Math.min(2.0, 1.0 + (0.20 * novaStreakWeeks));
        } else if (regStreakWeeks > 0) {
            maxBoost = Math.min(1.5, 1.0 + (0.10 * regStreakWeeks));
        }

        const finalMaxDailyNC = rankConfig.maxDailyNC * maxBoost;
        const rawNC = (totalNC + regStreakBonusNC + novaBonusNC) * rankConfig.ncMultiplier;
        const ncSpaceLeft = finalMaxDailyNC - (stats.today.coinsEarned || 0);
        const finalNC = ncSpaceLeft <= 0 ? 0 : Math.floor(Math.min(rawNC, ncSpaceLeft));

        stats.today.coinsEarned += finalNC;

        // ═══════════════════════════════════════════════════════════════════
        // 5. MEDALS TOTAL
        // ═══════════════════════════════════════════════════════════════════
        const medalsEarnedStandard = totalMedalsFromTracking + regStreakBonusMedals;
        const medalsEarnedBonus = novaBonusMedals; // bypass-limit medals
        const medalsEarned = medalsEarnedStandard + medalsEarnedBonus;

        // ═══════════════════════════════════════════════════════════════════
        // 6. UPDATE USER LEVEL & RANK
        // ═══════════════════════════════════════════════════════════════════
        const prevLevel = user.level || 1;
        const newTotalMedals = (user.medals || 0) + medalsEarned;
        const newLevel = configV2.getLevelFromMedals(newTotalMedals);
        const newRank = configV2.LEVEL_MAP[newLevel]?.rank || user.rank;
        const hasLeveledUp = newLevel > prevLevel;

        user.medals = newTotalMedals;
        user.level = newLevel;
        user.rank = newRank;
        await user.save();
        await stats.save();

        // ═══════════════════════════════════════════════════════════════════
        // 7. AWARD NOVA COINS via transaction layer
        // ═══════════════════════════════════════════════════════════════════
        if (finalNC > 0) {
            await award(userId, {
                amount: finalNC,
                type: 'activity_reward',
                category: type,
                description: events.map(e => e.event).join(' | ')
            }, logId, logModel);
        }

        // ═══════════════════════════════════════════════════════════════════
        // 8. LEVEL-UP GIFT DISPATCH
        // ═══════════════════════════════════════════════════════════════════
        const levelUpGifts = [];
        if (hasLeveledUp) {
            for (let lvl = prevLevel + 1; lvl <= newLevel; lvl++) {
                const gift = configV2.getLevelGift(lvl);
                if (!gift) continue;

                // Idempotency: skip if already dispatched
                const alreadyGiven = await LevelReward.findOne({ userId, level: lvl });
                if (alreadyGiven) continue;

                // Record the dispatch
                await LevelReward.create({
                    userId,
                    level: lvl,
                    giftType: gift.giftType,
                    giftValue: gift.giftValue,
                    giftLabel: gift.giftLabel
                });

                // If the gift is Nova Coins, award them immediately
                if (gift.giftType === 'nova_coins') {
                    await award(userId, {
                        amount: gift.giftValue,
                        type: 'level_up_reward',
                        category: 'level_up',
                        description: `Level ${lvl} reward: ${gift.giftLabel}`
                    }, logId, logModel);
                }

                levelUpGifts.push({ level: lvl, ...gift });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // 9. RETURN SUMMARY
        // ═══════════════════════════════════════════════════════════════════
        const currentLevelData = configV2.LEVEL_MAP[newLevel] || {};
        return {
            // Medals
            medalsEarned,
            medalsEarnedStandard,
            medalsEarnedBonus,
            totalMedals: newTotalMedals,
            dailyMedalsStandardUsed: stats.today.medalsEarnedStandard,
            dailyMedalsStandardRemaining: Math.max(0, configV2.DAILY_MEDAL_LIMIT - stats.today.medalsEarnedStandard),
            // NC
            ncEarned: finalNC,
            // Level & Rank
            level: newLevel,
            rank: newRank,
            hasLeveledUp,
            medalsToNextLevel: currentLevelData.medalsRequiredTotal
                ? currentLevelData.medalsRequiredTotal - newTotalMedals
                : 0,
            // Streaks
            streaks: {
                current: stats.streaks.current,
                longest: stats.streaks.longest,
                novaCurrent: stats.streaks.novaCurrent,
                novaLongest: stats.streaks.novaLongest
            },
            // Events that fired
            events,
            // Flags
            isCategoryActivation: isFirstOfCategory,
            isNovaStreak: didActivateNovaStreak,
            isStreakContinued,
            // Level-up gifts dispatched this call
            levelUpGifts
        };

    } catch (error) {
        console.error('Gamification V2 Error:', error);
        return { error: error.message };
    }
};

export default {
    processActivityV2,
    getNovaCategory
};
