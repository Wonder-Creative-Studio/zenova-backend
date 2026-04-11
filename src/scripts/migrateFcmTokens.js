// src/scripts/migrateFcmTokens.js
// Adds fcmTokens: [] to all existing users that don't have the field
// Run with: npm run migrate:fcmTokens

import mongoose from 'mongoose';
import config from '~/config/config';

const run = async () => {
  await mongoose.connect(config.DATABASE_URI);
  console.log('Connected to MongoDB');

  const result = await mongoose.connection.collection('users').updateMany(
    { fcmTokens: { $exists: false } },
    { $set: { fcmTokens: [] } }
  );

  console.log(`Migration complete. Updated ${result.modifiedCount} users.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
