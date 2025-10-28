import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Users } from 'lucide-react';

interface Match {
  match_id: string;
  round_number: number;
  round_name: string;
  match_number: number;
  player1_id: string | null;
  player1_username: string | null;
  player1_score: number;
  player2_id: string | null;
  player2_username: string | null;
  player2_score: number;
  winner_id: string | null;
  match_status: string;
  completed_at: string | null;
}

interface TournamentBracketProps {
  tournamentId: string;
  currentUserId?: string;
}

export default function TournamentBracket({ tournamentId, currentUserId }: TournamentBracketProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBracket();
  }, [tournamentId]);

  const fetchBracket = async () => {
    try {
      const { data, error } = await supabase.rpc('get_tournament_bracket', {
        p_tournament_id: tournamentId
      });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching bracket:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchesByRound = (roundNumber: number) => {
    return matches.filter(m => m.round_number === roundNumber);
  };

  const rounds = [...new Set(matches.map(m => m.round_number))].sort((a, b) => a - b);

  const isUserMatch = (match: Match) => {
    return currentUserId && (match.player1_id === currentUserId || match.player2_id === currentUserId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Bracket will be generated when tournament starts</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Tournament Bracket</h2>
          <p className="text-gray-400">Follow the competition live!</p>
        </div>
      </div>

      {/* Bracket */}
      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max pb-4">
          {rounds.map((roundNum) => {
            const roundMatches = getMatchesByRound(roundNum);
            return (
              <div key={roundNum} className="flex flex-col gap-4 min-w-[280px]">
                {/* Round Header */}
                <div className="text-center py-3 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg border border-purple-500/30">
                  <h3 className="font-bold text-white">
                    {roundMatches[0]?.round_name || `Round ${roundNum}`}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {roundMatches.filter(m => m.match_status === 'completed').length}/{roundMatches.length} Complete
                  </p>
                </div>

                {/* Matches */}
                {roundMatches.map((match) => (
                  <div
                    key={match.match_id}
                    className={`bg-[#1a1a1a] rounded-xl p-4 border-2 transition-all ${
                      isUserMatch(match)
                        ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                        : 'border-[#202225] hover:border-[#303235]'
                    }`}
                  >
                    {/* Match Number */}
                    <div className="text-xs text-gray-500 mb-2">Match #{match.match_number}</div>

                    {/* Player 1 */}
                    <div
                      className={`flex items-center justify-between py-2 px-3 rounded-lg mb-2 ${
                        match.winner_id === match.player1_id
                          ? 'bg-green-900/30 border border-green-500/50'
                          : match.match_status === 'completed'
                          ? 'bg-red-900/20 border border-red-500/30'
                          : 'bg-[#0f0f0f] border border-[#202225]'
                      }`}
                    >
                      <span className={`font-semibold ${
                        match.winner_id === match.player1_id ? 'text-green-400' : 'text-white'
                      }`}>
                        {match.player1_username || 'TBD'}
                      </span>
                      <span className="text-lg font-bold text-white">{match.player1_score}</span>
                    </div>

                    {/* VS */}
                    <div className="text-center text-xs text-gray-500 mb-2">VS</div>

                    {/* Player 2 */}
                    <div
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        match.winner_id === match.player2_id
                          ? 'bg-green-900/30 border border-green-500/50'
                          : match.match_status === 'completed'
                          ? 'bg-red-900/20 border border-red-500/30'
                          : 'bg-[#0f0f0f] border border-[#202225]'
                      }`}
                    >
                      <span className={`font-semibold ${
                        match.winner_id === match.player2_id ? 'text-green-400' : 'text-white'
                      }`}>
                        {match.player2_username || 'TBD'}
                      </span>
                      <span className="text-lg font-bold text-white">{match.player2_score}</span>
                    </div>

                    {/* Status Badge */}
                    <div className={`text-xs text-center mt-3 py-1 rounded ${
                      match.match_status === 'completed'
                        ? 'bg-green-900/30 text-green-400'
                        : match.match_status === 'in_progress'
                        ? 'bg-yellow-900/30 text-yellow-400'
                        : 'bg-gray-900/30 text-gray-400'
                    }`}>
                      {match.match_status === 'completed' ? '✓ Completed' : 
                       match.match_status === 'in_progress' ? '⚔️ Live' : 
                       '⏳ Pending'}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-gray-400">Winner</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/30"></div>
          <span className="text-gray-400">Eliminated</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-purple-500"></div>
          <span className="text-gray-400">Your Match</span>
        </div>
      </div>
    </div>
  );
}

