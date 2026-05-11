// src/services/gamificationServiceV2.js
import User from '~/models/userModel';
import UserStats from '~/models/userStatsModel';
import LevelReward from '~/models/levelRewardModel';
import configV2 from '~/config/gamificationV2';
import novaCoinsService from '~/services/novaCoinsService';

// ─── Helper: map activity types to the 3 Core Nova Categories ────────────
const getNovaCategory = (activityType) => {
    const move = ['workout', 'steps', 'yoga'];
    const eat = ['meal', 'water', 'food'];
    const thrive = ['mood', 'meditation', 'sleep', 'reading', 'habit', 'screen_time', 'bmr', 'menstrual', 'medicine', 'measurement'];
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

const getWeekStart = (date = new Date()) => {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() - value.getDay());
    return value;
};

const ACTIVITY_STATS_MAP = {
    mood: {
        totalCount: 'moodLogs',
        weeklyCount: 'moodLogs',
    },
    workout: {
        totalCount: 'workoutLogs',
        weeklyCount: 'workoutLogs',
        totalMinutes: 'workoutMinutes',
        valueKey: 'durationMin',
        totalValueField: 'caloriesBurned',
        totalValueKey: 'caloriesBurned',
    },
    meal: {
        totalCount: 'mealLogs',
        weeklyCount: 'mealLogs',
    },
    meditation: {
        totalCount: 'meditationLogs',
        weeklyCount: 'meditationLogs',
        totalMinutes: 'meditationMinutes',
        valueKey: 'durationMin',
    },
    yoga: {
        totalCount: 'yogaLogs',
        weeklyCount: 'yogaLogs',
        totalMinutes: 'yogaMinutes',
        valueKey: 'durationMin',
    },
    sleep: {
        totalCount: 'sleepLogs',
        weeklyCount: 'sleepLogs',
        totalMinutes: 'sleepMinutes',
        valueKey: 'durationMin',
    },
    steps: {
        totalCount: 'stepLogs',
        weeklyCount: 'stepLogs',
        totalValueField: 'steps',
        totalValueKey: 'steps',
    },
    screen_time: {
        totalCount: 'screenTimeLogs',
        weeklyCount: 'screenTimeLogs',
    },
    bmr: {
        totalCount: 'bmrLogs',
        weeklyCount: 'bmrLogs',
    },
    menstrual: {
        totalCount: 'menstrualLogs',
        weeklyCount: 'menstrualLogs',
    },
    habit: {
        totalCount: 'habitLogs',
        weeklyCount: 'habitLogs',
        totalValueField: 'habitCompletions',
        totalValueKey: 'completedCount',
    },
    medicine: {
        totalCount: 'medicineLogs',
        weeklyCount: 'medicineLogs',
    },
    reading: {
        totalCount: 'readingLogs',
        weeklyCount: 'readingLogs',
        totalMinutes: 'readingMinutes',
        valueKey: 'durationMin',
    },
    measurement: {
        totalCount: 'measurementLogs',
        weeklyCount: 'measurementLogs',
    },
};

const ensurePeriodicResets = (stats, now = new Date()) => {
    const todayDate = stats.today?.date ? new Date(stats.today.date) : new Date(0);
    const isNewDay = !isSameDay(todayDate, now);

    if (isNewDay) {
        stats.today.medalsEarnedStandard = 0;
        stats.today.coinsEarned = 0;
        stats.today.categoriesTracked = [];
        stats.today.date = now;
        stats.today.moodCoins = 0;
        stats.today.workoutCoins = 0;
        stats.today.mealCoins = 0;
        stats.today.snapMealCount = 0;
    }

    const weekStart = getWeekStart(now);
    const currentWeekStart = stats.thisWeek?.weekStart ? new Date(stats.thisWeek.weekStart) : null;
    if (!currentWeekStart || currentWeekStart.getTime() !== weekStart.getTime()) {
        stats.thisWeek.weekStart = weekStart;
        stats.thisWeek.moodLogs = 0;
        stats.thisWeek.workoutLogs = 0;
        stats.thisWeek.mealLogs = 0;
        stats.thisWeek.meditationLogs = 0;
        stats.thisWeek.yogaLogs = 0;
        stats.thisWeek.sleepLogs = 0;
        stats.thisWeek.stepLogs = 0;
        stats.thisWeek.screenTimeLogs = 0;
        stats.thisWeek.readingLogs = 0;
        stats.thisWeek.medicineLogs = 0;
        stats.thisWeek.habitLogs = 0;
        stats.thisWeek.menstrualLogs = 0;
        stats.thisWeek.bmrLogs = 0;
        stats.thisWeek.measurementLogs = 0;
    }

};

