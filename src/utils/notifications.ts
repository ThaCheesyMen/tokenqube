import { supabase } from '../lib/supabase';

export class NotificationService {
  private static hasPermission = false;

  /**
   * Request browser notification permission
   */
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    }

    return false;
  }

  /**
   * Send a browser notification
   */
  static async sendNotification(title: string, options?: NotificationOptions) {
    if (!this.hasPermission || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo.png',
        badge: '/badge.png',
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Navigate to action URL if provided
        if (options?.data?.actionUrl) {
          window.location.href = options.data.actionUrl;
        }
      };
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Subscribe to real-time notifications from Supabase
   */
  static subscribeToNotifications(userId: string, onNotification?: (notification: any) => void) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const notification = payload.new;

          // Show browser notification
          await this.sendNotification(notification.title, {
            body: notification.message,
            data: { actionUrl: notification.action_url, ...notification.data },
            tag: notification.id,
          });

          // Call custom handler if provided
          onNotification?.(notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Fetch unread notifications
   */
  static async getUnreadNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string) {
    const { error } = await supabase.rpc('mark_notification_read', {
      notification_id: notificationId,
    });

    if (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Create a notification (server-side trigger)
   */
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    data?: any,
    actionUrl?: string
  ) {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      data,
      action_url: actionUrl,
    });

    if (error) {
      console.error('Error creating notification:', error);
    }
  }
}

export default NotificationService;

