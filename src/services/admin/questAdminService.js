// src/services/admin/questAdminService.js
import Quest from '~/models/questModel';
import User from '~/models/userModel';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

export const list = async (query = {}) => {
	const filter = {};
	if (query.category) filter.category = query.category;
	if (query.isActive !== undefined) filter.isActive = query.isActive === 'true' || query.isActive === true;

	const items = await Quest.find(filter).sort({ createdAt: -1 }).lean();
	return {
		items: items.map((q) => ({
			id: q._id,
			title: q.title,
			description: q.description,
			condition: q.condition,
			reward_coins: q.rewardCoins,
			badge: q.badge,
			category: q.category,
			reset_period: q.resetPeriod,
			expires_at: q.expiresAt,
			is_active: q.isActive,
			created_at: q.createdAt,
		})),
	};
};

export const create = async (body) => {
	const q = await Quest.create({
		title: body.title,
		description: body.description,
		condition: body.condition,
		rewardCoins: body.rewardCoins || 0,
		badge: body.badge || {},
		category: body.category || 'milestone',
		resetPeriod: body.resetPeriod || 'none',
		expiresAt: body.expiresAt || null,
		isActive: body.isActive !== undefined ? body.isActive : true,
	});
	return q.toObject();
};

export const update = async (id, body) => {
	const patch = {};
	const allow = [
		'title',
		'description',
		'condition',
		'rewardCoins',
		'badge',
		'category',
		'resetPeriod',
		'expiresAt',
		'isActive',
	];
	for (const k of allow) if (body[k] !== undefined) patch[k] = body[k];
	const updated = await Quest.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
	if (!updated) throw new APIError('Quest not found', httpStatus.NOT_FOUND);
	return updated;
};

export const setActive = async (id, active) => {
	const updated = await Quest.findByIdAndUpdate(id, { $set: { isActive: !!active } }, { new: true }).lean();
	if (!updated) throw new APIError('Quest not found', httpStatus.NOT_FOUND);
	return updated;
};

export const completions = async (questId, { limit = 50 } = {}) => {
	const rows = await User.find({ 'questsCompleted.questId': questId })
		.select('_id fullName email questsCompleted')
		.limit(Math.min(limit, 500))
		.lean();

	return rows.map((u) => {
		const match = u.questsCompleted.find((x) => String(x.questId) === String(questId));
		return {
			user_id: u._id,
			full_name: u.fullName,
			email: u.email,
			completed_at: match?.completedAt || null,
		};
	});
};

export default { list, create, update, setActive, completions };
