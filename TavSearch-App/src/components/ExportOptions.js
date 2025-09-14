import React, { useState } from 'react';

const ExportOptions = ({ results }) => {
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  if (!results) {
    return null;
  }

  const exportToJSON = () => {
    try {
      const dataStr = JSON.stringify(results, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tavsearch-results-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus('JSON exported successfully!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus('Error exporting JSON: ' + error.message);
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const exportToCSV = () => {
    try {
      let csvContent = 'Agent,Status,Summary,Sources Count,Execution Time\n';

      if (results.agents) {
        Object.entries(results.agents).forEach(([agentName, agentData]) => {
          const summary = (agentData.summary || '').replace(/"/g, '""');
          const sourcesCount = agentData.sources ? agentData.sources.length : 0;
          const executionTime = agentData.execution_time || '';
          const status = agentData.status || '';

          csvContent += `"${agentName}","${status}","${summary}",${sourcesCount},${executionTime}\n`;
        });
      }

      const dataBlob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tavsearch-results-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus('CSV exported successfully!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus('Error exporting CSV: ' + error.message);
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const exportToMarkdown = () => {
    try {
      let markdown = `# TavSearch Analysis Results\n\n`;
      markdown += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

      if (results.summary) {
        markdown += `## Executive Summary\n\n${results.summary}\n\n`;
      }

      if (results.key_insights) {
        markdown += `## Key Insights\n\n`;
        if (Array.isArray(results.key_insights)) {
          results.key_insights.forEach((insight, index) => {
            markdown += `${index + 1}. ${insight}\n`;
          });
        } else {
          markdown += `${results.key_insights}\n`;
        }
        markdown += `\n`;
      }

      if (results.agents) {
        markdown += `## Agent Details\n\n`;
        Object.entries(results.agents).forEach(([agentName, agentData]) => {
          markdown += `### ${agentName}\n\n`;
          if (agentData.status) {
            markdown += `**Status:** ${agentData.status}\n\n`;
          }
          if (agentData.summary) {
            markdown += `**Summary:** ${agentData.summary}\n\n`;
          }
          if (agentData.sources && agentData.sources.length > 0) {
            markdown += `**Sources:**\n`;
            agentData.sources.forEach((source, index) => {
              markdown += `${index + 1}. [${source.title || 'Source'}](${source.url})\n`;
            });
            markdown += `\n`;
          }
          if (agentData.execution_time) {
            markdown += `**Execution Time:** ${agentData.execution_time}s\n\n`;
          }
        });
      }

      const dataBlob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tavsearch-results-${new Date().toISOString().slice(0, 10)}.md`;
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus('Markdown exported successfully!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus('Error exporting Markdown: ' + error.message);
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      // This would typically use a library like jsPDF or html2pdf
      // For now, we'll create a simple HTML version and print
      const printWindow = window.open('', '_blank');
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>TavSearch Analysis Results</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2, h3 { color: #333; }
            .summary { background: #f8f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .agent { margin: 20px 0; padding: 15px; border-left: 4px solid #667eea; background: #f8f9fa; }
            .sources { margin: 10px 0; }
            .sources ul { padding-left: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>TavSearch Analysis Results</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
      `;

      if (results.summary) {
        htmlContent += `<div class="summary"><h2>Executive Summary</h2><p>${results.summary}</p></div>`;
      }

      if (results.key_insights) {
        htmlContent += `<h2>Key Insights</h2><ul>`;
        if (Array.isArray(results.key_insights)) {
          results.key_insights.forEach((insight) => {
            htmlContent += `<li>${insight}</li>`;
          });
        } else {
          htmlContent += `<li>${results.key_insights}</li>`;
        }
        htmlContent += `</ul>`;
      }

      if (results.agents) {
        htmlContent += `<h2>Agent Details</h2>`;
        Object.entries(results.agents).forEach(([agentName, agentData]) => {
          htmlContent += `<div class="agent"><h3>${agentName}</h3>`;
          if (agentData.status) {
            htmlContent += `<p><strong>Status:</strong> ${agentData.status}</p>`;
          }
          if (agentData.summary) {
            htmlContent += `<p><strong>Summary:</strong> ${agentData.summary}</p>`;
          }
          if (agentData.sources && agentData.sources.length > 0) {
            htmlContent += `<div class="sources"><strong>Sources:</strong><ul>`;
            agentData.sources.forEach((source) => {
              htmlContent += `<li><a href="${source.url}">${source.title || source.url}</a></li>`;
            });
            htmlContent += `</ul></div>`;
          }
          htmlContent += `</div>`;
        });
      }

      htmlContent += `</body></html>`;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();

      setExportStatus('PDF export initiated (use browser print dialog)');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus('Error exporting PDF: ' + error.message);
      setTimeout(() => setExportStatus(''), 3000);
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const textContent = JSON.stringify(results, null, 2);
      await navigator.clipboard.writeText(textContent);
      setExportStatus('Results copied to clipboard!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus('Error copying to clipboard: ' + error.message);
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  return (
    <div className="export-section">
      <h3>Export Options</h3>

      {exportStatus && (
        <div
          className={`status-message ${
            exportStatus.includes('Error') ? 'status-error' : 'status-success'
          }`}
        >
          {exportStatus}
        </div>
      )}

      <div className="export-buttons">
        <button className="btn btn-secondary" onClick={exportToJSON} disabled={exporting}>
          Export as JSON
        </button>

        <button className="btn btn-secondary" onClick={exportToCSV} disabled={exporting}>
          Export as CSV
        </button>

        <button className="btn btn-secondary" onClick={exportToMarkdown} disabled={exporting}>
          Export as Markdown
        </button>

        <button className="btn btn-secondary" onClick={exportToPDF} disabled={exporting}>
          {exporting ? (
            <>
              <span className="loading-spinner"></span>
              Generating PDF...
            </>
          ) : (
            'Export as PDF'
          )}
        </button>

        <button className="btn btn-secondary" onClick={copyToClipboard} disabled={exporting}>
          Copy to Clipboard
        </button>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
        <strong>Export includes:</strong> Agent outputs, summaries, sources, execution times, and
        metadata
      </div>
    </div>
  );
};

export default ExportOptions;
