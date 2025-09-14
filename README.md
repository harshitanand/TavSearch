# Market Intelligence System

A comprehensive multi-agent system for automated market research and business intelligence analysis.

## 🚀 Features

- **Multi-Agent Architecture**: Coordinated AI agents for search, analysis, and synthesis
- **Real-time Web Data**: Integration with Tavily API for current market information
- **Professional Reports**: Automated generation of business-grade analysis reports
- **Multiple Export Formats**: PDF, Excel, CSV, JSON, and HTML exports
- **User Management**: Role-based access control and usage analytics
- **Scalable Infrastructure**: Built for AWS deployment with MongoDB Atlas

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Search Agent  │    │ Analysis Agent  │    │ Synthesis Agent │
│                 │    │                 │    │                 │
│ • Query planning│    │ • Data cleaning │    │ • Report gen    │
│ • Tavily search │    │ • Trend analysis│    │ • Visualization │
│ • Data gathering│    │ • Insights      │    │ • Export formats│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Workflow Service│
                    │                 │
                    │ • Orchestration │
                    │ • State mgmt    │
                    │ • Error handling│
                    └─────────────────┘
```

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Cache**: Redis
- **AI/ML**: OpenAI GPT, Tavily API
- **Authentication**: JWT
- **Deployment**: AWS Elastic Beanstalk
- **Testing**: Jest, Supertest
- **Documentation**: Swagger/OpenAPI

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/market-intelligence-system.git
   cd market-intelligence-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and database URLs
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3000

# API Keys
OPENAI_API_KEY=your_openai_key
TAVILY_API_KEY=your_tavily_key
JWT_SECRET=your_jwt_secret

# Database
MONGODB_URI=mongodb://localhost:27017/market_intelligence
REDIS_URL=redis://localhost:6379

# AWS (for deployment)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Docker
```bash
docker-compose up
```

### AWS Elastic Beanstalk
```bash
npm run deploy:aws
```

## 📚 API Documentation

### Authentication
All endpoints require authentication via JWT token or user ID header.

### Core Endpoints

#### Start Analysis
```http
POST /api/analysis
Content-Type: application/json

{
  "query": "Electric vehicle market trends",
  "priority": 1,
  "tags": ["automotive", "electric"]
}
```

#### Get Results
```http
GET /api/analysis/{queryId}/results
```

#### Export Results
```http
GET /api/export/{queryId}/{format}
```
Supported formats: `json`, `pdf`, `csv`, `xlsx`, `html`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 📊 Monitoring

The system includes comprehensive logging and monitoring:

- **Winston**: Structured logging
- **Performance Metrics**: Request timing and success rates
- **Error Tracking**: Detailed error logging with stack traces
- **Analytics**: User behavior and system usage analytics

## 🔒 Security

- **Helmet**: Security headers
- **Rate Limiting**: API request throttling
- **Input Validation**: Request sanitization
- **CORS**: Cross-origin resource sharing controls
- **JWT**: Secure authentication tokens

## 📈 Performance

- **Caching**: Redis for frequently accessed data
- **Database Optimization**: Indexed queries and aggregations
- **Compression**: Gzip response compression
- **Connection Pooling**: Efficient database connections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
