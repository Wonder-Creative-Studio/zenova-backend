// src/controllers/measurementController.js
import BodyGoal from '~/models/bodyGoalModel';
import BodyLog from '~/models/bodyLogModel';
import MeasurementReminder from '~/models/measurementReminderModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationServiceV2 from '~/services/gamificationServiceV2';

export const setGoals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { neck, chest, waist, hips, thigh, arm } = req.body;

    const goal = await BodyGoal.findOneAndUpdate(
      { userId },
      { neck, chest, waist, hips, thigh, arm },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
       goal,
      message: 'Body measurement goals set successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
       data:{},
      message: err.message || 'Failed to set body measurement goals',
    });
  }
};

export const getGoals = async (req, res) => {
  try {
    const userId = req.user.id;

    const goal = await BodyGoal.findOne({ userId });

    return res.json({
      success: true,
       data:{goal} || {},
      message: 'Body measurement goals fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
       data:{},
      message: err.message || 'Failed to fetch body measurement goals',
    });
  }
};

export const logMeasurements = async (req, res) => {
  try {
    const userId = req.user.id;
    const { neck, chest, waist, hips, thigh, arm } = req.body;

    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const log = await BodyLog.findOneAndUpdate(
      { userId, date },
      { neck, chest, waist, hips, thigh, arm },
      { new: true, upsert: true }
    );

    // Process gamification via V2
    const gamificationResult = await gamificationServiceV2.processActivityV2(userId, {
      type: 'measurement',
      logId: log._id,
      logModel: 'bodyLogs',
      data: { neck, chest, waist, hips, thigh, arm }
    });

    return res.json({
      success: true,
      data: {
        log,
        ...gamificationServiceV2.formatGamificationResponse(gamificationResult),
      },
      message: 'Body measurements logged successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
       data:{},
      message: err.message || 'Failed to log body measurements',
    });
  }
};

export const getSummary = async (req, res) => {
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

    const logs = await BodyLog.find({
      userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const goal = await BodyGoal.findOne({ userId });

    const data = logs.map(log => {
      const logObj = log.toObject();
      delete logObj._id;
      delete logObj.__v;
      delete logObj.userId;
      delete logObj.loggedAt;
      delete logObj.createdAt;
      delete logObj.updatedAt;
      return {
        date: log.date.toISOString().split('T')[0],
        ...logObj,
      };
    });

    // Calculate change (current vs previous)
    let change = {};
    if (logs.length >= 2) {
      const current = logs[logs.length - 1];
      const previous = logs[logs.length - 2];
      change = {
        neck: current.neck - previous.neck,
        chest: current.chest - previous.chest,
        waist: current.waist - previous.waist,
        hips: current.hips - previous.hips,
        thigh: current.thigh - previous.thigh,
        arm: current.arm - previous.arm,
      };
    }

    return res.json({
      success: true,
       data:{
        data,
        goal: goal || {},
        change,
        period: period || 'weekly',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'Body measurement summary fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
       data:{},
      message: err.message || 'Failed to fetch body measurement summary',
    });
  }
};

export const setReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { frequency, day, time, enabled = false } = req.body;

    const reminder = await MeasurementReminder.findOneAndUpdate(
      { userId },
      { frequency, day, time, enabled },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
       reminder,
      message: 'Measurement reminder set successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
       data:{},
      message: err.message || 'Failed to set measurement reminder',
    });
  }
};

export const getReminder = async (req, res) => {
  try {
    const userId = req.user.id;

    const reminder = await MeasurementReminder.findOne({ userId });

    return res.json({
      success: true,
       data:{reminder} || { enabled: false },
      message: 'Measurement reminder fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
       data:{},
      message: err.message || 'Failed to fetch measurement reminder',
    });
  }
};

export default {
  setGoals,
  getGoals,
  logMeasurements,
  getSummary,
  setReminder,
  getReminder,
};