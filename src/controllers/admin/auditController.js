// src/controllers/admin/auditController.js
import audit from '~/services/admin/auditService';

const ok = (res, data, message = 'Success') => res.json({ success: true, data, message });
const fail = (res, err) =>
	res.status(err.status || 400).json({ success: false, data: {}, message: err.message || 'Failed' });

export const list = async (req, res) => {
	try {
		return ok(res, await audit.list(req.query), 'Audit logs fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export default { list };
