import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Gift, Send, Package, Check, X } from 'lucide-react';
import { toast } from './Toast';

interface Friend {
  id: string;
  friend_id: string;
  profiles?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface GiftTransaction {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount: number;
  item_id: string | null;
  message: string | null;
  is_claimed: boolean;
  sent_at: string;
  claimed_at: string | null;
  sender?: {
    username: string;
  };
  recipient?: {
    username: string;
  };
}

export default function FriendGifting() {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedGifts, setReceivedGifts] = useState<GiftTransaction[]>([]);
  const [sentGifts, setSentGifts] = useState<GiftTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [giftAmount, setGiftAmount] = useState(0);
  const [giftMessage, setGiftMessage] = useState('');

  useEffect(() => {
    if (profile) {
      fetchFriends();
      fetchGifts();
    }
  }, [profile]);

  const fetchFriends = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          friend_id,
          profiles:friend_id (id, username, avatar_url)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'accepted');

      if (error) throw error;
      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGifts = async () => {
    if (!profile) return;

    try {
      // Received gifts
      const { data: received } = await supabase
        .from('gift_transactions')
        .select(`
          *,
          sender:profiles!sender_id (username)
        `)
        .eq('recipient_id', profile.id)
        .order('sent_at', { ascending: false })
        .limit(10);

      setReceivedGifts(received || []);

      // Sent gifts
      const { data: sent } = await supabase
        .from('gift_transactions')
        .select(`
          *,
          recipient:profiles!recipient_id (username)
        `)
        .eq('sender_id', profile.id)
        .order('sent_at', { ascending: false })
        .limit(10);

      setSentGifts(sent || []);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    }
  };

  const sendGift = async () => {
    if (!profile || !selectedFriend || giftAmount <= 0) {
      toast.error('Please select a friend and enter an amount');
      return;
    }

    if (giftAmount > (profile.token_balance || 0)) {
      toast.error('Insufficient tokens!');
      return;
    }

    try {
      // Deduct tokens from sender
      await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - giftAmount })
        .eq('id', profile.id);

      // Create gift transaction
      const { error } = await supabase
        .from('gift_transactions')
        .insert({
          sender_id: profile.id,
          recipient_id: selectedFriend.friend_id,
          amount: giftAmount,
          message: giftMessage || null,
          is_claimed: false
        });

      if (error) throw error;

      toast.success(`Gift sent to ${selectedFriend.profiles?.username}! 🎁`);
      setShowSendModal(false);
      setSelectedFriend(null);
      setGiftAmount(0);
      setGiftMessage('');
      fetchGifts();
    } catch (error) {
      console.error('Error sending gift:', error);
      toast.error('Failed to send gift');
    }
  };

  const claimGift = async (gift: GiftTransaction) => {
    if (!profile) return;

    try {
      // Update gift as claimed
      await supabase
        .from('gift_transactions')
        .update({
          is_claimed: true,
          claimed_at: new Date().toISOString()
        })
        .eq('id', gift.id);

      // Add tokens to recipient
      await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) + gift.amount })
        .eq('id', profile.id);

      toast.success(`Claimed ${gift.amount} tokens! 💰`);
      fetchGifts();
    } catch (error) {
      console.error('Error claiming gift:', error);
      toast.error('Failed to claim gift');
    }
  };

  const declineGift = async (giftId: string) => {
    try {
      await supabase
        .from('gift_transactions')
        .delete()
        .eq('id', giftId);

      toast.success('Gift declined');
      fetchGifts();
    } catch (error) {
      console.error('Error declining gift:', error);
      toast.error('Failed to decline gift');
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-pink-500" />
            Friend Gifting
          </h2>
          <p className="text-sm text-gray-400 mt-1">Send tokens to your friends</p>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2"
        >
          <Send className="w-5 h-5" />
          Send Gift
        </button>
      </div>

      {/* Received Gifts */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Package className="w-5 h-5 text-green-500" />
          Received Gifts
        </h3>
        {receivedGifts.filter(g => !g.is_claimed).length === 0 ? (
          <div className="text-center py-8 bg-[#0f0f0f] rounded-lg">
            <Gift className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 text-sm">No unclaimed gifts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {receivedGifts.filter(g => !g.is_claimed).map((gift) => (
              <div
                key={gift.id}
                className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white font-bold mb-1">
                      {gift.sender?.username} sent you {gift.amount} tokens! 🎁
                    </p>
                    {gift.message && (
                      <p className="text-sm text-gray-400 italic">"{gift.message}"</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(gift.sent_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => claimGift(gift)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Claim
                    </button>
                    <button
                      onClick={() => declineGift(gift.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent Gifts */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-500" />
          Sent Gifts
        </h3>
        {sentGifts.length === 0 ? (
          <div className="text-center py-8 bg-[#0f0f0f] rounded-lg">
            <Send className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 text-sm">No gifts sent yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sentGifts.map((gift) => (
              <div
                key={gift.id}
                className="bg-[#0f0f0f] rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="text-white text-sm">
                    Sent {gift.amount} tokens to{' '}
                    <span className="font-bold">{gift.recipient?.username}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(gift.sent_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-xs">
                  {gift.is_claimed ? (
                    <span className="text-green-500 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Claimed
                    </span>
                  ) : (
                    <span className="text-yellow-500 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Gift Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-8 max-w-lg w-full border border-[#202225]">
            <h2 className="text-2xl font-bold text-white mb-6">Send a Gift</h2>

            {/* Select Friend */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Friend
              </label>
              {loading ? (
                <div className="h-12 bg-[#0f0f0f] rounded-lg animate-pulse"></div>
              ) : friends.length === 0 ? (
                <p className="text-gray-400 text-sm">You have no friends yet</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {friends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => setSelectedFriend(friend)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedFriend?.id === friend.id
                          ? 'bg-[#8B5CF6] text-white'
                          : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#202225]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-sm font-bold text-white">
                        {friend.profiles?.username?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold">{friend.profiles?.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (Tokens)
              </label>
              <input
                type="number"
                value={giftAmount || ''}
                onChange={(e) => setGiftAmount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                placeholder="Enter amount"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: {profile?.token_balance || 0} tokens
              </p>
            </div>

            {/* Message */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                placeholder="Add a personal message..."
                rows={3}
                maxLength={200}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={sendGift}
                disabled={!selectedFriend || giftAmount <= 0}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all"
              >
                Send Gift
              </button>
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSelectedFriend(null);
                  setGiftAmount(0);
                  setGiftMessage('');
                }}
                className="px-6 py-3 bg-[#0f0f0f] text-gray-400 rounded-xl font-semibold hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

