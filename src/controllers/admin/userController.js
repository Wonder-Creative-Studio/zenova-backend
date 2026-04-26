// src/controllers/admin/userController.js
import userAdmin from '~/services/admin/userAdminService';

const ok = (res, data, message = 'Success') => res.json({ success: true, data, message });
const fail = (res, err) =>
	res.status(err.status || 400).json({ success: false, data: {}, message: err.message || 'Failed' });

export const list = async (req, res) => {
	try {
		return ok(res, await userAdmin.listUsers(req.query), 'Users fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const getOne = async (req, res) => {
	try {
		return ok(res, { user: await userAdmin.getUser(req.params.userId) }, 'User fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const update = async (req, res) => {
	try {
		const u = await userAdmin.updateUser(req.params.userId, req.body || {});
		return ok(res, { user: u }, 'User updated');
	} catch (err) {
		return fail(res, err);
	}
};

export const ban = async (req, res) => {
	try {
		const out = await userAdmin.setBan(req.params.userId, {
			isBanned: true,
			reason: req.body?.reason,
		});
		return ok(res, { user: out }, 'User banned');
	} catch (err) {
		return fail(res, err);
	}
};

export const unban = async (req, res) => {
	try {
		const out = await userAdmin.setBan(req.params.userId, { isBanned: false });
		return ok(res, { user: out }, 'User unbanned');
	} catch (err) {
		return fail(res, err);
	}
};

export const activity = async (req, res) => {
	try {
		const days = parseInt(req.query.days, 10) || 14;
		const limit = parseInt(req.query.limit, 10) || 50;
		return ok(
			res,
			{ events: await userAdmin.userActivityTimeline(req.params.userId, { days, limit }) },
			'User activity fetched'
		);
	} catch (err) {
		return fail(res, err);
	}
};

export const stats = async (req, res) => {
	try {
		return ok(res, { stats: await userAdmin.userStats(req.params.userId) }, 'User stats fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export default { list, getOne, update, ban, unban, activity, stats };
