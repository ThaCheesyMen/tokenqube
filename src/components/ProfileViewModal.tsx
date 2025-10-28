import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  X, Trophy, Gamepad2, Clock, Star, Flame, Crown,
  Calendar, TrendingUp, Award, Target
} from 'lucide-react';
import { calculateLevel, getTier } from '../utils/levelSystem';

interface ProfileViewModalProps {
  userId: string;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  banner_url?: string;
  status: string;
  level?: number;
  token_balance?: number;
  total_earned?: number;
  bio?: string;
  created_at: string;
  currently_playing?: string;
  currently_playing_platform?: string;
  last_heartbeat?: string;
}

interface UserStats {
  total_games: number;
  total_playtime: number;
  total_achievements: number;
  common_achievements: number;
  uncommon_achievements: number;
  rare_achievements: number;
  epic_achievements: number;
  legendary_achievements: number;
}

export default function ProfileViewModal({ userId, onClose }: ProfileViewModalProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    total_games: 0,
    total_playtime: 0,
    total_achievements: 0,
    common_achievements: 0,
    uncommon_achievements: 0,
    rare_achievements: 0,
    epic_achievements: 0,
    legendary_achievements: 0,
  });
  const [topGames, setTopGames] = useState<any[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const levelInfo = useMemo(() => {
    if (!userProfile) return { level: 1, progress: 0, currentXP: 0, xpForCurrentLevel: 100, xpForNextLevel: 173, totalXPForCurrentLevel: 0 };
    return calculateLevel(userProfile.total_earned || 0);
  }, [userProfile]);

  const tier = useMemo(() => getTier(levelInfo.level), [levelInfo.level]);

  useEffect(() => {
    fetchUserProfile();
    fetchUserStats();
    fetchTopGames();
    fetchRecentAchievements();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Fetch total games
      const { data: gamesData } = await supabase
        .from('user_games')
        .select('id, total_playtime')
        .eq('user_id', userId);

      // Fetch achievements by rarity
      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select('rarity_tier')
        .eq('user_id', userId)
        .eq('unlocked', true);

      const totalGames = gamesData?.length || 0;
      const totalPlaytime = gamesData?.reduce((sum, game) => sum + (game.total_playtime || 0), 0) || 0;
      const achievements = achievementsData || [];

      setStats({
        total_games: totalGames,
        total_playtime: Math.round(totalPlaytime / 60), // Convert to hours
        total_achievements: achievements.length,
        common_achievements: achievements.filter(a => a.rarity_tier === 'common').length,
        uncommon_achievements: achievements.filter(a => a.rarity_tier === 'uncommon').length,
        rare_achievements: achievements.filter(a => a.rarity_tier === 'rare').length,
        epic_achievements: achievements.filter(a => a.rarity_tier === 'epic').length,
        legendary_achievements: achievements.filter(a => a.rarity_tier === 'legendary').length,
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setLoading(false);
    }
  };

  const fetchTopGames = async () => {
    try {
      const { data } = await supabase
        .from('user_games')
        .select('game_name, total_playtime, platform')
        .eq('user_id', userId)
        .order('total_playtime', { ascending: false })
        .limit(3);

      setTopGames(data || []);
    } catch (error) {
      console.error('Error fetching top games:', error);
    }
  };

  const fetchRecentAchievements = async () => {
    try {
      const { data } = await supabase
        .from('user_achievements')
        .select('achievement_name, achievement_description, rarity_tier, unlock_time, icon_url')
        .eq('user_id', userId)
        .eq('unlocked', true)
        .order('unlock_time', { ascending: false })
        .limit(5);

      setRecentAchievements(data || []);
    } catch (error) {
      console.error('Error fetching recent achievements:', error);
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

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400 bg-gray-500/20';
      case 'uncommon': return 'text-green-400 bg-green-500/20';
      case 'rare': return 'text-blue-400 bg-blue-500/20';
      case 'epic': return 'text-purple-400 bg-purple-500/20';
      case 'legendary': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (!userProfile) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f0f0f] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[#202225] shadow-2xl">
        {/* Header with Banner */}
        <div className="relative">
          <div 
            className="h-48 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] rounded-t-xl"
            style={userProfile.banner_url ? { backgroundImage: `url(${userProfile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Profile Info Overlay */}
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-16">
              {/* Avatar */}
              <div className="relative">
                <div className={`w-32 h-32 rounded-full border-4 border-[#0f0f0f] overflow-hidden bg-gradient-to-br ${tier.gradient}`}>
                  {userProfile.avatar_url ? (
                    <img src={userProfile.avatar_url} alt={userProfile.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-white font-bold">
                      {userProfile.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className={`absolute bottom-2 right-2 w-6 h-6 ${getStatusColor(userProfile.status)} rounded-full border-4 border-[#0f0f0f]`}></div>
              </div>

              {/* User Info */}
              <div className="flex-1 pb-4">
                <h2 className="text-3xl font-bold text-white mb-1">{userProfile.username}</h2>
                {userProfile.bio && (
                  <p className="text-gray-400 text-sm mb-2">{userProfile.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${tier.gradient} text-white`}>
                      Level {levelInfo.level}
                    </div>
                    <span className={`${tier.color} font-semibold`}>{tier.name}</span>
                  </div>
                  {userProfile.currently_playing && (
                    <div className="flex items-center gap-2 text-green-400">
                      <Gamepad2 className="w-4 h-4" />
                      <span>Playing {userProfile.currently_playing}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 className="w-4 h-4 text-[#8B5CF6]" />
                <span className="text-gray-400 text-xs">Games</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total_games}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-gray-400 text-xs">Hours</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total_playtime}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-400 text-xs">Achievements</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total_achievements}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-purple-400" />
                <span className="text-gray-400 text-xs">Tokens</span>
              </div>
              <p className="text-2xl font-bold text-white">{userProfile.token_balance?.toLocaleString() || 0}</p>
            </div>
          </div>

          {/* Top Games */}
          {topGames.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Top Games
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {topGames.map((game, index) => (
                  <div key={index} className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
                    <p className="text-white font-semibold text-sm mb-1 truncate">{game.game_name}</p>
                    <p className="text-gray-400 text-xs">{Math.round(game.total_playtime / 60)}h played</p>
                    <p className="text-gray-500 text-xs capitalize">{game.platform}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievement Breakdown */}
          {stats.total_achievements > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                Achievement Breakdown
              </h3>
              <div className="grid grid-cols-5 gap-3">
                {stats.legendary_achievements > 0 && (
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-yellow-500/30">
                    <p className="text-yellow-400 text-xs mb-1">Legendary</p>
                    <p className="text-2xl font-bold text-white">{stats.legendary_achievements}</p>
                  </div>
                )}
                {stats.epic_achievements > 0 && (
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-purple-500/30">
                    <p className="text-purple-400 text-xs mb-1">Epic</p>
                    <p className="text-2xl font-bold text-white">{stats.epic_achievements}</p>
                  </div>
                )}
                {stats.rare_achievements > 0 && (
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-blue-500/30">
                    <p className="text-blue-400 text-xs mb-1">Rare</p>
                    <p className="text-2xl font-bold text-white">{stats.rare_achievements}</p>
                  </div>
                )}
                {stats.uncommon_achievements > 0 && (
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-green-500/30">
                    <p className="text-green-400 text-xs mb-1">Uncommon</p>
                    <p className="text-2xl font-bold text-white">{stats.uncommon_achievements}</p>
                  </div>
                )}
                {stats.common_achievements > 0 && (
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-500/30">
                    <p className="text-gray-400 text-xs mb-1">Common</p>
                    <p className="text-2xl font-bold text-white">{stats.common_achievements}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Achievements */}
          {recentAchievements.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                Recent Achievements
              </h3>
              <div className="space-y-2">
                {recentAchievements.map((achievement, index) => (
                  <div key={index} className="bg-[#1a1a1a] rounded-lg p-3 border border-[#202225] flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg ${getRarityColor(achievement.rarity_tier)} flex items-center justify-center`}>
                      {achievement.icon_url ? (
                        <img src={achievement.icon_url} alt={achievement.achievement_name} className="w-8 h-8" />
                      ) : (
                        <Trophy className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{achievement.achievement_name}</p>
                      <p className="text-gray-400 text-xs">{achievement.achievement_description}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${getRarityColor(achievement.rarity_tier)}`}>
                        {achievement.rarity_tier}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

