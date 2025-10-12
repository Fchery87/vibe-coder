'use client';

import { useState, useCallback } from 'react';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
  read: boolean;
  actions?: NotificationAction[];
  metadata?: {
    filePath?: string;
    diffAvailable?: boolean;
    [key: string]: any;
  };
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    actions?: NotificationAction[],
    metadata?: any
  ) => string;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  getUnreadNotifications: () => Notification[];
}

const MAX_NOTIFICATIONS = 50;

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'info',
      actions?: NotificationAction[],
      metadata?: any
    ): string => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newNotification: Notification = {
        id,
        message,
        type,
        timestamp: new Date(),
        read: false,
        actions,
        metadata,
      };

      setNotifications((prev) => {
        return [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
      });

      return id;
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const getUnreadNotifications = useCallback(() => {
    return notifications.filter((notif) => !notif.read);
  }, [notifications]);

  const unreadCount = notifications.filter((notif) => !notif.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    getUnreadNotifications,
  };
}

