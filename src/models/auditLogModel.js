// src/models/auditLogModel.js
// Admin action audit trail. Auto-populated by the `auditLog` middleware on
// every mutating /api/admin/* request.
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
	{
		adminId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'users',
			required: true,
			index: true,
		},
		adminEmail: { type: String, default: null },
		action: { type: String, required: true }, // 'user.update', 'quest.create', …
		targetModel: { type: String, default: null }, // 'users', 'quests', 'roles', …
		targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
		method: { type: String, default: null },
		route: { type: String, default: null },
		status: { type: Number, default: null },
		changes: { type: mongoose.Schema.Types.Mixed, default: null },
		ipAddress: { type: String, default: null },
		userAgent: { type: String, default: null },
	},
	{ timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ adminId: 1, createdAt: -1 });

const AuditLog = mongoose.model('audit_logs', auditLogSchema);
export default AuditLog;