const incrementActivityStats = (stats, type, data = {}) => {
    const mapping = ACTIVITY_STATS_MAP[type];
    if (!mapping) return;

    if (mapping.totalCount) {
        stats.totals[mapping.totalCount] = (stats.totals[mapping.totalCount] || 0) + 1;
    }

    if (mapping.weeklyCount) {
        stats.thisWeek[mapping.weeklyCount] = (stats.thisWeek[mapping.weeklyCount] || 0) + 1;
    }

    if (mapping.totalMinutes && data[mapping.valueKey]) {
        stats.totals[mapping.totalMinutes] = (stats.totals[mapping.totalMinutes] || 0) + data[mapping.valueKey];
    }

    if (mapping.totalValueField && data[mapping.totalValueKey] !== undefined) {
        stats.totals[mapping.totalValueField] = (stats.totals[mapping.totalValueField] || 0) + data[mapping.totalValueKey];
    }
};

// ─── Helper: apply medals with or without the daily cap ──────────────────
const applyMedals = (base, bypassLimit, stats) => {
    if (bypassLimit) return base;
    const spaceLeft = configV2.DAILY_MEDAL_LIMIT - (stats.today.medalsEarnedStandard || 0);
    if (spaceLeft <= 0) return 0;
    return Math.min(base, spaceLeft);
};

// ─── Helper: check if two dates are the same calendar day ─────────────────
const isSameDay = (d1, d2) => {
    return d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();
};

// ─── Helper: check if d1 is exactly one calendar day before d2 ────────────
const isYesterday = (d1, d2) => {
    const yesterday = new Date(d2);
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(d1, yesterday);
};

// ─── Helper: check if a streak pause covers the missed day ────────────────
const isPauseCovering = (pausedUntil, now) => {
    if (!pausedUntil) return false;
    const pauseDate = new Date(pausedUntil);
    const dayBeforeNow = new Date(now);
    dayBeforeNow.setDate(dayBeforeNow.getDate() - 1);
    dayBeforeNow.setHours(0, 0, 0, 0);
    return pauseDate >= dayBeforeNow;
};

