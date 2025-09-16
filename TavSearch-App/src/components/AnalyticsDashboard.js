import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Users, Activity, Calendar, Filter, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [usage, setUsage] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, trendsRes, usageRes, dashboardRes] = await Promise.all([
        api.getUserAnalytics({ timeframe }),
        api.getQueryTrends({ timeframe, granularity: 'daily' }),
        api.getUsageStats({ timeframe, breakdown: 'daily' }),
        api.getDashboardMetrics(),
      ]);

      setAnalytics(analyticsRes.data);
      setTrends(trendsRes.data);
      setUsage(usageRes.data);
      setDashboardMetrics(dashboardRes.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const timeframeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span>Loading analytics...</span>
          </div>
        </div>

        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {timeframeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchAnalytics}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Key Metrics */}
      {dashboardMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Analyses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardMetrics.totalAnalyses || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardMetrics.successRate || '0%'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Avg Processing Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardMetrics.avgProcessingTime || '0s'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardMetrics.activeUsers || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Statistics */}
      {usage && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Usage Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">API Calls</p>
              <p className="text-lg font-bold text-gray-900">{usage.apiCalls || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data Processed</p>
              <p className="text-lg font-bold text-gray-900">{usage.dataProcessed || '0 MB'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Export Downloads</p>
              <p className="text-lg font-bold text-gray-900">
                {usage.exports?.totalExports || usage.exports?.total || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Query Trends */}
      {trends && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Query Trends</h3>
          {trends.popular && trends.popular.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Popular Query Topics</h4>
              <div className="flex flex-wrap gap-2">
                {trends.popular.map((topic, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    {topic.term} ({topic.count})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No trend data available for this period</p>
          )}
        </div>
      )}

      {/* User Analytics */}
      {analytics && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">User Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Analysis Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-medium">{analytics.completed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">In Progress</span>
                  <span className="font-medium">{analytics.processing || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed</span>
                  <span className="font-medium">{analytics.failed || 0}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">Activity Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Most Active Day</span>
                  <span className="font-medium">{analytics.mostActiveDay || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Queries/Day</span>
                  <span className="font-medium">{analytics.avgQueriesPerDay || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Query Time</span>
                  <span className="font-medium">{analytics.totalQueryTime || '0m'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
