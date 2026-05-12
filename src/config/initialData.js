import Permission from '~/models/permissionModel';
import Role from '~/models/roleModel';
import User from '~/models/userModel';
import Quest from '~/models/questModel';
import logger from './logger';


async function initialData() {
	try {
		await Quest.updateMany(
			{
				title: 'Daily Check-in',
				category: 'daily',
				condition: { $ne: 'today.activityCount >= 1' },
			},
			{
				$set: {
					condition: 'today.activityCount >= 1',
					rewardCoins: 100,
					rewardMedals: 2,
					resetPeriod: 'daily',
					isActive: true,
				},
			}
		);

		const countPermissions = await Permission.estimatedDocumentCount();
		if (countPermissions === 0) {
			await Permission.create(
			// User permissions
			{ controller: 'user', action: 'create' },
			{ controller: 'user', action: 'read' },
			{ controller: 'user', action: 'update' },
			{ controller: 'user', action: 'delete' },

			// Role permissions
			{ controller: 'role', action: 'create' },
			{ controller: 'role', action: 'read' },
			{ controller: 'role', action: 'update' },
			{ controller: 'role', action: 'delete' },

			// Course permissions
			{ controller: 'course', action: 'create' },
			{ controller: 'course', action: 'read' },
			{ controller: 'course', action: 'update' },
			{ controller: 'course', action: 'delete' },

			// Quiz permissions
			{ controller: 'quiz', action: 'create' },
			{ controller: 'quiz', action: 'read' },
			{ controller: 'quiz', action: 'update' },
			{ controller: 'quiz', action: 'delete' },

			// Progress permissions
			{ controller: 'progress', action: 'create' },
			{ controller: 'progress', action: 'read' },
			{ controller: 'progress', action: 'update' },
			{ controller: 'progress', action: 'delete' },

			// Certificate permissions
			{ controller: 'certificate', action: 'create' },
			{ controller: 'certificate', action: 'read' },
			{ controller: 'certificate', action: 'update' },
			{ controller: 'certificate', action: 'delete' }, 

			// Payment permissions
			{ controller: 'payment', action: 'create' },
			{ controller: 'payment', action: 'read' },
			{ controller: 'payment', action: 'update' },
			{ controller: 'payment', action: 'delete' }, 

			{ controller: 'video', action: 'create' },
			{ controller: 'video', action: 'read' },
			{ controller: 'video', action: 'update' },
			{ controller: 'video', action: 'delete' }, 

			{ controller: 'tutor', action: 'read' },

		);
		}

		const countRoles = await Role.estimatedDocumentCount();
		if (countRoles === 0) {
			const permissionsSuperAdministrator = await Permission.find({ controller: 'role' });
			const permissionsAdministrator = await Permission.find({ controller: 'user' });
			const permissionsModerator = await Permission.find({ controller: 'user', action: { $ne: 'delete' } });
			const permissionsInstructor = await Permission.find({
					controller: { $in: ['course', 'quiz', 'progress', 'certificate', 'payment','video', 'tutor'] }
					});


			await Role.create(
				{
				name: 'Super Administrator',
				permissions: permissionsSuperAdministrator
				},
				{
				name: 'Administrator',
				permissions: permissionsAdministrator
				},
				{
				name: 'Moderator',
				permissions: permissionsModerator
				},
				{
				name: 'instructor',
				permissions: permissionsInstructor
				},
				{
				name: 'User',
				permissions: []
				}
			);
			}

		const countUsers = await User.estimatedDocumentCount();
		if (countUsers === 0) {
			const roleSuperAdministrator = await Role.findOne({ name: 'Super Administrator' });
			const roleAdministrator = await Role.findOne({ name: 'Administrator' });
			const roleModerator = await Role.findOne({ name: 'Moderator' });
			const roleInstructor =  await  Role.findOne({ name: 'instructor'})
			const roleUser = await Role.findOne({ name: 'User' }); 
			await User.create(
				{
					fullName: 'Thuc',
					userName: 'superadmin',
					email: 'admjnwapviip@gmail.com',
					password: 'superadmin',
					roles: [roleSuperAdministrator, roleAdministrator, roleModerator, roleUser]
				},
				{
					fullName: 'Vy',
					userName: 'admin',
					email: 'admin@example.com',
					password: 'admin',
					roles: [roleAdministrator]
				},
				{
					fullName: 'Thuyen',
					userName: 'moderator',
					email: 'moderator@example.com',
					password: 'moderator',
					roles: [roleModerator]
				},
				{
					fullName: 'Uyen',
					userName: 'user',
					email: 'user@example.com',
					password: 'user',
					roles: [roleUser]
				}, 
				{
					fullName: 'Test', 
					userName: 'instructor',
					email: 'instructor@example.com', 
					password: 'instructor', 
					roles: [roleInstructor]
				}
			);
		}
	} catch (err) {
		logger.error(err);
	}
}

export default initialData;
