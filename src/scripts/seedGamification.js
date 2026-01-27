// src/scripts/seedGamification.js
// Run with: node -r module-alias/register src/scripts/seedGamification.js

import mongoose from 'mongoose';
import config from '~/config/config';
import Quest from '~/models/questModel';
import Badge from '~/models/badgeModel';

const SAMPLE_QUESTS = [
    // Daily Quests
    {
        title: 'Daily Check-in',
        description: 'Log any activity today',
        condition: 'thisWeek.moodLogs >= 1 || thisWeek.workoutLogs >= 1',
        rewardCoins: 10,
        category: 'daily',
        resetPeriod: 'daily',
        isActive: true
    },

    // Weekly Quests
    {
        title: 'Mood Master Week',
        description: 'Log your mood 5 times this week',
        condition: 'thisWeek.moodLogs >= 5',
        rewardCoins: 50,
        category: 'weekly',
        resetPeriod: 'weekly',
        badge: { name: 'mood_master', icon: 'mood_5' },
        isActive: true
    },
    {
        title: 'Active Week',
        description: 'Complete 3 workouts this week',
        condition: 'thisWeek.workoutLogs >= 3',
        rewardCoins: 75,
        category: 'weekly',
        resetPeriod: 'weekly',
        isActive: true
    },

    // Milestone Quests
    {
        title: 'First Steps',
        description: 'Log your first activity',
        condition: 'totals.moodLogs >= 1 || totals.workoutLogs >= 1 || totals.mealLogs >= 1',
        rewardCoins: 25,
        category: 'milestone',
        isActive: true
    },
    {
        title: '7-Day Streak',
        description: 'Maintain a 7-day activity streak',
        condition: 'streaks.current >= 7',
        rewardCoins: 100,
        badge: { name: 'week_warrior', icon: 'streak_7' },
        category: 'milestone',
        isActive: true
    },
    {
        title: '30-Day Streak',
        description: 'Maintain a 30-day activity streak',
        condition: 'streaks.current >= 30',
        rewardCoins: 300,
        badge: { name: 'monthly_champion', icon: 'streak_30' },
        category: 'milestone',
        isActive: true
    },
    {
        title: 'Fitness Enthusiast',
        description: 'Complete 25 workouts',
        condition: 'totals.workoutLogs >= 25',
        rewardCoins: 150,
        category: 'milestone',
        isActive: true
    },
    {
        title: 'Mindfulness Master',
        description: 'Complete 50 meditation sessions',
        condition: 'totals.meditationLogs >= 50',
        rewardCoins: 200,
        badge: { name: 'zen_master', icon: 'meditation_50' },
        category: 'milestone',
        isActive: true
    },
    {
        title: 'Step Champion',
        description: 'Walk 100,000 total steps',
        condition: 'totals.steps >= 100000',
        rewardCoins: 250,
        category: 'milestone',
        isActive: true
    },
    {
        title: 'Coin Collector',
        description: 'Earn 1,000 NovaCoins',
        condition: 'totals.coinsEarned >= 1000',
        rewardCoins: 100,
        badge: { name: 'coin_collector', icon: 'coins_1k' },
        category: 'milestone',
        isActive: true
    }
];

