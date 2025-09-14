import React, { useState, useEffect } from 'react';

const AnalysisHistory = ({ onSelectHistory }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/history');
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryItem = async (id) => {
    try {
      const response = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setHistory(history.filter((item) => item.id !== id));
      } else {
        throw new Error('Failed to delete item');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const toggleExpanded = (id) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  if (loading) {
    return (
      <div className="history-section">
        <div className="results-header">
          <h3>Analysis History</h3>
        </div>
        <div className="results-content">
          <div className="status-message status-info">
            <span className="loading-spinner"></span>
            Loading history...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-section">
        <div className="results-header">
          <h3>Analysis History</h3>
        </div>
        <div className="results-content">
          <div className="status-message status-error">Error loading history: {error}</div>
          <button className="btn btn-secondary" onClick={fetchHistory}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="history-section">
      <div className="results-header">
        <h3>Analysis History ({history.length})</h3>
        <button className="btn btn-secondary" onClick={fetchHistory} style={{ marginLeft: 'auto' }}>
          Refresh
        </button>
      </div>
      <div className="results-content">
        {history.length === 0 ? (
          <div className="status-message status-info">
            No analysis history found. Start by submitting a query above.
          </div>
        ) : (
          <div>
            {history.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-query">
                  <strong>Query:</strong> {truncateText(item.query, 80)}
                </div>
                <div className="history-timestamp">{formatTimestamp(item.timestamp)}</div>

                {item.status && (
                  <div
                    className={`status-message ${
                      item.status === 'completed'
                        ? 'status-success'
                        : item.status === 'failed'
                          ? 'status-error'
                          : 'status-info'
                    }`}
                    style={{ marginTop: '0.5rem', padding: '0.5rem' }}
                  >
                    Status: {item.status}
                  </div>
                )}

                <div
                  style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
                >
                  <button
                    className="btn btn-primary"
                    onClick={() => onSelectHistory && onSelectHistory(item)}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem' }}
                  >
                    View Results
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => toggleExpanded(item.id)}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem' }}
                  >
                    {expandedItem === item.id ? 'Hide' : 'Show'} Details
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => deleteHistoryItem(item.id)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.9rem',
                      background: '#dc3545',
                      color: 'white',
                    }}
                  >
                    Delete
                  </button>
                </div>

                {expandedItem === item.id && (
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e1e5e9',
                    }}
                  >
                    <div>
                      <strong>Full Query:</strong> {item.query}
                    </div>

                    {item.query_type && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <strong>Query Type:</strong> {item.query_type}
                      </div>
                    )}

                    {item.agents_used && item.agents_used.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <strong>Agents Used:</strong> {item.agents_used.join(', ')}
                      </div>
                    )}

                    {item.execution_time && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <strong>Execution Time:</strong> {item.execution_time}s
                      </div>
                    )}

                    {item.results && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <strong>Results Summary:</strong>
                        <div
                          style={{
                            marginTop: '0.25rem',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            padding: '0.5rem',
                            background: 'white',
                            borderRadius: '4px',
                          }}
                        >
                          {typeof item.results === 'string'
                            ? item.results
                            : JSON.stringify(item.results, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisHistory;
