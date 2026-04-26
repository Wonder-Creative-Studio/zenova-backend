// src/controllers/v1/profileController.js
// Onboarding profile endpoints per spec §7 / §10.3.
import UserProfile from '~/models/userProfileModel';
import { invalidateUserContext } from '~/services/ai/trackerContextService';

const PICK = [
	'primaryGoal',
	'activityLevel',
	'dietaryTags',
	'allergies',
	'supportWindows',
	'firstHabit',
	'freeTextContext',
];

const pickProfile = (body) => {
	const out = {};
	for (const k of PICK) {
		if (body[k] !== undefined) out[k] = body[k];
	}
	return out;
};

export const getProfile = async (req, res) => {
	try {
		const userId = req.user.id;
		const profile = await UserProfile.findOne({ userId }).lean();
		return res.json({
			success: true,
			data: {
				profile:
					profile || {
						userId,
						primaryGoal: '',
						activityLevel: '',
						dietaryTags: [],
						allergies: '',
						supportWindows: [],
						firstHabit: '',
						freeTextContext: '',
					},
			},
			message: 'Profile fetched successfully',
		});
	} catch (err) {
		return res.status(400).json({ success: false, data: {}, message: err.message });
	}
};

/**
 * POST /api/v1/profile/onboarding — first-time submit.
 * PUT  /api/v1/profile            — update.
 * Both use upsert semantics.
 */
export const upsertProfile = async (req, res) => {
	try {
		const userId = req.user.id;
		const update = pickProfile(req.body || {});
		const profile = await UserProfile.findOneAndUpdate(
			{ userId },
			{ $set: { userId, ...update } },
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		).lean();

		// Invalidate the AI context cache so next chat picks this up.
		await invalidateUserContext(userId);

		return res.json({
			success: true,
			data: { profile },
			message: 'Profile saved successfully',
		});
	} catch (err) {
		return res.status(400).json({ success: false, data: {}, message: err.message });
	}
};

export default { getProfile, upsertProfile };
