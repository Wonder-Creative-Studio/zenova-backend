// src/services/admin/auditService.js
import AuditLog from '~/models/auditLogModel';

export const list = async (query = {}) => {
	const page = Math.max(parseInt(query.page, 10) || 1, 1);
	const limit = Math.min(Math.max(parseInt(query.limit, 10) || 30, 1), 200);
	const filter = {};
	if (query.adminId) filter.adminId = query.adminId;
	if (query.action) filter.action = query.action;
	if (query.targetId) filter.targetId = query.targetId;
	if (query.since) filter.createdAt = { $gte: new Date(query.since) };

	const [items, total] = await Promise.all([
		AuditLog.find(filter)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		AuditLog.countDocuments(filter),
	]);

	return {
		page,
		limit,
		total,
		total_pages: Math.ceil(total / limit),
		items: items.map((i) => ({
			id: i._id,
			admin_id: i.adminId,
			admin_email: i.adminEmail,
			action: i.action,
			target_model: i.targetModel,
			target_id: i.targetId,
			method: i.method,
			route: i.route,
			status: i.status,
			changes: i.changes,
			ip_address: i.ipAddress,
			user_agent: i.userAgent,
			created_at: i.createdAt,
		})),
	};
};

export default { list };
