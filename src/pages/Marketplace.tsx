import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ShoppingBag, Plus, Search, Filter, TrendingUp, Star, 
  Heart, Eye, Tag, DollarSign, Shield, Package, Clock,
  AlertCircle, CheckCircle, X, Coins, Grid, List, ChevronDown,
  Sparkles, Award, MessageSquare, ExternalLink, Image as ImageIcon,
  Gavel, ArrowLeftRight, Timer
} from 'lucide-react';
import { toast } from '../components/Toast';
import { formatTokens } from '../utils/formatTokens';
import MarketplaceImageUpload from '../components/MarketplaceImageUpload';
import TradeSystem from '../components/TradeSystem';
import AuctionHouseIntegrated from '../components/AuctionHouseIntegrated';

interface MarketplaceItem {
  id: string;
  seller_id: string;
  game_name: string;
  item_name: string;
  item_description: string;
  item_type: string;
  item_rarity?: string;
  price_tokens: number;
  price_usd?: number;
  quantity: number;
  images: string[];
  condition: string;
  platform: string;
  is_verified: boolean;
  status: string;
  views: number;
  favorites: number;
  created_at: string;
  seller?: {
    username: string;
    avatar_url?: string;
    user_marketplace_stats?: Array<{
      average_rating: number;
      total_reviews: number;
      verified_seller: boolean;
      seller_tier: string;
    }>;
  };
  is_favorited?: boolean;
}

interface MarketplaceFilters {
  search: string;
  game: string;
  itemType: string;
  minPrice: number;
  maxPrice: number;
  condition: string;
  platform: string;
  rarity: string;
  sortBy: 'newest' | 'price_low' | 'price_high' | 'popular';
}

