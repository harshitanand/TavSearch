const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

/**
 * Direct Tavily API implementation to replace broken LangChain wrapper
 */
class TavilySearchTool {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Tavily API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.tavily.com';
  }

  async search(query, options = {}) {
    try {
      logger.debug('Tavily API call', { query: query.substring(0, 50) });

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: query.trim(),
          search_depth: options.search_depth || 'advanced',
          max_results: options.max_results || 10,
          include_answer: false,
          include_raw_content: false,
          include_domains: options.include_domains || [],
          exclude_domains: options.exclude_domains || [],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Tavily API error', {
          status: response.status,
          error: errorText,
          query: query.substring(0, 50),
        });
        return []; // ✅ Return empty array on error
      }

      // ✅ Parse JSON response
      const data = await response.json();

      // ✅ Extract results array - Tavily returns { results: [...] }
      const results = data.results || [];

      // ✅ Verify it's an array before returning
      if (!Array.isArray(results)) {
        logger.error('Tavily returned non-array results', {
          type: typeof results,
          data: JSON.stringify(data).substring(0, 200),
        });
        return [];
      }

      logger.debug('Tavily search successful', {
        query: query.substring(0, 50),
        resultCount: results.length,
        isArray: Array.isArray(results),
      });

      return results; // ✅ Return actual array
    } catch (error) {
      logger.error('Tavily search failed', {
        query: query.substring(0, 50),
        error: error.message,
      });
      return []; // ✅ Return empty array on error
    }
  }
}

