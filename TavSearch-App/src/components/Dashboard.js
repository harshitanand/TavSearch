import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  TrendingUp,
  Users,
  FileText,
  Loader2,
  Sparkles,
  BarChart3,
  Target,
  Lightbulb,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import AnalysisProgress from './AnalysisProgress';
import RecentAnalyses from './RecentAnalyses';

const Dashboard = () => {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const navigate = useNavigate();

  const exampleQueries = [
    'Electric vehicle market trends 2024',
    'AI software companies competitive analysis',
    'Renewable energy investment opportunities',
    'Fintech startup landscape in Southeast Asia',
    'E-commerce platform market share analysis',
    'Autonomous vehicle technology adoption',
    'Sustainable packaging solutions market',
    'Remote work software industry analysis',
  ];

  const handleAnalyze = async () => {
    if (!query.trim()) {
      toast.error('Please enter a market research query');
      return;
    }

    setIsAnalyzing(true);
    const analysisToast = toast.loading('Starting market intelligence analysis...');

    try {
      const response = await api.startAnalysis({
        query: query.trim(),
        userId: 'demo-user',
      });

      if (response.success) {
        setCurrentAnalysis({
          queryId: response.data.queryId,
          query: query.trim(),
          startTime: new Date(),
          status: 'processing',
        });

        toast.success('Analysis started! You can track progress below.', {
          id: analysisToast,
        });

        // Poll for results
        pollForResults(response.data.queryId);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Failed to start analysis. Please try again.', {
        id: analysisToast,
      });
      setIsAnalyzing(false);
    }
  };

  const pollForResults = async (queryId) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const result = await api.getResults(queryId);

        if (result.query.status === 'completed' && result.result) {
          setIsAnalyzing(false);
          setCurrentAnalysis((prev) => ({ ...prev, status: 'completed' }));
          toast.success('Analysis completed! Redirecting to results...');

          // Redirect to results page after a short delay
          setTimeout(() => {
            navigate(`/results/${queryId}`);
          }, 2000);
        } else if (result.query.status === 'failed') {
          setIsAnalyzing(false);
          setCurrentAnalysis((prev) => ({ ...prev, status: 'failed' }));
          toast.error('Analysis failed. Please try again.');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else {
          setIsAnalyzing(false);
          toast.error('Analysis timeout. Please try again.');
        }
      } catch (error) {
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else {
          setIsAnalyzing(false);
          toast.error('Failed to get results. Please try again.');
        }
      }
    };

    poll();
  };

  const handleExampleClick = (example) => {
    setQuery(example);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isAnalyzing) {
      handleAnalyze();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Market Intelligence System</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            AI-powered market research and competitive analysis platform. Get comprehensive insights
            in minutes, not weeks.
          </p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto mb-12"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center mb-4">
              <Sparkles className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">New Market Analysis</h2>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your market research question..."
                  className="w-full px-6 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  disabled={isAnalyzing}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !query.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                    <span>{isAnalyzing ? 'Analyzing...' : 'Analyze'}</span>
                  </button>
                </div>
              </div>

              {/* Example Queries */}
              <div>
                <p className="text-sm text-gray-600 mb-3">Try these examples:</p>
                <div className="flex flex-wrap gap-2">
                  {exampleQueries.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      disabled={isAnalyzing}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Current Analysis Progress */}
        {currentAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto mb-12"
          >
            <AnalysisProgress analysis={currentAnalysis} isAnalyzing={isAnalyzing} />
          </motion.div>
        )}

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
        >
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="p-3 bg-blue-100 rounded-full w-fit mb-4">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Search</h3>
            <p className="text-gray-600">
              Advanced search algorithms gather data from thousands of sources in real-time
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="p-3 bg-green-100 rounded-full w-fit mb-4">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Trend Analysis</h3>
            <p className="text-gray-600">
              Identify emerging trends and market opportunities with intelligent pattern recognition
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="p-3 bg-purple-100 rounded-full w-fit mb-4">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Professional Reports</h3>
            <p className="text-gray-600">
              Generate comprehensive, business-ready reports with visualizations and insights
            </p>
          </div>
        </motion.div>

        {/* Recent Analyses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <RecentAnalyses />
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