export default function Marketplace() {
  const { profile } = useAuth();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [marketMode, setMarketMode] = useState<'marketplace' | 'auctions' | 'trades'>('marketplace');
  const [showTradeModal, setShowTradeModal] = useState(false);
  
  const [filters, setFilters] = useState<MarketplaceFilters>({
    search: '',
    game: 'all',
    itemType: 'all',
    minPrice: 0,
    maxPrice: 1000000,
    condition: 'all',
    platform: 'all',
    rarity: 'all',
    sortBy: 'newest'
  });

  const [newItem, setNewItem] = useState({
    game_name: '',
    item_name: '',
    item_description: '',
    item_type: 'skin',
    item_rarity: '',
    price_tokens: 100,
    quantity: 1,
    condition: 'new',
    platform: 'pc',
    images: [] as string[]
  });

  useEffect(() => {
    fetchItems();
  }, [filters]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('marketplace_items')
        .select(`
          *,
          seller:profiles!marketplace_items_seller_id_fkey(
            username, 
            avatar_url,
            user_marketplace_stats(average_rating, total_reviews, verified_seller, seller_tier)
          )
        `)
        .eq('status', 'active');

      // Apply filters
      if (filters.search) {
        query = query.or(`item_name.ilike.%${filters.search}%,item_description.ilike.%${filters.search}%,game_name.ilike.%${filters.search}%`);
      }
      if (filters.game !== 'all') {
        query = query.eq('game_name', filters.game);
      }
      if (filters.itemType !== 'all') {
        query = query.eq('item_type', filters.itemType);
      }
      if (filters.condition !== 'all') {
        query = query.eq('condition', filters.condition);
      }
      if (filters.platform !== 'all') {
        query = query.eq('platform', filters.platform);
      }
      if (filters.rarity !== 'all') {
        query = query.eq('item_rarity', filters.rarity);
      }
      
      query = query
        .gte('price_tokens', filters.minPrice)
        .lte('price_tokens', filters.maxPrice);

      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'price_low':
          query = query.order('price_tokens', { ascending: true });
          break;
        case 'price_high':
          query = query.order('price_tokens', { ascending: false });
          break;
        case 'popular':
          query = query.order('views', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Check which items are favorited by current user
      if (profile && data) {
        const { data: favorites } = await supabase
          .from('marketplace_favorites')
          .select('item_id')
          .eq('user_id', profile.id);

        const favIds = new Set(favorites?.map(f => f.item_id) || []);
        
        setItems(data.map(item => ({
          ...item,
          is_favorited: favIds.has(item.id)
        })));
      } else {
        setItems(data || []);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async () => {
    if (!profile) {
      toast.error('Please log in to sell items');
      return;
    }

    if (!newItem.game_name || !newItem.item_name || !newItem.item_description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newItem.price_tokens < 10) {
      toast.error('Minimum price is 10 tokens');
      return;
    }

    try {
      const { error } = await supabase
        .from('marketplace_items')
        .insert([{
          seller_id: profile.id,
          ...newItem
        }]);

      if (error) throw error;

      toast.success('Item listed successfully!');
      setShowCreateModal(false);
      fetchItems();
      
      // Reset form
      setNewItem({
        game_name: '',
        item_name: '',
        item_description: '',
        item_type: 'skin',
        item_rarity: '',
        price_tokens: 100,
        quantity: 1,
        condition: 'new',
        platform: 'pc',
        images: []
      });
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to list item');
    }
  };

  const toggleFavorite = async (itemId: string, currentState: boolean) => {
    if (!profile) {
      toast.error('Please log in to favorite items');
      return;
    }

    try {
      if (currentState) {
        await supabase
          .from('marketplace_favorites')
          .delete()
          .eq('user_id', profile.id)
          .eq('item_id', itemId);
      } else {
        await supabase
          .from('marketplace_favorites')
          .insert([{ user_id: profile.id, item_id: itemId }]);
      }

      // Update local state
      setItems(items.map(item => 
        item.id === itemId 
          ? { ...item, is_favorited: !currentState, favorites: item.favorites + (currentState ? -1 : 1) }
          : item
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleViewItem = async (item: MarketplaceItem) => {
    setSelectedItem(item);
    setShowDetailsModal(true);

    // Increment view count
    await supabase
      .from('marketplace_items')
      .update({ views: item.views + 1 })
      .eq('id', item.id);
  };

  const handlePurchase = async (item: MarketplaceItem) => {
    if (!profile) {
      toast.error('Please log in to purchase items');
      return;
    }

    if (item.seller_id === profile.id) {
      toast.error('You cannot buy your own items');
      return;
    }

    if ((profile.token_balance || 0) < item.price_tokens) {
      toast.error('Insufficient tokens');
      return;
    }

    // Calculate fees based on user's subscription tier
    const feePercent = profile.subscription_tier === 'elite' ? 0.01 
                     : profile.subscription_tier === 'pro' ? 0.03 
                     : 0.07;
    
    const platformFee = Math.round(item.price_tokens * feePercent);
    const sellerReceives = item.price_tokens - platformFee;

    try {
      // Create escrow transaction
      const { data: transaction, error: txError } = await supabase
        .from('marketplace_transactions')
        .insert([{
          item_id: item.id,
          seller_id: item.seller_id,
          buyer_id: profile.id,
          price_tokens: item.price_tokens,
          platform_fee: platformFee,
          seller_receives: sellerReceives,
          transaction_status: 'pending',
          delivery_status: 'pending'
        }])
        .select()
        .single();

      if (txError) throw txError;

      // Create escrow entry
      const { error: escrowError } = await supabase
        .from('marketplace_escrow')
        .insert([{
          transaction_id: transaction.id,
          buyer_id: profile.id,
          seller_id: item.seller_id,
          item_id: item.id,
          amount: item.price_tokens,
          status: 'funded',
          funded_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }]);

      if (escrowError) throw escrowError;

      // Deduct tokens from buyer (held in escrow)
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - item.price_tokens })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      // Update item status
      await supabase
        .from('marketplace_items')
        .update({ 
          status: 'sold',
          quantity: item.quantity - 1
        })
        .eq('id', item.id);

      // Create notification for seller
      await supabase
        .from('notifications')
        .insert([{
          user_id: item.seller_id,
          title: 'Item Sold!',
          message: `Your ${item.item_name} was purchased for ${formatTokens(item.price_tokens)}`,
          type: 'marketplace',
          data: { transaction_id: transaction.id, item_id: item.id }
        }]);

      toast.success('Purchase successful! Item will be delivered to you.');
      setShowDetailsModal(false);
      fetchItems();
    } catch (error) {
      console.error('Error purchasing item:', error);
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

  const getTierBadge = (tier: string) => {
    const badges: Record<string, { color: string; icon: any }> = {
      bronze: { color: 'from-orange-700 to-orange-900', icon: Award },
      silver: { color: 'from-gray-400 to-gray-600', icon: Award },
      gold: { color: 'from-yellow-500 to-yellow-700', icon: Award },
      platinum: { color: 'from-cyan-400 to-cyan-600', icon: Sparkles },
      diamond: { color: 'from-blue-400 to-purple-600', icon: Sparkles }
    };
    return badges[tier] || badges.bronze;
  };

  return (
    <div className="h-full w-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#8B5CF6]" />
            Marketplace
          </h1>
          <p className="text-gray-400">Buy and sell gaming items securely</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTradeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] hover:bg-[#2f3136] text-white rounded-lg font-semibold transition-colors border border-[#202225]"
          >
            <ArrowLeftRight className="w-5 h-5" />
            Trade
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-all transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            List Item
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#202225] pb-2">
        <button
          onClick={() => setMarketMode('marketplace')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all rounded-t-lg ${
            marketMode === 'marketplace'
              ? 'bg-[#8B5CF6] text-white'
              : 'text-gray-400 hover:text-gray-300 hover:bg-[#1a1a1a]'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          Marketplace
        </button>
        <button
          onClick={() => setMarketMode('auctions')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all rounded-t-lg ${
            marketMode === 'auctions'
              ? 'bg-[#8B5CF6] text-white'
              : 'text-gray-400 hover:text-gray-300 hover:bg-[#1a1a1a]'
          }`}
        >
          <Gavel className="w-5 h-5" />
          Auctions
        </button>
        <button
          onClick={() => setMarketMode('trades')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all rounded-t-lg ${
            marketMode === 'trades'
              ? 'bg-[#8B5CF6] text-white'
              : 'text-gray-400 hover:text-gray-300 hover:bg-[#1a1a1a]'
          }`}
        >
          <ArrowLeftRight className="w-5 h-5" />
          Trades
        </button>
      </div>

      {/* Filters Bar (only for marketplace) */}
      {marketMode === 'marketplace' && (
        <>
        <div className="bg-[#1a1a1a] rounded-xl p-4 mb-6 border border-[#202225]">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search items, games..."
                className="w-full pl-10 pr-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
            className="px-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="popular">Most Popular</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#8B5CF6] text-white' : 'bg-[#0f0f0f] text-gray-400'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#8B5CF6] text-white' : 'bg-[#0f0f0f] text-gray-400'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] hover:bg-[#2f3136] text-white rounded-lg transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-[#202225] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <select
              value={filters.itemType}
              onChange={(e) => setFilters({ ...filters, itemType: e.target.value })}
              className="px-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="skin">Skins</option>
              <option value="weapon">Weapons</option>
              <option value="currency">Currency</option>
              <option value="account">Accounts</option>
              <option value="cosmetic">Cosmetics</option>
              <option value="item">Items</option>
            </select>

            <select
              value={filters.condition}
              onChange={(e) => setFilters({ ...filters, condition: e.target.value })}
              className="px-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value="all">All Conditions</option>
              <option value="new">New</option>
              <option value="like_new">Like New</option>
              <option value="used">Used</option>
            </select>

            <select
              value={filters.rarity}
              onChange={(e) => setFilters({ ...filters, rarity: e.target.value })}
              className="px-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
              <option value="mythic">Mythic</option>
            </select>

            <select
              value={filters.platform}
              onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
              className="px-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value="all">All Platforms</option>
              <option value="pc">PC</option>
              <option value="playstation">PlayStation</option>
              <option value="xbox">Xbox</option>
              <option value="switch">Nintendo Switch</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
        )}
      </div>

      {/* Items Grid/List (only for marketplace mode) */}
      {marketMode === 'marketplace' && loading ? (
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-4`}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#1a1a1a] rounded-xl h-64"></div>
          ))}
        </div>
      ) : marketMode === 'marketplace' && items.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-24 h-24 mx-auto mb-4 text-gray-600" />
          <h3 className="text-2xl font-bold text-white mb-2">No Items Found</h3>
          <p className="text-gray-400 mb-6">Try adjusting your filters or be the first to list an item!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
          >
            List Your First Item
          </button>
        </div>
      ) : marketMode === 'marketplace' && viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#202225] hover:border-[#8B5CF6] transition-all cursor-pointer group"
              onClick={() => handleViewItem(item)}
            >
              {/* Item Image */}
              <div className="aspect-square bg-gradient-to-br from-[#8B5CF6]/20 to-[#0f0f0f] flex items-center justify-center relative overflow-hidden">
                {item.images && item.images.length > 0 ? (
                  <img 
                    src={item.images[0]} 
                    alt={item.item_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-24 h-24 text-gray-600" />
                )}
                
                {/* Verified Badge */}
                {item.is_verified && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Verified
                  </div>
                )}

                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id, item.is_favorited || false);
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                >
                  <Heart className={`w-5 h-5 ${item.is_favorited ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </button>

                {/* Quick Stats */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white">
                  <span className="bg-black/50 px-2 py-1 rounded flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {item.views}
                  </span>
                  <span className="bg-black/50 px-2 py-1 rounded flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {item.favorites}
                  </span>
                </div>
              </div>

              {/* Item Info */}
              <div className="p-4">
                {/* Game & Type */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400">{item.game_name}</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-400 capitalize">{item.item_type}</span>
                </div>

                {/* Item Name */}
                <h3 className="text-white font-bold mb-1 line-clamp-1 group-hover:text-[#8B5CF6] transition-colors">
                  {item.item_name}
                </h3>

                {/* Rarity */}
                {item.item_rarity && (
                  <p className={`text-sm font-semibold mb-2 capitalize ${getRarityColor(item.item_rarity)}`}>
                    {item.item_rarity}
                  </p>
                )}

                {/* Seller Info */}
                  <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-[#8B5CF6] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {item.seller?.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-400">{item.seller?.username}</span>
                  {item.seller?.user_marketplace_stats?.[0]?.verified_seller && (
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  )}
                </div>

                {/* Price */}
                <div className="flex items-center justify-between pt-3 border-t border-[#202225]">
                  <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="text-xl font-bold text-yellow-500 flex items-center gap-1">
                      <Coins className="w-5 h-5" />
                      {formatTokens(item.price_tokens)}
                    </p>
                  </div>
                  {item.seller?.user_marketplace_stats?.[0] && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-yellow-500" />
                        <span className="font-semibold">
                          {item.seller.user_marketplace_stats[0].average_rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        ({item.seller.user_marketplace_stats[0].total_reviews} reviews)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : marketMode === 'marketplace' ? (
        // List View
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-[#1a1a1a] rounded-xl p-4 border border-[#202225] hover:border-[#8B5CF6] transition-all cursor-pointer"
              onClick={() => handleViewItem(item)}
            >
              <div className="flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-24 h-24 bg-gradient-to-br from-[#8B5CF6]/20 to-[#0f0f0f] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.images && item.images.length > 0 ? (
                    <img 
                      src={item.images[0]} 
                      alt={item.item_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-gray-600" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-white font-bold mb-1">{item.item_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{item.game_name}</span>
                        <span>•</span>
                        <span className="capitalize">{item.item_type}</span>
                        {item.item_rarity && (
                          <>
                            <span>•</span>
                            <span className={`capitalize font-semibold ${getRarityColor(item.item_rarity)}`}>
                              {item.item_rarity}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id, item.is_favorited || false);
                      }}
                      className="p-2 hover:bg-[#2f3136] rounded-lg transition-colors"
                    >
                      <Heart className={`w-5 h-5 ${item.is_favorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                    </button>
                  </div>

                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">{item.item_description}</p>

                  <div className="flex items-center justify-between">
                    {/* Seller */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#8B5CF6] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {item.seller?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-white">{item.seller?.username}</p>
                        {item.seller?.user_marketplace_stats?.[0] && (
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-gray-400">
                              {item.seller.user_marketplace_stats[0].average_rating.toFixed(1)} ({item.seller.user_marketplace_stats[0].total_reviews})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price & Stats */}
                    <div className="flex items-center gap-6">
                      <div className="text-sm text-gray-400 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {item.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {item.favorites}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-yellow-500 flex items-center gap-1">
                          <Coins className="w-6 h-6" />
                          {formatTokens(item.price_tokens)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
        </>
      )}

      {/* Auctions Tab */}
      {marketMode === 'auctions' && (
        <AuctionHouseIntegrated />
      )}

      {/* Trades Tab */}
      {marketMode === 'trades' && (
        <TradeSystem />
      )}

      {/* Trade Modal */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowTradeModal(false)}>
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <TradeSystem onClose={() => setShowTradeModal(false)} />
          </div>
        </div>
      )}

      {/* Create Item Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#202225]">
              <h3 className="text-xl font-bold text-white">List New Item</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-[#2f3136] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Game Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Game *
                </label>
                <input
                  type="text"
                  value={newItem.game_name}
                  onChange={(e) => setNewItem({ ...newItem, game_name: e.target.value })}
                  placeholder="e.g., Fortnite, CS:GO, Valorant"
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  required
                />
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItem.item_name}
                  onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                  placeholder="e.g., Legendary Dragon Skin"
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Description *
                </label>
                <textarea
                  value={newItem.item_description}
                  onChange={(e) => setNewItem({ ...newItem, item_description: e.target.value })}
                  placeholder="Describe your item..."
                  rows={4}
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none resize-none"
                  required
                />
              </div>

              {/* Type & Rarity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Type *
                  </label>
                  <select
                    value={newItem.item_type}
                    onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="skin">Skin</option>
                    <option value="weapon">Weapon</option>
                    <option value="currency">Currency</option>
                    <option value="account">Account</option>
                    <option value="cosmetic">Cosmetic</option>
                    <option value="item">Item</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Rarity
                  </label>
                  <select
                    value={newItem.item_rarity}
                    onChange={(e) => setNewItem({ ...newItem, item_rarity: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="">Select Rarity</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                    <option value="mythic">Mythic</option>
                  </select>
                </div>
              </div>

              {/* Price & Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Price (Tokens) *
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={newItem.price_tokens}
                    onChange={(e) => setNewItem({ ...newItem, price_tokens: parseInt(e.target.value) || 10 })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 10 tokens</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Condition & Platform */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Condition *
                  </label>
                  <select
                    value={newItem.condition}
                    onChange={(e) => setNewItem({ ...newItem, condition: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="new">New</option>
                    <option value="like_new">Like New</option>
                    <option value="used">Used</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Platform *
                  </label>
                  <select
                    value={newItem.platform}
                    onChange={(e) => setNewItem({ ...newItem, platform: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="pc">PC</option>
                    <option value="playstation">PlayStation</option>
                    <option value="xbox">Xbox</option>
                    <option value="switch">Nintendo Switch</option>
                    <option value="mobile">Mobile</option>
                    <option value="cross_platform">Cross-Platform</option>
                  </select>
                </div>
              </div>

              {/* Images Upload */}
              <MarketplaceImageUpload
                images={newItem.images}
                onChange={(images) => setNewItem({ ...newItem, images })}
                maxImages={5}
                useStorage={true}
              />

              {/* Fee Information */}
              <div className="bg-[#0f0f0f] border border-[#202225] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold mb-1">Platform Fees</p>
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-600">Free Users: 7% • </span>
                      <span className="text-blue-400">Pro: 3% • </span>
                      <span className="text-yellow-500">Elite: 1%</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      You will receive {formatTokens(Math.round(newItem.price_tokens * (profile?.subscription_tier === 'elite' ? 0.99 : profile?.subscription_tier === 'pro' ? 0.97 : 0.93)))} tokens after fees
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleCreateItem}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  List Item
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 bg-[#2f3136] hover:bg-[#36393f] text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      {showDetailsModal && selectedItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#202225]">
              <h3 className="text-2xl font-bold text-white">{selectedItem.item_name}</h3>
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
                {/* Left: Image Gallery */}
                <div>
                  <div className="aspect-square bg-gradient-to-br from-[#8B5CF6]/20 to-[#0f0f0f] rounded-xl flex items-center justify-center overflow-hidden mb-4">
                    {selectedItem.images && selectedItem.images.length > 0 ? (
                      <img 
                        src={selectedItem.images[0]} 
                        alt={selectedItem.item_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-32 h-32 text-gray-600" />
                    )}
                  </div>

                  {/* Item Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#0f0f0f] rounded-lg p-3 text-center">
                      <Eye className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-white font-bold">{selectedItem.views}</p>
                      <p className="text-xs text-gray-500">Views</p>
                    </div>
                    <div className="bg-[#0f0f0f] rounded-lg p-3 text-center">
                      <Heart className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-white font-bold">{selectedItem.favorites}</p>
                      <p className="text-xs text-gray-500">Favorites</p>
                    </div>
                    <div className="bg-[#0f0f0f] rounded-lg p-3 text-center">
                      <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-white font-bold">{new Date(selectedItem.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">Listed</p>
                    </div>
                  </div>
                </div>

                {/* Right: Details */}
                <div className="space-y-6">
                  {/* Price */}
                  <div className="bg-[#0f0f0f] rounded-xl p-6 border border-[#202225]">
                    <p className="text-sm text-gray-400 mb-2">Price</p>
                    <p className="text-4xl font-bold text-yellow-500 flex items-center gap-2 mb-4">
                      <Coins className="w-8 h-8" />
                      {formatTokens(selectedItem.price_tokens)}
                    </p>
                    
                    {profile?.id !== selectedItem.seller_id ? (
                      <button
                        onClick={() => handlePurchase(selectedItem)}
                        disabled={!profile || (profile.token_balance || 0) < selectedItem.price_tokens}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ShoppingBag className="w-6 h-6" />
                        {!profile ? 'Login to Purchase' : (profile.token_balance || 0) < selectedItem.price_tokens ? 'Insufficient Tokens' : 'Buy Now'}
                      </button>
                    ) : (
                      <div className="w-full px-6 py-4 bg-gray-600 text-white rounded-lg font-bold text-lg text-center">
                        Your Listing
                      </div>
                    )}

                    {selectedItem.is_verified && (
                      <div className="flex items-center gap-2 mt-4 text-blue-500">
                        <Shield className="w-5 h-5" />
                        <span className="text-sm font-semibold">Verified Item - Purchase Protected</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Description</p>
                      <p className="text-white">{selectedItem.item_description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Game</p>
                        <p className="text-white font-semibold">{selectedItem.game_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Type</p>
                        <p className="text-white font-semibold capitalize">{selectedItem.item_type}</p>
                      </div>
                      {selectedItem.item_rarity && (
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Rarity</p>
                          <p className={`font-bold capitalize ${getRarityColor(selectedItem.item_rarity)}`}>
                            {selectedItem.item_rarity}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Condition</p>
                        <p className="text-white font-semibold capitalize">{selectedItem.condition}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Platform</p>
                        <p className="text-white font-semibold capitalize">{selectedItem.platform}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Quantity</p>
                        <p className="text-white font-semibold">{selectedItem.quantity} available</p>
                      </div>
                    </div>
                  </div>

                  {/* Seller Info */}
                  <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#202225]">
                    <p className="text-sm text-gray-400 mb-3">Seller Information</p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {selectedItem.seller?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold">{selectedItem.seller?.username}</p>
                          {selectedItem.seller?.user_marketplace_stats?.[0]?.verified_seller && (
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        {selectedItem.seller?.user_marketplace_stats?.[0] && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-white font-semibold">
                              {selectedItem.seller.user_marketplace_stats[0].average_rating.toFixed(1)}
                            </span>
                            <span className="text-gray-400">
                              ({selectedItem.seller.user_marketplace_stats[0].total_reviews} reviews)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {selectedItem.seller?.user_marketplace_stats?.[0] && (
                      <div className="flex items-center justify-center gap-2 text-sm pt-3 border-t border-[#202225]">
                        <p className="text-gray-400">Seller Tier:</p>
                        <p className="text-white font-semibold capitalize flex items-center gap-1">
                          {(() => {
                            const badge = getTierBadge(selectedItem.seller.user_marketplace_stats[0].seller_tier);
                            const Icon = badge.icon;
                            return (
                              <>
                                <Icon className="w-4 h-4" />
                                {selectedItem.seller.user_marketplace_stats[0].seller_tier}
                              </>
                            );
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
