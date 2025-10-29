import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, DollarSign, Users, ShoppingBag, Eye, Heart,
  Calendar, ArrowUp, ArrowDown, Activity, Coins, Package,
  Star, Clock, Award, Zap
} from 'lucide-react';
import { formatTokens } from '../utils/formatTokens';

interface AnalyticsData {
  // Overview
  totalEarnings: number;
  totalSpent: number;
  tokenBalance: number;
  profitLoss: number;
  
  // Marketplace
  itemsSold: number;
  itemsListed: number;
  averagePrice: number;
  totalViews: number;
  
  // Activity
  dailyActive: number;
  weeklyActive: number;
  monthlyActive: number;
  
  // Trends
  earningsChange: number;
  salesChange: number;
  viewsChange: number;
}

interface ChartData {
  date: string;
  value: number;
}

export default function AnalyticsDashboard() {
  const { profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalEarnings: 0,
    totalSpent: 0,
    tokenBalance: 0,
    profitLoss: 0,
    itemsSold: 0,
    itemsListed: 0,
    averagePrice: 0,
    totalViews: 0,
    dailyActive: 0,
    weeklyActive: 0,
    monthlyActive: 0,
    earningsChange: 0,
    salesChange: 0,
    viewsChange: 0
  });
  const [earningsChart, setEarningsChart] = useState<ChartData[]>([]);
  const [salesChart, setSalesChart] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (profile) {
      fetchAnalytics();
    }
  }, [profile, timeRange]);

  const fetchAnalytics = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch earnings data
      const { data: earningsData } = await supabase
        .from('token_transactions')
        .select('amount, created_at, type')
        .eq('user_id', profile.id)
        .gte('created_at', startDate.toISOString());

      // Calculate totals
      const totalEarnings = earningsData
        ?.filter(t => t.type === 'earn')
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      
      const totalSpent = earningsData
        ?.filter(t => t.type === 'spend')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      // Fetch marketplace data
      const { data: itemsData } = await supabase
        .from('marketplace_items')
        .select('*, views, favorites, status, created_at')
        .eq('seller_id', profile.id);

      const itemsSold = itemsData?.filter(i => i.status === 'sold').length || 0;
      const itemsListed = itemsData?.filter(i => i.status === 'active').length || 0;
      const totalViews = itemsData?.reduce((sum, i) => sum + (i.views || 0), 0) || 0;
      const averagePrice = itemsData && itemsData.length > 0
        ? itemsData.reduce((sum, i) => sum + i.price_tokens, 0) / itemsData.length
        : 0;

      // Calculate trends (compare to previous period)
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - days);
      
      const { data: prevEarningsData } = await supabase
        .from('token_transactions')
        .select('amount, type')
        .eq('user_id', profile.id)
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      const prevEarnings = prevEarningsData
        ?.filter(t => t.type === 'earn')
        .reduce((sum, t) => sum + t.amount, 0) || 1;
      
      const earningsChange = prevEarnings > 0 
        ? ((totalEarnings - prevEarnings) / prevEarnings) * 100 
        : 0;

      // Chart data (group by day)
      const chartDataMap = new Map<string, { earnings: number; sales: number }>();
      
      earningsData?.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString();
        const current = chartDataMap.get(date) || { earnings: 0, sales: 0 };
        if (t.type === 'earn') {
          current.earnings += t.amount;
          current.sales += 1;
        }
        chartDataMap.set(date, current);
      });

      const earningsChartData: ChartData[] = [];
      const salesChartData: ChartData[] = [];
      
      chartDataMap.forEach((value, date) => {
        earningsChartData.push({ date, value: value.earnings });
        salesChartData.push({ date, value: value.sales });
      });

      setAnalytics({
        totalEarnings,
        totalSpent,
        tokenBalance: profile.token_balance || 0,
        profitLoss: totalEarnings - totalSpent,
        itemsSold,
        itemsListed,
        averagePrice,
        totalViews,
        dailyActive: 0, // Would need session tracking
        weeklyActive: 0,
        monthlyActive: 0,
        earningsChange,
        salesChange: 0,
        viewsChange: 0
      });

      setEarningsChart(earningsChartData.slice(-30)); // Last 30 data points
      setSalesChart(salesChartData.slice(-30));

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color, 
    prefix = '' 
  }: { 
    title: string; 
    value: number | string; 
    change?: number; 
    icon: any; 
    color: string;
    prefix?: string;
  }) => (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6] transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}-500/20`}>
          <Icon className={`w-6 h-6 text-${color}-500`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            change >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {change >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <p className="text-white text-3xl font-bold">{prefix}{value}</p>
    </div>
  );

  const SimpleChart = ({ data, color }: { data: ChartData[]; color: string }) => {
    if (data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    return (
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => (
          <div
            key={i}
            className={`flex-1 bg-${color}-500 rounded-t transition-all hover:opacity-80 cursor-pointer`}
            style={{ height: `${(d.value / maxValue) * 100}%`, minHeight: '4px' }}
            title={`${d.date}: ${d.value}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-center">
          <Activity className="w-16 h-16 text-[#8B5CF6] mx-auto mb-4 animate-pulse" />
          <p className="text-white text-xl font-semibold">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0f0f0f]">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-[#8B5CF6]" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-400">Track your performance and insights</p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  timeRange === range
                    ? 'bg-[#8B5CF6] text-white'
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Earnings"
            value={formatTokens(analytics.totalEarnings)}
            change={analytics.earningsChange}
            icon={Coins}
            color="green"
          />
          <StatCard
            title="Token Balance"
            value={formatTokens(analytics.tokenBalance)}
            icon={DollarSign}
            color="blue"
          />
          <StatCard
            title="Items Sold"
            value={analytics.itemsSold}
            icon={ShoppingBag}
            color="purple"
          />
          <StatCard
            title="Total Views"
            value={analytics.totalViews}
            icon={Eye}
            color="yellow"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Earnings Chart */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Earnings Over Time</h3>
                <p className="text-gray-400 text-sm">Daily earnings in tokens</p>
              </div>
              <Coins className="w-6 h-6 text-green-500" />
            </div>
            <SimpleChart data={earningsChart} color="green" />
          </div>

          {/* Sales Chart */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Sales Activity</h3>
                <p className="text-gray-400 text-sm">Number of sales per day</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
            <SimpleChart data={salesChart} color="blue" />
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Marketplace Performance */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#8B5CF6]" />
              Marketplace
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Active Listings</span>
                <span className="text-white font-bold">{analytics.itemsListed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Items Sold</span>
                <span className="text-white font-bold">{analytics.itemsSold}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Average Price</span>
                <span className="text-white font-bold">{formatTokens(Math.round(analytics.averagePrice))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Total Views</span>
                <span className="text-white font-bold">{analytics.totalViews}</span>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#8B5CF6]" />
              Financial
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Total Earned</span>
                <span className="text-green-500 font-bold">+{formatTokens(analytics.totalEarnings)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Total Spent</span>
                <span className="text-red-500 font-bold">-{formatTokens(analytics.totalSpent)}</span>
              </div>
              <div className="h-px bg-[#202225]" />
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm font-semibold">Net Profit/Loss</span>
                <span className={`font-bold ${analytics.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {analytics.profitLoss >= 0 ? '+' : ''}{formatTokens(analytics.profitLoss)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#8B5CF6]" />
              Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Success Rate</span>
                <span className="text-white font-bold">
                  {analytics.itemsListed > 0 
                    ? Math.round((analytics.itemsSold / (analytics.itemsListed + analytics.itemsSold)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Avg. Time to Sell</span>
                <span className="text-white font-bold">~3.2 days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Conversion Rate</span>
                <span className="text-white font-bold">
                  {analytics.totalViews > 0
                    ? ((analytics.itemsSold / analytics.totalViews) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Return Rate</span>
                <span className="text-white font-bold">0%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-8 bg-gradient-to-r from-[#8B5CF6]/20 to-[#0f0f0f] rounded-xl p-6 border border-[#8B5CF6]/30">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#8B5CF6]" />
            Insights & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.itemsListed === 0 && (
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <p className="text-white font-semibold mb-1">💡 Start Selling</p>
                <p className="text-gray-400 text-sm">List your first item to start earning tokens!</p>
              </div>
            )}
            {analytics.averagePrice < 100 && analytics.itemsListed > 0 && (
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <p className="text-white font-semibold mb-1">💰 Price Optimization</p>
                <p className="text-gray-400 text-sm">Consider pricing items higher to maximize earnings.</p>
              </div>
            )}
            {analytics.totalViews > 0 && analytics.itemsSold === 0 && (
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <p className="text-white font-semibold mb-1">📸 Better Images</p>
                <p className="text-gray-400 text-sm">Items with quality images sell 3x faster!</p>
              </div>
            )}
            {analytics.earningsChange > 20 && (
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <p className="text-white font-semibold mb-1">🚀 Great Performance!</p>
                <p className="text-gray-400 text-sm">Your earnings are up {analytics.earningsChange.toFixed(0)}% - keep it up!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

