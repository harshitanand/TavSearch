const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    queryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Query',
      required: true,
      index: true,
    },
    searchStrategy: {
      primaryTerms: [String],
      secondaryTerms: [String],
      searchCategories: [String],
      timeRange: String,
    },
    rawData: [
      {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    ],
    metaData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    processedData: {
      totalSources: Number,
      qualityMetrics: {
        averageRelevanceScore: Number,
        highQualitySources: Number,
        recentSources: Number,
      },
      domainDistribution: mongoose.Schema.Types.Mixed,
    },
    analysisResults: {
      keyTrends: [String],
      marketOpportunities: [String],
      competitiveLandscape: {
        majorPlayers: [String],
        marketPosition: String,
      },
      insights: [String],
      recommendations: [String],
      riskFactors: [String],
      dataConfidence: String,
      summary: String,
    },
    finalReport: {
      type: String,
      maxlength: 50000,
    },
    visualizations: [
      {
        type: String,
        title: String,
        data: mongoose.Schema.Types.Mixed,
        chartType: String,
        base64Image: String,
      },
    ],
    exportOptions: {
      formats: [String],
      lastExported: Date,
    },
    performance: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
resultSchema.index({ queryId: 1 });
resultSchema.index({ createdAt: -1 });

// Virtual for query details
resultSchema.virtual('query', {
  ref: 'Query',
  localField: 'queryId',
  foreignField: '_id',
  justOne: true,
});

// Instance methods
resultSchema.methods.addVisualization = function (visualization) {
  this.visualizations.push(visualization);
  return this.save();
};

resultSchema.methods.updatePerformance = function (metrics) {
  this.performance = { ...this.performance, ...metrics };
  return this.save();
};

// Static methods
resultSchema.statics.findWithQuery = function (queryId) {
  return this.findOne({ queryId }).populate('query');
};

resultSchema.statics.getAnalyticsSummary = function (userId, dateRange = {}) {
  const { startDate, endDate } = dateRange;
  const matchStage = {};

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }

  return this.aggregate([
    {
      $lookup: {
        from: 'queries',
        localField: 'queryId',
        foreignField: '_id',
        as: 'query',
      },
    },
    { $unwind: '$query' },
    { $match: { 'query.userId': userId, ...matchStage } },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        avgDuration: { $avg: '$performance.totalDuration' },
        avgSources: { $avg: '$processedData.totalSources' },
        avgConfidence: {
          $avg: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$analysisResults.dataConfidence', 'high'] },
                  then: 3,
                },
                {
                  case: { $eq: ['$analysisResults.dataConfidence', 'medium'] },
                  then: 2,
                },
                {
                  case: { $eq: ['$analysisResults.dataConfidence', 'low'] },
                  then: 1,
                },
              ],
              default: 0,
            },
          },
        },
      },
    },
  ]);
};

module.exports = mongoose.model('Result', resultSchema);
