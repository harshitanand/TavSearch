const request = require('supertest');
const app = require('../../src/app');

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app.app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Analysis API', () => {
    it('should start analysis', async () => {
      const response = await request(app.app)
        .post('/api/analysis')
        .send({
          query: 'Test market analysis query'
        })
        .set('x-user-id', 'test-user')
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('queryId');
    });

    it('should validate query input', async () => {
      const response = await request(app.app)
        .post('/api/analysis')
        .send({
          query: 'x' // Too short
        })
        .set('x-user-id', 'test-user')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('User API', () => {
    it('should get user profile', async () => {
      const response = await request(app.app)
        .get('/api/users/profile')
        .set('x-user-id', 'test-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userId');
    });
  });
});
