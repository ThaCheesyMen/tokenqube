import { useState, useEffect } from 'react';
import { Bell, Check, X, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../utils/notifications';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  action_url?: string;
  created_at: string;
}

export default function NotificationCenter() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;

    fetchNotifications();

    // Subscribe to real-time notifications
    const unsubscribe = NotificationService.subscribeToNotifications(
      profile.id,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;

    setLoading(true);
    const unread = await NotificationService.getUnreadNotifications(profile.id);
    setNotifications(unread);
    setUnreadCount(unread.length);
    setLoading(false);
  };

  const handleMarkAsRead = async (id: string) => {
    await NotificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    if (!profile) return;
    await NotificationService.markAllAsRead(profile.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
    
    setShowDropdown(false);
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      friend_request: '👥',
      party_invite: '🎮',
      message: '💬',
      achievement: '🏆',
      system: '⚙️',
      marketplace: '🛒',
      guild: '⚔️',
      tournament: '🏅',
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-96 bg-[#1a1a1a] rounded-lg shadow-2xl border border-[#202225] z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#202225]">
              <h3 className="text-white font-bold text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[#8B5CF6] hover:text-[#7C3AED] text-sm font-medium flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mx-auto"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No notifications</p>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-[#202225] cursor-pointer transition ${
                      !notification.read
                        ? 'bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20'
                        : 'hover:bg-[#0f0f0f]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-white font-semibold text-sm">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-[#8B5CF6] rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#1a1a1a] transition flex-shrink-0"
                        title="Mark as read"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-[#202225]">
                <button
                  onClick={() => {
                    window.location.href = '/notifications';
                    setShowDropdown(false);
                  }}
                  className="w-full text-center text-[#8B5CF6] hover:text-[#7C3AED] text-sm font-medium py-2"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

