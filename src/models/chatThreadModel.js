// src/models/chatThreadModel.js
// Chatbot v1 — chat_threads collection.
// Each document is one conversation session between a user and an AI agent.
import mongoose from 'mongoose';

const chatThreadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      index: true,
    },
    agent: {
      type: String,
      enum: ['calia', 'noura', 'aeron'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Chat',
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    rollingSummary: {
      type: String,
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

chatThreadSchema.index({ userId: 1, lastMessageAt: -1 });
chatThreadSchema.index({ agent: 1, lastMessageAt: -1 });

const ChatThread = mongoose.model('chat_threads', chatThreadSchema);
export default ChatThread;
