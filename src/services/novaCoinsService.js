// src/services/novaCoinsService.js
import NovaTransaction from '~/models/novaTransactionModel';
import User from '~/models/userModel';

/**
 * Award NovaCoins to a user with full transaction logging
 * @param {ObjectId} userId 
 * @param {Object} params
 * @param {Number} params.amount - Coins to award
 * @param {String} params.type - Transaction type
 * @param {String} params.category - Source category (mood, workout, etc.)
 * @param {ObjectId} params.refId - Reference to source document
 * @param {String} params.refModel - Model name of source document
 * @param {String} params.description - Human-readable description
 * @param {Object} params.metadata - Additional metadata
 */
export const awardCoins = async (userId, params) => {
    const { amount, type = 'activity_reward', category, refId, refModel, description, metadata = {} } = params;

    if (amount <= 0) {
        return { earned: 0, balance: 0 };
    }

    // Atomic increment of user's coins (uses $inc which handles missing fields)
    const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { novaCoins: amount } },
        { new: true }
    );

    if (!user) {
        throw new Error('User not found');
    }

    // Ensure balanceAfter is a valid number (handle case where novaCoins was undefined)
    const balanceAfter = user.novaCoins || amount;

    // Create transaction log
    await NovaTransaction.create({
        userId,
        amount,
        balanceAfter,
        type,
        source: {
            category,
            refModel,
            refId,
            description
        },
        metadata
    });

    return {
        earned: amount,
        balance: balanceAfter
    };
};

/**
 * Spend NovaCoins (for rewards/purchases)
 */
export const spendCoins = async (userId, params) => {
    const { amount, category, refId, refModel, description, metadata = {} } = params;

    if (amount <= 0) {
        throw new Error('Amount must be positive');
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    if ((user.novaCoins || 0) < amount) {
        throw new Error('Insufficient NovaCoins');
    }

    // Atomic decrement
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { novaCoins: -amount } },
        { new: true }
    );

    const balanceAfter = updatedUser.novaCoins || 0;

    // Create transaction log
    await NovaTransaction.create({
        userId,
        amount: -amount,
        balanceAfter,
        type: 'spent',
        source: {
            category,
            refModel,
            refId,
            description
        },
        metadata
    });

    return {
        spent: amount,
        balance: balanceAfter
    };
};

/**
 * Get user's current balance
 */
export const getBalance = async (userId) => {
    const user = await User.findById(userId).select('novaCoins');
    return user?.novaCoins || 0;
};

/**
 * Get transaction history
 */
export const getHistory = async (userId, options = {}) => {
    return NovaTransaction.getHistory(userId, options);
};

/**
 * Get earnings breakdown by category
 */
export const getEarningsByCategory = async (userId) => {
    return NovaTransaction.getEarningsByCategory(userId);
};

export default {
    awardCoins,
    spendCoins,
    getBalance,
    getHistory,
    getEarningsByCategory
};
