// src/controllers/admin/safetyController.js
import safety from '~/services/admin/safetyAdminService';

const ok = (res, data, message = 'Success') => res.json({ success: true, data, message });
const fail = (res, err) =>
	res.status(err.status || 400).json({ success: false, data: {}, message: err.message || 'Failed' });

export const list = async (req, res) => {
	try {
		return ok(res, await safety.list(req.query), 'Safety events fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const stats = async (req, res) => {
	try {
		const days = parseInt(req.query.days, 10) || 30;
		return ok(res, await safety.stats({ days }), 'Safety stats fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export default { list, stats };
