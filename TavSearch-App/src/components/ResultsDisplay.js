import React, { useState } from 'react';

const ResultsDisplay = ({ results }) => {
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  if (!results) {
    return null;
  }

  const toggleAgentExpansion = (agentName) => {
    setExpandedAgent(expandedAgent === agentName ? null : agentName);
  };

  const renderAgentOutput = (agentName, agentData) => {
    const isExpanded = expandedAgent === agentName;

    return (
      <div key={agentName} className="agent-output">
        <div
          className="agent-name"
          onClick={() => toggleAgentExpansion(agentName)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>{isExpanded ? '▼' : '▶'}</span>
          <span>{agentName}</span>
          {agentData.status && (
            <span
              className={`status-message ${
                agentData.status === 'completed'
                  ? 'status-success'
                  : agentData.status === 'failed'
                    ? 'status-error'
                    : 'status-info'
              }`}
              style={{ marginLeft: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              {agentData.status}
            </span>
          )}
        </div>

        {isExpanded && (
          <div className="agent-content" style={{ marginTop: '0.5rem' }}>
            {agentData.summary && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Summary:</strong>
                <p>{agentData.summary}</p>
              </div>
            )}

            {agentData.sources && agentData.sources.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Sources ({agentData.sources.length}):</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  {agentData.sources.map((source, index) => (
                    <li key={index} style={{ marginBottom: '0.5rem' }}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.title || source.url}
                      </a>
                      {source.score && (
                        <span style={{ marginLeft: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                          (Score: {source.score})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {agentData.data && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Data:</strong>
                <pre
                  style={{
                    background: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '0.9rem',
                  }}
                >
                  {typeof agentData.data === 'string'
                    ? agentData.data
                    : JSON.stringify(agentData.data, null, 2)}
                </pre>
              </div>
            )}

            {agentData.execution_time && (
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                Execution time: {agentData.execution_time}s
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSummaryTab = () => (
    <div>
      {results.summary && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>Executive Summary</h3>
          <div
            style={{
              background: '#f8f9ff',
              padding: '1.5rem',
              borderRadius: '8px',
              borderLeft: '4px solid #667eea',
            }}
          >
            {typeof results.summary === 'string'
              ? results.summary
              : JSON.stringify(results.summary, null, 2)}
          </div>
        </div>
      )}

      {results.key_insights && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>Key Insights</h3>
          <ul style={{ paddingLeft: '1.5rem' }}>
            {Array.isArray(results.key_insights) ? (
              results.key_insights.map((insight, index) => (
                <li key={index} style={{ marginBottom: '0.5rem' }}>
                  {insight}
                </li>
              ))
            ) : (
              <li>{results.key_insights}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );

  const renderAgentsTab = () => (
    <div>
      <h3>Agent Outputs</h3>
      {results.agents && Object.keys(results.agents).length > 0 ? (
        Object.entries(results.agents).map(([agentName, agentData]) =>
          renderAgentOutput(agentName, agentData)
        )
      ) : (
        <div className="status-message status-info">No agent-specific outputs available.</div>
      )}
    </div>
  );

  const renderRawDataTab = () => (
    <div>
      <h3>Raw Data</h3>
      <pre
        style={{
          background: '#f8f9fa',
          padding: '1.5rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '0.9rem',
          maxHeight: '500px',
        }}
      >
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  );

  return (
    <div className="results-section">
      <div className="results-header">
        <h2>Analysis Results</h2>
        {results.execution_time && (
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            Total execution time: {results.execution_time}s
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #e1e5e9',
          background: '#f8f9fa',
        }}
      >
        <button
          className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('summary')}
          style={{ borderRadius: '0', borderBottom: 'none' }}
        >
          Summary
        </button>
        <button
          className={`btn ${activeTab === 'agents' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('agents')}
          style={{ borderRadius: '0', borderBottom: 'none' }}
        >
          Agent Details
        </button>
        <button
          className={`btn ${activeTab === 'raw' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('raw')}
          style={{ borderRadius: '0', borderBottom: 'none' }}
        >
          Raw Data
        </button>
      </div>

      <div className="results-content">
        {activeTab === 'summary' && renderSummaryTab()}
        {activeTab === 'agents' && renderAgentsTab()}
        {activeTab === 'raw' && renderRawDataTab()}
      </div>
    </div>
  );
};

export default ResultsDisplay;
