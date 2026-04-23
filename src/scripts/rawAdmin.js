const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URL = 'mongodb://127.0.0.1:27017/zenova-db';

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('Connected to DB');

    const db = mongoose.connection.db;

    // 1. Ensure Super Administrator role exists
    let role = await db.collection('roles').findOne({ name: 'Super Administrator' });
    if (!role) {
      console.log('Creating Super Administrator role...');
      const res = await db.collection('roles').insertOne({
        name: 'Super Administrator',
        description: 'Has all permissions',
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: []
      });
      role = { _id: res.insertedId };
    }

    const email = 'admin@zenova.app';
    const password = 'AdminPassword123!';
    const hashedPassword = await bcrypt.hash(password, 8); // Backend config might use 8

    // 2. Check if user exists
    let user = await db.collection('users').findOne({ email });
    if (user) {
      console.log('Admin user exists. Upgrading to Super Administrator...');
      await db.collection('users').updateOne(
        { email },
        { 
          $set: { confirmed: true, password: hashedPassword },
          $addToSet: { roles: role._id } 
        }
      );
    } else {
      console.log('Creating new Admin user...');
      await db.collection('users').insertOne({
        fullName: 'Zenova Admin',
        userName: 'zenova_admin',
        email,
        password: hashedPassword,
        roles: [role._id],
        confirmed: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log('SUCCESS: Admin user is ready.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
