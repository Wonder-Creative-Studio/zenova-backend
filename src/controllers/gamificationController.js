// src/controllers/gamificationController.js
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationService from '~/services/gamificationService';
import gamificationServiceV2 from '~/services/gamificationServiceV2';
import novaCoinsService from '~/services/novaCoinsService';
import questService from '~/services/questService';
import statsService from '~/services/statsService';
import NovaTransaction from '~/models/novaTransactionModel';
import LevelReward from '~/models/levelRewardModel';
import UserStats from '~/models/userStatsModel';
import User from '~/models/userModel';
import configV2 from '~/config/gamificationV2';

/**
 * Get complete gamification summary
 * GET /api/gamification/summary
 */
export const getSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const summary = await gamificationService.getSummary(userId);

        return res.json({
            success: true,
            data: summary,
            message: 'Gamification summary fetched successfully',
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            data: {},
            message: err.message || 'Failed to fetch gamification summary',
        });
    }
};

/**
 * Get NovaCoins balance
 * GET /api/gamification/coins/balance
 */
export const getCoinsBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const balance = await novaCoinsService.getBalance(userId);

        return res.json({
            success: true,
            data: { balance },
            message: 'NovaCoins balance fetched successfully',
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            data: {},
            message: err.message || 'Failed to fetch NovaCoins balance',
        });
    }
};

/**
 * Get NovaCoins transaction history
 * GET /api/gamification/coins/history
 */
export const getCoinsHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, category } = req.query;

        const history = await novaCoinsService.getHistory(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            category
        });

        // Get total count
        const totalCount = await NovaTransaction.countDocuments({ userId });

        return res.json({
            success: true,
            data: {
                transactions: history,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / parseInt(limit))
                }
            },
            message: 'NovaCoins history fetched successfully',
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            data: {},
            message: err.message || 'Failed to fetch NovaCoins history',
        });
    }
};

/**
 * Get earnings breakdown by category
 * GET /api/gamification/coins/earnings
 */
export const getEarningsBreakdown = async (req, res) => {
    try {
        const userId = req.user.id;
        const earnings = await novaCoinsService.getEarningsByCategory(userId);

        return res.json({
            success: true,
            data: { earnings },
            message: 'Earnings breakdown fetched successfully',
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            data: {},
            message: err.message || 'Failed to fetch earnings breakdown',
        });
    }
};

/**
 * Get user quests with progress
 * GET /api/gamification/quests
 */
export const getQuests = async (req, res) => {
    try {
        const userId = req.user.id;
        const quests = await questService.getUserQuests(userId);

        const completed = quests.filter(q => q.isCompleted);
        const active = quests.filter(q => !q.isCompleted);

        return res.json({
            success: true,
            data: {
                active,
                completed,
                total: quests.length,
                completedCount: completed.length
            },
            message: 'Quests fetched successfully',
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            data: {},
            message: err.message || 'Failed to fetch quests',
        });
    }
};

/**
 * Get user stats
 * GET /api/gamification/stats
 */
export const getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await statsService.getStats(userId);

        return res.json({
            success: true,
            data: {
                totals: stats.totals,
                streaks: stats.streaks,
                thisWeek: stats.thisWeek,
                today: stats.today
            },
            message: 'User stats fetched successfully',
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            data: {},
            message: err.message || 'Failed to fetch user stats',
        });
    }
};

/**
 * Get leaderboard
 * GET /api/gamification/leaderboard
 */
export const getLeaderboard = async (req, res) => {
    try {
        const { type = 'coins', limit = 10 } = req.query;
        const userId = req.user.id;

        // Import User here to avoid circular dependency
        const User = require('~/models/userModel').default;

        let sortField;
        if (type === 'coins') {
            sortField = { novaCoins: -1 };
        } else if (type === 'streak') {
            sortField = { 'streaks.current': -1 };
        } else {
            sortField = { level: -1 };
        }

        const leaderboard = await User.find()
            .sort(sortField)
            .limit(parseInt(limit))
            .select('name novaCoins level profilePicture');

        // Find current user's rank
        const userRank = await User.countDocuments({
            novaCoins: { $gt: (await User.findById(userId).select('novaCoins'))?.novaCoins || 0 }
        }) + 1;

        return res.json({
            success: true,
            data: {
                leaderboard: leaderboard.map((user, index) => ({
                    rank: index + 1,
                    id: user._id,
                    name: user.name,
                    novaCoins: user.novaCoins || 0,
                    level: user.level || 1,
                    profilePicture: user.profilePicture
                })),
                userRank,
                type
            },
            message: 'Leaderboard fetched successfully',
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            data: {},
            message: err.message || 'Failed to fetch leaderboard',
        });
    }
};

