// src/services/moodSuggestionService.js
import MoodLog from '~/models/moodLogModel';
import UserStats from '~/models/userStatsModel';
import novaCoinsService from '~/services/novaCoinsService';

export const MOOD_SUGGESTIONS = {
  'Very Unpleasant': {
    title: 'Feeling down?',
    message: 'A short calming practice can help you reset.',
    activity: 'Guided Meditation',
    type: 'meditation',
    durationMin: 10,
    rewardCoins: 50,
    description: 'Calm your mind with a soothing meditation.',
    ctaLabel: 'Start Session',
    tag: "Today's recommendation",
  },
  Unpleasant: {
    title: 'Need a lighter reset?',
    message: 'A gentle yoga flow can release tension quickly.',
    activity: 'Yoga Flow',
    type: 'yoga',
    durationMin: 15,
    rewardCoins: 40,
    description: 'Release tension with gentle yoga poses.',
    ctaLabel: 'Start Session',
    tag: "Today's recommendation",
  },
  Neutral: {
    title: 'Want an energy boost?',
    message: 'A quick workout can lift your focus and mood.',
    activity: 'Zen Burn',
    type: 'workout',
    durationMin: 20,
    rewardCoins: 30,
    description: 'Boost your energy with a quick workout.',
    ctaLabel: 'Start Session',
    tag: "Today's recommendation",
  },
  Pleasant: {
    title: 'Keep the calm going.',
    message: 'A short breathing session can deepen the good feeling.',
    activity: 'Breathing Exercise',
    type: 'meditation',
    durationMin: 5,
    rewardCoins: 20,
    description: 'Deepen your calm with mindful breathing.',
    ctaLabel: 'Start Session',
    tag: "Today's recommendation",
  },
  'Slightly Pleasant': {
    title: 'Keep the calm going.',
    message: 'A short breathing session can deepen the good feeling.',
    activity: 'Breathing Exercise',
    type: 'meditation',
    durationMin: 5,
    rewardCoins: 20,
    description: 'Deepen your calm with mindful breathing.',
    ctaLabel: 'Start Session',
    tag: "Today's recommendation",
  },
  'Very Pleasant': {
    title: 'You are in a great zone.',
    message: 'Channel that momentum into a stronger session today.',
    activity: 'Zen Hyper',
    type: 'workout',
    durationMin: 20,
    rewardCoins: 30,
    description: 'Turn positive energy into a high-impact workout.',
    ctaLabel: 'Start Session',
    tag: "Today's challenge",
  },
};

const todayWindow = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

export const getSuggestionForMood = (mood) => MOOD_SUGGESTIONS[mood] || MOOD_SUGGESTIONS.Neutral;

export const buildSuggestionCard = (suggestion, moodLog = null) => ({
  title: suggestion.title,
  message: suggestion.message,
  activity: suggestion.activity,
  type: suggestion.type,
  durationMin: suggestion.durationMin,
  description: suggestion.description,
  ctaLabel: suggestion.ctaLabel,
  tag: suggestion.tag,
  reward: {
    novaCoins: suggestion.rewardCoins,
  },
  completion: {
    isCompleted: Boolean(moodLog?.isSuggestionCompleted),
    completedAt: moodLog?.completedAt || null,
  },
});

export const completeSuggestionForType = async (userId, activityType) => {
  const { start, end } = todayWindow();
  const moodLog = await MoodLog.findOne({
    userId,
    loggedAt: { $gte: start, $lt: end },
    isSuggestionCompleted: false,
    'suggestedActivity.type': activityType,
  });

  if (!moodLog) {
    return { extraCoins: 0, moodLog: null };
  }

  const extraCoins = moodLog.suggestedActivity?.rewardCoins || moodLog.suggestedActivity?.reward || 0;
  moodLog.isSuggestionCompleted = true;
  moodLog.completedAt = new Date();
  await moodLog.save();

  if (extraCoins > 0) {
    await novaCoinsService.awardCoins(userId, {
      amount: extraCoins,
      type: 'mood_suggestion_reward',
      category: activityType,
      description: `Completed suggested ${activityType} activity`,
      metadata: {
        moodLogId: moodLog._id.toString(),
      },
    });
    await UserStats.findOneAndUpdate(
      { userId },
      { $inc: { 'totals.coinsEarned': extraCoins } },
      { upsert: true }
    );
  }

  return { extraCoins, moodLog };
};

export const getTodayMoodLog = async (userId) => {
  const { start, end } = todayWindow();
  return MoodLog.findOne({
    userId,
    loggedAt: { $gte: start, $lt: end },
  }).sort({ loggedAt: -1 });
};

export default {
  MOOD_SUGGESTIONS,
  getSuggestionForMood,
  buildSuggestionCard,
  completeSuggestionForType,
  getTodayMoodLog,
};
