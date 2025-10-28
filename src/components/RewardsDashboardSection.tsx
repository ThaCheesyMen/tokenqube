import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Coins, TrendingUp, Calendar, Award, Zap, Flame, Target } from 'lucide-react';

interface EarningsStats {
  today: number;
  week: number;
  month: number;
  allTime: number;
  hourlyRate: number;
  streak: number;
  nextMilestone: number;
  progressToMilestone: number;
}

export default function RewardsDashboardSection() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<EarningsStats>({
    today: 0,
    week: 0,
    month: 0,
    allTime: 0,
    hourlyRate: 50,
    streak: 0,
    nextMilestone: 50000,
    progressToMilestone: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchEarningsStats();
    }
  }, [profile]);

  const fetchEarningsStats = async () => {
    if (!profile) return;

    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = new Date(now.setDate(now.getDate() - 7));
      const monthStart = new Date(now.setDate(now.getDate() - 30));

      // Fetch transactions for different periods
      const [todayData, weekData, monthData, profileData] = await Promise.all([
        supabase
          .from('token_transactions')
          .select('amount')
          .eq('user_id', profile.id)
          .eq('type', 'earn')
          .gte('created_at', todayStart.toISOString()),
        
        supabase
          .from('token_transactions')
          .select('amount')
          .eq('user_id', profile.id)
          .eq('type', 'earn')
          .gte('created_at', weekStart.toISOString()),
        
        supabase
          .from('token_transactions')
          .select('amount')
          .eq('user_id', profile.id)
          .eq('type', 'earn')
          .gte('created_at', monthStart.toISOString()),
        
        supabase
          .from('profiles')
          .select('total_earned, login_streak')
          .eq('id', profile.id)
          .single()
      ]);

      const todayEarnings = todayData.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const weekEarnings = weekData.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const monthEarnings = monthData.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const allTimeEarnings = profileData.data?.total_earned || 0;
      const currentStreak = profileData.data?.login_streak || 0;

      // Calculate hourly rate from today's earnings
      const hoursToday = (Date.now() - todayStart.getTime()) / (1000 * 60 * 60);
      const hourlyRate = hoursToday > 0 ? Math.round(todayEarnings / hoursToday) : 50;

      // Calculate next milestone
      const milestones = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
      const nextMilestone = milestones.find(m => m > allTimeEarnings) || milestones[milestones.length - 1];
      const progressToMilestone = (allTimeEarnings / nextMilestone) * 100;

      setStats({
        today: todayEarnings,
        week: weekEarnings,
        month: monthEarnings,
        allTime: allTimeEarnings,
        hourlyRate,
        streak: currentStreak,
        nextMilestone,
        progressToMilestone
      });
    } catch (error) {
      console.error('Error fetching earnings stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-[#202225] animate-pulse">
        <div className="h-40 bg-[#202225] rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-[#202225] shadow-2xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#8B5CF6]/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-yellow-500/5 to-transparent rounded-full blur-3xl"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-xl shadow-lg">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Your Rewards Overview</h2>
              <p className="text-sm text-gray-400">Track your earnings and progress</p>
            </div>
          </div>
          <button
            onClick={fetchEarningsStats}
            className="p-2 hover:bg-[#202225] rounded-lg transition-colors"
            title="Refresh stats"
          >
            <TrendingUp className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Earnings Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Today */}
          <div className="bg-[#0f0f0f] rounded-xl p-5 border border-[#202225] hover:border-[#8B5CF6] transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400 font-medium">Today</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">+{formatNumber(stats.today)}</span>
              <span className="text-sm text-gray-500">tokens</span>
            </div>
            <div className="mt-2 h-1 bg-[#202225] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* Week */}
          <div className="bg-[#0f0f0f] rounded-xl p-5 border border-[#202225] hover:border-[#8B5CF6] transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400 font-medium">This Week</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">+{formatNumber(stats.week)}</span>
              <span className="text-sm text-gray-500">tokens</span>
            </div>
            <div className="mt-2 h-1 bg-[#202225] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* Month */}
          <div className="bg-[#0f0f0f] rounded-xl p-5 border border-[#202225] hover:border-[#8B5CF6] transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-400 font-medium">This Month</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">+{formatNumber(stats.month)}</span>
              <span className="text-sm text-gray-500">tokens</span>
            </div>
            <div className="mt-2 h-1 bg-[#202225] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* All Time */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-5 border border-yellow-500/30 hover:border-yellow-500 transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-yellow-300 font-medium">All Time</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-yellow-400">+{formatNumber(stats.allTime)}</span>
              <span className="text-sm text-yellow-600">tokens</span>
            </div>
            <div className="mt-2 h-1 bg-yellow-500/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Earning Rate */}
          <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#202225]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Earning Rate</p>
                <p className="text-2xl font-bold text-white">{stats.hourlyRate} <span className="text-sm text-gray-500">/hour</span></p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-300 mb-1">Current Streak</p>
                <p className="text-2xl font-bold text-white">{stats.streak} <span className="text-sm text-orange-400">days</span></p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Next Milestone */}
          <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#202225]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-400">Next Milestone</p>
                <p className="text-sm font-bold text-[#8B5CF6]">{Math.round(stats.progressToMilestone)}%</p>
              </div>
              <p className="text-2xl font-bold text-white mb-3">{formatNumber(stats.nextMilestone)} <span className="text-sm text-gray-500">tokens</span></p>
              <div className="h-2 bg-[#202225] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.progressToMilestone, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tip */}
        {stats.hourlyRate > 0 && (
          <div className="mt-6 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#8B5CF6] mb-1">💡 Pro Tip</p>
                <p className="text-sm text-gray-300">
                  At your current rate ({stats.hourlyRate} tokens/hour), you'll earn{' '}
                  <span className="font-bold text-white">~{formatNumber(stats.hourlyRate * 24)}</span> tokens if you play all day!
                  {stats.allTime < stats.nextMilestone && (
                    <> You're only <span className="font-bold text-white">{formatNumber(stats.nextMilestone - stats.allTime)}</span> tokens away from your next milestone! 🎯</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

