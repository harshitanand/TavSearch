const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { logger } = require('../utils/logger');

class ExportService {
  async generateExport(result, format) {
    try {
      switch (format.toLowerCase()) {
        case 'json':
          return this.exportToJSON(result);
        case 'csv':
          return this.exportToCSV(result);
        case 'xlsx':
          return await this.exportToExcel(result);
        case 'pdf':
          return await this.exportToPDF(result);
        case 'html':
          return this.exportToHTML(result);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Export generation failed:', error);
      throw error;
    }
  }

  exportToJSON(result) {
    return {
      query: result.query?.queryText,
      analysisResults: result.analysisResults,
      processedData: result.processedData,
      performance: result.performance,
      generatedAt: new Date().toISOString()
    };
  }

  exportToCSV(result) {
    const { analysisResults } = result;
    let csv = 'Category,Item\n';
    
    // Key trends
    if (analysisResults.keyTrends) {
      analysisResults.keyTrends.forEach(trend => {
        csv += `Key Trend,"${trend.replace(/"/g, '""')}"\n`;
      });
    }

    // Recommendations
    if (analysisResults.recommendations) {
      analysisResults.recommendations.forEach(rec => {
        csv += `Recommendation,"${rec.replace(/"/g, '""')}"\n`;
      });
    }

    // Risk factors
    if (analysisResults.riskFactors) {
      analysisResults.riskFactors.forEach(risk => {
        csv += `Risk Factor,"${risk.replace(/"/g, '""')}"\n`;
      });
    }

    return csv;
  }

  async exportToExcel(result) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Market Analysis');

    // Add headers
    worksheet.columns = [
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Item', key: 'item', width: 80 }
    ];

    // Add data
    const { analysisResults } = result;
    
    if (analysisResults.keyTrends) {
      analysisResults.keyTrends.forEach(trend => {
        worksheet.addRow({ category: 'Key Trend', item: trend });
      });
    }

    if (analysisResults.recommendations) {
      analysisResults.recommendations.forEach(rec => {
        worksheet.addRow({ category: 'Recommendation', item: rec });
      });
    }

    if (analysisResults.riskFactors) {
      analysisResults.riskFactors.forEach(risk => {
        worksheet.addRow({ category: 'Risk Factor', item: risk });
      });
    }

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    return await workbook.xlsx.writeBuffer();
  }

  async exportToPDF(result) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Add content
        doc.fontSize(20).text('Market Intelligence Report', { align: 'center' });
        doc.moveDown();

        doc.fontSize(16).text('Query:', { underline: true });
        doc.fontSize(12).text(result.query?.queryText || 'N/A');
        doc.moveDown();

        // Key trends
        if (result.analysisResults?.keyTrends) {
          doc.fontSize(16).text('Key Trends:', { underline: true });
          result.analysisResults.keyTrends.forEach(trend => {
            doc.fontSize(12).text(`• ${trend}`);
          });
          doc.moveDown();
        }

        // Recommendations
        if (result.analysisResults?.recommendations) {
          doc.fontSize(16).text('Recommendations:', { underline: true });
          result.analysisResults.recommendations.forEach(rec => {
            doc.fontSize(12).text(`• ${rec}`);
          });
          doc.moveDown();
        }

        // Risk factors
        if (result.analysisResults?.riskFactors) {
          doc.fontSize(16).text('Risk Factors:', { underline: true });
          result.analysisResults.riskFactors.forEach(risk => {
            doc.fontSize(12).text(`• ${risk}`);
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  exportToHTML(result) {
    const { analysisResults, query } = result;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Market Intelligence Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #2c3e50; border-bottom: 2px solid #3498db; }
          h2 { color: #34495e; margin-top: 30px; }
          ul { line-height: 1.6; }
          .metadata { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <h1>Market Intelligence Report</h1>
        <p><strong>Query:</strong> ${query?.queryText || 'N/A'}</p>
        
        ${analysisResults?.keyTrends ? `
          <h2>Key Trends</h2>
          <ul>
            ${analysisResults.keyTrends.map(trend => `<li>${trend}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${analysisResults?.recommendations ? `
          <h2>Recommendations</h2>
          <ul>
            ${analysisResults.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${analysisResults?.riskFactors ? `
          <h2>Risk Factors</h2>
          <ul>
            ${analysisResults.riskFactors.map(risk => `<li>${risk}</li>`).join('')}
          </ul>
        ` : ''}
        
        <div class="metadata">
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Data Confidence:</strong> ${analysisResults?.dataConfidence || 'N/A'}</p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new ExportService();
