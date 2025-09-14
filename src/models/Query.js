const mongoose = require('mongoose');

const querySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    queryText: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    metadata: {
      estimatedDuration: Number,
      actualDuration: Number,
      errorMessage: String,
      retryCount: { type: Number, default: 0 },
    },
    tags: [
      {
        type: String,
        maxlength: 50,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
querySchema.index({ userId: 1, createdAt: -1 });
querySchema.index({ status: 1, priority: -1 });
querySchema.index({ queryText: 'text' });

// Virtual for results
querySchema.virtual('results', {
  ref: 'Result',
  localField: '_id',
  foreignField: 'queryId',
});

// Instance methods
querySchema.methods.updateStatus = function (status, metadata = {}) {
  this.status = status;
  this.metadata = { ...this.metadata, ...metadata };
  return this.save();
};

querySchema.methods.incrementRetry = function () {
  this.metadata.retryCount = (this.metadata.retryCount || 0) + 1;
  return this.save();
};

// Static methods
querySchema.statics.findByUser = function (userId, options = {}) {
  const { limit = 10, skip = 0, status } = options;
  const query = { userId };
  if (status) query.status = status;

  return this.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip);
};

module.exports = mongoose.model('Query', querySchema);
