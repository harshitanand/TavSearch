import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'demo-user-1',
      },
    });

    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message);
      }
    );
  }

  // ==================== ANALYSIS ENDPOINTS ====================
  async startAnalysis(data) {
    return this.client.post('/api/analysis', data);
  }

  async getAnalysisStatus(queryId) {
    return this.client.get(`/api/analysis/${queryId}/status`);
  }

  async getAnalysisResults(queryId) {
    console.log('Fetching analysis results for queryId:', queryId);
    return this.client.get(`/api/analysis/${queryId}/results`);
  }

  async getUserAnalyses(params = {}) {
    return this.client.get('/api/analysis', { params });
  }

  async getRecentAnalyses(params = {}) {
    return this.client.get('/api/analysis/recent', { params });
  }

  async getAnalysisStats(params = {}) {
    return this.client.get('/api/analysis/stats', { params });
  }

  async getWorkflowDiagram() {
    return this.client.get('/api/analysis/workflow/diagram');
  }

  async cancelAnalysis(queryId) {
    return this.client.delete(`/api/analysis/${queryId}`);
  }

  async retryAnalysis(queryId) {
    return this.client.post(`/api/analysis/${queryId}/retry`);
  }

  // ==================== EXPORT ENDPOINTS ====================
  async getExportFormats(queryId) {
    return this.client.get(`/api/export/${queryId}/formats`);
  }

  async exportResults(queryId, format) {
    const response = await this.client.get(`/api/export/${queryId}/${format}`, {
      responseType: format === 'json' ? 'json' : 'blob',
    });
    return response;
  }

  async getExportHistory(params = {}) {
    return this.client.get('/api/export/history', { params });
  }

  async downloadExport(exportId) {
    return this.client.get(`/api/export/download/${exportId}`, {
      responseType: 'blob',
    });
  }

  async getExportStatus(exportId) {
    return this.client.get(`/api/export/status/${exportId}`);
  }

  // ==================== USER ENDPOINTS ====================
  async getUserProfile() {
    return this.client.get('/api/users/profile');
  }

  async updateUserProfile(data) {
    return this.client.put('/api/users/profile', data);
  }

  async getUserUsage(params = {}) {
    return this.client.get('/api/users/usage', { params });
  }

  async getUserAnalyticsFromUsers(params = {}) {
    return this.client.get('/api/users/analytics', { params });
  }

  // Admin endpoints
  async getAllUsers(params = {}) {
    return this.client.get('/api/users', { params });
  }

  async getUserById(userId) {
    return this.client.get(`/api/users/${userId}`);
  }

  async updateUserSubscription(userId, data) {
    return this.client.put(`/api/users/${userId}/subscription`, data);
  }

  // ==================== ANALYTICS ENDPOINTS ====================
  async getUserAnalytics(params = {}) {
    return this.client.get('/api/analytics/user', { params });
  }

  async getQueryTrends(params = {}) {
    return this.client.get('/api/analytics/trends', { params });
  }

  async getUsageStats(params = {}) {
    return this.client.get('/api/analytics/usage', { params });
  }

  async getDashboardMetrics(params = {}) {
    return this.client.get('/api/analytics/dashboard', { params });
  }

  // Admin analytics
  async getSystemAnalytics(params = {}) {
    return this.client.get('/api/analytics/system', { params });
  }

  async getPerformanceMetrics(params = {}) {
    return this.client.get('/api/analytics/performance', { params });
  }

  // ==================== SYSTEM ENDPOINTS ====================
  async healthCheck() {
    return this.client.get('/health');
  }

  async getSystemStatus() {
    return this.client.get('/api/analysis/system/status');
  }
}

export const api = new ApiService();
export default api;
