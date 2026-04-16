// src/middlewares/isAdmin.js
import User from '~/models/userModel';
import httpStatus from 'http-status';

const isAdmin = () => async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('roles', 'name').lean();
    const roles = user?.roles?.map(r => r.name?.toLowerCase()) || [];

    if (!roles.includes('admin')) {
      return res.status(httpStatus.FORBIDDEN).json({
        success: false,
        data: {},
        message: 'Access denied. Admin only.',
      });
    }

    next();
  } catch (err) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      data: {},
      message: 'Failed to verify admin access',
    });
  }
};

export default isAdmin;
