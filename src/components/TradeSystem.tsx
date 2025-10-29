import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeftRight, X, Plus, Trash2, CheckCircle, XCircle, 
  AlertCircle, Clock, User, Coins, Package, Search
} from 'lucide-react';
import { toast } from './Toast';
import { formatTokens } from '../utils/formatTokens';

interface TradeOffer {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_items: string[];
  to_items: string[];
  from_tokens: number;
  to_tokens: number;
  status: string;
  message?: string;
  created_at: string;
  expires_at: string;
  from_user: {
    username: string;
    avatar_url?: string;
  };
  to_user: {
    username: string;
    avatar_url?: string;
  };
}

interface TradeSystemProps {
  friendId?: string;
  friendUsername?: string;
  onClose?: () => void;
}

export default function TradeSystem({ friendId, friendUsername, onClose }: TradeSystemProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'pending' | 'history'>('create');
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Trade creation state
  const [selectedFriend, setSelectedFriend] = useState(friendId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [myItems, setMyItems] = useState<any[]>([]);
  const [theirItems, setTheirItems] = useState<any[]>([]);
  const [myTokens, setMyTokens] = useState(0);
  const [theirTokens, setTheirTokens] = useState(0);
  const [selectedMyItems, setSelectedMyItems] = useState<string[]>([]);
  const [selectedTheirItems, setSelectedTheirItems] = useState<string[]>([]);
  const [tradeMessage, setTradeMessage] = useState('');

  useEffect(() => {
    if (profile) {
      fetchFriends();
      fetchMyItems();
      fetchTrades();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedFriend) {
      fetchTheirItems();
    }
  }, [selectedFriend]);

  const fetchFriends = async () => {
    if (!profile) return;
    try {
      const { data } = await supabase
        .from('friends')
        .select('friend_id, profiles!friends_friend_id_fkey(id, username, avatar_url)')
        .eq('user_id', profile.id)
        .eq('status', 'accepted');

      setFriends(data?.map(f => f.profiles) || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchMyItems = async () => {
    if (!profile) return;
    try {
      const { data } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('seller_id', profile.id)
        .eq('status', 'active');

      setMyItems(data || []);
    } catch (error) {
      console.error('Error fetching my items:', error);
    }
  };

  const fetchTheirItems = async () => {
    if (!selectedFriend) return;
    try {
      const { data } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('seller_id', selectedFriend)
        .eq('status', 'active');

      setTheirItems(data || []);
    } catch (error) {
      console.error('Error fetching their items:', error);
    }
  };

  const fetchTrades = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trade_offers')
        .select(`
          *,
          from_user:profiles!trade_offers_from_user_id_fkey(username, avatar_url),
          to_user:profiles!trade_offers_to_user_id_fkey(username, avatar_url)
        `)
        .or(`from_user_id.eq.${profile.id},to_user_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrade = async () => {
    if (!profile || !selectedFriend) {
      toast.error('Please select a friend to trade with');
      return;
    }

    if (selectedMyItems.length === 0 && myTokens === 0) {
      toast.error('You must offer at least one item or some tokens');
      return;
    }

    if (selectedTheirItems.length === 0 && theirTokens === 0) {
      toast.error('You must request at least one item or some tokens');
      return;
    }

    if (myTokens > (profile.token_balance || 0)) {
      toast.error('Insufficient tokens');
      return;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error } = await supabase
        .from('trade_offers')
        .insert([{
          from_user_id: profile.id,
          to_user_id: selectedFriend,
          from_items: selectedMyItems,
          to_items: selectedTheirItems,
          from_tokens: myTokens,
          to_tokens: theirTokens,
          message: tradeMessage,
          status: 'pending',
          expires_at: expiresAt.toISOString()
        }]);

      if (error) throw error;

      // Send notification
      await supabase
        .from('notifications')
        .insert([{
          user_id: selectedFriend,
          title: 'New Trade Offer',
          message: `${profile.username} sent you a trade offer`,
          type: 'trade'
        }]);

      toast.success('Trade offer sent!');
      setSelectedMyItems([]);
      setSelectedTheirItems([]);
      setMyTokens(0);
      setTheirTokens(0);
      setTradeMessage('');
      setActiveTab('pending');
      fetchTrades();
    } catch (error) {
      console.error('Error creating trade:', error);
      toast.error('Failed to send trade offer');
    }
  };

  const handleAcceptTrade = async (tradeId: string) => {
    if (!profile) return;

    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    // Validate recipient has enough tokens
    if (trade.to_tokens > 0 && (profile.token_balance || 0) < trade.to_tokens) {
      toast.error('Insufficient tokens to accept this trade');
      return;
    }

    try {
      // Update trade status
      const { error: tradeError } = await supabase
        .from('trade_offers')
        .update({ status: 'completed' })
        .eq('id', tradeId);

      if (tradeError) throw tradeError;

      // Transfer items (update marketplace_items seller_id)
      if (trade.from_items.length > 0) {
        await supabase
          .from('marketplace_items')
          .update({ seller_id: trade.to_user_id })
          .in('id', trade.from_items);
      }

      if (trade.to_items.length > 0) {
        await supabase
          .from('marketplace_items')
          .update({ seller_id: trade.from_user_id })
          .in('id', trade.to_items);
      }

      // Transfer tokens
      if (trade.from_tokens > 0) {
        await supabase.rpc('transfer_tokens', {
          from_user: trade.from_user_id,
          to_user: trade.to_user_id,
          amount: trade.from_tokens
        });
      }

      if (trade.to_tokens > 0) {
        await supabase.rpc('transfer_tokens', {
          from_user: trade.to_user_id,
          to_user: trade.from_user_id,
          amount: trade.to_tokens
        });
      }

      // Create transaction records
      await supabase
        .from('trade_transactions')
        .insert([{
          trade_id: tradeId,
          from_user_id: trade.from_user_id,
          to_user_id: trade.to_user_id,
          from_items: trade.from_items,
          to_items: trade.to_items,
          from_tokens: trade.from_tokens,
          to_tokens: trade.to_tokens
        }]);

      // Notify sender
      await supabase
        .from('notifications')
        .insert([{
          user_id: trade.from_user_id,
          title: 'Trade Accepted!',
          message: `${trade.to_user.username} accepted your trade offer`,
          type: 'trade'
        }]);

      toast.success('Trade completed successfully!');
      fetchTrades();
      fetchMyItems();
    } catch (error) {
      console.error('Error accepting trade:', error);
      toast.error('Failed to complete trade');
    }
  };

  const handleDeclineTrade = async (tradeId: string) => {
    try {
      const { error } = await supabase
        .from('trade_offers')
        .update({ status: 'declined' })
        .eq('id', tradeId);

      if (error) throw error;

      const trade = trades.find(t => t.id === tradeId);
      if (trade && profile) {
        // Notify sender
        await supabase
          .from('notifications')
          .insert([{
            user_id: trade.from_user_id,
            title: 'Trade Declined',
            message: `${profile.username} declined your trade offer`,
            type: 'trade'
          }]);
      }

      toast.success('Trade declined');
      fetchTrades();
    } catch (error) {
      console.error('Error declining trade:', error);
      toast.error('Failed to decline trade');
    }
  };

  const handleCancelTrade = async (tradeId: string) => {
    try {
      const { error } = await supabase
        .from('trade_offers')
        .update({ status: 'cancelled' })
        .eq('id', tradeId);

      if (error) throw error;

      toast.success('Trade cancelled');
      fetchTrades();
    } catch (error) {
      console.error('Error cancelling trade:', error);
      toast.error('Failed to cancel trade');
    }
  };

  const pendingTrades = trades.filter(t => t.status === 'pending');
  const completedTrades = trades.filter(t => ['completed', 'declined', 'cancelled'].includes(t.status));

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="w-8 h-8 text-[#8B5CF6]" />
          <div>
            <h2 className="text-2xl font-bold text-white">Trade System</h2>
            <p className="text-gray-400 text-sm">Trade items and tokens with friends</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2f3136] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#202225] mb-6">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'create'
              ? 'text-white border-b-2 border-[#8B5CF6]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Create Trade
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'pending'
              ? 'text-white border-b-2 border-[#8B5CF6]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Pending ({pendingTrades.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'history'
              ? 'text-white border-b-2 border-[#8B5CF6]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Friend Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Trade With:</label>
            <select
              value={selectedFriend}
              onChange={(e) => setSelectedFriend(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value="">Select a friend...</option>
              {friends.map((friend: any) => (
                <option key={friend.id} value={friend.id}>
                  {friend.username}
                </option>
              ))}
            </select>
          </div>

          {selectedFriend && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Your Offer */}
              <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#202225]">
                <h3 className="text-white font-bold mb-4">Your Offer</h3>
                
                {/* Your Items */}
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Items ({selectedMyItems.length} selected)</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {myItems.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No items to trade</p>
                    ) : (
                      myItems.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMyItems.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMyItems([...selectedMyItems, item.id]);
                              } else {
                                setSelectedMyItems(selectedMyItems.filter(id => id !== item.id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="text-white text-sm">{item.item_name}</p>
                            <p className="text-gray-500 text-xs">{formatTokens(item.price_tokens)}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Your Tokens */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">Tokens</p>
                  <input
                    type="number"
                    value={myTokens}
                    onChange={(e) => setMyTokens(parseInt(e.target.value) || 0)}
                    max={profile?.token_balance || 0}
                    placeholder="0"
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {formatTokens(profile?.token_balance || 0)}
                  </p>
                </div>
              </div>

              {/* Their Request */}
              <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#202225]">
                <h3 className="text-white font-bold mb-4">Request From Them</h3>
                
                {/* Their Items */}
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Items ({selectedTheirItems.length} selected)</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {theirItems.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No items available</p>
                    ) : (
                      theirItems.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTheirItems.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTheirItems([...selectedTheirItems, item.id]);
                              } else {
                                setSelectedTheirItems(selectedTheirItems.filter(id => id !== item.id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="text-white text-sm">{item.item_name}</p>
                            <p className="text-gray-500 text-xs">{formatTokens(item.price_tokens)}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Their Tokens */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">Tokens</p>
                  <input
                    type="number"
                    value={theirTokens}
                    onChange={(e) => setTheirTokens(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          {selectedFriend && (
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Message (optional)</label>
              <textarea
                value={tradeMessage}
                onChange={(e) => setTradeMessage(e.target.value)}
                placeholder="Add a message to your trade offer..."
                rows={3}
                maxLength={200}
                className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{tradeMessage.length}/200</p>
            </div>
          )}

          {/* Send Button */}
          {selectedFriend && (
            <button
              onClick={handleCreateTrade}
              disabled={selectedMyItems.length === 0 && myTokens === 0}
              className="w-full px-6 py-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ArrowLeftRight className="w-6 h-6" />
              Send Trade Offer
            </button>
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingTrades.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No pending trades</p>
            </div>
          ) : (
            pendingTrades.map((trade) => (
              <div key={trade.id} className="bg-[#0f0f0f] rounded-xl p-4 border border-[#202225]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white font-semibold">
                      {trade.from_user_id === profile?.id ? 'To: ' + trade.to_user.username : 'From: ' + trade.from_user.username}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(trade.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {trade.from_user_id === profile?.id ? (
                    <button
                      onClick={() => handleCancelTrade(trade.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptTrade(trade.id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineTrade(trade.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                {trade.message && (
                  <p className="text-gray-400 text-sm mb-3 italic">"{trade.message}"</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs mb-2">Offering:</p>
                    <div className="text-white text-sm">
                      <p>{trade.from_items.length} items</p>
                      {trade.from_tokens > 0 && <p>{formatTokens(trade.from_tokens)}</p>}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-2">Requesting:</p>
                    <div className="text-white text-sm">
                      <p>{trade.to_items.length} items</p>
                      {trade.to_tokens > 0 && <p>{formatTokens(trade.to_tokens)}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {completedTrades.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No trade history</p>
            </div>
          ) : (
            completedTrades.map((trade) => (
              <div key={trade.id} className="bg-[#0f0f0f] rounded-xl p-4 border border-[#202225]">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white font-semibold">
                    {trade.from_user_id === profile?.id ? 'To: ' + trade.to_user.username : 'From: ' + trade.from_user.username}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${
                    trade.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                    trade.status === 'declined' ? 'bg-red-500/20 text-red-500' :
                    'bg-gray-500/20 text-gray-500'
                  }`}>
                    {trade.status}
                  </span>
                </div>
                <p className="text-gray-500 text-xs">
                  {new Date(trade.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

