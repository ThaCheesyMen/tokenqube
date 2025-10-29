import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Cloud,
  Sun,
  Zap,
  Star,
  Gamepad2,
  TrendingUp,
  Users,
  Heart,
  Trophy,
  MessageCircle,
  Clock
} from 'lucide-react';

// =====================================================
// GAMING WEATHER WIDGET
// =====================================================
interface GamingWeather {
  condition: 'sunny' | 'cloudy' | 'stormy' | 'electric';
  description: string;
  icon: JSX.Element;
  color: string;
}

export function GamingWeatherWidget() {
  const { profile } = useAuth();
  const [weather, setWeather] = useState<GamingWeather>({
    condition: 'sunny',
    description: 'Perfect gaming weather!',
    icon: <Sun className="w-12 h-12" />,
    color: 'from-yellow-500 to-orange-500'
  });

  useEffect(() => {
    if (!profile) return;
    calculateGamingWeather();
  }, [profile]);

  const calculateGamingWeather = async () => {
    if (!profile) return;

    try {
      // Get user's recent activity (last 7 days)
      const { data: recentActivity, error } = await supabase
        .from('gaming_activity')
        .select('total_hours, achievements_earned')
        .eq('user_id', profile.id)
        .gte('activity_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Gaming weather query error:', error);
        return;
      }

      if (recentActivity && recentActivity.length > 0) {
        // Aggregate the data
        const totalHours = recentActivity.reduce((sum, day) => sum + (parseFloat(day.total_hours?.toString() || '0')), 0);
        const totalAchievements = recentActivity.reduce((sum, day) => sum + (day.achievements_earned || 0), 0);

        if (totalHours > 20 && totalAchievements > 5) {
          setWeather({
            condition: 'electric',
            description: 'On fire! Keep dominating!',
            icon: <Zap className="w-12 h-12" />,
            color: 'from-purple-500 to-pink-500'
          });
        } else if (totalHours > 10) {
          setWeather({
            condition: 'sunny',
            description: 'Great gaming streak!',
            icon: <Sun className="w-12 h-12" />,
            color: 'from-yellow-500 to-orange-500'
          });
        } else if (totalHours > 5) {
          setWeather({
            condition: 'cloudy',
            description: 'Steady progress!',
            icon: <Cloud className="w-12 h-12" />,
            color: 'from-blue-500 to-cyan-500'
          });
        }
      }
    } catch (error) {
      console.error('Error calculating gaming weather:', error);
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
      <div className={`p-6 rounded-lg bg-gradient-to-br ${weather.color} text-white`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold mb-1">Gaming Weather</h3>
            <p className="text-sm opacity-90">{weather.description}</p>
          </div>
          <div className="opacity-80">{weather.icon}</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Gamepad2 className="w-4 h-4" />
          <span className="capitalize">{weather.condition} conditions</span>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// GAME OF THE DAY WIDGET
// =====================================================
interface GameOfTheDay {
  name: string;
  description: string;
  reason: string;
  image: string;
}

export function GameOfTheDayWidget() {
  const [game, setGame] = useState<GameOfTheDay>({
    name: 'Apex Legends',
    description: 'Fast-paced battle royale shooter',
    reason: 'Double tokens active for this game!',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400'
  });

  const games: GameOfTheDay[] = [
    {
      name: 'Apex Legends',
      description: 'Fast-paced battle royale shooter',
      reason: 'Double tokens active for this game!',
      image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400'
    },
    {
      name: 'Fortnite',
      description: 'Build, battle, and survive',
      reason: 'Tournament starting soon!',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400'
    },
    {
      name: 'Valorant',
      description: 'Tactical 5v5 shooter',
      reason: 'Most active community today!',
      image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=400'
    }
  ];

  useEffect(() => {
    // Rotate game daily
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setGame(games[dayOfYear % games.length]);
  }, []);

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg overflow-hidden border border-[#202225]">
      <div className="relative h-32">
        <img
          src={game.image}
          alt={game.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
        <div className="absolute top-3 left-3">
          <div className="flex items-center gap-1.5 bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold">
            <Star className="w-3 h-3 fill-current" />
            <span>Game of the Day</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-white mb-1">{game.name}</h3>
        <p className="text-sm text-gray-400 mb-3">{game.description}</p>
        <div className="flex items-center gap-2 text-xs text-[#8B5CF6] bg-[#8B5CF6]/10 px-3 py-2 rounded-lg">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{game.reason}</span>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// SOCIAL FEED WIDGET
// =====================================================
interface FeedItem {
  id: string;
  user: {
    username: string;
    avatar_url?: string;
  };
  activity_type: string;
  title: string;
  description?: string;
  icon: string;
  created_at: string;
  likes_count?: number;
}

export function SocialFeedWidget() {
  const { profile } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchSocialFeed();
  }, [profile]);

  const fetchSocialFeed = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Get friend IDs
      const { data: friendsData } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', profile.id)
        .eq('status', 'accepted');

      const friendIds = friendsData?.map(f => f.friend_id) || [];
      friendIds.push(profile.id); // Include own activities

      // Get recent activity from friends
      const { data: activities } = await supabase
        .from('activity_feed')
        .select(`
          id,
          activity_type,
          title,
          description,
          icon,
          created_at,
          user_id,
          profiles!activity_feed_user_id_fkey(username, avatar_url)
        `)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activities) {
        const formattedActivities = activities.map((act: any) => ({
          id: act.id,
          user: act.profiles || { username: 'Unknown' },
          activity_type: act.activity_type,
          title: act.title,
          description: act.description,
          icon: act.icon,
          created_at: act.created_at,
          likes_count: 0
        }));

        setFeedItems(formattedActivities);
      }
    } catch (error) {
      console.error('Error fetching social feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'level_up':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'friend_added':
        return <Users className="w-4 h-4 text-green-400" />;
      default:
        return <Gamepad2 className="w-4 h-4 text-[#8B5CF6]" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Friend Activity</h2>
            <p className="text-xs text-gray-400">What your friends are up to</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[#0f0f0f] rounded-lg animate-pulse" />
          ))
        ) : feedItems.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No recent activity</p>
            <p className="text-gray-500 text-xs mt-1">Add friends to see their achievements!</p>
          </div>
        ) : (
          feedItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225] hover:border-[#8B5CF6] transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {item.user.avatar_url ? (
                    <img
                      src={item.user.avatar_url}
                      alt={item.user.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    item.user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white truncate">
                      {item.user.username}
                    </span>
                    {getActivityIcon(item.activity_type)}
                    <span className="text-xs text-gray-500 ml-auto flex-shrink-0">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {getTimeAgo(item.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

