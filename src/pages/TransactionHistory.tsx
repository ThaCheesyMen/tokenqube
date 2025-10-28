import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowUpRight, ArrowDownLeft, Filter, Download, Search,
  Calendar, Coins, TrendingUp, TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'earn' | 'spend' | 'purchase' | 'refund' | 'bonus' | 'transfer';
  category: string;
  description: string;
  metadata?: any;
  created_at: string;
  balance_after?: number;
}

export default function TransactionHistory() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Stats
  const [stats, setStats] = useState({
    totalEarned: 0,
    totalSpent: 0,
    netChange: 0,
    transactionCount: 0
  });

  useEffect(() => {
    if (profile) {
      fetchTransactions();
    }
  }, [profile, dateRange]);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchQuery, filterType]);

  const fetchTransactions = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Calculate date filter
      let dateFilter = new Date();
      switch (dateRange) {
        case 'week':
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case 'month':
          dateFilter.setMonth(dateFilter.getMonth() - 1);
          break;
        case 'year':
          dateFilter.setFullYear(dateFilter.getFullYear() - 1);
          break;
        default:
          dateFilter = new Date('2000-01-01'); // All time
      }

      const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', profile.id)
        .gte('created_at', dateFilter.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setTransactions(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (txns: Transaction[]) => {
    const earned = txns
      .filter(t => ['earn', 'bonus', 'refund'].includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);

    const spent = txns
      .filter(t => ['spend', 'purchase', 'transfer'].includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);

    setStats({
      totalEarned: earned,
      totalSpent: spent,
      netChange: earned - spent,
      transactionCount: txns.length
    });
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  const exportTransactions = () => {
    const csv = [
      ['Date', 'Type', 'Category', 'Description', 'Amount', 'Balance After'],
      ...filteredTransactions.map(t => [
        format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
        t.type,
        t.category,
        t.description,
        t.amount.toString(),
        t.balance_after?.toString() || ''
      ])
    ];

    const csvContent = csv.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokenqube-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earn':
      case 'bonus':
      case 'refund':
        return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
      case 'spend':
      case 'purchase':
      case 'transfer':
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      default:
        return <Coins className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'earn':
      case 'bonus':
      case 'refund':
        return 'text-green-400';
      case 'spend':
      case 'purchase':
      case 'transfer':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
          <p className="text-gray-400">View all your token transactions and exports</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Earned</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-400">+{stats.totalEarned.toLocaleString()}</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Spent</span>
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-400">-{stats.totalSpent.toLocaleString()}</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Net Change</span>
              <Coins className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <p className={`text-2xl font-bold ${stats.netChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.netChange >= 0 ? '+' : ''}{stats.netChange.toLocaleString()}
            </p>
          </div>

          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Transactions</span>
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.transactionCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1a1a] rounded-lg p-4 mb-6 border border-[#202225]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="earn">Earned</option>
              <option value="spend">Spent</option>
              <option value="purchase">Purchases</option>
              <option value="bonus">Bonuses</option>
              <option value="refund">Refunds</option>
              <option value="transfer">Transfers</option>
            </select>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
              <option value="all">All Time</option>
            </select>

            {/* Export */}
            <button
              onClick={exportTransactions}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-[#1a1a1a] rounded-lg border border-[#202225] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading transactions...</p>
            </div>
          ) : paginatedTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <Coins className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No transactions found</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[#202225]">
                {paginatedTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-4 hover:bg-[#0f0f0f] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#0f0f0f] rounded-lg">
                          {getTypeIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{transaction.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-400 capitalize">{transaction.category}</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-sm text-gray-500">
                              {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getTypeColor(transaction.type)}`}>
                          {['earn', 'bonus', 'refund'].includes(transaction.type) ? '+' : '-'}
                          {transaction.amount.toLocaleString()}
                        </p>
                        {transaction.balance_after && (
                          <p className="text-sm text-gray-500">
                            Balance: {transaction.balance_after.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-[#202225] flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-[#0f0f0f] hover:bg-[#2f3136] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 bg-[#0f0f0f] text-white rounded-lg">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-[#0f0f0f] hover:bg-[#2f3136] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

