import { ModelRegistryService } from './model-registry';
import { ModelUsage } from '../types/models';

export interface BudgetConfig {
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  alertThresholds: {
    daily: number; // Percentage (e.g., 80 for 80%)
    weekly: number;
    monthly: number;
  };
  enableAlerts: boolean;
  hardLimit: boolean; // If true, block requests when limit exceeded
}

export interface BudgetStatus {
  period: 'daily' | 'weekly' | 'monthly';
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  isOverLimit: boolean;
  isNearLimit: boolean;
  resetDate: Date;
}

export interface BudgetAlert {
  id: string;
  type: 'warning' | 'limit_exceeded' | 'budget_reset';
  period: 'daily' | 'weekly' | 'monthly';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface UsageAnalytics {
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  averageCostPerRequest: number;
  topModels: Array<{
    model: string;
    provider: string;
    requests: number;
    cost: number;
  }>;
  costByPeriod: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  trends: {
    dailyChange: number;
    weeklyChange: number;
  };
}

export class BudgetManager {
  private config: BudgetConfig;
  private alerts: BudgetAlert[] = [];
  private usageHistory: ModelUsage[] = [];

  constructor(
    private modelRegistry: ModelRegistryService,
    config?: Partial<BudgetConfig>
  ) {
    this.config = {
      dailyLimit: 50.00,
      weeklyLimit: 300.00,
      monthlyLimit: 1000.00,
      alertThresholds: {
        daily: 80,
        weekly: 75,
        monthly: 70
      },
      enableAlerts: true,
      hardLimit: false,
      ...config
    };
  }

  /**
   * Check if a request would exceed budget limits
   */
  async checkRequestBudget(
    providerName: string,
    modelName: string,
    estimatedTokens: number,
    estimatedCost: number
  ): Promise<{
    allowed: boolean;
    reason?: string;
    wouldExceed: string[];
    alerts: BudgetAlert[];
  }> {
    const wouldExceed: string[] = [];
    const alerts: BudgetAlert[] = [];

    // Check daily budget
    const dailyStatus = this.getBudgetStatus('daily');
    const newDailyTotal = dailyStatus.used + estimatedCost;

    if (newDailyTotal > dailyStatus.limit) {
      wouldExceed.push('daily');
      if (this.config.hardLimit) {
        alerts.push(this.createAlert('limit_exceeded', 'daily',
          `Daily budget limit ($${dailyStatus.limit}) would be exceeded. Current: $${dailyStatus.used}, Additional: $${estimatedCost}`));
      }
    } else if (this.isNearLimit(newDailyTotal, dailyStatus.limit, 'daily')) {
      alerts.push(this.createAlert('warning', 'daily',
        `Daily budget usage at ${(newDailyTotal / dailyStatus.limit * 100).toFixed(1)}%`));
    }

    // Check weekly budget
    const weeklyStatus = this.getBudgetStatus('weekly');
    const newWeeklyTotal = weeklyStatus.used + estimatedCost;

    if (newWeeklyTotal > weeklyStatus.limit) {
      wouldExceed.push('weekly');
      if (this.config.hardLimit) {
        alerts.push(this.createAlert('limit_exceeded', 'weekly',
          `Weekly budget limit ($${weeklyStatus.limit}) would be exceeded`));
      }
    } else if (this.isNearLimit(newWeeklyTotal, weeklyStatus.limit, 'weekly')) {
      alerts.push(this.createAlert('warning', 'weekly',
        `Weekly budget usage at ${(newWeeklyTotal / weeklyStatus.limit * 100).toFixed(1)}%`));
    }

    // Check monthly budget
    const monthlyStatus = this.getBudgetStatus('monthly');
    const newMonthlyTotal = monthlyStatus.used + estimatedCost;

    if (newMonthlyTotal > monthlyStatus.limit) {
      wouldExceed.push('monthly');
      if (this.config.hardLimit) {
        alerts.push(this.createAlert('limit_exceeded', 'monthly',
          `Monthly budget limit ($${monthlyStatus.limit}) would be exceeded`));
      }
    } else if (this.isNearLimit(newMonthlyTotal, monthlyStatus.limit, 'monthly')) {
      alerts.push(this.createAlert('warning', 'monthly',
        `Monthly budget usage at ${(newMonthlyTotal / monthlyStatus.limit * 100).toFixed(1)}%`));
    }

    const allowed = this.config.hardLimit ? wouldExceed.length === 0 : true;

    return {
      allowed,
      reason: allowed ? undefined : `Would exceed budget limits: ${wouldExceed.join(', ')}`,
      wouldExceed,
      alerts
    };
  }

