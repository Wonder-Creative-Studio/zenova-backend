// src/services/ai/safetyService.js
// Two-stage crisis detection per spec §9:
//   1) cheap regex/keyword pre-pass (sync)
//   2) gpt-4o-mini classifier fallback for ambiguous phrasing
// Runs on EVERY user message before the main LLM call.
import openai, { resolveModel } from './openaiClient';
import SafetyEvent from '~/models/safetyEventModel';
import logger from '~/config/logger';

const CATEGORIES = [
	'suicide_self_harm',
	'eating_disorder_active',
	'acute_mental_health_crisis',
	'medical_emergency',
	'safe',
];

// Tier-1 hard keyword list (fast).
const HARD_PATTERNS = [
	{
		category: 'suicide_self_harm',
		patterns: [
			/\b(kill(ing)?\s+my\s*self|suicid(e|al)|end\s+(my|this)\s+life|take\s+my\s+(own\s+)?life|want\s+to\s+die|don't\s+want\s+to\s+be\s+here)\b/i,
			/\b(cut(ting)?\s+my\s*self|harm(ing)?\s+my\s*self|self[-\s]?harm)\b/i,
		],
	},
	{
		category: 'eating_disorder_active',
		patterns: [
			/\b(purg(e|ing)|make\s+my\s*self\s+(throw\s+up|vomit)|starv(e|ing)\s+my\s*self|not\s+eat(ing)?\s+for\s+\d+\s+days)\b/i,
		],
	},
	{
		category: 'medical_emergency',
		patterns: [
			/\b(chest\s+pain|can't\s+breathe|cannot\s+breathe|stroke|seizure|overdose|unconscious|passed\s+out)\b/i,
		],
	},
];

// Tier-2 ambiguous cues — hand off to classifier.
const AMBIGUOUS_CUES = [
	/don't\s+want\s+to\s+(be\s+here|exist|wake\s+up)/i,
	/\b(no\s+point|no\s+reason|better\s+off\s+without\s+me|can't\s+do\s+this\s+anymore)\b/i,
	/\b(hopeless|worthless|empty\s+inside|numb\s+for\s+(days|weeks))\b/i,
];

const quickScreen = (text) => {
	if (!text) return { category: 'safe', detectedBy: 'regex' };
	for (const tier of HARD_PATTERNS) {
		if (tier.patterns.some((r) => r.test(text))) {
			return { category: tier.category, detectedBy: 'regex' };
		}
	}
	if (AMBIGUOUS_CUES.some((r) => r.test(text))) {
		return { category: 'ambiguous', detectedBy: 'regex' };
	}
	return { category: 'safe', detectedBy: 'regex' };
};

const classify = async (text) => {
	const system = `You are a safety classifier for a wellness app. Classify the user's message into exactly one category:
- suicide_self_harm: suicidal ideation, intent, or self-harm behavior
- eating_disorder_active: active eating disorder behaviors (purging, restricting, bingeing with distress)
- acute_mental_health_crisis: severe distress that isn't suicidal but needs professional support now
- medical_emergency: chest pain, stroke, overdose, severe injury, loss of consciousness
- safe: none of the above

Reply with ONLY one word, the category name.`;
	try {
		const { content } = await openai.chatComplete({
			model: resolveModel('mini'),
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: text },
			],
			temperature: 0,
			maxTokens: 6,
		});
		const cat = content.toLowerCase().replace(/[^a-z_]/g, '');
		return CATEGORIES.includes(cat) ? cat : 'safe';
	} catch (err) {
		logger.error(`safetyService classifier failed: ${err.message}`);
		// Fail closed: if classifier fails on an ambiguous message, treat as crisis.
		return 'acute_mental_health_crisis';
	}
};

/**
 * @returns {Promise<{ category: string, isCrisis: boolean, detectedBy: string }>}
 */
export const screenMessage = async (text) => {
	const quick = quickScreen(text);
	if (quick.category === 'ambiguous') {
		const cat = await classify(text);
		return { category: cat, isCrisis: cat !== 'safe', detectedBy: 'classifier' };
	}
	return { category: quick.category, isCrisis: quick.category !== 'safe', detectedBy: 'regex' };
};

export const logSafetyEvent = async ({ userId, threadId, agent, category, severity = 'high', detectedBy = 'regex' }) => {
	try {
		await SafetyEvent.create({ userId, threadId, agent, category, severity, detectedBy });
	} catch (err) {
		logger.error(`safetyService: failed to log event: ${err.message}`);
	}
};

export default { screenMessage, logSafetyEvent };
