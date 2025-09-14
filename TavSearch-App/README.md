# Tav Search Frontend

Modern React frontend for the TavSearch System.

## Features

- **Modern UI/UX**: Built with React 18, Tailwind CSS, and Framer Motion
- **Real-time Updates**: Live progress tracking during analysis
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Professional Charts**: Interactive visualizations with Chart.js
- **Export Functionality**: Download reports in multiple formats
- **State Management**: Efficient state handling with Zustand and React Query

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── Dashboard.js   # Main dashboard
│   │   ├── Layout.js      # App layout
│   │   ├── AnalysisProgress.js
│   │   └── RecentAnalyses.js
│   ├── services/          # API services
│   │   └── api.js         # Backend API client
│   ├── styles/            # CSS and styling
│   │   └── globals.css    # Global styles
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   └── App.js             # Root component
├── tailwind.config.js     # Tailwind configuration
├── package.json           # Dependencies
└── README.md             # This file
```

## Environment Variables

Create a `.env.local` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
REACT_APP_ENABLE_ANALYTICS=true
```

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

## Key Components

### Dashboard

Main landing page with search functionality and recent analyses.

### AnalysisProgress

Real-time progress tracking component that shows the multi-agent workflow.

### AnalysisResults

Displays comprehensive analysis results with charts and export options.

### Layout

Responsive sidebar navigation with mobile support.

## API Integration

The frontend communicates with the Node.js backend via REST API:

- `POST /api/analysis` - Start new analysis
- `GET /api/analysis/:id/results` - Get analysis results
- `GET /api/export/:id/:format` - Export results

## Styling

- **Tailwind CSS** for utility-first styling
- **Framer Motion** for smooth animations
- **Custom CSS** for specialized components
- **Responsive design** with mobile-first approach

## State Management

- **React Query** for server state management
- **React hooks** for local component state
- **Context API** for global app state (if needed)

## Testing

- **Jest** for unit testing
- **React Testing Library** for component testing
- **MSW** for API mocking (when needed)

## Deployment

The frontend can be deployed to:

- **Vercel** (recommended)
- **Netlify**
- **AWS S3 + CloudFront**
- Any static hosting service
