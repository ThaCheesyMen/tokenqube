import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { Trophy, Medal, Award, Clock, Gamepad2, Target, Coins } from 'lucide-react';
import { formatTokens } from '../utils/formatTokens';

type LeaderboardCategory = 'hours' | 'games' | 'achievements' | 'tokens';

interface LeaderboardUser extends Profile {
  total_playtime?: number;
  total_games?: number;
  total_achievements?: number;
  total_tokens_earned?: number;
  rank_change?: number; // Track rank changes
}

export default function Leaderboard() {
  const { profile } = useAuth();
  const [category, setCategory] = useState<LeaderboardCategory>('hours');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userStats, setUserStats] = useState<{ hours: number; games: number; achievements: number }>({
    hours: 0,
    games: 0,
    achievements: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [category]);

  useEffect(() => {
    if (profile) {
      fetchUserStats();
    }
  }, [profile]);

  const fetchUserStats = async () => {
    if (!profile) return;

    // Fetch user's total playtime
    const { data: accounts } = await supabase
      .from('gaming_accounts')
      .select('total_playtime_hours')
      .eq('user_id', profile.id);
    
    const totalHours = accounts?.reduce((sum, acc) => sum + (acc.total_playtime_hours || 0), 0) || 0;

    // Fetch user's total games
    const { data: games } = await supabase
      .from('user_games')
      .select('id')
      .eq('user_id', profile.id);
    
    const totalGames = games?.length || 0;

    // Fetch user's total achievements
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', profile.id)
      .eq('unlocked', true);
    
    const totalAchievements = achievements?.length || 0;

    setUserStats({
      hours: totalHours,
      games: totalGames,
      achievements: totalAchievements
    });
  };

  const fetchLeaderboard = async () => {
    setLoading(true);

    try {
      // Use the new RPC function for better performance
      const { data, error } = await supabase
        .rpc('get_leaderboard', { 
          p_category: category,
          p_limit: 100 
        });

      if (error) {
        console.error('Error fetching leaderboard:', error);
        setLoading(false);
        return;
      }

      if (data) {
        // Map the data to the expected format
        const mappedData: LeaderboardUser[] = data.map((row: any) => ({
          id: row.user_id,
          username: row.username,
          avatar_url: row.avatar_url,
          tokens: category === 'tokens' ? Number(row.total_value) : row.tokens,
          total_tokens_earned: category === 'tokens' ? Number(row.total_value) : undefined,
          level: row.level,
          total_playtime: category === 'hours' ? Number(row.total_value) : undefined,
          total_games: category === 'games' ? Number(row.total_value) : undefined,
          total_achievements: category === 'achievements' ? Number(row.total_value) : undefined,
          rank: row.rank_position || row.rank
        }));

        setLeaderboardData(mappedData);

        // Fetch user's rank using RPC
        if (profile) {
          const { data: rankData } = await supabase
            .rpc('get_user_rank', {
              p_user_id: profile.id,
              p_category: category
            });
          
          setUserRank(rankData || null);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }

    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-600" />;
      default:
        return <span className="text-gray-500 font-bold text-lg">{rank}</span>;
    }
  };

  const getRankBackground = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500';
      case 2:
        return 'bg-gradient-to-r from-gray-400/10 to-slate-400/10 border-gray-400';
      case 3:
        return 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500';
      default:
        return 'bg-[#1a1a1a] border-[#202225]';
    }
  };

  const getCategoryLabel = () => {
    switch (category) {
      case 'hours':
        return 'Total Playtime';
      case 'games':
        return 'Games Owned';
      case 'achievements':
        return 'Achievements Unlocked';
      case 'tokens':
        return 'Tokens Earned';
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'hours':
        return <Clock className="w-6 h-6" />;
      case 'games':
        return <Gamepad2 className="w-6 h-6" />;
      case 'achievements':
        return <Target className="w-6 h-6" />;
      case 'tokens':
        return <Trophy className="w-6 h-6" />;
    }
  };

  const getUserStatValue = () => {
    switch (category) {
      case 'hours':
        return `${userStats.hours.toFixed(1)}h`;
      case 'games':
        return userStats.games;
      case 'achievements':
        return userStats.achievements;
      case 'tokens':
        return formatTokens(profile?.total_earned || 0);
    }
  };

  const getStatValue = (user: LeaderboardUser) => {
    switch (category) {
      case 'hours':
        return `${(user.total_playtime || 0).toFixed(1)}h`;
      case 'games':
        return user.total_games || 0;
      case 'achievements':
        return user.total_achievements || 0;
      case 'tokens':
        return formatTokens(user.total_tokens_earned || 0);
    }
  };

  const getCategoryGradient = () => {
    switch (category) {
      case 'hours':
        return 'from-blue-500 to-cyan-500';
      case 'games':
        return 'from-green-500 to-emerald-500';
      case 'achievements':
        return 'from-purple-500 to-pink-500';
      case 'tokens':
        return 'from-yellow-500 to-orange-500';
    }
  };

  return (
    <div className="h-full w-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0f0f0f]">
      {/* Header with Gradient Background */}
      <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2f3136] to-[#36393f] p-8 border border-[#202225]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#8B5CF6]/20 to-purple-500/20 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <Trophy className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl font-black text-white">Leaderboard</h1>
          </div>
          <p className="text-gray-400 text-lg">Compete with the best players on TokenQuest</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-8 flex justify-center">
        <div className="bg-[#1a1a1a] rounded-xl p-2 border border-[#202225] shadow-lg inline-flex gap-2 flex-wrap">
          <button
            onClick={() => setCategory('hours')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              category === 'hours'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                : 'text-gray-400 hover:bg-[#0f0f0f] hover:text-white'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="hidden sm:inline">Most Played Hours</span>
            <span className="sm:hidden">Hours</span>
          </button>
          <button
            onClick={() => setCategory('games')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              category === 'games'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50'
                : 'text-gray-400 hover:bg-[#0f0f0f] hover:text-white'
            }`}
          >
            <Gamepad2 className="w-5 h-5" />
            <span className="hidden sm:inline">Most Games</span>
            <span className="sm:hidden">Games</span>
          </button>
          <button
            onClick={() => setCategory('achievements')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              category === 'achievements'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                : 'text-gray-400 hover:bg-[#0f0f0f] hover:text-white'
            }`}
          >
            <Target className="w-5 h-5" />
            <span className="hidden sm:inline">Most Achievements</span>
            <span className="sm:hidden">Achievements</span>
          </button>
          <button
            onClick={() => setCategory('tokens')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              category === 'tokens'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/50'
                : 'text-gray-400 hover:bg-[#0f0f0f] hover:text-white'
            }`}
          >
            <Coins className="w-5 h-5" />
            <span className="hidden sm:inline">Most Tokens Earned</span>
            <span className="sm:hidden">Tokens</span>
          </button>
        </div>
      </div>

      {profile && userRank && (
        <div className={`bg-gradient-to-r ${getCategoryGradient()} rounded-2xl shadow-2xl p-8 mb-8 text-white relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white/10 flex-shrink-0">
                {(profile as any).avatar_url ? (
                  <img 
                    src={(profile as any).avatar_url} 
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-black bg-gradient-to-br from-white/20 to-white/10">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white/90 mb-1 text-sm font-medium">Your Rank</p>
                <p className="text-5xl font-black drop-shadow-lg">#{userRank}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/90 mb-1 text-sm font-medium">{getCategoryLabel()}</p>
              <div className="flex items-center justify-end gap-3">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  {getCategoryIcon()}
                </div>
                <p className="text-5xl font-black drop-shadow-lg">{getUserStatValue()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5CF6] mx-auto"></div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-2xl shadow-2xl overflow-hidden border border-[#202225]">
          <div className="px-6 py-4 bg-[#1a1a1a]/50 backdrop-blur-sm border-b border-[#202225]">
            <div className="grid grid-cols-12 gap-4 font-bold text-gray-300 text-sm uppercase tracking-wider">
              <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
              <div className="col-span-5 sm:col-span-6">Player</div>
              <div className="col-span-5 sm:col-span-5 text-right">{getCategoryLabel()}</div>
            </div>
          </div>

          <div className="divide-y divide-[#202225]/50">
            {leaderboardData.map((user, index) => {
              const rank = index + 1;
              const isCurrentUser = user.id === profile?.id;

              return (
                <div
                  key={user.id}
                  className={`px-6 py-5 border-l-4 ${getRankBackground(rank)} ${
                    isCurrentUser ? 'ring-2 ring-[#8B5CF6] bg-[#8B5CF6]/5' : ''
                  } transition-all hover:bg-[#4f5660] group`}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2 sm:col-span-1 flex justify-center">
                      {getRankIcon(rank)}
                    </div>

                    <div className="col-span-5 sm:col-span-6">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-2 border-[#202225] group-hover:border-[#8B5CF6] transition-colors overflow-hidden bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex-shrink-0">
                            {(user as any).avatar_url ? (
                              <img 
                                src={(user as any).avatar_url} 
                                alt={user.username || 'User'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                                {user.username?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          {rank <= 3 && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1a1a1a] border-2 border-[#202225] flex items-center justify-center">
                              {rank === 1 && <span className="text-xs">🥇</span>}
                              {rank === 2 && <span className="text-xs">🥈</span>}
                              {rank === 3 && <span className="text-xs">🥉</span>}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white truncate text-base">
                            {user.username || 'Unknown'}
                          </p>
                          {isCurrentUser && (
                            <span className="inline-block mt-1 text-xs bg-[#8B5CF6]/20 text-[#8B5CF6] px-2 py-0.5 rounded-full font-semibold">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-5 sm:col-span-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className={`p-2 rounded-lg ${
                          category === 'hours' ? 'bg-blue-500/20' :
                          category === 'games' ? 'bg-green-500/20' :
                          'bg-purple-500/20'
                        }`}>
                          {category === 'hours' && <Clock className="w-5 h-5 text-blue-400" />}
                          {category === 'games' && <Gamepad2 className="w-5 h-5 text-green-400" />}
                          {category === 'achievements' && <Target className="w-5 h-5 text-purple-400" />}
                        </div>
                        <span className={`font-black text-xl ${
                          category === 'hours' ? 'text-blue-400' :
                          category === 'games' ? 'text-green-400' :
                          'text-purple-400'
                        }`}>
                          {getStatValue(user)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && leaderboardData.length === 0 && (
        <div className="text-center py-12 bg-[#1a1a1a] rounded-xl shadow-sm border border-[#202225]">
          <p className="text-gray-400 text-lg">No players on the leaderboard yet. Be the first!</p>
        </div>
      )}
    </div>
  );
}
