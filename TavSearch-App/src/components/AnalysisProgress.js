import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Loader2,
  Search,
  BarChart3,
  FileText,
  Clock,
  Users,
  Brain,
  Target,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Zap,
  Database,
  TrendingUp,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const AnalysisProgress = ({ analysis: propAnalysis, onComplete, onError }) => {
  // Router integration
  const { queryId } = useParams();
  const navigate = useNavigate();

  // State management
  const [analysis, setAnalysis] = useState(propAnalysis || null);
  const [progress, setProgress] = useState({ current: 0, total: 6, percentage: 0 });
  const [currentStep, setCurrentStep] = useState('initializing');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // Refs for cleanup
  const pollInterval = useRef(null);
  const timeInterval = useRef(null);

  // Complete 6-agent workflow steps based on your backend
  const agentSteps = [
    {
      id: 'planning_search',
      name: 'Search Planning',
      agent: 'Planner Agent',
      icon: Target,
      description: 'Creating optimal search strategy for market intelligence',
      color: 'blue',
      estimatedDuration: 15,
    },
    {
      id: 'gathering_data',
      name: 'Data Collection',
      agent: 'Search Agent',
      icon: Search,
      description: 'Gathering comprehensive market data from multiple sources',
      color: 'purple',
      estimatedDuration: 45,
    },
    {
      id: 'processing_data',
      name: 'Data Processing',
      agent: 'Analysis Agent',
      icon: Database,
      description: 'Cleaning and structuring collected market information',
      color: 'green',
      estimatedDuration: 30,
    },
    {
      id: 'analyzing_trends',
      name: 'Trend Analysis',
      agent: 'Analysis Agent',
      icon: TrendingUp,
      description: 'Identifying patterns and market trends',
      color: 'orange',
      estimatedDuration: 40,
    },
    {
      id: 'generating_report',
      name: 'Report Generation',
      agent: 'Synthesis Agent',
      icon: FileText,
      description: 'Creating comprehensive market intelligence report',
      color: 'indigo',
      estimatedDuration: 35,
    },
    {
      id: 'creating_visualizations',
      name: 'Validation & Quality Check',
      agent: 'Validator Agent',
      icon: Shield,
      description: 'Ensuring report quality and generating visualizations',
      color: 'emerald',
      estimatedDuration: 25,
    },
  ];

  // Load analysis from URL if not provided via props
  useEffect(() => {
    if (!analysis && queryId) {
      loadAnalysisFromUrl();
    }
  }, [queryId]);

  // Start polling when analysis is processing
  useEffect(() => {
    if (analysis && analysis.status === 'processing') {
      startPolling();
      startTimer();
    } else {
      // Stop polling if analysis is not processing
      stopPolling();
      stopTimer();
    }

    return () => {
      stopPolling();
      stopTimer();
    };
  }, [analysis?.status, analysis?.queryId]);

  const loadAnalysisFromUrl = async () => {
    setIsLoading(true);
    try {
      const result = await api.getAnalysisResults(queryId);
      const analysisData = {
        queryId: result.query._id || queryId,
        query: result.query.queryText,
        status: result.query.status,
        framework: result.query.framework || 'LangChain Multi-Agent',
        createdAt: result.query.createdAt,
        startTime: result.query.startedAt || result.query.createdAt,
        results: result.result,
        metadata: result.metadata,
      };

      setAnalysis(analysisData);

      // If already completed, redirect to results
      if (result.query.status === 'completed') {
        navigate(`/analysis/${queryId}`);
        return;
      }

      // If failed, show error
      if (result.query.status === 'failed') {
        setError('Analysis failed. Please try again.');
        if (onError) onError('Analysis failed');
        return;
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
      setError('Failed to load analysis details');
      if (onError) onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    // Don't start if already polling
    if (pollInterval.current) {
      console.log('Polling already active, not starting new interval');
      return;
    }

    console.log('Starting polling for queryId:', analysis?.queryId);
    setIsPolling(true);
    let pollCount = 0;
    const maxPolls = 40; // Maximum 40 polls (40 * 5s = 200s = ~3.3 minutes)

    pollInterval.current = setInterval(async () => {
      pollCount++;
      setPollCount(pollCount);
      console.log(`Poll attempt ${pollCount}/${maxPolls} for queryId:`, analysis?.queryId);

      try {
        const result = await api.getAnalysisResults(analysis.queryId);
        console.log('Poll response:', result);

        // Handle both possible response structures
        const queryData = result.data || result.query || {};
        const resultData = result.data || result.result || {};

        // Update progress if available
        if (result.progress || queryData.progress) {
          const progressData = result.progress || queryData.progress;
          console.log('Updating progress:', progressData);
          setProgress(progressData);
          setCurrentStep(progressData.step || queryData.metadata?.currentStep);
          setEstimatedTimeRemaining(progressData.estimatedTimeRemaining);
        }

        // Check status from multiple possible locations
        const status = queryData.status || resultData.status || analysis.status;
        console.log('Current status:', status);

        // Check if completed
        if (status === 'completed') {
          console.log('Analysis completed, stopping polling');
          setProgress({ current: 6, total: 6, percentage: 100 });
          setCurrentStep('completed');

          // Update analysis state
          setAnalysis((prev) => ({
            ...prev,
            status: 'completed',
            completedAt: new Date().toISOString(),
          }));

          stopPolling();
          stopTimer();

          toast.success('Analysis completed successfully!');

          // Wait a moment then navigate to results
          setTimeout(() => {
            navigate(`/analysis/${analysis.queryId}`);
            if (onComplete) onComplete(analysis.queryId);
          }, 20000);
          return;
        }

        // Check if failed
        if (status === 'failed') {
          console.log('Analysis failed, stopping polling');
          setError('Analysis failed during processing');
          stopPolling();
          stopTimer();
          if (onError) onError('Analysis failed');
          return;
        }

        // Update analysis with latest data if still processing
        if (status === 'processing') {
          setAnalysis((prev) => ({
            ...prev,
            status: status,
            metadata: queryData.metadata || prev.metadata,
          }));
        }

        // Check if we've reached max polls
        if (pollCount >= maxPolls) {
          console.log('Max polling attempts reached, stopping');
          stopPolling();
          stopTimer();
          setError('Analysis is taking longer than expected. Please check back later.');
          toast.error('Analysis timeout - please check back later');
          return;
        }
      } catch (error) {
        console.error('Polling error:', error);

        // If it's a 304 (Not Modified), that's actually OK - it means no changes
        if (error.response?.status === 304) {
          console.log('304 Not Modified - analysis still processing');
          return; // Continue polling
        }

        // For other errors, increment error count but don't stop immediately
        pollCount += 2; // Penalize errors more heavily

        // Only stop on critical errors or too many failures
        if (pollCount >= maxPolls || error.response?.status >= 400) {
          console.error('Stopping polling due to persistent errors');
          stopPolling();
          stopTimer();
          setError('Error checking analysis status');
          return;
        }
      }
    }, 5000); // Poll every 5 seconds instead of 3
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
      setIsPolling(false);
      setPollCount(0);
      console.log('Polling stopped');
    }
  };

  const startTimer = () => {
    timeInterval.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timeInterval.current) {
      clearInterval(timeInterval.current);
      timeInterval.current = null;
    }
  };

  const getStepStatus = (stepId, stepIndex) => {
    if (error) return 'error';
    if (!analysis || analysis.status !== 'processing') {
      return analysis?.status === 'completed' ? 'completed' : 'pending';
    }

    // Determine status based on current progress
    let currentStepIndex = 0;

    // Map currentStep to index
    const stepMapping = {
      planning_search: 0,
      gathering_data: 1,
      processing_data: 2,
      analyzing_trends: 3,
      generating_report: 4,
      creating_visualizations: 5,
      completed: 6,
    };

    if (currentStep && stepMapping[currentStep] !== undefined) {
      currentStepIndex = stepMapping[currentStep];
    } else if (progress.current) {
      currentStepIndex = Math.max(0, progress.current - 1);
    }

    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'pending';
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'current':
        return 'blue';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analysis details...</p>
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
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">Analysis Error</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
            >
              Start New Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No analysis state
  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Analysis Not Found</h2>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Multi-Agent Analysis</h1>
                  <p className="text-gray-600">LangChain • 6 Specialized AI Agents</p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                  <Clock className="h-4 w-4" />
                  <span>Elapsed: {formatTime(elapsedTime)}</span>
                </div>
                {estimatedTimeRemaining && (
                  <div className="text-xs text-gray-400 mb-1">
                    Est. remaining: {formatTime(estimatedTimeRemaining)}
                  </div>
                )}
                {isPolling && (
                  <div className="text-xs text-blue-600 flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Checking status... ({pollCount})</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Query:</p>
              <p className="font-medium text-gray-900">{analysis.query}</p>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold text-gray-900 capitalize">{analysis.status}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Progress</p>
                <p className="font-semibold text-gray-900">
                  {progress.current || 0}/{progress.total || 6} Steps
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Agents</p>
                <p className="font-semibold text-gray-900">
                  {analysis.status === 'processing' ? '6 Agents' : 'Standby'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Runtime</p>
                <p className="font-semibold text-gray-900">{formatTime(elapsedTime)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Analysis Progress</h3>
            <span className="text-sm text-gray-500">
              {Math.round((progress.current / progress.total) * 100) || 0}% Complete
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
              initial={{ width: '0%' }}
              animate={{
                width: `${Math.min(100, (progress.current / progress.total) * 100 || 0)}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Agent Steps */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Multi-Agent Workflow</h3>

          <div className="space-y-4">
            <AnimatePresence>
              {agentSteps.map((step, index) => {
                const status = getStepStatus(step.id, index);
                const isActive = status === 'current';
                const isCompleted = status === 'completed';
                const isError = status === 'error';

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative flex items-center space-x-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                      isCompleted
                        ? 'bg-green-50 border-green-200'
                        : isActive
                          ? 'bg-blue-50 border-blue-200 shadow-md'
                          : isError
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {/* Step Number & Icon */}
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-gray-500 w-8">#{index + 1}</div>

                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                          isCompleted
                            ? 'bg-green-100 text-green-600'
                            : isActive
                              ? 'bg-blue-100 text-blue-600'
                              : isError
                                ? 'bg-red-100 text-red-600'
                                : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : isActive ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : isError ? (
                          <AlertCircle className="h-6 w-6" />
                        ) : (
                          <step.icon className="h-6 w-6" />
                        )}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4
                            className={`font-semibold ${
                              isCompleted
                                ? 'text-green-900'
                                : isActive
                                  ? 'text-blue-900'
                                  : isError
                                    ? 'text-red-900'
                                    : 'text-gray-700'
                            }`}
                          >
                            {step.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-1">{step.description}</p>
                          <div className="flex items-center space-x-2 text-xs">
                            <span
                              className={`px-2 py-1 rounded-full ${
                                isCompleted
                                  ? 'bg-green-100 text-green-700'
                                  : isActive
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {step.agent}
                            </span>
                            {!isCompleted && !isError && (
                              <span className="text-gray-500">~{step.estimatedDuration}s</span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="text-right">
                          {isCompleted && (
                            <span className="text-sm text-green-600 font-medium">Completed</span>
                          )}
                          {isActive && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-blue-600 font-medium">Processing</span>
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                <div
                                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                  style={{ animationDelay: '0.1s' }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                  style={{ animationDelay: '0.2s' }}
                                ></div>
                              </div>
                            </div>
                          )}
                          {isError && (
                            <span className="text-sm text-red-600 font-medium">Error</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Active Step Pulse Effect */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 border-2 border-blue-400 rounded-lg"
                        animate={{
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Completion Message */}
          {analysis.status === 'completed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6 text-center"
            >
              <div className="flex items-center justify-center space-x-2 mb-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <Sparkles className="h-6 w-6 text-green-500" />
              </div>
              <h4 className="text-lg font-semibold text-green-900 mb-2">
                Analysis Completed Successfully!
              </h4>
              <p className="text-green-700 mb-4">
                Your comprehensive market intelligence report is ready for review.
              </p>
              <div className="text-sm text-green-600">Redirecting to results in a moment...</div>
            </motion.div>
          )}

          {/* Processing Message */}
          {analysis.status === 'processing' && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div>
                  <h4 className="font-medium text-blue-900">Multi-agent analysis in progress...</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Our AI agents are collaborating to deliver comprehensive market insights.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisProgress;
