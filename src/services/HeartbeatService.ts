import { supabase } from '../lib/supabase';

class HeartbeatService {
  private intervalId: number | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private currentUserId: string | null = null;

  async start(userId: string) {
    if (this.intervalId) {
      this.stop(); // Clear any existing interval
    }

    this.currentUserId = userId;

    // Send initial heartbeat
    await this.sendHeartbeat(userId);

    // Set up recurring heartbeat
    this.intervalId = window.setInterval(() => {
      this.sendHeartbeat(userId);
    }, this.HEARTBEAT_INTERVAL);

    // Send offline signal on page unload
    const handleBeforeUnload = () => {
      this.stop(userId);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    console.log('💓 Heartbeat service started for user:', userId);
  }

  async sendHeartbeat(userId: string) {
    try {
      await supabase.rpc('update_user_heartbeat', {
        p_user_id: userId
      });
      console.log('💓 Heartbeat sent');
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }

  async stop(userId?: string) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Set user offline
    const userIdToSet = userId || this.currentUserId;
    if (userIdToSet) {
      try {
        await supabase.rpc('set_user_offline', {
          p_user_id: userIdToSet
        });
        console.log('👋 User set to offline');
      } catch (error) {
        console.error('Error setting user offline:', error);
      }
    }
    
    this.currentUserId = null;
  }
}

export const heartbeatService = new HeartbeatService();

