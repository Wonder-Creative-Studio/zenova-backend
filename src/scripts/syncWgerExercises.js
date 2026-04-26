// src/scripts/syncWgerExercises.js
// Run with: node -r module-alias/register -r @babel/register src/scripts/syncWgerExercises.js
// Or via npm: npm run sync:wger

import mongoose from 'mongoose';
import config from '~/config/config';
import wgerService from '~/services/wgerService';
import logger from '~/config/logger';

const run = async () => {
  await mongoose.connect(config.DATABASE_URI, config.DATABASE_OPTIONS);
  logger.info('syncWgerExercises: connected to MongoDB');

  try {
    const { newCount, updatedCount, total } = await wgerService.syncToDatabase();
    logger.info(`syncWgerExercises: synced ${total} exercises (${newCount} new, ${updatedCount} updated)`);
  } catch (err) {
    logger.error(`syncWgerExercises failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    logger.info('syncWgerExercises: disconnected');
  }
};

run();
