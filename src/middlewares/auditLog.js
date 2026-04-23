// src/middlewares/auditLog.js
// Drop-in audit middleware for admin mutating routes.
// Usage:
//   router.patch('/users/:userId',
//     authenticate(), authorize(),
//     auditLog({ action: 'user.update', targetModel: 'users', targetIdFrom: 'params.userId' }),
//     ...handler);
//
// Captures a snapshot after the response is sent so it doesn't block.
import AuditLog from '~/models/auditLogModel';
import logger from '~/config/logger';
import _ from 'lodash';

const pick = (obj, path) => _.get(obj, path, null);

const auditLog = ({ action, targetModel = null, targetIdFrom = null }) => (req, res, next) => {
	const startedAt = Date.now();

	res.on('finish', () => {
		try {
			// Don't audit failures or non-admin calls.
			if (res.statusCode >= 400) return;

			const adminId = req.user?.id || null;
			if (!adminId) return;

			const targetId = targetIdFrom ? pick(req, targetIdFrom) : null;

			// Changes payload: the body the admin sent, minus obvious noise.
			const body = { ...(req.body || {}) };
			delete body.password;
			delete body.token;

			AuditLog.create({
				adminId,
				adminEmail: req.user?.email || null,
				action,
				targetModel,
				targetId: targetId && /^[0-9a-fA-F]{24}$/.test(String(targetId)) ? targetId : null,
				method: req.method,
				route: req.originalUrl,
				status: res.statusCode,
				changes: Object.keys(body).length ? { body } : null,
				ipAddress: req.ip || req.connection?.remoteAddress || null,
				userAgent: req.get('user-agent') || null,
			}).catch((err) => logger.warn(`auditLog write failed: ${err.message}`));

			logger.info(`[audit] ${action} admin=${adminId} target=${targetId || '-'} took=${Date.now() - startedAt}ms`);
		} catch (err) {
			logger.warn(`auditLog middleware error: ${err.message}`);
		}
	});

	next();
};

export default auditLog;
