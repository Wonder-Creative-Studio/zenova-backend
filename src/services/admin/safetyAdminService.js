// src/services/admin/safetyAdminService.js
// Read-only admin views over the chatbot v1 safety_events feed.
import SafetyEvent from '~/models/safetyEventModel';
import User from '~/models/userModel';

const CATEGORIES = [
	'suicide_self_harm',
	'eating_disorder_active',
	'acute_mental_health_crisis',
	'medical_emergency',
];

export const list = async (query = {}) => {
	const page = Math.max(parseInt(query.page, 10) || 1, 1);
	const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
	const filter = {};
	if (query.category) filter.category = query.category;
	else filter.category = { $in: CATEGORIES }; // hide 'safe' by default

	if (query.agent) filter.agent = query.agent;
	if (query.userId) filter.userId = query.userId;
	if (query.since) filter.createdAt = { $gte: new Date(query.since) };

	const [items, total] = await Promise.all([
		SafetyEvent.find(filter)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		SafetyEvent.countDocuments(filter),
	]);

	// Light-hydrate user name + email for display.
	const userIds = [...new Set(items.map((i) => String(i.userId)).filter(Boolean))];
	const users = userIds.length
		? await User.find({ _id: { $in: userIds } }).select('_id fullName email').lean()
		: [];
	const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));

	return {
		page,
		limit,
		total,
		total_pages: Math.ceil(total / limit),
		events: items.map((e) => ({
			id: e._id,
			user_id: e.userId,
			user_name: byId[String(e.userId)]?.fullName || null,
			user_email: byId[String(e.userId)]?.email || null,
			thread_id: e.threadId || null,
			agent: e.agent,
			category: e.category,
			severity: e.severity,
			detected_by: e.detectedBy,
			created_at: e.createdAt,
		})),
	};
};

export const stats = async ({ days = 30 } = {}) => {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	const rows = await SafetyEvent.aggregate([
		{ $match: { createdAt: { $gte: since }, category: { $in: CATEGORIES } } },
		{ $group: { _id: '$category', count: { $sum: 1 } } },
	]);
	const byCategory = Object.fromEntries(rows.map((r) => [r._id, r.count]));
	const total = rows.reduce((s, r) => s + r.count, 0);
	return { days, total, by_category: byCategory };
};

export default { list, stats };
