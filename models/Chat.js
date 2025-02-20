import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  text: String,
  sender: String, // 'user' or 'ai'
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ChatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: String,
  degreeOfDifference: Number,
  messages: [MessageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Chat || mongoose.model('Chat', ChatSchema); 