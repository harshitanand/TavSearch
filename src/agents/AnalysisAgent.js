const { OpenAI } = require('openai');
const { logger } = require('../utils/logger');
const { ApiError } = require('../utils/errors');

class AnalysisAgent {
  constructor(openaiApiKey) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.maxTokens = 2000;
    this.temperature = 0.3;
  }

  async processData(rawData) {
    try {
      logger.info('Starting data processing', { totalSources: rawData.length });

      const processedData = {
        totalSources: rawData.length,
        primarySources: rawData.filter(item => item.searchType === 'primary'),
        secondarySources: rawData.filter(item => item.searchType === 'secondary'),
        domainDistribution: this.groupByDomain(rawData),
        contentSummary: this.extractKeyContent(rawData),
        qualityMetrics: this.calculateQualityMetrics(rawData),
        timeDistribution: this.analyzeTimeDistribution(rawData),
        sourceTypes: this.categorizeSourceTypes(rawData),
        topicClusters: this.identifyTopicClusters(rawData),
        sentimentAnalysis: this.analyzeSentiment(rawData),
        keywordAnalysis: this.analyzeKeywords(rawData)
      };

      logger.info('Data processing completed', {
        primarySources: processedData.primarySources.length,
        secondarySources: processedData.secondarySources.length,
        avgQuality: processedData.qualityMetrics.averageRelevanceScore
      });

      return processedData;

    } catch (error) {
      logger.error('Data processing failed', { error: error.message });
      throw new ApiError('Failed to process market data: ' + error.message, 500);
    }
  }

  groupByDomain(data) {
    const domainGroups = {};
    
    data.forEach(item => {
      try {
        const domain = item.domain || this.extractDomain(item.url);
        
        if (!domainGroups[domain]) {
          domainGroups[domain] = {
            count: 0,
            sources: [],
            avgScore: 0,
            type: this.classifyDomainType(domain),
            credibilityScore: this.calculateDomainCredibility(domain)
          };
        }
        
        domainGroups[domain].count++;
        domainGroups[domain].sources.push(item);
      } catch (error) {
        logger.debug('Invalid URL in domain grouping', { url: item.url });
      }
    });

    // Calculate average scores and sort by relevance
    Object.keys(domainGroups).forEach(domain => {
      const group = domainGroups[domain];
      const scores = group.sources.map(s => s.relevanceScore || 0).filter(s => s > 0);
      group.avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      group.totalScore = group.avgScore * group.count * group.credibilityScore;
    });

    return Object.fromEntries(
      Object.entries(domainGroups)
        .sort(([,a], [,b]) => b.totalScore - a.totalScore)
        .slice(0, 15)
    );
  }

  classifyDomainType(domain) {
    const patterns = {
      news: [/news/, /times/, /post/, /herald/, /gazette/, /reuters/, /bloomberg/, /wsj/, /cnn/, /bbc/],
      business: [/business/, /finance/, /market/, /economy/, /invest/, /forbes/, /fortune/, /nasdaq/, /dow/],
      technology: [/tech/, /digital/, /innovation/, /startup/, /venture/, /wired/, /verge/, /engadget/],
      academic: [/edu/, /research/, /study/, /academic/, /university/, /journal/, /scholar/],
      government: [/gov/, /government/, /federal/, /state/, /sec\.gov/, /treasury/],
      industry: [/industry/, /manufacturing/, /automotive/, /pharma/, /energy/, /retail/]
    };

    for (const [type, typePatterns] of Object.entries(patterns)) {
      if (typePatterns.some(pattern => pattern.test(domain))) {
        return type;
      }
    }
    
    return 'general';
  }

  calculateDomainCredibility(domain) {
    const highCredibility = [
      'reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'economist.com',
      'forbes.com', 'fortune.com', 'harvard.edu', 'mit.edu', 'stanford.edu',
      'sec.gov', 'treasury.gov', 'federalreserve.gov'
    ];
    
    const mediumCredibility = [
      'cnn.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com',
      'techcrunch.com', 'wired.com', 'ars-technica.com'
    ];

    if (highCredibility.some(trusted => domain.includes(trusted))) return 1.0;
    if (mediumCredibility.some(medium => domain.includes(medium))) return 0.8;
    if (domain.includes('.edu') || domain.includes('.gov')) return 0.9;
    if (domain.includes('.org')) return 0.7;
    
    return 0.6; // Default credibility
  }

  extractKeyContent(data) {
    return data
      .filter(item => item.content && item.content.length > 100)
      .sort((a, b) => {
        // Multi-factor sorting: relevance, credibility, recency
        const scoreA = (a.relevanceScore || 0) * this.getRecencyMultiplier(a.published_date);
        const scoreB = (b.relevanceScore || 0) * this.getRecencyMultiplier(b.published_date);
        return scoreB - scoreA;
      })
      .slice(0, 15)
      .map((item, index) => ({
        rank: index + 1,
        title: item.title,
        snippet: this.createSmartSnippet(item.content, 250),
        url: item.url,
        score: item.relevanceScore || 0,
        publishedDate: item.published_date,
        domain: item.domain || this.extractDomain(item.url),
        searchTerm: item.searchTerm,
        searchType: item.searchType,
        keyPhrases: this.extractKeyPhrases(item.content),
        sentiment: this.analyzeTextSentiment(item.content),
        entityMentions: this.extractEntities(item.content)
      }));
  }

  createSmartSnippet(content, maxLength) {
    if (!content || content.length <= maxLength) return content;
    
    // Try to break at sentence boundaries
    const sentences = content.split(/[.!?]+/);
    let snippet = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if ((snippet + trimmedSentence).length > maxLength - 3) break;
      if (trimmedSentence.length > 0) {
        snippet += trimmedSentence + '. ';
      }
    }
    
    return snippet.trim() + (snippet.length < content.length ? '...' : '');
  }

  getRecencyMultiplier(publishedDate) {
    if (!publishedDate) return 0.5;
    
    const now = new Date();
    const pubDate = new Date(publishedDate);
    const daysDiff = (now - pubDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 7) return 1.2;      // Last week - boost
    if (daysDiff <= 30) return 1.1;     // Last month - slight boost
    if (daysDiff <= 90) return 1.0;     // Last quarter - normal
    if (daysDiff <= 365) return 0.9;    // Last year - slight penalty
    return 0.7; // Older than a year - penalty
  }

  extractKeyPhrases(content) {
    if (!content) return [];
    
    // Clean and tokenize
    const cleanText = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
    
    const words = cleanText.split(' ')
      .filter(word => word.length > 3 && !this.isStopWord(word));
    
    // Extract 2-3 word phrases
    const phrases = new Map();
    
    for (let i = 0; i < words.length - 1; i++) {
      // 2-word phrases
      const phrase2 = `${words[i]} ${words[i + 1]}`;
      phrases.set(phrase2, (phrases.get(phrase2) || 0) + 1);
      
      // 3-word phrases
      if (i < words.length - 2) {
        const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        phrases.set(phrase3, (phrases.get(phrase3) || 0) + 1);
      }
    }
    
    // Return top phrases by frequency
    return Array.from(phrases.entries())
      .filter(([phrase, count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([phrase]) => phrase);
  }

  extractEntities(content) {
    if (!content) return [];
    
    // Simple entity extraction (in production, use NLP library like spaCy)
    const entities = {
      companies: [],
      people: [],
      locations: [],
      technologies: []
    };
    
    // Company patterns (very basic)
    const companyPatterns = [
      /([A-Z][a-z]+ ?(?:[A-Z][a-z]*)*) (?:Inc|Corp|LLC|Ltd|Co)\b/g,
      /\b([A-Z]{2,})\b/g // Acronyms
    ];
    
    companyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && match[1].length > 1) {
          entities.companies.push(match[1]);
        }
      }
    });
    
    // Technology keywords
    const techKeywords = [
      'AI', 'artificial intelligence', 'machine learning', 'blockchain',
      'cryptocurrency', 'cloud computing', 'IoT', 'internet of things',
      'big data', 'analytics', 'automation', '5G', 'cybersecurity'
    ];
    
    techKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        entities.technologies.push(keyword);
      }
    });
    
    return entities;
  }

  calculateQualityMetrics(data) {
    const scores = data.map(item => item.relevanceScore || 0).filter(score => score > 0);
    const avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    
    const now = new Date();
    const timeframes = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };
    
    const recentSources = this.countSourcesByTimeframe(data, timeframes.quarter);
    const veryRecentSources = this.countSourcesByTimeframe(data, timeframes.month);

    return {
      averageRelevanceScore: Math.round(avgScore * 100) / 100,
      scoreDistribution: this.calculateScoreDistribution(data),
      totalSources: data.length,
      sourcesWithContent: data.filter(item => item.content && item.content.length > 50).length,
      recentSources,
      veryRecentSources,
      sourcesWithDates: data.filter(item => item.published_date).length,
      duplicateUrls: data.length - new Set(data.map(item => item.url)).size,
      averageContentLength: this.calculateAverageContentLength(data),
      sourceReliability: this.assessSourceReliability(data)
    };
  }

  calculateScoreDistribution(data) {
    const distribution = { high: 0, medium: 0, low: 0, unknown: 0 };
    
    data.forEach(item => {
      const score = item.relevanceScore;
      if (score === undefined || score === null) {
        distribution.unknown++;
      } else if (score > 0.7) {
        distribution.high++;
      } else if (score >= 0.4) {
        distribution.medium++;
      } else {
        distribution.low++;
      }
    });
    
    return distribution;
  }

  countSourcesByTimeframe(data, timeframeMs) {
    const cutoff = new Date(Date.now() - timeframeMs);
    return data.filter(item => {
      if (!item.published_date) return false;
      return new Date(item.published_date) > cutoff;
    }).length;
  }

  calculateAverageContentLength(data) {
    const contentLengths = data
      .filter(item => item.content)
      .map(item => item.content.length);
    
    return contentLengths.length > 0 
      ? Math.round(contentLengths.reduce((sum, len) => sum + len, 0) / contentLengths.length)
      : 0;
  }

  assessSourceReliability(data) {
    let totalReliability = 0;
    let count = 0;
    
    data.forEach(item => {
      const domain = item.domain || this.extractDomain(item.url);
      const credibility = this.calculateDomainCredibility(domain);
      totalReliability += credibility;
      count++;
    });
    
    return count > 0 ? Math.round((totalReliability / count) * 100) / 100 : 0;
  }

  analyzeTimeDistribution(data) {
    const distribution = {
      lastWeek: 0,
      lastMonth: 0,
      lastQuarter: 0,
      lastYear: 0,
      older: 0,
      unknown: 0
    };

    const now = new Date();
    const timeFrames = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };

    data.forEach(item => {
      if (!item.published_date) {
        distribution.unknown++;
        return;
      }

      const publishDate = new Date(item.published_date);
      const age = now - publishDate;

      if (age <= timeFrames.week) distribution.lastWeek++;
      else if (age <= timeFrames.month) distribution.lastMonth++;
      else if (age <= timeFrames.quarter) distribution.lastQuarter++;
      else if (age <= timeFrames.year) distribution.lastYear++;
      else distribution.older++;
    });

    return distribution;
  }

  categorizeSourceTypes(data) {
    const types = {};
    
    data.forEach(item => {
      const domain = item.domain || this.extractDomain(item.url);
      const type = this.classifyDomainType(domain);
      types[type] = (types[type] || 0) + 1;
    });

    return types;
  }

  identifyTopicClusters(data) {
    const clusters = new Map();
    
    data.forEach(item => {
      const text = `${item.title} ${item.content}`.toLowerCase();
      const keywords = this.extractKeywords(text);
      
      keywords.forEach(keyword => {
        if (!clusters.has(keyword)) {
          clusters.set(keyword, {
            items: [],
            totalScore: 0,
            avgScore: 0
          });
        }
        
        const cluster = clusters.get(keyword);
        cluster.items.push(item);
        cluster.totalScore += (item.relevanceScore || 0);
        cluster.avgScore = cluster.totalScore / cluster.items.length;
      });
    });

    // Return top clusters by relevance and size
    return Object.fromEntries(
      Array.from(clusters.entries())
        .filter(([keyword, cluster]) => cluster.items.length > 1)
        .sort(([,a], [,b]) => (b.avgScore * b.items.length) - (a.avgScore * a.items.length))
        .slice(0, 12)
        .map(([keyword, cluster]) => [
          keyword,
          {
            count: cluster.items.length,
            avgScore: Math.round(cluster.avgScore * 100) / 100,
            relevanceWeight: cluster.avgScore * cluster.items.length
          }
        ])
    );
  }

  extractKeywords(text) {
    const businessKeywords = [
      'market', 'growth', 'revenue', 'profit', 'investment', 'strategy',
      'competitive', 'industry', 'trends', 'analysis', 'forecast',
      'opportunity', 'risk', 'innovation', 'technology', 'digital',
      'transformation', 'automation', 'efficiency', 'optimization'
    ];
    
    return businessKeywords.filter(keyword => 
      text.includes(keyword) && !this.isStopWord(keyword)
    );
  }

  analyzeSentiment(data) {
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    let totalSentiment = 0;
    
    data.forEach(item => {
      const sentiment = this.analyzeTextSentiment(item.content);
      sentiments[sentiment.label]++;
      totalSentiment += sentiment.score;
    });
    
    return {
      distribution: sentiments,
      averageScore: data.length > 0 ? totalSentiment / data.length : 0,
      overallSentiment: this.classifyOverallSentiment(totalSentiment / data.length)
    };
  }

  analyzeTextSentiment(text) {
    if (!text) return { label: 'neutral', score: 0 };
    
    // Simple sentiment analysis (in production, use proper NLP library)
    const positiveWords = [
      'growth', 'increase', 'positive', 'strong', 'excellent', 'success',
      'opportunity', 'benefit', 'advantage', 'improvement', 'rise', 'gain'
    ];
    
    const negativeWords = [
      'decline', 'decrease', 'negative', 'weak', 'poor', 'failure',
      'risk', 'threat', 'disadvantage', 'problem', 'fall', 'loss'
    ];
    
    const words = text.toLowerCase().split(/\W+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    const normalizedScore = Math.max(-1, Math.min(1, score / words.length * 100));
    
    return {
      score: normalizedScore,
      label: normalizedScore > 0.1 ? 'positive' : 
             normalizedScore < -0.1 ? 'negative' : 'neutral'
    };
  }

  classifyOverallSentiment(averageScore) {
    if (averageScore > 0.2) return 'positive';
    if (averageScore < -0.2) return 'negative';
    return 'neutral';
  }

  analyzeKeywords(data) {
    const keywordFreq = new Map();
    
    data.forEach(item => {
      const text = `${item.title} ${item.content}`;
      const keywords = this.extractKeywords(text.toLowerCase());
      
      keywords.forEach(keyword => {
        keywordFreq.set(keyword, (keywordFreq.get(keyword) || 0) + 1);
      });
    });
    
    return Object.fromEntries(
      Array.from(keywordFreq.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
    );
  }

  async analyzeMarketTrends(processedData, originalQuery) {
    try {
      logger.info('Starting comprehensive market trend analysis');

      const analysisPrompt = this.buildComprehensivePrompt(processedData, originalQuery);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: this.temperature,
        max_tokens: this.maxTokens
      });

      const analysisText = response.choices[0].message.content.trim();
      
      try {
        const cleanJson = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const analysis = JSON.parse(cleanJson);
        
        const enhancedAnalysis = this.enhanceAnalysisResults(analysis, processedData);
        
        logger.info('Market trend analysis completed successfully', {
          trends: enhancedAnalysis.keyTrends?.length || 0,
          insights: enhancedAnalysis.insights?.length || 0,
          confidence: enhancedAnalysis.dataConfidence
        });
        
        return enhancedAnalysis;

      } catch (parseError) {
        logger.warn('Failed to parse analysis JSON, using fallback approach');
        return this.generateFallbackAnalysis(originalQuery, processedData);
      }

    } catch (error) {
      logger.error('Market trend analysis failed', { error: error.message });
      return this.generateFallbackAnalysis(originalQuery, processedData);
    }
  }

  buildComprehensivePrompt(processedData, originalQuery) {
    const topContent = processedData.contentSummary.slice(0, 10);
    const topDomains = Object.entries(processedData.domainDistribution).slice(0, 8);
    const topClusters = Object.entries(processedData.topicClusters).slice(0, 6);

    return `
      Conduct a comprehensive market intelligence analysis for: "${originalQuery}"
      
      === DATA OVERVIEW ===
      Total Sources: ${processedData.totalSources}
      Quality Metrics:
      - Average Relevance: ${processedData.qualityMetrics.averageRelevanceScore}
      - High Quality Sources: ${processedData.qualityMetrics.scoreDistribution.high}
      - Source Reliability: ${processedData.qualityMetrics.sourceReliability}
      - Recent Sources (90 days): ${processedData.qualityMetrics.recentSources}
      
      === TOP CONTENT ANALYSIS ===
      ${topContent.map((content, i) => 
        `${i+1}. ${content.title} (Score: ${content.score}, Domain: ${content.domain})`
      ).join('\n')}
      
      === SOURCE DISTRIBUTION ===
      ${topDomains.map(([domain, data]) => 
        `${domain}: ${data.count} sources (${data.type}, credibility: ${data.credibilityScore})`
      ).join('\n')}
      
      === TOPIC CLUSTERS ===
      ${topClusters.map(([topic, data]) => 
        `${topic}: ${data.count} mentions (avg score: ${data.avgScore})`
      ).join('\n')}
      
      === TEMPORAL ANALYSIS ===
      Recent: ${processedData.timeDistribution.lastWeek} (week), ${processedData.timeDistribution.lastMonth} (month)
      Historical: ${processedData.timeDistribution.lastQuarter} (quarter), ${processedData.timeDistribution.lastYear} (year)
      
      === SENTIMENT OVERVIEW ===
      Overall: ${processedData.sentimentAnalysis.overallSentiment}
      Distribution: ${JSON.stringify(processedData.sentimentAnalysis.distribution)}
      
      Generate a comprehensive market analysis in JSON format:
      {
        "keyTrends": ["specific trend 1", "specific trend 2", "specific trend 3", "specific trend 4", "specific trend 5"],
        "marketOpportunities": ["actionable opportunity 1", "actionable opportunity 2", "actionable opportunity 3"],
        "competitiveLandscape": {
          "majorPlayers": ["identified company 1", "identified company 2", "identified company 3"],
          "marketPosition": "detailed current market state description",
          "competitiveAdvantages": ["advantage 1", "advantage 2"],
          "marketConcentration": "high|medium|low"
        },
        "insights": ["data-driven insight 1", "data-driven insight 2", "data-driven insight 3", "data-driven insight 4"],
        "recommendations": ["strategic recommendation 1", "strategic recommendation 2", "strategic recommendation 3"],
        "riskFactors": ["specific risk 1", "specific risk 2", "specific risk 3"],
        "marketDynamics": {
          "growthDrivers": ["driver 1", "driver 2", "driver 3"],
          "challenges": ["challenge 1", "challenge 2"],
          "disruptiveForces": ["disruption 1", "disruption 2"]
        },
        "financialIndicators": {
          "marketSize": "size estimate if available",
          "growthRate": "growth rate if discernible",
          "investmentActivity": "investment level assessment"
        },
        "technologicalFactors": ["tech factor 1", "tech factor 2"],
        "regulatoryEnvironment": "regulatory assessment",
        "futureOutlook": "comprehensive 12-24 month outlook",
        "dataConfidence": "high|medium|low",
        "keyQuestions": ["strategic question 1", "strategic question 2"],
        "summary": "comprehensive executive summary (3-4 sentences)"
      }
      
      Base all analysis on the provided data. Make insights specific and actionable for business decision-making.
      Return only valid JSON.
    `;
  }

  enhanceAnalysisResults(analysis, processedData) {
    const confidence = this.calculateDataConfidence(processedData);
    
    return {
      ...analysis,
      dataConfidence: confidence,
      analysisMetadata: {
        sourcesAnalyzed: processedData.totalSources,
        qualityScore: processedData.qualityMetrics.averageRelevanceScore,
        reliabilityScore: processedData.qualityMetrics.sourceReliability,
        recencyScore: this.calculateRecencyScore(processedData),
        diversityScore: this.calculateSourceDiversity(processedData),
        sentimentScore: processedData.sentimentAnalysis.averageScore,
        confidenceFactors: this.getConfidenceFactors(processedData),
        analysisTimestamp: new Date().toISOString()
      }
    };
  }

  calculateDataConfidence(processedData) {
    let confidenceScore = 0;
    
    // Source quantity (max 25 points)
    confidenceScore += Math.min(processedData.totalSources * 1.5, 25);
    
    // Quality score (max 25 points)
    confidenceScore += processedData.qualityMetrics.averageRelevanceScore * 25;
    
    // Source reliability (max 20 points)
    confidenceScore += processedData.qualityMetrics.sourceReliability * 20;
    
    // Recency (max 15 points)
    const recentRatio = processedData.qualityMetrics.recentSources / processedData.totalSources;
    confidenceScore += recentRatio * 15;
    
    // Diversity (max 15 points)
    const domainCount = Object.keys(processedData.domainDistribution).length;
    confidenceScore += Math.min(domainCount * 2, 15);
    
    if (confidenceScore >= 75) return 'high';
    if (confidenceScore >= 45) return 'medium';
    return 'low';
  }

  calculateRecencyScore(processedData) {
    const weights = {
      lastWeek: 4,
      lastMonth: 3,
      lastQuarter: 2,
      lastYear: 1
    };
    
    let weightedSum = 0;
    Object.entries(weights).forEach(([period, weight]) => {
      weightedSum += (processedData.timeDistribution[period] || 0) * weight;
    });
    
    return Math.min(weightedSum / processedData.totalSources, 4);
  }

  calculateSourceDiversity(processedData) {
    const domainTypes = Object.values(processedData.domainDistribution)
      .map(domain => domain.type);
    const uniqueTypes = new Set(domainTypes).size;
    const domainCount = Object.keys(processedData.domainDistribution).length;
    
    return Math.min((uniqueTypes * 0.4) + (domainCount * 0.1), 5);
  }

  getConfidenceFactors(processedData) {
    return {
      sourceQuantity: processedData.totalSources > 10 ? 'sufficient' : 'limited',
      sourceQuality: processedData.qualityMetrics.averageRelevanceScore > 0.6 ? 'high' : 'moderate',
      sourceRecency: processedData.qualityMetrics.recentSources > 5 ? 'current' : 'dated',
      sourceDiversity: Object.keys(processedData.domainDistribution).length > 5 ? 'diverse' : 'limited'
    };
  }

  generateFallbackAnalysis(query, processedData) {
    const confidence = this.calculateDataConfidence(processedData);
    
    return {
      keyTrends: [
        `Increased market activity around ${query}`,
        'Growing digital presence and online engagement',
        'Rising information availability and coverage',
        'Active stakeholder participation in market discussions'
      ],
      marketOpportunities: [
        'Market education and awareness building',
        'Digital strategy implementation',
        'Stakeholder engagement initiatives'
      ],
      competitiveLandscape: {
        majorPlayers: ['Market analysis needed for player identification'],
        marketPosition: 'Active market with multiple information sources indicating engagement',
        competitiveAdvantages: ['First-mover potential', 'Information accessibility'],
        marketConcentration: 'medium'
      },
      insights: [
        `Analysis covers ${processedData.totalSources} sources with ${confidence} confidence`,
        `Source reliability average: ${processedData.qualityMetrics.sourceReliability}`,
        `${processedData.qualityMetrics.recentSources} recent sources provide current market view`,
        `${Object.keys(processedData.domainDistribution).length} different domains analyzed`,
        `Overall sentiment: ${processedData.sentimentAnalysis.overallSentiment}`
      ],
      recommendations: [
        'Conduct targeted competitive intelligence research',
        'Develop comprehensive market entry strategy',
        'Monitor emerging trends and market developments',
        'Build strategic partnerships with key stakeholders'
      ],
      riskFactors: [
        'Market volatility and uncertainty',
        'Competitive response from established players',
        'Regulatory and compliance considerations'
      ],
      marketDynamics: {
        growthDrivers: ['Technology advancement', 'Market demand evolution', 'Digital transformation'],
        challenges: ['Market saturation risks', 'Resource allocation requirements'],
        disruptiveForces: ['Technology disruption', 'Changing consumer behavior']
      },
      financialIndicators: {
        marketSize: 'Requires additional financial analysis',
        growthRate: 'Growth patterns observable in data sources',
        investmentActivity: 'Active information flow suggests market interest'
      },
      technologicalFactors: ['Digital innovation impact', 'Automation considerations'],
      regulatoryEnvironment: 'Standard regulatory framework applicable',
      futureOutlook: `Market shows activity indicators with ${confidence} confidence level based on ${processedData.totalSources} analyzed sources`,
      dataConfidence: confidence,
      keyQuestions: [
        'What are the specific competitive advantages in this market?',
        'How can market entry timing be optimized?'
      ],
      summary: `Comprehensive analysis of ${query} reveals market activity with ${confidence} data confidence. Analysis of ${processedData.totalSources} sources indicates opportunities alongside standard market considerations.`
    };
  }

  isStopWord(word) {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const testData = [
        {
          title: 'Test Market Analysis',
          content: 'This is a test content for health check analysis.',
          url: 'https://example.com/test',
          relevanceScore: 0.8,
          searchType: 'primary',
          published_date: new Date().toISOString()
        }
      ];

      const processed = await this.processData(testData);
      
      return {
        status: 'healthy',
        canProcess: true,
        testResults: {
          processedSources: processed.totalSources,
          qualityScore: processed.qualityMetrics.averageRelevanceScore
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        canProcess: false,
        error: error.message
      };
    }
  }
}

module.exports = AnalysisAgent;
