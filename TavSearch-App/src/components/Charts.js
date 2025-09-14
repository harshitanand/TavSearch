import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar, Scatter } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

const Charts = ({ visualizations }) => {
  const renderChart = (viz) => {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          cornerRadius: 8,
          padding: 12,
        },
        ...viz.options?.plugins,
      },
      ...viz.options,
    };

    switch (viz.type.toLowerCase()) {
      case 'bar':
        return <Bar data={viz.data} options={commonOptions} />;
      case 'line':
        return <Line data={viz.data} options={commonOptions} />;
      case 'pie':
        return <Pie data={viz.data} options={commonOptions} />;
      case 'doughnut':
        return <Doughnut data={viz.data} options={commonOptions} />;
      case 'radar':
        return <Radar data={viz.data} options={commonOptions} />;
      case 'scatter':
        return <Scatter data={viz.data} options={commonOptions} />;
      default:
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <p className="text-gray-600">Unsupported chart type: {viz.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {visualizations.map((viz, index) => (
        <div key={viz.id || index} className="chart-container">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{viz.title}</h3>
            {viz.description && <p className="text-sm text-gray-600 mt-1">{viz.description}</p>}
          </div>

          <div className="h-80 bg-white rounded-lg border border-gray-200 p-4">
            {renderChart(viz)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Charts;
