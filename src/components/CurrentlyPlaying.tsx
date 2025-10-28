import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Gamepad2, Clock, Users as UsersIcon } from 'lucide-react';

interface ActiveSession {
  id: string;
  game_name: string;
  platform: string;
  session_start: string;
  user_id: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

interface CurrentlyPlayingProps {
  userId: string;
  showOtherPlayers?: boolean;
}

export default function CurrentlyPlaying({ userId, showOtherPlayers = false }: CurrentlyPlayingProps) {
  const [currentSession, setCurrentSession] = useState<ActiveSession | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<ActiveSession[]>([]);
  const [sessionDuration, setSessionDuration] = useState<string>('');

  useEffect(() => {
    fetchCurrentSession();
    
    // Subscribe to real-time session updates
    const channel = supabase
      .channel('active_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_gaming_sessions'
        },
        () => {
          fetchCurrentSession();
        }
      )
      .subscribe();

    // Update duration every minute
    const interval = setInterval(() => {
      if (currentSession) {
        updateDuration(currentSession.session_start);
      }
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId]);

  useEffect(() => {
    if (currentSession) {
      updateDuration(currentSession.session_start);
    }
  }, [currentSession]);

  const fetchCurrentSession = async () => {
    // Fetch user's current session
    const { data: userSession } = await supabase
      .from('active_gaming_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('session_start', { ascending: false })
      .limit(1)
      .single();

    setCurrentSession(userSession);

    // Fetch other active players if enabled
    if (showOtherPlayers) {
      const { data: others } = await supabase
        .from('active_gaming_sessions')
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq('is_active', true)
        .neq('user_id', userId)
        .order('session_start', { ascending: false })
        .limit(10);

      if (others) {
        setOtherPlayers(others);
      }
    }
  };

  const updateDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      setSessionDuration(`${hours}h ${minutes}m`);
    } else {
      setSessionDuration(`${minutes}m`);
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      steam: 'from-[#1b2838] to-[#2a475e]',
      xbox: 'from-[#0e7a0d] to-[#107c10]',
      playstation: 'from-[#003087] to-[#0070cc]',
      epic: 'from-gray-700 to-gray-900',
      riot: 'from-red-900 to-red-700',
      battlenet: 'from-blue-900 to-blue-700'
    };
    return colors[platform.toLowerCase()] || 'from-gray-700 to-gray-900';
  };

  if (!currentSession && otherPlayers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Current User Session */}
      {currentSession && (
        <div className={`bg-gradient-to-r ${getPlatformColor(currentSession.platform)} rounded-xl shadow-xl p-5 border-2 border-green-500/50 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                <span className="text-green-400 font-bold text-sm uppercase tracking-wider">Currently Playing</span>
              </div>
              <div className="flex items-center gap-1 text-white/80 text-sm">
                <Clock className="w-4 h-4" />
                <span className="font-semibold">{sessionDuration}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-white truncate">{currentSession.game_name}</h3>
                <p className="text-sm text-white/70 capitalize">{currentSession.platform}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Active Players */}
      {showOtherPlayers && otherPlayers.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-xl shadow-xl p-5 border border-[#202225]">
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-5 h-5 text-[#8B5CF6]" />
            <h4 className="font-bold text-white">Active Players ({otherPlayers.length})</h4>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-[#8B5CF6] scrollbar-track-[#202225]">
            {otherPlayers.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#4f5660] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {session.profiles?.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{session.profiles?.username || 'Unknown'}</p>
                  <p className="text-xs text-gray-400 truncate">{session.game_name}</p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

