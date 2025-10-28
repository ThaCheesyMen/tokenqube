import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, PieChart, TrendingUp, Clock, Gamepad2, Trophy } from 'lucide-react';

interface GamingInsightsProps {
  userId: string;
}

interface PlatformStats {
  platform: string;
  hours: number;
  games: number;
  percentage: number;
}

interface GenreData {
  genre: string;
  count: number;
  hours: number;
}

export default function GamingInsights({ userId }: GamingInsightsProps) {
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [peakHours, setPeakHours] = useState<{ hour: number; sessions: number }[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<{ week: string; hours: number }[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalHours: 0,
    totalGames: 0,
    avgSessionLength: 0,
    mostPlayedPlatform: ''
  });

  useEffect(() => {
    fetchInsights();
  }, [userId]);

  const fetchInsights = async () => {
    // Fetch platform distribution
    const { data: accounts } = await supabase
      .from('gaming_accounts')
      .select('platform, total_playtime_hours')
      .eq('user_id', userId);

    if (accounts) {
      const totalHours = accounts.reduce((sum, acc) => sum + acc.total_playtime_hours, 0);
      const platformData = accounts.map(acc => ({
        platform: acc.platform,
        hours: acc.total_playtime_hours,
        games: 0, // Would need to count from user_games
        percentage: totalHours > 0 ? (acc.total_playtime_hours / totalHours) * 100 : 0
      })).sort((a, b) => b.hours - a.hours);

      setPlatformStats(platformData);
      setTotalStats(prev => ({
        ...prev,
        totalHours,
        mostPlayedPlatform: platformData[0]?.platform || ''
      }));
    }

    // Fetch games count
    const { data: games } = await supabase
      .from('user_games')
      .select('id')
      .eq('user_id', userId);

    if (games) {
      setTotalStats(prev => ({ ...prev, totalGames: games.length }));
    }

    // Fetch activity data for trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activity } = await supabase
      .from('gaming_activity')
      .select('*')
      .eq('user_id', userId)
      .gte('activity_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('activity_date', { ascending: true });

    if (activity) {
      // Calculate weekly trend
      const weeks: { [key: string]: number } = {};
      activity.forEach(day => {
        const date = new Date(day.activity_date);
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
        const weekKey = weekStart.toISOString().split('T')[0];
        weeks[weekKey] = (weeks[weekKey] || 0) + parseFloat(day.total_hours);
      });

      const weeklyData = Object.entries(weeks).map(([week, hours]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours
      }));

      setWeeklyTrend(weeklyData);

      // Calculate average session length
      const activeDays = activity.filter(d => parseFloat(d.total_hours) > 0);
      const avgSession = activeDays.length > 0
        ? activity.reduce((sum, d) => sum + parseFloat(d.total_hours), 0) / activeDays.length
        : 0;

      setTotalStats(prev => ({ ...prev, avgSessionLength: avgSession }));
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      steam: 'bg-[#1b2838]',
      xbox: 'bg-[#107c10]',
      playstation: 'bg-[#0070cc]',
      epic: 'bg-[#1a1a1a]',
      riot: 'bg-red-700',
      battlenet: 'bg-blue-700'
    };
    return colors[platform.toLowerCase()] || 'bg-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-5 border border-blue-500/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-300" />
            </div>
            <span className="text-sm text-gray-300 font-semibold">Total Playtime</span>
          </div>
          <p className="text-3xl font-black text-white">{totalStats.totalHours.toFixed(0)}h</p>
          <p className="text-xs text-gray-400 mt-1">{(totalStats.totalHours / 24).toFixed(1)} days</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-5 border border-green-500/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/30 rounded-lg">
              <Gamepad2 className="w-5 h-5 text-green-300" />
            </div>
            <span className="text-sm text-gray-300 font-semibold">Games Owned</span>
          </div>
          <p className="text-3xl font-black text-white">{totalStats.totalGames}</p>
          <p className="text-xs text-gray-400 mt-1">Across all platforms</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-5 border border-purple-500/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-300" />
            </div>
            <span className="text-sm text-gray-300 font-semibold">Avg Session</span>
          </div>
          <p className="text-3xl font-black text-white">{totalStats.avgSessionLength.toFixed(1)}h</p>
          <p className="text-xs text-gray-400 mt-1">Per gaming day</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-5 border border-yellow-500/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/30 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-300" />
            </div>
            <span className="text-sm text-gray-300 font-semibold">Top Platform</span>
          </div>
          <p className="text-2xl font-black text-white capitalize">{totalStats.mostPlayedPlatform || 'N/A'}</p>
          <p className="text-xs text-gray-400 mt-1">Most hours played</p>
        </div>
      </div>

      {/* Platform Distribution */}
      <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-2xl shadow-xl p-6 border border-[#202225]">
        <div className="flex items-center gap-2 mb-6">
          <PieChart className="w-6 h-6 text-[#8B5CF6]" />
          <h3 className="text-xl font-bold text-white">Platform Distribution</h3>
        </div>

        <div className="space-y-4">
          {platformStats.map((stat) => (
            <div key={stat.platform} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-white capitalize">{stat.platform}</span>
                <span className="text-gray-400">{stat.hours.toFixed(1)}h ({stat.percentage.toFixed(1)}%)</span>
              </div>
              <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className={`h-full ${getPlatformColor(stat.platform)} transition-all duration-500`}
                  style={{ width: `${stat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Trend */}
      {weeklyTrend.length > 0 && (
        <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-2xl shadow-xl p-6 border border-[#202225]">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <h3 className="text-xl font-bold text-white">Gaming Trend (Last 30 Days)</h3>
          </div>

          <div className="flex items-end gap-2 h-48">
            {weeklyTrend.map((week, index) => {
              const maxHours = Math.max(...weeklyTrend.map(w => w.hours));
              const heightPercentage = maxHours > 0 ? (week.hours / maxHours) * 100 : 0;

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
                    <div
                      className="w-full bg-gradient-to-t from-[#8B5CF6] to-[#7289da] rounded-t-lg hover:from-[#7C3AED] hover:to-[#8B5CF6] transition-all cursor-pointer group relative"
                      style={{ height: `${heightPercentage}%`, minHeight: week.hours > 0 ? '8px' : '0' }}
                      title={`${week.week}: ${week.hours.toFixed(1)}h`}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1a1a1a] px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {week.hours.toFixed(1)}h
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 rotate-45 origin-left whitespace-nowrap">{week.week}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

