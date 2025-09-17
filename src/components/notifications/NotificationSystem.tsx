import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, X, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'reminder';
  read: boolean;
  created_at: string;
  action_url?: string | null;
  expires_at?: string | null;
}

export const NotificationSystem: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const rawNotification = payload.new as any;
          const newNotification: Notification = {
            ...rawNotification,
            type: (rawNotification.type as 'info' | 'warning' | 'success' | 'reminder') || 'info',
            read: rawNotification.read ?? false
          };
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast notification
          toast(newNotification.title, {
            description: newNotification.message,
            action: newNotification.action_url ? {
              label: "View",
              onClick: () => window.open(newNotification.action_url!, '_blank')
            } : undefined,
          });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(showAll ? 50 : 5);

      if (error) throw error;
      setNotifications((data || []).map(item => ({
        ...item,
        type: (item.type as 'info' | 'warning' | 'success' | 'reminder') || 'info',
        read: item.read ?? false
      })));
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'reminder': return <Bell className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs h-4">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowAll(!showAll)}
          className="text-xs"
        >
          {showAll ? 'Show Less' : 'Show All'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="max-h-64 overflow-y-auto space-y-2">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-2 rounded-lg border transition-colors ${
                  notification.read ? 'bg-muted/30' : 'bg-accent/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium truncate">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissNotification(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">No notifications</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};