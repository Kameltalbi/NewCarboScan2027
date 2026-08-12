// Composant pour afficher les notifications du module Collect

import React, { useState, useEffect } from 'react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { CollectNotificationService, CollectNotification } from '@/lib/activity-data/CollectNotificationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, CheckCheck, X, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const CollectNotifications: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<CollectNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (organizationId) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [organizationId]);

  const loadNotifications = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const data = await CollectNotificationService.getUserNotifications(organizationId, {
        limit: 20,
      });
      setNotifications(data);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du chargement des notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!organizationId) return;

    try {
      const count = await CollectNotificationService.getUnreadCount(organizationId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Erreur comptage notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await CollectNotificationService.markAsRead(notificationId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!organizationId) return;

    try {
      await CollectNotificationService.markAllAsRead(organizationId);
      await loadNotifications();
      await loadUnreadCount();
      toast({
        title: 'Notifications marquées comme lues',
        description: 'Toutes les notifications ont été marquées comme lues.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour',
        variant: 'destructive',
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'data_validation_required':
      case 'data_quality_warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'duplicate_detected':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      urgent: 'destructive',
      high: 'default',
      normal: 'secondary',
      low: 'outline',
    };
    return <Badge variant={variants[priority] || 'secondary'} className="text-xs">{priority}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getNotificationIcon(notification.type)}
                      <h4 className="font-semibold text-sm">{notification.title}</h4>
                      {getPriorityBadge(notification.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                      {notification.action_url && (
                        <Link
                          to={notification.action_url}
                          className="text-primary hover:underline"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Voir →
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                        title="Marquer comme lu"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
