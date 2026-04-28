import mongoose from 'mongoose';
import User from './src/models/userModel.js';
import MealLog from './src/models/mealLogModel.js';
import WorkoutLog from './src/models/workoutLogModel.js';
import config from './src/config/config.js';

const checkDB = async () => {
  try {
    await mongoose.connect(config.DATABASE_URI);
    console.log('--- DB STATS ---');
    console.log('Users:', await User.countDocuments());
    console.log('Meals:', await MealLog.countDocuments());
    console.log('Workouts:', await WorkoutLog.countDocuments());
    console.log('----------------');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkDB();
