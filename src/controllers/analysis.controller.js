let AnalysisService = require('../services/analysis.service');
const { catchAsync } = require('../middleware/error.middleware');
const { NotFoundError } = require('../utils/errors');
const config = require('../config');
const { logger } = require('../utils/logger');

AnalysisService = new AnalysisService(config);

class AnalysisController {
  /**
   * Start new multi-agent analysis
   */
  static startAnalysis = catchAsync(async (req, res) => {
    const { query, priority = 1, tags = [] } = req.body;
    const userId = req.user.userId;

    logger.info('Starting LangChain Multi-Agent analysis', {
      userId,
      query,
      priority,
    });

    const result = await AnalysisService.startAnalysis({
      userId,
      query: query.trim(),
      priority,
      tags,
    });

    return res.status(202).json({
      success: true,
      message: 'LangChain Multi-Agent analysis started successfully',
      data: {
        queryId: result.queryId,
        estimatedDuration: result.estimatedDuration,
        status: result.status,
        framework: result.framework,
        agents: [
          'PlannerAgent - Creating search strategy',
          'SearchAgent - Gathering data via Tavily API',
          'AnalysisAgent - Processing and analyzing data',
          'SynthesisAgent - Generating comprehensive report',
          'ValidatorAgent - Quality control and validation',
        ],
      },
    });
  });

  /**
   * Get analysis status with progress tracking
   */
  static getAnalysisStatus = catchAsync(async (req, res) => {
    const { queryId } = req.params;
    const userId = req.user.userId;

    const status = await AnalysisService.getAnalysisStatus(queryId, userId);

    if (!status) {
      throw new NotFoundError('Analysis not found');
    }

    res.json({
      success: true,
      message: 'Status retrieved successfully',
      data: status,
    });
  });

