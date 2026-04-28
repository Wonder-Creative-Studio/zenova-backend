// src/services/ai/aiChatService.js
// Orchestrator for the full chat turn:
//   user msg → safety screen → context build → RAG → LLM (stream) → persist → summarize
import ChatThread from '~/models/chatThreadModel';
import ChatMessage from '~/models/chatMessageModel';
import UserProfile from '~/models/userProfileModel';
import User from '~/models/userModel';
import openai, { resolveModel } from './openaiClient';
import { buildSystemPrompt, CRISIS_TEMPLATES, GREETINGS, AGENTS } from './agentPrompts';
import safetyService from './safetyService';
import trackerContext from './trackerContextService';
import memoryService from './memoryService';
import ragService from './ragService';
import { enrichProfileFromMessage } from './profileEnrichmentService';
import logger from '~/config/logger';

const REGION = (process.env.CRISIS_REGION || 'IN').toUpperCase();

const getOrCreateThread = async ({ userId, agent, threadId }) => {
	if (threadId) {
		const t = await ChatThread.findOne({ _id: threadId, userId });
		if (t) return t;
	}
	return ChatThread.create({ userId, agent, title: '', rollingSummary: '', messageCount: 0 });
};

const buildMessagesPayload = async ({ thread, userMessage }) => {
	const [user, profile] = await Promise.all([
		User.findById(thread.userId).lean(),
		UserProfile.findOne({ userId: thread.userId }).lean(),
	]);

	const userContextBlock = await trackerContext.getUserContextBlock(thread.userId);

	const recentTurns = await memoryService.getRecentMessages(thread._id);

	const ragBlock = await ragService.retrieveContext({
		agent: thread.agent,
		message: userMessage,
		recentTurns,
		profile,
	});

	const systemPrompt = buildSystemPrompt({
		agent: thread.agent,
		userContextBlock,
		ragBlock,
	});

	const messages = [{ role: 'system', content: systemPrompt }];
	if (thread.rollingSummary && thread.rollingSummary.trim().length) {
		messages.push({
			role: 'system',
			content: `Summary of earlier conversation in this thread:\n${thread.rollingSummary}`,
		});
	}
	messages.push(...recentTurns);
	messages.push({ role: 'user', content: userMessage });

	return { messages, user, profile };
};

const persistMessages = async ({ thread, userMessage, assistantMessage, clientMsgId, safetyFlags = [], model, usage = {}, agent }) => {
	const userDoc = await ChatMessage.create({
		threadId: thread._id,
		userId: thread.userId,
		role: 'user',
		content: userMessage,
		clientMsgId: clientMsgId || null,
		safetyFlags,
	});
	const asstDoc = await ChatMessage.create({
		threadId: thread._id,
		userId: thread.userId,
		role: 'assistant',
		content: assistantMessage,
		agent: agent || null,
		model,
		tokensIn: usage?.prompt_tokens || 0,
		tokensOut: usage?.completion_tokens || 0,
	});

	const inc = { messageCount: 2 };
	const set = { lastMessageAt: new Date() };
	if (!thread.title) {
		set.title = userMessage.slice(0, 60);
	}
	await ChatThread.findByIdAndUpdate(thread._id, { $inc: inc, $set: set });

	return { userDoc, asstDoc };
};

/**
 * Streaming flow. Writes SSE events to `res`. Caller has already set headers.
 * Emits:
 *   event: thread       -> { thread_id }
 *   event: delta        -> { text }
 *   event: done         -> { message_id, usage, safety_flags }
 *   event: error        -> { code, message }
 */
