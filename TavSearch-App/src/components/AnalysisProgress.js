import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Search, BarChart3, FileText, Clock } from 'lucide-react';

const AnalysisProgress = ({ analysis, isAnalyzing }) => {
  const steps = [
    { id: 'search', name: 'Gathering Data', icon: Search, description: 'Searching web sources' },
    {
      id: 'analyze',
      name: 'Analyzing Trends',
      icon: BarChart3,
      description: 'Processing market data',
    },
    { id: 'report', name: 'Generating Report', icon: FileText, description: 'Creating insights' },
  ];

  const getStepStatus = (stepId) => {
    if (!isAnalyzing) {
      return analysis.status === 'completed' ? 'completed' : 'pending';
    }

    // Simulate progress based on time elapsed
    const timeElapsed = Date.now() - new Date(analysis.startTime).getTime();
    const progressSteps = ['search', 'analyze', 'report'];
    const currentStepIndex = Math.min(
      Math.floor(timeElapsed / 30000), // 30 seconds per step
      progressSteps.length - 1
    );

    const stepIndex = progressSteps.indexOf(stepId);
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Analysis Progress</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Started: {new Date(analysis.startTime).toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Query:</p>
        <p className="font-medium text-gray-900">{analysis.query}</p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center space-x-4"
            >
              <div
                className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                ${
                  status === 'completed'
                    ? 'bg-green-100 text-green-600'
                    : status === 'current'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                }
              `}
              >
                {status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : status === 'current' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={`font-medium ${
                      status === 'completed'
                        ? 'text-green-900'
                        : status === 'current'
                          ? 'text-blue-900'
                          : 'text-gray-900'
                    }`}
                  >
                    {step.name}
                  </h4>
                  {status === 'current' && (
                    <span className="text-sm text-blue-600 font-medium">In Progress</span>
                  )}
                  {status === 'completed' && (
                    <span className="text-sm text-green-600 font-medium">Completed</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {isAnalyzing && (
        <div className="mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-blue-800 font-medium">Multi-agent analysis in progress...</span>
            </div>
            <div className="mt-2 bg-blue-200 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '70%' }}
                transition={{ duration: 2, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-2 text-sm text-blue-700">
              <div>• Search Agent: Gathering market data</div>
              <div>• Analysis Agent: Processing trends</div>
              <div>• Synthesis Agent: Generating report</div>
            </div>
          </div>
        </div>
      )}

      {analysis.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 bg-green-50 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">Analysis Completed Successfully!</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Your comprehensive market intelligence report is ready.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default AnalysisProgress;
