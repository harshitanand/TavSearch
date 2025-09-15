import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Calendar,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';

const ExportManager = ({ queryId, onClose }) => {
  const [formats, setFormats] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [formatsResponse, historyResponse] = await Promise.all([
          queryId ? api.getExportFormats(queryId) : Promise.resolve({ data: { available: [] } }),
          api.getExportHistory({ limit: 10 }),
        ]);

        setFormats(formatsResponse.data);
        setExportHistory(historyResponse.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [queryId]);

  const handleExport = async (format) => {
    if (!queryId) return;

    setExporting((prev) => ({ ...prev, [format]: true }));

    try {
      const response = await api.exportResults(queryId, format);

      // Create download link
      const blob = new Blob([response], {
        type: format === 'json' ? 'application/json' : 'application/octet-stream',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analysis-${queryId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Refresh export history
      const historyResponse = await api.getExportHistory({ limit: 10 });
      setExportHistory(historyResponse.data || []);
    } catch (err) {
      console.error('Export failed:', err);
      setError(`Export failed: ${err.message}`);
    } finally {
      setExporting((prev) => ({ ...prev, [format]: false }));
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span>Loading export options...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Export Analysis</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Available Formats */}
        {queryId && formats && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Export Formats</h3>

            {formats.available && formats.available.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formats.available.map((format) => (
                  <div
                    key={format.format}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{format.format.toUpperCase()}</h4>
                        <p className="text-sm text-gray-600">{format.description}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                          {format.size}
                        </span>
                      </div>
                      <button
                        onClick={() => handleExport(format.format)}
                        disabled={exporting[format.format]}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                      >
                        {exporting[format.format] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span>{exporting[format.format] ? 'Exporting...' : 'Export'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {formats.unavailable && formats.unavailable.length > 0
                    ? formats.unavailable[0].message
                    : 'No export formats available'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Export History */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Exports</h3>

          {exportHistory.length > 0 ? (
            <div className="space-y-3">
              {exportHistory.map((exportItem, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {exportItem.queryText || 'Analysis Export'}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(exportItem.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{exportItem.format || 'PDF'}</span>
                      </span>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No exports yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportManager;
