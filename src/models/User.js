const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    settings: {
      maxConcurrentAnalyses: { type: Number, default: 2 },
      defaultExportFormat: { type: String, default: 'pdf' },
      emailNotifications: { type: Boolean, default: true },
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    },
    usage: {
      totalAnalyses: { type: Number, default: 0 },
      monthlyAnalyses: { type: Number, default: 0 },
      lastAnalysis: Date,
      apiCallsCount: { type: Number, default: 0 },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'premium', 'enterprise'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'cancelled'],
        default: 'active',
      },
      expiresAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ userId: 1 });
userSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });

// Instance methods
userSchema.methods.incrementUsage = function () {
  this.usage.totalAnalyses += 1;
  this.usage.monthlyAnalyses += 1;
  this.usage.lastAnalysis = new Date();
  return this.save();
};

userSchema.methods.resetMonthlyUsage = function () {
  this.usage.monthlyAnalyses = 0;
  return this.save();
};

userSchema.methods.canPerformAnalysis = function () {
  const limits = {
    free: 10,
    premium: 100,
    enterprise: 1000,
  };

  const limit = limits[this.subscription.plan] || limits.free;
  return this.usage.monthlyAnalyses < limit;
};

module.exports = mongoose.model('User', userSchema);
