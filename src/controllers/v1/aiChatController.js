// src/controllers/v1/aiChatController.js
// v1 AI chat endpoints per ZENOVA_AI_SPEC_MVP §10.
import aiChatService from '~/services/ai/aiChatService';
import ChatThread from '~/models/chatThreadModel';
import ChatMessage from '~/models/chatMessageModel';
import logger from '~/config/logger';

/**
 * POST /api/v1/chat/message
 * Streams SSE by default. If ?nostream=1 or Accept: application/json, returns JSON.
 */
export const sendMessage = async (req, res) => {
	const userId = req.user.id;
	const { agent = 'calia', thread_id = null, message, client_msg_id = null } = req.body || {};

	const wantsJson =
		req.query?.nostream === '1' ||
		(req.get('Accept') && req.get('Accept').includes('application/json') && !req.get('Accept').includes('text/event-stream'));

	if (wantsJson) {
		try {
			const out = await aiChatService.sendMessage({
				userId,
				agent,
				threadId: thread_id,
				message,
				clientMsgId: client_msg_id,
			});
			return res.json({
				success: true,
				data: {
					thread_id: out.threadId,
					message_id: out.messageId,
					message: out.content,
					agent,
					safety_flags: out.safetyFlags,
				},
				message: 'Message sent successfully',
			});
		} catch (err) {
			logger.error(`v1 sendMessage (json) error: ${err.message}`);
			return res.status(400).json({
				success: false,
				data: {},
				message: err.message || 'Failed to send message',
			});
		}
	}

	// SSE path
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no',
	});
	res.flushHeaders?.();

	const keepAlive = setInterval(() => {
		try {
			res.write(': keep-alive\n\n');
		} catch {}
	}, 15_000);

	req.on('close', () => clearInterval(keepAlive));

	try {
		await aiChatService.streamMessage(
			{ userId, agent, threadId: thread_id, message, clientMsgId: client_msg_id },
			res
		);
	} catch (err) {
		logger.error(`v1 sendMessage (sse) error: ${err.message}`);
		try {
			res.write(`event: error\ndata: ${JSON.stringify({ code: 'internal', message: err.message })}\n\n`);
		} catch {}
	} finally {
		clearInterval(keepAlive);
		try {
			res.end();
		} catch {}
	}
};

/**
 * GET /api/v1/chat/threads?agent=calia&limit=20&cursor=...
 */
export const listThreads = async (req, res) => {
	try {
		const userId = req.user.id;
		const { agent, limit = 20, cursor } = req.query;
		const q = { userId };
		if (agent) q.agent = agent;
		if (cursor) q.lastMessageAt = { $lt: new Date(cursor) };

		const threads = await ChatThread.find(q)
			.sort({ lastMessageAt: -1 })
			.limit(Math.min(parseInt(limit, 10) || 20, 100))
			.lean();

		const nextCursor = threads.length ? threads[threads.length - 1].lastMessageAt : null;

		return res.json({
			success: true,
			data: {
				threads: threads.map((t) => ({
					id: t._id,
					agent: t.agent,
					title: t.title || '',
					message_count: t.messageCount,
					last_message_at: t.lastMessageAt,
					created_at: t.createdAt,
				})),
				next_cursor: nextCursor,
			},
			message: 'Threads fetched successfully',
		});
	} catch (err) {
		return res.status(400).json({ success: false, data: {}, message: err.message });
	}
};

/**
 * GET /api/v1/chat/threads/:threadId/messages?cursor=...&limit=50
 */
export const listMessages = async (req, res) => {
	try {
		const userId = req.user.id;
		const { threadId } = req.params;
		const { limit = 50, cursor } = req.query;

		const thread = await ChatThread.findOne({ _id: threadId, userId }).lean();
		if (!thread) {
			return res.status(404).json({ success: false, data: {}, message: 'Thread not found' });
		}

		const q = { threadId };
		if (cursor) q.createdAt = { $lt: new Date(cursor) };

		const rows = await ChatMessage.find(q)
			.sort({ createdAt: -1 })
			.limit(Math.min(parseInt(limit, 10) || 50, 200))
			.lean();

		const messages = rows
			.reverse()
			.map((m) => ({
				id: m._id,
				role: m.role,
				content: m.content,
				safety_flags: m.safetyFlags || [],
				created_at: m.createdAt,
			}));

		return res.json({
			success: true,
			data: {
				thread: {
					id: thread._id,
					agent: thread.agent,
					title: thread.title || '',
					message_count: thread.messageCount,
				},
				messages,
				next_cursor: rows.length ? rows[0].createdAt : null,
			},
			message: 'Messages fetched successfully',
		});
	} catch (err) {
		return res.status(400).json({ success: false, data: {}, message: err.message });
	}
};

/**
 * DELETE /api/v1/chat/threads/:threadId
 * Clears messages + rolling summary for that thread.
 */
export const deleteThread = async (req, res) => {
	try {
		const userId = req.user.id;
		const { threadId } = req.params;
		const thread = await ChatThread.findOne({ _id: threadId, userId });
		if (!thread) {
			return res.status(404).json({ success: false, data: {}, message: 'Thread not found' });
		}
		await ChatMessage.deleteMany({ threadId });
		await ChatThread.deleteOne({ _id: threadId });
		return res.json({
			success: true,
			data: { thread_id: threadId },
			message: 'Thread cleared successfully',
		});
	} catch (err) {
		return res.status(400).json({ success: false, data: {}, message: err.message });
	}
};

/**
 * GET /api/v1/chat/greeting?agent=calia
 * Static, deterministic greeting for the UI to render when a new thread opens.
 */
export const greeting = async (req, res) => {
	try {
		const userId = req.user.id;
		const { agent = 'calia' } = req.query;
		const text = await aiChatService.getGreeting({ userId, agent });
		return res.json({
			success: true,
			data: { agent, greeting: text },
			message: 'Greeting fetched',
		});
	} catch (err) {
		return res.status(400).json({ success: false, data: {}, message: err.message });
	}
};

export default {
	sendMessage,
	listThreads,
	listMessages,
	deleteThread,
	greeting,
};
