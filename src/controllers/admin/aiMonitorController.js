// src/controllers/admin/aiMonitorController.js
import aiMonitor from '~/services/admin/aiMonitorService';

const ok = (res, data, message = 'Success') => res.json({ success: true, data, message });
const fail = (res, err) =>
	res.status(err.status || 400).json({ success: false, data: {}, message: err.message || 'Failed' });

export const overview = async (req, res) => {
	try {
		const days = parseInt(req.query.days, 10) || 30;
		return ok(res, await aiMonitor.overview({ days }), 'AI overview fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const userThreads = async (req, res) => {
	try {
		const limit = parseInt(req.query.limit, 10) || 20;
		return ok(res, await aiMonitor.userThreads(req.params.userId, { limit }), 'User threads fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const threadMessages = async (req, res) => {
	try {
		const limit = parseInt(req.query.limit, 10) || 100;
		const cursor = req.query.cursor;
		return ok(
			res,
			await aiMonitor.threadMessages(req.params.threadId, { limit, cursor }),
			'Thread messages fetched'
		);
	} catch (err) {
		return fail(res, err);
	}
};

export default { overview, userThreads, threadMessages };
