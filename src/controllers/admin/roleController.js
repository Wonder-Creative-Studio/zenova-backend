// src/controllers/admin/roleController.js
// Read-only in MVP. Prevents accidental permission changes from the admin UI.
import Role from '~/models/roleModel';
import Permission from '~/models/permissionModel';

const ok = (res, data, message = 'Success') => res.json({ success: true, data, message });
const fail = (res, err) =>
	res.status(err.status || 400).json({ success: false, data: {}, message: err.message || 'Failed' });

export const listRoles = async (req, res) => {
	try {
		const roles = await Role.find({}).populate('permissions').lean();
		return ok(
			res,
			{
				roles: roles.map((r) => ({
					id: r._id,
					name: r.name,
					description: r.description,
					permissions: (r.permissions || []).map((p) => ({
						id: p._id,
						controller: p.controller,
						action: p.action,
					})),
				})),
			},
			'Roles fetched'
		);
	} catch (err) {
		return fail(res, err);
	}
};

export const listPermissions = async (req, res) => {
	try {
		const perms = await Permission.find({}).lean();
		return ok(
			res,
			{
				permissions: perms.map((p) => ({
					id: p._id,
					controller: p.controller,
					action: p.action,
					enabled: !!p.enabled,
				})),
			},
			'Permissions fetched'
		);
	} catch (err) {
		return fail(res, err);
	}
};

export default { listRoles, listPermissions };
