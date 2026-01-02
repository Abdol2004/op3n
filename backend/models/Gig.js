const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
  tweetId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  text: { 
    type: String, 
    required: true 
  },
  author: {
    username: String,
    displayName: String,
    verified: Boolean,
    followers: Number
  },
  url: { 
    type: String, 
    required: true 
  },
  engagement: {
    likes: Number,
    retweets: Number,
    replies: Number
  },
  links: [String],
  score: { 
    type: Number, 
    required: true 
  },
  category: {
    type: String,
    enum: ['ambassador', 'community', 'content', 'marketing', 'other'],
    default: 'other'
  },
  isHotCake: {
    type: Boolean,
    default: false
  },
  timestamp: { 
    type: Date, 
    required: true 
  },
  firstSeen: { 
    type: Date, 
    default: Date.now 
  }
});

gigSchema.index({ score: -1, firstSeen: -1 });
gigSchema.index({ isHotCake: -1, score: -1 });

module.exports = mongoose.model('Gig', gigSchema);
