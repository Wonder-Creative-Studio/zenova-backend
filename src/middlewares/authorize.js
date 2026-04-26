// src/middlewares/authorize.js
// RBAC guard. Runs AFTER authenticate() — expects req.user to be set.
//
//   router.get('/', authenticate(),
//                  authorize('Super Administrator', 'Administrator'),
//                  handler);
//
// If no role is passed, it allows any admin-tier role by default.
import User from '~/models/userModel';
import logger from '~/config/logger';

const DEFAULT_ADMIN_ROLES = ['Super Administrator', 'Administrator', 'Moderator'];

const authorize = (...allowedRoles) => async (req, res, next) => {
	try {
		if (!req.user?.id) {
			return res.status(401).json({ success: false, data: {}, message: 'Unauthorized' });
		}
		const allowed = allowedRoles.length ? allowedRoles : DEFAULT_ADMIN_ROLES;

		const user = await User.findById(req.user.id).populate('roles', 'name');
		if (!user) {
			return res.status(401).json({ success: false, data: {}, message: 'User not found' });
		}

		const roleNames = (user.roles || []).map((r) => r.name);
		const hasAccess = allowed.some((r) => roleNames.includes(r));

		if (!hasAccess) {
			return res.status(403).json({
				success: false,
				data: {},
				message: 'Forbidden — insufficient permissions',
			});
		}

		// Cache role names for downstream middleware/handlers.
		req.user.roleNames = roleNames;
		req.user.email = user.email;
		return next();
	} catch (err) {
		logger.error(`authorize middleware error: ${err.message}`);
		return res.status(500).json({ success: false, data: {}, message: 'Authorization failed' });
	}
};

export default authorize;
