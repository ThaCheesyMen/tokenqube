import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Package, DollarSign, TrendingUp, Star, Eye, Heart,
  Edit, Trash2, AlertCircle, CheckCircle, Clock, Shield,
  BarChart3, Users, Coins, Award
} from 'lucide-react';
import { toast } from './Toast';
import { formatTokens } from '../utils/formatTokens';

interface SellerStats {
  total_sales: number;
  total_purchases: number;
  total_tokens_earned: number;
  total_tokens_spent: number;
  average_rating: number;
  total_reviews: number;
  verified_seller: boolean;
  seller_tier: string;
  active_listings: number;
  pending_transactions: number;
}

interface MarketplaceItem {
  id: string;
  item_name: string;
  price_tokens: number;
  quantity: number;
  status: string;
  views: number;
  favorites: number;
  created_at: string;
}

interface Transaction {
  id: string;
  item_id: string;
  buyer_id: string;
  price_tokens: number;
  transaction_status: string;
  delivery_status: string;
  created_at: string;
  marketplace_items: {
    item_name: string;
  };
  profiles: {
    username: string;
  };
}

export default function SellerDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [listings, setListings] = useState<MarketplaceItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'sales'>('overview');

  useEffect(() => {
    if (profile) {
      fetchSellerData();
    }
  }, [profile]);

  const fetchSellerData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Fetch seller stats
      const { data: statsData } = await supabase
        .from('user_marketplace_stats')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      // Fetch active listings count
      const { count: activeCount } = await supabase
        .from('marketplace_items')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', profile.id)
        .eq('status', 'active');

      // Fetch pending transactions count
      const { count: pendingCount } = await supabase
        .from('marketplace_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', profile.id)
        .in('transaction_status', ['pending', 'completed'])
        .eq('delivery_status', 'pending');

      setStats({
        ...statsData,
        active_listings: activeCount || 0,
        pending_transactions: pendingCount || 0
      });

      // Fetch user's listings
      const { data: listingsData } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false });

      setListings(listingsData || []);

      // Fetch recent transactions
      const { data: transactionsData } = await supabase
        .from('marketplace_transactions')
        .select(`
          *,
          marketplace_items(item_name),
          profiles:buyer_id(username)
        `)
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error fetching seller data:', error);
      toast.error('Failed to load seller dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { error } = await supabase
        .from('marketplace_items')
        .update({ status: 'removed' })
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Listing deleted');
      fetchSellerData();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  const handleMarkDelivered = async (transactionId: string) => {
    try {
      // Update transaction delivery status
      const { error: txError } = await supabase
        .from('marketplace_transactions')
        .update({ delivery_status: 'delivered' })
        .eq('id', transactionId);

      if (txError) throw txError;

      // Get transaction details
      const { data: transaction } = await supabase
        .from('marketplace_transactions')
        .select('*, marketplace_escrow(*)')
        .eq('id', transactionId)
        .single();

      if (transaction && transaction.marketplace_escrow && transaction.marketplace_escrow.length > 0) {
        const escrow = transaction.marketplace_escrow[0];
        
        // Release escrow funds to seller
        if (escrow.status === 'funded') {
          // Add tokens to seller
          await supabase
            .from('profiles')
            .update({ 
              token_balance: (profile?.token_balance || 0) + transaction.seller_receives 
            })
            .eq('id', profile?.id);

          // Update escrow status
          await supabase
            .from('marketplace_escrow')
            .update({ 
              status: 'released',
              released_at: new Date().toISOString()
            })
            .eq('id', escrow.id);

          // Create notification for buyer
          await supabase
            .from('notifications')
            .insert([{
              user_id: transaction.buyer_id,
              title: 'Item Delivered',
              message: `Your purchase of ${transaction.marketplace_items.item_name} has been marked as delivered`,
              type: 'marketplace'
            }]);
        }
      }

      toast.success('Marked as delivered! Funds released.');
      fetchSellerData();
    } catch (error) {
      console.error('Error marking delivered:', error);
      toast.error('Failed to update delivery status');
    }
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: 'from-orange-700 to-orange-900',
      silver: 'from-gray-400 to-gray-600',
      gold: 'from-yellow-500 to-yellow-700',
      platinum: 'from-cyan-400 to-cyan-600',
      diamond: 'from-blue-400 to-purple-600'
    };
    return colors[tier] || colors.bronze;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B5CF6]"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0f0f0f]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Package className="w-8 h-8 text-[#8B5CF6]" />
          Seller Dashboard
        </h1>
        <p className="text-gray-400">Manage your listings and track your sales</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Coins className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <div className="text-3xl font-bold mb-1">{formatTokens(stats.total_tokens_earned)}</div>
            <div className="text-white/80 text-sm">Total Earnings</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 opacity-80" />
              <Package className="w-5 h-5 opacity-60" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.total_sales}</div>
            <div className="text-white/80 text-sm">Total Sales</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Star className="w-8 h-8 opacity-80" />
              <Award className="w-5 h-5 opacity-60" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.average_rating.toFixed(1)}</div>
            <div className="text-white/80 text-sm">{stats.total_reviews} Reviews</div>
          </div>

          <div className={`bg-gradient-to-br ${getTierColor(stats.seller_tier)} rounded-xl p-6 text-white`}>
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 opacity-80" />
              {stats.verified_seller && <Shield className="w-5 h-5 opacity-60" />}
            </div>
            <div className="text-2xl font-bold mb-1 capitalize">{stats.seller_tier}</div>
            <div className="text-white/80 text-sm">
              {stats.verified_seller ? 'Verified Seller' : 'Seller Tier'}
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#202225]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#8B5CF6]/20 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.active_listings || 0}</p>
              <p className="text-sm text-gray-400">Active Listings</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#202225]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.pending_transactions || 0}</p>
              <p className="text-sm text-gray-400">Pending Deliveries</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#202225]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.total_sales || 0}</p>
              <p className="text-sm text-gray-400">Completed Sales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#202225] mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'overview'
              ? 'text-white border-b-2 border-[#8B5CF6]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Overview
          </div>
        </button>
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'listings'
              ? 'text-white border-b-2 border-[#8B5CF6]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            My Listings ({listings.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'sales'
              ? 'text-white border-b-2 border-[#8B5CF6]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Sales History
          </div>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
            <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
            {transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No recent sales</p>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg">
                    <div>
                      <p className="text-white font-semibold">{tx.marketplace_items.item_name}</p>
                      <p className="text-sm text-gray-400">
                        Sold to {tx.profiles.username} • {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-500 font-bold">+{formatTokens(tx.price_tokens)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        tx.delivery_status === 'delivered' ? 'bg-green-500/20 text-green-500' :
                        tx.delivery_status === 'pending' ? 'bg-orange-500/20 text-orange-500' :
                        'bg-blue-500/20 text-blue-500'
                      }`}>
                        {tx.delivery_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Performing Listings */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
            <h3 className="text-xl font-bold text-white mb-4">Top Performing Listings</h3>
            <div className="space-y-3">
              {listings
                .filter(item => item.status === 'active')
                .sort((a, b) => b.views - a.views)
                .slice(0, 5)
                .map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg">
                    <div>
                      <p className="text-white font-semibold">{item.item_name}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {item.views} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {item.favorites} favorites
                        </span>
                      </div>
                    </div>
                    <p className="text-yellow-500 font-bold">{formatTokens(item.price_tokens)}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'listings' && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#202225]">
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Item</th>
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Price</th>
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Status</th>
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Stats</th>
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Listed</th>
                  <th className="text-right text-gray-400 font-semibold py-4 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item) => (
                  <tr key={item.id} className="border-b border-[#202225] hover:bg-[#0f0f0f] transition">
                    <td className="py-4 px-6">
                      <p className="text-white font-semibold">{item.item_name}</p>
                      <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-yellow-500 font-bold">{formatTokens(item.price_tokens)}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'active' ? 'bg-green-500/20 text-green-500' :
                        item.status === 'sold' ? 'bg-blue-500/20 text-blue-500' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {item.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {item.favorites}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg transition"
                          title="Edit listing"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteListing(item.id)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                          title="Delete listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#202225]">
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Item</th>
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Buyer</th>
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Amount</th>
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Status</th>
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Date</th>
                  <th className="text-right text-gray-400 font-semibold py-4 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-[#202225] hover:bg-[#0f0f0f] transition">
                    <td className="py-4 px-6">
                      <p className="text-white font-semibold">{tx.marketplace_items.item_name}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-white">{tx.profiles.username}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-yellow-500 font-bold">{formatTokens(tx.price_tokens)}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                          tx.transaction_status === 'completed' ? 'bg-green-500/20 text-green-500' :
                          tx.transaction_status === 'pending' ? 'bg-orange-500/20 text-orange-500' :
                          'bg-gray-500/20 text-gray-500'
                        }`}>
                          {tx.transaction_status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                          tx.delivery_status === 'delivered' ? 'bg-green-500/20 text-green-500' :
                          tx.delivery_status === 'pending' ? 'bg-orange-500/20 text-orange-500' :
                          'bg-blue-500/20 text-blue-500'
                        }`}>
                          {tx.delivery_status}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        {tx.delivery_status === 'pending' && (
                          <button
                            onClick={() => handleMarkDelivered(tx.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

