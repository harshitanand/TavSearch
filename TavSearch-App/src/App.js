import React, { useState, useEffect } from 'react';
import {
  Search,
  History,
  FileText,
  Download,
  Settings,
  Zap,
  Globe,
  Brain,
  Database,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
} from 'lucide-react';

const TavSearchApp = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [query, setQuery] = useState('');
  const [queryType, setQueryType] = useState('research');
  const [searchDepth, setSearchDepth] = useState('standard');
  const [maxResults, setMaxResults] = useState(10);
  const [includeImages, setIncludeImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedAgents, setExpandedAgents] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [apiUrl, setApiUrl] = useState(process.env.REACT_APP_API_URL || 'http://localhost:5000');

  // Mock results as fallback
  const mockResults = {
    summary:
      'Based on the latest research, renewable energy technology has seen remarkable advances in 2024, particularly in solar efficiency, wind turbine design, and energy storage solutions. Key developments include perovskite-silicon tandem solar cells achieving 33% efficiency, offshore wind farms scaling to 15MW+ turbines, and solid-state batteries showing promising commercial viability.',
    key_insights: [
      'Solar panel efficiency has increased by 15% with new perovskite technology',
      'Wind energy costs have dropped 23% due to larger, more efficient turbines',
      'Battery storage capacity has improved 40% with solid-state innovations',
      'Green hydrogen production costs are approaching grid parity',
    ],
    agents: {
      'Web Search Agent': {
        status: 'completed',
        summary:
          'Gathered 47 relevant sources from academic papers, news articles, and industry reports',
        sources: [
          {
            title: 'Nature Energy: Perovskite Solar Breakthrough',
            url: 'https://nature.com/articles/energy-2024',
            score: 0.95,
          },
          {
            title: 'Wind Power Monthly: Offshore Developments',
            url: 'https://windpower.com/offshore-2024',
            score: 0.92,
          },
          {
            title: 'MIT Technology Review: Battery Innovations',
            url: 'https://technologyreview.com/batteries',
            score: 0.89,
          },
        ],
        execution_time: 4.2,
      },
      'Analysis Agent': {
        status: 'completed',
        summary:
          'Performed comparative analysis of efficiency gains and cost reductions across renewable sectors',
        data: 'Cost reduction trends: Solar (-12%), Wind (-23%), Storage (-18%)',
        execution_time: 3.1,
      },
      'Synthesis Agent': {
        status: 'completed',
        summary: 'Integrated findings into coherent analysis with key recommendations',
        execution_time: 2.3,
      },
    },
    execution_time: 12.5,
  };

  // Mock history as fallback
  const mockHistory = [
    {
      id: 1,
      query: 'Latest developments in renewable energy technology',
      timestamp: '2024-01-15T10:30:00Z',
      status: 'completed',
      execution_time: 12.5,
    },
    {
      id: 2,
      query: 'Impact of AI on healthcare industry',
      timestamp: '2024-01-14T15:45:00Z',
      status: 'completed',
      execution_time: 8.3,
    },
  ];

  const queryTypes = [
    { value: 'research', label: 'Research & Analysis', icon: '🔬' },
    { value: 'news', label: 'Current News', icon: '📰' },
    { value: 'academic', label: 'Academic/Scientific', icon: '🎓' },
    { value: 'market', label: 'Market Intelligence', icon: '📊' },
    { value: 'technical', label: 'Technical Documentation', icon: '⚙️' },
    { value: 'comparison', label: 'Product/Service Comparison', icon: '⚖️' },
    { value: 'trend', label: 'Trend Analysis', icon: '📈' },
  ];

  // Load history from API on component mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      } else {
        console.warn('Failed to fetch history, using mock data');
        setHistory(mockHistory);
      }
    } catch (error) {
      console.warn('Error fetching history, using mock data:', error);
      setHistory(mockHistory);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResults(null);
    setError(null);

    const queryData = {
      query: query.trim(),
      query_type: queryType,
      search_depth: searchDepth,
      max_results: maxResults,
      include_images: includeImages,
    };

    try {
      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryData),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);

      // Refresh history after successful analysis
      await fetchHistory();
    } catch (err) {
      console.error('API call failed, using mock results:', err);

      // Set user-friendly error message
      if (err.message.includes('Failed to fetch')) {
        setError('Unable to connect to TavSearch API. Using mock data for demonstration.');
      } else if (err.message.includes('500')) {
        setError('Server error occurred. Using mock data for demonstration.');
      } else if (err.message.includes('400')) {
        setError('Invalid request. Using mock data for demonstration.');
      } else {
        setError('API unavailable. Using mock data for demonstration.');
      }

      // Use mock results as fallback
      setTimeout(() => {
        setResults(mockResults);

        // Add to mock history
        const newHistoryItem = {
          id: Date.now(),
          query: query,
          timestamp: new Date().toISOString(),
          status: 'completed',
          execution_time: mockResults.execution_time,
        };
        setHistory((prev) => [newHistoryItem, ...prev]);

        setLoading(false);
      }, 2000); // Simulate processing time
      return;
    }

    setLoading(false);
  };

  const handleHistorySelect = async (historyItem) => {
    try {
      // Try to fetch full results for this history item from API
      const response = await fetch(`${apiUrl}/api/history/${historyItem.id}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || data);
        setActiveTab('search');
        return;
      }
    } catch (error) {
      console.warn('API call failed for history item, using mock data:', error);
    }

    // Fallback to mock results
    setResults(mockResults);
    setActiveTab('search');
    setError('API unavailable. Showing mock results for demonstration.');
  };

  const deleteHistoryItem = async (id) => {
    try {
      const response = await fetch(`${apiUrl}/api/history/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setHistory(history.filter((item) => item.id !== id));
        return;
      }
    } catch (error) {
      console.warn('API call failed for delete, removing from local state:', error);
    }

    // Fallback: remove from local state only
    setHistory(history.filter((item) => item.id !== id));
    setError('API unavailable. Item removed from local view only.');
  };

  const exportResults = async (format) => {
    if (!results) return;

    try {
      const response = await fetch(`${apiUrl}/api/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ results }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tavsearch-results-${new Date().toISOString().slice(0, 10)}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting results:', error);
      // Fallback to client-side export
      exportClientSide(format);
    }
  };

  const exportClientSide = (format) => {
    if (!results) return;

    let content, mimeType, fileName;
    const timestamp = new Date().toISOString().slice(0, 10);

    switch (format) {
      case 'json':
        content = JSON.stringify(results, null, 2);
        mimeType = 'application/json';
        fileName = `tavsearch-results-${timestamp}.json`;
        break;
      case 'csv':
        content = convertToCSV(results);
        mimeType = 'text/csv';
        fileName = `tavsearch-results-${timestamp}.csv`;
        break;
      case 'md':
        content = convertToMarkdown(results);
        mimeType = 'text/markdown';
        fileName = `tavsearch-results-${timestamp}.md`;
        break;
      default:
        return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data) => {
    let csv = 'Agent,Status,Summary,Sources Count,Execution Time\n';
    if (data.agents) {
      Object.entries(data.agents).forEach(([agentName, agentData]) => {
        const summary = (agentData.summary || '').replace(/"/g, '""');
        const sourcesCount = agentData.sources ? agentData.sources.length : 0;
        const executionTime = agentData.execution_time || '';
        const status = agentData.status || '';
        csv += `"${agentName}","${status}","${summary}",${sourcesCount},${executionTime}\n`;
      });
    }
    return csv;
  };

  const convertToMarkdown = (data) => {
    let md = '# TavSearch Analysis Results\n\n';
    md += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    if (data.summary) {
      md += `## Executive Summary\n\n${data.summary}\n\n`;
    }

    if (data.key_insights) {
      md += '## Key Insights\n\n';
      if (Array.isArray(data.key_insights)) {
        data.key_insights.forEach((insight, index) => {
          md += `${index + 1}. ${insight}\n`;
        });
      } else {
        md += `${data.key_insights}\n`;
      }
      md += '\n';
    }

    if (data.agents) {
      md += '## Agent Details\n\n';
      Object.entries(data.agents).forEach(([agentName, agentData]) => {
        md += `### ${agentName}\n\n`;
        if (agentData.status) md += `**Status:** ${agentData.status}\n\n`;
        if (agentData.summary) md += `**Summary:** ${agentData.summary}\n\n`;
        if (agentData.sources && agentData.sources.length > 0) {
          md += '**Sources:**\n';
          agentData.sources.forEach((source, index) => {
            md += `${index + 1}. [${source.title || 'Source'}](${source.url})\n`;
          });
          md += '\n';
        }
        if (agentData.execution_time) md += `**Execution Time:** ${agentData.execution_time}s\n\n`;
      });
    }

    return md;
  };

  const toggleAgent = (agentName) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentName)) {
      newExpanded.delete(agentName);
    } else {
      newExpanded.add(agentName);
    }
    setExpandedAgents(newExpanded);
  };

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  TavSearch
                </h1>
                <p className="text-sm text-slate-600">Multi-Agent Research System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white/60 backdrop-blur-sm p-1 rounded-xl mb-8 border border-slate-200">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-white shadow-sm text-blue-600 border border-blue-100'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Search & Analysis</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-white shadow-sm text-blue-600 border border-blue-100'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-8">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-red-800">Error</span>
                </div>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* API Connection Status */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-600">API Endpoint: {apiUrl}</span>
                  <span className="text-xs text-slate-500">(Mock fallback enabled)</span>
                </div>
                <button
                  onClick={fetchHistory}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                >
                  Test Connection
                </button>
              </div>
            </div>

            {/* Search Form */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Submit Research Query</h2>
                <p className="text-slate-600">
                  Let our intelligent agents analyze the web for comprehensive insights
                </p>
              </div>

              <div className="space-y-6">
                {/* Query Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Research Query
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter your research question or topic (e.g., 'Latest developments in renewable energy technology')"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                    rows={3}
                  />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Query Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Query Type
                    </label>
                    <select
                      value={queryType}
                      onChange={(e) => setQueryType(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {queryTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search Depth */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Search Depth
                    </label>
                    <select
                      value={searchDepth}
                      onChange={(e) => setSearchDepth(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="quick">⚡ Quick (Fast results)</option>
                      <option value="standard">🎯 Standard (Balanced)</option>
                      <option value="deep">🔍 Deep (Comprehensive)</option>
                    </select>
                  </div>

                  {/* Max Results */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Maximum Results
                    </label>
                    <select
                      value={maxResults}
                      onChange={(e) => setMaxResults(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={5}>5 results</option>
                      <option value={10}>10 results</option>
                      <option value={15}>15 results</option>
                      <option value={20}>20 results</option>
                    </select>
                  </div>
                </div>

                {/* Include Images Checkbox */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="includeImages"
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="includeImages" className="text-sm text-slate-700">
                    Include images and visual content
                  </label>
                </div>

                {/* Search Button */}
                <button
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-medium hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Analyzing with AI Agents...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Brain className="w-5 h-5" />
                      <span>Start Analysis</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div
                    className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                  <span className="text-slate-600 font-medium">Multi-Agent System Processing</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-slate-600">
                      Web Search Agent gathering sources...
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-slate-600">
                      Analysis Agent processing data...
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm text-slate-600">
                      Synthesis Agent compiling results...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-8">
                  <h3 className="text-xl font-semibold text-slate-800 mb-4">Executive Summary</h3>
                  <p className="text-slate-700 leading-relaxed">{results.summary}</p>
                  <div className="mt-4 flex items-center space-x-4 text-sm text-slate-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{results.execution_time}s</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Database className="w-4 h-4" />
                      <span>{Object.keys(results.agents).length} agents</span>
                    </div>
                  </div>
                </div>

                {/* Key Insights */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-8">
                  <h3 className="text-xl font-semibold text-slate-800 mb-4">Key Insights</h3>
                  <ul className="space-y-3">
                    {results.key_insights.map((insight, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-slate-700">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Agent Details */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-8">
                  <h3 className="text-xl font-semibold text-slate-800 mb-6">Agent Outputs</h3>
                  <div className="space-y-4">
                    {Object.entries(results.agents).map(([agentName, agentData]) => {
                      const isExpanded = expandedAgents.has(agentName);
                      return (
                        <div
                          key={agentName}
                          className="border border-slate-200 rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => toggleAgent(agentName)}
                            className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span className="font-medium text-slate-800">{agentName}</span>
                              <StatusIcon status={agentData.status} />
                            </div>
                            <span className="text-sm text-slate-500">
                              {agentData.execution_time}s
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="p-4 border-t border-slate-200">
                              {agentData.summary && (
                                <div className="mb-4">
                                  <h4 className="font-medium text-slate-800 mb-2">Summary</h4>
                                  <p className="text-slate-600">{agentData.summary}</p>
                                </div>
                              )}

                              {agentData.sources && (
                                <div className="mb-4">
                                  <h4 className="font-medium text-slate-800 mb-2">
                                    Sources ({agentData.sources.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {agentData.sources.slice(0, 3).map((source, index) => (
                                      <a
                                        key={index}
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>{source.title}</span>
                                        <span className="text-slate-400">({source.score})</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {agentData.data && (
                                <div>
                                  <h4 className="font-medium text-slate-800 mb-2">Data</h4>
                                  <div className="bg-slate-100 rounded-lg p-3 text-sm text-slate-600 font-mono">
                                    {agentData.data}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Export Options */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-8">
                  <h3 className="text-xl font-semibold text-slate-800 mb-4">Export Results</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => exportResults('json')}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>JSON</span>
                    </button>
                    <button
                      onClick={() => exportResults('csv')}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={() => exportResults('md')}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Markdown</span>
                    </button>
                    <button
                      onClick={() => exportResults('pdf')}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">Analysis History</h2>
              <span className="text-sm text-slate-500">{history.length} queries</span>
            </div>

            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-600 mb-2">No Analysis History</h3>
                  <p className="text-slate-500">
                    Start by submitting a research query to see your history here.
                  </p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-800 mb-1">{item.query}</h3>
                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                          <div className="flex items-center space-x-1">
                            <StatusIcon status={item.status} />
                            <span className="capitalize">{item.status}</span>
                          </div>
                          {item.execution_time && <span>{item.execution_time}s</span>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleHistorySelect(item)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          View Results
                        </button>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TavSearchApp;