/**
 * Get user's level-up reward history
 * GET /api/gamification/level-rewards
 */
export const getLevelRewards = async (req, res) => {
    try {
        const userId = req.user.id;
        const rewards = await LevelReward.find({ userId }).sort({ level: 1 });

        return res.json({
            success: true,
            data: { rewards, total: rewards.length },
            message: 'Level rewards fetched successfully',
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            data: {},
            message: err.message || 'Failed to fetch level rewards',
        });
    }
};

/**
 * Test V2 Gamification Logic
 * POST /api/gamification/test-v2
 */
export const testV2GameLogic = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.body;

        if (!type) {
            throw new APIError("Please provide 'type' in body (e.g. 'workout', 'meal')", httpStatus.BAD_REQUEST);
        }

        const result = await gamificationServiceV2.processActivityV2(userId, {
            type,
            logId: 'test_log',
            logModel: 'test_model'
        });

        return res.json({
            success: true,
            data: result,
            message: 'V2 Logic executed successfully',
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            data: {},
            message: err.message || 'Failed to execute V2 Logic',
        });
    }
};

/**
 * Get full V2 gamification state for the authenticated user
 * GET /api/gamification/get-v2
 *
 * Query params:
 *   include  - comma-separated list of sections to include.
 *              Available: profile, medals, streaks, today, rank, levelMap, rewards
 *              Omit to receive ALL sections.
 */
