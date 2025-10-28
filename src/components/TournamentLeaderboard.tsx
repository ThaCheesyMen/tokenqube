import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, TrendingUp, Flame, Award } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_tournaments: number;
  tournaments_won: number;
  win_rate: number;
  total_earnings: number;
  current_streak: number;
  best_placement: number;
}

interface TournamentLeaderboardProps {
  limit?: number;
  currentUserId?: string;
}

export default function TournamentLeaderboard({ limit = 100, currentUserId }: TournamentLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [limit]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc('get_tournament_leaderboard', {
        p_limit: limit
      });

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return { icon: '🥇', gradient: 'from-yellow-500 to-yellow-600' };
      case 2:
        return { icon: '🥈', gradient: 'from-gray-400 to-gray-500' };
      case 3:
        return { icon: '🥉', gradient: 'from-orange-500 to-orange-600' };
      default:
        return { icon: `#${rank}`, gradient: 'from-purple-500 to-pink-500' };
    }
  };

  const isCurrentUser = (userId: string) => {
    return currentUserId === userId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <p className="text-xl font-semibold text-white mb-2">No Rankings Yet</p>
        <p className="text-gray-400">Be the first to compete and claim the top spot!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Tournament Champions</h2>
          <p className="text-gray-400">Top {leaderboard.length} players worldwide</p>
        </div>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="flex flex-col items-center pt-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-2xl mb-2">
                🥈
              </div>
              {isCurrentUser(leaderboard[1].user_id) && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-xs">You</span>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="font-bold text-white mb-1">{leaderboard[1].username}</p>
              <p className="text-xs text-gray-400">{leaderboard[1].tournaments_won} wins</p>
              <p className="text-sm text-yellow-400 font-bold mt-1">
                {leaderboard[1].total_earnings.toLocaleString()} 🪙
              </p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-3xl mb-2 ring-4 ring-yellow-500/50">
                🥇
              </div>
              {isCurrentUser(leaderboard[0].user_id) && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-xs">You</span>
                </div>
              )}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                CHAMPION
              </div>
            </div>
            <div className="text-center mt-4">
              <p className="font-bold text-white text-lg mb-1">{leaderboard[0].username}</p>
              <p className="text-sm text-gray-400">{leaderboard[0].tournaments_won} wins</p>
              <p className="text-lg text-yellow-400 font-bold mt-1">
                {leaderboard[0].total_earnings.toLocaleString()} 🪙
              </p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center pt-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl mb-2">
                🥉
              </div>
              {isCurrentUser(leaderboard[2].user_id) && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-xs">You</span>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="font-bold text-white mb-1">{leaderboard[2].username}</p>
              <p className="text-xs text-gray-400">{leaderboard[2].tournaments_won} wins</p>
              <p className="text-sm text-yellow-400 font-bold mt-1">
                {leaderboard[2].total_earnings.toLocaleString()} 🪙
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[#0f0f0f] border-b border-[#202225] text-sm font-bold text-gray-400">
          <div className="col-span-1">Rank</div>
          <div className="col-span-3">Player</div>
          <div className="col-span-2 text-center">Wins</div>
          <div className="col-span-2 text-center">Win Rate</div>
          <div className="col-span-2 text-center">Earnings</div>
          <div className="col-span-2 text-center">Streak</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-[#202225]">
          {leaderboard.map((entry) => {
            const rankBadge = getRankBadge(entry.rank);
            const currentUser = isCurrentUser(entry.user_id);

            return (
              <div
                key={entry.user_id}
                className={`grid grid-cols-12 gap-4 px-6 py-4 transition-all ${
                  currentUser
                    ? 'bg-purple-900/30 border-l-4 border-l-purple-500'
                    : 'hover:bg-[#202225]'
                }`}
              >
                {/* Rank */}
                <div className="col-span-1 flex items-center">
                  {entry.rank <= 3 ? (
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${rankBadge.gradient} flex items-center justify-center text-white font-bold`}>
                      {rankBadge.icon}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#0f0f0f] flex items-center justify-center text-white font-bold">
                      #{entry.rank}
                    </div>
                  )}
                </div>

                {/* Player */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {entry.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white flex items-center gap-2">
                      {entry.username}
                      {currentUser && (
                        <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">You</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{entry.total_tournaments} tournaments</p>
                  </div>
                </div>

                {/* Wins */}
                <div className="col-span-2 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold text-white">{entry.tournaments_won}</span>
                  </div>
                </div>

                {/* Win Rate */}
                <div className="col-span-2 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="font-bold text-white">{entry.win_rate.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Earnings */}
                <div className="col-span-2 flex items-center justify-center">
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold text-yellow-400">{entry.total_earnings.toLocaleString()}</span>
                  </div>
                </div>

                {/* Streak */}
                <div className="col-span-2 flex items-center justify-center">
                  {entry.current_streak > 0 ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-orange-900/30 rounded-full">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="font-bold text-orange-400">{entry.current_streak}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
          <p className="text-gray-400 mb-1">Total Players</p>
          <p className="text-2xl font-bold text-white">{leaderboard.length}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
          <p className="text-gray-400 mb-1">Total Tournaments</p>
          <p className="text-2xl font-bold text-white">
            {leaderboard.reduce((sum, entry) => sum + entry.total_tournaments, 0)}
          </p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
          <p className="text-gray-400 mb-1">Total Prizes</p>
          <p className="text-2xl font-bold text-yellow-400">
            {leaderboard.reduce((sum, entry) => sum + entry.total_earnings, 0).toLocaleString()} 🪙
          </p>
        </div>
      </div>
    </div>
  );
}

