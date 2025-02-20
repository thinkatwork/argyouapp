import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  format: {
    type: String,
    required: true
  },
  messages: [{
    text: String,
    sender: String,
    timestamp: Date,
    ratings: {
      logicalStrength: Number,
      evidenceUsage: Number,
      persuasiveness: Number,
      overallScore: Number
    },
    feedback: String,
    intensity: Number,
    ratingType: String,
    isError: Boolean
  }],
  degree: {
    type: Number,
    default: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
ConversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema); 