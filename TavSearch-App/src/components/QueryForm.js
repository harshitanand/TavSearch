import React, { useState } from 'react';

const QueryForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    query: '',
    queryType: 'research',
    maxResults: 10,
    includeImages: false,
    searchDepth: 'standard',
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.query.trim()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="search-form">
      <h2>Submit Research Query</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="query">Research Query *</label>
          <textarea
            id="query"
            name="query"
            value={formData.query}
            onChange={handleInputChange}
            placeholder="Enter your research question or topic (e.g., 'Latest developments in renewable energy technology')"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="queryType">Query Type</label>
          <select
            id="queryType"
            name="queryType"
            value={formData.queryType}
            onChange={handleInputChange}
          >
            <option value="research">Research & Analysis</option>
            <option value="news">Current News</option>
            <option value="academic">Academic/Scientific</option>
            <option value="market">Market Intelligence</option>
            <option value="technical">Technical Documentation</option>
            <option value="comparison">Product/Service Comparison</option>
            <option value="trend">Trend Analysis</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="searchDepth">Search Depth</label>
          <select
            id="searchDepth"
            name="searchDepth"
            value={formData.searchDepth}
            onChange={handleInputChange}
          >
            <option value="quick">Quick (Fast results)</option>
            <option value="standard">Standard (Balanced)</option>
            <option value="deep">Deep (Comprehensive)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="maxResults">Maximum Results</label>
          <select
            id="maxResults"
            name="maxResults"
            value={formData.maxResults}
            onChange={handleInputChange}
          >
            <option value={5}>5 results</option>
            <option value={10}>10 results</option>
            <option value={15}>15 results</option>
            <option value={20}>20 results</option>
          </select>
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              name="includeImages"
              checked={formData.includeImages}
              onChange={handleInputChange}
            />
            Include images and visual content
          </label>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !formData.query.trim()}
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Processing...
            </>
          ) : (
            'Start Analysis'
          )}
        </button>
      </form>
    </div>
  );
};

export default QueryForm;
