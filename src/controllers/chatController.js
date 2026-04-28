// src/controllers/chatController.js
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import aiService from '~/services/aiService';
import MealLog from '~/models/mealLogModel'; 
import StepLog from '~/models/stepLogModel'; 
import SleepLog from '~/models/sleepLogModel'; 
import voiceService from '~/services/voiceService';

import chatAiService from '~/services/chatAiService';
import ChatThread from '~/models/chatThreadModel';
import ChatMessage from '~/models/chatMessageModel';

export const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, bot = 'calia' } = req.body; 



    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        data:{},
        message: 'Message is required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        data:{},
        message: 'User not found',
      });
    }

    // Get user preferences for this bot
    const preferences = user.aiPreferences[bot] || {};

    // Build context for AI
    const context = await buildUserContext(userId);

    // Get chat history (last 5 messages)
    const history = user.chats.filter(chat => chat.bot === bot).slice(-5).map(({ role, content }) => ({ role, content }));

    // Get AI response
    const aiResponse = await chatAiService.generateChatResponse(bot, message, context, history, preferences);

    // Add user message to chat history
    const userMessage = {
      role: 'user',
      content: message,
      bot,
      timestamp: new Date(),
    };
    user.chats.push(userMessage); 

    let greetingSent = null;
    if (user.chats.filter(chat => chat.bot === bot).length === 1) {
      // First message to this bot → send greeting
      const greeting = bot === 'calia' 
          ? "Hi 👋, I’m Calia, your AI Lifestyle Coach! How can I help you today?" 
          : bot === 'noura'
          ? "Hi 👋, I’m Noura, your AI Nutritionist! What would you like to eat today?"
          : "Hi 👋, I’m Aeron, your AI Personal Trainer! Ready to crush your workout?";

      greetingSent = greeting;
      // Add greeting to chat history
      user.chats.push({
          role: 'assistant',
          content: greeting,
          bot,
          timestamp: new Date(),
      });
    }

    // Add AI response to chat history
    const aiMessage = {
      role: 'assistant',
      content: aiResponse,
      bot,
      timestamp: new Date(),
    };
    user.chats.push(aiMessage);

    // Save user with updated chats
    await user.save(); 

    user.lastActiveAt = new Date();
    await user.save();

    // Admin sync
    try {
      let thread = await ChatThread.findOne({ userId, agent: bot });
      if (!thread) {
        thread = await ChatThread.create({
          userId,
          agent: bot,
          title: `Chat with ${bot.charAt(0).toUpperCase() + bot.slice(1)}`,
          messageCount: 0,
        });
      }
      
      const messagesToInsert = [];
      if (greetingSent) {
         messagesToInsert.push({
           threadId: thread._id,
           userId,
           role: 'assistant',
           content: greetingSent,
           agent: bot
         });
      }
      messagesToInsert.push({
        threadId: thread._id,
        userId,
        role: 'user',
        content: message,
        agent: bot
      });
      messagesToInsert.push({
        threadId: thread._id,
        userId,
        role: 'assistant',
        content: aiResponse,
        agent: bot
      });

      await ChatMessage.insertMany(messagesToInsert);
      
      thread.messageCount += messagesToInsert.length;
      thread.lastMessageAt = new Date();
      await thread.save();
    } catch (adminSyncErr) {
      console.error('Failed to sync chat to admin collections:', adminSyncErr);
    }

    return res.json({
      success: true,
      data:{
        message: aiResponse,
        bot,
        timestamp: new Date(),
      },
      message: 'Message sent successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data:{},
      message: err.message || 'Failed to send message',
    });
  }
};

// Helper: Build user context for AI
const buildUserContext = async (userId) => {
  const user = await User.findById(userId);
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const meals = await MealLog.find({ userId, loggedAt: { $gte: last7Days } });
  const steps = await StepLog.find({ userId, loggedAt: { $gte: last7Days } });
  const sleep = await SleepLog.find({ userId, loggedAt: { $gte: last7Days } });

  return `User: ${user.gender}, ${user.age} years, goal: ${user.wellnessGoal}. 
Recent data (last 7 days): 
- Meals logged: ${meals.length}, avg calories: ${meals.length ? Math.round(meals.reduce((sum, m) => sum + m.calories, 0) / meals.length) : 0}
- Avg steps/day: ${steps.length ? Math.round(steps.reduce((sum, s) => sum + s.steps, 0) / steps.length) : 0}
- Avg sleep: ${sleep.length ? Math.round(sleep.reduce((sum, s) => sum + s.durationMin, 0) / sleep.length / 60 * 10) / 10 : 0} hours
  `;
};

