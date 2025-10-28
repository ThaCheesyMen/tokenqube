import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Gavel, Clock, TrendingUp, Tag, CheckCircle } from 'lucide-react';
import { toast } from './Toast';

interface Auction {
  id: string;
  item_id: string;
  seller_id: string;
  start_price: number;
  current_bid: number;
  buy_now_price: number | null;
  start_time: string;
  end_time: string;
  status: string;
  winner_id: string | null;
  marketplace_items?: {
    item_name: string;
    description: string;
    item_type: string;
    image_url: string | null;
  };
  seller?: {
    username: string;
  };
  bid_count?: number;
}

export default function AuctionHouse() {
  const { profile } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAuctions();
    const interval = setInterval(fetchAuctions, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchAuctions = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_auctions')
        .select(`
          *,
          marketplace_items (item_name, description, item_type, image_url),
          seller:profiles!seller_id (username)
        `)
        .eq('status', 'active')
        .gte('end_time', new Date().toISOString())
        .order('end_time', { ascending: true });

      if (error) throw error;

      // Get bid counts
      const auctionsWithCounts = await Promise.all(
        (data || []).map(async (auction) => {
          const { count } = await supabase
            .from('auction_bids')
            .select('*', { count: 'exact', head: true })
            .eq('auction_id', auction.id);

          return { ...auction, bid_count: count || 0 };
        })
      );

      setAuctions(auctionsWithCounts);
    } catch (error) {
      console.error('Error fetching auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const placeBid = async (auctionId: string, minBid: number) => {
    if (!profile) return;

    const amount = bidAmount[auctionId];
    if (!amount || amount < minBid) {
      toast.error(`Minimum bid is ${minBid} tokens`);
      return;
    }

    if (amount > (profile.token_balance || 0)) {
      toast.error('Insufficient tokens!');
      return;
    }

    try {
      // Insert bid
      const { error: bidError } = await supabase
        .from('auction_bids')
        .insert({
          auction_id: auctionId,
          bidder_id: profile.id,
          bid_amount: amount
        });

      if (bidError) throw bidError;

      // Update auction
      const { error: auctionError } = await supabase
        .from('marketplace_auctions')
        .update({ current_bid: amount })
        .eq('id', auctionId);

      if (auctionError) throw auctionError;

      toast.success('Bid placed successfully! 🎉');
      setBidAmount({ ...bidAmount, [auctionId]: 0 });
      fetchAuctions();
    } catch (error: any) {
      console.error('Error placing bid:', error);
      toast.error(error.message || 'Failed to place bid');
    }
  };

  const buyNow = async (auctionId: string, price: number) => {
    if (!profile) return;

    if (price > (profile.token_balance || 0)) {
      toast.error('Insufficient tokens!');
      return;
    }

    try {
      // Get auction details
      const { data: auction } = await supabase
        .from('marketplace_auctions')
        .select('*, marketplace_items (item_name)')
        .eq('id', auctionId)
        .single();

      if (!auction) throw new Error('Auction not found');

      // Update auction status
      const { error: auctionError } = await supabase
        .from('marketplace_auctions')
        .update({
          status: 'completed',
          winner_id: profile.id,
          final_price: price
        })
        .eq('id', auctionId);

      if (auctionError) throw auctionError;

      // Deduct tokens from buyer
      const { error: buyerError } = await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - price })
        .eq('id', profile.id);

      if (buyerError) throw buyerError;

      // Add tokens to seller
      const { error: sellerError } = await supabase.rpc('add_tokens', {
        p_user_id: auction.seller_id,
        p_amount: price
      });

      if (sellerError) throw sellerError;

      // Transfer item ownership
      const { error: itemError } = await supabase
        .from('user_inventory')
        .insert({
          user_id: profile.id,
          item_id: auction.item_id,
          quantity: 1
        });

      if (itemError) throw itemError;

      toast.success(`You bought ${auction.marketplace_items?.item_name}! 🎉`);
      fetchAuctions();
    } catch (error: any) {
      console.error('Error buying item:', error);
      toast.error(error.message || 'Failed to purchase');
    }
  };

  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gavel className="w-6 h-6 text-yellow-500" />
          Live Auctions
        </h2>
        <p className="text-sm text-gray-400">{auctions.length} active</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#0f0f0f] rounded-xl h-48"></div>
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-12">
          <Gavel className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No active auctions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {auctions.map((auction) => {
            const minBid = auction.current_bid > 0 
              ? auction.current_bid + 10 
              : auction.start_price;

            return (
              <div
                key={auction.id}
                className="bg-[#0f0f0f] rounded-xl p-4 border border-[#202225] hover:border-[#8B5CF6] transition-all"
              >
                {/* Item Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-16 h-16 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                    {auction.marketplace_items?.image_url ? (
                      <img
                        src={auction.marketplace_items.image_url}
                        alt={auction.marketplace_items.item_name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Tag className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold line-clamp-1">
                      {auction.marketplace_items?.item_name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      by {auction.seller?.username}
                    </p>
                  </div>
                </div>

                {/* Price Info */}
                <div className="bg-[#1a1a1a] rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Current Bid</span>
                    <span className="text-xl font-bold text-white">
                      {auction.current_bid > 0 ? auction.current_bid : auction.start_price} 🪙
                    </span>
                  </div>
                  {auction.buy_now_price && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Buy Now</span>
                      <span className="text-lg font-bold text-green-500">
                        {auction.buy_now_price} 🪙
                      </span>
                    </div>
                  )}
                </div>

                {/* Time & Bids */}
                <div className="flex items-center justify-between mb-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{getTimeRemaining(auction.end_time)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <TrendingUp className="w-4 h-4" />
                    <span>{auction.bid_count} bids</span>
                  </div>
                </div>

                {/* Actions */}
                {auction.seller_id === profile?.id ? (
                  <div className="bg-blue-500/10 text-blue-500 py-2 px-4 rounded-lg text-sm font-semibold text-center">
                    Your Auction
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={bidAmount[auction.id] || ''}
                        onChange={(e) => setBidAmount({
                          ...bidAmount,
                          [auction.id]: parseInt(e.target.value) || 0
                        })}
                        placeholder={`Min: ${minBid}`}
                        className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#202225] rounded-lg text-white text-sm focus:border-[#8B5CF6] focus:outline-none"
                      />
                      <button
                        onClick={() => placeBid(auction.id, minBid)}
                        className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Bid
                      </button>
                    </div>
                    {auction.buy_now_price && (
                      <button
                        onClick={() => buyNow(auction.id, auction.buy_now_price!)}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Buy Now - {auction.buy_now_price} 🪙
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

