// src/controllers/admin/gamificationController.js
import svc from '~/services/admin/gamificationAdminService';

const ok = (res, data, message = 'Success') => res.json({ success: true, data, message });
const fail = (res, err) =>
	res.status(err.status || 400).json({ success: false, data: {}, message: err.message || 'Failed' });

export const economy = async (req, res) => {
	try {
		const days = parseInt(req.query.days, 10) || 30;
		return ok(res, await svc.economyOverview({ days }), 'Economy overview fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const transactions = async (req, res) => {
	try {
		return ok(res, await svc.listTransactions(req.query), 'Transactions fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const adjust = async (req, res) => {
	try {
		const { userId, amount, reason } = req.body || {};
		const result = await svc.adjustCoins({
			userId,
			amount,
			reason,
			adminId: req.user.id,
		});
		return ok(res, result, 'Coins adjusted');
	} catch (err) {
		return fail(res, err);
	}
};

export default { economy, transactions, adjust };