// ─── Main V2 processing function ─────────────────────────────────────────
export const processActivityV2 = async (userId, activity) => {
    try {
        const { type, logId, logModel, data = {} } = activity;
        const now = new Date();

        // ── Load or create user & stats ──────────────────────────────────
        let stats = await UserStats.findOne({ userId });
        if (!stats) stats = await UserStats.create({ userId });

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // ── Resolve rank config ───────────────────────────────────────────
        const rankName = user.rank || 'Awakener';
        const rankConfig = configV2.RANKS_CONFIG.find(r => r.name === rankName) || configV2.RANKS_CONFIG[0];

        ensurePeriodicResets(stats, now);
        incrementActivityStats(stats, type, data);

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
        let isNewRegularStreak = false; // first activity of a new streak day
        let regStreakBonusMedals = 0;
        let regStreakBonusNC = 0;

        const lastActive = stats.streaks?.lastActiveDate
            ? new Date(stats.streaks.lastActiveDate)
            : null;

        if (!lastActive) {
            // Brand new streak
            isNewRegularStreak = true;
            stats.streaks.current = 1;
        } else if (isSameDay(lastActive, now)) {
            // Already tracked today — streak continues, no additional streak bonus
            isStreakContinued = true;
        } else if (isYesterday(lastActive, now)) {
            // Consecutive day → increment streak
            stats.streaks.current = (stats.streaks.current || 0) + 1;
            isNewRegularStreak = true;
        } else {
            // Gap > 1 day — check if pause covers the missed day
            if (isPauseCovering(stats.streaks.regularPausedUntil, now)) {
                // Pause covers — keep streak, increment
                stats.streaks.current = (stats.streaks.current || 0) + 1;
                isNewRegularStreak = true;
            } else {
                // No pause — streak broken, restart
                stats.streaks.current = 1;
                isNewRegularStreak = true;
            }
            // Consume the pause (one-time use)
            stats.streaks.regularPausedUntil = null;
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

            events.push({ event: 'Daily Streak Bonus', medals: dailyStreakMedals, nc: configV2.ACTIONS_CONFIG.daily_regular_streak_bonus.baseNC });

            // 7-day streak milestone
            if (stats.streaks.current > 0 && stats.streaks.current % 7 === 0) {
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
                const lastNovaLog = stats.streaks.lastNovaLogDate
                    ? new Date(stats.streaks.lastNovaLogDate)
                    : null;

                if (!lastNovaLog || isYesterday(lastNovaLog, now)) {
                    // Consecutive nova day or first ever → increment
                    stats.streaks.novaCurrent = (stats.streaks.novaCurrent || 0) + 1;
                } else if (lastNovaLog && isSameDay(lastNovaLog, now)) {
                    // Same day — already counted, don't increment again
                } else {
                    // Gap > 1 day — check nova pause
                    if (isPauseCovering(stats.streaks.novaPausedUntil, now)) {
                        stats.streaks.novaCurrent = (stats.streaks.novaCurrent || 0) + 1;
                    } else {
                        // Nova-streak broken, restart
                        stats.streaks.novaCurrent = 1;
                    }
                    stats.streaks.novaPausedUntil = null;
                }

                if (stats.streaks.novaCurrent > (stats.streaks.novaLongest || 0)) {
                    stats.streaks.novaLongest = stats.streaks.novaCurrent;
                }
                stats.streaks.lastNovaLogDate = now;

                events.push({ event: 'Nova-streak Activated! Logged Eat, Move & Thrive!', medals: nsConfig.medals, nc: nsConfig.baseNC, bypassLimit: true });

                // 7-day Nova-streak milestone
                if (stats.streaks.novaCurrent > 0 && stats.streaks.novaCurrent % 7 === 0) {
                    const nsBonus = configV2.ACTIONS_CONFIG.seven_day_nova_streak_bonus;
                    novaBonusMedals += nsBonus.medals;
                    novaBonusNC += nsBonus.baseNC;
                    totalMedalsBonus += nsBonus.medals;
                    events.push({ event: `${stats.streaks.novaCurrent}-Day Nova-streak Milestone!`, medals: nsBonus.medals, nc: nsBonus.baseNC, bypassLimit: true });
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

        const prevLevel = user.level || 1;
        user.medals = (user.medals || 0) + medalsEarned;
        await user.save();

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

        stats.totals.coinsEarned = (stats.totals.coinsEarned || 0) + finalNC;
        await stats.save();

        // ═══════════════════════════════════════════════════════════════════
        // 8. CHECK QUEST COMPLETION
        // ═══════════════════════════════════════════════════════════════════
        let questsCompleted = [];
        try {
            const questService = require('~/services/questService').default;
            const fullStats = await UserStats.findOne({ userId }).lean();
            const questResult = await questService.checkQuestCompletion(userId, {
                stats: fullStats,
                streakDays: stats.streaks.current
            });
            questsCompleted = questResult?.completed || [];
            stats.totals.coinsEarned = (stats.totals.coinsEarned || 0) + (questResult?.bonusCoins || 0);
        } catch (questErr) {
            console.error('Quest check error (non-fatal):', questErr.message);
        }

        await stats.save();

        const refreshedUser = await User.findById(userId);
        if (!refreshedUser) throw new Error('User not found after quest processing');

        // ═══════════════════════════════════════════════════════════════════
        // 6. UPDATE USER LEVEL & RANK
        // ═══════════════════════════════════════════════════════════════════
        const newTotalMedals = refreshedUser.medals || 0;
        const newLevel = configV2.getLevelFromMedals(newTotalMedals);
        const newRank = configV2.LEVEL_MAP[newLevel]?.rank || refreshedUser.rank || user.rank;
        const hasLeveledUp = newLevel > prevLevel;

        refreshedUser.level = newLevel;
        refreshedUser.rank = newRank;
        await refreshedUser.save();

        // ═══════════════════════════════════════════════════════════════════
        // 9. LEVEL-UP GIFT DISPATCH
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
                    stats.totals.coinsEarned = (stats.totals.coinsEarned || 0) + gift.giftValue;
                }

                levelUpGifts.push({ level: lvl, ...gift });
            }
        }

        await stats.save();

        // ═══════════════════════════════════════════════════════════════════
        // 10. RETURN SUMMARY
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
                novaLongest: stats.streaks.novaLongest,
                boostMultiplier: maxBoost,
            },
            // Events that fired
            events,
            // Flags
            isCategoryActivation: isFirstOfCategory,
            isNovaStreak: didActivateNovaStreak,
            isStreakContinued,
            // Quest completions from this activity
            questsCompleted,
            // Level-up gifts dispatched this call
            levelUpGifts
        };

    } catch (error) {
        console.error('Gamification V2 Error:', error);
        return { error: error.message };
    }
};

