import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Activity, Gamepad2, Trophy, UserPlus, MessageCircle,
  Star, Clock, TrendingUp, Filter, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  activity_type: string;
  activity_data: any;
  created_at: string;
}

export default function FriendActivity() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (profile) {
      fetchFriendActivity();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('friend_activity')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_activity_log',
          },
          () => {
            fetchFriendActivity();
          }
        )
        .subscribe();

      // Refresh every 30 seconds
      const interval = setInterval(fetchFriendActivity, 30000);

      return () => {
        channel.unsubscribe();
        clearInterval(interval);
      };
    }
  }, [profile, filter]);

  const fetchFriendActivity = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_friend_activity_feed', {
        p_user_id: profile.id,
        p_limit: 50
      });

      if (error) throw error;

      if (data) {
        const mappedActivities: ActivityItem[] = data.map((item: any) => ({
          id: item.activity_id,
          user_id: item.user_id,
          username: item.username,
          avatar_url: item.avatar_url,
          activity_type: item.activity_type,
          activity_data: item.activity_data,
          created_at: item.created_at,
        }));

        // Apply filter
        const filtered = filter === 'all'
          ? mappedActivities
          : mappedActivities.filter(a => a.activity_type === filter);

        setActivities(filtered);
      }
    } catch (error) {
      console.error('Error fetching friend activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'game_started':
      case 'game_session':
        return Gamepad2;
      case 'achievement_unlocked':
        return Trophy;
      case 'friend_added':
        return UserPlus;
      case 'message_sent':
        return MessageCircle;
      case 'level_up':
        return TrendingUp;
      default:
        return Star;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'game_started':
      case 'game_session':
        return 'text-blue-400 bg-blue-500/20';
      case 'achievement_unlocked':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'friend_added':
        return 'text-green-400 bg-green-500/20';
      case 'message_sent':
        return 'text-purple-400 bg-purple-500/20';
      case 'level_up':
        return 'text-orange-400 bg-orange-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    const { activity_type, activity_data } = activity;

    switch (activity_type) {
      case 'game_started':
        return `started playing ${activity_data?.game_name || 'a game'}`;
      case 'game_session':
        return `played ${activity_data?.game_name || 'a game'} for ${activity_data?.duration || '0'} minutes`;
      case 'achievement_unlocked':
        return `unlocked "${activity_data?.achievement_name || 'an achievement'}"`;
      case 'friend_added':
        return `added ${activity_data?.friend_name || 'a friend'}`;
      case 'message_sent':
        return 'sent a message';
      case 'level_up':
        return `reached level ${activity_data?.level || '0'}`;
      default:
        return 'did something';
    }
  };

  const activityTypes = [
    { value: 'all', label: 'All Activity' },
    { value: 'game_started', label: 'Gaming' },
    { value: 'achievement_unlocked', label: 'Achievements' },
    { value: 'friend_added', label: 'Social' },
    { value: 'level_up', label: 'Progression' },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Activity className="w-8 h-8 text-[#8B5CF6]" />
            Friend Activity
          </h1>
          <p className="text-gray-400">See what your friends are up to</p>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1a1a] rounded-lg p-4 mb-6 border border-[#202225]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-5 h-5 text-gray-400" />
              {activityTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFilter(type.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    filter === type.value
                      ? 'bg-[#8B5CF6] text-white'
                      : 'bg-[#0f0f0f] text-gray-400 hover:text-white hover:bg-[#2f3136]'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchFriendActivity()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] hover:bg-[#2f3136] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-3">
          {loading && activities.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-lg p-12 text-center border border-[#202225]">
              <div className="w-12 h-12 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading activity...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-lg p-12 text-center border border-[#202225]">
              <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Activity Yet</h3>
              <p className="text-gray-400">
                {filter === 'all'
                  ? "Your friends haven't been active recently"
                  : `No ${activityTypes.find(t => t.value === filter)?.label.toLowerCase()} activity`}
              </p>
            </div>
          ) : (
            activities.map((activity) => {
              const Icon = getActivityIcon(activity.activity_type);
              const colorClass = getActivityColor(activity.activity_type);

              return (
                <div
                  key={activity.id}
                  className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225] hover:border-[#8B5CF6]/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* User Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white font-bold overflow-hidden">
                        {activity.avatar_url ? (
                          <img
                            src={activity.avatar_url}
                            alt={activity.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          activity.username[0]?.toUpperCase()
                        )}
                      </div>
                      {/* Activity Type Icon Badge */}
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${colorClass} flex items-center justify-center border-2 border-[#1a1a1a]`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-white">
                          <span className="font-semibold">{activity.username}</span>
                          {' '}
                          <span className="text-gray-400">{getActivityText(activity)}</span>
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </div>
                      </div>

                      {/* Additional Activity Data */}
                      {activity.activity_data?.description && (
                        <p className="text-sm text-gray-400 mt-1">
                          {activity.activity_data.description}
                        </p>
                      )}

                      {activity.activity_data?.tokens && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-green-400">
                          <Trophy className="w-4 h-4" />
                          +{activity.activity_data.tokens} tokens earned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More */}
        {activities.length >= 50 && (
          <div className="mt-6 text-center">
            <button className="px-6 py-3 bg-[#1a1a1a] hover:bg-[#2f3136] text-white rounded-lg font-semibold transition-colors border border-[#202225]">
              Load More Activity
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

