import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Calendar, Users, Target } from 'lucide-react';

interface TournamentHistoryItem {
  tournament_id: string;
  tournament_name: string;
  game_name: string;
  tournament_start: string;
  final_placement: number;
  prize_tokens: number;
  total_participants: number;
  kills: number;
  deaths: number;
  score: number;
}

interface TournamentHistoryProps {
  userId: string;
  limit?: number;
}

export default function TournamentHistory({ userId, limit = 20 }: TournamentHistoryProps) {
  const [history, setHistory] = useState<TournamentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_tournament_history', {
        p_user_id: userId,
        p_limit: limit
      });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching tournament history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlacementBadge = (placement: number) => {
    switch (placement) {
      case 1:
        return { emoji: '🥇', text: '1st Place', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50' };
      case 2:
        return { emoji: '🥈', text: '2nd Place', color: 'text-gray-300 bg-gray-800/30 border-gray-500/50' };
      case 3:
        return { emoji: '🥉', text: '3rd Place', color: 'text-orange-400 bg-orange-900/30 border-orange-500/50' };
      default:
        return { emoji: '📊', text: `${placement}${getOrdinalSuffix(placement)} Place`, color: 'text-gray-400 bg-gray-900/30 border-gray-600/50' };
    }
  };

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <p className="text-xl font-semibold text-white mb-2">No Tournament History</p>
        <p className="text-gray-400">Join a tournament to start building your record!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Tournament History</h2>
            <p className="text-gray-400">{history.length} tournaments played</p>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {history.map((item) => {
          const placement = getPlacementBadge(item.final_placement);
          
          return (
            <div
              key={item.tournament_id}
              className="bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-6 border border-[#202225] hover:border-purple-500/50 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {item.tournament_name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(item.tournament_start)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {item.total_participants} players
                    </span>
                  </div>
                </div>

                {/* Placement Badge */}
                <div className={`px-4 py-2 rounded-lg border font-bold ${placement.color}`}>
                  <span className="mr-2">{placement.emoji}</span>
                  {placement.text}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Game */}
                <div className="bg-[#0f0f0f] rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Game</div>
                  <div className="font-bold text-white">{item.game_name}</div>
                </div>

                {/* Prize */}
                <div className="bg-[#0f0f0f] rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Prize Won</div>
                  <div className="font-bold text-yellow-400 flex items-center gap-1">
                    {item.prize_tokens.toLocaleString()} 🪙
                  </div>
                </div>

                {/* K/D */}
                {item.kills > 0 && (
                  <div className="bg-[#0f0f0f] rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">K/D Ratio</div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <Target className="w-4 h-4 text-red-500" />
                      {item.deaths > 0 ? (item.kills / item.deaths).toFixed(2) : item.kills}
                    </div>
                  </div>
                )}

                {/* Score */}
                {item.score > 0 && (
                  <div className="bg-[#0f0f0f] rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Total Score</div>
                    <div className="font-bold text-white">
                      {item.score.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

