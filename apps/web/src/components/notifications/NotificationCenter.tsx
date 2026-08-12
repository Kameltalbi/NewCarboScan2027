import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, CheckCircle2, AlertTriangle, Info, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';

export interface AppNotification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'action';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  link?: string;
}

const NOTIFICATIONS_KEY = 'carboscan_notifications';

const typeIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  action: FileText,
};

const typeColors = {
  success: 'text-score-a',
  warning: 'text-score-c',
  info: 'text-carbon-blue',
  action: 'text-primary',
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored).map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        })));
      }
    } catch {}
  }, []);

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      read: false,
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev].slice(0, 50);
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(NOTIFICATIONS_KEY);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, addNotification, markAsRead, markAllRead, clearAll, unreadCount };
};

const formatTimeAgo = (date: Date, t: (key: string, opts?: any) => string) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t('notifications.timeAgo.now');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('notifications.timeAgo.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('notifications.timeAgo.hours', { count: hours });
  const days = Math.floor(hours / 24);
  return t('notifications.timeAgo.days', { count: days });
};

interface NotificationCenterProps {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  markAsRead,
  markAllRead,
  clearAll,
}) => {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('notifications.title')}>
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{t('notifications.title')}</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                {t('notifications.markAllRead')}
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground">
                {t('notifications.clear')}
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground" role="status">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" aria-hidden="true" />
              <p className="text-sm">{t('notifications.empty')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border" role="list" aria-label={t('notifications.title')}>
              {notifications.map(notif => {
                const Icon = typeIcons[notif.type];
                return (
                  <button
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${!notif.read ? 'bg-primary/5' : ''}`}
                    role="listitem"
                    aria-label={`${notif.title} - ${notif.message}`}
                  >
                    <div className="flex gap-3">
                      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${typeColors[notif.type]}`} aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.read ? 'font-semibold' : ''} text-foreground`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notif.createdAt, t)}
                          </span>
                        </div>
                      </div>
                      {!notif.read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" aria-label="Non lu" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