class LangChainMultiAgent {
  constructor(config) {
    this.config = config;

    // Validate required API keys
    if (!config.apiKeys.openai) {
      throw new Error('OpenAI API key is required');
    }
    if (!config.apiKeys.tavily) {
      throw new Error('Tavily API key is required');
    }

    this.llm = new ChatOpenAI({
      openAIApiKey: config.apiKeys.openai,
      modelName: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Use direct Tavily implementation instead of broken LangChain wrapper
    this.searchTool = new TavilySearchTool(config.apiKeys.tavily);
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
      let currentState = state;

      // Agent 1: Planner
      currentState = await this.executeAgent('planner', currentState);

      // Agent 2: Searcher
      currentState = await this.executeAgent('searcher', currentState);

      // ✅ CRITICAL DEBUG: Check data type after search
      logger.info('POST-SEARCH DEBUG CHECK', {
        rawDataType: typeof currentState.rawData,
        rawDataIsArray: Array.isArray(currentState.rawData),
        rawDataLength: currentState.rawData?.length || 0,
        rawDataConstructor: currentState.rawData?.constructor?.name || 'unknown',
        // Log first few characters if it's a string
        rawDataPreview:
          typeof currentState.rawData === 'string'
            ? currentState.rawData.substring(0, 100)
            : 'not-string',
      });

      // ✅ EMERGENCY FIX: If rawData is somehow a string, parse it
      if (typeof currentState.rawData === 'string') {
        logger.error('EMERGENCY: rawData is a string after searchAgent!');
        try {
          currentState.rawData = JSON.parse(currentState.rawData);
          logger.info('Emergency parse successful');
        } catch (e) {
          logger.error('Emergency parse failed, using empty array');
          currentState.rawData = [];
        }
      }

      // Continue with other agents
      currentState = await this.executeAgent('analyzer', currentState);
      currentState = await this.executeAgent('synthesizer', currentState);
      currentState = await this.executeAgent('validator', currentState);

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
      logger.error(`Workflow failed`, { workflowId, error: error.message });
      return {
        success: false,
        workflowId,
        error: error.message,
      };
    }
  }

  /**
   * Execute individual agent with error isolation
   */
  async executeAgent(agentName, state) {
    try {
      logger.info(`Executing ${agentName} agent`);

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
        errors: [
          ...(state.errors || []),
          {
            agent: agentName,
            error: error.message,
            timestamp: new Date().toISOString(),
          },
        ],
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
      
      Return ONLY a JSON object with:
      {
        "primaryTerms": ["3-5 most important search terms"],
        "secondaryTerms": ["2-3 supporting search terms"], 
        "searchCategories": ["market trends", "competitor analysis"],
        "timeframe": "recent",
        "priority": "high"
      }
      
      Focus on creating targeted searches for market intelligence. Return only JSON, no other text.`),
    ];

    const response = await this.llm.invoke(messages);
    let searchPlan;

    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        searchPlan = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.warn('Failed to parse search plan JSON, using fallback');
    }

    // Fallback search plan
    if (!searchPlan) {
      const queryWords = state.query.split(' ').filter((word) => word.length > 2);
      searchPlan = {
        primaryTerms: [
          state.query,
          `${queryWords[0]} market analysis`,
          `${queryWords[0]} industry trends`,
        ],
        secondaryTerms: [`${queryWords[0]} competitors`, `${queryWords[0]} market size`],
        searchCategories: ['market trends', 'industry analysis'],
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

  async searchAgent(state) {
    logger.info('SearchAgent: Gathering data', {
      primaryTerms: state.searchPlan?.primaryTerms?.length || 0,
    });

    const searchPlan = state.searchPlan;
    if (!searchPlan) {
      return {
        ...state,
        rawData: [], // ✅ Return actual empty array
        currentStep: 'search_complete',
        progress: { current: 2, total: 5, percentage: 40 },
        metadata: {
          ...state.metadata,
          searchTimestamp: new Date().toISOString(),
          totalSources: 0,
          searchTermsUsed: 0,
        },
        messages: [...state.messages, new AIMessage('No search plan available')],
      };
    }

    const allSearchTerms = [
      ...(searchPlan.primaryTerms || []),
      ...(searchPlan.secondaryTerms || []),
    ];

    const validTerms = allSearchTerms
      .filter((term) => term && typeof term === 'string' && term.trim().length > 0)
      .slice(0, 6);

    if (validTerms.length === 0) {
      return {
        ...state,
        rawData: [], // ✅ Return actual empty array
        currentStep: 'search_complete',
        progress: { current: 2, total: 5, percentage: 40 },
        metadata: {
          ...state.metadata,
          searchTimestamp: new Date().toISOString(),
          totalSources: 0,
          searchTermsUsed: 0,
        },
        messages: [...state.messages, new AIMessage('No valid search terms')],
      };
    }

    const rawData = []; // ✅ Start with actual array
    let successfulSearches = 0;
    let failedSearches = 0;

    // Execute searches sequentially to avoid rate limits
    for (const [index, term] of validTerms.entries()) {
      try {
        // Add delay between requests
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const searchQuery = `${term} ${state.query}`.substring(0, 400).trim();
        logger.debug(`Executing search ${index + 1}/${validTerms.length}: ${searchQuery}`);

        // Call Tavily API directly
        const searchResults = await this.searchTool.search(searchQuery, {
          search_depth: 'advanced',
          max_results: 5,
          exclude_domains: ['reddit.com', 'twitter.com', 'facebook.com'],
        });

        // ✅ CRITICAL: Ensure searchResults is an array
        let results = [];
        if (Array.isArray(searchResults)) {
          results = searchResults;
        } else if (
          searchResults &&
          typeof searchResults === 'object' &&
          Array.isArray(searchResults.results)
        ) {
          results = searchResults.results;
        } else {
          logger.warn(`Search ${index + 1} returned non-array:`, typeof searchResults);
          results = [];
        }

        // ✅ Process each result individually and add to rawData array
        for (const result of results) {
          if (result && typeof result === 'object' && result.title && result.content) {
            // Create clean result object
            const cleanResult = {
              title: String(result.title),
              url: String(result.url || ''),
              content: String(result.content).substring(0, 1000), // Limit content
              score: Number(result.score || 0),
              searchTerm: String(term),
              retrievedAt: new Date().toISOString(),
              relevanceScore: this.calculateRelevanceScore(result, state.query),
              type: 'web_search',
            };

            // ✅ Push individual object to array (NOT stringify)
            rawData.push(cleanResult);
          }
        }

        successfulSearches++;
        logger.debug(`Search ${index + 1} completed: ${results.length} results added`);
      } catch (error) {
        failedSearches++;
        logger.warn(`Search ${index + 1} failed for term: ${term}`, { error: error.message });
        // Continue with next search instead of breaking
      }
    }

    // Sort by relevance
    rawData.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // ✅ FINAL VERIFICATION: Ensure rawData is still an array
    if (!Array.isArray(rawData)) {
      logger.error('CRITICAL ERROR: rawData is not an array!', {
        type: typeof rawData,
        value: rawData,
      });
      // Force it to be an array
      return {
        ...state,
        rawData: [], // ✅ Emergency fallback to empty array
        currentStep: 'search_complete',
        progress: { current: 2, total: 5, percentage: 40 },
        metadata: {
          ...state.metadata,
          searchTimestamp: new Date().toISOString(),
          totalSources: 0,
          searchTermsUsed: validTerms.length,
          failedSearches: validTerms.length,
          error: 'rawData structure failure',
        },
        messages: [...state.messages, new AIMessage('Search failed - data structure error')],
      };
    }

    logger.info(`Search completed successfully`, {
      totalResults: rawData.length,
      successfulSearches,
      failedSearches,
      isArray: Array.isArray(rawData),
      firstResultType: rawData[0] ? typeof rawData[0] : 'none',
    });

    // ✅ Return state with guaranteed array
    return {
      ...state,
      rawData, // This is guaranteed to be an actual array of objects
      currentStep: 'search_complete',
      progress: { current: 2, total: 5, percentage: 40 },
      metadata: {
        ...state.metadata,
        searchTimestamp: new Date().toISOString(),
        totalSources: rawData.length,
        searchTermsUsed: validTerms.length,
        successfulSearches,
        failedSearches,
      },
      messages: [
        ...state.messages,
        new AIMessage(
          `Search completed: ${rawData.length} results from ${successfulSearches} successful searches`
        ),
      ],
    };
  }

  /**
   * Calculate relevance score for search results
   */
  calculateRelevanceScore(result, originalQuery) {
    if (!result || !originalQuery) return 0;

    // Ensure we have strings to work with
    const queryWords = String(originalQuery || '')
      .toLowerCase()
      .split(' ');
    const title = String(result.title || '').toLowerCase();
    const content = String(result.content || '').toLowerCase();

    let score = 0;

    // Title matching (higher weight)
    queryWords.forEach((word) => {
      if (word.length > 2) {
        // Skip very short words
        if (title.includes(word)) score += 3;
        if (content.includes(word)) score += 1;
      }
    });

    // URL quality bonus
    if (result.url) {
      const url = String(result.url);
      if (url.includes('.edu') || url.includes('.gov')) score += 2;
      if (url.includes('report') || url.includes('research')) score += 1;
    }

    // Content length bonus (longer content generally better)
    if (content.length > 1000) score += 1;

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Agent 3: Analysis Agent - Processes and analyzes data
   */
  async analysisAgent(state) {
    logger.info('AnalysisAgent: Processing data', {
      sourcesCount: state.rawData?.length || 0,
    });

    const rawData = state.rawData || [];

    if (rawData.length === 0) {
      logger.warn('No data available for analysis');

      return {
        ...state,
        analysisResults: {
          keyTrends: [],
          marketSize: 'Unknown',
          growthRate: 'Unknown',
          keyPlayers: [],
          challenges: [],
          opportunities: [],
          sentiment: 'neutral',
          confidence: 'low',
          dataQuality: 'low',
        },
        processedData: {
          totalSources: 0,
          qualityMetrics: {
            averageRelevanceScore: 0,
            highQualitySources: 0,
            recentSources: 0,
          },
        },
        currentStep: 'analysis_complete',
        progress: { current: 3, total: 5, percentage: 60 },
        errors: [
          ...(state.errors || []),
          {
            agent: 'analyzer',
            error: 'No data available for analysis',
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    // Prepare data summary for analysis (limit to prevent token overflow)
    const dataSummary = rawData
      .slice(0, 10)
      .map(
        (item, index) => `Source ${index + 1}: ${item.title}\n${item.content?.substring(0, 300)}...`
      )
      .join('\n\n');

    const messages = [
      new HumanMessage(`You are a senior market analyst. Analyze the following data and provide insights.

      Query: "${state.query}"
      
      Data Sources (${rawData.length} sources):
      ${dataSummary}

      Provide analysis in JSON format only:
      {
        "keyTrends": ["trend1", "trend2"],
        "marketSize": "estimated market size if available",
        "growthRate": "growth rate if available", 
        "keyPlayers": ["company1", "company2"],
        "challenges": ["challenge1", "challenge2"],
        "opportunities": ["opportunity1", "opportunity2"],
        "sentiment": "positive|negative|neutral",
        "confidence": "high|medium|low",
        "dataQuality": "high|medium|low"
      }

      Return only JSON, no other text.`),
    ];

    const response = await this.llm.invoke(messages);
    let analysisResults;

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResults = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.warn('Failed to parse analysis JSON, using fallback');
    }

    // Fallback analysis
    if (!analysisResults) {
      analysisResults = {
        keyTrends: ['Market analysis in progress'],
        marketSize: 'Data being processed',
        growthRate: 'Under analysis',
        keyPlayers: ['Analysis pending'],
        challenges: ['Data collection challenges'],
        opportunities: ['Further research needed'],
        sentiment: 'neutral',
        confidence: 'medium',
        dataQuality: rawData.length > 5 ? 'medium' : 'low',
      };
    }

    // Calculate processed data metrics
    const processedData = {
      totalSources: rawData.length,
      qualityMetrics: {
        averageRelevanceScore:
          rawData.reduce((sum, item) => sum + (item.relevanceScore || 0), 0) / rawData.length,
        highQualitySources: rawData.filter((item) => (item.relevanceScore || 0) > 5).length,
        recentSources: rawData.filter((item) => {
          const retrievedAt = new Date(item.retrievedAt);
          const daysDiff = (Date.now() - retrievedAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff < 30;
        }).length,
      },
    };

    return {
      ...state,
      analysisResults,
      processedData,
      currentStep: 'analysis_complete',
      progress: { current: 3, total: 5, percentage: 60 },
      metadata: {
        ...state.metadata,
        analysisTimestamp: new Date().toISOString(),
      },
      messages: [...state.messages, new AIMessage('Data analysis completed')],
    };
  }

  /**
   * Agent 4: Synthesis Agent - Generates final report
   */
  async synthesisAgent(state) {
    logger.info('SynthesisAgent: Generating report');

    const { query, analysisResults, processedData } = state;

    const messages = [
      new HumanMessage(`You are a professional market intelligence report writer.
      
      Create a comprehensive report for this query: "${query}"
      
      Analysis Results: ${JSON.stringify(analysisResults, null, 2)}
      Data Quality: ${processedData?.totalSources || 0} sources analyzed

      Generate a professional HTML report with:
      1. Executive Summary
      2. Key Findings  
      3. Market Trends
      4. Competitive Landscape
      5. Challenges & Opportunities
      6. Recommendations
      7. Data Sources Summary

      Use proper HTML structure with inline CSS styling. Make it comprehensive and actionable.`),
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
      dataQuality: (processedData?.totalSources || 0) > 0,
      analysisDepth: (analysisResults?.keyTrends?.length || 0) > 0,
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
   * Check if reprocessing is needed
   */
  shouldReprocess(state) {
    const errors = state.errors || [];
    const dataQuality = state.processedData?.qualityMetrics?.averageRelevanceScore || 0;

    return errors.length > 3 || dataQuality < 2;
  }
}

module.exports = LangChainMultiAgent;
