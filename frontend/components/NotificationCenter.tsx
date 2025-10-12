'use client';

import { X, Check, CheckCheck, Trash2, Bell, BellOff } from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onRemove: (id: string) => void;
}

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onRemove,
}: NotificationCenterProps) {
  if (!isOpen) return null;

  const getIcon = (type: Notification['type']) => {
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

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-400/30 bg-green-500/10';
      case 'error':
        return 'border-red-400/30 bg-red-500/10';
      case 'warning':
        return 'border-yellow-400/30 bg-yellow-500/10';
      case 'info':
      default:
        return 'border-blue-400/30 bg-blue-500/10';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md glass-panel border-l border-[var(--border)] shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700/50 rounded transition-colors text-gray-400 hover:text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions Bar */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-slate-800/30 flex-shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-gray-200 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear all
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <BellOff className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">
                No notifications
              </h3>
              <p className="text-sm text-gray-500">
                You're all caught up! Notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-800/30 transition-colors ${
                    !notification.read ? 'bg-purple-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <span className="text-lg flex-shrink-0">
                      {getIcon(notification.type)}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm ${notification.read ? 'text-gray-300' : 'text-white font-medium'}`}>
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1" />
                        )}
                      </div>

                      <p className="text-xs text-gray-500 mb-2">
                        {formatTime(notification.timestamp)}
                      </p>

                      {/* Action buttons */}
                      {notification.actions && notification.actions.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          {notification.actions.map((action, index) => {
                            const buttonStyles = action.variant === 'primary'
                              ? 'bg-purple-600 hover:bg-purple-700 text-white'
                              : action.variant === 'danger'
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-gray-200';

                            return (
                              <button
                                key={index}
                                onClick={action.onClick}
                                className={`px-2 py-1 text-xs rounded transition-colors ${buttonStyles}`}
                              >
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => onMarkAsRead(notification.id)}
                          className="p-1 hover:bg-slate-700/50 rounded transition-colors text-gray-400 hover:text-white"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onRemove(notification.id)}
                        className="p-1 hover:bg-slate-700/50 rounded transition-colors text-gray-400 hover:text-white"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] bg-slate-800/50 px-4 py-3 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center">
            Showing last {Math.min(notifications.length, 50)} notifications
          </p>
        </div>
      </div>
    </>
  );
}