  /**
   * Record usage and check for budget alerts
   */
  recordUsage(
    providerName: string,
    modelName: string,
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): BudgetAlert[] {
    // Record in model registry
    this.modelRegistry.recordUsage(providerName, modelName, inputTokens, outputTokens, cost);

    // Get current usage from model registry
    const usageStats = this.modelRegistry.getUsageStats();
    this.usageHistory = []; // In real implementation, would sync with model registry

    // Check for new alerts
    const newAlerts = this.checkForAlerts();

    if (newAlerts.length > 0) {
      this.alerts.push(...newAlerts);
    }

    return newAlerts;
  }

  /**
   * Get current budget status for a period
   */
  getBudgetStatus(period: 'daily' | 'weekly' | 'monthly'): BudgetStatus {
    const usageStats = this.modelRegistry.getUsageStats();
    const limit = this.getLimitForPeriod(period);
    const used = this.getUsageForPeriod(period);

    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    const isOverLimit = used > limit;
    const isNearLimit = this.isNearLimit(used, limit, period);

    return {
      period,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      percentage,
      isOverLimit,
      isNearLimit,
      resetDate: this.getResetDate(period)
    };
  }

  /**
   * Get comprehensive usage analytics
   */
  getUsageAnalytics(): UsageAnalytics {
    const usageStats = this.modelRegistry.getUsageStats();

    // Get model breakdown
    const modelUsage = new Map<string, { requests: number; cost: number; provider: string }>();

    // In real implementation, would aggregate from usage history
    // For now, return basic analytics
    return {
      totalRequests: usageStats.totalRequests,
      totalCost: usageStats.totalCost,
      totalTokens: usageStats.totalInputTokens + usageStats.totalOutputTokens,
      averageCostPerRequest: usageStats.averageCostPerRequest,
      topModels: [], // Would be populated from detailed usage data
      costByPeriod: {
        today: this.getUsageForPeriod('daily'),
        thisWeek: this.getUsageForPeriod('weekly'),
        thisMonth: this.getUsageForPeriod('monthly')
      },
      trends: {
        dailyChange: 0, // Would calculate trend from historical data
        weeklyChange: 0
      }
    };
  }

  /**
   * Get active budget alerts
   */
  getActiveAlerts(): BudgetAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Update budget configuration
   */
  updateBudgetConfig(newConfig: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Check if configuration change affects current alerts
    this.checkForAlerts();
  }

  /**
   * Get current budget configuration
   */
  getBudgetConfig(): BudgetConfig {
    return { ...this.config };
  }

  /**
   * Reset budget for a specific period
   */
  resetBudget(period: 'daily' | 'weekly' | 'monthly'): void {
    // In real implementation, would clear usage history for the period
    this.alerts.push({
      id: `reset-${Date.now()}`,
      type: 'budget_reset',
      period,
      message: `Budget reset for ${period} period`,
      timestamp: new Date(),
      acknowledged: false
    });
  }

