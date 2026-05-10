// src/controllers/habitController.js
import Habit from '~/models/habitModel';
import HabitLog from '~/models/habitLogModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationServiceV2 from '~/services/gamificationServiceV2';

export const setHabitRoutine = async (req, res) => {
  try {
    const userId = req.user.id;
    const { habits } = req.body;

    if (!habits || !Array.isArray(habits) || habits.length === 0) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Habits array is required and must not be empty',
      });
    }

    // Delete existing habits
    await Habit.deleteMany({ userId });

    // Create new habits
    const habitDocs = habits.map(habit => ({
      userId,
      name: habit.name.trim(),
    }));

    const savedHabits = await Habit.insertMany(habitDocs);

    return res.json({
      success: true,
      data: {savedHabits},
      message: 'Habit routine set successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to set habit routine',
    });
  }
};

export const logHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { habitName, date, status, isOneTime = false } = req.body;

    if (!habitName || !date || !status) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Habit name, date, and status are required',
      });
    }

    const habitLog = new HabitLog({
      userId,
      date: new Date(date),
      habitName,
      status,
      isOneTime,
    });

    const savedLog = await habitLog.save();

    // Process gamification via V2
    const gamificationResult = await gamificationServiceV2.processActivityV2(userId, {
      type: 'habit',
      logId: savedLog._id,
      logModel: 'habitLogs',
      data: { status, habitName }
    });

    return res.json({
      success: true,
      data: { 
        savedLog, 
        ...gamificationServiceV2.formatGamificationResponse(gamificationResult) 
      },
      message: 'Habit logged successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to log habit',
    });
  }
};

export const getHabitProgress = async (req, res) => {
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
    } else {
      start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = today;
    }

    const logs = await HabitLog.find({
      userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const totalTasks = logs.length;
    const completedTasks = logs.filter(log => log.status === 'Completed').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const dailyData = {};
    logs.forEach(log => {
      const dateStr = log.date.toISOString().split('T')[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { total: 0, completed: 0 };
      }
      dailyData[dateStr].total += 1;
      if (log.status === 'Completed') {
        dailyData[dateStr].completed += 1;
      }
    });

    return res.json({
      success: true,
      data: {
        completionRate,
        dailyData,
        period: period || 'weekly',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'Habit progress fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch habit progress',
    });
  }
};

export default {
  setHabitRoutine,
  logHabit,
  getHabitProgress,
};