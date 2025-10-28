import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Trophy, Star, Award, ChevronRight, Lock, CheckCircle } from 'lucide-react';

interface Achievement {
  id: string;
  achievement_key: string;
  name: string;
  description: string;
  tier: string;
  token_reward: number;
  xp_reward: number;
  is_secret: boolean;
}

interface UserAchievement {
  achievement_id: string;
  completed: boolean;
  progress: any;
}

interface AchievementsWidgetProps {
  onViewAll: () => void;
}

export default function AchievementsWidget({ onViewAll }: AchievementsWidgetProps) {
  const { profile } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<Map<string, UserAchievement>>(new Map());
  const [stats, setStats] = useState({ completed: 0, total: 0, tokensEarned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchAchievements();
    }
  }, [profile]);

  const fetchAchievements = async () => {
    if (!profile) return;

    try {
      // Fetch featured/recent achievements
      const { data: achievementsData } = await supabase
        .from('platform_achievements')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(6);

      setAchievements(achievementsData || []);

      // Fetch user progress
      const { data: userProgress } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', profile.id);

      if (userProgress) {
        const map = new Map();
        let completed = 0;
        let tokensEarned = 0;

        userProgress.forEach((ua: any) => {
          map.set(ua.achievement_id, ua);
          if (ua.completed) {
            completed++;
            const achievement = achievementsData?.find(a => a.id === ua.achievement_id);
            if (achievement) {
              tokensEarned += achievement.token_reward;
            }
          }
        });

        setUserAchievements(map);
        setStats({
          completed,
          total: achievementsData?.length || 0,
          tokensEarned
        });
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: 'from-amber-700 to-amber-900',
      silver: 'from-gray-400 to-gray-600',
      gold: 'from-yellow-400 to-yellow-600',
      platinum: 'from-cyan-400 to-cyan-600',
      diamond: 'from-purple-400 to-purple-600',
    };
    return colors[tier] || 'from-gray-500 to-gray-700';
  };

  const getTierIcon = (tier: string) => {
    const icons: Record<string, string> = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎',
      diamond: '👑',
    };
    return icons[tier] || '🏆';
  };

  const isCompleted = (achievementId: string) => {
    return userAchievements.get(achievementId)?.completed || false;
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#202225] animate-pulse">
        <div className="h-64 bg-[#202225] rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Achievements</h3>
            <p className="text-sm text-gray-400">Unlock rewards and showcase your skills</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Completed</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.completed}/{stats.total}</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Progress</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Tokens Earned</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">+{stats.tokensEarned}</p>
        </div>
      </div>

      {/* Featured Achievements */}
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-3">Featured Achievements</h4>
        {achievements.length === 0 ? (
          <div className="text-center py-8 bg-[#0f0f0f] rounded-lg border border-[#202225]">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No achievements available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.slice(0, 4).map((achievement) => {
              const completed = isCompleted(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={`bg-[#0f0f0f] rounded-xl p-4 border-2 transition-all ${
                    completed
                      ? 'border-green-500 bg-green-500/5'
                      : 'border-[#202225] hover:border-[#8B5CF6]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-3 bg-gradient-to-br ${getTierColor(achievement.tier)} rounded-lg flex-shrink-0`}>
                      <span className="text-2xl">{getTierIcon(achievement.tier)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h5 className="text-white font-semibold text-sm truncate">{achievement.name}</h5>
                        {completed ? (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">{achievement.description}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-yellow-400 font-semibold">+{achievement.token_reward} tokens</span>
                        <span className="text-blue-400">+{achievement.xp_reward} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-xs text-yellow-300">
          🏆 <span className="font-bold">Complete achievements</span> to earn tokens, XP, and exclusive rewards!
        </p>
      </div>
    </div>
  );
}

