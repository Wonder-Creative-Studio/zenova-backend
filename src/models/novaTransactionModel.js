// src/models/novaTransactionModel.js
import mongoose from 'mongoose';

const novaTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },

    // Transaction details
    amount: { type: Number, required: true },  // +ve earned, -ve spent
    balanceAfter: { type: Number, required: true },

    type: {
        type: String,
        enum: ['activity_reward', 'quest_bonus', 'streak_bonus', 'badge_bonus',
            'referral', 'spent', 'refund', 'admin_adjustment'],
        required: true
    },

    // Source tracking - WHAT triggered this transaction
    source: {
        category: {
            type: String,
            enum: ['mood', 'workout', 'meal', 'meditation', 'yoga', 'sleep',
                'steps', 'screen_time', 'bmr', 'menstrual', 'habit',
                'medicine', 'reading', 'measurement', 'quest', 'badge',
                'streak', 'referral', 'purchase', 'admin'],
            required: true
        },

        // Reference to the exact log/event that triggered this
        refModel: { type: String },  // 'moodLogs', 'workoutLogs', 'quests'
        refId: { type: mongoose.Schema.Types.ObjectId },

        // Human-readable description
        description: { type: String }
    },

    // Metadata for complex transactions
    metadata: {
        questId: { type: mongoose.Schema.Types.ObjectId },
        badgeId: { type: mongoose.Schema.Types.ObjectId },
        streakDays: { type: Number },
        formula: { type: String },      // "steps/1000", "durationMin/5"
        baseAmount: { type: Number },   // Before any multipliers
        multiplier: { type: Number }    // Streak/level multiplier applied
    }

}, { timestamps: true });

// Indexes for efficient queries
novaTransactionSchema.index({ userId: 1, createdAt: -1 });
novaTransactionSchema.index({ userId: 1, 'source.category': 1 });
novaTransactionSchema.index({ 'source.refId': 1 });

// Static method to get user's transaction history
novaTransactionSchema.statics.getHistory = function (userId, options = {}) {
    const { limit = 20, page = 1, category } = options;
    const query = { userId };
    if (category) {
        query['source.category'] = category;
    }
    return this.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
};

// Static method to get earnings by category
novaTransactionSchema.statics.getEarningsByCategory = function (userId) {
    return this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), amount: { $gt: 0 } } },
        { $group: { _id: '$source.category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }
    ]);
};

const NovaTransaction = mongoose.model('nova_transactions', novaTransactionSchema);
export default NovaTransaction;
