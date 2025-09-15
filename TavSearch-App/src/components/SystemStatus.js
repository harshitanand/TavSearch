import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  FileText,
  Zap,
  Loader2,
  CheckCircle,
  XCircle,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';

const useHealthCheck = () => {
  const [isHealthy, setIsHealthy] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);

  const checkHealth = React.useCallback(async () => {
    try {
      await api.healthCheck();
      setIsHealthy(true);
      setLastCheck(new Date());
    } catch (error) {
      setIsHealthy(false);
      setLastCheck(new Date());
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { isHealthy, lastCheck, checkHealth };
};

const SystemStatus = () => {
  const { isHealthy, lastCheck } = useHealthCheck();
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const response = await api.getSystemStatus();
        setSystemStatus(response.data);
      } catch (error) {
        console.error('Failed to fetch system status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemStatus();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span>Checking system status...</span>
        </div>
      </div>
    );
  }

  const statusColor = isHealthy ? 'text-green-600' : 'text-red-600';
  const statusText = isHealthy ? 'Operational' : 'Issues Detected';
  const StatusIcon = isHealthy ? CheckCircle : XCircle;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
        <div className="flex items-center space-x-2">
          <StatusIcon className={`h-5 w-5 ${statusColor}`} />
          <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="bg-blue-100 p-2 rounded-full w-fit mx-auto mb-2">
            <Brain className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Framework</p>
          <p className="text-xs text-gray-600">{systemStatus?.framework || 'LangChain'}</p>
        </div>
        <div className="text-center">
          <div className="bg-green-100 p-2 rounded-full w-fit mx-auto mb-2">
            <Search className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Search API</p>
          <p className="text-xs text-gray-600">Tavily</p>
        </div>
        <div className="text-center">
          <div className="bg-purple-100 p-2 rounded-full w-fit mx-auto mb-2">
            <FileText className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Database</p>
          <p className="text-xs text-gray-600">MongoDB</p>
        </div>
        <div className="text-center">
          <div className="bg-orange-100 p-2 rounded-full w-fit mx-auto mb-2">
            <Zap className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">AI Model</p>
          <p className="text-xs text-gray-600">GPT-4</p>
        </div>
      </div>

      {lastCheck && (
        <p className="text-xs text-gray-500 mt-4 text-center">
          Last checked: {lastCheck.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

export default SystemStatus;
