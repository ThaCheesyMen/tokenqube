import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUserStats } from '../hooks/useUserStats';
import { useRealtimeTokenBalance } from '../hooks/useRealtimeTokenBalance';
import { formatTokens } from '../utils/formatTokens';
import { Coins, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

interface TokenStats {
  totalEarned: number;
  totalSpent: number;
  netBalance: number;
  earnedThisWeek: number;
  spentThisWeek: number;
  topCategory: string;
}

export default function TokenEconomyWidget() {
  const { profile } = useAuth();
  const { stats: userStats, refetch } = useUserStats(profile?.id);
  const [stats, setStats] = useState<TokenStats>({
    totalEarned: 0,
    totalSpent: 0,
    netBalance: 0,
    earnedThisWeek: 0,
    spentThisWeek: 0,
    topCategory: 'N/A'
  });
  const [loading, setLoading] = useState(true);
  
  // Real-time token updates - widget updates instantly when tokens change!
  useRealtimeTokenBalance(() => {
    console.log('💰 TokenEconomyWidget: Refetching stats...');
    refetch();
    fetchTokenStats(); // Also refetch weekly stats
  });

  useEffect(() => {
    if (!profile) return;
    fetchTokenStats();
  }, [profile]);

  const fetchTokenStats = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Get all-time stats from profile
      const totalEarned = profile.total_earned || 0;
      const totalSpent = profile.total_spent || 0;
      const netBalance = profile.token_balance || 0;

      // Get this week's stats
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: weeklyTransactions } = await supabase
        .from('token_transactions')
        .select('type, amount, category')
        .eq('user_id', profile.id)
        .gte('created_at', weekAgo.toISOString());

      let earnedThisWeek = 0;
      let spentThisWeek = 0;
      const categoryCount: Record<string, number> = {};

      if (weeklyTransactions) {
        weeklyTransactions.forEach(tx => {
          if (tx.type === 'earn') {
            earnedThisWeek += tx.amount;
          } else if (tx.type === 'spend') {
            spentThisWeek += Math.abs(tx.amount);
          }

          if (tx.category) {
            categoryCount[tx.category] = (categoryCount[tx.category] || 0) + 1;
          }
        });
      }

      // Find top category
      let topCategory = 'N/A';
      let maxCount = 0;
      Object.entries(categoryCount).forEach(([cat, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topCategory = cat;
        }
      });

      setStats({
        totalEarned,
        totalSpent,
        netBalance,
        earnedThisWeek,
        spentThisWeek,
        topCategory: topCategory.charAt(0).toUpperCase() + topCategory.slice(1)
      });
    } catch (error) {
      console.error('Error fetching token stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const earnVsSpendPercentage = stats.totalEarned > 0
    ? Math.round((stats.totalSpent / stats.totalEarned) * 100)
    : 0;

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Token Economy</h2>
            <p className="text-xs text-gray-400">Your financial overview</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[#0f0f0f] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Net Balance */}
          <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Net Balance</p>
                <p className="text-2xl font-bold text-white">
                  {formatTokens(userStats?.token_balance || stats.netBalance, { showLabel: true })}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Coins className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Weekly Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <p className="text-xs text-gray-400">This Week</p>
              </div>
              <p className="text-lg font-bold text-green-400">
                {formatTokens(stats.earnedThisWeek, { showSign: true })}
              </p>
            </div>

            <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <p className="text-xs text-gray-400">This Week</p>
              </div>
              <p className="text-lg font-bold text-red-400">
                -{formatTokens(stats.spentThisWeek)}
              </p>
            </div>
          </div>

          {/* All-Time Stats */}
          <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
            <p className="text-xs text-gray-400 mb-3">All-Time Stats</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Total Earned</span>
                <span className="text-sm font-semibold text-green-400">
                  {formatTokens(userStats?.total_earned || stats.totalEarned, { showSign: true })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Total Spent</span>
                <span className="text-sm font-semibold text-red-400">
                  -{formatTokens(userStats?.total_spent || stats.totalSpent)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#202225]">
                <span className="text-sm text-gray-300">Spend Ratio</span>
                <span className="text-sm font-semibold text-white">
                  {earnVsSpendPercentage}%
                </span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="mt-3 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                style={{ width: `${Math.min(earnVsSpendPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Top Category */}
          <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#8B5CF6]" />
                <p className="text-xs text-gray-400">Top Category</p>
              </div>
              <span className="text-sm font-semibold text-[#8B5CF6]">
                {stats.topCategory}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

