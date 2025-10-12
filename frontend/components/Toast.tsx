'use client';

import { useEffect, useState } from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
  actions?: ToastAction[];
}

export default function Toast({ message, type, onClose, duration = 4000, actions }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setIsVisible(true);

    // Auto close after duration (unless there are actions - let user dismiss manually)
    if (!actions || actions.length === 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose, actions]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 border-green-400/50 text-green-300';
      case 'error':
        return 'bg-red-500/20 border-red-400/50 text-red-300';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300';
      case 'info':
      default:
        return 'bg-blue-500/20 border-blue-400/50 text-blue-300';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 glass-panel p-4 rounded-lg shadow-2xl border transition-all duration-300 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${getToastStyles()}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{getIcon()}</span>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Action buttons */}
      {actions && actions.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          {actions.map((action, index) => {
            const buttonStyles = action.variant === 'primary'
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : action.variant === 'danger'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-gray-200';

            return (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className={`px-3 py-1 text-xs rounded transition-colors ${buttonStyles}`}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Progress bar (only for non-actionable toasts) */}
      {(!actions || actions.length === 0) && (
        <div className="mt-3 bg-black/20 rounded-full h-1 overflow-hidden">
          <div
            className={`h-full transition-all ease-linear ${
              type === 'success' ? 'bg-green-400' :
              type === 'error' ? 'bg-red-400' :
              type === 'warning' ? 'bg-yellow-400' :
              'bg-blue-400'
            }`}
            style={{
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    actions?: ToastAction[];
  }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
          actions={toast.actions}
        />
      ))}
    </div>
  );
}

// Toast hook for easy usage
export function useToast() {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    // Generate unique ID using timestamp + random number to avoid collisions
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
}