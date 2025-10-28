import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  DollarSign, TrendingUp, Coins, ShoppingBag, 
  ArrowUpRight, ArrowDownLeft, Users, Calendar,
  Download, Eye, CheckCircle, Clock
} from 'lucide-react';
import { toast } from '../components/Toast';
import { formatTokens } from '../utils/formatTokens';

interface RevenueData {
  date: string;
  token_sales_revenue: number;
  marketplace_fees: number;
  withdrawal_fees: number;
  subscription_revenue: number;
  gross_revenue: number;
  net_revenue: number;
  total_token_purchases: number;
  total_withdrawals: number;
  profit_margin_percent: number;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  username: string;
  amount_tokens: number;
  fee_tokens: number;
  net_amount_tokens: number;
  amount_usd: number;
  crypto_address: string;
  crypto_type: string;
  status: string;
  requested_at: string;
}

interface RevenueSummary {
  total_gross_revenue: number;
  total_net_revenue: number;
  total_token_sales: number;
  total_marketplace_fees: number;
  total_withdrawal_fees: number;
  total_purchases: number;
  total_withdrawals_count: number;
  avg_daily_revenue: number;
  profit_margin: number;
}

export default function AdminRevenue() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [summary, setSummary] = useState<RevenueSummary>({
    total_gross_revenue: 0,
    total_net_revenue: 0,
    total_token_sales: 0,
    total_marketplace_fees: 0,
    total_withdrawal_fees: 0,
    total_purchases: 0,
    total_withdrawals_count: 0,
    avg_daily_revenue: 0,
    profit_margin: 0
  });
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRevenueData();
    fetchWithdrawalRequests();
    fetchRevenueSummary();
  }, [dateRange]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('revenue_analytics')
        .select('*')
        .limit(getDaysFromRange(dateRange))
        .order('date', { ascending: false });

      if (data) {
        setRevenueData(data);
      }
    } catch (error) {
      console.error('Error fetching revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawalRequests = async () => {
    try {
      const { data } = await supabase
        .from('token_withdrawals')
        .select(`
          *,
          profiles:user_id (username)
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (data) {
        const formattedData = data.map((item: any) => ({
          ...item,
          username: item.profiles?.username || 'Unknown'
        }));
        setWithdrawalRequests(formattedData);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const fetchRevenueSummary = async () => {
    try {
      const days = getDaysFromRange(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data } = await supabase.rpc('get_revenue_summary', {
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });

      if (data && data.length > 0) {
        setSummary(data[0]);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const getDaysFromRange = (range: string) => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  };

  const handleApproveWithdrawal = async (withdrawal: WithdrawalRequest) => {
    if (!confirm(`Approve withdrawal of ${formatTokens(withdrawal.amount_tokens, { showLabel: true })} for ${withdrawal.username}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('token_withdrawals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          transaction_hash: 'tx_' + Math.random().toString(36).substring(7) // Generate mock tx hash
        })
        .eq('id', withdrawal.id);

      if (error) throw error;

      toast.success('Withdrawal approved!');
      fetchWithdrawalRequests();
      fetchRevenueSummary();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast.error('Failed to approve withdrawal');
    }
  };

  const handleRejectWithdrawal = async (withdrawal: WithdrawalRequest) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;

    try {
      // Reject withdrawal
      const { error: withdrawalError } = await supabase
        .from('token_withdrawals')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id);

      if (withdrawalError) throw withdrawalError;

      // Refund tokens to user
      const { error: refundError } = await supabase.rpc('add_tokens', {
        p_user_id: withdrawal.user_id,
        p_amount: withdrawal.amount_tokens
      });

      if (refundError) throw refundError;

      toast.success('Withdrawal rejected and tokens refunded');
      fetchWithdrawalRequests();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast.error('Failed to reject withdrawal');
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Token Sales', 'Marketplace Fees', 'Withdrawal Fees', 'Gross Revenue', 'Net Revenue'],
      ...revenueData.map(row => [
        row.date,
        row.token_sales_revenue.toFixed(2),
        row.marketplace_fees.toFixed(2),
        row.withdrawal_fees.toFixed(2),
        row.gross_revenue.toFixed(2),
        row.net_revenue.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_${dateRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Revenue data exported!');
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Revenue Dashboard</h1>
            <p className="text-gray-400">Track your passive income and platform metrics</p>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 transition"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <DollarSign className="w-6 h-6" />
                </div>
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <div className="text-3xl font-bold mb-1">
                ${(summary?.total_gross_revenue ?? 0).toFixed(2)}
              </div>
              <div className="text-white/80 text-sm">Gross Revenue ({dateRange})</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold bg-white/20 px-2 py-1 rounded-full">
                  {(summary?.profit_margin ?? 0).toFixed(1)}%
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">
                ${(summary?.total_net_revenue ?? 0).toFixed(2)}
              </div>
              <div className="text-white/80 text-sm">Net Revenue (After fees)</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <Coins className="w-5 h-5 opacity-80" />
              </div>
              <div className="text-3xl font-bold mb-1">
                ${(summary?.total_marketplace_fees ?? 0).toFixed(2)}
              </div>
              <div className="text-white/80 text-sm">Marketplace Fees (5%)</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
                <Users className="w-5 h-5 opacity-80" />
              </div>
              <div className="text-3xl font-bold mb-1">
                ${(summary?.total_withdrawal_fees ?? 0).toFixed(2)}
              </div>
              <div className="text-white/80 text-sm">Withdrawal Fees (2%)</div>
            </div>
          </div>
        )}

        {/* Metrics Row */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
              <div className="flex items-center gap-3 mb-3">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="text-gray-400 text-sm">Token Sales</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                ${(summary?.total_token_sales ?? 0).toFixed(2)}
              </div>
              <div className="text-gray-400 text-sm">
                {summary?.total_purchases ?? 0} purchases
              </div>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
              <div className="flex items-center gap-3 mb-3">
                <ArrowUpRight className="w-5 h-5 text-red-500" />
                <span className="text-gray-400 text-sm">Withdrawals</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {summary?.total_withdrawals_count ?? 0}
              </div>
              <div className="text-gray-400 text-sm">
                Processed withdrawals
              </div>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-blue-500" />
                <span className="text-gray-400 text-sm">Avg Daily Revenue</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                ${(summary?.avg_daily_revenue ?? 0).toFixed(2)}
              </div>
              <div className="text-gray-400 text-sm">
                Per day average
              </div>
            </div>
          </div>
        )}

        {/* Pending Withdrawals */}
        {withdrawalRequests.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-yellow-500" />
              <h2 className="text-white font-bold text-xl">
                Pending Withdrawals ({withdrawalRequests.length})
              </h2>
            </div>

            <div className="space-y-3">
              {withdrawalRequests.map((withdrawal) => (
                <div key={withdrawal.id} className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-yellow-500/10 rounded-lg">
                        <ArrowUpRight className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div>
                        <div className="text-white font-semibold mb-1">
                          {withdrawal.username}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {formatTokens(withdrawal.amount_tokens, { showLabel: true })} → ${withdrawal.amount_usd.toFixed(2)} {withdrawal.crypto_type}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          {withdrawal.crypto_address.slice(0, 20)}...
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right mr-4">
                        <div className="text-green-500 font-semibold">
                          +${(withdrawal.fee_tokens * 0.001).toFixed(2)}
                        </div>
                        <div className="text-gray-400 text-xs">Your fee (2%)</div>
                      </div>
                      
                      <button
                        onClick={() => handleApproveWithdrawal(withdrawal)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      
                      <button
                        onClick={() => handleRejectWithdrawal(withdrawal)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue Chart/Table */}
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
          <h2 className="text-white font-bold text-xl mb-6">Daily Revenue Breakdown</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading revenue data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#202225]">
                    <th className="text-left text-gray-400 font-semibold py-3 px-4">Date</th>
                    <th className="text-right text-gray-400 font-semibold py-3 px-4">Token Sales</th>
                    <th className="text-right text-gray-400 font-semibold py-3 px-4">Marketplace</th>
                    <th className="text-right text-gray-400 font-semibold py-3 px-4">Withdrawals</th>
                    <th className="text-right text-gray-400 font-semibold py-3 px-4">Gross</th>
                    <th className="text-right text-gray-400 font-semibold py-3 px-4">Net</th>
                    <th className="text-right text-gray-400 font-semibold py-3 px-4">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData.map((row) => (
                    <tr key={row.date} className="border-b border-[#202225] hover:bg-[#0f0f0f] transition">
                      <td className="py-3 px-4 text-white">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right text-green-400">${row.token_sales_revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-blue-400">${row.marketplace_fees.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-purple-400">${row.withdrawal_fees.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-white font-semibold">${row.gross_revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-green-500 font-bold">${row.net_revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-gray-400">{row.profit_margin_percent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

