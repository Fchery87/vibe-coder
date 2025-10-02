import { Router } from 'express';
import temporaryPreviewService from '../services/temporary-preview-service';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

const router = Router();

/**
 * POST /preview/share
 * Generate a temporary shareable preview link
 */
router.post('/share', async (req, res) => {
  try {
    // Rate limiting
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.'
      });
    }

    const { generatedCode, sandboxLogs, executionResult } = req.body;

    // Validate input
    if (!generatedCode && !executionResult) {
      return res.status(400).json({
        error: 'At least generatedCode or executionResult must be provided'
      });
    }

    // Additional validation
    if (generatedCode && typeof generatedCode !== 'string') {
      return res.status(400).json({
        error: 'generatedCode must be a string'
      });
    }

    if (generatedCode && generatedCode.length > 100000) { // 100KB limit
      return res.status(400).json({
        error: 'generatedCode is too large (max 100KB)'
      });
    }

    if (sandboxLogs && !Array.isArray(sandboxLogs)) {
      return res.status(400).json({
        error: 'sandboxLogs must be an array'
      });
    }

    if (sandboxLogs && sandboxLogs.length > 1000) { // Limit log entries
      return res.status(400).json({
        error: 'Too many log entries (max 1000)'
      });
    }

    // Generate the temporary link
    const previewId = temporaryPreviewService.generatePreviewLink({
      generatedCode,
      sandboxLogs,
      executionResult,
    });

    // Return the shareable URL
    const shareUrl = `${req.protocol}://${req.get('host')}/preview/${previewId}`;

    res.json({
      success: true,
      shareUrl,
      previewId,
      expiresIn: '24 hours'
    });
  } catch (error) {
    console.error('Error generating preview link:', error);
    res.status(500).json({
      error: 'Failed to generate preview link'
    });
  }
});

/**
 * GET /preview/:id
 * Serve the temporary preview (public route, no auth required)
 */
router.get('/:id', (req, res) => {
  try {
    // Rate limiting for preview access
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return res.status(429).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Rate Limited</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            h1 { color: #e74c3c; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Too Many Requests</h1>
            <p>Please try again later.</p>
          </div>
        </body>
        </html>
      `);
    }

    const { id } = req.params;

    // Validate ID format (32 character hex string)
    if (!/^[a-f0-9]{32}$/.test(id)) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            h1 { color: #e74c3c; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Invalid Preview Link</h1>
            <p>This link format is not valid.</p>
          </div>
        </body>
        </html>
      `);
    }

    const preview = temporaryPreviewService.getPreview(id);

    if (!preview) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Preview Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            h1 { color: #e74c3c; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Preview Not Found</h1>
            <p>This preview link has expired or is invalid.</p>
            <p>Preview links are valid for 24 hours.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Serve the preview HTML
    const html = generatePreviewHTML(preview);
    res.send(html);
  } catch (error) {
    console.error('Error serving preview:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET /preview/stats
 * Get statistics about temporary previews (for monitoring)
 */
router.get('/stats', (req, res) => {
  try {
    const stats = temporaryPreviewService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting preview stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

function generatePreviewHTML(preview: any): string {
  const { generatedCode, sandboxLogs = [], executionResult } = preview;

  const logsHtml = sandboxLogs.map((log: any) => `
    <div class="log-entry log-${log.type}">
      <span class="log-type">${log.type.toUpperCase()}</span>
      <span class="log-message">${escapeHtml(log.message)}</span>
      <span class="log-time">${log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
    </div>
  `).join('');

  const executionHtml = executionResult ? `
    <div class="execution-result ${executionResult.success ? 'success' : 'error'}">
      <h3>Execution Result</h3>
      <p><strong>Status:</strong> ${executionResult.success ? 'Success' : 'Failed'}</p>
      <p><strong>Execution Time:</strong> ${executionResult.executionTime}ms</p>
      ${executionResult.output ? `<pre class="output">${escapeHtml(executionResult.output)}</pre>` : ''}
      ${executionResult.error ? `<pre class="error">${escapeHtml(executionResult.error)}</pre>` : ''}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vibe Coder Preview</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #f8f9fa;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 30px;
          text-align: center;
        }
        .header h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
        }
        .header p {
          opacity: 0.9;
          font-size: 1.1em;
        }
        .section {
          background: white;
          border-radius: 10px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section h2 {
          color: #2c3e50;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #3498db;
        }
        .code-block {
          background: #2d3748;
          color: #e2e8f0;
          padding: 20px;
          border-radius: 8px;
          overflow-x: auto;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 14px;
          line-height: 1.5;
        }
        .execution-result {
          border-left: 4px solid #27ae60;
          padding-left: 20px;
        }
        .execution-result.error {
          border-left-color: #e74c3c;
        }
        .execution-result h3 {
          margin-bottom: 15px;
          color: #2c3e50;
        }
        .output, .error {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin-top: 10px;
          font-family: monospace;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .error {
          background: #fdf2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }
        .logs-section {
          max-height: 400px;
          overflow-y: auto;
        }
        .log-entry {
          padding: 10px;
          margin-bottom: 5px;
          border-radius: 5px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .log-error { background: #fef2f2; border-left: 4px solid #ef4444; }
        .log-warn { background: #fefce8; border-left: 4px solid #f59e0b; }
        .log-info { background: #eff6ff; border-left: 4px solid #3b82f6; }
        .log-log { background: #f9fafb; border-left: 4px solid #6b7280; }
        .log-type {
          font-weight: bold;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 3px;
          text-transform: uppercase;
        }
        .log-error .log-type { background: #ef4444; color: white; }
        .log-warn .log-type { background: #f59e0b; color: white; }
        .log-info .log-type { background: #3b82f6; color: white; }
        .log-log .log-type { background: #6b7280; color: white; }
        .log-message { flex: 1; }
        .log-time { font-size: 12px; color: #666; }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 14px;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Vibe Coder Preview</h1>
          <p>Temporary preview link - expires in 24 hours</p>
        </div>

        ${generatedCode ? `
          <div class="section">
            <h2>📝 Generated Code</h2>
            <div class="code-block">${escapeHtml(generatedCode)}</div>
          </div>
        ` : ''}

        ${executionResult ? `
          <div class="section">
            <h2>⚡ Execution Result</h2>
            ${executionHtml}
          </div>
        ` : ''}

        ${sandboxLogs.length > 0 ? `
          <div class="section">
            <h2>📋 Console Logs <span class="badge">${sandboxLogs.length} entries</span></h2>
            <div class="logs-section">
              ${logsHtml}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <p>Generated by Vibe Coder • This preview will expire automatically</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default router;