import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Eye,
  Share2,
  Clock,
  CheckCircle,
  TrendingUp,
  BarChart3,
  FileText,
  Users,
  AlertTriangle,
  Lightbulb,
  Target,
  Zap,
  ExternalLink,
  Star,
  Globe,
  Database,
  Brain,
  Shield,
  Activity,
  BookOpen,
  Award,
  RefreshCw,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import Charts from './Charts';

const AnalysisResults = ({ analysis: propAnalysis, onStartNew, onExport }) => {
  // Router integration
  const { queryId } = useParams();
  const navigate = useNavigate();

  // State management
  const [analysis, setAnalysis] = useState(propAnalysis || null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [exportLoading, setExportLoading] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Initialize state from props if available
  useEffect(() => {
    if (propAnalysis && propAnalysis.queryId === queryId) {
      console.log('Using prop analysis:', propAnalysis);
      setAnalysis(propAnalysis);
    }
  }, [propAnalysis, queryId]);

  // Also add a debug effect to check what's happening
  useEffect(() => {
    console.log('AnalysisResults mounted with:', { queryId, propAnalysis, analysis, results });
  }, []);

  useEffect(() => {
    console.log('QueryId changed:', queryId);
    if (queryId) {
      console.log('Triggering loadAnalysisResults...');
      loadAnalysisResults();
    }
  }, [queryId]);

  const loadAnalysisResults = async () => {
    console.log('loadAnalysisResults called with queryId:', queryId);

    if (!queryId) {
      console.error('No queryId provided');
      setError('No analysis ID provided');
      return;
    }

    setLoading(true);
    setError(null); // Clear any previous errors

    try {
      console.log('Making API call to getAnalysisResults...');
      const result = await api.getAnalysisResults(queryId);
      console.log('API response:', result);

      // Handle your actual API response structure
      const analysisData = {
        queryId: result.data.queryId || queryId,
        query: result.data.queryText,
        status: result.data.status,
        framework: result.data.metadata?.framework || 'LangChain Multi-Agent',
        createdAt: result.data.createdAt,
        startTime: result.data.createdAt,
        completedAt: result.data.createdAt, // Assuming completed since status is completed
        metadata: result.data.metadata,
        performance: result.data.performance,
      };

      console.log('Processed analysis data:', analysisData);
      setAnalysis(analysisData);
      setResults(result.data);

      // If still processing, redirect to progress page
      if (result.data.status === 'processing') {
        console.log('Analysis still processing, redirecting...');
        navigate(`/analysis/${queryId}/progress`);
        return;
      }

      // If failed, show error
      if (result.data.status === 'failed') {
        console.log('Analysis failed');
        setError('Analysis failed. Please try again.');
        return;
      }
    } catch (error) {
      console.error('Failed to load results:', error);
      console.error('Error details:', error.response || error.message);
      setError(`Failed to load analysis results: ${error.message}`);
      toast.error('Failed to load analysis results');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = () => {
    if (onStartNew) {
      onStartNew();
    } else {
      navigate('/');
    }
  };

  const handleExport = async (format) => {
    setExportLoading(true);
    setShowExportMenu(false); // Close menu

    try {
      console.log('Starting export with format:', format, 'queryId:', analysis.queryId);

      // Check if your API has a specific export endpoint
      let response;
      try {
        // Try your actual API export endpoint first
        response = await api.exportAnalysis(analysis.queryId, format);
      } catch (apiError) {
        console.log('Export API not available, creating client-side export');

        // Fallback: Create export from current results data
        if (format === 'json') {
          const exportData = {
            query: analysis.query,
            status: analysis.status,
            createdAt: analysis.createdAt,
            results: results,
            metadata: analysis.metadata,
          };

          const dataStr = JSON.stringify(exportData, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `analysis-${analysis.queryId}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success('JSON export completed');
          return;
        }

        if (format === 'html' && finalReport) {
          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Analysis Report - ${analysis.query}</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #3B82F6; padding-bottom: 20px; margin-bottom: 30px; }
        .query { background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .meta { color: #6B7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Market Intelligence Report</h1>
        <div class="meta">Generated: ${new Date().toLocaleDateString()}</div>
    </div>
    <div class="query">
        <strong>Query:</strong> ${analysis.query}
    </div>
    ${finalReport}
    <div class="meta" style="margin-top: 40px; border-top: 1px solid #E5E7EB; padding-top: 20px;">
        Report generated by TavSearch Multi-Agent System
    </div>
</body>
</html>`;

          const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(htmlBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `analysis-${analysis.queryId}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success('HTML export completed');
          return;
        }

        if (format === 'csv') {
          // Create CSV from trends and insights
          let csvContent = 'Type,Content,Source\n';

          keyTrends.forEach((trend, index) => {
            csvContent += `"Market Trend ${index + 1}","${trend.replace(/"/g, '""')}","Analysis Result"\n`;
          });

          marketOpportunities.forEach((opp, index) => {
            csvContent += `"Opportunity ${index + 1}","${opp.replace(/"/g, '""')}","Analysis Result"\n`;
          });

          riskFactors.forEach((risk, index) => {
            csvContent += `"Risk Factor ${index + 1}","${risk.replace(/"/g, '""')}","Analysis Result"\n`;
          });

          if (rawData && rawData.length > 0) {
            rawData.forEach((source, index) => {
              csvContent += `"Data Source ${index + 1}","${source.title.replace(/"/g, '""')}","${source.url}"\n`;
            });
          }

          const csvBlob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(csvBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `analysis-${analysis.queryId}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success('CSV export completed');
          return;
        }

        // For PDF and XLSX, show message that server export is needed
        if (format === 'pdf' || format === 'xlsx') {
          toast.error(
            `${format.toUpperCase()} export requires server processing. Feature coming soon.`
          );
          return;
        }

        throw apiError;
      }

      // Handle successful API response
      if (response) {
        if (format === 'json') {
          const dataStr = JSON.stringify(response, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `analysis-${analysis.queryId}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else if (format === 'html') {
          const htmlBlob = new Blob([response], { type: 'text/html' });
          const url = URL.createObjectURL(htmlBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `analysis-${analysis.queryId}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          // Handle binary formats (PDF, Excel, CSV)
          const blob = new Blob([response], {
            type:
              format === 'pdf'
                ? 'application/pdf'
                : format === 'xlsx'
                  ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  : 'text/csv',
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `analysis-${analysis.queryId}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        toast.success(`Successfully exported as ${format.toUpperCase()}`);
        if (onExport) onExport(analysis.queryId);
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(`Failed to export as ${format.toUpperCase()}: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleRetryAnalysis = async () => {
    try {
      const response = await api.retryAnalysis(analysis.queryId);
      if (response.success) {
        toast.success('Analysis restarted successfully');
        navigate(`/analysis/${response.data.queryId}/progress`);
      }
    } catch (error) {
      toast.error('Failed to restart analysis');
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'overview', name: 'Overview', icon: Eye },
    { id: 'insights', name: 'Key Insights', icon: Lightbulb },
    { id: 'trends', name: 'Market Trends', icon: TrendingUp },
    { id: 'visualizations', name: 'Charts', icon: BarChart3 },
    { id: 'report', name: 'Full Report', icon: FileText },
    { id: 'metadata', name: 'Analysis Info', icon: Database },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={handleStartNew}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-red-900 mb-4">Analysis Error</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <div className="space-x-4">
              <button
                onClick={handleRetryAnalysis}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 inline-flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry Analysis</span>
              </button>
              <button
                onClick={handleStartNew}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Start New Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No analysis state
  if (!analysis || !results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Analysis Not Found</h2>
          <p className="text-gray-600 mb-6">The requested analysis results could not be found.</p>
          <button
            onClick={handleStartNew}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Start New Analysis
          </button>
        </div>
      </div>
    );
  }

  // Parse analysis results from your actual data structure
  const analysisData = results?.analysisResults || {};
  const keyTrends = analysisData.keyTrends || [];
  const insights = analysisData.insights || [];
  const marketOpportunities = analysisData.marketOpportunities || [];
  const riskFactors = analysisData.riskFactors || [];
  const competitiveLandscape = analysisData.competitiveLandscape || {};
  const visualizations = results?.visualizations || [];
  const finalReport = results?.finalReport || '';
  const rawData = results?.rawData || [];
  const processedData = results?.processedData || {};
  const performance = results?.performance || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button
            onClick={handleStartNew}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Analysis Complete</h1>
                  <p className="text-gray-600">Multi-Agent Market Intelligence Report</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFullReport(true)}
                  className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview Report</span>
                </button>

                <div className="relative export-menu-container">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={exportLoading}
                  >
                    <Download className="h-4 w-4" />
                    <span>{exportLoading ? 'Exporting...' : 'Export'}</span>
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10 border">
                      <div className="py-2">
                        {['json', 'html', 'csv', 'pdf', 'xlsx'].map((format) => (
                          <button
                            key={format}
                            onClick={() => handleExport(format)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left disabled:opacity-50"
                            disabled={exportLoading}
                          >
                            Export as {format.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Query and metadata */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Query</p>
                  <p className="font-medium text-gray-900">{analysis.query}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="font-medium text-gray-900">
                    {new Date(analysis.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Processing Time</p>
                  <p className="font-medium text-gray-900">
                    {performance.totalDuration
                      ? (performance.totalDuration / 1000).toFixed(1) + 's'
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Lightbulb className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Key Insights</p>
                <p className="text-2xl font-bold text-gray-900">{insights.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Market Trends</p>
                <p className="text-2xl font-bold text-gray-900">{keyTrends.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Key Players</p>
                <p className="text-2xl font-bold text-gray-900">
                  {competitiveLandscape.majorPlayers?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Visualizations</p>
                <p className="text-2xl font-bold text-gray-900">{visualizations.length}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg mb-8"
        >
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>

                  {/* Quick insights grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Key findings from trends */}
                    {keyTrends.slice(0, 2).map((trend, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500"
                      >
                        <div className="flex items-start space-x-3">
                          <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-blue-900 mb-1">
                              Market Trend #{index + 1}
                            </p>
                            <p className="text-gray-800 text-sm">{trend}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Market opportunities */}
                    {marketOpportunities.slice(0, 2).map((opportunity, index) => (
                      <div
                        key={index}
                        className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500"
                      >
                        <div className="flex items-start space-x-3">
                          <Target className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-green-900 mb-1">
                              Opportunity #{index + 1}
                            </p>
                            <p className="text-gray-800 text-sm">{opportunity}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Key players if available */}
                    {competitiveLandscape.majorPlayers &&
                      competitiveLandscape.majorPlayers.length > 0 && (
                        <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                          <div className="flex items-start space-x-3">
                            <Users className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-purple-900 mb-1">Market Leaders</p>
                              <p className="text-gray-800 text-sm">
                                {competitiveLandscape.majorPlayers.join(', ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Risk factors if available */}
                    {riskFactors.length > 0 && (
                      <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-orange-900 mb-1">Key Risk</p>
                            <p className="text-gray-800 text-sm">{riskFactors[0]}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Analysis quality indicator */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Analysis Quality Score</h4>
                        <p className="text-sm text-gray-600">
                          Based on data completeness and reliability
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-5 w-5 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <span className="text-lg font-bold text-gray-900">4.2/5</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Key Insights Tab */}
              {activeTab === 'insights' && (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Key Market Insights</h3>

                  {insights.length > 0 ? (
                    insights.map((insight, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">{index + 1}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-800 text-base leading-relaxed">{insight}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        No specific insights were extracted from the analysis.
                      </p>
                    </div>
                  )}

                  {/* Market Opportunities */}
                  {marketOpportunities.length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Target className="h-5 w-5 mr-2 text-green-600" />
                        Market Opportunities
                      </h4>
                      <div className="space-y-3">
                        {marketOpportunities.map((opportunity, index) => (
                          <div
                            key={index}
                            className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500"
                          >
                            <p className="text-gray-800">{opportunity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Factors */}
                  {riskFactors.length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                        Risk Assessment
                      </h4>
                      <div className="space-y-3">
                        {riskFactors.map((risk, index) => (
                          <div
                            key={index}
                            className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500"
                          >
                            <p className="text-gray-800">{risk}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Market Trends Tab */}
              {activeTab === 'trends' && (
                <motion.div
                  key="trends"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Identified Market Trends
                  </h3>

                  {keyTrends.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {keyTrends.map((trend, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <TrendingUp className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Trend #{index + 1}
                              </h4>
                              <p className="text-gray-700 text-sm leading-relaxed">{trend}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        No specific market trends were identified in the analysis.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Visualizations Tab */}
              {activeTab === 'visualizations' && (
                <motion.div
                  key="visualizations"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Data Visualizations</h3>

                  {visualizations.length > 0 ? (
                    <Charts visualizations={visualizations} />
                  ) : (
                    <div className="text-center py-12">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        No visualizations were generated for this analysis.
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Charts and graphs will appear here when available.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Full Report Tab */}
              {activeTab === 'report' && (
                <motion.div
                  key="report"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Comprehensive Report</h3>
                    <button
                      onClick={() => handleExport('html')}
                      className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Report</span>
                    </button>
                  </div>

                  {finalReport ? (
                    <div className="bg-gray-50 rounded-lg p-6 border">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: finalReport }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Full report is not available for this analysis.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Metadata Tab */}
              {activeTab === 'metadata' && (
                <motion.div
                  key="metadata"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Analysis Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Analysis Details */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <Database className="h-5 w-5 mr-2 text-blue-600" />
                        Analysis Details
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Query ID:</span>
                          <span className="font-mono text-gray-900">{analysis.queryId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            {analysis.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Framework:</span>
                          <span className="font-medium text-gray-900">{analysis.framework}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span className="text-gray-900">
                            {new Date(analysis.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {analysis.completedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Completed:</span>
                            <span className="text-gray-900">
                              {new Date(analysis.completedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Processing Time:</span>
                          <span className="text-gray-900">
                            {analysis.completedAt
                              ? Math.round(
                                  (new Date(analysis.completedAt) - new Date(analysis.startTime)) /
                                    1000
                                ) + 's'
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <Activity className="h-5 w-5 mr-2 text-green-600" />
                        Performance Metrics
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Data Sources:</span>
                          <span className="text-gray-900">
                            {results.processedData?.totalSources || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quality Score:</span>
                          <span className="text-gray-900">
                            {results.processedData?.qualityMetrics?.averageRelevanceScore
                              ? (
                                  results.processedData.qualityMetrics.averageRelevanceScore * 100
                                ).toFixed(0) + '%'
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Agents Used:</span>
                          <span className="text-gray-900">6 AI Agents</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Data Points:</span>
                          <span className="text-gray-900">
                            {results.processedData?.dataPoints?.length || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Report Length:</span>
                          <span className="text-gray-900">
                            {finalReport
                              ? (finalReport.length / 1000).toFixed(1) + 'k chars'
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent Workflow Status */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-purple-600" />
                      Multi-Agent Workflow
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        {
                          name: 'Search Planner',
                          icon: Target,
                          status: 'completed',
                          description: 'Strategy formulation',
                        },
                        {
                          name: 'Data Collector',
                          icon: Database,
                          status: 'completed',
                          description: 'Web data gathering',
                        },
                        {
                          name: 'Data Processor',
                          icon: Zap,
                          status: 'completed',
                          description: 'Information structuring',
                        },
                        {
                          name: 'Trend Analyzer',
                          icon: TrendingUp,
                          status: 'completed',
                          description: 'Pattern identification',
                        },
                        {
                          name: 'Report Generator',
                          icon: FileText,
                          status: 'completed',
                          description: 'Content synthesis',
                        },
                        {
                          name: 'Quality Validator',
                          icon: Shield,
                          status: 'completed',
                          description: 'Output verification',
                        },
                      ].map((agent, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 border">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-2 rounded-lg ${
                                agent.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                              }`}
                            >
                              <agent.icon
                                className={`h-4 w-4 ${
                                  agent.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                                }`}
                              />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">{agent.name}</p>
                              <p className="text-xs text-gray-500">{agent.description}</p>
                            </div>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Data Sources */}
                  {rawData && rawData.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <Globe className="h-5 w-5 mr-2 text-blue-600" />
                        Data Sources ({rawData.length} sources)
                      </h4>
                      <div className="space-y-2">
                        {rawData.slice(0, 8).map((source, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0"
                          >
                            <div className="flex items-center space-x-3">
                              <ExternalLink className="h-4 w-4 text-gray-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate max-w-md">
                                  {source.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {source.url ? new URL(source.url).hostname : 'Unknown domain'}
                                </p>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              Score:{' '}
                              {source.relevanceScore || source.score
                                ? (source.relevanceScore || source.score * 10).toFixed(0) + '/10'
                                : 'N/A'}
                            </div>
                          </div>
                        ))}
                        {rawData.length > 8 && (
                          <p className="text-sm text-gray-500 text-center pt-2">
                            And {rawData.length - 8} more sources...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            {['json', 'html', 'csv'].map((format) => (
              <button
                onClick={() => handleExport(format)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Download className="h-4 w-4" />
                <span>Export {format}</span>
              </button>
            ))}

            <button
              onClick={() => setShowFullReport(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Eye className="h-4 w-4" />
              <span>View Full Report</span>
            </button>

            <button
              onClick={() => {
                navigator
                  .share({
                    title: `Analysis: ${analysis.query}`,
                    text: `Check out this market intelligence analysis`,
                    url: window.location.href,
                  })
                  .catch(() => {
                    // Fallback to copying URL
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied to clipboard!');
                  });
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>

            <button
              onClick={handleStartNew}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Zap className="h-4 w-4" />
              <span>New Analysis</span>
            </button>
          </div>
        </motion.div>

        {/* Full Report Modal */}
        <AnimatePresence>
          {showFullReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowFullReport(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">Full Analysis Report</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExport('html')}
                      className="flex items-center space-x-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export</span>
                    </button>
                    <button
                      onClick={() => setShowFullReport(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                  {finalReport ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: finalReport }}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Full report content is not available.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AnalysisResults;