const SAMPLE_BADGES = [
    // Streak Badges
    {
        name: 'first_step',
        displayName: 'First Step',
        description: 'Complete your first activity',
        icon: 'badge_first_step',
        category: 'milestone',
        tier: 'bronze',
        statField: 'totals.moodLogs',
        targetValue: 1,
        bonusCoins: 10,
        sortOrder: 1
    },
    {
        name: 'week_warrior',
        displayName: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: 'badge_streak_7',
        category: 'streak',
        tier: 'bronze',
        statField: 'streaks.current',
        targetValue: 7,
        bonusCoins: 25,
        sortOrder: 10
    },
    {
        name: 'two_week_streak',
        displayName: 'Fortnight Fighter',
        description: 'Maintain a 14-day streak',
        icon: 'badge_streak_14',
        category: 'streak',
        tier: 'silver',
        statField: 'streaks.current',
        targetValue: 14,
        bonusCoins: 50,
        sortOrder: 11
    },
    {
        name: 'monthly_champion',
        displayName: 'Monthly Champion',
        description: 'Maintain a 30-day streak',
        icon: 'badge_streak_30',
        category: 'streak',
        tier: 'gold',
        statField: 'streaks.current',
        targetValue: 30,
        bonusCoins: 100,
        sortOrder: 12
    },
    {
        name: 'quarter_master',
        displayName: 'Quarter Master',
        description: 'Maintain a 90-day streak',
        icon: 'badge_streak_90',
        category: 'streak',
        tier: 'platinum',
        statField: 'streaks.longest',
        targetValue: 90,
        bonusCoins: 250,
        sortOrder: 13
    },

    // Workout Badges
    {
        name: 'workout_beginner',
        displayName: 'Workout Beginner',
        description: 'Complete 10 workouts',
        icon: 'badge_workout_10',
        category: 'milestone',
        tier: 'bronze',
        statField: 'totals.workoutLogs',
        targetValue: 10,
        bonusCoins: 20,
        sortOrder: 20
    },
    {
        name: 'fitness_pro',
        displayName: 'Fitness Pro',
        description: 'Complete 50 workouts',
        icon: 'badge_workout_50',
        category: 'milestone',
        tier: 'silver',
        statField: 'totals.workoutLogs',
        targetValue: 50,
        bonusCoins: 75,
        sortOrder: 21
    },
    {
        name: 'gym_legend',
        displayName: 'Gym Legend',
        description: 'Complete 100 workouts',
        icon: 'badge_workout_100',
        category: 'milestone',
        tier: 'gold',
        statField: 'totals.workoutLogs',
        targetValue: 100,
        bonusCoins: 150,
        sortOrder: 22
    },

    // Meditation Badges
    {
        name: 'mindful_start',
        displayName: 'Mindful Start',
        description: 'Complete 10 meditation sessions',
        icon: 'badge_meditation_10',
        category: 'milestone',
        tier: 'bronze',
        statField: 'totals.meditationLogs',
        targetValue: 10,
        bonusCoins: 20,
        sortOrder: 30
    },
    {
        name: 'zen_master',
        displayName: 'Zen Master',
        description: 'Complete 50 meditation sessions',
        icon: 'badge_meditation_50',
        category: 'milestone',
        tier: 'gold',
        statField: 'totals.meditationLogs',
        targetValue: 50,
        bonusCoins: 100,
        sortOrder: 31
    },

    // Mood Badges
    {
        name: 'mood_tracker',
        displayName: 'Mood Tracker',
        description: 'Log your mood 30 times',
        icon: 'badge_mood_30',
        category: 'consistency',
        tier: 'silver',
        statField: 'totals.moodLogs',
        targetValue: 30,
        bonusCoins: 50,
        sortOrder: 40
    },

    // Steps Badges
    {
        name: 'walker',
        displayName: 'Walker',
        description: 'Walk 50,000 total steps',
        icon: 'badge_steps_50k',
        category: 'milestone',
        tier: 'bronze',
        statField: 'totals.steps',
        targetValue: 50000,
        bonusCoins: 30,
        sortOrder: 50
    },
    {
        name: 'marathon_walker',
        displayName: 'Marathon Walker',
        description: 'Walk 500,000 total steps',
        icon: 'badge_steps_500k',
        category: 'milestone',
        tier: 'gold',
        statField: 'totals.steps',
        targetValue: 500000,
        bonusCoins: 200,
        sortOrder: 51
    },

    // Coin Badges
    {
        name: 'coin_starter',
        displayName: 'Coin Starter',
        description: 'Earn 500 NovaCoins',
        icon: 'badge_coins_500',
        category: 'milestone',
        tier: 'bronze',
        statField: 'totals.coinsEarned',
        targetValue: 500,
        bonusCoins: 25,
        sortOrder: 60
    },
    {
        name: 'coin_collector',
        displayName: 'Coin Collector',
        description: 'Earn 2,000 NovaCoins',
        icon: 'badge_coins_2k',
        category: 'milestone',
        tier: 'silver',
        statField: 'totals.coinsEarned',
        targetValue: 2000,
        bonusCoins: 100,
        sortOrder: 61
    },
    {
        name: 'coin_master',
        displayName: 'Coin Master',
        description: 'Earn 10,000 NovaCoins',
        icon: 'badge_coins_10k',
        category: 'milestone',
        tier: 'gold',
        statField: 'totals.coinsEarned',
        targetValue: 10000,
        bonusCoins: 500,
        sortOrder: 62
    }
];

async function seedGamification() {
    try {
        await mongoose.connect(config.DATABASE_URI, config.DATABASE_OPTIONS);
        console.log('Connected to MongoDB');

        // Seed Quests
        console.log('Seeding quests...');
        for (const quest of SAMPLE_QUESTS) {
            await Quest.findOneAndUpdate(
                { title: quest.title },
                quest,
                { upsert: true, new: true }
            );
            console.log(`  ✓ ${quest.title}`);
        }

        // Seed Badges
        console.log('Seeding badges...');
        for (const badge of SAMPLE_BADGES) {
            await Badge.findOneAndUpdate(
                { name: badge.name },
                badge,
                { upsert: true, new: true }
            );
            console.log(`  ✓ ${badge.displayName}`);
        }

        console.log('\n✅ Gamification data seeded successfully!');
        console.log(`   Quests: ${SAMPLE_QUESTS.length}`);
        console.log(`   Badges: ${SAMPLE_BADGES.length}`);

    } catch (err) {
        console.error('Seeding error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedGamification();
