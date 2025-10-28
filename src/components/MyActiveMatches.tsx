import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Swords, Trophy, User, AlertCircle } from 'lucide-react';
import { toast } from './Toast';

interface ActiveMatch {
  match_id: string;
  tournament_id: string;
  tournament_name: string;
  game_name: string;
  round_number: number;
  round_name: string;
  opponent_id: string | null;
  opponent_username: string | null;
  match_status: string;
  my_score: number | null;
  opponent_score: number | null;
}

interface MyActiveMatchesProps {
  userId: string;
}

export default function MyActiveMatches({ userId }: MyActiveMatchesProps) {
  const [matches, setMatches] = useState<ActiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingScore, setSubmittingScore] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<{ [key: string]: { myScore: string; opponentScore: string } }>({});

  useEffect(() => {
    fetchMyMatches();
    
    // Refresh every 20 seconds
    const interval = setInterval(fetchMyMatches, 20000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchMyMatches = async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_active_matches', {
        p_user_id: userId
      });
      
      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching active matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitScore = async (matchId: string) => {
    const scores = scoreInputs[matchId];
    if (!scores || !scores.myScore || !scores.opponentScore) {
      toast.error('Please enter both scores');
      return;
    }

    const myScore = parseInt(scores.myScore);
    const opponentScore = parseInt(scores.opponentScore);

    if (isNaN(myScore) || isNaN(opponentScore)) {
      toast.error('Scores must be numbers');
      return;
    }

    if (myScore === opponentScore) {
      toast.error('Scores cannot be tied');
      return;
    }

    setSubmittingScore(matchId);

    try {
      // Find match details
      const match = matches.find(m => m.match_id === matchId);
      if (!match) return;

      const { data, error } = await supabase.rpc('update_match_score', {
        p_match_id: matchId,
        p_player1_score: myScore,
        p_player2_score: opponentScore,
        p_submitted_by: userId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          const didWin = result.winner_id === userId;
          toast.success(didWin ? '🎉 Victory! You won!' : 'Match score submitted');
          fetchMyMatches();
          
          // Clear input
          setScoreInputs(prev => {
            const newInputs = { ...prev };
            delete newInputs[matchId];
            return newInputs;
          });
        } else {
          toast.error(result.message);
        }
      }
    } catch (error: any) {
      console.error('Error submitting score:', error);
      toast.error(error.message || 'Failed to submit score');
    } finally {
      setSubmittingScore(null);
    }
  };

  const updateScoreInput = (matchId: string, field: 'myScore' | 'opponentScore', value: string) => {
    setScoreInputs(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">My Active Matches</h2>
            <p className="text-sm text-gray-400">No active matches</p>
          </div>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">You don't have any active matches</p>
          <p className="text-sm text-gray-500 mt-2">Join a tournament to start playing!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
          <Swords className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">My Active Matches</h2>
          <p className="text-sm text-gray-400">{matches.length} match{matches.length !== 1 ? 'es' : ''} pending</p>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {matches.map((match) => {
          const hasScores = match.my_score !== null && match.opponent_score !== null;
          const currentInput = scoreInputs[match.match_id] || { myScore: '', opponentScore: '' };

          return (
            <div
              key={match.match_id}
              className="bg-[#0f0f0f] rounded-xl p-4 border border-[#202225] hover:border-purple-500/50 transition-all"
            >
              {/* Tournament Info */}
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold text-white">{match.tournament_name}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-400">{match.game_name}</span>
              </div>

              {/* Round Badge */}
              <div className="inline-block px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-lg mb-3">
                {match.round_name}
              </div>

              {/* Players */}
              <div className="flex items-center gap-4 mb-4">
                {/* You */}
                <div className="flex-1 bg-[#1a1a1a] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-semibold text-white">You</span>
                  </div>
                  {hasScores ? (
                    <div className="text-2xl font-bold text-white">{match.my_score}</div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      placeholder="Score"
                      value={currentInput.myScore}
                      onChange={(e) => updateScoreInput(match.match_id, 'myScore', e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-[#202225] rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                    />
                  )}
                </div>

                {/* VS */}
                <div className="text-gray-500 font-bold">VS</div>

                {/* Opponent */}
                <div className="flex-1 bg-[#1a1a1a] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-semibold text-white">
                      {match.opponent_username || 'BYE'}
                    </span>
                  </div>
                  {hasScores ? (
                    <div className="text-2xl font-bold text-white">{match.opponent_score}</div>
                  ) : match.opponent_id ? (
                    <input
                      type="number"
                      min="0"
                      placeholder="Score"
                      value={currentInput.opponentScore}
                      onChange={(e) => updateScoreInput(match.match_id, 'opponentScore', e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-[#202225] rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-sm text-gray-500">Auto-advance</div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              {!hasScores && match.opponent_id && (
                <button
                  onClick={() => handleSubmitScore(match.match_id)}
                  disabled={submittingScore === match.match_id}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 rounded-lg font-semibold transition-all"
                >
                  {submittingScore === match.match_id ? 'Submitting...' : 'Submit Score'}
                </button>
              )}

              {/* Already Submitted */}
              {hasScores && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-400 font-semibold">
                    Score submitted • Waiting for next match
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

