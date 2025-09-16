import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Keep your existing imports
import Dashboard from './components/Dashboard';
import AnalysisProgress from './components/AnalysisProgress';
import AnalysisResults from './components/AnalysisResults';
import RecentAnalyses from './components/RecentAnalyses';
import SystemStatus from './components/SystemStatus';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import UserProfile from './components/UserProfile';
import ExportManager from './components/ExportManager';
import Toast from './components/Toast';
import Layout from './components/Layout';

// Keep your existing API service
import { api } from './services/api';

const AppContent = () => {
  // Keep your existing state - just add router integration
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showExportManager, setShowExportManager] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Keep your existing toast system
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // UPDATED: Analysis workflow with navigation
  const handleStartAnalysis = async (query) => {
    try {
      addToast('Starting multi-agent analysis...', 'info');

      const response = await api.startAnalysis({
        query: query.trim(),
        userId: 'demo-user-1',
        priority: 1,
        tags: ['market-research'],
        framework: 'langchain-multiagent',
        options: {
          searchDepth: 'advanced',
          maxResults: 15,
          includeCharts: true,
          reportFormat: 'comprehensive',
        },
      });

      if (response.success) {
        const analysisData = {
          queryId: response.data.queryId,
          query: query.trim(),
          status: 'processing',
          startTime: new Date(),
          framework: 'LangChain Multi-Agent',
        };

        setCurrentAnalysis(analysisData);
        addToast('Analysis started! 5 AI agents are now working on your query.', 'success');
        setRefreshTrigger((prev) => prev + 1);

        // Navigate to progress page with queryId
        navigate(`/analysis/${response.data.queryId}/progress`);
      } else {
        addToast('Failed to start analysis. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Analysis start failed:', error);
      addToast(`Failed to start analysis: ${error.message}`, 'error');
    }
  };

  // Keep your existing handlers
  const handleAnalysisComplete = (queryId) => {
    addToast('Analysis completed successfully! Generating results...', 'success');
    setRefreshTrigger((prev) => prev + 1);
    // Navigate to results instead of changing view
    navigate(`/analysis/${queryId}`);
  };

  const handleAnalysisError = (error) => {
    addToast(`Analysis failed: ${error}`, 'error');
    navigate('/'); // Navigate to dashboard
    setCurrentAnalysis(null);
  };

  const handleSelectAnalysis = (analysis) => {
    console.log('handleSelectAnalysis called with:', analysis);

    const analysisData = {
      queryId: analysis.queryId || analysis._id,
      query: analysis.query || analysis.queryText,
      status: analysis.status,
      framework: analysis.framework || 'LangChain Multi-Agent',
      createdAt: analysis.createdAt,
      priority: analysis.priority,
      tags: analysis.tags,
    };

    console.log('Processed analysis data:', analysisData);
    setCurrentAnalysis(analysisData);

    // Navigate based on status
    if (analysis.status === 'completed') {
      console.log('Navigating to results page');
      navigate(`/analysis/${analysisData.queryId}`);
    } else if (analysis.status === 'processing') {
      console.log('Navigating to progress page');
      navigate(`/analysis/${analysisData.queryId}/progress`);
    } else {
      console.log('Unknown status:', analysis.status);
      navigate(`/analysis/${analysisData.queryId}`);
    }
  };

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              onStartAnalysis={handleStartAnalysis}
              onSelectAnalysis={handleSelectAnalysis}
              refreshTrigger={refreshTrigger}
            />
          }
        />

        <Route
          path="/analysis/:queryId/progress"
          element={
            <AnalysisProgress
              analysis={currentAnalysis}
              onComplete={handleAnalysisComplete}
              onError={handleAnalysisError}
            />
          }
        />

        <Route
          path="/analysis/:queryId"
          element={
            <AnalysisResults
              analysis={currentAnalysis}
              onStartNew={() => navigate('/')}
              onExport={(queryId) => setShowExportManager(true)}
            />
          }
        />

        <Route path="/analytics" element={<AnalyticsDashboard />} />

        <Route
          path="/history"
          element={
            <RecentAnalyses
              onSelectAnalysis={handleSelectAnalysis}
              refreshTrigger={refreshTrigger}
            />
          }
        />

        <Route path="/profile" element={<UserProfile />} />
      </Routes>

      {/* Keep your existing toast system */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Keep your existing export manager */}
      {showExportManager && (
        <ExportManager
          queryId={currentAnalysis?.queryId}
          onClose={() => setShowExportManager(false)}
        />
      )}

      {/* Add Toaster for better notifications */}
      <Toaster position="top-right" />
    </Layout>
  );
};

const App = () => {
  return <AppContent />;
};

export default App;