export const getV2State = async (req, res) => {
    try {
        const userId = req.user.id;

        // Determine which sections to include (default = all)
        const ALL_SECTIONS = ['profile', 'medals', 'streaks', 'today', 'rank', 'levelMap', 'rewards'];
        const includeParam = req.query.include;
        const sections = includeParam
            ? includeParam.split(',').map(s => s.trim().toLowerCase()).filter(s => ALL_SECTIONS.includes(s))
            : ALL_SECTIONS;

        const wantAll = (s) => sections.includes(s);

        // ── Parallel DB fetches ───────────────────────────────────────────────
        const [user, stats, rewards] = await Promise.all([
            (wantAll('profile') || wantAll('medals') || wantAll('rank') || wantAll('levelMap'))
                ? User.findById(userId).select('name email profilePicture novaCoins medals level rank')
                : Promise.resolve(null),
            (wantAll('streaks') || wantAll('today') || wantAll('medals'))
                ? UserStats.findOne({ userId })
                : Promise.resolve(null),
            wantAll('rewards')
                ? LevelReward.find({ userId }).sort({ level: 1 }).lean()
                : Promise.resolve([]),
        ]);

        if (!user && (wantAll('profile') || wantAll('medals') || wantAll('rank') || wantAll('levelMap'))) {
            throw new APIError('User not found', httpStatus.NOT_FOUND);
        }

        // ── Resolve level & rank data from config ─────────────────────────────
        const currentLevel = user?.level || 1;
        const currentLevelData = configV2.LEVEL_MAP[currentLevel] || {};
        const nextLevelData = configV2.LEVEL_MAP[currentLevel + 1] || null;
        const rankConfig = configV2.RANKS_CONFIG.find(r => r.name === (user?.rank || 'Awakener')) || configV2.RANKS_CONFIG[0];

        // ── Build streak boost info ───────────────────────────────────────────
        const regStreakWeeks = Math.floor((stats?.streaks?.current || 0) / 7);
        const novaStreakWeeks = Math.floor((stats?.streaks?.novaCurrent || 0) / 7);
        let streakBoostMultiplier = 1.0;
        if (novaStreakWeeks > 0) {
            streakBoostMultiplier = Math.min(2.0, 1.0 + (0.20 * novaStreakWeeks));
        } else if (regStreakWeeks > 0) {
            streakBoostMultiplier = Math.min(1.5, 1.0 + (0.10 * regStreakWeeks));
        }

        // ── Compose response sections ─────────────────────────────────────────
        const data = {};

        if (wantAll('profile')) {
            data.profile = {
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                novaCoins: user.novaCoins || 0,
            };
        }

        if (wantAll('medals')) {
            const totalMedals = user.medals || 0;
            const medalsForCurrentLevel = currentLevelData.medalsRequiredTotal
                ? currentLevelData.medalsRequiredTotal - (configV2.LEVEL_MAP[currentLevel - 1]?.medalsRequiredTotal || 0)
                : currentLevelData.medalsForNextLevel || 0;
            const medalsIntoCurrentLevel = nextLevelData
                ? totalMedals - (currentLevelData.medalsRequiredTotal - (currentLevelData.medalsForNextLevel || 0))
                : 0;
            const medalsToNextLevel = nextLevelData
                ? nextLevelData.medalsRequiredTotal - totalMedals
                : 0;

            data.medals = {
                total: totalMedals,
                dailyStandardUsed: stats?.today?.medalsEarnedStandard || 0,
                dailyStandardLimit: configV2.DAILY_MEDAL_LIMIT,
                dailyStandardRemaining: Math.max(0, configV2.DAILY_MEDAL_LIMIT - (stats?.today?.medalsEarnedStandard || 0)),
                medalsToNextLevel,
                medalsIntoCurrentLevel: Math.max(0, medalsIntoCurrentLevel),
                medalsForCurrentLevel,
                progressPct: medalsForCurrentLevel > 0
                    ? Math.min(100, Math.round((Math.max(0, medalsIntoCurrentLevel) / medalsForCurrentLevel) * 100))
                    : 100,
            };
        }

        if (wantAll('streaks')) {
            data.streaks = {
                regular: {
                    current: stats?.streaks?.current || 0,
                    longest: stats?.streaks?.longest || 0,
                    lastActiveDate: stats?.streaks?.lastActiveDate || null,
                },
                nova: {
                    current: stats?.streaks?.novaCurrent || 0,
                    longest: stats?.streaks?.novaLongest || 0,
                    lastNovaLogDate: stats?.streaks?.lastNovaLogDate || null,
                },
                boostMultiplier: streakBoostMultiplier,
                effectiveDailyNCCap: Math.floor(rankConfig.maxDailyNC * streakBoostMultiplier * rankConfig.ncMultiplier),
            };
        }

        if (wantAll('today')) {
            data.today = {
                date: stats?.today?.date || null,
                coinsEarned: stats?.today?.coinsEarned || 0,
                medalsEarnedStandard: stats?.today?.medalsEarnedStandard || 0,
                categoriesTracked: stats?.today?.categoriesTracked || [],
                allCategoriesComplete: (
                    (stats?.today?.categoriesTracked || []).includes('move') &&
                    (stats?.today?.categoriesTracked || []).includes('eat') &&
                    (stats?.today?.categoriesTracked || []).includes('thrive')
                ),
            };
        }

        if (wantAll('rank')) {
            data.rank = {
                name: user.rank || 'Awakener',
                level: currentLevel,
                ncMultiplier: rankConfig.ncMultiplier,
                maxDailyBaseNC: rankConfig.maxDailyNC,
                currentLevelGift: currentLevelData.gift || null,
                nextLevelGift: nextLevelData?.gift || null,
            };
        }

        if (wantAll('levelMap')) {
            // Return 5 levels around the current level (useful for progress display)
            const mapFrom = Math.max(1, currentLevel - 2);
            const mapTo = Math.min(83, currentLevel + 2);
            const levelMapSlice = {};
            for (let lvl = mapFrom; lvl <= mapTo; lvl++) {
                if (configV2.LEVEL_MAP[lvl]) {
                    levelMapSlice[lvl] = configV2.LEVEL_MAP[lvl];
                }
            }
            data.levelMap = {
                current: currentLevel,
                slice: levelMapSlice,
                nextLevel: nextLevelData ? { level: currentLevel + 1, ...nextLevelData } : null,
            };
        }

        if (wantAll('rewards')) {
            data.rewards = {
                unlocked: rewards,
                total: rewards.length,
            };
        }

        return res.json({
            success: true,
            data,
            meta: {
                sections,
                userId,
            },
            message: 'V2 gamification state fetched successfully',
        });
    } catch (err) {
        return res.status(err.status || 400).json({
            success: false,
            data: {},
            message: err.message || 'Failed to fetch V2 gamification state',
        });
    }
};

export default {
    getSummary,
    getCoinsBalance,
    getCoinsHistory,
    getEarningsBreakdown,
    getQuests,
    getStats,
    getLevelRewards,
    getLeaderboard,
    testV2GameLogic,
    getV2State
};
