import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Minimal models for seeding without using aliases
const userSchema = new mongoose.Schema({
  fullName: String,
  userName: { type: String, unique: true },
  email: { type: String, unique: true },
  password: { type: String, required: true },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'roles' }],
  novaCoins: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  isOnboarded: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: true },
  lastActiveAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const roleSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  description: String
});

const mealLogSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  food: String,
  mealTime: String,
  calories: Number,
  protein: Number,
  carbs: Number,
  fats: Number,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  type: String,
  balanceAfter: Number,
  source: { category: String, description: String },
  createdAt: { type: Date, default: Date.now }
});

const safetySchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  category: String,
  severity: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('users_seed', userSchema, 'users');
const Role = mongoose.model('roles_seed', roleSchema, 'roles');
const MealLog = mongoose.model('meallogs_seed', mealLogSchema, 'meallogs');
const Transaction = mongoose.model('transactions_seed', transactionSchema, 'novatransactions');
const Safety = mongoose.model('safety_seed', safetySchema, 'safetyevents');

import dotenv from 'dotenv';
dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI || 'mongodb://127.0.0.1:27017/zenova-db');
    console.log('Connected to MongoDB');

    // 1. Roles
    let adminRole = await Role.findOne({ name: 'Super Administrator' });
    if (!adminRole) adminRole = await Role.create({ name: 'Super Administrator', description: 'All access' });
    
    let userRole = await Role.findOne({ name: 'User' });
    if (!userRole) userRole = await Role.create({ name: 'User', description: 'Standard user' });

    // 2. Admin User
    const adminEmail = 'admin@zenova.app';
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('AdminPassword123!', salt);

    await User.findOneAndUpdate(
      { email: adminEmail },
      {
        fullName: 'Zenova Admin',
        userName: 'zenova_admin',
        email: adminEmail,
        password: hashedPassword,
        roles: [adminRole._id],
        isOnboarded: true,
        isVerified: true
      },
      { upsert: true }
    );
    console.log('Admin user ready');

    // 3. Test Users (for Growth Chart)
    const days = [0, 1, 2, 3, 5, 7, 10, 15, 20];
    const testUsers = [];
    for (const d of days) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const email = `user_${d}@test.com`;
      const u = await User.findOneAndUpdate(
        { email },
        {
          fullName: `User ${d}`,
          userName: `user_${d}`,
          email,
          password: hashedPassword,
          roles: [userRole._id],
          createdAt: date,
          lastActiveAt: new Date()
        },
        { upsert: true, new: true }
      );
      testUsers.push(u);
    }
    const testUser = testUsers[0];
    console.log('Test users created for growth chart');

    // 4. Activity Logs (for Features Chart)
    await MealLog.deleteMany({});
    const mealItems = [
      { food: 'Oatmeal', calories: 300 },
      { food: 'Salad', calories: 200 },
      { food: 'Burger', calories: 800 },
      { food: 'Pizza', calories: 900 }
    ];
    for (let i = 0; i < 20; i++) {
      const item = mealItems[i % 4];
      const date = new Date();
      date.setDate(date.getDate() - (i % 7));
      await MealLog.create({
        userId: testUsers[i % testUsers.length]._id,
        food: item.food,
        mealTime: 'lunch',
        calories: item.calories,
        createdAt: date
      });
    }
    console.log('Sample meal logs seeded');

    // 5. Transactions (for Coins Chart)
    await Transaction.deleteMany({});
    for (let i = 0; i < 15; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      await Transaction.create({
        userId: testUser._id,
        amount: 50 + (i * 10),
        type: 'earn',
        balanceAfter: 1000 + (i * 50),
        source: { category: 'workout', description: 'Daily exercise' },
        createdAt: date
      });
    }
    console.log('Transactions seeded');

    // 6. Safety Events
    await Safety.deleteMany({});
    await Safety.create({
      userId: testUser._id,
      category: 'crisis',
      severity: 'high',
      createdAt: new Date()
    });
    console.log('Safety events seeded');

    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
