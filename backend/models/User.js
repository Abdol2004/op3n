const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  isPremium: { 
    type: Boolean, 
    default: false 
  },
  premiumUntil: { 
    type: Date, 
    default: null 
  },
  dailyGigsViewed: { 
    type: Number, 
    default: 0 
  },
  lastResetDate: { 
    type: Date, 
    default: Date.now 
  },
  savedGigs: [{
    gigId: String,
    status: {
      type: String,
      enum: ['saved', 'applied', 'ignored'],
      default: 'saved'
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  telegramChatId: {
    type: String,
    default: null
  },
  telegramUsername: {
    type: String,
    default: null
  },
  alertThreshold: {
    type: Number,
    default: 60
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isActivePremium = function() {
  if (!this.isPremium) return false;
  if (!this.premiumUntil) return true;
  return new Date() < this.premiumUntil;
};

userSchema.methods.checkDailyLimit = function() {
  const today = new Date().setHours(0, 0, 0, 0);
  const lastReset = new Date(this.lastResetDate).setHours(0, 0, 0, 0);
  
  // Reset counter if it's a new day
  if (today > lastReset) {
    this.dailyGigsViewed = 0;
    this.lastResetDate = new Date();
  }
  
  // Premium users always pass
  if (this.isActivePremium()) return true;
  
  // Free users: check if under limit
  return this.dailyGigsViewed < 20;
};

module.exports = mongoose.model('User', userSchema);
