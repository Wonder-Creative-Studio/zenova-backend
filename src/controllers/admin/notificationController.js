// src/controllers/admin/notificationController.js
import notif from '~/services/admin/notificationAdminService';

const ok = (res, data, message = 'Success') => res.json({ success: true, data, message });
const fail = (res, err) =>
	res.status(err.status || 400).json({ success: false, data: {}, message: err.message || 'Failed' });

export const send = async (req, res) => {
	try {
		const { title, body, category, action, target, data } = req.body || {};
		const out = await notif.sendNotification({ title, body, category, action, target, data });
		return ok(res, out, 'Notification dispatched');
	} catch (err) {
		return fail(res, err);
	}
};

export const list = async (req, res) => {
	try {
		return ok(res, await notif.listNotifications(req.query), 'Notifications fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const stats = async (req, res) => {
	try {
		return ok(res, await notif.stats(), 'Notification stats fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export default { send, list, stats };
