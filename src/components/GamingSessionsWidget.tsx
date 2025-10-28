import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Gamepad2, Clock, Coins, Calendar, ChevronRight } from 'lucide-react';

interface GameSession {
  id: string;
  game_name: string;
  hours_played: number;
  tokens_earned: number;
  activity_date: string;
}

interface GamingSessionsWidgetProps {
  onViewAll: () => void;
}

export default function GamingSessionsWidget({ onViewAll }: GamingSessionsWidgetProps) {
  const { profile } = useAuth();
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [todayStats, setTodayStats] = useState({ hours: 0, tokens: 0, sessions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchRecentSessions();
    }
  }, [profile]);

  const fetchRecentSessions = async () => {
    if (!profile) return;

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get recent sessions (last 5)
      const { data: sessionsData } = await supabase
        .from('gaming_activity')
        .select('*')
        .eq('user_id', profile.id)
        .eq('activity_type', 'game_session')
        .order('activity_date', { ascending: false })
        .limit(5);

      setRecentSessions(sessionsData || []);

      // Get today's stats
      const { data: todayData } = await supabase
        .from('gaming_activity')
        .select('hours_played, tokens_earned')
        .eq('user_id', profile.id)
        .eq('activity_type', 'game_session')
        .gte('activity_date', todayStart.toISOString());

      const hours = todayData?.reduce((sum, s) => sum + (s.hours_played || 0), 0) || 0;
      const tokens = todayData?.reduce((sum, s) => sum + (s.tokens_earned || 0), 0) || 0;

      setTodayStats({
        hours,
        tokens,
        sessions: todayData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching gaming sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours: number): string => {
    const totalMinutes = Math.floor(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#202225] animate-pulse">
        <div className="h-64 bg-[#202225] rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Gaming Sessions</h3>
            <p className="text-sm text-gray-400">Recent gameplay activity</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Sessions Today</span>
          </div>
          <p className="text-2xl font-bold text-white">{todayStats.sessions}</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Hours Today</span>
          </div>
          <p className="text-2xl font-bold text-white">{todayStats.hours.toFixed(1)}</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Earned Today</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">+{todayStats.tokens}</p>
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-3">Recent Sessions</h4>
        {recentSessions.length === 0 ? (
          <div className="text-center py-8 bg-[#0f0f0f] rounded-lg border border-[#202225]">
            <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No gaming sessions yet</p>
            <p className="text-sm text-gray-500 mt-1">Start playing to earn tokens!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225] hover:border-[#8B5CF6] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Gamepad2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold capitalize">
                        {session.game_name.replace(/-/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.activity_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Duration</p>
                      <p className="text-white font-semibold">{formatDuration(session.hours_played)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Earned</p>
                      <p className="text-yellow-400 font-bold">+{session.tokens_earned}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <p className="text-xs text-purple-300">
          💡 Earning <span className="font-bold">50 tokens/hour</span> while playing. Sessions sync automatically every minute!
        </p>
      </div>
    </div>
  );
}

