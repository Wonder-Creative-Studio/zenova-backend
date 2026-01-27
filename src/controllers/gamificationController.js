// src/controllers/gamificationController.js
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationService from '~/services/gamificationService';
import novaCoinsService from '~/services/novaCoinsService';
import badgeService from '~/services/badgeService';
import questService from '~/services/questService';
import statsService from '~/services/statsService';
import NovaTransaction from '~/models/novaTransactionModel';

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
 * Get user badges with progress
 * GET /api/gamification/badges
 */
export const getBadges = async (req, res) => {
    try {
        const userId = req.user.id;
        const badges = await badgeService.getUserBadges(userId);

        const unlocked = badges.filter(b => b.isUnlocked);
        const locked = badges.filter(b => !b.isUnlocked);

        return res.json({
            success: true,
            data: {
                unlocked,
                locked,
                total: badges.length,
                unlockedCount: unlocked.length
            },
            message: 'Badges fetched successfully',
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            data: {},
            message: err.message || 'Failed to fetch badges',
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

export default {
    getSummary,
    getCoinsBalance,
    getCoinsHistory,
    getEarningsBreakdown,
    getBadges,
    getQuests,
    getStats,
    getLeaderboard
};
