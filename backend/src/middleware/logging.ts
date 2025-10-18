import { Request, Response, NextFunction } from 'express';
import { log } from '../services/logger';
import { performanceMonitor } from '../services/performance-monitor';

/**
 * HTTP Request Logging Middleware
 *
 * Logs all HTTP requests with:
 * - Method, URL, status code
 * - Response time
 * - User info (if authenticated)
 * - IP address
 * - User agent
 */

export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Capture the original end function
  const originalEnd = res.end.bind(res);

  // Override res.end to capture when response is sent
  res.end = function(this: Response, chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Log HTTP request
    log.http(
      req.method,
      req.path,
      statusCode,
      duration,
      {
        query: req.query,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        userId: (req as any).session?.userId || (req as any).user?.id,
      }
    );

    // Record performance metrics
    performanceMonitor.recordHttpRequest(
      req.method,
      req.path,
      statusCode,
      duration
    );

    // Call original end function
    return originalEnd(chunk, encoding, cb);
  } as any;

  next();
}

/**
 * Error Logging Middleware
 *
 * Catches and logs all errors in the application
 */
export function errorLogger(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error
  log.error('HTTP request error', {
    err,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).session?.userId || (req as any).user?.id,
    body: req.body,
  });

  // Pass to next error handler
  next(err);
}

/**
 * Request ID Middleware
 *
 * Adds a unique request ID to each request for tracing
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const requestId = req.get('x-request-id') || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add to request object
  (req as any).requestId = requestId;

  // Add to response headers
  res.setHeader('x-request-id', requestId);

  next();
}

/**
 * Slow Request Logger
 *
 * Logs requests that take longer than a threshold
 */
export function slowRequestLogger(thresholdMs: number = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    const originalEnd = res.end.bind(res);
    res.end = function(this: Response, chunk?: any, encoding?: any, cb?: any) {
      const duration = Date.now() - start;

      if (duration > thresholdMs) {
        log.warn(`Slow request detected: ${req.method} ${req.path}`, {
          duration,
          threshold: thresholdMs,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
        });
      }

      return originalEnd(chunk, encoding, cb);
    } as any;

    next();
  };
}

/**
 * User Activity Logger
 *
 * Logs user-specific actions for analytics
 */
export function userActivityLogger(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).session?.userId || (req as any).user?.id;

  if (userId) {
    // Log user activity
    log.debug('User activity', {
      userId,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
  }

  next();
}
