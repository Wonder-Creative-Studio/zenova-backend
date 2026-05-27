// src/controllers/admin/trainerGreetingController.js
import svc from '~/services/admin/trainerGreetingAdminService';

const ok = (res, data, message = 'Success') => res.json({ success: true, data, message });
const fail = (res, err) =>
	res.status(err.status || 400).json({ success: false, data: {}, message: err.message || 'Failed' });

export const list = async (req, res) => {
	try {
		return ok(res, await svc.list(req.query), 'Trainer greetings fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const create = async (req, res) => {
	try {
		return ok(res, { greeting: await svc.create(req.body || {}) }, 'Trainer greeting created');
	} catch (err) {
		return fail(res, err);
	}
};

export const update = async (req, res) => {
	try {
		return ok(res, { greeting: await svc.update(req.params.id, req.body || {}) }, 'Trainer greeting updated');
	} catch (err) {
		return fail(res, err);
	}
};

export default { list, create, update };
