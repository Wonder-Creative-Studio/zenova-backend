import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const roleSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  description: String
});

const userSchema = new mongoose.Schema({
  fullName: String,
  userName: { type: String, unique: true },
  email: { type: String, unique: true },
  password: { type: String, required: true },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'roles' }],
  isOnboarded: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('users_admin_seed', userSchema, 'users');
const Role = mongoose.model('roles_admin_seed', roleSchema, 'roles');

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://joseph:admin@cluster0.xtpdu2w.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to test database');

    let adminRole = await Role.findOne({ name: 'Super Administrator' });
    if (!adminRole) {
      adminRole = await Role.create({ name: 'Super Administrator', description: 'All access' });
    }
    let userRole = await Role.findOne({ name: 'User' });
    if (!userRole) {
      userRole = await Role.create({ name: 'User', description: 'Standard user' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('AdminPassword123!', salt);

    await User.findOneAndUpdate(
      { email: 'admin@zenova.app' },
      {
        fullName: 'Zenova Admin',
        userName: 'zenova_admin',
        email: 'admin@zenova.app',
        password: hashedPassword,
        roles: [adminRole._id],
        isOnboarded: true,
        isVerified: true
      },
      { upsert: true }
    );
    console.log('Admin user successfully created in the test database.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
