# TavSearch Multi-Agent System

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-%5E18.2.0-blue)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/cloud/atlas)
[![AWS](https://img.shields.io/badge/AWS-Elastic%20Beanstalk-orange)](https://aws.amazon.com/elasticbeanstalk/)

A production-ready **multi-agent market intelligence system** built with LangChain orchestration, featuring 5 specialized AI agents that collaborate to deliver comprehensive market research reports.

## 🏗️ **System Architecture**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Planner   │ -> │   Searcher  │ -> │   Analyzer  │
│   Agent     │    │   Agent     │    │   Agent     │
└─────────────┘    └─────────────┘    └─────────────┘
                                              |
┌─────────────┐    ┌─────────────┐            |
│  Validator  │ <- │ Synthesizer │ <----------┘
│   Agent     │    │   Agent     │
└─────────────┘    └─────────────┘
```

### **Multi-Agent Workflow**

- **Planner Agent:** Creates optimized search strategies
- **Searcher Agent:** Gathers real-time data via Tavily API
- **Analyzer Agent:** Processes and analyzes data using GPT-4
- **Synthesizer Agent:** Generates professional HTML reports
- **Validator Agent:** Quality control with retry logic

## 🚀 **Tech Stack**

### **Backend**

- **Framework:** Node.js + Express.js
- **AI Orchestration:** LangChain Multi-Agent System
- **LLM:** OpenAI GPT-4
- **Search API:** Tavily Search & Extract
- **Database:** MongoDB Atlas
- **Deployment:** AWS Elastic Beanstalk

### **Frontend**

- **Framework:** React 18
- **Styling:** Tailwind CSS + Framer Motion
- **Charts:** Chart.js + Recharts
- **State Management:** React Query + Zustand
- **Routing:** React Router v7

## 📋 **Prerequisites**

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **MongoDB Atlas** account
- **OpenAI API** key
- **Tavily API** key
- **AWS Account** (for deployment)

## ⚡ **Quick Start - Local Development**

### **1. Clone the Repository**

```bash
git clone https://github.com/your-username/tavsearch-multi-agent-system.git
cd tavsearch-multi-agent-system
```

### **2. Backend Setup (API Server)**

#### **Install Backend Dependencies**

```bash
# Install dependencies
npm install
```

#### **Environment Configuration**

Create a `.env` file in the backend root directory:

```env
# Environment
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/market_intelligence

# API Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
TAVILY_API_KEY=tvly-your-tavily-api-key-here
JWT_SECRET=your-secret-key-here

# CORS Configuration
FRONTEND_URL=http://localhost:3001

# Redis (Optional - for caching)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Analysis Settings
MAX_CONCURRENT_ANALYSES=5
SEARCH_TIMEOUT_MS=30000
ANALYSIS_TIMEOUT_MS=120000

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/
```

#### **Database Setup**

```bash
# Ensure MongoDB Atlas is configured
# The application will automatically connect using MONGODB_URI
# No additional setup required - schemas are created automatically
```

#### **Start Backend Server**

```bash
# Seed database
npm run db:seed

# Development mode (with hot reload)
npm run dev

# Production mode
npm start

# With PM2 (recommended for production)
npm install -g pm2
pm2 start ecosystem.config.js
```

**Backend will be running at:** `http://localhost:3000`

#### **Available Backend Scripts**

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm run lint       # Lint code
npm run lint:fix   # Fix linting issues
```

### **3. Frontend Setup (React App)**

#### **Install Frontend Dependencies**

```bash
# Navigate to frontend directory
cd TavSearch-App  # or frontend directory

# Install dependencies
npm install
```

#### **Frontend Environment Configuration**

Create a `.env.local` file in the frontend directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_EXPORTS=true
REACT_APP_ENABLE_REAL_TIME=true

# Environment
REACT_APP_ENVIRONMENT=development
```

#### **Start Frontend Server**

```bash
# Development server (with hot reload)
npm start

# Build for production
npm run build

# Preview production build
npm run preview
```

**Frontend will be running at:** `http://localhost:3001`

#### **Available Frontend Scripts**

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run lint       # Lint code
npm run lint:fix   # Fix linting issues
npm run format     # Format code with Prettier
```

### **4. Full Stack Development Workflow**

#### **Terminal 1 - Backend:**

```bash
cd backend
npm run dev
# Server running on http://localhost:3000
```

#### **Terminal 2 - Frontend:**

```bash
cd TavSearch-App
npm start
# React app running on http://localhost:3001
```

#### **Terminal 3 - Database (if local MongoDB):**

```bash
# Only if using local MongoDB instead of Atlas
mongod --dbpath /data/db
```

## 🧪 **Testing the System**

### **1. Health Check**

```bash
# Check API health
curl http://localhost:3000/health

# Check system status
curl http://localhost:3000/api/analysis/system/status
```

### **2. Start Analysis (API)**

```bash
curl -X POST http://localhost:3000/api/analysis \
  -H "Content-Type: application/json" \
  -H "x-user-id: demo-user-1" \
  -d '{
    "query": "Electric vehicle market trends 2024",
    "priority": 1,
    "tags": ["market-research", "automotive"]
  }'
```

### **3. Frontend Testing**

- Open `http://localhost:3001`
- Enter a market research query (e.g., "AI software companies competitive analysis")
- Click "Start Analysis"
- Watch real-time progress through the 5-agent workflow
- View comprehensive results with charts and export options

## 📁 **Project Structure**

```
tavsearch-multi-agent-system/
├── backend/                          # Node.js API Server
│   ├── src/
│   │   ├── controllers/             # API endpoints
│   │   │   ├── analysis.controller.js
│   │   │   ├── analytics.controller.js
│   │   │   ├── export.controller.js
│   │   │   └── users.controller.js
│   │   ├── services/                # Business logic
│   │   │   ├── analysis.service.js
│   │   │   ├── workflow.service.js
│   │   │   └── analytics.service.js
│   │   ├── workflows/               # Multi-agent orchestration
│   │   │   ├── LangChainMultiAgent.js
│   │   │   └── MarketIntelligenceGraph.js
│   │   ├── models/                  # MongoDB schemas
│   │   │   ├── Query.js
│   │   │   ├── Result.js
│   │   │   └── User.js
│   │   ├── routes/                  # API routes
│   │   ├── middleware/              # Express middleware
│   │   ├── config/                  # Configuration
│   │   └── utils/                   # Utilities
│   ├── package.json
│   ├── .env                         # Environment variables
│   └── ecosystem.config.js          # PM2 configuration
├── TavSearch-App/                    # React Frontend
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── Dashboard.js         # Main dashboard
│   │   │   ├── AnalysisProgress.js  # Real-time progress
│   │   │   ├── AnalysisResults.js   # Results display
│   │   │   ├── AnalyticsDashboard.js
│   │   │   └── SystemStatus.js
│   │   ├── services/                # API client
│   │   │   └── api.js
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── utils/                   # Frontend utilities
│   │   └── styles/                  # CSS and styling
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env.local                   # Frontend environment
├── .ebextensions/                   # AWS deployment config
├── README.md                        # This file
└── package.json                     # Root package.json
```

## 🔑 **Key Features**

### **Multi-Agent Orchestration**

- 5 specialized agents working in sequence
- Error handling and retry logic
- Real-time progress tracking
- Quality validation at each step

### **Real-time Web Search**

- Tavily API integration for live data
- Advanced search strategies
- Data extraction and preprocessing
- Source credibility validation

### **AI-Powered Analysis**

- OpenAI GPT-4 integration
- Market trend analysis
- Competitive intelligence
- Professional report generation

### **Modern UI/UX**

- Real-time progress visualization
- Interactive charts and graphs
- Multiple export formats (PDF, HTML, JSON, CSV)
- Responsive design for all devices

### **Production Ready**

- AWS Elastic Beanstalk deployment
- MongoDB Atlas integration
- Error handling and monitoring
- Rate limiting and security
- Comprehensive logging

## 🌐 **API Documentation**

### **Core Endpoints**

#### **Analysis Endpoints**

```
POST   /api/analysis              # Start new analysis
GET    /api/analysis              # Get user analyses
GET    /api/analysis/:id/status   # Get analysis status
GET    /api/analysis/:id/results  # Get analysis results
DELETE /api/analysis/:id          # Cancel analysis
POST   /api/analysis/:id/retry    # Retry failed analysis
```

#### **Export Endpoints**

```
GET    /api/export/:id/formats    # Get available formats
GET    /api/export/:id/:format    # Export analysis
GET    /api/export/history        # Get export history
```

#### **Analytics Endpoints**

```
GET    /api/analytics/user        # User analytics
GET    /api/analytics/trends      # Query trends
GET    /api/analytics/dashboard   # Dashboard metrics
```

#### **System Endpoints**

```
GET    /health                    # Health check
GET    /api/analysis/system/status # System status
GET    /docs                     # API documentation
```

### **Authentication**

Include the `x-user-id` header with all requests:

```bash
curl -H "x-user-id: demo-user-1" http://localhost:3000/api/analysis
```

#### **4. Deploy Frontend**

```bash
# Build React app
cd TavSearch-App
npm run build

# Deploy to S3 + CloudFront or Vercel
# Configure REACT_APP_API_URL to point to EB environment
```

### **MongoDB Atlas Setup**

1. Create MongoDB Atlas cluster
2. Configure network access and user permissions
3. Get connection string
4. Add to environment variables

## 🔧 **Configuration Options**

### **Analysis Settings**

```env
MAX_CONCURRENT_ANALYSES=5        # Max parallel analyses
SEARCH_TIMEOUT_MS=30000         # Search timeout
ANALYSIS_TIMEOUT_MS=120000      # Analysis timeout
```

### **Rate Limiting**

```env
RATE_LIMIT_WINDOW_MS=900000     # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100     # Max requests per window
```

### **Logging**

```env
LOG_LEVEL=info                  # debug, info, warn, error
LOG_FILE_PATH=./logs/           # Log file directory
```

## 📊 **Monitoring & Analytics**

### **System Health**

- Real-time agent status monitoring
- Database connection health
- API response times
- Error rates and handling

### **Usage Analytics**

- Query trends and patterns
- User behavior analysis
- Performance metrics
- Export statistics

### **Logging**

- Structured logging with Winston
- Request/response logging
- Error tracking and alerts
- Performance monitoring

## 🧪 **Testing**

### **Backend Tests**

```bash
cd backend
npm test                        # Run all tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:coverage          # Coverage report
```

### **Frontend Tests**

```bash
cd TavSearch-App
npm test                       # Run React tests
npm run test:coverage          # Coverage report
npm run test:e2e              # End-to-end tests
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Backend Won't Start**

```bash
# Check MongoDB connection
node -e "console.log(process.env.MONGODB_URI)"

# Verify API keys
node -e "console.log(process.env.OPENAI_API_KEY, process.env.TAVILY_API_KEY)"

# Check port availability
lsof -i :3000
```

#### **Frontend API Connection Issues**

```bash
# Verify backend is running
curl http://localhost:3000/health

# Check CORS configuration
# Ensure FRONTEND_URL matches React app URL
```

#### **Analysis Failures**

- Verify OpenAI API key has sufficient credits
- Check Tavily API key permissions
- Review MongoDB connection and permissions
- Check network connectivity for external APIs

### **Debug Mode**

```bash
# Backend debug
LOG_LEVEL=debug npm run dev

# Frontend debug
REACT_APP_DEBUG=true npm start
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **LangChain** for multi-agent orchestration
- **Tavily** for real-time web search capabilities
- **OpenAI** for GPT-4 AI analysis
- **MongoDB** for reliable data storage
- **AWS** for scalable cloud deployment

## 📞 **Support**

For support and questions:

- Create an issue in the GitHub repository

---

**Built with ❤️ using LangChain Multi-Agent Architecture**
