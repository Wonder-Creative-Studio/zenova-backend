// controllers/onboardingController.js
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import { normalizeLocation } from '~/utils/location';
import novaCoinsService from '~/services/novaCoinsService';
import UserStats from '~/models/userStatsModel';

export const saveProfile = async (req, res) => {
  try {
    const { 
      name, 
      dob, 
      height, 
      weight, 
      gender, 
      dietType, 
      lifestyle, 
      medicalCondition, 
      location,
      locationName,
      selectedAI,
    } = req.body;
 
    // Get user ID from authenticated request
    const userId = req.user.id;

    // Validate required fields (extra safety)
    const requiredFields = ['name', 'dob', 'height', 'weight', 'gender', 'dietType', 'lifestyle'];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        return res.status(400).json({
          success: false,
          data: {},
          message: `${field} is required`,
        });
      }
    }

    // Validate gender
    const allowedGenders = ['male', 'female', 'other'];
    if (!allowedGenders.includes(gender)) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Gender must be male, female, or other',
      });
    }

    // Validate dietType
    const allowedDietTypes = ['non-veg', 'veg', 'vegan', 'vegetarian', 'balanced', 'eggetarian', 'custom', 'Vegetarian', 'Balanced', 'Eggetarian', 'Custom'];
    if (!allowedDietTypes.includes(dietType)) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Diet type must be one of the allowed options',
      });
    }

    // Validate lifestyle
    const allowedLifestyles = ['not_very_active', 'lightly_active', 'moderately_active', 'very_active'];
    if (!allowedLifestyles.includes(lifestyle)) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Lifestyle must be one of: not_very_active, lightly_active, moderately_active, very_active',
      });
    }

    // Prepare update object
    const updateData = {
      fullName: name, // map 'name' from UI to 'fullName' in DB
      dob: new Date(dob),
      height: parseFloat(height),
      weight: parseFloat(weight),
      gender,
      dietType,
      lifestyle,
      medicalCondition: medicalCondition || undefined,
      isOnboarded: true,
    };

    if (locationName !== undefined) {
      updateData.locationName = locationName;
    }

    // Add NEW fields (only if provided)
    if (req.body.languages) updateData.languages = req.body.languages;
    if (req.body.syncAppleHealth !== undefined) updateData.syncAppleHealth = req.body.syncAppleHealth;
    if (req.body.autoTrackCategories) updateData.autoTrackCategories = req.body.autoTrackCategories;
    if (req.body.aiTrainer) updateData.aiTrainer = req.body.aiTrainer;
    if (req.body.aiNutritionist) updateData.aiNutritionist = req.body.aiNutritionist;
    if (req.body.aiLifestyleCoach) updateData.aiLifestyleCoach = req.body.aiLifestyleCoach;
    if (req.body.currentMood) updateData.currentMood = req.body.currentMood;
    if (req.body.lifestyleState) updateData.lifestyleState = req.body.lifestyleState;
    if (req.body.barriers) updateData.barriers = req.body.barriers;
    if (selectedAI) updateData.selectedAI = selectedAI;

    // Add location if provided
    const normalizedLocation = normalizeLocation(req.body);
    if (normalizedLocation) {
      updateData.location = normalizedLocation;
    }

    // Check previous onboarding state (for idempotent coin award)
    const existingUser = await User.findById(userId).select('isOnboarded');
    const wasOnboarded = existingUser?.isOnboarded || false;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'User not found',
      });
    }

    // ── Award 1000 Nova Coins for completing onboarding (one-time) ──
    let onboardingBonus = null;
    if (!wasOnboarded && updatedUser.isOnboarded) {
      try {
        onboardingBonus = await novaCoinsService.awardCoins(userId, {
          amount: 1000,
          type: 'onboarding_reward',
          category: 'onboarding',
          description: 'Welcome bonus: 1000 Nova Coins for completing onboarding',
        });
        // Initialize UserStats for gamification tracking
        await UserStats.findOneAndUpdate(
          { userId },
          { $inc: { 'totals.coinsEarned': 1000 } },
          { upsert: true, new: true }
        );
      } catch (bonusErr) {
        console.error('Onboarding bonus award error:', bonusErr);
        // Don't fail the onboarding if bonus fails
      }
    }

    const responseData = updatedUser.toObject();
    if (onboardingBonus) {
      responseData.novaCoins = onboardingBonus.balance;
    }

    return res.json({
      success: true,
      data: {
        ...responseData,
        onboardingBonus: onboardingBonus ? { coinsAwarded: 1000, balance: onboardingBonus.balance } : null,
        novaCoinsEarned: onboardingBonus ? 1000 : 0,
      },
      message: 'Profile saved successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to save profile',
    });
  }
};

export default {
  saveProfile,
};

//     // ✅ NEW: Check for email/phone uniqueness (if provided)
//     if (email) {
//       const existingUser = await User.findOne({ email, _id: { $ne: userId } });
//       if (existingUser) {
//         return res.status(400).json({
//           success: false,
//           data: {},
//           message: 'Email already in use',
//         });
//       }
//     }

//     if (phone) {
//       const existingUser = await User.findOne({ phone, _id: { $ne: userId } });
//       if (existingUser) {
//         return res.status(400).json({
//           success: false,
//           data: {},
//           message: 'Phone already in use',
//         });
//       }
//     }

//     // Prepare update object
//     const updateData = {
//       fullName: name,
//       dob: new Date(dob),
//       height: parseFloat(height),
//       weight: parseFloat(weight),
//       gender,
//       dietType,
//       lifestyle,
//       medicalCondition: medicalCondition || undefined,
//       // ✅ NEW: Only update email/phone if provided
//       ...(email !== undefined && { email }),
//       ...(phone !== undefined && { phone }),
//     };

//     // Add NEW fields (only if provided)
//     if (req.body.languages) updateData.languages = req.body.languages;
//     if (req.body.syncAppleHealth !== undefined) updateData.syncAppleHealth = req.body.syncAppleHealth;
//     if (req.body.autoTrackCategories) updateData.autoTrackCategories = req.body.autoTrackCategories;
//     if (req.body.aiTrainer) updateData.aiTrainer = req.body.aiTrainer;
//     if (req.body.aiNutritionist) updateData.aiNutritionist = req.body.aiNutritionist;
//     if (req.body.aiLifestyleCoach) updateData.aiLifestyleCoach = req.body.aiLifestyleCoach;
//     if (req.body.currentMood) updateData.currentMood = req.body.currentMood;
//     if (req.body.lifestyleState) updateData.lifestyleState = req.body.lifestyleState;
//     if (req.body.barriers) updateData.barriers = req.body.barriers;

//     // Add location if provided
//     if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
//       updateData.location = {
//         type: 'Point',
//         coordinates: location.coordinates.map(coord => parseFloat(coord)),
//       };
//     }

//     // Update user
//     const updatedUser = await User.findByIdAndUpdate(
//       userId,
//       updateData,
//       { new: true, runValidators: true }
//     );

    


//     if (!updatedUser) {
//       return res.status(404).json({
//         success: false,
//         data: {},
//         message: 'User not found',
//       });
//     }

    

//     return res.json({
//       success: true,
//       data: { user: updatedUser, tokens },
//       message: 'Profile saved successfully',
//     });
//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       data: {},
//       message: err.message || 'Failed to save profile',
//     });
//   }
// };

// export default {
//   saveProfile,
// };
