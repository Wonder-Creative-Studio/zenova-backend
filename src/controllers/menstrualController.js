// src/controllers/menstrualController.js
import MenstrualCycle from '~/models/menstrualCycleModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationServiceV2 from '~/services/gamificationServiceV2';


export const logPeriod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, flow } = req.body;

    if (!startDate) {
      return res.status(400).json({
        success: false,
        data:{},
        message: 'Start date is required',
      });
    }

    // Create new log
    const periodLog = new MenstrualCycle({
      userId,
      startDate: new Date(startDate),
      flow: flow || 'Light',
    });

    const savedLog = await periodLog.save();

    // Process gamification via V2
    const gamificationResult = await gamificationServiceV2.processActivityV2(userId, {
      type: 'menstrual',
      logId: savedLog._id,
      logModel: 'menstrualCycles',
      data: { startDate, flow }
    });

    return res.json({
      success: true,
      data: { 
        savedLog, 
        ...gamificationServiceV2.formatGamificationResponse(gamificationResult) 
      },
      message: 'Period logged successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
       data:{},
      message: err.message || 'Failed to log period',
    });
  }
};

export const getCycleSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all logs
    const logs = await MenstrualCycle.find({ userId }).sort({ startDate: -1 });

    if (logs.length === 0) {
      return res.json({
        success: true,
         data:{
          currentStatus: 'No data yet',
          nextExpectedPeriod: null,
          fertileWindow: null,
          cycleLength: null,
          ovulationDay: null,
        },
        message: 'No cycle data found',
      });
    }

    // Calculate cycle length (average of last 3 cycles)
    let cycleLength = 28; // default
    if (logs.length >= 2) {
      const cycleDurations = [];
      for (let i = 1; i < logs.length; i++) {
        const duration = Math.floor((logs[i-1].startDate - logs[i].startDate) / (24 * 60 * 60 * 1000));
        cycleDurations.push(duration);
      }
      cycleLength = Math.round(cycleDurations.reduce((sum, d) => sum + d, 0) / cycleDurations.length);
    }

    // Predict next period
    const lastPeriod = logs[0];
    const nextExpectedPeriod = new Date(lastPeriod.startDate.getTime() + cycleLength * 24 * 60 * 60 * 1000);

    // Calculate fertile window (day 8–13 before next period)
    const fertileWindowStart = new Date(nextExpectedPeriod.getTime() - 13 * 24 * 60 * 60 * 1000);
    const fertileWindowEnd = new Date(nextExpectedPeriod.getTime() - 8 * 24 * 60 * 60 * 1000);

    // Calculate ovulation day (day 14 before next period)
    const ovulationDay = new Date(nextExpectedPeriod.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Current status (if today is within 7 days of last period)
    const today = new Date();
    const daysSinceLastPeriod = Math.floor((today - lastPeriod.startDate) / (24 * 60 * 60 * 1000));
    let currentStatus = 'No data yet';
    if (daysSinceLastPeriod <= 7) {
      currentStatus = `Day ${daysSinceLastPeriod} of Period`;
    } else if (daysSinceLastPeriod > 7 && daysSinceLastPeriod < cycleLength) {
      currentStatus = 'Follicular Phase';
    } else {
      currentStatus = 'Luteal Phase';
    }

    return res.json({
      success: true,
       data:{
        currentStatus,
        nextExpectedPeriod: nextExpectedPeriod.toISOString().split('T')[0],
        fertileWindow: {
          start: fertileWindowStart.toISOString().split('T')[0],
          end: fertileWindowEnd.toISOString().split('T')[0],
        },
        cycleLength,
        ovulationDay: ovulationDay.toISOString().split('T')[0],
      },
      message: 'Cycle summary fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
       data:{},
      message: err.message || 'Failed to fetch cycle summary',
    });
  }
};

export default {
  logPeriod,
  getCycleSummary,
};