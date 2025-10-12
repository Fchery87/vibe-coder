/**
 * ToolDrawerPanel Component
 * Wrapper for individual tool panels with error boundary
 * Shows graceful empty states on error or missing config
 */

'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle, Settings } from 'lucide-react';

interface ToolDrawerPanelProps {
  children: ReactNode;
  toolName?: string;
}

interface ToolDrawerPanelState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary for Tool Panels
 * Catches errors and shows muted message instead of crashing
 */
class ToolDrawerPanel extends Component<ToolDrawerPanelProps, ToolDrawerPanelState> {
  constructor(props: ToolDrawerPanelProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ToolDrawerPanelState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`Error in ${this.props.toolName || 'Tool'} panel:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400/50 mb-4" />
          <h3 className="text-lg font-medium text-[var(--text)] mb-2">
            {this.props.toolName || 'Tool'} Error
          </h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            {this.state.error?.message || 'Something went wrong'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="btn text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ToolDrawerPanel;

/**
 * Empty State Component
 * Shows when tool is disabled or not configured
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ToolEmptyState({
  icon = <Settings className="w-12 h-12" />,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="text-[var(--muted)] mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-[var(--text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted)] mb-4 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn text-sm">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Loading State Component
 * Shows skeleton while tool is loading data
 */
interface LoadingStateProps {
  message?: string;
}

export function ToolLoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="loading-spinner w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mb-4"></div>
      <p className="text-sm text-[var(--muted)]">{message}</p>
    </div>
  );
}

/**
 * Error State Component
 * Shows when API call fails but doesn't crash the tool
 */
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ToolErrorState({
  title = 'Failed to load',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <AlertCircle className="w-12 h-12 text-red-400/50 mb-4" />
      <h3 className="text-lg font-medium text-[var(--text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted)] mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn text-sm">
          Retry
        </button>
      )}
    </div>
  );
}
