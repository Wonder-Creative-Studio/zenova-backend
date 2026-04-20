// Passively extracts wellness profile facts from a user chat message and patches
// UserProfile if anything new is detected. Runs fire-and-forget after each chat turn.
import openai from './openaiClient';
import UserProfile from '~/models/userProfileModel';
import { invalidateUserContext } from './trackerContextService';
import logger from '~/config/logger';

const EXTRACT_PROMPT = `You are a silent wellness profile extractor.
Given a user's chat message, extract any of the following facts ONLY if explicitly and clearly stated:
- primaryGoal (string, e.g. "lose weight", "build muscle", "reduce stress")
- activityLevel (one of: sedentary, light, moderate, active, very_active)
- dietaryTags (array of strings, e.g. ["vegetarian", "gluten-free"])
- allergies (string, e.g. "lactose intolerant, peanut allergy")
- firstHabit (string, e.g. "morning walk")

Return a valid JSON object with ONLY the fields you are confident about.
Return {} if nothing is clearly mentioned. Never guess or infer.`;

export const enrichProfileFromMessage = async (userId, userMessage, existingProfile) => {
	try {
		const response = await openai.chatComplete({
			model: process.env.AI_MODEL_MINI || 'gpt-4o-mini',
			messages: [
				{ role: 'system', content: EXTRACT_PROMPT },
				{ role: 'user', content: userMessage },
			],
			responseFormat: { type: 'json_object' },
			maxTokens: 150,
			temperature: 0,
		});

		let delta;
		try {
			delta = JSON.parse(response.content || '{}');
		} catch {
			return;
		}

		if (!delta || Object.keys(delta).length === 0) return;

		// Only patch fields that are genuinely new or changed
		const patch = {};
		for (const [key, val] of Object.entries(delta)) {
			if (val === undefined || val === null || val === '') continue;
			if (JSON.stringify(existingProfile?.[key]) === JSON.stringify(val)) continue;
			patch[key] = val;
		}

		if (Object.keys(patch).length === 0) return;

		await UserProfile.findOneAndUpdate(
			{ userId },
			{ $set: patch },
			{ upsert: true, new: true }
		);
		await invalidateUserContext(userId);
		logger.info(`profileEnrichment: patched userId=${userId} fields=${Object.keys(patch).join(',')}`);
	} catch (err) {
		// Always silent — never surface errors to the chat turn
		logger.warn(`profileEnrichment: failed for userId=${userId}: ${err.message}`);
	}
};

export default { enrichProfileFromMessage };
