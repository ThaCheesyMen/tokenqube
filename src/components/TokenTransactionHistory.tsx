import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, Gift, Award, ShoppingBag, Zap, Clock } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  source: string | null;
  description: string | null;
  created_at: string;
}

export default function TokenTransactionHistory() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earn' | 'spend'>('all');

  useEffect(() => {
    if (profile) {
      fetchTransactions();
    }
  }, [profile, filter]);

  const fetchTransactions = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let query = supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string, category: string) => {
    if (type === 'earn') {
      if (category === 'reward') return <Award className="w-5 h-5" />;
      if (category === 'playtime') return <Clock className="w-5 h-5" />;
      return <TrendingUp className="w-5 h-5" />;
    } else {
      if (category === 'marketplace') return <ShoppingBag className="w-5 h-5" />;
      if (category === 'boost') return <Zap className="w-5 h-5" />;
      return <TrendingDown className="w-5 h-5" />;
    }
  };

  const getColorClass = (type: string) => {
    return type === 'earn' 
      ? 'text-green-500 bg-green-500/10' 
      : 'text-red-500 bg-red-500/10';
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Transaction History</h3>
        
        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-[#8B5CF6] text-white'
                : 'bg-[#0f0f0f] text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('earn')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'earn'
                ? 'bg-green-500 text-white'
                : 'bg-[#0f0f0f] text-gray-400 hover:text-white'
            }`}
          >
            Earned
          </button>
          <button
            onClick={() => setFilter('spend')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'spend'
                ? 'bg-red-500 text-white'
                : 'bg-[#0f0f0f] text-gray-400 hover:text-white'
            }`}
          >
            Spent
          </button>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#0f0f0f] rounded-lg h-16"></div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <Gift className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No transactions yet</p>
          <p className="text-sm text-gray-500 mt-2">Start playing games to earn tokens!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${getColorClass(tx.type)}`}>
                  {getIcon(tx.type, tx.category)}
                </div>
                <div>
                  <p className="text-white font-semibold">
                    {tx.description || tx.category}
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(tx.created_at)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${
                  tx.type === 'earn' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                </p>
                <p className="text-xs text-gray-500 capitalize">{tx.category}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

