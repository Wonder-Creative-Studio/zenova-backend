// src/controllers/admin/systemController.js
import systemHealth from '~/services/admin/systemHealthService';

const ok = (res, data, message = 'Success') => res.json({ success: true, data, message });
const fail = (res, err) =>
	res.status(err.status || 400).json({ success: false, data: {}, message: err.message || 'Failed' });

export const health = async (req, res) => {
	try {
		return ok(res, await systemHealth.health(), 'Health fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export default { health };
