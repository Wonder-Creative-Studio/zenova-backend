// src/services/admin/gamificationAdminService.js
import NovaTransaction from '~/models/novaTransactionModel';
import User from '~/models/userModel';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

export const economyOverview = async ({ days = 30 } = {}) => {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	const [totals, inCirculation, topEarners] = await Promise.all([
		NovaTransaction.aggregate([
			{ $match: { createdAt: { $gte: since } } },
			{
				$group: {
					_id: null,
					earned: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
					spent: { $sum: { $cond: [{ $lt: ['$amount', 0] }, '$amount', 0] } },
					tx_count: { $sum: 1 },
				},
			},
		]).then((r) => r?.[0] || { earned: 0, spent: 0, tx_count: 0 }),
		User.aggregate([{ $group: { _id: null, total: { $sum: '$novaCoins' } } }]).then(
			(r) => r?.[0]?.total || 0
		),
		User.find({})
			.select('_id fullName email novaCoins level rank')
			.sort({ novaCoins: -1 })
			.limit(10)
			.lean(),
	]);

	return {
		days,
		in_circulation: inCirculation,
		earned_in_window: totals.earned,
		spent_in_window: Math.abs(totals.spent),
		transactions_in_window: totals.tx_count,
		top_earners: topEarners.map((u) => ({
			user_id: u._id,
			full_name: u.fullName,
			email: u.email,
			nova_coins: u.novaCoins,
			level: u.level,
			rank: u.rank,
		})),
	};
};

export const listTransactions = async (query = {}) => {
	const page = Math.max(parseInt(query.page, 10) || 1, 1);
	const limit = Math.min(Math.max(parseInt(query.limit, 10) || 30, 1), 200);
	const filter = {};
	if (query.userId) filter.userId = query.userId;
	if (query.type) filter.type = query.type;
	if (query.category) filter['source.category'] = query.category;
	if (query.since) filter.createdAt = { $gte: new Date(query.since) };

	const [items, total] = await Promise.all([
		NovaTransaction.find(filter)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		NovaTransaction.countDocuments(filter),
	]);

	return {
		page,
		limit,
		total,
		total_pages: Math.ceil(total / limit),
		items: items.map((t) => ({
			id: t._id,
			user_id: t.userId,
			amount: t.amount,
			balance_after: t.balanceAfter,
			type: t.type,
			category: t.source?.category || null,
			description: t.source?.description || null,
			created_at: t.createdAt,
		})),
	};
};

export const adjustCoins = async ({ userId, amount, reason, adminId }) => {
	if (!amount || Number.isNaN(Number(amount))) {
		throw new APIError('amount is required and must be a number', httpStatus.BAD_REQUEST);
	}
	const delta = Number(amount);

	const user = await User.findById(userId);
	if (!user) throw new APIError('User not found', httpStatus.NOT_FOUND);

	const newBalance = Math.max(0, (user.novaCoins || 0) + delta);
	user.novaCoins = newBalance;
	await user.save();

	await NovaTransaction.create({
		userId,
		amount: delta,
		balanceAfter: newBalance,
		type: 'admin_adjustment',
		source: {
			category: 'admin',
			description: reason || `Admin adjustment by ${adminId}`,
		},
	});

	return {
		user_id: userId,
		delta,
		new_balance: newBalance,
		reason: reason || null,
	};
};

export default { economyOverview, listTransactions, adjustCoins };
