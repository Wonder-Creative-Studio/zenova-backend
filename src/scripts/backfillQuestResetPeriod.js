// src/scripts/backfillQuestResetPeriod.js
// Backfills resetPeriod for legacy quests where category implies a reset window
// but resetPeriod is still 'none'. Safe to re-run.
//
// Run with: npx babel-node --extensions ".js" src/scripts/backfillQuestResetPeriod.js

import mongoose from 'mongoose';
import config from '~/config/config';

const CATEGORY_TO_PERIOD = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
};

const run = async () => {
  await mongoose.connect(config.DATABASE_URI);
  console.log('Connected to MongoDB');

  const quests = mongoose.connection.collection('quests');
  let totalUpdated = 0;

  for (const [category, period] of Object.entries(CATEGORY_TO_PERIOD)) {
    const result = await quests.updateMany(
      { category, $or: [{ resetPeriod: 'none' }, { resetPeriod: { $exists: false } }] },
      { $set: { resetPeriod: period } }
    );
    console.log(`category=${category} -> resetPeriod=${period}: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
    totalUpdated += result.modifiedCount;
  }

  console.log(`Backfill complete. Updated ${totalUpdated} quest(s).`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
