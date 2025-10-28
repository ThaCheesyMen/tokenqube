import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, TrendingUp, Flame, Award, Target } from 'lucide-react';

interface TournamentStats {
  total_tournaments: number;
  tournaments_won: number;
  tournaments_top3: number;
  total_prize_earnings: number;
  best_placement: number | null;
  current_win_streak: number;
  longest_win_streak: number;
  total_kills: number;
  total_deaths: number;
  average_placement: number | null;
}

interface TournamentStatsWidgetProps {
  userId: string;
  compact?: boolean;
}

export default function TournamentStatsWidget({ userId, compact = false }: TournamentStatsWidgetProps) {
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_player_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-8 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats || stats.total_tournaments === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
        <div className="text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-purple-400" />
          <p className="font-bold text-white mb-1">No Tournament Stats Yet</p>
          <p className="text-sm text-gray-400">Join a tournament to start tracking your performance!</p>
        </div>
      </div>
    );
  }

  const winRate = stats.total_tournaments > 0 ? ((stats.tournaments_won / stats.total_tournaments) * 100).toFixed(1) : '0.0';
  const kd = stats.total_deaths > 0 ? (stats.total_kills / stats.total_deaths).toFixed(2) : stats.total_kills.toString();

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-4 border border-[#202225]">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Your Tournament Stats</h3>
            <p className="text-xs text-gray-400">{stats.total_tournaments} tournaments played</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0f0f0f] rounded-lg p-2">
            <p className="text-xs text-gray-500">Wins</p>
            <p className="font-bold text-yellow-400">{stats.tournaments_won}</p>
          </div>
          <div className="bg-[#0f0f0f] rounded-lg p-2">
            <p className="text-xs text-gray-500">Win Rate</p>
            <p className="font-bold text-green-400">{winRate}%</p>
          </div>
          <div className="bg-[#0f0f0f] rounded-lg p-2">
            <p className="text-xs text-gray-500">Earnings</p>
            <p className="font-bold text-white">{stats.total_prize_earnings.toLocaleString()} 🪙</p>
          </div>
          <div className="bg-[#0f0f0f] rounded-lg p-2">
            <p className="text-xs text-gray-500">Streak</p>
            <p className="font-bold text-orange-400 flex items-center gap-1">
              {stats.current_win_streak > 0 && <Flame className="w-3 h-3" />}
              {stats.current_win_streak}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-6 border border-[#202225]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Your Tournament Stats</h3>
          <p className="text-sm text-gray-400">{stats.total_tournaments} tournaments played</p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Wins */}
        <div className="bg-[#0f0f0f] rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-400">Wins</span>
          </div>
          <p className="text-3xl font-bold text-yellow-400">{stats.tournaments_won}</p>
        </div>

        {/* Win Rate */}
        <div className="bg-[#0f0f0f] rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-400">Win Rate</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{winRate}%</p>
        </div>

        {/* Earnings */}
        <div className="bg-[#0f0f0f] rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-400">Earnings</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total_prize_earnings.toLocaleString()} 🪙</p>
        </div>

        {/* Streak */}
        <div className="bg-[#0f0f0f] rounded-xl p-4 border border-orange-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-gray-400">Current Streak</span>
          </div>
          <p className="text-3xl font-bold text-orange-400">{stats.current_win_streak}</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f0f0f] rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Best Placement</p>
          <p className="font-bold text-white">
            {stats.best_placement === 1 ? '🥇 1st' :
             stats.best_placement === 2 ? '🥈 2nd' :
             stats.best_placement === 3 ? '🥉 3rd' :
             `${stats.best_placement}th`}
          </p>
        </div>

        <div className="bg-[#0f0f0f] rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Top 3 Finishes</p>
          <p className="font-bold text-white">{stats.tournaments_top3}</p>
        </div>

        <div className="bg-[#0f0f0f] rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Longest Streak</p>
          <p className="font-bold text-white flex items-center gap-1">
            <Flame className="w-4 h-4 text-orange-500" />
            {stats.longest_win_streak}
          </p>
        </div>

        {stats.total_kills > 0 && (
          <div className="bg-[#0f0f0f] rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">K/D Ratio</p>
            <p className="font-bold text-white flex items-center gap-1">
              <Target className="w-4 h-4 text-red-500" />
              {kd}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

