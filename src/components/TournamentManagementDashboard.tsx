import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Users, Target, Play, CheckCircle } from 'lucide-react';
import { toast } from './Toast';

interface ActiveTournament {
  tournament_id: string;
  tournament_name: string;
  game_name: string;
  status: string;
  participant_count: number;
  total_matches: number;
  completed_matches: number;
  pending_matches: number;
  current_round: number;
  tournament_start: string;
}

interface TournamentManagementDashboardProps {
  userId: string;
  onViewBracket?: (tournamentId: string) => void;
}

export default function TournamentManagementDashboard({ userId, onViewBracket }: TournamentManagementDashboardProps) {
  const [tournaments, setTournaments] = useState<ActiveTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTournaments();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchActiveTournaments, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveTournaments = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_tournaments');
      
      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching active tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTournament = async (tournamentId: string) => {
    try {
      const { data, error } = await supabase.rpc('start_tournament', {
        p_tournament_id: tournamentId,
        p_started_by: userId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          toast.success(`Tournament started! ${result.matches_created} matches created.`);
          fetchActiveTournaments();
        } else {
          toast.error(result.message);
        }
      }
    } catch (error: any) {
      console.error('Error starting tournament:', error);
      toast.error(error.message || 'Failed to start tournament');
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No active tournaments</p>
          <p className="text-sm text-gray-500 mt-2">Start a tournament to begin tracking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Active Tournaments</h2>
            <p className="text-sm text-gray-400">{tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''} in progress</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tournaments.map((tournament) => {
          const progress = getProgressPercentage(tournament.completed_matches, tournament.total_matches);
          const isInProgress = tournament.status === 'in_progress';

          return (
            <div
              key={tournament.tournament_id}
              className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] hover:border-purple-500/50 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                    {tournament.tournament_name}
                  </h3>
                  <p className="text-sm text-gray-400">{tournament.game_name}</p>
                </div>
                <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  isInProgress 
                    ? 'bg-yellow-500/20 text-yellow-500' 
                    : 'bg-blue-500/20 text-blue-500'
                }`}>
                  {tournament.status.replace('_', ' ')}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#0f0f0f] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span className="text-xs text-gray-400">Players</span>
                  </div>
                  <p className="text-lg font-bold text-white">{tournament.participant_count}</p>
                </div>

                <div className="bg-[#0f0f0f] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-gray-400">Round</span>
                  </div>
                  <p className="text-lg font-bold text-white">{tournament.current_round || 0}</p>
                </div>
              </div>

              {/* Progress */}
              {isInProgress && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Match Progress</span>
                    <span className="text-xs font-semibold text-white">{progress}%</span>
                  </div>
                  <div className="w-full bg-[#0f0f0f] rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {tournament.completed_matches} / {tournament.total_matches} matches
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {!isInProgress ? (
                  <button
                    onClick={() => handleStartTournament(tournament.tournament_id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                ) : (
                  <button
                    onClick={() => onViewBracket?.(tournament.tournament_id)}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-4 h-4" />
                    View Bracket
                  </button>
                )}
              </div>

              {/* Completion indicator */}
              {tournament.pending_matches === 0 && isInProgress && (
                <div className="mt-3 flex items-center gap-2 text-green-500 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>All matches complete!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

