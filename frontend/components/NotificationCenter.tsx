'use client';

import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  Info,
  MoreVertical,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: React.ComponentType<{ className?: string }>; badgeClass: string; label: string }
> = {
  success: {
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
    label: 'Success',
  },
  error: {
    icon: TriangleAlert,
    badgeClass: 'bg-red-500/15 text-red-200 border-red-500/30',
    label: 'Error',
  },
  warning: {
    icon: TriangleAlert,
    badgeClass: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    label: 'Warning',
  },
  info: {
    icon: Info,
    badgeClass: 'bg-sky-500/15 text-sky-200 border-sky-500/30',
    label: 'Info',
  },
};

function formatTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
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

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-[var(--panel)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-400" />
            <span className="text-base font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-purple-600 text-xs text-white">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2 border-b border-border bg-[var(--panel-alt)] px-5 py-3">
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={onMarkAllAsRead} className="gap-1">
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClearAll} className="gap-1">
              <Trash2 className="h-3 w-3" />
              Clear all
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <BellOff className="h-16 w-16 text-muted-foreground" />
              <div>
                <p className="text-base font-semibold text-foreground">No notifications</p>
                <p className="text-sm text-muted-foreground">
                  You're all caught up. Notifications will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const { icon: Icon, badgeClass, label } = TYPE_CONFIG[notification.type];
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'px-5 py-4 transition-colors',
                      !notification.read && 'bg-purple-500/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border',
                          badgeClass
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={badgeClass}>
                                {label}
                              </Badge>
                              {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-purple-500" />
                              )}
                            </div>
                            <p
                              className={cn(
                                'truncate text-sm',
                                notification.read ? 'text-muted-foreground' : 'text-foreground font-medium'
                              )}
                            >
                              {notification.message}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Notification actions">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={4} className="w-40">
                              {!notification.read && (
                                <DropdownMenuItem
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    onMarkAsRead(notification.id);
                                  }}
                                  className="gap-2"
                                >
                                  <Check className="h-4 w-4" />
                                  Mark as read
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  onRemove(notification.id);
                                }}
                                className="gap-2 text-red-300 focus:text-red-200"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatTime(notification.timestamp)}</p>

                        {notification.actions && notification.actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {notification.actions.map((action, index) => (
                              <Button
                                key={index}
                                size="sm"
                                variant={
                                  action.variant === 'primary'
                                    ? 'default'
                                    : action.variant === 'danger'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                onClick={action.onClick}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <footer className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">
          Showing last {Math.min(notifications.length, 50)} notifications
        </footer>
      </div>
    </>
  );
}
