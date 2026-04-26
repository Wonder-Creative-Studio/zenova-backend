// src/scripts/seedFullData.js
// Run with: node -r module-alias/register src/scripts/seedFullData.js

import mongoose from 'mongoose';
import config from '~/config/config';
import User from '~/models/userModel';
import Role from '~/models/roleModel';
import MealLog from '~/models/mealLogModel';
import WorkoutLog from '~/models/workoutLogModel';
import SleepLog from '~/models/sleepLogModel';
import ChatThread from '~/models/chatThreadModel';
import ChatMessage from '~/models/chatMessageModel';
import NovaTransaction from '~/models/novaTransactionModel';
import SafetyEvent from '~/models/safetyEventModel';

async function seedData() {
    try {
        await mongoose.connect(config.DATABASE_URI, config.DATABASE_OPTIONS);
        console.log('Connected to MongoDB');

        // Create a User Role
        const role = await Role.findOneAndUpdate(
            { name: 'User' },
            { name: 'User', permissions: [] },
            { upsert: true, new: true }
        );

        // Create a Test User
        const user = await User.findOneAndUpdate(
            { email: 'test_user@zenova.app' },
            {
                fullName: 'Zenova Tester',
                userName: 'zenova_tester',
                email: 'test_user@zenova.app',
                password: 'TestPassword123!',
                roles: [role._id],
                novaCoins: 1500,
                level: 5,
                isVerified: true,
                isOnboarded: true,
                lastActiveAt: new Date()
            },
            { upsert: true, new: true }
        );
        console.log('User created:', user.email);

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Add Activity Logs
        await MealLog.deleteMany({ userId: user._id });
        await MealLog.create([
            { userId: user._id, food: 'Oatmeal', mealTime: 'breakfast', calories: 400, protein: 15, carbs: 60, fats: 10, createdAt: yesterday },
            { userId: user._id, food: 'Chicken Salad', mealTime: 'lunch', calories: 700, protein: 45, carbs: 20, fats: 30, createdAt: now }
        ]);

        console.log('Activity logs seeded');

        // Add AI Chat Threads
        await ChatThread.deleteMany({ userId: user._id });
        const thread = await ChatThread.create({
            userId: user._id,
            agent: 'calia',
            title: 'Diet Advice',
            category: 'nutrition',
            createdAt: now
        });

        await ChatMessage.deleteMany({ threadId: thread._id });
        await ChatMessage.create([
            { threadId: thread._id, userId: user._id, agent: 'calia', role: 'user', content: 'What is a good high-protein breakfast?', createdAt: yesterday },
            { threadId: thread._id, userId: user._id, agent: 'calia', role: 'assistant', content: 'Eggs and oatmeal are great options!', createdAt: yesterday, tokensUsed: 40 },
            { threadId: thread._id, userId: user._id, agent: 'calia', role: 'user', content: 'I feel like giving up on my diet completely.', createdAt: now },
            { threadId: thread._id, userId: user._id, agent: 'calia', role: 'assistant', content: 'It is completely normal to feel this way. Let us take it one step at a time.', createdAt: now, tokensUsed: 60 }
        ]);

        console.log('AI Threads seeded');

        // Add Safety Events
        await SafetyEvent.deleteMany({ userId: user._id });
        await SafetyEvent.create([
            {
                userId: user._id,
                threadId: thread._id,
                agent: 'calia',
                category: 'eating_disorder_active',
                detectedBy: 'keyword_filter',
                severity: 'medium',
                snippet: 'I feel like giving up on my diet completely.',
                resolved: true,
                createdAt: now
            }
        ]);

        console.log('Safety Events seeded');

        // Add Gamification Transactions
        await NovaTransaction.deleteMany({ userId: user._id });
        await NovaTransaction.create([
            {
                userId: user._id,
                type: 'activity_reward',
                amount: 50,
                balanceAfter: 1400,
                source: { category: 'workout', description: 'Completed a workout' },
                createdAt: lastWeek
            },
            {
                userId: user._id,
                type: 'spent',
                amount: -100,
                balanceAfter: 1300,
                source: { category: 'purchase', description: 'Purchased a new avatar' },
                createdAt: yesterday
            },
            {
                userId: user._id,
                type: 'quest_bonus',
                amount: 200,
                balanceAfter: 1500,
                source: { category: 'quest', description: '7-day streak' },
                createdAt: now
            }
        ]);

        console.log('Gamification transactions seeded');

        console.log('✅ All sample data seeded successfully!');

    } catch (err) {
        console.error('Seeding error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedData();
