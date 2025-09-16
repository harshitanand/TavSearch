import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Loader2,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import Charts from './Charts';

const AnalysisResults = () => {
  const { queryId } = useParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadResults();
  }, [queryId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalysisResults(queryId);

      if (data.query.status === 'completed' && data.result) {
        setResults(data);
      } else {
        setError(`Analysis is ${data.query.status}. Results not available yet.`);
      }
    } catch (err) {
      setError('Failed to load analysis results');
      console.error('Error loading results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setExportLoading(true);
      const response = await api.exportResults(queryId, format);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analysis-${queryId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(`Failed to export ${format.toUpperCase()} report`);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading analysis results...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Results</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button onClick={() => navigate('/')} className="btn-primary">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const analysisData = results.data || {};
  const analysisResults = analysisData.results || {};
  const workflowState = analysisData.workflowState || {};
  const metadata = analysisData.metadata || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analysis Results</h1>
              <p className="text-gray-600 mt-2">{results.query.text}</p>
              <p className="text-sm text-gray-500 mt-1">
                Completed: {new Date(results.result.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Completed
                </span>
              </div>

              <div className="relative">
                <button
                  onClick={() => document.getElementById('export-menu').classList.toggle('hidden')}
                  className="btn-primary flex items-center space-x-2"
                  disabled={exportLoading}
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>

                <div
                  id="export-menu"
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden"
                >
                  <div className="py-1">
                    {['pdf', 'xlsx', 'csv', 'html', 'json'].map((format) => (
                      <button
                        key={format}
                        onClick={() => handleExport(format)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        disabled={exportLoading}
                      >
                        Export as {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        {analysisResults.summary && (
          <motion.div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-blue-600" />
              Executive Summary
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded">
              <p className="text-gray-800 leading-relaxed">{analysisResults.summary}</p>
            </div>
          </motion.div>
        )}

        {/* Key Findings */}
        {analysisResults.keyFindings && analysisResults.keyFindings.length > 0 && (
          <motion.div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Lightbulb className="h-6 w-6 mr-2 text-yellow-600" />
              Key Findings
            </h2>
            <div className="space-y-4">
              {analysisResults.keyFindings.map((finding, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <p className="text-gray-800">{finding}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recommendations */}
        {analysisResults.recommendations && analysisResults.recommendations.length > 0 && (
          <motion.div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Target className="h-6 w-6 mr-2 text-purple-600" />
              Recommendations
            </h2>
            <div className="space-y-4">
              {analysisResults.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <p className="text-gray-800">{rec}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Agent Execution Times */}
        {metadata.agentExecutionTimes && (
          <motion.div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Activity className="h-6 w-6 mr-2 text-indigo-600" />
              Multi-Agent Workflow Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Object.entries(metadata.agentExecutionTimes).map(([agent, time]) => (
                <div key={agent} className="text-center p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900 capitalize">{agent}</h3>
                  <p className="text-sm text-gray-600">{time}s</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {/* Key Trends */}
        {analysisResults.keyTrends && analysisResults.keyTrends.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-green-600" />
              Key Market Trends
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analysisResults.keyTrends.map((trend, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-800 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <p className="text-gray-700 flex-1">{trend}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Market Opportunities */}
        {analysisResults.marketOpportunities && analysisResults.marketOpportunities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Target className="h-6 w-6 mr-2 text-purple-600" />
              Strategic Opportunities
            </h2>
            <div className="space-y-4">
              {analysisResults.marketOpportunities.map((opportunity, index) => (
                <div
                  key={index}
                  className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500"
                >
                  <p className="text-gray-800">{opportunity}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Competitive Landscape */}
        {analysisResults.competitiveLandscape && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Users className="h-6 w-6 mr-2 text-blue-600" />
              Competitive Landscape
            </h2>

            {analysisResults.competitiveLandscape.marketPosition && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Market Position</h3>
                <p className="text-gray-700">
                  {analysisResults.competitiveLandscape.marketPosition}
                </p>
              </div>
            )}

            {analysisResults.competitiveLandscape.majorPlayers &&
              analysisResults.competitiveLandscape.majorPlayers.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Major Players</h3>
                  <div className="flex flex-wrap gap-3">
                    {analysisResults.competitiveLandscape.majorPlayers.map((player, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium"
                      >
                        {player}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </motion.div>
        )}

        {/* Recommendations */}
        {analysisResults.recommendations && analysisResults.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Lightbulb className="h-6 w-6 mr-2 text-yellow-600" />
              Strategic Recommendations
            </h2>
            <div className="space-y-4">
              {analysisResults.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Risk Assessment */}
        {analysisResults.riskFactors && analysisResults.riskFactors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-amber-600" />
              Risk Assessment
            </h2>
            <div className="space-y-4">
              {analysisResults.riskFactors.map((risk, index) => (
                <div key={index} className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-500">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-800">{risk}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Visualizations */}
        {results.result?.visualizations && results.result.visualizations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <BarChart3 className="h-6 w-6 mr-2 text-indigo-600" />
              Market Analysis Charts
            </h2>
            <Charts visualizations={results.result.visualizations} />
          </motion.div>
        )}

        {/* Insights */}
        {analysisResults.insights && analysisResults.insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Lightbulb className="h-6 w-6 mr-2 text-blue-600" />
              Key Insights
            </h2>
            <div className="space-y-3">
              {analysisResults.insights.map((insight, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-800">{insight}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnalysisResults;