export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        data:{},
        message: 'User not found',
      });
    }

    return res.json({
      success: true,
      data:{
        chats: user.chats,
      },
      message: 'Chat history fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data:{},
      message: err.message || 'Failed to fetch chat history',
    });
  }
};

export const clearChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        data:{},
        message: 'User not found',
      });
    }

    user.chats = [];
    await user.save();

    return res.json({
      success: true,
      data:{
        chats: [],
      },
      message: 'Chat history cleared successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data:{},
      message: err.message || 'Failed to clear chat history',
    });
  }
}; 

// // src/controllers/chatController.js
// export const sendVoiceMessage = async (req, res) => {
//   const debugId = `voice-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
//   const log = (msg) => console.log(`[CHAT][${debugId}] ${msg}`);

//   try {
//     log('=== START VOICE MESSAGE PROCESSING ===');
//     const userId = req.user.id;
//     const { bot = 'calia' } = req.body;

//     if (!req.file) {
//       log('❌ No audio file provided');
//       return res.status(400).json({ success: false, data: {}, message: 'Audio file is required' });
//     }
//     log(`✅ Received audio: ${req.file.originalname} (${req.file.size} bytes)`);

//     // STEP 1: ASR
//     let transcribedText;
//     try {
//       transcribedText = await voiceService.speechToText(req.file.buffer, debugId);
//     } catch (err) {
//       log(`⚠️ ASR failed → falling back to text prompt`);
//       return res.json({
//         success: true,
//         data: {
//           message: "I didn't catch that. Could you repeat or type your question?",
//           bot,
//           audioUrl: null,
//         },
//         message: 'Voice transcription failed',
//       });
//     }

//     // STEP 2: LLM
//     const user = await User.findById(userId);
//     const context = await buildUserContext(userId);
//     const history = user.chats.filter(chat => chat.bot === bot).slice(-5).map(({ role, content }) => ({ role, content }));
//     const preferences = user.aiPreferences[bot] || {};

//     log(`🧠 Sending to LLM: "${transcribedText}"`);
//     let aiResponse;
//     try {
//       aiResponse = await chatAiService.generateChatResponse(bot, transcribedText, context, history, preferences);
//       log(`✅ LLM Response: "${aiResponse.substring(0, 50)}..."`);
//     } catch (err) {
//       log(`❌ LLM failed: ${err.message}`);
//       throw new Error('AI response generation failed');
//     }

//     // STEP 3: TTS
//     let audioUrl = null;
//     try {
//       audioUrl = await voiceService.textToSpeech(aiResponse, bot, debugId);
//     } catch (err) {
//       log(`⚠️ TTS failed → returning text only`);
//       // Proceed with text-only response
//     }

//     // STEP 4: Save to DB
//     user.chats.push(
//       { role: 'user', content: transcribedText, bot, timestamp: new Date() },
//       { role: 'assistant', content: aiResponse, bot, timestamp: new Date() }
//     );
//     await user.save();
//     log('💾 Chat history saved');

//     log('=== VOICE PROCESSING COMPLETE ===');
//     return res.json({
//       success: true,
//       data: {
//         message: aiResponse,
//         bot,
//         audioUrl,
//         debugId, // 👈 Include in response for frontend debugging
//       },
//       message: 'Voice message processed successfully',
//     });
//   } catch (err) {
//     log(`💥 FATAL ERROR: ${err.message}`);
//     return res.status(400).json({
//       success: false,
//       data: { debugId }, // 👈 Always return debugId
//       message: err.message || 'Failed to process voice message',
//     });
//   }
// };

export default {
  sendMessage,
  getChatHistory,
  clearChatHistory, 
  // sendVoiceMessage
};