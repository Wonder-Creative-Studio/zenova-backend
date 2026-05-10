// src/controllers/medicineController.js
import Medicine from '~/models/medicineModel';
import MedicineLog from '~/models/medicineLogModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import gamificationServiceV2 from '~/services/gamificationServiceV2';

export const addMedicine = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, startDate, repeat, times, reminderEnabled = true } = req.body;

    if (!name || !startDate || !times || times.length === 0) {
      return res.status(400).json({
        success: false,
        data:{},
        message: 'Name, start date, and at least one time are required',
      });
    }

    const medicine = new Medicine({
      userId,
      name,
      startDate: new Date(startDate),
      repeat,
      times,
      reminderEnabled,
    });

    const savedMedicine = await medicine.save();

    return res.json({
      success: true,
       savedMedicine,
      message: 'Medicine added successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data:{},
      message: err.message || 'Failed to add medicine',
    });
  }
};

export const logMedicineIntake = async (req, res) => {
  try {
    const userId = req.user.id;
    const { medicineId, date, time, status } = req.body;

    if (!medicineId || !date || !time || !status) {
      return res.status(400).json({
        success: false,
        data:{},
        message: 'Medicine ID, date, time, and status are required',
      });
    }

    // Check if medicine exists
    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        data:{},
        message: 'Medicine not found',
      });
    }

    // Create log
    const medicineLog = new MedicineLog({
      userId,
      medicineId,
      date: new Date(date),
      time,
      status,
    });

    const savedLog = await medicineLog.save();

    // Process gamification via V2
    const gamificationResult = await gamificationServiceV2.processActivityV2(userId, {
      type: 'medicine',
      logId: savedLog._id,
      logModel: 'medicineLogs',
      data: { medicineId, status }
    });

    return res.json({
      success: true,
      data: { 
        savedLog, 
        ...gamificationServiceV2.formatGamificationResponse(gamificationResult) 
      },
      message: 'Medicine intake logged successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data:{},
      message: err.message || 'Failed to log medicine intake',
    });
  }
};

export const getMedicineHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query; // 'today', 'weekly', 'monthly'

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
      // Default to weekly
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = today;
    }

    const logs = await MedicineLog.find({
      userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1, time: 1 });

    return res.json({
      success: true,
      data:{
        logs,
        period: period || 'weekly',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'Medicine history fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data:{},
      message: err.message || 'Failed to fetch medicine history',
    });
  }
}; 

export const getMedicineList = async (req, res) => {
  try {
    const userId = req.user.id;

    const medicines = await Medicine.find({ userId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
       data:{medicines},
      message: 'Medicine list fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data:{},
      message: err.message || 'Failed to fetch medicine list',
    });
  }
};

export default {
  addMedicine,
  logMedicineIntake,
  getMedicineHistory, 
  getMedicineList,
};