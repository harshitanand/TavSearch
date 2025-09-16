import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { api } from '../services/api';

const RecentAnalyses = ({ onSelectAnalysis, refreshTrigger }) => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try real API first, fallback to mock data
        try {
          const response = await api.getUserAnalyses({ limit: 10 });
          console.log('API Response:', response); // Debug logging

          // Transform API data to match component expectations
          const transformedData = (response.data || []).map((item) => ({
            _id: item.queryId,
            queryId: item.queryId,
            queryText: item.query,
            query: item.query,
            status: item.status,
            createdAt: item.createdAt,
            framework: item.framework,
            priority: item.priority,
            tags: item.tags,
            error: item.error,
          }));

          console.log('Transformed data:', transformedData); // Debug logging
          setAnalyses(transformedData);
        } catch (apiError) {
          console.log('API not available, using mock data');
          // Mock data for development
          const mockAnalyses = [
            {
              _id: 'analysis-1',
              queryId: 'analysis-1',
              queryText: 'AI software companies competitive analysis',
              status: 'completed',
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              framework: 'langchain-multiagent',
            },
            {
              _id: 'analysis-2',
              queryId: 'analysis-2',
              queryText: 'Renewable energy investment opportunities',
              status: 'processing',
              createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
              framework: 'langchain-multiagent',
            },
            {
              _id: 'analysis-3',
              queryId: 'analysis-3',
              queryText: 'Fintech startup landscape Southeast Asia',
              status: 'failed',
              createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              framework: 'langchain-multiagent',
            },
            {
              _id: 'analysis-4',
              queryId: 'analysis-4',
              queryText: 'Healthcare technology trends 2024',
              status: 'completed',
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              framework: 'langchain-multiagent',
            },
          ];
          setAnalyses(mockAnalyses);
        }
      } catch (error) {
        console.error('Error fetching analyses:', error);
        setError('Failed to load recent analyses');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [refreshTrigger]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  const handleSelectAnalysis = (analysis) => {
    // Check if onSelectAnalysis is a function before calling it
    if (typeof onSelectAnalysis === 'function') {
      onSelectAnalysis(analysis);
    } else {
      console.warn('onSelectAnalysis is not a function or is undefined');
      // Provide a fallback action or show an error message
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Analyses</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Analyses</h3>
        <div className="text-center py-8">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Analyses</h3>
          <button
            onClick={() => window.location.reload()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {analyses.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No recent analyses found</p>
            <p className="text-sm text-gray-500 mt-2">
              Start your first analysis to see results here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <div
                key={analysis._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSelectAnalysis(analysis)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(analysis.status)}
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {analysis.queryText}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTimeAgo(analysis.createdAt)}
                      </span>
                      <span className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-1" />
                        {analysis.framework || 'Multi-Agent'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        analysis.status
                      )}`}
                    >
                      {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                    </span>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentAnalyses;
