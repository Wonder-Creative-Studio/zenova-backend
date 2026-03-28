// src/models/levelRewardModel.js
// Tracks level-up gifts that have already been dispatched to a user.
// Prevents double-awarding when a user refreshes or re-processes an activity.

import mongoose from 'mongoose';

const levelRewardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    level: {
        type: Number,
        required: true
    },
    giftType: {
        type: String,
        enum: ['tracker_unlock', 'nova_coins'],
        required: true
    },
    giftValue: {
        type: Number,
        required: true
    },
    giftLabel: {
        type: String
    },
    dispatchedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound index: one reward entry per user per level
levelRewardSchema.index({ userId: 1, level: 1 }, { unique: true });

const LevelReward = mongoose.model('level_rewards', levelRewardSchema);
export default LevelReward;
