import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Trophy, TrendingUp, TrendingDown, Crown, Medal, Award, Target } from 'lucide-react';

interface RankedUser {
  id: string;
  user_id: string;
  elo_rating: number;
  rank_tier: string;
  division: number;
  wins: number;
  losses: number;
  win_rate: number;
  games_played: number;
  peak_rating: number;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'from-orange-700 to-orange-900',
  silver: 'from-gray-400 to-gray-600',
  gold: 'from-yellow-500 to-yellow-700',
  platinum: 'from-cyan-400 to-cyan-600',
  diamond: 'from-blue-400 to-purple-600',
  master: 'from-purple-500 to-pink-600',
  grandmaster: 'from-red-500 to-pink-500'
};

const TIER_ICONS: Record<string, any> = {
  bronze: Medal,
  silver: Medal,
  gold: Trophy,
  platinum: Trophy,
  diamond: Award,
  master: Crown,
  grandmaster: Crown
};

export default function RankedLeaderboard() {
  const { profile } = useAuth();
  const [rankings, setRankings] = useState<RankedUser[]>([]);
  const [myRank, setMyRank] = useState<RankedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | string>('all');
  const [currentSeason, setCurrentSeason] = useState<any>(null);

  useEffect(() => {
    fetchCurrentSeason();
  }, []);

  useEffect(() => {
    if (currentSeason) {
      fetchRankings();
      if (profile) {
        fetchMyRank();
      }
    }
  }, [currentSeason, filter, profile]);

  const fetchCurrentSeason = async () => {
    try {
      const { data, error } = await supabase
        .from('ranked_seasons')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setCurrentSeason(data);
    } catch (error) {
      console.error('Error fetching season:', error);
    }
  };

  const fetchRankings = async () => {
    if (!currentSeason) return;

    setLoading(true);
    try {
      let query = supabase
        .from('user_rankings')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('season_id', currentSeason.id)
        .order('elo_rating', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('rank_tier', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRankings(data || []);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRank = async () => {
    if (!profile || !currentSeason) return;

    try {
      const { data } = await supabase
        .from('user_rankings')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('user_id', profile.id)
        .eq('season_id', currentSeason.id)
        .maybeSingle();

      setMyRank(data);
    } catch (error) {
      console.error('Error fetching my rank:', error);
    }
  };

  const getRankIcon = (tier: string) => {
    const Icon = TIER_ICONS[tier] || Medal;
    return <Icon className="w-6 h-6" />;
  };

  const getTierColor = (tier: string) => {
    return TIER_COLORS[tier] || 'from-gray-500 to-gray-700';
  };

  const getRankPosition = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <div className="h-full w-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0f0f0f]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          Ranked Leaderboard
        </h1>
        <p className="text-gray-400">
          Season {currentSeason?.season_number} - {currentSeason?.season_name}
        </p>
      </div>

      {/* My Rank Card */}
      {myRank && (
        <div className={`bg-gradient-to-r ${getTierColor(myRank.rank_tier)} rounded-xl p-6 mb-8 border-2 border-white/20`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold text-white">
                {myRank.profiles?.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-white font-bold text-xl">{myRank.profiles?.username}</p>
                <p className="text-white/80 capitalize">
                  {myRank.rank_tier} {myRank.division}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-white">{myRank.elo_rating}</p>
              <p className="text-white/80 text-sm">ELO Rating</p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{myRank.wins}</p>
              <p className="text-white/70 text-sm">Wins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{myRank.losses}</p>
              <p className="text-white/70 text-sm">Losses</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{myRank.win_rate.toFixed(1)}%</p>
              <p className="text-white/70 text-sm">Win Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{myRank.peak_rating}</p>
              <p className="text-white/70 text-sm">Peak</p>
            </div>
          </div>
        </div>
      )}

      {/* Tier Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'].map((tier) => (
          <button
            key={tier}
            onClick={() => setFilter(tier)}
            className={`px-6 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors capitalize ${
              filter === tier
                ? 'bg-[#8B5CF6] text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
            }`}
          >
            {tier}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#1a1a1a] rounded-xl h-20"></div>
          ))}
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-24 h-24 mx-auto mb-4 text-gray-600" />
          <h3 className="text-2xl font-bold text-white mb-2">No Rankings Yet</h3>
          <p className="text-gray-400">Be the first to compete!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rankings.map((user, index) => (
            <div
              key={user.id}
              className={`bg-[#1a1a1a] rounded-xl p-4 border border-[#202225] hover:border-[#8B5CF6] transition-all ${
                index < 3 ? 'border-yellow-500/30' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="w-12 text-center">
                  <span className="text-2xl font-bold">
                    {getRankPosition(index)}
                  </span>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-xl font-bold text-white">
                    {user.profiles?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{user.profiles?.username}</p>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-1 rounded bg-gradient-to-r ${getTierColor(user.rank_tier)} text-white text-xs font-bold capitalize flex items-center gap-1`}>
                        {getRankIcon(user.rank_tier)}
                        {user.rank_tier} {user.division}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-8 text-sm">
                  <div className="text-center">
                    <p className="text-white font-bold">{user.wins}W / {user.losses}L</p>
                    <p className="text-gray-500">Record</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-500 font-bold">{user.win_rate.toFixed(1)}%</p>
                    <p className="text-gray-500">Win Rate</p>
                  </div>
                </div>

                {/* ELO */}
                <div className="text-right">
                  <p className="text-3xl font-black text-white">{user.elo_rating}</p>
                  <p className="text-gray-500 text-xs">ELO</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