export const streamMessage = async ({ userId, agent, threadId, message, clientMsgId }, res) => {
	if (!AGENTS.includes(agent)) {
		writeEvent(res, 'error', { code: 'bad_agent', message: `Unknown agent: ${agent}` });
		return;
	}
	if (!message || !message.trim()) {
		writeEvent(res, 'error', { code: 'empty_message', message: 'Message is required' });
		return;
	}

	// 1) Thread
	const thread = await getOrCreateThread({ userId, agent, threadId });
	writeEvent(res, 'thread', { thread_id: thread._id.toString() });

	// 2) Idempotency: if clientMsgId already processed, replay the prior assistant message.
	if (clientMsgId) {
		const existing = await ChatMessage.findOne({ threadId: thread._id, clientMsgId });
		if (existing) {
			const next = await ChatMessage.findOne({
				threadId: thread._id,
				role: 'assistant',
				createdAt: { $gt: existing.createdAt },
			}).sort({ createdAt: 1 });
			if (next) {
				writeEvent(res, 'delta', { text: next.content });
				writeEvent(res, 'done', {
					message_id: next._id.toString(),
					usage: {},
					safety_flags: existing.safetyFlags || [],
				});
				return;
			}
		}
	}

	// 3) Safety screen
	const screen = await safetyService.screenMessage(message);
	if (screen.isCrisis) {
		const template = CRISIS_TEMPLATES[REGION] || CRISIS_TEMPLATES.IN;
		writeEvent(res, 'delta', { text: template });
		const { asstDoc } = await persistMessages({
			thread,
			userMessage: message,
			assistantMessage: template,
			clientMsgId,
			safetyFlags: [screen.category],
			model: 'safety_template',
			agent,
		});
		await safetyService.logSafetyEvent({
			userId,
			threadId: thread._id,
			agent,
			category: screen.category,
			detectedBy: screen.detectedBy,
		});
		writeEvent(res, 'done', {
			message_id: asstDoc._id.toString(),
			usage: {},
			safety_flags: [screen.category],
		});
		return;
	}

	// 4) Build payload and stream LLM
	const { messages, profile } = await buildMessagesPayload({ thread, userMessage: message });
	const model = resolveModel('main');

	let full = '';
	try {
		for await (const chunk of openai.chatStream({ model, messages, temperature: 0.6, maxTokens: 700 })) {
			if (chunk.delta) {
				full += chunk.delta;
				writeEvent(res, 'delta', { text: chunk.delta });
			}
		}
	} catch (err) {
		logger.error(`aiChatService stream error: ${err.response?.data?.error?.message || err.message}`);
		writeEvent(res, 'error', { code: 'llm_error', message: 'AI provider unavailable' });
		return;
	}

	if (!full || full.trim().length === 0) {
		full = 'Sorry, I lost my train of thought there. Could you rephrase?';
		writeEvent(res, 'delta', { text: full });
	}

	// 5) Persist
	const { asstDoc } = await persistMessages({
		thread,
		userMessage: message,
		assistantMessage: full,
		clientMsgId,
		model,
		agent,
	});

	writeEvent(res, 'done', {
		message_id: asstDoc._id.toString(),
		usage: {},
		safety_flags: [],
	});

	// 6) Fire-and-forget summary compression + passive profile enrichment
	memoryService.maybeCompressThread(thread._id).catch(() => {});
	enrichProfileFromMessage(userId, message, profile).catch(() => {});
};

/**
 * Non-streaming fallback (returns the full assistant message as JSON).
 * Frontends without SSE support can use this path.
 */
export const sendMessage = async ({ userId, agent, threadId, message, clientMsgId }) => {
	if (!AGENTS.includes(agent)) throw new Error(`Unknown agent: ${agent}`);
	if (!message || !message.trim()) throw new Error('Message is required');

	const thread = await getOrCreateThread({ userId, agent, threadId });

	if (clientMsgId) {
		const existing = await ChatMessage.findOne({ threadId: thread._id, clientMsgId });
		if (existing) {
			const next = await ChatMessage.findOne({
				threadId: thread._id,
				role: 'assistant',
				createdAt: { $gt: existing.createdAt },
			}).sort({ createdAt: 1 });
			if (next) {
				return {
					threadId: thread._id.toString(),
					messageId: next._id.toString(),
					content: next.content,
					safetyFlags: existing.safetyFlags || [],
				};
			}
		}
	}

	const screen = await safetyService.screenMessage(message);
	if (screen.isCrisis) {
		const template = CRISIS_TEMPLATES[REGION] || CRISIS_TEMPLATES.IN;
		const { asstDoc } = await persistMessages({
			thread,
			userMessage: message,
			assistantMessage: template,
			clientMsgId,
			safetyFlags: [screen.category],
			model: 'safety_template',
			agent,
		});
		await safetyService.logSafetyEvent({
			userId,
			threadId: thread._id,
			agent,
			category: screen.category,
			detectedBy: screen.detectedBy,
		});
		return {
			threadId: thread._id.toString(),
			messageId: asstDoc._id.toString(),
			content: template,
			safetyFlags: [screen.category],
		};
	}

	const { messages, profile } = await buildMessagesPayload({ thread, userMessage: message });
	const model = resolveModel('main');
	const { content, usage } = await openai.chatComplete({
		model,
		messages,
		temperature: 0.6,
		maxTokens: 700,
	});
	const full = (content && content.trim()) || 'Sorry, I lost my train of thought. Please try again.';

	const { asstDoc } = await persistMessages({
		thread,
		userMessage: message,
		assistantMessage: full,
		clientMsgId,
		model,
		usage,
		agent,
	});

	memoryService.maybeCompressThread(thread._id).catch(() => {});
	enrichProfileFromMessage(userId, message, profile).catch(() => {});

	return {
		threadId: thread._id.toString(),
		messageId: asstDoc._id.toString(),
		content: full,
		safetyFlags: [],
	};
};

/**
 * Greeting for a brand-new thread (no LLM call — deterministic).
 */
export const getGreeting = async ({ userId, agent }) => {
	const user = await User.findById(userId).lean();
	const name = user?.fullName?.split(' ')?.[0] || '';
	return GREETINGS[agent] ? GREETINGS[agent](name) : '';
};

const writeEvent = (res, event, data) => {
	try {
		res.write(`event: ${event}\n`);
		res.write(`data: ${JSON.stringify(data)}\n\n`);
		if (typeof res.flush === 'function') res.flush();
	} catch (err) {
		logger.warn(`aiChatService: SSE write failed: ${err.message}`);
	}
};

export default { streamMessage, sendMessage, getGreeting };
