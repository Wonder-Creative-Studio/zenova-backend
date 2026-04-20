// src/services/ai/memoryService.js
// Summary-based rolling memory per spec §5. No long-term fact store in MVP.
// After each turn, if thread has more than RECENT_TURNS messages, we compress
// the overflow into thread.rollingSummary (fire-and-forget).
import ChatThread from '~/models/chatThreadModel';
import ChatMessage from '~/models/chatMessageModel';
import openai, { resolveModel } from './openaiClient';
import logger from '~/config/logger';

export const RECENT_TURNS = 15;

/**
 * Load the last N messages verbatim (oldest first).
 */
export const getRecentMessages = async (threadId, n = RECENT_TURNS) => {
	const docs = await ChatMessage.find({ threadId })
		.sort({ createdAt: -1 })
		.limit(n)
		.lean();
	return docs.reverse().map((m) => ({ role: m.role, content: m.content }));
};

const buildSummarizerMessages = (oldSummary, overflow) => {
	const summarizerSystem = `You are a conversation summarizer for Zenova.
Given the prior summary (if any) and the new messages below, produce an updated summary that preserves what matters for continuing the conversation naturally. Focus on:
- What the user was working on or asking about
- Decisions, preferences, or constraints mentioned
- Emotional tone or situation
- Any commitments ("I'll try the 10-minute meditation tonight")

Do NOT include greetings, pleasantries, or anything the agent wouldn't need to keep the thread coherent. Keep under 200 words.`;

	const user = `Prior summary:
${oldSummary && oldSummary.trim().length ? oldSummary : '(none)'}

New messages to fold in (JSON):
${JSON.stringify(overflow, null, 2)}`;

	return [
		{ role: 'system', content: summarizerSystem },
		{ role: 'user', content: user },
	];
};

/**
 * Fire-and-forget: if the thread has more than RECENT_TURNS, compress the
 * overflow into rollingSummary. Safe to call after every turn.
 */
export const maybeCompressThread = async (threadId) => {
	try {
		const total = await ChatMessage.countDocuments({ threadId });
		if (total <= RECENT_TURNS) return;

		const overflowCount = total - RECENT_TURNS;
		// Oldest overflow messages that are about to roll out of the window.
		const overflow = await ChatMessage.find({ threadId })
			.sort({ createdAt: 1 })
			.limit(overflowCount)
			.lean();

		const thread = await ChatThread.findById(threadId).lean();
		if (!thread) return;

		const overflowPayload = overflow.map((m) => ({ role: m.role, content: m.content }));
		const { content } = await openai.chatComplete({
			model: resolveModel('mini'),
			messages: buildSummarizerMessages(thread.rollingSummary, overflowPayload),
			temperature: 0.2,
			maxTokens: 400,
		});

		if (content && content.trim().length > 0) {
			await ChatThread.findByIdAndUpdate(threadId, { rollingSummary: content.trim() });
		}
	} catch (err) {
		logger.warn(`memoryService: compress failed for thread=${threadId}: ${err.message}`);
	}
};

export default { RECENT_TURNS, getRecentMessages, maybeCompressThread };
