import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth
apiClient.interceptors.request.use(
  (config) => {
    // Add user ID header for demo purposes
    config.headers['x-user-id'] = 'demo-user';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);

    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }

    throw new Error(error.response?.data?.message || 'An error occurred');
  }
);

export const api = {
  // Analysis endpoints
  startAnalysis: async (data) => {
    return await apiClient.post('/api/analysis', data);
  },

  getResults: async (queryId) => {
    return await apiClient.get(`/api/analysis/${queryId}/results`);
  },

  getAnalysisStatus: async (queryId) => {
    return await apiClient.get(`/api/analysis/${queryId}/status`);
  },

  getUserAnalyses: async (userId, params = {}) => {
    return await apiClient.get(`/api/analysis`, { params });
  },

  cancelAnalysis: async (queryId) => {
    return await apiClient.delete(`/api/analysis/${queryId}`);
  },

  retryAnalysis: async (queryId) => {
    return await apiClient.post(`/api/analysis/${queryId}/retry`);
  },

  // Export endpoints
  exportResults: async (queryId, format) => {
    const response = await apiClient.get(`/api/export/${queryId}/${format}`, {
      responseType: format === 'json' ? 'json' : 'blob',
    });
    return response;
  },

  getExportFormats: async (queryId) => {
    return await apiClient.get(`/api/export/${queryId}/formats`);
  },

  getExportHistory: async () => {
    return await apiClient.get('/api/export/history');
  },

  // User endpoints
  getUserProfile: async () => {
    return await apiClient.get('/api/users/profile');
  },

  updateUserProfile: async (data) => {
    return await apiClient.put('/api/users/profile', data);
  },

  getUserUsage: async () => {
    return await apiClient.get('/api/users/usage');
  },

  // Analytics endpoints
  getUserAnalytics: async (params = {}) => {
    return await apiClient.get('/api/analytics/user', { params });
  },

  getQueryTrends: async (params = {}) => {
    return await apiClient.get('/api/analytics/trends', { params });
  },

  // Health check
  healthCheck: async () => {
    return await apiClient.get('/health');
  },
};

export default api;
