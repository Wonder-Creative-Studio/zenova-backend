import HydrationLog from '~/models/hydrationLogModel';
import HydrationGoal from '~/models/hydrationGoalModel';
import { DEFAULT_TIMEZONE, getLocalDayBounds, addDaysToDateKey, zonedDateTimeToUtc } from '~/utils/timezone';
import { emitAuraUpdate } from '~/services/auraEventBus';

const getGoalMl = async (userId) => {
  const goal = await HydrationGoal.findOne({ userId }).lean();
  return goal?.goalMl || 3000;
};

const summarizeRange = async (userId, start, end) => {
  const logs = await HydrationLog.find({ userId, loggedAt: { $gte: start, $lt: end } }).sort({ loggedAt: 1 }).lean();
  return {
    totalMl: logs.reduce((sum, log) => sum + (log.amountMl || 0), 0),
    logs,
  };
};

export const logHydration = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amountMl, loggedAt, source = 'manual' } = req.body;
    const log = await HydrationLog.create({
      userId,
      amountMl,
      loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      source,
    });

    emitAuraUpdate(userId);

    return res.json({
      success: true,
      data: log,
      message: 'Hydration logged successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to log hydration',
    });
  }
};

export const getTodayHydration = async (req, res) => {
  try {
    const userId = req.user.id;
    const timezone = req.query.timezone || req.get('X-Timezone') || DEFAULT_TIMEZONE;
    const { dateKey, start, end } = getLocalDayBounds(new Date(), timezone);
    const [goalMl, summary] = await Promise.all([
      getGoalMl(userId),
      summarizeRange(userId, start, end),
    ]);

    return res.json({
      success: true,
      data: {
        date: dateKey,
        timezone,
        goalMl,
        totalMl: summary.totalMl,
        progressPct: Math.min(100, Math.round((summary.totalMl / goalMl) * 100)),
        logs: summary.logs,
      },
      message: 'Today hydration fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({ success: false, data: {}, message: err.message || 'Failed to fetch hydration' });
  }
};

export const getHydrationSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const timezone = req.query.timezone || req.get('X-Timezone') || DEFAULT_TIMEZONE;
    const period = req.query.period || 'today';
    const { dateKey, start, end } = getLocalDayBounds(new Date(), timezone);
    let rangeStart = start;
    if (period === 'weekly') rangeStart = zonedDateTimeToUtc(addDaysToDateKey(dateKey, -6), '00:00:00', timezone);
    if (period === 'monthly') rangeStart = zonedDateTimeToUtc(addDaysToDateKey(dateKey, -29), '00:00:00', timezone);

    const [goalMl, summary] = await Promise.all([
      getGoalMl(userId),
      summarizeRange(userId, rangeStart, end),
    ]);

    return res.json({
      success: true,
      data: {
        period,
        timezone,
        startDate: addDaysToDateKey(dateKey, period === 'monthly' ? -29 : period === 'weekly' ? -6 : 0),
        endDate: dateKey,
        goalMl,
        totalMl: summary.totalMl,
        logs: summary.logs,
      },
      message: 'Hydration summary fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({ success: false, data: {}, message: err.message || 'Failed to fetch hydration summary' });
  }
};

export const updateHydrationGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { goalMl } = req.body;
    const goal = await HydrationGoal.findOneAndUpdate(
      { userId },
      { $set: { goalMl } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    emitAuraUpdate(userId);

    return res.json({
      success: true,
      data: goal,
      message: 'Hydration goal updated successfully',
    });
  } catch (err) {
    return res.status(400).json({ success: false, data: {}, message: err.message || 'Failed to update hydration goal' });
  }
};

export default {
  logHydration,
  getTodayHydration,
  getHydrationSummary,
  updateHydrationGoal,
};

