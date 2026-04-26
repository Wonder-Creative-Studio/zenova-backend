// src/scripts/makeAdmin.js
// Assigns the Admin role to a user by email
// Run with: npm run make:admin -- --email=user@example.com

import mongoose from 'mongoose';
import config from '~/config/config';
import User from '~/models/userModel';
import Role from '~/models/roleModel';

const email = process.argv.find(a => a.startsWith('--email='))?.split('=')[1];

if (!email) {
  console.error('Usage: npm run make:admin -- --email=user@example.com');
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(config.DATABASE_URI);
  console.log('Connected to MongoDB');

  // Find or create Admin role
  let adminRole = await Role.findOne({ name: 'Admin' });
  if (!adminRole) {
    adminRole = await Role.create({ name: 'Admin', description: 'Full admin access' });
    console.log('Created Admin role');
  }

  // Find user
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`User not found: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Assign role if not already assigned
  if (user.roles.map(r => r.toString()).includes(adminRole._id.toString())) {
    console.log(`${email} is already an Admin`);
  } else {
    user.roles.push(adminRole._id);
    await user.save();
    console.log(`✅ ${email} is now an Admin`);
  }

  await mongoose.disconnect();
};

run().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
