// src/models/userProfileModel.js
// user_ai_profiles collection.
// Stores onboarding data + LLM-enriched facts for AI personalisation.
// Referenced by admin user detail endpoint for context display.
import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      unique: true,
      index: true,
    },
    primaryGoal: {
      type: String,
      default: null, // e.g. 'lose_weight', 'reduce_stress', 'build_muscle'
    },
    activityLevel: {
      type: String,
      default: null, // e.g. 'sedentary', 'active', 'very_active'
    },
    dietaryTags: {
      type: [String],
      default: [],
    },
    allergies: {
      type: [String],
      default: [],
    },
    supportWindows: {
      type: [String],
      default: [], // e.g. ['morning', 'evening']
    },
    firstHabit: {
      type: String,
      default: null,
    },
    freeTextContext: {
      type: String,
      default: null,
    },
    enrichedFacts: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const UserProfile = mongoose.model('user_ai_profiles', userProfileSchema);
export default UserProfile;
