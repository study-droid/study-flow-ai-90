import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, BellOff, CheckCircle, AlertCircle, Info, Trophy, 
  Target, Clock, BookOpen, TrendingUp, Settings, Volume2,
  Calendar, Filter, Archive, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";
import { notificationsApi } from '@/lib/api-extended';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/lib/config';

interface Notification {
  id: string;
  type: 'achievement' | 'reminder' | 'milestone' | 'deadline' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'study' | 'goals' | 'tasks' | 'sessions' | 'system';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface NotificationCenterProps {
  className?: string;
}

// Transform API notification data to match component interface
const transformNotificationData = (apiNotification: any): Notification => ({
  id: apiNotification.id,
  type: apiNotification.type === 'success' ? 'achievement' : 
        apiNotification.type === 'warning' ? 'reminder' :
        apiNotification.type === 'info' ? 'milestone' :
        apiNotification.type === 'error' ? 'deadline' : 'system',
  title: apiNotification.title,
  message: apiNotification.message,
  timestamp: new Date(apiNotification.created_at),
  read: apiNotification.is_read,
  priority: apiNotification.priority,
  category: apiNotification.type === 'success' ? 'study' :
           apiNotification.type === 'warning' ? 'sessions' :
           apiNotification.type === 'info' ? 'goals' :
           apiNotification.type === 'error' ? 'tasks' : 'system',
  actionUrl: apiNotification.action_url || undefined,
  metadata: {}
});

export const NotificationCenter = ({ className }: NotificationCenterProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'priority'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();
  
  const { info, success } = useNotificationSystem();

  // Fetch notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await notificationsApi.getAll();
        
        if (response.success && response.data) {
          const transformedNotifications = response.data.map(transformNotificationData);
          setNotifications(transformedNotifications);
        } else {
          throw new Error(response.error || 'Failed to fetch notifications');
        }
      } catch (error) {
        log.error('Error fetching notifications:', error);
        toast({
          title: "Error",
          description: "Failed to load notifications",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [toast]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const priorityCount = notifications.filter(n => n.priority === 'high' && !n.read).length;

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'priority' && notification.priority !== 'high') return false;
    if (categoryFilter !== 'all' && notification.category !== categoryFilter) return false;
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    success('All notifications marked as read');
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    info('Notification deleted');
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'achievement':
        return <Trophy className="h-5 w-5 text-achievement" />;
      case 'reminder':
        return <Clock className="h-5 w-5 text-warning" />;
      case 'milestone':
        return <Target className="h-5 w-5 text-progress" />;
      case 'deadline':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'system':
        return <Info className="h-5 w-5 text-primary" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-destructive border-destructive';
      case 'medium':
        return 'text-warning border-warning';
      case 'low':
        return 'text-muted-foreground border-muted';
      default:
        return 'text-muted-foreground border-muted';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <EnhancedCard variant="glass" className={cn("w-full max-w-2xl", className)}>
      <EnhancedCardHeader>
        <div className="flex items-center justify-between">
          <EnhancedCardTitle className="flex items-center gap-3">
            <Bell className="h-6 w-6" />
            Notification Center
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </EnhancedCardTitle>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <EnhancedButton
                onClick={markAllAsRead}
                variant="outline"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark All Read
              </EnhancedButton>
            )}
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </EnhancedCardHeader>

      <EnhancedCardContent>
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notifications">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4 mt-6">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant={filter === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilter('all')}
              >
                All
              </Badge>
              <Badge 
                variant={filter === 'unread' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </Badge>
              <Badge 
                variant={filter === 'priority' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilter('priority')}
              >
                Priority ({priorityCount})
              </Badge>
              
              <Separator orientation="vertical" className="h-6 mx-2" />
              
              {['all', 'study', 'goals', 'tasks', 'sessions', 'system'].map(category => (
                <Badge
                  key={category}
                  variant={categoryFilter === category ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>

            {/* Notifications List */}
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications found</p>
                  </div>
                ) : (
                  filteredNotifications.map(notification => (
                    <Card
                      key={notification.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md",
                        !notification.read && "border-l-4 border-l-primary bg-primary/5",
                        notification.priority === 'high' && "border-destructive/50"
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">
                                {notification.title}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getPriorityColor(notification.priority))}
                                >
                                  {notification.priority}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(notification.timestamp)}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between pt-2">
                              <Badge variant="secondary" className="text-xs capitalize">
                                {notification.category}
                              </Badge>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Archive className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span className="font-medium">Enable Notifications</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for important events
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    <span className="font-medium">Sound Notifications</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Play sound when receiving notifications
                  </p>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Notification Categories</h4>
                
                {[
                  { key: 'study', label: 'Study Sessions', icon: BookOpen },
                  { key: 'goals', label: 'Goal Progress', icon: Target },
                  { key: 'tasks', label: 'Task Reminders', icon: CheckCircle },
                  { key: 'achievements', label: 'Achievements', icon: Trophy },
                  { key: 'deadlines', label: 'Deadlines', icon: Calendar }
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{label}</span>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Quiet Hours</h4>
                <p className="text-sm text-muted-foreground">
                  Disable notifications during these hours
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">From</label>
                    <input
                      type="time"
                      defaultValue="22:00"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To</label>
                    <input
                      type="time"
                      defaultValue="07:00"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </EnhancedCardContent>
    </EnhancedCard>
  );
};