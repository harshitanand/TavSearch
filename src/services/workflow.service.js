const SearchAgent = require('../agents/SearchAgent');
const AnalysisAgent = require('../agents/AnalysisAgent');
const SynthesisAgent = require('../agents/SynthesisAgent');
const config = require('../config');
const { logger } = require('../utils/logger');
const { EventEmitter } = require('events');
const { ApiError } = require('../utils/errors');

class WorkflowService extends EventEmitter {
  constructor() {
    super();
    this.searchAgent = new SearchAgent(config.apiKeys.tavily, config.apiKeys.openai);
    this.analysisAgent = new AnalysisAgent(config.apiKeys.openai);
    this.synthesisAgent = new SynthesisAgent(config.apiKeys.openai);
    this.activeWorkflows = new Map();
    this.maxConcurrentWorkflows = config.analysis.maxConcurrent || 5;
  }

  static async executeWorkflow(query, userId) {
    // Check concurrent workflow limit
    if (this.activeWorkflows.size >= this.maxConcurrentWorkflows) {
      throw new ApiError('Maximum concurrent workflows reached. Please try again later.', 429);
    }

    const workflowId = `${userId}-${Date.now()}`;
    const state = {
      id: workflowId,
      query,
      userId,
      currentStep: 'initializing',
      startTime: Date.now(),
      searchStrategy: null,
      rawData: [],
      processedData: {},
      analysisResults: {},
      finalReport: '',
      visualizations: [],
      metadata: {
        steps: [],
        performance: {},
        errors: [],
      },
      progress: {
        current: 0,
        total: 6,
        percentage: 0,
      },
    };

    this.activeWorkflows.set(workflowId, state);

    try {
      logger.info(`Starting workflow ${workflowId} for user ${userId}`, { query });

      // Step 1: Plan Search Strategy
      await this.updateProgress(state, 'planning_search', 1);
      this.emit('progress', { workflowId, step: 'planning_search', progress: state.progress });

      const searchStart = Date.now();
      state.searchStrategy = await this.searchAgent.planSearchStrategy(query);
      state.metadata.performance.searchPlanningDuration = Date.now() - searchStart;

      logger.info(`Search strategy planned for workflow ${workflowId}`, {
        primaryTerms: state.searchStrategy.primaryTerms?.length || 0,
        secondaryTerms: state.searchStrategy.secondaryTerms?.length || 0,
      });

      // Step 2: Gather Data
      await this.updateProgress(state, 'gathering_data', 2);
      this.emit('progress', { workflowId, step: 'gathering_data', progress: state.progress });

      const gatherStart = Date.now();
      state.rawData = await this.searchAgent.gatherData(state.searchStrategy);
      state.metadata.performance.dataGatheringDuration = Date.now() - gatherStart;

      logger.info(`Data gathered for workflow ${workflowId}`, {
        totalSources: state.rawData.length,
      });

      // Step 3: Process Data
      await this.updateProgress(state, 'processing_data', 3);
      this.emit('progress', { workflowId, step: 'processing_data', progress: state.progress });

      const processStart = Date.now();
      state.processedData = await this.analysisAgent.processData(state.rawData);
      state.metadata.performance.dataProcessingDuration = Date.now() - processStart;

      // Step 4: Analyze Trends
      await this.updateProgress(state, 'analyzing_trends', 4);
      this.emit('progress', { workflowId, step: 'analyzing_trends', progress: state.progress });

      const analysisStart = Date.now();
      state.analysisResults = await this.analysisAgent.analyzeMarketTrends(
        state.processedData,
        query
      );
      state.metadata.performance.analysisDuration = Date.now() - analysisStart;

      // Step 5: Generate Report
      await this.updateProgress(state, 'generating_report', 5);
      this.emit('progress', { workflowId, step: 'generating_report', progress: state.progress });

      const reportStart = Date.now();
      state.finalReport = await this.synthesisAgent.generateReport(
        state.analysisResults,
        state.processedData,
        query
      );
      state.metadata.performance.reportGenerationDuration = Date.now() - reportStart;

      // Step 6: Create Visualizations
      await this.updateProgress(state, 'creating_visualizations', 6);
      this.emit('progress', {
        workflowId,
        step: 'creating_visualizations',
        progress: state.progress,
      });

      const vizStart = Date.now();
      state.visualizations = await this.synthesisAgent.createVisualizations(state.analysisResults);
      state.metadata.performance.visualizationDuration = Date.now() - vizStart;

      // Complete workflow
      await this.updateProgress(state, 'completed', 6);
      state.metadata.performance.totalDuration = Date.now() - state.startTime;

      logger.info(`Workflow ${workflowId} completed successfully`, {
        duration: state.metadata.performance.totalDuration,
        sources: state.rawData.length,
      });

      this.emit('completed', { workflowId, state });

      // Clean up after delay
      setTimeout(() => {
        this.activeWorkflows.delete(workflowId);
        logger.debug(`Cleaned up workflow ${workflowId}`);
      }, 300000); // 5 minutes

      return state;
    } catch (error) {
      state.currentStep = 'failed';
      state.error = error.message;
      state.metadata.errors.push({
        step: state.currentStep,
        error: error.message,
        timestamp: new Date(),
      });

      logger.error(`Workflow ${workflowId} failed`, {
        error: error.message,
        step: state.currentStep,
        duration: Date.now() - state.startTime,
      });

      this.emit('error', { workflowId, error });

      // Clean up failed workflow
      setTimeout(() => {
        this.activeWorkflows.delete(workflowId);
      }, 60000); // 1 minute

      throw error;
    }
  }

  static async updateProgress(state, step, currentStep) {
    state.currentStep = step;
    state.progress.current = currentStep;
    state.progress.percentage = Math.round((currentStep / state.progress.total) * 100);

    state.metadata.steps.push({
      step,
      timestamp: new Date(),
      duration: Date.now() - state.startTime,
    });
  }

  static async getWorkflowProgress(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return null;
    }

    return {
      workflowId: workflow.id,
      currentStep: workflow.currentStep,
      progress: workflow.progress,
      startTime: workflow.startTime,
      duration: Date.now() - workflow.startTime,
      estimatedTimeRemaining: this.estimateTimeRemaining(workflow),
      completedSteps: workflow.metadata.steps,
    };
  }

  estimateTimeRemaining(workflow) {
    const { progress, startTime } = workflow;
    if (progress.current === 0) return null;

    const elapsed = Date.now() - startTime;
    const avgTimePerStep = elapsed / progress.current;
    const remainingSteps = progress.total - progress.current;

    return Math.round(avgTimePerStep * remainingSteps);
  }

  static async cancelWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.cancelled = true;
      workflow.currentStep = 'cancelled';

      logger.info(`Workflow ${workflowId} cancelled`);

      this.activeWorkflows.delete(workflowId);
      this.emit('cancelled', { workflowId });

      return true;
    }
    return false;
  }

  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.keys());
  }

  getWorkflowStats() {
    return {
      active: this.activeWorkflows.size,
      maxConcurrent: this.maxConcurrentWorkflows,
      available: this.maxConcurrentWorkflows - this.activeWorkflows.size,
    };
  }

  // Graceful shutdown
  static async shutdown() {
    logger.info('Shutting down workflow service...');

    // Cancel all active workflows
    const activeWorkflowIds = Array.from(this.activeWorkflows.keys());
    for (const workflowId of activeWorkflowIds) {
      await this.cancelWorkflow(workflowId);
    }

    this.removeAllListeners();
    logger.info('Workflow service shutdown complete');
  }
}

module.exports = WorkflowService;
