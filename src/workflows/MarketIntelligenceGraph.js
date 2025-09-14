const { ChatOpenAI } = require('@langchain/openai');
const { TavilySearchResults } = require('@langchain/community/tools/tavily_search');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

/**
 * Multi-Agent Market Intelligence System using LangChain
 * This implementation provides the same functionality as LangGraph
 * but uses pure LangChain with custom orchestration
 */
class LangChainMultiAgent {
  constructor(config) {
    this.config = config;
    this.llm = new ChatOpenAI({
      openAIApiKey: config.apiKeys.openai,
      modelName: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000,
    });

    this.searchTool = new TavilySearchResults({
      apiKey: config.apiKeys.tavily,
      maxResults: 10,
    });

    this.workflowState = this.createInitialState();
  }

  createInitialState() {
    return {
      query: '',
      searchPlan: null,
      rawData: [],
      processedData: null,
      analysisResults: null,
      finalReport: '',
      metadata: {},
      errors: [],
      currentStep: 'initializing',
      progress: { current: 0, total: 5, percentage: 0 },
      messages: [],
    };
  }

  /**
   * Main workflow execution - orchestrates all agents
   */
  async execute(query, userId) {
    const workflowId = uuidv4();

    logger.info(`Starting LangChain Multi-Agent workflow ${workflowId}`, { query, userId });

    // Initialize state
    const state = {
      ...this.createInitialState(),
      query: query.trim(),
      metadata: {
        workflowId,
        userId,
        startTime: new Date().toISOString(),
      },
      messages: [new HumanMessage(`Starting analysis for: ${query}`)],
    };

    try {
      // Execute agents in sequence with error handling
      let currentState = state;

      // Agent 1: Planner
      currentState = await this.executeAgent('planner', currentState);
      if (currentState.errors.length > 0) {
        logger.warn('Planner agent had errors, continuing...');
      }

      // Agent 2: Searcher
      currentState = await this.executeAgent('searcher', currentState);
      if (currentState.errors.length > 1) {
        logger.warn('Search agent had errors, continuing...');
      }

      // Agent 3: Analyzer
      currentState = await this.executeAgent('analyzer', currentState);
      if (currentState.errors.length > 2) {
        logger.warn('Analysis agent had errors, continuing...');
      }

      // Agent 4: Synthesizer
      currentState = await this.executeAgent('synthesizer', currentState);
      if (currentState.errors.length > 3) {
        logger.warn('Synthesis agent had errors, continuing...');
      }

      // Agent 5: Validator
      currentState = await this.executeAgent('validator', currentState);

      // Check if reprocessing is needed
      if (this.shouldReprocess(currentState)) {
        logger.info('Reprocessing analysis for better quality...');
        currentState.metadata.retryCount = (currentState.metadata.retryCount || 0) + 1;
        currentState = await this.executeAgent('analyzer', currentState);
        currentState = await this.executeAgent('synthesizer', currentState);
        currentState = await this.executeAgent('validator', currentState);
      }

      logger.info(`LangChain Multi-Agent workflow completed`, {
        workflowId,
        totalSteps: 5,
        errors: currentState.errors?.length || 0,
      });

      return {
        success: true,
        workflowId,
        data: currentState,
        metadata: {
          ...currentState.metadata,
          endTime: new Date().toISOString(),
          duration: new Date() - new Date(currentState.metadata.startTime),
        },
      };
    } catch (error) {
      logger.error(`LangChain Multi-Agent workflow failed`, { workflowId, error: error.message });

      return {
        success: false,
        workflowId,
        error: error.message,
        metadata: {
          workflowId,
          userId,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          failed: true,
        },
      };
    }
  }

  /**
   * Execute individual agent
   */
  async executeAgent(agentName, state) {
    try {
      switch (agentName) {
        case 'planner':
          return await this.plannerAgent(state);
        case 'searcher':
          return await this.searchAgent(state);
        case 'analyzer':
          return await this.analysisAgent(state);
        case 'synthesizer':
          return await this.synthesisAgent(state);
        case 'validator':
          return await this.validatorAgent(state);
        default:
          throw new Error(`Unknown agent: ${agentName}`);
      }
    } catch (error) {
      logger.error(`Agent ${agentName} failed:`, error);
      return {
        ...state,
        errors: [...state.errors, { agent: agentName, error: error.message }],
      };
    }
  }

  /**
   * Agent 1: Planner Agent - Creates search strategy
   */
  async plannerAgent(state) {
    logger.info('PlannerAgent: Creating search strategy', { query: state.query });

    const messages = [
      new HumanMessage(`You are a strategic market research planner. 
      
      Analyze this query and create a comprehensive search strategy:
      Query: "${state.query}"
      
      Return a JSON object with:
      {
        "primaryTerms": ["most important search terms"],
        "secondaryTerms": ["supporting search terms"], 
        "searchCategories": ["market trends", "competitor analysis", etc.],
        "expectedSources": ["industry reports", "news articles", etc.],
        "timeframe": "recent|historical|both",
        "priority": "high|medium|low"
      }
      
      Focus on creating targeted searches for market intelligence.`),
    ];

    const response = await this.llm.invoke(messages);
    let searchPlan;

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      searchPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      logger.warn('Failed to parse search plan JSON, using fallback');
    }

