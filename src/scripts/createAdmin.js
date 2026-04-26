import mongoose from 'mongoose';
import User from '~/models/userModel.js';
import Role from '~/models/roleModel.js';
import config from '~/config/config.js';

const createAdmin = async () => {
  try {
    await mongoose.connect(config.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to DB');

    let role = await Role.getRoleByName('Super Administrator');
    if (!role) {
      console.log('Creating Super Administrator role...');
      role = await Role.create({ name: 'Super Administrator', description: 'Has all permissions' });
    }

    const email = 'admin@zenova.app';
    const password = 'AdminPassword123!';

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Admin user already exists. Updating role...');
      if (!existingUser.roles.includes(role._id)) {
        existingUser.roles.push(role._id);
        await existingUser.save();
      }
      console.log('Admin user is ready.');
    } else {
      console.log('Creating new Admin user...');
      const user = await User.createUser({
        fullName: 'Zenova Admin',
        userName: 'zenova_admin',
        email,
        password,
        roles: [role._id],
        confirmed: true
      });
      console.log('Admin user created successfully.');
    }

    console.log('--- CREDENTIALS ---');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('-------------------');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

createAdmin();
