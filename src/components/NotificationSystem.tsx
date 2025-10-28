import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Bell, Check, X, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { toast } from './Toast';
import { discordSounds } from '../utils/discordSounds';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  action_url?: string;
  image_url?: string;
  sound?: string;
  read: boolean;
  created_at: string;
}

export default function NotificationSystem() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<any>(null);
  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      fetchNotificationSettings();
      subscribeToNotifications();

      // Request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Cleanup old notifications daily
      const cleanupInterval = setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);

      return () => {
        clearInterval(cleanupInterval);
      };
    }
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchNotificationSettings = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('notification_settings')
        .eq('user_id', profile.id)
        .single();

      if (error) throw error;

      if (data?.notification_settings) {
        setNotificationSettings(data.notification_settings);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const subscribeToNotifications = () => {
    if (!profile) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          handleNewNotification(newNotification);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    const settings = notificationSettings?.[notification.type];
    if (!settings) return;

    // Play sound
    if (settings.sound && notification.sound) {
      playNotificationSound(notification.sound);
    }

    // Show toast
    if (settings.toast) {
      showToastNotification(notification);
    }

    // Show browser notification
    if (settings.push && 'Notification' in window && Notification.permission === 'granted') {
      showBrowserNotification(notification);
    }
  };

  const playNotificationSound = (soundName: string) => {
    try {
      if (soundName === 'achievement') {
        discordSounds.playAchievementUnlock();
      } else if (soundName === 'message') {
        discordSounds.playMessageSent();
      } else if (soundName === 'call_incoming') {
        discordSounds.playIncomingCall();
      } else if (soundName === 'call_join') {
        discordSounds.playUserJoin();
      } else if (soundName === 'notification') {
        discordSounds.playMessageSent();
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const showToastNotification = (notification: Notification) => {
    const priority = notification.priority;
    
    if (priority === 'urgent') {
      toast.error(notification.message, notification.title);
    } else if (priority === 'high') {
      toast.success(notification.message, notification.title);
    } else {
      toast.info(notification.message, notification.title);
    }
  };

  const showBrowserNotification = (notification: Notification) => {
    try {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: notification.image_url || '/logo.png',
        badge: '/logo.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
      });

      browserNotif.onclick = () => {
        window.focus();
        if (notification.action_url) {
          window.location.href = notification.action_url;
        }
        markAsRead(notification.id);
      };
    } catch (error) {
      console.error('Error showing browser notification:', error);
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
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const cleanupOldNotifications = async () => {
    try {
      await supabase.rpc('cleanup_old_notifications');
      fetchNotifications();
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.action_url) {
      window.location.href = notification.action_url;
      setShowPanel(false);
    }
  };

  const updateNotificationSettings = async (type: string, setting: string, value: boolean) => {
    if (!profile) return;

    const newSettings = {
      ...notificationSettings,
      [type]: {
        ...notificationSettings[type],
        [setting]: value,
      },
    };

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ notification_settings: newSettings })
        .eq('user_id', profile.id);

      if (error) throw error;

      setNotificationSettings(newSettings);
      toast.success('Notification settings updated');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-red-500';
      case 'high':
        return 'border-l-4 border-yellow-500';
      case 'normal':
        return 'border-l-4 border-blue-500';
      case 'low':
        return 'border-l-4 border-gray-500';
      default:
        return '';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <>
      {/* Notification Bell */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-400 hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div className="fixed right-4 top-16 w-96 max-h-[600px] bg-[#1a1a1a] border border-[#202225] rounded-lg shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#202225] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#8B5CF6]" />
                <h3 className="text-white font-bold">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-[#8B5CF6] text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-[#8B5CF6] hover:text-[#7C3AED] transition-colors"
                    title="Mark all as read"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Notification settings"
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bell className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        notification.read
                          ? 'bg-[#0f0f0f] hover:bg-[#2f3136]'
                          : 'bg-[#2f3136] hover:bg-[#36393f]'
                      } ${getPriorityColor(notification.priority)}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-white font-semibold text-sm">{notification.title}</h4>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {getTimeAgo(notification.created_at)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">{notification.message}</p>
                      {!notification.read && (
                        <div className="mt-2">
                          <span className="inline-block w-2 h-2 bg-[#8B5CF6] rounded-full"></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Panel */}
            {showSettings && notificationSettings && (
              <div className="border-t border-[#202225] p-4 max-h-64 overflow-y-auto custom-scrollbar">
                <h4 className="text-white font-semibold mb-3 text-sm">Notification Preferences</h4>
                <div className="space-y-2">
                  {Object.entries(notificationSettings).map(([type, settings]: [string, any]) => (
                    <div key={type} className="bg-[#0f0f0f] rounded p-2">
                      <p className="text-white text-xs font-semibold mb-2 capitalize">
                        {type.replace(/_/g, ' ')}
                      </p>
                      <div className="flex gap-4 text-xs">
                        <label className="flex items-center gap-1 text-gray-400">
                          <input
                            type="checkbox"
                            checked={settings.push}
                            onChange={(e) => updateNotificationSettings(type, 'push', e.target.checked)}
                            className="rounded"
                          />
                          Push
                        </label>
                        <label className="flex items-center gap-1 text-gray-400">
                          <input
                            type="checkbox"
                            checked={settings.sound}
                            onChange={(e) => updateNotificationSettings(type, 'sound', e.target.checked)}
                            className="rounded"
                          />
                          Sound
                        </label>
                        <label className="flex items-center gap-1 text-gray-400">
                          <input
                            type="checkbox"
                            checked={settings.toast}
                            onChange={(e) => updateNotificationSettings(type, 'toast', e.target.checked)}
                            className="rounded"
                          />
                          Toast
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

