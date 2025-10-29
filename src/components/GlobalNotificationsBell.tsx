import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Bell, X, Check, Trash2, Mail } from 'lucide-react';
import { toast } from './Toast';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url?: string;
  data?: any;
  created_at: string;
}

export default function GlobalNotificationsBell() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Notification sound
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create notification sound
    notificationSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZQQ0PWqzn77BdGAg+ltryxnMnBSl+zfDaizsIGGS56+ibUBELTKXh8bllHAU2jdXzzH0vBSd+zvDbl0MLFmS96OyrWBYKPZXX8r90KAUpg83w3I0+CRloxO7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw3I0+CRlpxe7mnEYOD1as5++wXRgIPpjc8sd0JwUlf8zw');

    return () => {
      if (notificationSound.current) {
        notificationSound.current.pause();
        notificationSound.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      subscribeToNotifications();
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!profile) return;

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        async (payload) => {
          const newNotification = payload.new as Notification;
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Play notification sound
          try {
            if (notificationSound.current) {
              notificationSound.current.currentTime = 0;
              await notificationSound.current.play();
            }
          } catch (error) {
            console.log('Could not play notification sound:', error);
          }

          // Show desktop notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/icon-192x192.png',
              badge: '/icon-72x72.png',
              tag: newNotification.id,
            });
          }

          // Show toast
          toast.info(newNotification.title);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const markAllAsRead = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const clearAll = async () => {
    if (!profile) return;
    if (!confirm('Are you sure you want to delete all notifications?')) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate if action URL exists
    if (notification.action_url) {
      window.location.hash = notification.action_url;
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      achievement: '🏆',
      friend_request: '👥',
      party_invite: '🎮',
      message: '💬',
      token_reward: '💰',
      level_up: '⬆️',
      quest_complete: '✅',
      tournament: '🏆',
      system: '🔔',
    };
    return icons[type] || '🔔';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-[#36393f] rounded-lg transition-all duration-200"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed left-24 top-20 w-96 bg-[#2f3136] border border-[#202225] rounded-lg shadow-2xl z-[9999] max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#202225]">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-white" />
              <h3 className="text-white font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  title="Mark all as read"
                >
                  <Check className="w-3 h-3" />
                  Read all
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  title="Clear all"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6]"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Mail className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-400 text-center">No notifications</p>
                <p className="text-gray-500 text-sm text-center mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#202225]">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-[#36393f] transition-colors cursor-pointer group ${
                      !notification.is_read ? 'bg-[#8B5CF6]/5 border-l-2 border-[#8B5CF6]' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-white font-medium text-sm leading-tight">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-[#8B5CF6] rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-1">
                          {notification.message}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-[#202225] rounded"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-[#202225] rounded"
                          title="Delete"
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
        </div>
      )}
    </div>
  );
}

