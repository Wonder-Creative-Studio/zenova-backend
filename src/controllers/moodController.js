// src/controllers/moodController.js
import MoodLog from '~/models/moodLogModel';
import gamificationServiceV2 from '~/services/gamificationServiceV2';
import moodSuggestionService from '~/services/moodSuggestionService';

export const logMood = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mood } = req.body;

    if (!mood) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Mood is required',
      });
    }

    // Check if already logged today
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const existingLog = await MoodLog.findOne({
      userId,
      loggedAt: { $gte: start, $lte: end },
    });

    if (existingLog) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Mood already logged today',
      });
    }

    const suggestion = moodSuggestionService.getSuggestionForMood(mood);

    const moodLog = new MoodLog({
      userId,
      mood,
      suggestedActivity: suggestion,
    });

    const savedLog = await moodLog.save();

    // Process gamification
    const gamificationResult = await gamificationServiceV2.processActivityV2(userId, {
      type: 'mood',
      logId: savedLog._id,
      logModel: 'moodLogs',
      data: { mood }
    });

    return res.json({
      success: true,
      data: {
        savedLog,
        suggestion: moodSuggestionService.buildSuggestionCard(suggestion, savedLog),
        ...gamificationServiceV2.formatGamificationResponse(gamificationResult)
      },
      message: 'Mood logged successfully',
    });
  } catch (err) {
    console.error('Mood log error:', err);
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to log mood',
    });
  }
};

export const getMoodSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query;

    let start, end;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'today') {
      start = today;
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    } else if (period === 'weekly') {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = today;
    } else if (period === 'monthly') {
      start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = today;
    } else {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = today;
    }

    const logs = await MoodLog.find({
      userId,
      loggedAt: { $gte: start, $lte: end },
    }).sort({ loggedAt: 1 });

    const dailyData = {};
    logs.forEach(log => {
      const dateStr = log.loggedAt.toISOString().split('T')[0];
      dailyData[dateStr] = log.mood;
    });

    const latestLog = logs[logs.length - 1];
    const currentMood = latestLog ? latestLog.mood : 'Neutral';
    const suggestion = moodSuggestionService.getSuggestionForMood(currentMood);

    return res.json({
      success: true,
      data: {
        currentMood,
        currentEntry: latestLog || null,
        suggestion: moodSuggestionService.buildSuggestionCard(suggestion, latestLog),
        dailyData,
        period: period || 'weekly',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'Mood summary fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch mood summary',
    });
  }
};

export const getTodayMood = async (req, res) => {
  try {
    const userId = req.user.id;
    const moodLog = await moodSuggestionService.getTodayMoodLog(userId);
    const currentMood = moodLog?.mood || 'Neutral';
    const suggestion = moodSuggestionService.getSuggestionForMood(currentMood);

    return res.json({
      success: true,
      data: {
        moodLog,
        currentMood,
        suggestion: moodSuggestionService.buildSuggestionCard(suggestion, moodLog),
      },
      message: 'Today mood fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch today mood',
    });
  }
};

export const getMoodProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const { limit = 7 } = req.query;

    const logs = await MoodLog.find({ userId })
      .sort({ loggedAt: -1 })
      .limit(parseInt(limit))
      .select('mood loggedAt');

    const progress = logs.map(log => ({
      mood: log.mood,
      loggedAt: log.loggedAt
    }));

    return res.json({
      success: true,
      data: progress,
      message: 'Mood progress fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: [],
      message: err.message || 'Failed to fetch mood progress',
    });
  }
};

export default {
  logMood,
  getMoodSummary,
  getTodayMood,
  getMoodProgress
};
