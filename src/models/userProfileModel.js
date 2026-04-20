// src/models/userProfileModel.js
// Onboarding answers that feed directly into the agent system prompt.
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
		primaryGoal: { type: String, default: '' },
		activityLevel: { type: String, default: '' },
		dietaryTags: { type: [String], default: [] },
		allergies: { type: String, default: '' },
		supportWindows: { type: [String], default: [] },
		firstHabit: { type: String, default: '' },
		freeTextContext: { type: String, default: '' },
	},
	{ timestamps: true }
);

const UserProfile = mongoose.model('user_ai_profiles', userProfileSchema);
export default UserProfile;
