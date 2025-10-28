import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { History, TrendingUp, TrendingDown, Coins, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

interface TransactionHistoryWidgetProps {
  onViewAll: () => void;
}

export default function TransactionHistoryWidget({ onViewAll }: TransactionHistoryWidgetProps) {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ earned: 0, spent: 0, net: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchTransactions();
    }
  }, [profile]);

  const fetchTransactions = async () => {
    if (!profile) return;

    try {
      // Fetch recent transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setTransactions(transactionsData || []);

      // Calculate stats
      if (transactionsData) {
        const earned = transactionsData
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);
        
        const spent = Math.abs(transactionsData
          .filter(t => t.amount < 0)
          .reduce((sum, t) => sum + t.amount, 0));
        
        setStats({
          earned,
          spent,
          net: earned - spent
        });
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    const icons: Record<string, any> = {
      earn: ArrowUpRight,
      spend: ArrowDownRight,
      playtime: Coins,
      achievement: TrendingUp,
      quest: TrendingUp,
      purchase: TrendingDown,
      default: History
    };
    return icons[type] || icons.default;
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-400' : 'text-red-400';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      earn: 'Earned',
      spend: 'Spent',
      playtime: 'Playtime',
      achievement: 'Achievement',
      quest: 'Quest',
      purchase: 'Purchase',
      daily_login: 'Daily Login',
      referral: 'Referral',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
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
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Transaction History</h3>
            <p className="text-sm text-gray-400">Track your token activity</p>
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Total Earned</span>
          </div>
          <p className="text-2xl font-bold text-green-400">+{stats.earned.toLocaleString()}</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-gray-400">Total Spent</span>
          </div>
          <p className="text-2xl font-bold text-red-400">-{stats.spent.toLocaleString()}</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Net Change</span>
          </div>
          <p className={`text-2xl font-bold ${stats.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.net >= 0 ? '+' : ''}{stats.net.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-3">Recent Transactions</h4>
        {transactions.length === 0 ? (
          <div className="text-center py-8 bg-[#0f0f0f] rounded-lg border border-[#202225]">
            <History className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No transactions yet</p>
            <p className="text-sm text-gray-500 mt-1">Start earning tokens to see your history!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => {
              const Icon = getTransactionIcon(transaction.type);
              return (
                <div
                  key={transaction.id}
                  className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225] hover:border-[#8B5CF6] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${transaction.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'} rounded-lg`}>
                        <Icon className={`w-5 h-5 ${transaction.amount > 0 ? 'text-green-400' : 'text-red-400'}`} />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">
                          {transaction.description || getTypeLabel(transaction.type)}
                        </p>
                        <p className="text-xs text-gray-500">{formatTimeAgo(transaction.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getTransactionColor(transaction.amount)}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{transaction.type}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          💡 All your token earnings and purchases are tracked here for <span className="font-bold">full transparency</span>!
        </p>
      </div>
    </div>
  );
}

