import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bell, 
  UserPlus, 
  Trophy, 
  Coins, 
  Calendar, 
  AlertCircle,
  Check,
  X,
  ExternalLink
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string | null;
  action_url: string | null;
  action_data: any;
  read: boolean;
  created_at: string;
}

interface NotificationsWidgetProps {
  onNavigate?: (page: string) => void;
}

export default function NotificationsWidget({ onNavigate }: NotificationsWidgetProps) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!profile) return;

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase.rpc('mark_all_notifications_read');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return <UserPlus className="w-5 h-5 text-blue-400" />;
      case 'achievement':
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 'token_transaction':
        return <Coins className="w-5 h-5 text-green-400" />;
      case 'tournament':
        return <Calendar className="w-5 h-5 text-purple-400" />;
      case 'party_invite':
        return <UserPlus className="w-5 h-5 text-pink-400" />;
      case 'level_up':
        return <Trophy className="w-5 h-5 text-orange-400" />;
      case 'quest_complete':
        return <Check className="w-5 h-5 text-emerald-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.action_url && onNavigate) {
      onNavigate(notification.action_url);
    }
  };

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 5);

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-xs text-blue-400">{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No notifications yet</p>
            <p className="text-gray-500 text-xs mt-1">You're all caught up! 🎉</p>
          </div>
        ) : (
          <>
            {displayedNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                  notification.read
                    ? 'bg-[#0f0f0f] border-[#202225] hover:border-[#8B5CF6]'
                    : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 hover:border-[#8B5CF6]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {notification.action_url && (
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-[#8B5CF6] transition-colors flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}

            {notifications.length > 5 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-2 text-sm text-[#8B5CF6] hover:text-[#7C3AED] transition-colors font-medium"
              >
                {showAll ? 'Show less' : `Show all (${notifications.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

