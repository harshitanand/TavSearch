import React, { useState } from 'react';
import {
  FileText,
  Zap,
  Home,
  BarChart3,
  User,
  Download,
  Menu,
  X,
  Settings,
  Activity,
  Sparkles,
  Shield,
} from 'lucide-react';

// Import ALL components
import Dashboard from './components/Dashboard';
import AnalysisProgress from './components/AnalysisProgress';
import AnalysisResults from './components/AnalysisResults';
import RecentAnalyses from './components/RecentAnalyses';
import SystemStatus from './components/SystemStatus';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import UserProfile from './components/UserProfile';
import ExportManager from './components/ExportManager';
import Toast from './components/Toast';

// Import API service
import { api } from './services/api';

const App = () => {
  // Main state management
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showExportManager, setShowExportManager] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navigation configuration
  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, description: 'Start new analysis' },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, description: 'View insights & trends' },
    { id: 'profile', name: 'Profile', icon: User, description: 'Manage account' },
    { id: 'exports', name: 'Exports', icon: Download, description: 'Download reports' },
  ];

  // Toast notification system
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Analysis workflow handlers
  const handleStartAnalysis = async (query) => {
    try {
      addToast('Starting multi-agent analysis...', 'info');

      const response = await api.startAnalysis({
        query: query.trim(),
        userId: 'demo-user',
        priority: 'normal',
        tags: ['market-research'],
        framework: 'langchain-multiagent',
      });

      if (response.success) {
        setCurrentAnalysis({
          queryId: response.data.queryId,
          query: query.trim(),
          status: 'processing',
          startTime: new Date(),
          framework: 'LangChain Multi-Agent',
        });
        setCurrentView('analyzing');
        addToast('Analysis started! 5 AI agents are now working on your query.', 'success');
        setRefreshTrigger((prev) => prev + 1);
      } else {
        addToast('Failed to start analysis. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Analysis start failed:', error);
      addToast(`Failed to start analysis: ${error.message}`, 'error');
    }
  };

  const handleAnalysisComplete = (queryId) => {
    addToast('Analysis completed successfully! Generating results...', 'success');
    setTimeout(() => {
      setCurrentView('results');
      setRefreshTrigger((prev) => prev + 1);
    }, 1500);
  };

  const handleAnalysisError = (error) => {
    addToast(`Analysis failed: ${error}`, 'error');
    setTimeout(() => {
      setCurrentView('dashboard');
      setCurrentAnalysis(null);
    }, 3000);
  };

  const handleStartNew = () => {
    setCurrentView('dashboard');
    setCurrentAnalysis(null);
  };

  const handleSelectAnalysis = (analysis) => {
    setCurrentAnalysis({
      queryId: analysis._id,
      query: analysis.queryText,
      status: analysis.status,
      framework: analysis.framework || 'LangChain Multi-Agent',
    });

    if (analysis.status === 'completed') {
      setCurrentView('results');
    } else if (analysis.status === 'processing') {
      setCurrentView('analyzing');
    } else {
      addToast(`Analysis status: ${analysis.status}`, 'info');
    }
  };

  // Navigation handler
  const handleNavigation = (viewId) => {
    setCurrentView(viewId);
    setSidebarOpen(false);

    // Reset analysis context when navigating away from analysis views
    if (!['dashboard', 'analyzing', 'results'].includes(viewId)) {
      setCurrentAnalysis(null);
    }
  };

  // Export handlers
  const handleOpenExportManager = (queryId = null) => {
    if (queryId && queryId !== currentAnalysis?.queryId) {
      setCurrentAnalysis((prev) => ({ ...prev, queryId }));
    }
    setShowExportManager(true);
  };

  // Render different views
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-gray-900">AI-Powered Market Intelligence</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Leverage our advanced LangChain multi-agent system with 5 specialized AI agents
                working together to deliver comprehensive market analysis in minutes.
              </p>
            </div>

            <Dashboard
              onStartAnalysis={handleStartAnalysis}
              onSelectAnalysis={handleSelectAnalysis}
              refreshTrigger={refreshTrigger}
            />
          </div>
        );

      case 'analyzing':
        return currentAnalysis ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Multi-Agent Analysis in Progress
                </h2>
                <p className="text-gray-600 mt-2">
                  Our specialized AI agents are collaborating to analyze your query
                </p>
                <p className="text-sm text-blue-600 mt-1">Framework: {currentAnalysis.framework}</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleStartNew}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Start New Analysis
                </button>
              </div>
            </div>

            <AnalysisProgress
              queryId={currentAnalysis.queryId}
              query={currentAnalysis.query}
              onComplete={handleAnalysisComplete}
              onError={handleAnalysisError}
            />

            <SystemStatus />
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No active analysis. Start a new one from the dashboard.</p>
            <button
              onClick={() => handleNavigation('dashboard')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        );

      case 'results':
        return currentAnalysis ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Analysis Results</h2>
                <p className="text-gray-600 mt-2">Comprehensive market intelligence report</p>
                <p className="text-sm text-green-600 mt-1">
                  Generated by: {currentAnalysis.framework}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleOpenExportManager(currentAnalysis.queryId)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Results</span>
                </button>
                <button
                  onClick={handleStartNew}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  New Analysis
                </button>
              </div>
            </div>

            <AnalysisResults queryId={currentAnalysis.queryId} onStartNew={handleStartNew} />
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No results to display. Complete an analysis first.</p>
            <button
              onClick={() => handleNavigation('dashboard')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Analysis
            </button>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
                <p className="text-gray-600 mt-2">Comprehensive insights and performance metrics</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <Activity className="h-4 w-4" />
                <span>Real-time Data</span>
              </div>
            </div>
            <AnalyticsDashboard />
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">User Profile</h2>
                <p className="text-gray-600 mt-2">Manage your account and preferences</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <Settings className="h-4 w-4" />
                <span>Account Settings</span>
              </div>
            </div>
            <UserProfile />
          </div>
        );

      case 'exports':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Export Management</h2>
                <p className="text-gray-600 mt-2">Download and manage your analysis reports</p>
              </div>
              <button
                onClick={() => handleOpenExportManager()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Open Export Manager</span>
              </button>
            </div>

            {/* Export overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <Download className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Available Formats</p>
                    <p className="text-xl font-bold text-gray-900">PDF, JSON, CSV, XLSX</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <Activity className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Export History</p>
                    <p className="text-xl font-bold text-gray-900">View Past Downloads</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <Settings className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Auto-Export</p>
                    <p className="text-xl font-bold text-gray-900">Configure Settings</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Analyses for Export */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Analyses</h3>
              <RecentAnalyses
                onSelectAnalysis={handleSelectAnalysis}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        );

      default:
        return (
          <Dashboard
            onStartAnalysis={handleStartAnalysis}
            onSelectAnalysis={handleSelectAnalysis}
            refreshTrigger={refreshTrigger}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">TavSearch AI</h1>
              <p className="text-xs text-gray-600">Multi-Agent System</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                currentView === item.id ||
                (currentView === 'analyzing' && item.id === 'dashboard') ||
                (currentView === 'results' && item.id === 'dashboard');
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                  />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* System Status in Sidebar */}
        <div className="mt-8 px-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">System Status</h4>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">All Systems Operational</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <div>🤖 5 AI Agents Active</div>
              <div>🔍 Real-time Search Ready</div>
              <div>📊 Analytics Processing</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center space-y-1">
            <div className="flex items-center justify-center space-x-1">
              <Sparkles className="h-3 w-3" />
              <span>LangChain Multi-Agent</span>
            </div>
            <div>v2.0.0 • Enterprise Ready</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Online</span>
          </div>
        </div>

        {/* Page Content */}
        <main className="px-4 sm:px-6 lg:px-8 py-8">{renderCurrentView()}</main>
      </div>

      {/* Export Manager Modal */}
      {showExportManager && (
        <ExportManager
          queryId={currentAnalysis?.queryId}
          onClose={() => setShowExportManager(false)}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Global Styles */}
      <style jsx>{`
        .transition-transform {
          transition-property: transform;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 300ms;
        }
      `}</style>
    </div>
  );
};

export default App;
