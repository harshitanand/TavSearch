import React, { useState } from 'react';
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

const Dashboard = ({ onStartAnalysis, onSelectAnalysis, refreshTrigger }) => {
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

    // Use the passed prop if available, otherwise fall back to local implementation
    if (typeof onStartAnalysis === 'function') {
      onStartAnalysis(query.trim());
      setQuery(''); // Clear the input
      return;
    }

    // Fallback local implementation
    setIsAnalyzing(true);
    const analysisToast = toast.loading('Starting market intelligence analysis...');

    try {
      const response = await api.startAnalysis({
        query: query.trim(),
        userId: 'demo-user-1',
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
        const result = await api.getAnalysisResults(queryId);

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
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setIsAnalyzing(false);
          toast.error('Analysis timeout. Please try again.');
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else {
          setIsAnalyzing(false);
          toast.error('Failed to check analysis status.');
        }
      }
    };

    poll();
  };

  const handleExampleQuery = (exampleQuery) => {
    setQuery(exampleQuery);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  // Handle analysis selection - use prop if available
  const handleSelectAnalysis = (analysis) => {
    if (typeof onSelectAnalysis === 'function') {
      onSelectAnalysis(analysis);
    } else {
      // Fallback behavior
      console.log('Selected analysis:', analysis);
      if (analysis.status === 'completed') {
        navigate(`/results/${analysis._id}`);
      } else {
        toast.info(`Analysis is currently ${analysis.status}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-6">
            <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-purple-600 font-medium">AI-Powered Market Intelligence</span>
          </div>

          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Unlock Market Insights with
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {' '}
              5 AI Agents
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Our advanced LangChain multi-agent system combines real-time web search, intelligent
            analysis, and professional reporting to deliver comprehensive market intelligence in
            minutes.
          </p>

          {/* Search Interface */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about any market, industry, or business topic..."
                className="w-full px-6 py-4 text-lg border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg"
                disabled={isAnalyzing}
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !query.trim()}
                className="absolute right-2 top-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2 inline" />
                    Analyze
                  </>
                )}
              </button>
            </div>

            {/* Example Queries */}
            <div className="mt-4 text-sm text-gray-600">
              <p className="mb-2">Try these examples:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {exampleQueries.slice(0, 4).map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleQuery(example)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                    disabled={isAnalyzing}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Analysis Progress */}
        {(isAnalyzing || currentAnalysis) && (
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
          <RecentAnalyses onSelectAnalysis={handleSelectAnalysis} refreshTrigger={refreshTrigger} />
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
