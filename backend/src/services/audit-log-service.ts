import prisma from './database';
import { log } from './logger';

/**
 * Audit Log Service
 *
 * Tracks user actions and system events for:
 * - Security auditing
 * - Compliance (SOC 2, GDPR, etc.)
 * - Debugging user issues
 * - Business analytics
 */

export enum AuditAction {
  // Authentication
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_REGISTER = 'user.register',
  PASSWORD_RESET = 'user.password_reset',

  // Code Generation
  CODE_GENERATE = 'code.generate',
  CODE_EDIT = 'code.edit',
  CODE_DELETE = 'code.delete',

  // Projects
  PROJECT_CREATE = 'project.create',
  PROJECT_UPDATE = 'project.update',
  PROJECT_DELETE = 'project.delete',

  // Git Operations
  GIT_COMMIT = 'git.commit',
  GIT_PUSH = 'git.push',
  GIT_BRANCH_CREATE = 'git.branch.create',

  // LLM Usage
  LLM_REQUEST = 'llm.request',
  LLM_ERROR = 'llm.error',

  // Settings
  SETTINGS_UPDATE = 'settings.update',
  API_KEY_CREATE = 'api_key.create',
  API_KEY_DELETE = 'api_key.delete',

  // Security
  UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  severity: AuditSeverity;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export class AuditLogService {
  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Log to Pino/Logtail for real-time monitoring
      const logData = {
        userId: entry.userId,
        action: entry.action,
        severity: entry.severity,
        resource: entry.resource,
        resourceId: entry.resourceId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        success: entry.success,
        metadata: entry.metadata,
      };

      if (entry.success) {
        log.info(`Audit: ${entry.action}`, logData);
      } else {
        log.warn(`Audit: ${entry.action} failed`, {
          ...logData,
          error: entry.errorMessage,
        });
      }

      // Optionally store in database for long-term retention
      // This is useful for compliance and historical analysis
      if (this.shouldPersist(entry)) {
        await this.persistToDatabase(entry);
      }
    } catch (error) {
      // Never fail the main request due to audit logging
      log.error('Failed to log audit entry', error as Error);
    }
  }

  /**
   * Determine if audit log should be persisted to database
   */
  private shouldPersist(entry: AuditLogEntry): boolean {
    // Always persist critical and security events
    if (entry.severity === AuditSeverity.CRITICAL) return true;
    if (entry.action.startsWith('security.')) return true;

    // Persist authentication events
    if (entry.action.startsWith('user.')) return true;

    // Persist failed operations
    if (!entry.success) return true;

    // For other events, only persist in production
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Persist audit log to database
   */
  private async persistToDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      // You would create an audit_logs table in Prisma for this
      // For now, we'll just log it
      log.debug('Persisting audit log to database', {
        action: entry.action,
        userId: entry.userId,
      });

      // Example Prisma call (requires schema update):
      // await prisma.auditLog.create({
      //   data: {
      //     userId: entry.userId,
      //     action: entry.action,
      //     severity: entry.severity,
      //     resource: entry.resource,
      //     resourceId: entry.resourceId,
      //     metadata: entry.metadata,
      //     ipAddress: entry.ipAddress,
      //     userAgent: entry.userAgent,
      //     success: entry.success,
      //     errorMessage: entry.errorMessage,
      //   },
      // });
    } catch (error) {
      log.error('Failed to persist audit log to database', error as Error);
    }
  }

  /**
   * Query audit logs (for admin dashboard)
   */
  async query(options: {
    userId?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    // This would query the database
    // For now, return empty array
    log.info('Querying audit logs', options);
    return [];
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(userId: string, days: number = 7): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    recentActions: any[];
  }> {
    log.info('Getting user activity summary', { userId, days });

    // This would aggregate from database
    return {
      totalActions: 0,
      actionsByType: {},
      recentActions: [],
    };
  }

  /**
   * Get security events (for monitoring)
   */
  async getSecurityEvents(options: {
    severity?: AuditSeverity;
    limit?: number;
  }): Promise<any[]> {
    log.info('Getting security events', options);

    // This would query security-related audit logs
    return [];
  }

  /**
   * Helper methods for common audit events
   */

  async logLogin(userId: string, ipAddress: string, success: boolean, errorMessage?: string) {
    await this.log({
      userId,
      action: AuditAction.USER_LOGIN,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      ipAddress,
      success,
      errorMessage,
    });
  }

  async logCodeGeneration(userId: string, model: string, tokens: number, cost: number, cached: boolean) {
    await this.log({
      userId,
      action: AuditAction.CODE_GENERATE,
      severity: AuditSeverity.INFO,
      resource: 'code',
      metadata: {
        model,
        tokens,
        cost,
        cached,
      },
      success: true,
    });
  }

  async logLLMRequest(userId: string | undefined, provider: string, model: string, success: boolean, errorMessage?: string) {
    await this.log({
      userId,
      action: AuditAction.LLM_REQUEST,
      severity: success ? AuditSeverity.INFO : AuditSeverity.ERROR,
      resource: 'llm',
      metadata: {
        provider,
        model,
      },
      success,
      errorMessage,
    });
  }

  async logRateLimitExceeded(ipAddress: string, endpoint: string, userAgent?: string) {
    await this.log({
      action: AuditAction.RATE_LIMIT_EXCEEDED,
      severity: AuditSeverity.WARNING,
      resource: endpoint,
      ipAddress,
      userAgent,
      success: false,
      errorMessage: 'Rate limit exceeded',
    });
  }

  async logUnauthorizedAccess(ipAddress: string, endpoint: string, userId?: string) {
    await this.log({
      userId,
      action: AuditAction.UNAUTHORIZED_ACCESS,
      severity: AuditSeverity.WARNING,
      resource: endpoint,
      ipAddress,
      success: false,
      errorMessage: 'Unauthorized access attempt',
    });
  }

  async logGitCommit(userId: string, commitHash: string, files: number) {
    await this.log({
      userId,
      action: AuditAction.GIT_COMMIT,
      severity: AuditSeverity.INFO,
      resource: 'git',
      resourceId: commitHash,
      metadata: {
        files,
      },
      success: true,
    });
  }
}

// Export singleton instance
export const auditLogService = new AuditLogService();
export default auditLogService;
