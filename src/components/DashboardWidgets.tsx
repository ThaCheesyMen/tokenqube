import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Trophy, Target, Flame, Calendar, Clock, TrendingUp, 
  Zap, Crown, Star, Users, MessageSquare, Coins
} from 'lucide-react';

// Daily Quest Widget
export function DailyQuestsWidget() {
  const { profile } = useAuth();
  const [quests, setQuests] = useState<any[]>([]);

  useEffect(() => {
    fetchDailyQuests();
  }, [profile]);

  const fetchDailyQuests = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('quests')
      .select('*')
      .eq('quest_type', 'daily')
      .order('created_at', { ascending: false})
      .limit(3);

    if (data && data.length > 0) {
      setQuests(data);
    } else {
      // Fallback to sample quests if none exist
      setQuests([
        {
          id: 'sample-1',
          title: 'Win 3 Matches',
          description: 'Achieve victory in any competitive game',
          reward_tokens: 150,
          current_progress: 1,
          required_count: 3,
          quest_type: 'daily'
        },
        {
          id: 'sample-2',
          title: 'Play for 2 Hours',
          description: 'Log 2 hours of gaming time today',
          reward_tokens: 200,
          current_progress: 0.7,
          required_count: 2,
          quest_type: 'daily'
        },
        {
          id: 'sample-3',
          title: 'Unlock 1 Achievement',
          description: 'Complete any in-game achievement',
          reward_tokens: 100,
          current_progress: 0,
          required_count: 1,
          quest_type: 'daily'
        }
      ]);
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-xl border border-[#202225] overflow-hidden hover:border-[#8B5CF6]/50 transition">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Target className="w-5 h-5" />
          Daily Quests
        </h3>
        <span className="text-white/90 text-sm font-semibold">{quests.length}/3</span>
      </div>

      <div className="p-6 space-y-4">
        {quests.map((quest, index) => (
            <div key={quest.id || index} className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225] hover:border-[#8B5CF6]/50 transition group">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-white font-semibold text-sm">{quest.title || 'Complete 5 Tasks'}</h4>
                <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-md">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400 text-xs font-bold">+{quest.reward_tokens || 100}</span>
                </div>
              </div>
              <p className="text-gray-400 text-xs mb-3">{quest.description || 'Complete tasks to earn tokens'}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Progress</span>
                  <span className="text-white font-semibold">{quest.current_progress || 2}/{quest.required_count || 5}</span>
                </div>
                <div className="w-full bg-[#202225] rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-500"
                    style={{ width: `${((quest.current_progress || 2) / (quest.required_count || 5)) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// Activity Streak Widget
export function ActivityStreakWidget({ streak }: { streak: number }) {
  const streakMilestones = [7, 14, 30, 60, 100];
  const nextMilestone = streakMilestones.find(m => m > streak) || streakMilestones[streakMilestones.length - 1];

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-xl border border-[#202225] overflow-hidden hover:border-[#8B5CF6]/50 transition">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Flame className="w-5 h-5" />
          Activity Streak
        </h3>
      </div>

      <div className="p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-500 mb-4 relative">
            <Flame className="w-12 h-12 text-white animate-pulse" />
            {streak > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-[#1a1a1a]">
                {streak}
              </div>
            )}
          </div>
          <h4 className="text-3xl font-bold text-white mb-1">{streak} Days</h4>
          <p className="text-gray-400 text-sm">Keep it up!</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Next milestone</span>
            <span className="text-white font-semibold">{nextMilestone} days</span>
          </div>
          <div className="w-full bg-[#202225] rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-orange-500 to-red-500 h-full transition-all duration-500"
              style={{ width: `${(streak / nextMilestone) * 100}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-5 gap-2 mt-4">
            {streakMilestones.map((milestone, index) => (
              <div 
                key={milestone}
                className={`text-center p-2 rounded-lg transition ${
                  streak >= milestone 
                    ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30' 
                    : 'bg-[#0f0f0f] border border-[#202225]'
                }`}
              >
                <div className="text-xs font-bold text-white">{milestone}</div>
                {streak >= milestone && (
                  <Crown className="w-3 h-3 text-yellow-500 mx-auto mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Recent Activity Feed Widget
export function RecentActivityWidget() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentActivity();
  }, [profile]);

  const fetchRecentActivity = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('gaming_activity')
      .select('*')
      .eq('user_id', profile.id)
      .order('activity_date', { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      setActivities(data);
    } else {
      // Fallback to sample activities
      const now = new Date();
      setActivities([
        {
          id: 'sample-1',
          game_name: 'Counter-Strike 2',
          activity_type: 'game_session',
          hours_played: 2.5,
          tokens_earned: 125,
          activity_date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'sample-2',
          game_name: 'Valorant',
          activity_type: 'achievement',
          hours_played: 1.2,
          tokens_earned: 50,
          activity_date: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'sample-3',
          game_name: 'League of Legends',
          activity_type: 'level_up',
          hours_played: 3.0,
          tokens_earned: 200,
          activity_date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'sample-4',
          game_name: 'Apex Legends',
          activity_type: 'game_session',
          hours_played: 1.8,
          tokens_earned: 90,
          activity_date: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString()
        }
      ]);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'game_session': return Clock;
      case 'achievement': return Trophy;
      case 'level_up': return Zap;
      default: return Star;
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-xl border border-[#202225] overflow-hidden hover:border-[#8B5CF6]/50 transition">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Recent Activity
        </h3>
      </div>

      <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.activity_type || 'game_session');
            return (
              <div key={activity.id || index} className="flex items-start gap-3 bg-[#0f0f0f] rounded-lg p-3 border border-[#202225] hover:border-[#8B5CF6]/50 transition">
                <div className="p-2 bg-[#8B5CF6]/20 rounded-lg flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#8B5CF6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{activity.game_name || 'Gaming Session'}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {activity.hours_played ? `${activity.hours_played.toFixed(1)}h played` : 'Activity recorded'}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(activity.activity_date).toLocaleDateString()}
                  </p>
                </div>
                {activity.tokens_earned && activity.tokens_earned > 0 && (
                  <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-md flex-shrink-0">
                    <Coins className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 text-xs font-bold">+{activity.tokens_earned}</span>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// Friends Online Widget
export function FriendsOnlineWidget({ onNavigate, onViewProfile }: { onNavigate: (page: string) => void; onViewProfile: (userId: string) => void }) {
  const { profile } = useAuth();
  const [allFriends, setAllFriends] = useState<any[]>([]);

  useEffect(() => {
    fetchAllFriends();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAllFriends, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  const fetchAllFriends = async () => {
    if (!profile) return;

    try {
      // Fetch all accepted friendships
      const { data: friendships, error } = await supabase
        .from('friends')
        .select(`
          friend_id,
          friend:profiles!friends_friend_id_fkey(
            id, 
            username, 
            avatar_url, 
            status, 
            last_heartbeat,
            currently_playing,
            currently_playing_platform
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error fetching friends:', error);
        setAllFriends([]);
        return;
      }

      if (friendships && friendships.length > 0) {
        const friends = friendships
          .map(f => f.friend)
          .filter(f => f)
          .map(friend => {
            // Check if friend is actually online (heartbeat within last 2 minutes)
            const isOnline = friend.last_heartbeat && 
              (new Date().getTime() - new Date(friend.last_heartbeat).getTime()) < 120000;
            
            return {
              ...friend,
              status: isOnline ? friend.status : 'offline'
            };
          })
          .sort((a, b) => {
            // Sort by status: online > idle > dnd > offline
            const statusOrder = { online: 0, idle: 1, dnd: 2, offline: 3 };
            return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
          });
        setAllFriends(friends);
      } else {
        // No friends found - show empty state
        setAllFriends([]);
      }
    } catch (error) {
      console.error('Error in fetchAllFriends:', error);
      setAllFriends([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'idle': return 'Idle';
      case 'dnd': return 'Do Not Disturb';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'idle': return 'text-yellow-400';
      case 'dnd': return 'text-red-400';
      case 'offline': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const onlineFriendsCount = allFriends.filter(f => f.status === 'online').length;

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-xl border border-[#202225] overflow-hidden hover:border-[#8B5CF6]/50 transition">
      <div className="bg-gradient-to-r from-green-500 to-teal-500 px-6 py-4 flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Friends
        </h3>
        <span className="text-white/90 text-sm font-semibold">{onlineFriendsCount} online</span>
      </div>

      <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
        {allFriends.map((friend) => (
          <div key={friend.id} className="flex items-center gap-3 bg-[#0f0f0f] rounded-lg p-3 border border-[#202225] hover:border-[#8B5CF6]/50 transition group">
            <div 
              className="relative cursor-pointer"
              onClick={() => onViewProfile(friend.id)}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white font-bold overflow-hidden">
                {friend.avatar_url ? (
                  <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
                ) : (
                  friend.username?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${getStatusColor(friend.status)} rounded-full border-2 border-[#1a1a1a]`}></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{friend.username || 'User'}</p>
              {friend.currently_playing ? (
                <p className="text-green-400 text-xs truncate">Playing {friend.currently_playing}</p>
              ) : (
                <p className={`text-xs ${getStatusTextColor(friend.status)}`}>{getStatusText(friend.status)}</p>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button 
                onClick={() => onNavigate('chat')}
                className="p-2 bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg transition"
              >
                <MessageSquare className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        ))}
        {allFriends.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No friends yet</p>
            <button 
              onClick={() => onNavigate('friends')}
              className="mt-3 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg text-sm font-semibold transition"
            >
              Add Friends
            </button>
          </div>
        )}
        {allFriends.length > 0 && (
          <button 
            onClick={() => onNavigate('friends')}
            className="w-full py-2 text-center text-[#8B5CF6] hover:text-[#7C3AED] text-sm font-semibold transition"
          >
            View All Friends
          </button>
        )}
      </div>
    </div>
  );
}

