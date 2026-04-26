// src/controllers/admin/questController.js
import svc from '~/services/admin/questAdminService';

const ok = (res, data, message = 'Success') => res.json({ success: true, data, message });
const fail = (res, err) =>
	res.status(err.status || 400).json({ success: false, data: {}, message: err.message || 'Failed' });

export const list = async (req, res) => {
	try {
		return ok(res, await svc.list(req.query), 'Quests fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const create = async (req, res) => {
	try {
		return ok(res, { quest: await svc.create(req.body || {}) }, 'Quest created');
	} catch (err) {
		return fail(res, err);
	}
};

export const update = async (req, res) => {
	try {
		return ok(res, { quest: await svc.update(req.params.questId, req.body || {}) }, 'Quest updated');
	} catch (err) {
		return fail(res, err);
	}
};

export const toggle = async (req, res) => {
	try {
		const active = req.body?.isActive;
		return ok(res, { quest: await svc.setActive(req.params.questId, active) }, 'Quest toggled');
	} catch (err) {
		return fail(res, err);
	}
};

export const completions = async (req, res) => {
	try {
		const limit = parseInt(req.query.limit, 10) || 50;
		return ok(
			res,
			{ completions: await svc.completions(req.params.questId, { limit }) },
			'Completions fetched'
		);
	} catch (err) {
		return fail(res, err);
	}
};

export default { list, create, update, toggle, completions };
