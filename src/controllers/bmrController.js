// src/controllers/bmrController.js
import BmrLog from '~/models/bmrLogModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationService from '~/services/gamificationService';

// Mifflin-St Jeor Formula
const calculateBMR = (weight, height, age, gender) => {
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  return Math.round(bmr);
};

export const calculateAndLogBMR = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'User not found',
      });
    }

    const { weight, height } = req.body;
    const finalWeight = weight || user.weight;
    const finalHeight = height || user.height;
    const finalAge = user.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : 30;
    const finalGender = user.gender || 'other';

    if (!finalWeight || !finalHeight) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Weight and height are required',
      });
    }

    const bmr = calculateBMR(finalWeight, finalHeight, finalAge, finalGender);

    const bmrLog = new BmrLog({
      userId,
      bmr,
      weight: finalWeight,
      height: finalHeight,
      age: finalAge,
      gender: finalGender,
    });

    const savedLog = await bmrLog.save();

    // Process gamification
    const gamificationResult = await gamificationService.processActivity(userId, {
      type: 'bmr',
      logId: savedLog._id,
      logModel: 'bmrLogs',
      data: { bmr }
    });

    return res.json({
      success: true,
      data: {
        bmr,
        savedLog,
        novaCoinsEarned: gamificationResult.coinsEarned,
        bonusCoins: gamificationResult.bonusCoins,
        totalCoins: gamificationResult.totalCoins,
        streak: gamificationResult.streak,
        level: gamificationResult.level,
        questsCompleted: gamificationResult.questsCompleted,
        badgesUnlocked: gamificationResult.badgesUnlocked
      },
      message: 'BMR calculated successfully',
    });
  } catch (err) {
    console.error('BMR log error:', err);
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to calculate BMR',
    });
  }
};

export const getBMRProgress = async (req, res) => {
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

    const logs = await BmrLog.find({
      userId,
      calculatedAt: { $gte: start, $lte: end },
    }).sort({ calculatedAt: 1 });

    const dailyData = {};
    logs.forEach(log => {
      const dateStr = log.calculatedAt.toISOString().split('T')[0];
      dailyData[dateStr] = log.bmr;
    });

    const latestLog = logs[logs.length - 1];
    const currentBMR = latestLog ? latestLog.bmr : 0;

    return res.json({
      success: true,
      data: {
        currentBMR,
        dailyData,
        period: period || 'weekly',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'BMR progress fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch BMR progress',
    });
  }
};

export const getTodayBMR = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const bmrLog = await BmrLog.findOne({
      userId,
      calculatedAt: { $gte: start, $lte: end },
    }).sort({ calculatedAt: -1 });

    if (!bmrLog) {
      return res.json({
        success: true,
        data: {
          bmr: null,
          novaCoinsEarned: 0,
          savedLog: null
        },
        message: 'No BMR log found for today',
      });
    }

    // Get coins earned from this log
    const NovaTransaction = require('~/models/novaTransactionModel').default;
    const transaction = await NovaTransaction.findOne({
      userId,
      'source.refId': bmrLog._id,
      'source.category': 'bmr'
    });

    return res.json({
      success: true,
      data: {
        bmr: bmrLog.bmr,
        novaCoinsEarned: transaction?.amount || 0,
        savedLog: bmrLog
      },
      message: 'Today BMR fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch today BMR',
    });
  }
};

export default {
  calculateAndLogBMR,
  getBMRProgress,
  getTodayBMR,
};