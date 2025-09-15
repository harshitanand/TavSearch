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
          setAnalyses(response.data || []);
        } catch (apiError) {
          console.log('API not available, using mock data');
          // Mock data for development
          const mockAnalyses = [
            {
              _id: 'analysis-1',
              queryText: 'AI software companies competitive analysis',
              status: 'completed',
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              framework: 'langchain-multiagent',
            },
            {
              _id: 'analysis-2',
              queryText: 'Renewable energy investment opportunities',
              status: 'processing',
              createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
              framework: 'langchain-multiagent',
            },
            {
              _id: 'analysis-3',
              queryText: 'Fintech startup landscape Southeast Asia',
              status: 'failed',
              createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              framework: 'langchain-multiagent',
            },
          ];
          setAnalyses(mockAnalyses);
        }
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch analyses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [refreshTrigger]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Analyses</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <XCircle className="h-6 w-6 text-red-500 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error Loading Analyses</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4 inline mr-1" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Recent Analyses</h3>
        <button
          onClick={() => window.location.reload()}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {analyses.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No analyses yet. Start your first one above!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div
              key={analysis._id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSelectAnalysis(analysis)}
            >
              <div className="flex items-center space-x-4">
                {getStatusIcon(analysis.status)}
                <div>
                  <h4 className="font-medium text-gray-900">{analysis.queryText}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>
                      {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {analysis.framework && (
                      <span className="text-blue-600">• {analysis.framework}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(analysis.status)}
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentAnalyses;
