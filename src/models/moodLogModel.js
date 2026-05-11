// src/models/moodLogModel.js
import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

if (mongoose.models.moodLogs) {
  delete mongoose.models.moodLogs;
}


const moodLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  mood: {
    type: String,
    enum: ['Very Unpleasant', 'Unpleasant', 'Neutral', 'Pleasant', 'Slightly Pleasant', 'Very Pleasant'],
    required: true,
  },
  suggestedActivity: {
    title: { type: String },
    message: { type: String },
    activity: { type: String },
    type: { type: String },
    durationMin: { type: Number },
    reward: { type: Number },
    rewardCoins: { type: Number },
    description: { type: String },
    ctaLabel: { type: String },
    tag: { type: String },
  },
  isSuggestionCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  loggedAt: {
    type: Date,
    default: Date.now,
  },
  source: {
    type: String,
    enum: ['manual', 'auto'],
    default: 'manual',
  },
}, {
  timestamps: true,
});

moodLogSchema.index({ userId: 1, loggedAt: -1 });
moodLogSchema.plugin(toJSON);

const MoodLog = mongoose.model('moodLogs', moodLogSchema);
export default MoodLog;
