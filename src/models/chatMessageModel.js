// src/models/chatMessageModel.js
// Chatbot v1 — chat_messages collection.
// Stores every message in a thread (user + assistant turns).
import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'chat_threads',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    agent: {
      type: String,
      enum: ['calia', 'noura', 'aeron'],
      default: null,
    },
    model: {
      type: String,
      default: null, // e.g. 'gpt-4o', 'meta-llama/llama-3-8b-instruct'
    },
    tokensIn: {
      type: Number,
      default: 0,
    },
    tokensOut: {
      type: Number,
      default: 0,
    },
    safetyFlags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ threadId: 1, createdAt: 1 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });
chatMessageSchema.index({ createdAt: -1 });

const ChatMessage = mongoose.model('chat_messages', chatMessageSchema);
export default ChatMessage;
