import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  BarChart3,
  Users,
  Activity,
  Calendar,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Shield,
  Database,
  Globe,
} from 'lucide-react';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import toast from 'react-hot-toast';
import { api } from '../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AnalyticsDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('24h');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching dashboard metrics...');
      const response = await api.getDashboardMetrics({ timeframe });
      console.log('Dashboard API response:', response);

      if (response.success) {
        setDashboardData(response.data);
        setLastUpdated(new Date());
        console.log('Dashboard data loaded:', response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard analytics:', err);
      setError(err.message);
      toast.error('Failed to load dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  const timeframeOptions = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
  ];

  const getGrowthIcon = (direction) => {
    switch (direction) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getGrowthColor = (direction) => {
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSystemHealthColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Chart configurations
  const createActivityChart = () => {
    if (!dashboardData?.activityChart) return null;

    const chartData = dashboardData.activityChart.data;

    return {
      labels: chartData.labels,
      datasets: chartData.datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: dataset.color,
        backgroundColor: dataset.color + '20',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
      })),
    };
  };

  const createStatusChart = () => {
    if (!dashboardData?.statusChart) return null;

    const chartData = dashboardData.statusChart.data;

    return {
      labels: chartData.labels.map((label) => label.charAt(0).toUpperCase() + label.slice(1)),
      datasets: [
        {
          data: chartData.values,
          backgroundColor: chartData.labels.map((label) => chartData.colors[label]),
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  };

  const createTrendsChart = () => {
    if (!dashboardData?.trends) return null;

    return {
      labels: dashboardData.trends.map((trend) => {
        const date = new Date(trend.period);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
        });
      }),
      datasets: [
        {
          label: 'Total Analyses',
          data: dashboardData.trends.map((trend) => trend.total),
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F620',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Success Rate (%)',
          data: dashboardData.trends.map((trend) => trend.successRate),
          borderColor: '#10B981',
          backgroundColor: '#10B98120',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          yAxisID: 'y1',
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.1)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        grid: {
          color: 'rgba(0,0,0,0.1)',
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        cornerRadius: 8,
        padding: 12,
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">Failed to Load Analytics</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 inline-flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No analytics data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Comprehensive insights into your multi-agent analysis system
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700"
              >
                {timeframeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {lastUpdated && (
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
        </motion.div>

        {/* Key Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Total Analyses */}
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Analyses</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData.totalAnalyses || 0}
                </p>
                <div className="flex items-center space-x-1 mt-2">
                  {getGrowthIcon(dashboardData.growthDirection)}
                  <span
                    className={`text-sm font-medium ${getGrowthColor(dashboardData.growthDirection)}`}
                  >
                    {dashboardData.growthPercentage || 0}%
                  </span>
                  <span className="text-xs text-gray-500">vs previous period</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData.successRate || '0%'}
                </p>
                <div className="flex items-center space-x-1 mt-2">
                  <span className="text-sm text-gray-500">
                    {dashboardData.completedAnalyses || 0} completed
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Users</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.activeUsers || 0}</p>
                <div className="flex items-center space-x-1 mt-2">
                  <span className="text-sm text-gray-500">Last {timeframe}</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">System Health</p>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSystemHealthColor(dashboardData.systemHealth?.status)}`}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  {dashboardData.systemHealth?.status || 'unknown'}
                </span>
                <div className="flex items-center space-x-1 mt-2">
                  <span className="text-sm text-gray-500">
                    {dashboardData.systemHealth?.errorRate || 0}% error rate
                  </span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
        >
          {dashboardData.statusBreakdown &&
            Object.entries(dashboardData.statusBreakdown).map(([status, count]) => (
              <div key={status} className="bg-white rounded-lg p-4 shadow border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600 capitalize">{status}</p>
                </div>
              </div>
            ))}
        </motion.div>

        {/* Charts Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
        >
          {/* Activity Chart */}
          {dashboardData.activityChart && (
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {dashboardData.activityChart.title}
              </h3>
              <div className="h-80">
                <Line data={createActivityChart()} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Status Distribution */}
          {dashboardData.statusChart && (
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {dashboardData.statusChart.title}
              </h3>
              <div className="h-80">
                <Pie data={createStatusChart()} options={pieOptions} />
              </div>
            </div>
          )}
        </motion.div>

        {/* Trends Chart */}
        {dashboardData.trends && dashboardData.trends.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-6 shadow-lg border mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Trends Over Time</h3>
            <div className="h-80">
              <Line data={createTrendsChart()} options={chartOptions} />
            </div>
          </motion.div>
        )}

        {/* Additional Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Performance Metrics */}
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Performance Metrics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Processing Time</span>
                <span className="font-medium text-gray-900">
                  {dashboardData.avgProcessingTime || '0s'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Sources Processed</span>
                <span className="font-medium text-gray-900">
                  {dashboardData.performance?.avgSourcesProcessed || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">API Efficiency</span>
                <span className="font-medium text-gray-900">
                  {dashboardData.performance?.apiEfficiency || 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Quality Score</span>
                <span className="font-medium text-gray-900">
                  {dashboardData.performance?.avgQualityScore || 0}/10
                </span>
              </div>
            </div>
          </div>

          {/* Top Queries */}
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-500" />
              Query Analytics
            </h3>
            {dashboardData.topQueries && dashboardData.topQueries.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.topQueries.map((query, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {query.query || 'Query not specified'}
                        </p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>Used {query.count} times</span>
                          <span>{query.successRate}% success</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No query data available</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Metadata */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-gray-50 rounded-xl p-4"
        >
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Timeframe: {dashboardData.timeframe}</span>
              <span>Generated: {new Date(dashboardData.generatedAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>TavSearch Analytics Engine</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
