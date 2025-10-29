import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Gavel, Clock, TrendingUp, Star, Eye, Heart, DollarSign,
  AlertCircle, CheckCircle, X, Coins, Timer, Zap, Trophy, Plus
} from 'lucide-react';
import { toast } from '../components/Toast';
import { formatTokens } from '../utils/formatTokens';

interface Auction {
  id: string;
  item_id: string;
  seller_id: string;
  starting_bid: number;
  current_bid: number;
  highest_bidder_id?: string;
  buyout_price?: number;
  bid_increment: number;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  marketplace_items: {
    item_name: string;
    item_description: string;
    item_type: string;
    item_rarity?: string;
    images: string[];
    game_name: string;
  };
  seller: {
    username: string;
  };
  highest_bidder?: {
    username: string;
  };
  bid_count?: number;
}

export default function AuctionHouse() {
  const { profile } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [bidAmount, setBidAmount] = useState(0);
  const [autoBidMax, setAutoBidMax] = useState(0);
  const [showAutoBid, setShowAutoBid] = useState(false);

  useEffect(() => {
    fetchAuctions();
    
    // Subscribe to real-time auction updates
    const channel = supabase
      .channel('auctions_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_auctions'
        },
        () => {
          fetchAuctions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_auctions')
        .select(`
          *,
          marketplace_items(item_name, item_description, item_type, item_rarity, images, game_name),
          seller:profiles!marketplace_auctions_seller_id_fkey(username),
          highest_bidder:profiles!marketplace_auctions_highest_bidder_id_fkey(username)
        `)
        .eq('status', 'active')
        .order('end_time', { ascending: true });

      if (error) throw error;

      // Get bid counts for each auction
      const auctionsWithBidCounts = await Promise.all(
        (data || []).map(async (auction) => {
          const { count } = await supabase
            .from('auction_bids')
            .select('*', { count: 'exact', head: true })
            .eq('auction_id', auction.id);

          return { ...auction, bid_count: count || 0 };
        })
      );

      setAuctions(auctionsWithBidCounts);
    } catch (error) {
      console.error('Error fetching auctions:', error);
      toast.error('Failed to load auctions');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (auctionId: string, amount: number) => {
    if (!profile) {
      toast.error('Please log in to place bids');
      return;
    }

    const auction = auctions.find(a => a.id === auctionId);
    if (!auction) return;

    // Validation
    if (amount < auction.current_bid + auction.bid_increment) {
      toast.error(`Minimum bid is ${formatTokens(auction.current_bid + auction.bid_increment)}`);
      return;
    }

    if ((profile.token_balance || 0) < amount) {
      toast.error('Insufficient tokens');
      return;
    }

    if (auction.highest_bidder_id === profile.id) {
      toast.error('You are already the highest bidder');
      return;
    }

    try {
      // Create bid
      const { error: bidError } = await supabase
        .from('auction_bids')
        .insert([{
          auction_id: auctionId,
          bidder_id: profile.id,
          bid_amount: amount
        }]);

      if (bidError) throw bidError;

      // Update auction
      const { error: auctionError } = await supabase
        .from('marketplace_auctions')
        .update({
          current_bid: amount,
          highest_bidder_id: profile.id
        })
        .eq('id', auctionId);

      if (auctionError) throw auctionError;

      // Notify previous highest bidder
      if (auction.highest_bidder_id && auction.highest_bidder_id !== profile.id) {
        await supabase
          .from('notifications')
          .insert([{
            user_id: auction.highest_bidder_id,
            title: 'Outbid!',
            message: `You were outbid on ${auction.marketplace_items.item_name}`,
            type: 'marketplace'
          }]);
      }

      toast.success('Bid placed successfully!');
      setBidAmount(0);
      fetchAuctions();
    } catch (error) {
      console.error('Error placing bid:', error);
      toast.error('Failed to place bid');
    }
  };

  const handleBuyNow = async (auction: Auction) => {
    if (!profile) {
      toast.error('Please log in to buy');
      return;
    }

    if (!auction.buyout_price) return;

    if ((profile.token_balance || 0) < auction.buyout_price) {
      toast.error('Insufficient tokens');
      return;
    }

    try {
      // End auction immediately
      const { error: auctionError } = await supabase
        .from('marketplace_auctions')
        .update({
          status: 'completed',
          current_bid: auction.buyout_price,
          highest_bidder_id: profile.id
        })
        .eq('id', auction.id);

      if (auctionError) throw auctionError;

      // Create transaction
      const platformFee = Math.round(auction.buyout_price * 0.05);
      const sellerReceives = auction.buyout_price - platformFee;

      await supabase
        .from('marketplace_transactions')
        .insert([{
          item_id: auction.item_id,
          seller_id: auction.seller_id,
          buyer_id: profile.id,
          price_tokens: auction.buyout_price,
          platform_fee: platformFee,
          seller_receives: sellerReceives,
          transaction_status: 'completed'
        }]);

      // Deduct tokens from buyer
      await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - auction.buyout_price })
        .eq('id', profile.id);

      // Add tokens to seller
      await supabase.rpc('add_tokens', { 
        user_id: auction.seller_id, 
        amount: sellerReceives 
      });

      toast.success('Purchase successful!');
      setShowDetailsModal(false);
      fetchAuctions();
    } catch (error) {
      console.error('Error buying:', error);
      toast.error('Failed to complete purchase');
    }
  };

  const getRarityColor = (rarity?: string) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-green-400';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-orange-400';
      case 'mythic': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff < 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <div className="h-full w-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Gavel className="w-8 h-8 text-[#8B5CF6]" />
            Auction House
          </h1>
          <p className="text-gray-400">Bid on exclusive items or buy instantly</p>
        </div>
      </div>

      {/* Auctions Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#1a1a1a] rounded-xl h-80"></div>
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-16">
          <Gavel className="w-24 h-24 mx-auto mb-4 text-gray-600" />
          <h3 className="text-2xl font-bold text-white mb-2">No Active Auctions</h3>
          <p className="text-gray-400">Check back later for new auctions!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {auctions.map((auction) => (
            <div
              key={auction.id}
              className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#202225] hover:border-[#8B5CF6] transition-all cursor-pointer group"
              onClick={() => {
                setSelectedAuction(auction);
                setBidAmount(auction.current_bid + auction.bid_increment);
                setShowDetailsModal(true);
              }}
            >
              {/* Item Image */}
              <div className="aspect-square bg-gradient-to-br from-[#8B5CF6]/20 to-[#0f0f0f] flex items-center justify-center relative overflow-hidden">
                {auction.marketplace_items.images && auction.marketplace_items.images.length > 0 ? (
                  <img 
                    src={auction.marketplace_items.images[0]} 
                    alt={auction.marketplace_items.item_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Gavel className="w-24 h-24 text-gray-600" />
                )}

                {/* Time Remaining Badge */}
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 font-bold">
                  <Timer className="w-3 h-3 animate-pulse" />
                  {getTimeRemaining(auction.end_time)}
                </div>

                {/* Bid Count */}
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                  {auction.bid_count} {auction.bid_count === 1 ? 'bid' : 'bids'}
                </div>

                {/* Buy Now Badge */}
                {auction.buyout_price && (
                  <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-bold">
                    BUY NOW
                  </div>
                )}
              </div>

              {/* Auction Info */}
              <div className="p-4">
                {/* Game & Type */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400">{auction.marketplace_items.game_name}</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-400 capitalize">{auction.marketplace_items.item_type}</span>
                </div>

                {/* Item Name */}
                <h3 className="text-white font-bold mb-1 line-clamp-1 group-hover:text-[#8B5CF6] transition-colors">
                  {auction.marketplace_items.item_name}
                </h3>

                {/* Rarity */}
                {auction.marketplace_items.item_rarity && (
                  <p className={`text-sm font-semibold mb-3 capitalize ${getRarityColor(auction.marketplace_items.item_rarity)}`}>
                    {auction.marketplace_items.item_rarity}
                  </p>
                )}

                {/* Current Bid */}
                <div className="bg-[#0f0f0f] rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-500 mb-1">Current Bid</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold text-yellow-500 flex items-center gap-1">
                      <Coins className="w-5 h-5" />
                      {formatTokens(auction.current_bid)}
                    </p>
                    {auction.highest_bidder_id === profile?.id && (
                      <span className="text-xs bg-green-500 text-white px-2 py-1 rounded font-semibold">
                        Winning
                      </span>
                    )}
                  </div>
                </div>

                {/* Buyout Price */}
                {auction.buyout_price && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Buy Now:</span>
                    <span className="text-green-500 font-bold">{formatTokens(auction.buyout_price)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auction Details Modal */}
      {showDetailsModal && selectedAuction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#202225]">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedAuction.marketplace_items.item_name}</h3>
                <p className="text-gray-400 text-sm">Auction ends in {getTimeRemaining(selectedAuction.end_time)}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-[#2f3136] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image */}
                <div className="aspect-square bg-gradient-to-br from-[#8B5CF6]/20 to-[#0f0f0f] rounded-xl flex items-center justify-center overflow-hidden">
                  {selectedAuction.marketplace_items.images && selectedAuction.marketplace_items.images.length > 0 ? (
                    <img 
                      src={selectedAuction.marketplace_items.images[0]} 
                      alt={selectedAuction.marketplace_items.item_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Gavel className="w-32 h-32 text-gray-600" />
                  )}
                </div>

                {/* Bidding Section */}
                <div className="space-y-4">
                  {/* Current Bid */}
                  <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#202225]">
                    <p className="text-sm text-gray-400 mb-2">Current Bid</p>
                    <p className="text-3xl font-bold text-yellow-500 flex items-center gap-2">
                      <Coins className="w-8 h-8" />
                      {formatTokens(selectedAuction.current_bid)}
                    </p>
                    {selectedAuction.highest_bidder && (
                      <p className="text-sm text-gray-400 mt-2">
                        by {selectedAuction.highest_bidder.username}
                      </p>
                    )}
                  </div>

                  {/* Place Bid */}
                  {selectedAuction.seller_id !== profile?.id && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Your Bid (min: {formatTokens(selectedAuction.current_bid + selectedAuction.bid_increment)})</label>
                        <input
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                          min={selectedAuction.current_bid + selectedAuction.bid_increment}
                          className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={() => handlePlaceBid(selectedAuction.id, bidAmount)}
                        disabled={bidAmount < selectedAuction.current_bid + selectedAuction.bid_increment}
                        className="w-full px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Gavel className="w-5 h-5" />
                        Place Bid
                      </button>

                      {selectedAuction.buyout_price && (
                        <button
                          onClick={() => handleBuyNow(selectedAuction)}
                          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <Zap className="w-5 h-5" />
                          Buy Now for {formatTokens(selectedAuction.buyout_price)}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Auction Info */}
                  <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#202225] text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Seller:</span>
                      <span className="text-white font-semibold">{selectedAuction.seller.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bids:</span>
                      <span className="text-white font-semibold">{selectedAuction.bid_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time Left:</span>
                      <span className="text-white font-semibold">{getTimeRemaining(selectedAuction.end_time)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h4 className="text-white font-bold mb-2">Description</h4>
                <p className="text-gray-400 text-sm">{selectedAuction.marketplace_items.item_description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

