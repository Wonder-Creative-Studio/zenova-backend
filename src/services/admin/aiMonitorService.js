// src/services/admin/aiMonitorService.js
// Admin observability over the chatbot v1 collections.
import ChatThread from '~/models/chatThreadModel';
import ChatMessage from '~/models/chatMessageModel';
import User from '~/models/userModel';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const DAY_MS = 24 * 60 * 60 * 1000;

// Very rough cost estimate. Tune these if you switch providers.
// Numbers below are USD per 1K tokens for gpt-4o / gpt-4o-mini (OpenAI pricing at time of writing).
const COST_PER_1K = {
	'gpt-4o': { in: 0.0025, out: 0.01 },
	'openai/gpt-4o': { in: 0.0025, out: 0.01 },
	'gpt-4o-mini': { in: 0.00015, out: 0.0006 },
	'openai/gpt-4o-mini': { in: 0.00015, out: 0.0006 },
};

export const overview = async ({ days = 30 } = {}) => {
	const since = new Date(Date.now() - days * DAY_MS);

	const [byAgent, activeUsers, totalThreads, totalMessages, avgTurnsPerThread, tokens] = await Promise.all([
		ChatThread.aggregate([
			{ $match: { lastMessageAt: { $gte: since } } },
			{ $group: { _id: '$agent', threads: { $sum: 1 }, messages: { $sum: '$messageCount' } } },
		]),
		ChatMessage.distinct('userId', { createdAt: { $gte: since } }).then((ids) => ids.length),
		ChatThread.countDocuments({ lastMessageAt: { $gte: since } }),
		ChatMessage.countDocuments({ createdAt: { $gte: since } }),
		ChatThread.aggregate([
			{ $match: { lastMessageAt: { $gte: since } } },
			{ $group: { _id: null, avg: { $avg: '$messageCount' } } },
		]).then((r) => r?.[0]?.avg || 0),
		ChatMessage.aggregate([
			{ $match: { role: 'assistant', createdAt: { $gte: since } } },
			{
				$group: {
					_id: '$model',
					tokensIn: { $sum: '$tokensIn' },
					tokensOut: { $sum: '$tokensOut' },
					count: { $sum: 1 },
				},
			},
		]),
	]);

	let estimatedCostUsd = 0;
	const models = tokens.map((t) => {
		const p = COST_PER_1K[t._id] || null;
		const cost = p ? (t.tokensIn / 1000) * p.in + (t.tokensOut / 1000) * p.out : 0;
		estimatedCostUsd += cost;
		return {
			model: t._id || 'unknown',
			messages: t.count,
			tokens_in: t.tokensIn,
			tokens_out: t.tokensOut,
			estimated_usd: Math.round(cost * 10000) / 10000,
		};
	});

	return {
		days,
		total_threads: totalThreads,
		total_messages: totalMessages,
		active_users: activeUsers,
		avg_turns_per_thread: Math.round(avgTurnsPerThread * 10) / 10,
		by_agent: Object.fromEntries(byAgent.map((a) => [a._id, { threads: a.threads, messages: a.messages }])),
		by_model: models,
		estimated_cost_usd: Math.round(estimatedCostUsd * 10000) / 10000,
	};
};

export const userThreads = async (userId, { limit = 20 } = {}) => {
	const user = await User.findById(userId).select('_id fullName email').lean();
	if (!user) throw new APIError('User not found', httpStatus.NOT_FOUND);

	const threads = await ChatThread.find({ userId })
		.sort({ lastMessageAt: -1 })
		.limit(Math.min(limit, 100))
		.lean();

	return {
		user: { id: user._id, full_name: user.fullName, email: user.email },
		threads: threads.map((t) => ({
			id: t._id,
			agent: t.agent,
			title: t.title,
			message_count: t.messageCount,
			rolling_summary: t.rollingSummary || null,
			last_message_at: t.lastMessageAt,
			created_at: t.createdAt,
		})),
	};
};

export const threadMessages = async (threadId, { limit = 100, cursor } = {}) => {
	const q = { threadId };
	if (cursor) q.createdAt = { $lt: new Date(cursor) };

	const rows = await ChatMessage.find(q)
		.sort({ createdAt: -1 })
		.limit(Math.min(limit, 200))
		.lean();

	return {
		messages: rows.reverse().map((m) => ({
			id: m._id,
			role: m.role,
			content: m.content,
			safety_flags: m.safetyFlags || [],
			model: m.model,
			tokens_in: m.tokensIn,
			tokens_out: m.tokensOut,
			created_at: m.createdAt,
		})),
		next_cursor: rows.length ? rows[0].createdAt : null,
	};
};

export default { overview, userThreads, threadMessages };