// ─── Process quest completion — awards medals + NC per spec ───────────────
export const processQuestCompletion = async () => ({ error: 'Quest rewards are processed inside questService.checkQuestCompletion' });

// ─── Format V2 gamification result for controller responses ──────────────
export const formatGamificationResponse = (result) => ({
    gamification: {
        medalsEarned: result.medalsEarned || 0,
        totalMedals: result.totalMedals || 0,
        ncEarned: result.ncEarned || 0,
        level: result.level || 1,
        rank: result.rank || 'Awakener',
        hasLeveledUp: result.hasLeveledUp || false,
        streaks: result.streaks || { current: 0, longest: 0, novaCurrent: 0, novaLongest: 0 },
        events: result.events || [],
        questsCompleted: result.questsCompleted || [],
        levelUpGifts: result.levelUpGifts || [],
        isCategoryActivation: result.isCategoryActivation || false,
        isNovaStreak: result.isNovaStreak || false,
    }
});

// ─── Get User Summary ────────────────────────────────────────────────────
export const getSummary = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    let stats = await UserStats.findOne({ userId });
    if (!stats) stats = await UserStats.create({ userId });
    
    const currentLevel = user.level || 1;
    const currentTotalMedals = user.medals || 0;
    const levelConfig = configV2.LEVEL_MAP[currentLevel] || {};
    const medalsRequiredTotal = levelConfig.medalsRequiredTotal || 0;
    
    let medalsToNextLevel = medalsRequiredTotal - currentTotalMedals;
    if (medalsToNextLevel < 0) medalsToNextLevel = 0;
    
    return {
        novaCoins: user.novaCoins || 0,
        medals: currentTotalMedals,
        level: currentLevel,
        rank: user.rank || 'Awakener',
        medalsToNextLevel,
        streak: {
            current: stats.streaks?.current || 0,
            longest: stats.streaks?.longest || 0,
            novaCurrent: stats.streaks?.novaCurrent || 0,
            novaLongest: stats.streaks?.novaLongest || 0
        },
        dailyCaps: {
            medalsEarnedStandard: stats.today?.medalsEarnedStandard || 0,
            limit: configV2.DAILY_MEDAL_LIMIT,
            categoriesTracked: stats.today?.categoriesTracked || []
        }
    };
};

export default {
    processActivityV2,
    processQuestCompletion,
    formatGamificationResponse,
    getNovaCategory,
    getSummary
};