  /**
   * Get comprehensive analysis results
   */
  static getAnalysisResults = catchAsync(async (req, res) => {
    const { queryId } = req.params;
    const userId = req.user.userId;
    const { format = 'json' } = req.query;

    const results = await AnalysisService.getAnalysisResults(queryId, userId);

    if (!results) {
      throw new NotFoundError('Analysis results not found');
    }

    // Handle different output formats
    if (format === 'html' && results.finalReport) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(results.finalReport);
    }

    res.json({
      success: true,
      message: 'Results retrieved successfully',
      data: results,
    });
  });

  /**
   * Cancel running analysis
   */
  static cancelAnalysis = catchAsync(async (req, res) => {
    const { queryId } = req.params;
    const userId = req.user.userId;

    await AnalysisService.cancelAnalysis(queryId, userId);

    logger.info('Analysis cancelled', { queryId, userId });

    res.json({
      success: true,
      message: 'Analysis cancelled successfully',
    });
  });

  /**
   * Retry failed analysis
   */
  static retryAnalysis = catchAsync(async (req, res) => {
    const { queryId } = req.params;
    const userId = req.user.userId;

    const result = await AnalysisService.retryAnalysis(queryId, userId);

    logger.info('Analysis retry initiated', {
      originalQueryId: queryId,
      newQueryId: result.queryId,
      userId,
    });

    res.json({
      success: true,
      message: 'Analysis retry started',
      data: {
        newQueryId: result.queryId,
        status: result.status,
        framework: result.framework,
      },
    });
  });

  /**
   * Get paginated user analysis history
   */
  static getUserAnalyses = catchAsync(async (req, res) => {
    const userId = req.user.userId;

    // ✅ FIX: Extract query parameters properly
    const queryOptions = {
      limit: parseInt(req.query.limit) || 10,
      skip: parseInt(req.query.skip) || 0,
      status: req.query.status,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      populate: req.query.populate ? req.query.populate.split(',') : [],
    };

    // ✅ FIX: Pass userId and options separately
    const result = await AnalysisService.getUserAnalyses(userId, queryOptions);

    logger.info('User analyses retrieved', {
      userId,
      page: req.query.page || 1,
      limit: queryOptions.limit,
      total: result.pagination?.total || result.analyses?.length,
    });

    res.json({
      success: true,
      message: 'Analyses retrieved successfully',
      data: result.analyses || result,
      pagination: result.pagination,
    });
  });

  /**
   * Get recent analyses (last 24 hours)
   */
  static getRecentAnalyses = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const queryOptions = {
      ...req.query,
      userId,
      dateRange: 'today',
      populate: ['status'],
    };

    const result = await AnalysisService.getUserAnalyses(queryOptions);

    res.json({
      success: true,
      message: 'Recent analyses retrieved successfully',
      data: result.analyses || result,
      pagination: result.pagination,
    });
  });

  /**
   * Get multi-agent workflow diagram
   */
  static getWorkflowDiagram = catchAsync(async (req, res) => {
    const workflowDiagram = {
      nodes: [
        {
          id: 'planner',
          label: 'Planner Agent',
          type: 'agent',
          description: 'Creates comprehensive search strategy',
          status: 'active',
        },
        {
          id: 'searcher',
          label: 'Search Agent',
          type: 'agent',
          description: 'Gathers real-time data via Tavily API',
          status: 'active',
        },
        {
          id: 'analyzer',
          label: 'Analysis Agent',
          type: 'agent',
          description: 'Processes and analyzes market data using GPT-4',
          status: 'active',
        },
        {
          id: 'synthesizer',
          label: 'Synthesis Agent',
          type: 'agent',
          description: 'Generates professional HTML reports',
          status: 'active',
        },
        {
          id: 'validator',
          label: 'Validator Agent',
          type: 'agent',
          description: 'Quality control and validation with retry logic',
          status: 'active',
        },
      ],
      edges: [
        { from: 'planner', to: 'searcher', type: 'sequential', label: 'Search Strategy' },
        { from: 'searcher', to: 'analyzer', type: 'sequential', label: 'Raw Data' },
        { from: 'analyzer', to: 'synthesizer', type: 'sequential', label: 'Analysis Results' },
        { from: 'synthesizer', to: 'validator', type: 'sequential', label: 'Report' },
        {
          from: 'validator',
          to: 'analyzer',
          type: 'conditional',
          condition: 'reprocess',
          label: 'Quality Retry',
        },
      ],
      framework: 'LangChain Multi-Agent System',
      description: 'Market Intelligence Analysis with 5 Specialized Agents',
      features: [
        'Sequential agent execution with error handling',
        'Real-time web search via Tavily API',
        'AI-powered analysis using OpenAI GPT-4',
        'Professional report generation',
        'Quality validation with retry logic',
        'MongoDB Atlas data persistence',
      ],
    };

    res.json({
      success: true,
      message: 'Workflow diagram retrieved',
      data: workflowDiagram,
    });
  });

  /**
   * Get comprehensive system status
   */
  static getSystemStatus = catchAsync(async (req, res) => {
    const serviceStatus = await AnalysisService.getStatus();

    const systemStatus = {
      framework: 'LangChain Multi-Agent System',
      version: '2.0.0',
      status: 'operational',
      services: {
        multiAgent: serviceStatus,
        database: 'MongoDB Atlas',
        search: 'Tavily API',
        llm: 'OpenAI GPT-4',
        backend: 'Node.js + Express',
        frontend: 'React + Tailwind CSS',
      },
      agents: {
        planner: 'active',
        searcher: 'active',
        analyzer: 'active',
        synthesizer: 'active',
        validator: 'active',
      },
      features: [
        '✅ 5 Specialized Agents',
        '✅ Real-time Web Search',
        '✅ AI-Powered Analysis',
        '✅ Professional Reports',
        '✅ Quality Validation',
        '✅ Export Multiple Formats',
        '✅ AWS Deployment Ready',
      ],
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      message: 'System status retrieved',
      data: systemStatus,
    });
  });

  /**
   * Get analysis statistics and metrics
   */
  static getAnalysisStats = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const options = {
      ...req.query,
      userId,
    };

    const stats = await AnalysisService.getAnalysisStats(options);

    res.json({
      success: true,
      message: 'Analysis statistics retrieved successfully',
      data: stats,
    });
  });
}

module.exports = AnalysisController;