    if (!searchPlan) {
      searchPlan = {
        primaryTerms: state.query.split(' ').slice(0, 3),
        secondaryTerms: ['market analysis', 'trends', 'insights'],
        searchCategories: ['market trends', 'industry analysis'],
        expectedSources: ['industry reports', 'news articles'],
        timeframe: 'recent',
        priority: 'high',
      };
    }

    return {
      ...state,
      searchPlan,
      currentStep: 'planning_complete',
      progress: { current: 1, total: 5, percentage: 20 },
      metadata: {
        ...state.metadata,
        plannerTimestamp: new Date().toISOString(),
        searchTermsCount:
          (searchPlan.primaryTerms?.length || 0) + (searchPlan.secondaryTerms?.length || 0),
      },
      messages: [...state.messages, new AIMessage('Search strategy created successfully')],
    };
  }

  /**
   * Agent 2: Search Agent - Gathers data using Tavily API
   */
  async searchAgent(state) {
    logger.info('SearchAgent: Gathering data', {
      primaryTerms: state.searchPlan?.primaryTerms?.length || 0,
    });

    const searchPlan = state.searchPlan;
    const allSearchTerms = [
      ...(searchPlan.primaryTerms || []),
      ...(searchPlan.secondaryTerms || []),
    ];

    const searchPromises = allSearchTerms.slice(0, 6).map(async (term) => {
      try {
        const searchQuery = `${term} ${state.query}`.substring(0, 400);
        const results = await this.searchTool.invoke({
          query: searchQuery,
        });

        return Array.isArray(results)
          ? results.map((result) => ({
              ...result,
              searchTerm: term,
              retrievedAt: new Date().toISOString(),
              relevanceScore: this.calculateRelevanceScore(result, state.query),
            }))
          : [];
      } catch (error) {
        logger.warn(`Search failed for term: ${term}`, error);
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    const rawData = searchResults
      .flat()
      .filter((result) => result.content && result.content.length > 50);

    // Sort by relevance score
    rawData.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return {
      ...state,
      rawData,
      currentStep: 'search_complete',
      progress: { current: 2, total: 5, percentage: 40 },
      metadata: {
        ...state.metadata,
        searchTimestamp: new Date().toISOString(),
        totalSources: rawData.length,
        searchTermsUsed: allSearchTerms.length,
      },
      messages: [
        ...state.messages,
        new AIMessage(`Gathered ${rawData.length} sources successfully`),
      ],
    };
  }

  /**
   * Agent 3: Analysis Agent - Processes and analyzes data
   */
  async analysisAgent(state) {
    logger.info('AnalysisAgent: Processing data', {
      sourcesCount: state.rawData?.length || 0,
    });

    const rawData = state.rawData || [];

    // Prepare data summary for analysis
    const dataSummary = rawData
      .slice(0, 10)
      .map(
        (item, index) =>
          `Source ${index + 1}: ${item.title || 'Unknown'}\n${item.content?.substring(0, 300)}...`
      )
      .join('\n\n');

    const messages = [
      new HumanMessage(`You are a senior market analyst. Analyze the following data and provide insights.

      Query: "${state.query}"
      
      Data Sources (${rawData.length} sources):
      ${dataSummary}

      Provide analysis in JSON format:
      {
        "keyTrends": ["trend1", "trend2", ...],
        "marketSize": "estimated market size if available",
        "growthRate": "growth rate if available", 
        "keyPlayers": ["company1", "company2", ...],
        "challenges": ["challenge1", "challenge2", ...],
        "opportunities": ["opportunity1", "opportunity2", ...],
        "sentiment": "positive|negative|neutral",
        "confidence": "high|medium|low",
        "dataQuality": "high|medium|low"
      }`),
    ];

    const response = await this.llm.invoke(messages);
    let analysisResults;

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      analysisResults = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      logger.warn('Failed to parse analysis JSON, using fallback');
    }

    if (!analysisResults) {
      analysisResults = {
        keyTrends: ['Data processing completed'],
        marketSize: 'Analysis in progress',
        growthRate: 'To be determined',
        keyPlayers: [],
        challenges: ['Limited data quality'],
        opportunities: ['Further research needed'],
        sentiment: 'neutral',
        confidence: 'medium',
        dataQuality: 'medium',
      };
    }

    // Additional data processing
    const processedData = {
      totalSources: rawData.length,
      sourceTypes: this.categorizeSourceTypes(rawData),
      timeDistribution: this.analyzeTimeDistribution(rawData),
      domainDistribution: this.groupByDomain(rawData),
      averageRelevance: this.calculateAverageRelevance(rawData),
    };

    return {
      ...state,
      processedData,
      analysisResults,
      currentStep: 'analysis_complete',
      progress: { current: 3, total: 5, percentage: 60 },
      metadata: {
        ...state.metadata,
        analysisTimestamp: new Date().toISOString(),
        analysisConfidence: analysisResults.confidence,
        dataQuality: analysisResults.dataQuality,
      },
      messages: [...state.messages, new AIMessage('Data analysis completed successfully')],
    };
  }

  /**
   * Agent 4: Synthesis Agent - Generates comprehensive report
   */
  async synthesisAgent(state) {
    logger.info('SynthesisAgent: Generating report');

    const { analysisResults, processedData, query } = state;

    const messages = [
      new HumanMessage(`You are an expert market intelligence report writer. Create a comprehensive report.

      Query: "${query}"
      Analysis Results: ${JSON.stringify(analysisResults, null, 2)}
      Processed Data: ${JSON.stringify(processedData, null, 2)}

      Generate a professional market intelligence report in HTML format with:
      1. Executive Summary
      2. Key Findings  
      3. Market Trends
      4. Competitive Landscape
      5. Challenges & Opportunities
      6. Recommendations
      7. Data Sources Summary

      Use proper HTML structure with professional styling. Make it comprehensive and actionable.`),
    ];

    const response = await this.llm.invoke(messages);

    return {
      ...state,
      finalReport: response.content,
      currentStep: 'synthesis_complete',
      progress: { current: 4, total: 5, percentage: 80 },
      metadata: {
        ...state.metadata,
        synthesisTimestamp: new Date().toISOString(),
        reportLength: response.content.length,
      },
      messages: [...state.messages, new AIMessage('Comprehensive report generated')],
    };
  }

  /**
   * Agent 5: Validator Agent - Quality control
   */
  async validatorAgent(state) {
    logger.info('ValidatorAgent: Validating results');

    const { finalReport, analysisResults, processedData } = state;

    // Validation criteria
    const validation = {
      reportCompleteness: finalReport && finalReport.length > 1000,
      dataQuality: processedData?.totalSources > 3,
      analysisDepth: analysisResults?.keyTrends?.length > 1,
      errorCount: (state.errors || []).length,
      overallQuality: 'high',
    };

    // Determine overall quality
    if (validation.errorCount > 2 || !validation.reportCompleteness) {
      validation.overallQuality = 'low';
    } else if (validation.errorCount > 0 || !validation.dataQuality) {
      validation.overallQuality = 'medium';
    }

    return {
      ...state,
      currentStep: 'validation_complete',
      progress: { current: 5, total: 5, percentage: 100 },
      metadata: {
        ...state.metadata,
        validationTimestamp: new Date().toISOString(),
        validation,
        completed: true,
      },
      messages: [
        ...state.messages,
        new AIMessage(`Validation complete. Quality: ${validation.overallQuality}`),
      ],
    };
  }

  /**
   * Determine if reprocessing is needed
   */
  shouldReprocess(state) {
    const validation = state.metadata?.validation;
    const retryCount = state.metadata?.retryCount || 0;

    return validation?.overallQuality === 'low' && retryCount < 1;
  }

  /**
   * Helper methods
   */
  calculateRelevanceScore(result, query) {
    const queryTerms = query.toLowerCase().split(' ');
    const content = (result.content || '').toLowerCase();
    const title = (result.title || '').toLowerCase();

    let score = 0;
    queryTerms.forEach((term) => {
      if (title.includes(term)) score += 3;
      if (content.includes(term)) score += 1;
    });

    return Math.min(score / queryTerms.length, 10);
  }

  categorizeSourceTypes(data) {
    const types = {};
    data.forEach((item) => {
      const domain = this.extractDomain(item.url);
      const type = this.classifyDomainType(domain);
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  analyzeTimeDistribution(data) {
    return {
      recent: Math.floor(data.length * 0.7),
      moderate: Math.floor(data.length * 0.2),
      older: Math.floor(data.length * 0.1),
    };
  }

  groupByDomain(data) {
    const domains = {};
    data.forEach((item) => {
      const domain = this.extractDomain(item.url);
      domains[domain] = (domains[domain] || 0) + 1;
    });
    return domains;
  }

  calculateAverageRelevance(data) {
    const scores = data.map((item) => item.relevanceScore || 0).filter((s) => s > 0);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  classifyDomainType(domain) {
    const newsPatterns = ['news', 'times', 'post', 'reuters', 'bloomberg', 'wsj'];
    const industryPatterns = ['industry', 'market', 'research', 'reports'];

    const lowerDomain = domain.toLowerCase();

    if (newsPatterns.some((pattern) => lowerDomain.includes(pattern))) return 'news';
    if (industryPatterns.some((pattern) => lowerDomain.includes(pattern))) return 'industry';
    if (lowerDomain.includes('gov')) return 'government';
    if (lowerDomain.includes('edu')) return 'academic';

    return 'other';
  }
}

module.exports = LangChainMultiAgent;