  /**
   * Check for new budget alerts based on current usage
   */
  private checkForAlerts(): BudgetAlert[] {
    const newAlerts: BudgetAlert[] = [];

    // Check daily budget
    const dailyStatus = this.getBudgetStatus('daily');
    if (dailyStatus.isNearLimit && !this.hasRecentAlert('daily', 'warning')) {
      newAlerts.push(this.createAlert('warning', 'daily',
        `Daily budget usage at ${dailyStatus.percentage.toFixed(1)}%`));
    }
    if (dailyStatus.isOverLimit && !this.hasRecentAlert('daily', 'limit_exceeded')) {
      newAlerts.push(this.createAlert('limit_exceeded', 'daily',
        `Daily budget limit exceeded: $${dailyStatus.used.toFixed(2)} / $${dailyStatus.limit}`));
    }

    // Check weekly budget
    const weeklyStatus = this.getBudgetStatus('weekly');
    if (weeklyStatus.isNearLimit && !this.hasRecentAlert('weekly', 'warning')) {
      newAlerts.push(this.createAlert('warning', 'weekly',
        `Weekly budget usage at ${weeklyStatus.percentage.toFixed(1)}%`));
    }
    if (weeklyStatus.isOverLimit && !this.hasRecentAlert('weekly', 'limit_exceeded')) {
      newAlerts.push(this.createAlert('limit_exceeded', 'weekly',
        `Weekly budget limit exceeded: $${weeklyStatus.used.toFixed(2)} / $${weeklyStatus.limit}`));
    }

    // Check monthly budget
    const monthlyStatus = this.getBudgetStatus('monthly');
    if (monthlyStatus.isNearLimit && !this.hasRecentAlert('monthly', 'warning')) {
      newAlerts.push(this.createAlert('warning', 'monthly',
        `Monthly budget usage at ${monthlyStatus.percentage.toFixed(1)}%`));
    }
    if (monthlyStatus.isOverLimit && !this.hasRecentAlert('monthly', 'limit_exceeded')) {
      newAlerts.push(this.createAlert('limit_exceeded', 'monthly',
        `Monthly budget limit exceeded: $${monthlyStatus.used.toFixed(2)} / $${monthlyStatus.limit}`));
    }

    return newAlerts;
  }

  /**
   * Check if we've recently sent an alert for this period and type
   */
  private hasRecentAlert(period: string, type: string): boolean {
    const recentThreshold = 60 * 60 * 1000; // 1 hour
    return this.alerts.some(alert =>
      alert.period === period &&
      alert.type === type &&
      (Date.now() - alert.timestamp.getTime()) < recentThreshold
    );
  }

  /**
   * Create a new budget alert
   */
  private createAlert(type: 'warning' | 'limit_exceeded' | 'budget_reset', period: string, message: string): BudgetAlert {
    return {
      id: `${type}-${period}-${Date.now()}`,
      type,
      period: period as any,
      message,
      timestamp: new Date(),
      acknowledged: false
    };
  }

  /**
   * Check if usage is near limit threshold
   */
  private isNearLimit(used: number, limit: number, period: string): boolean {
    if (limit <= 0) return false;

    const threshold = this.config.alertThresholds[period as keyof typeof this.config.alertThresholds];
    return (used / limit) * 100 >= threshold;
  }

  /**
   * Get usage for a specific period
   */
  private getUsageForPeriod(period: 'daily' | 'weekly' | 'monthly'): number {
    const usageStats = this.modelRegistry.getUsageStats();

    switch (period) {
      case 'daily':
        // For demo, assume all usage is from today
        return usageStats.totalCost * 0.1; // Simplified
      case 'weekly':
        return usageStats.totalCost * 0.3; // Simplified
      case 'monthly':
        return usageStats.totalCost;
      default:
        return 0;
    }
  }

  /**
   * Get limit for a specific period
   */
  private getLimitForPeriod(period: 'daily' | 'weekly' | 'monthly'): number {
    switch (period) {
      case 'daily':
        return this.config.dailyLimit;
      case 'weekly':
        return this.config.weeklyLimit;
      case 'monthly':
        return this.config.monthlyLimit;
      default:
        return 0;
    }
  }

  /**
   * Get reset date for a period
   */
  private getResetDate(period: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();

    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + (7 - now.getDay()));
        return nextWeek;
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      default:
        return now;
    }
  }
}