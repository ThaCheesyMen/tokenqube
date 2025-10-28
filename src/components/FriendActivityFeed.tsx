import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Trophy, Gamepad2, TrendingUp, Gift, Star, User } from 'lucide-react';

interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_data: any;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

export default function FriendActivityFeed() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchActivities();
      subscribeToActivities();
    }
  }, [profile]);

  const fetchActivities = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('friend_activities')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToActivities = () => {
    const channel = supabase
      .channel('friend_activities_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_activities'
        },
        (payload) => {
          setActivities(prev => [payload.new as Activity, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 'game_start': return <Gamepad2 className="w-5 h-5 text-blue-500" />;
      case 'level_up': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'purchase': return <Gift className="w-5 h-5 text-purple-500" />;
      case 'milestone': return <Star className="w-5 h-5 text-orange-500" />;
      default: return <User className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    const username = activity.profiles?.username || 'Someone';
    const data = activity.activity_data;

    switch (activity.activity_type) {
      case 'achievement':
        return `${username} unlocked "${data.achievement_name}"`;
      case 'game_start':
        return `${username} started playing ${data.game_name}`;
      case 'level_up':
        return `${username} reached Level ${data.level}!`;
      case 'purchase':
        return `${username} bought ${data.item_name}`;
      case 'milestone':
        return `${username} ${data.message}`;
      default:
        return `${username} did something cool`;
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
      <h3 className="text-xl font-bold text-white mb-4">Friend Activity</h3>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#0f0f0f] rounded-lg h-16"></div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <User className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No friend activity yet</p>
          <p className="text-sm text-gray-500 mt-1">Add friends to see their activity!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-3 bg-[#0f0f0f] rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {getActivityIcon(activity.activity_type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white line-clamp-2">
                  {getActivityText(activity)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

