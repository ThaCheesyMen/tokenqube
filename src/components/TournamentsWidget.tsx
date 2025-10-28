import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Coins, 
  Clock,
  CheckCircle,
  ExternalLink,
  Zap
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  game_name: string;
  platform: string | null;
  start_date: string;
  registration_deadline: string;
  prize_pool_tokens: number;
  max_participants: number | null;
  current_participants: number;
  entry_fee_tokens: number;
  status: string;
  banner_url: string | null;
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  type: string;
  start_date: string;
  end_date: string;
  rewards: any;
  status: string;
}

export default function TournamentsWidget() {
  const { profile } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'events'>('tournaments');

  useEffect(() => {
    fetchTournaments();
    fetchEvents();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('start_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('start_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const joinTournament = async (tournamentId: string, entryFee: number) => {
    if (!profile) return;

    if (entryFee > 0 && (profile.token_balance || 0) < entryFee) {
      alert('Insufficient tokens!');
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          user_id: profile.id
        });

      if (error) throw error;

      alert('Successfully joined tournament!');
      fetchTournaments();
    } catch (error: any) {
      if (error.code === '23505') {
        alert('You are already registered for this tournament!');
      } else {
        console.error('Error joining tournament:', error);
        alert('Failed to join tournament');
      }
    }
  };

  const getTimeRemaining = (dateString: string) => {
    const now = new Date();
    const target = new Date(dateString);
    const diff = target.getTime() - now.getTime();

    if (diff < 0) return 'Started';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'double_tokens':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'challenge':
        return <Trophy className="w-4 h-4 text-purple-400" />;
      case 'community':
        return <Users className="w-4 h-4 text-blue-400" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Tournaments & Events</h2>
            <p className="text-xs text-gray-400">Compete and win big!</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('tournaments')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'tournaments'
              ? 'bg-[#8B5CF6] text-white'
              : 'bg-[#0f0f0f] text-gray-400 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4 inline mr-1" />
          Tournaments ({tournaments.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'events'
              ? 'bg-[#8B5CF6] text-white'
              : 'bg-[#0f0f0f] text-gray-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-1" />
          Events ({events.length})
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activeTab === 'tournaments' ? (
          tournaments.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No active tournaments</p>
              <p className="text-gray-500 text-xs mt-1">Check back soon!</p>
            </div>
          ) : (
            tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-[#0f0f0f] rounded-lg overflow-hidden border border-[#202225] hover:border-[#8B5CF6] transition-all group"
              >
                {/* Banner */}
                {tournament.banner_url && (
                  <div className="h-20 relative overflow-hidden">
                    <img
                      src={tournament.banner_url}
                      alt={tournament.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white group-hover:text-[#8B5CF6] transition-colors">
                        {tournament.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{tournament.game_name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      tournament.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {tournament.status === 'active' ? 'Live' : 'Upcoming'}
                    </span>
                  </div>

                  {tournament.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {tournament.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Coins className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-yellow-400 font-semibold">
                        {(tournament.prize_pool_tokens || 0).toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>
                        {tournament.current_participants}/{tournament.max_participants || '∞'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 col-span-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                      {tournament.status === 'active' 
                        ? `Ends in ${getTimeRemaining(tournament.registration_deadline)}`
                        : `Starts in ${getTimeRemaining(tournament.start_date)}`
                      }
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => joinTournament(tournament.id, tournament.entry_fee_tokens)}
                    className="w-full py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {tournament.entry_fee_tokens > 0 ? (
                      <>
                        <Coins className="w-4 h-4" />
                        Join ({tournament.entry_fee_tokens} tokens)
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Join Free
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No active events</p>
              <p className="text-gray-500 text-xs mt-1">Check back soon!</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225] hover:border-[#8B5CF6] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getEventIcon(event.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-white">
                        {event.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                        event.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {event.status === 'active' ? 'Active' : 'Soon'}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    {event.rewards && (
                      <div className="flex items-center gap-1 text-xs text-green-400">
                        <Coins className="w-3 h-3" />
                        <span>Rewards available!</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {event.status === 'active'
                        ? `Ends ${getTimeRemaining(event.end_date)}`
                        : `Starts ${getTimeRemaining(event.start_date)}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}

