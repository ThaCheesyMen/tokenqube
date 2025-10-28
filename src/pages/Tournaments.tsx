import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Trophy, Calendar, CheckCircle, Settings, Swords } from 'lucide-react';
import { toast } from '../components/Toast';
import GameSelector from '../components/GameSelector';
import TournamentCountdown from '../components/TournamentCountdown';
import TournamentStatsWidget from '../components/TournamentStatsWidget';
import TournamentLeaderboard from '../components/TournamentLeaderboard';
import TournamentHistory from '../components/TournamentHistory';
import TournamentBracket from '../components/TournamentBracket';
import TournamentManagementDashboard from '../components/TournamentManagementDashboard';
import MyActiveMatches from '../components/MyActiveMatches';

interface Tournament {
  id: string;
  tournament_name: string;
  game_name: string;
  platform: string;
  tournament_type: string;
  max_participants: number;
  entry_fee: number;
  prize_pool: number;
  registration_start: string;
  registration_end: string;
  tournament_start: string;
  status: string;
  organizer_id: string;
  participant_count?: number;
  is_registered?: boolean;
}

export default function Tournaments() {
  const { profile } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [officialTournaments, setOfficialTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'in_progress' | 'completed'>('upcoming');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'stats' | 'leaderboard' | 'history' | 'manage' | 'mymatches'>('tournaments');
  const [selectedTournamentForBracket, setSelectedTournamentForBracket] = useState<string | null>(null);
  const [newTournament, setNewTournament] = useState({
    tournament_name: '',
    game_name: '',
    platform: 'pc',
    tournament_type: 'single_elimination',
    max_participants: 16,
    entry_fee: 0,
    prize_pool: 1000,
    tournament_start: '',
    rules: ''
  });

  useEffect(() => {
    if (profile) {
      fetchOfficialTournaments();
      fetchTournaments();
      fetchMyTournaments();
    }
    
    // Refresh every minute to keep countdowns accurate
    const interval = setInterval(() => {
      if (profile) {
        fetchOfficialTournaments();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [profile, filter]);

  const fetchOfficialTournaments = async () => {
    try {
      const { data, error } = await supabase.rpc('get_official_tournaments');
      
      if (error) {
        console.error('Error fetching official tournaments:', error);
        return;
      }
      
      if (data) {
        setOfficialTournaments(data as any[]);
      }
    } catch (error) {
      console.error('Error fetching official tournaments:', error);
    }
  };

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tournaments')
        .select('*')
        .eq('is_official', false) // Only show user-created tournaments
        .order('tournament_start', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get participant counts
      const tournamentsWithCounts = await Promise.all(
        (data || []).map(async (tournament) => {
          const { count } = await supabase
            .from('tournament_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id);

          const { data: registration } = await supabase
            .from('tournament_participants')
            .select('id')
            .eq('tournament_id', tournament.id)
            .eq('user_id', profile?.id)
            .maybeSingle();

          return {
            ...tournament,
            participant_count: count || 0,
            is_registered: !!registration
          };
        })
      );

      setTournaments(tournamentsWithCounts);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTournaments = async () => {
    if (!profile) return;

    try {
      const { data: participations } = await supabase
        .from('tournament_participants')
        .select('tournament_id')
        .eq('user_id', profile.id);

      if (participations && participations.length > 0) {
        const ids = participations.map(p => p.tournament_id);
        const { data } = await supabase
          .from('tournaments')
          .select('*')
          .in('id', ids);

        setMyTournaments(data || []);
      }
    } catch (error) {
      console.error('Error fetching my tournaments:', error);
    }
  };

  const registerForTournament = async (tournamentId: string, entryFee: number) => {
    if (!profile) return;

    if (entryFee > 0 && (profile.token_balance || 0) < entryFee) {
      toast.error('Insufficient tokens!');
      return;
    }

    try {
      // Deduct entry fee
      if (entryFee > 0) {
        await supabase
          .from('profiles')
          .update({ token_balance: (profile.token_balance || 0) - entryFee })
          .eq('id', profile.id);
      }

      // Register
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          user_id: profile.id
        });

      if (error) throw error;

      toast.success('Successfully registered! 🎉');
      fetchTournaments();
      fetchMyTournaments();
    } catch (error: any) {
      console.error('Error registering:', error);
      toast.error(error.message || 'Failed to register');
    }
  };

  const handleRegister = async (tournamentId: string) => {
    if (!profile) {
      toast.error('Please login to register');
      return;
    }

    // Get tournament details for entry fee
    const tournament = [...tournaments, ...officialTournaments].find(t => t.id === tournamentId);
    if (!tournament) return;

    await registerForTournament(tournamentId, tournament.entry_fee || 0);
  };

  const handleLeave = async (tournamentId: string) => {
    if (!profile) return;

    try {
      // Check if tournament has started
      const tournament = [...tournaments, ...officialTournaments, ...myTournaments].find(t => t.id === tournamentId);
      if (!tournament) return;

      if (tournament.status !== 'upcoming') {
        toast.error('Cannot leave tournament that has already started');
        return;
      }

      // Remove from tournament
      const { error } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('user_id', profile.id);

      if (error) throw error;

      // Refund entry fee if there was one
      const entryFee = tournament.entry_fee || 0;
      if (entryFee > 0) {
        await supabase
          .from('profiles')
          .update({ token_balance: (profile.token_balance || 0) + entryFee })
          .eq('id', profile.id);
      }

      toast.success(`Left tournament! ${entryFee > 0 ? `${entryFee} tokens refunded` : ''}`);
      fetchTournaments();
      fetchOfficialTournaments();
      fetchMyTournaments();
    } catch (error: any) {
      console.error('Error leaving tournament:', error);
      toast.error(error.message || 'Failed to leave tournament');
    }
  };

  const createTournament = async () => {
    if (!profile || !newTournament.tournament_name || !newTournament.game_name) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const now = new Date();
      const tournamentDate = new Date(newTournament.tournament_start);

      const { error } = await supabase
        .from('tournaments')
        .insert({
          ...newTournament,
          organizer_id: profile.id,
          registration_start: now.toISOString(),
          registration_end: new Date(tournamentDate.getTime() - 3600000).toISOString(), // 1 hour before
          status: 'upcoming'
        });

      if (error) throw error;

      toast.success('Tournament created! 🏆');
      setShowCreateModal(false);
      setNewTournament({
        tournament_name: '',
        game_name: '',
        platform: 'pc',
        tournament_type: 'single_elimination',
        max_participants: 16,
        entry_fee: 0,
        prize_pool: 1000,
        tournament_start: '',
        rules: ''
      });
      fetchTournaments();
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error('Failed to create tournament');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-500 bg-blue-500/10';
      case 'registration_open': return 'text-green-500 bg-green-500/10';
      case 'in_progress': return 'text-yellow-500 bg-yellow-500/10';
      case 'completed': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return 'TBD';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="h-full w-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0f0f0f]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Tournaments
            </h1>
            <p className="text-gray-400">Compete for glory and prizes</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
          >
            Create Tournament
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: 'tournaments', label: 'Tournaments', icon: Trophy },
          { id: 'mymatches', label: 'My Matches', icon: Swords },
          { id: 'stats', label: 'My Stats', icon: Trophy },
          { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          { id: 'history', label: 'History', icon: Calendar },
          { id: 'manage', label: 'Manage', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#202225]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tournament Bracket Modal */}
      {selectedTournamentForBracket && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] rounded-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Tournament Bracket</h2>
              <button
                onClick={() => setSelectedTournamentForBracket(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <TournamentBracket 
              tournamentId={selectedTournamentForBracket}
              currentUserId={profile?.id}
            />
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'tournaments' && (
        <>
          {/* Official TokenQube Tournaments */}
      {officialTournaments.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Official TokenQube Tournaments</h2>
              <p className="text-gray-400">Compete in our official tournaments every 6 hours!</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {officialTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] rounded-xl p-6 border-2 border-yellow-500 shadow-2xl shadow-yellow-500/20 relative overflow-hidden"
              >
                {/* Official Badge */}
                <div className="absolute top-4 right-4 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  OFFICIAL
                </div>

                {/* Game Name */}
                <h3 className="text-2xl font-black text-white mb-2 mt-8">
                  {tournament.game_name}
                </h3>
                <p className="text-white/80 text-sm mb-4">Championship Tournament</p>

                {/* Countdown */}
                <div className="mb-4">
                  <TournamentCountdown tournamentStart={tournament.tournament_start} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-white/60 text-xs mb-1">Prize Pool</div>
                    <div className="text-yellow-400 text-xl font-bold">{tournament.prize_pool || 0} 🪙</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-white/60 text-xs mb-1">Players</div>
                    <div className="text-white text-xl font-bold">
                      {tournament.participant_count || 0}/{tournament.max_participants}
                    </div>
                  </div>
                </div>

                {/* Register/Leave Button */}
                <div className="space-y-2">
                  {tournament.is_registered ? (
                    <div className="flex gap-2">
                      <div className="flex-1 py-3 rounded-lg font-bold bg-green-500 text-white flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Registered
                      </div>
                      <button
                        onClick={() => handleLeave(tournament.id)}
                        className="px-4 py-3 rounded-lg font-bold bg-red-500 hover:bg-red-600 text-white transition-all"
                        title="Leave tournament and get refund"
                      >
                        Leave
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRegister(tournament.id)}
                      disabled={(tournament.participant_count || 0) >= tournament.max_participants}
                      className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                        (tournament.participant_count || 0) >= tournament.max_participants
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                      }`}
                    >
                      {(tournament.participant_count || 0) >= tournament.max_participants ? (
                        'Tournament Full'
                      ) : (
                        `Register (${tournament.entry_fee || 0} 🪙)`
                      )}
                    </button>
                  )}
                  
                  {/* View Bracket Button */}
                  {tournament.status === 'in_progress' || tournament.status === 'completed' ? (
                    <button
                      onClick={() => setSelectedTournamentForBracket(tournament.id)}
                      className="w-full py-2 rounded-lg font-semibold bg-purple-900/50 hover:bg-purple-900/70 text-purple-300 transition-all border border-purple-500/30"
                    >
                      View Bracket
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {officialTournaments.length > 0 && (
        <div className="border-t border-[#202225] my-8"></div>
      )}

      <h2 className="text-2xl font-bold text-white mb-6">Community Tournaments</h2>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'upcoming', 'in_progress', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-6 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-[#8B5CF6] text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* My Tournaments */}
      {myTournaments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">My Tournaments</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {myTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-6 border-2 border-purple-500"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {tournament.tournament_name || 'Unnamed Tournament'}
                    </h3>
                    <p className="text-purple-200">{tournament.game_name || 'Unknown Game'}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(tournament.status)}`}>
                    {tournament.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-purple-200 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(tournament.tournament_start)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    {tournament.prize_pool || 0} 🪙
                  </span>
                </div>
                {tournament.status === 'upcoming' && (
                  <button
                    onClick={() => handleLeave(tournament.id)}
                    className="w-full py-2 rounded-lg font-bold bg-red-500 hover:bg-red-600 text-white transition-all"
                  >
                    Leave Tournament
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Tournaments */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#1a1a1a] rounded-xl h-64"></div>
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-24 h-24 mx-auto mb-4 text-gray-600" />
          <h3 className="text-2xl font-bold text-white mb-2">No Tournaments Found</h3>
          <p className="text-gray-400 mb-6">Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6] transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">
                    {tournament.tournament_name || 'Unnamed Tournament'}
                  </h3>
                  <p className="text-gray-400 text-sm">{tournament.game_name || 'Unknown Game'}</p>
                </div>
                <div className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusColor(tournament.status)}`}>
                  {tournament.status?.replace('_', ' ') || 'unknown'}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Type</span>
                  <span className="text-white font-semibold capitalize">
                    {tournament.tournament_type?.replace('_', ' ') || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Participants</span>
                  <span className="text-white font-semibold">
                    {tournament.participant_count || 0} / {tournament.max_participants || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Entry Fee</span>
                  <span className="text-white font-semibold">
                    {(tournament.entry_fee || 0) === 0 ? 'Free' : `${tournament.entry_fee} 🪙`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Prize Pool</span>
                  <span className="text-yellow-500 font-bold">
                    {tournament.prize_pool || 0} 🪙
                  </span>
                </div>
              </div>

              {/* Date */}
              <div className="bg-[#0f0f0f] rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Starts {formatDate(tournament.tournament_start)}</span>
                </div>
              </div>

              {/* Action Button */}
              {tournament.is_registered ? (
                <button
                  disabled
                  className="w-full bg-green-500/20 text-green-500 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Registered
                </button>
              ) : tournament.status === 'upcoming' || tournament.status === 'registration_open' ? (
                <button
                  onClick={() => registerForTournament(tournament.id, tournament.entry_fee)}
                  className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  Register Now
                </button>
              ) : (
                <button
                  disabled
                  className="w-full bg-[#0f0f0f] text-gray-600 py-3 rounded-lg font-semibold cursor-not-allowed"
                >
                  {tournament.status === 'in_progress' ? 'In Progress' : 'Completed'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* My Stats Tab */}
      {activeTab === 'stats' && profile && (
        <div className="space-y-8">
          <TournamentStatsWidget userId={profile.id} />
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-8">
          <TournamentLeaderboard currentUserId={profile?.id} limit={100} />
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && profile && (
        <div className="space-y-8">
          <TournamentHistory userId={profile.id} limit={20} />
        </div>
      )}

      {/* My Matches Tab */}
      {activeTab === 'mymatches' && profile && (
        <div className="space-y-8">
          <MyActiveMatches userId={profile.id} />
        </div>
      )}

      {/* Management Tab */}
      {activeTab === 'manage' && profile && (
        <div className="space-y-8">
          <TournamentManagementDashboard 
            userId={profile.id}
            onViewBracket={setSelectedTournamentForBracket}
          />
        </div>
      )}

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-8 max-w-2xl w-full border border-[#202225] max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Create Tournament</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  value={newTournament.tournament_name}
                  onChange={(e) => setNewTournament({ ...newTournament, tournament_name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  placeholder="Epic Championship 2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game *
                  </label>
                  <GameSelector
                    value={newTournament.game_name}
                    onChange={(gameName) => setNewTournament({ ...newTournament, game_name: gameName })}
                    placeholder="Search for a game..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Platform
                  </label>
                  <select
                    value={newTournament.platform}
                    onChange={(e) => setNewTournament({ ...newTournament, platform: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="pc">PC</option>
                    <option value="ps5">PlayStation 5</option>
                    <option value="xbox">Xbox</option>
                    <option value="switch">Switch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={newTournament.tournament_type}
                    onChange={(e) => setNewTournament({ ...newTournament, tournament_type: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="single_elimination">Single Elimination</option>
                    <option value="double_elimination">Double Elimination</option>
                    <option value="round_robin">Round Robin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Participants
                  </label>
                  <select
                    value={newTournament.max_participants}
                    onChange={(e) => setNewTournament({ ...newTournament, max_participants: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="8">8</option>
                    <option value="16">16</option>
                    <option value="32">32</option>
                    <option value="64">64</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Entry Fee (tokens)
                  </label>
                  <input
                    type="number"
                    value={newTournament.entry_fee}
                    onChange={(e) => setNewTournament({ ...newTournament, entry_fee: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prize Pool (tokens)
                  </label>
                  <input
                    type="number"
                    value={newTournament.prize_pool}
                    onChange={(e) => setNewTournament({ ...newTournament, prize_pool: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={newTournament.tournament_start}
                  onChange={(e) => setNewTournament({ ...newTournament, tournament_start: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rules (optional)
                </label>
                <textarea
                  value={newTournament.rules}
                  onChange={(e) => setNewTournament({ ...newTournament, rules: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  rows={4}
                  placeholder="Tournament rules and guidelines..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={createTournament}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-3 rounded-xl font-semibold transition-all"
              >
                Create Tournament
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-3 bg-[#0f0f0f] text-gray-400 rounded-xl font-semibold hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

