// src/models/chatMessageModel.js
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
			enum: ['user', 'assistant', 'system'],
			required: true,
		},
		content: { type: String, required: true },
		safetyFlags: { type: [String], default: [] },
		model: { type: String, default: null },
		tokensIn: { type: Number, default: 0 },
		tokensOut: { type: Number, default: 0 },
		clientMsgId: { type: String, default: null, index: true },
	},
	{ timestamps: true }
);

chatMessageSchema.index({ threadId: 1, createdAt: 1 });

const ChatMessage = mongoose.model('chat_messages', chatMessageSchema);
export default ChatMessage;
