import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Gamepad2, Clock, Coins, Calendar, TrendingUp, Award } from 'lucide-react';

interface GamingSession {
  id: string;
  game_name: string;
  hours_played: number;
  tokens_earned: number;
  activity_date: string;
  activity_type: string;
}

interface DayGroup {
  date: string;
  sessions: GamingSession[];
  totalHours: number;
  totalTokens: number;
}

export default function GamingSessionsHistory() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<GamingSession[]>([]);
  const [groupedSessions, setGroupedSessions] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [stats, setStats] = useState({
    totalHours: 0,
    totalTokens: 0,
    sessionsCount: 0,
    avgTokensPerHour: 50
  });

  useEffect(() => {
    if (profile) {
      fetchGamingSessions();
    }
  }, [profile, timeRange]);

  useEffect(() => {
    // Group sessions by day
    const grouped: { [key: string]: GamingSession[] } = {};
    
    sessions.forEach(session => {
      const date = new Date(session.activity_date).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(session);
    });

    const dayGroups: DayGroup[] = Object.entries(grouped).map(([date, daySessions]) => ({
      date,
      sessions: daySessions,
      totalHours: daySessions.reduce((sum, s) => sum + s.hours_played, 0),
      totalTokens: daySessions.reduce((sum, s) => sum + s.tokens_earned, 0)
    }));

    // Sort by date descending
    dayGroups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setGroupedSessions(dayGroups);

    // Calculate stats
    const totalHours = sessions.reduce((sum, s) => sum + s.hours_played, 0);
    const totalTokens = sessions.reduce((sum, s) => sum + s.tokens_earned, 0);
    
    setStats({
      totalHours,
      totalTokens,
      sessionsCount: sessions.length,
      avgTokensPerHour: totalHours > 0 ? totalTokens / totalHours : 50
    });
  }, [sessions]);

  const fetchGamingSessions = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let startDate = new Date();
      
      switch (timeRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'all':
          startDate = new Date(0); // Beginning of time
          break;
      }

      const { data, error } = await supabase
        .from('gaming_activity')
        .select('*')
        .eq('user_id', profile.id)
        .eq('activity_type', 'game_session')
        .gte('activity_date', startDate.toISOString())
        .order('activity_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSessions(data || []);
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
    
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Gaming Sessions</h3>
            <p className="text-sm text-gray-400">Track your gameplay and earnings</p>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                timeRange === range
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#0f0f0f] text-gray-400 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Total Hours</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalHours.toFixed(1)}</p>
        </div>
        
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Tokens Earned</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats.totalTokens.toLocaleString()}</p>
        </div>
        
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Sessions</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.sessionsCount}</p>
        </div>
        
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Avg Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">{Math.round(stats.avgTokensPerHour)}/hr</p>
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#0f0f0f] rounded-lg h-20"></div>
          ))}
        </div>
      ) : groupedSessions.length === 0 ? (
        <div className="text-center py-12">
          <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg font-semibold">No gaming sessions yet</p>
          <p className="text-sm text-gray-500 mt-2">Start playing games to earn tokens!</p>
          <div className="mt-4 p-4 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-lg inline-block">
            <p className="text-[#8B5CF6] font-semibold">💡 Earn 50 tokens per hour of gameplay</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
          {groupedSessions.map((dayGroup, dayIndex) => (
            <div key={dayIndex} className="bg-[#0f0f0f] rounded-lg border border-[#202225] overflow-hidden">
              {/* Day Header */}
              <div className="bg-[#1a1a1a] px-4 py-3 border-b border-[#202225] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-white font-semibold">{formatDate(dayGroup.date)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-400 font-semibold">
                      {formatDuration(dayGroup.totalHours)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400 font-semibold">
                      +{dayGroup.totalTokens.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sessions */}
              <div className="divide-y divide-[#202225]">
                {dayGroup.sessions.map((session, sessionIndex) => (
                  <div
                    key={sessionIndex}
                    className="px-4 py-3 hover:bg-[#1a1a1a] transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Gamepad2 className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold capitalize">
                          {session.game_name.replace(/-/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(session.activity_date).toLocaleTimeString('en-US', {
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      {sessions.length > 0 && (
        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-start gap-3">
          <Award className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-purple-300 font-semibold mb-1">Auto-Tracking Active</p>
            <p className="text-sm text-gray-400">
              Your gaming sessions are automatically tracked. You earn <span className="text-yellow-400 font-semibold">50 tokens</span> for every hour played. 
              Tokens are synced every minute and appear here instantly!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

