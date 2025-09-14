const axios = require('axios');
const { OpenAI } = require('openai');
const { logger } = require('../utils/logger');
const { ApiError } = require('../utils/errors');

class SearchAgent {
  constructor(tavilyApiKey, openaiApiKey) {
    this.tavilyApiKey = tavilyApiKey;
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.baseUrl = 'https://api.tavily.com';
    this.requestTimeout = 30000; // 30 seconds
    this.retryAttempts = 3;
  }

  async planSearchStrategy(query) {
    try {
      logger.info('Planning search strategy', { query });

      const prompt = `
        You are a market intelligence search strategist. Analyze this query and create a comprehensive search strategy: "${query}"
        
        Generate a JSON response with:
        {
          "primaryTerms": ["3-5 key search phrases for main research"],
          "secondaryTerms": ["2-3 deeper analysis terms"],
          "domains": ["preferred domain types like news, reports, financial"],
          "timeRange": "relevance time frame",
          "searchDepth": "basic or advanced", 
          "expectedSources": 15,
          "industryKeywords": ["industry-specific terms"],
          "competitorKeywords": ["competitor analysis terms"]
        }
        
        Focus on business intelligence, market trends, and competitive analysis.
        Make terms specific and actionable for market research.
        Return only valid JSON without any explanation.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800
      });

      const strategyText = response.choices[0].message.content.trim();
      
      let strategy;
      try {
        // Clean potential markdown formatting
        const cleanJson = strategyText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        strategy = JSON.parse(cleanJson);
        
        // Validate strategy structure
        strategy = this.validateStrategy(strategy, query);
        
        logger.info('Search strategy created successfully', {
          primaryTerms: strategy.primaryTerms?.length,
          secondaryTerms: strategy.secondaryTerms?.length
        });
        
        return strategy;

      } catch (parseError) {
        logger.warn('Failed to parse OpenAI strategy response, using fallback', { error: parseError.message });
        return this.getFallbackStrategy(query);
      }

    } catch (error) {
      logger.error('Search strategy planning failed', { error: error.message });
      return this.getFallbackStrategy(query);
    }
  }

  validateStrategy(strategy, query) {
    // Ensure required fields exist with fallbacks
    return {
      primaryTerms: Array.isArray(strategy.primaryTerms) && strategy.primaryTerms.length > 0 
        ? strategy.primaryTerms 
        : [query, `${query} market analysis`],
      secondaryTerms: Array.isArray(strategy.secondaryTerms) && strategy.secondaryTerms.length > 0
        ? strategy.secondaryTerms
        : [`${query} competitors`, `${query} trends`],
      domains: Array.isArray(strategy.domains) ? strategy.domains : ['news', 'industry_reports'],
      timeRange: strategy.timeRange || '6 months',
      searchDepth: ['basic', 'advanced'].includes(strategy.searchDepth) ? strategy.searchDepth : 'advanced',
      expectedSources: Number.isInteger(strategy.expectedSources) && strategy.expectedSources > 0 
        ? Math.min(strategy.expectedSources, 25) 
        : 15,
      industryKeywords: Array.isArray(strategy.industryKeywords) ? strategy.industryKeywords : [],
      competitorKeywords: Array.isArray(strategy.competitorKeywords) ? strategy.competitorKeywords : []
    };
  }

  getFallbackStrategy(query) {
    return {
      primaryTerms: [query, `${query} market analysis`, `${query} industry trends`, `${query} market size`],
      secondaryTerms: [`${query} competitors`, `${query} market share`, `${query} forecast`],
      domains: ['news', 'industry_reports', 'financial', 'business'],
      timeRange: '6 months',
      searchDepth: 'advanced',
      expectedSources: 15,
      industryKeywords: [`${query} industry`, `${query} sector`],
      competitorKeywords: [`${query} competitive landscape`]
    };
  }

  async gatherData(searchStrategy) {
    const allResults = [];
    let totalApiCalls = 0;
    
    try {
      logger.info('Starting data gathering', { 
        primaryTerms: searchStrategy.primaryTerms?.length,
        secondaryTerms: searchStrategy.secondaryTerms?.length
      });

      // Execute primary searches with higher weight
      for (const term of searchStrategy.primaryTerms || []) {
        logger.debug(`Searching for primary term: ${term}`);
        
        const results = await this.searchTavily(term, {
          searchDepth: searchStrategy.searchDepth,
          maxResults: Math.ceil(searchStrategy.expectedSources / searchStrategy.primaryTerms.length),
          includeAnswer: true
        });

        totalApiCalls++;

        results.forEach(result => {
          allResults.push({
            ...result,
            searchTerm: term,
            searchType: 'primary',
            relevanceScore: result.score || 0,
            processedAt: new Date(),
            weight: 1.0 // Higher weight for primary results
          });
        });

        // Rate limiting between requests
        await this.delay(1000);
      }

      // Execute secondary searches for depth
      for (const term of searchStrategy.secondaryTerms || []) {
        logger.debug(`Searching for secondary term: ${term}`);
        
        const results = await this.searchTavily(term, {
          searchDepth: 'basic',
          maxResults: 3,
          includeAnswer: false
        });

        totalApiCalls++;

        results.forEach(result => {
          allResults.push({
            ...result,
            searchTerm: term,
            searchType: 'secondary',
            relevanceScore: result.score || 0,
            processedAt: new Date(),
            weight: 0.7 // Lower weight for secondary results
          });
        });

        await this.delay(800);
      }

      // Remove duplicates and sort by relevance
      const uniqueResults = this.removeDuplicates(allResults);
      const sortedResults = this.sortByRelevance(uniqueResults);
      
      logger.info('Data gathering completed', {
        totalResults: sortedResults.length,
        apiCalls: totalApiCalls,
        uniqueSources: new Set(sortedResults.map(r => r.url)).size
      });

      return sortedResults;

    } catch (error) {
      logger.error('Data gathering failed', { error: error.message });
      throw new ApiError('Failed to gather market data: ' + error.message, 500);
    }
  }

  async searchTavily(query, options = {}) {
    const maxRetries = this.retryAttempts;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Tavily search attempt ${attempt}/${maxRetries}`, { query });

        const response = await axios.post(`${this.baseUrl}/search`, {
          api_key: this.tavilyApiKey,
          query,
          search_depth: options.searchDepth || 'advanced',
          max_results: options.maxResults || 10,
          include_answer: options.includeAnswer !== false,
          include_raw_content: false,
          include_domains: options.domains || [],
          exclude_domains: ['social', 'forum'] // Exclude low-quality sources
        }, {
          timeout: this.requestTimeout,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const results = response.data.results || [];
        
        // Filter and clean results
        return results
          .filter(result => this.isValidResult(result))
          .map(result => this.cleanResult(result));

      } catch (error) {
        lastError = error;
        
        if (error.response?.status === 429) {
          // Rate limited - wait longer before retry
          const waitTime = Math.pow(2, attempt) * 2000; // Exponential backoff
          logger.warn(`Tavily rate limited, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
          await this.delay(waitTime);
          continue;
        }
        
        if (error.response?.status >= 500 || error.code === 'ECONNRESET') {
          // Server error - retry with backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          logger.warn(`Tavily server error, retrying in ${waitTime}ms (${attempt}/${maxRetries})`);
          await this.delay(waitTime);
          continue;
        }
        
        // Non-retryable error
        break;
      }
    }

    // All retries failed
    logger.error(`Tavily search failed after ${maxRetries} attempts`, { 
      query, 
      error: lastError?.message 
    });
    
    if (lastError?.response?.status === 429) {
      throw new ApiError('Search rate limit exceeded', 429);
    }
    
    throw new ApiError('Search service temporarily unavailable', 503);
  }

  isValidResult(result) {
    return (
      result.url &&
      result.title &&
      result.content &&
      result.content.length > 50 &&
      !this.isLowQualitySource(result.url)
    );
  }

  isLowQualitySource(url) {
    const lowQualityDomains = [
      'reddit.com',
      'quora.com', 
      'yahoo.com/answers',
      'wiki.answers.com',
      'pinterest.com'
    ];
    
    return lowQualityDomains.some(domain => url.includes(domain));
  }

  cleanResult(result) {
    return {
      title: result.title?.substring(0, 200) || '',
      url: result.url,
      content: result.content?.substring(0, 1000) || '',
      score: Math.min(Math.max(result.score || 0, 0), 1), // Normalize score 0-1
      published_date: result.published_date,
      domain: this.extractDomain(result.url)
    };
  }

  removeDuplicates(results) {
    const seen = new Map();
    const unique = [];
    
    for (const result of results) {
      if (!result.url) continue;
      
      // Check for exact URL duplicates
      if (seen.has(result.url)) {
        // Keep the one with higher relevance score
        const existing = seen.get(result.url);
        if (result.relevanceScore > existing.relevanceScore) {
          // Replace existing with better result
          const index = unique.findIndex(r => r.url === result.url);
          if (index !== -1) {
            unique[index] = result;
            seen.set(result.url, result);
          }
        }
        continue;
      }
      
      // Check for content similarity (basic deduplication)
      const isDuplicate = unique.some(existing => 
        this.calculateSimilarity(result.title, existing.title) > 0.8 ||
        this.calculateSimilarity(result.content, existing.content) > 0.9
      );
      
      if (!isDuplicate) {
        unique.push(result);
        seen.set(result.url, result);
      }
    }
    
    return unique;
  }

  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    // Simple character-based similarity
    let matches = 0;
    const minLen = Math.min(len1, len2);
    
    for (let i = 0; i < minLen; i++) {
      if (str1[i] === str2[i]) matches++;
    }
    
    return matches / maxLen;
  }

  sortByRelevance(results) {
    return results.sort((a, b) => {
      // Primary sort by relevance score and weight
      const scoreA = (a.relevanceScore || 0) * (a.weight || 1);
      const scoreB = (b.relevanceScore || 0) * (b.weight || 1);
      
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      
      // Secondary sort by search type (primary first)
      if (a.searchType !== b.searchType) {
        return a.searchType === 'primary' ? -1 : 1;
      }
      
      // Tertiary sort by publication date (newer first)
      const dateA = new Date(a.published_date || 0);
      const dateB = new Date(b.published_date || 0);
      return dateB - dateA;
    });
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check method
  async healthCheck() {
    try {
      const testResponse = await axios.post(`${this.baseUrl}/search`, {
        api_key: this.tavilyApiKey,
        query: 'test',
        max_results: 1
      }, { timeout: 5000 });
      
      return {
        status: 'healthy',
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = SearchAgent;
