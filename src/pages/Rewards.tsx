import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, PlaytimeReward, UserMilestone, GamingAchievement, GameTier } from '../lib/supabase';
import { 
  Gift, Coins, Zap, Star, TrendingUp, MessageSquare,
  Users, Trophy, Clock, Award, Flame, Target,
  CheckCircle, Lock, CheckCircle2, ShoppingBag, Copy, CreditCard, Bitcoin
} from 'lucide-react';
import TokenTransactionHistory from '../components/TokenTransactionHistory';
import TokenStaking from '../components/TokenStaking';
import HowToEarnGuide from '../components/HowToEarnGuide';
import GamingSessionsHistory from '../components/GamingSessionsHistory';
import RewardsDashboardSection from '../components/RewardsDashboardSection';
import DailyChallengesCard from '../components/DailyChallengesCard';
import GamingSessionsWidget from '../components/GamingSessionsWidget';
import EnhancedQuestsWidget from '../components/EnhancedQuestsWidget';
import TokenStakingWidget from '../components/TokenStakingWidget';
import QuickBuyTokensWidget from '../components/QuickBuyTokensWidget';
import WithdrawTokensWidget from '../components/WithdrawTokensWidget';
import AchievementsWidget from '../components/AchievementsWidget';
import TransactionHistoryWidget from '../components/TransactionHistoryWidget';
import ReferralsWidget from '../components/ReferralsWidget';
import { toast } from '../components/Toast';
import { CardSkeleton } from '../components/Skeleton';
import { formatTokens } from '../utils/formatTokens';

interface RewardItem {
  id: string;
  category: string;
  name: string;
  description: string;
  tokenCost: number;
  icon: any;
  type: string;
  data?: any;
}

// Platform Achievement Types
interface PlatformAchievement {
  id: string;
  achievement_key: string;
  name: string;
  description: string;
  icon_url?: string;
  tier: string;
  token_reward: number;
  xp_reward: number;
  is_secret: boolean;
  requirements: any;
}

interface UserAchievement {
  achievement_id: string;
  progress: any;
  completed: boolean;
  completed_at?: string;
  showcased: boolean;
}

// Quest Types
interface Quest {
  id: string;
  quest_type: string;
  name: string;
  description: string;
  requirements: any;
  token_reward: number;
  xp_reward: number;
  difficulty: string;
  cooldown_hours: number;
}

interface UserQuest {
  id: string;
  quest_id: string;
  progress: any;
  status: string;
  assigned_at: string;
  expires_at: string;
  completed_at?: string;
  quest: Quest;
}

export default function Rewards() {
  const { profile } = useAuth();
  const [tokenBalance, setTokenBalance] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'earn' | 'achievements' | 'quests' | 'spend' | 'referrals' | 'battlepass' | 'transactions' | 'buytokens' | 'gamingsessions'>('earn');
  const [_customizationItems, _setCustomizationItems] = useState<any[]>([]);
  const [_ownedItems, _setOwnedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Gaming Earn States
  const [playtimeRewards, setPlaytimeRewards] = useState<PlaytimeReward[]>([]);
  const [milestones, setMilestones] = useState<UserMilestone[]>([]);
  const [achievements, setAchievements] = useState<GamingAchievement[]>([]);
  const [gameTiers, setGameTiers] = useState<GameTier[]>([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [totalHours, setTotalHours] = useState(0);

  // Platform Achievements States
  const [platformAchievements, setPlatformAchievements] = useState<PlatformAchievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<Map<string, UserAchievement>>(new Map());
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Quests States
  const [activeQuests, setActiveQuests] = useState<UserQuest[]>([]);
  const [availableQuests, setAvailableQuests] = useState<Quest[]>([]);
  const [selectedQuestType, setSelectedQuestType] = useState<string>('all');

  useEffect(() => {
    if (profile) {
      fetchTokenBalance();
      fetchCustomizationItems();
      fetchOwnedItems();
      fetchGamingEarnData();
      
      if (activeCategory === 'achievements') {
        fetchPlatformAchievements();
      } else if (activeCategory === 'quests') {
        fetchQuests();
      }
    }
  }, [profile, activeCategory]);

  // Real-time balance updates
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel(`balance_updates_${profile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profile.id}`
      }, (payload: any) => {
        const newBalance = payload.new.token_balance;
        const oldBalance = tokenBalance;
        
        setTokenBalance(newBalance);
        
        // Show toast for balance changes
        if (newBalance > oldBalance) {
          toast.success(`+${newBalance - oldBalance} tokens received!`);
        } else if (newBalance < oldBalance) {
          toast.info(`-${oldBalance - newBalance} tokens spent`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, tokenBalance]);

  const fetchTokenBalance = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('token_balance')
      .eq('id', profile.id)
      .single();

    if (data) {
      setTokenBalance(data.token_balance);
    }
  };

  const fetchCustomizationItems = async () => {
    const { data } = await supabase
      .from('profile_customization_items')
      .select('*')
      .eq('is_active', true)
      .order('token_cost', { ascending: true });

    if (data) {
      _setCustomizationItems(data);
    }
  };

  const fetchOwnedItems = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('user_customization_items')
      .select('item_id')
      .eq('user_id', profile.id);

    if (data) {
      _setOwnedItems(data.map(item => item.item_id));
    }
  };

  // Gaming Earn Data Fetching
  const fetchGamingEarnData = async () => {
    await Promise.all([
      fetchPlaytimeRewards(),
      fetchMilestones(),
      fetchAchievements(),
      fetchGameTiers(),
      fetchTodayEarnings(),
    ]);
  };

  const fetchPlaytimeRewards = async () => {
    const { data } = await supabase
      .from('playtime_rewards')
      .select('*')
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setPlaytimeRewards(data);
      const total = data.reduce((sum, r) => sum + r.hours_played, 0);
      setTotalHours(total);
    }
  };

  const fetchMilestones = async () => {
    const { data } = await supabase
      .from('user_milestones')
      .select('*')
      .eq('user_id', profile?.id)
      .order('achieved_at', { ascending: false });

    if (data) setMilestones(data);
  };

  const fetchAchievements = async () => {
    const { data } = await supabase
      .from('gaming_achievements')
      .select('*')
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: false})
      .limit(10);

    if (data) setAchievements(data);
  };

  const fetchGameTiers = async () => {
    const { data } = await supabase
      .from('game_tiers')
      .select('*')
      .eq('is_active', true)
      .order('tokens_per_hour', { ascending: false });

    if (data) setGameTiers(data);
  };

  const fetchTodayEarnings = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', profile?.id)
      .in('type', ['playtime_reward', 'gaming_achievement', 'milestone_bonus'])
      .gte('created_at', today.toISOString());

    if (transactions) {
      const total = transactions.reduce((sum, t) => sum + t.amount, 0);
      setTodayEarnings(total);
    }
  };

  // Fetch Platform Achievements
  const fetchPlatformAchievements = async () => {
    setLoading(true);

    // Fetch all achievements
    const { data: achievementsData } = await supabase
      .from('platform_achievements')
      .select('*')
      .eq('is_active', true)
      .order('tier', { ascending: true })
      .order('sort_order', { ascending: true });

    if (achievementsData) {
      setPlatformAchievements(achievementsData);
    }

    // Fetch user progress
    if (profile) {
      const { data: userProgress } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', profile.id);

      if (userProgress) {
        const map = new Map();
        userProgress.forEach((ua: any) => {
          map.set(ua.achievement_id, ua);
        });
        setUserAchievements(map);
      }
    }

    setLoading(false);
  };

  // Fetch Quests
  const fetchQuests = async () => {
    if (!profile) return;
    setLoading(true);

    // Fetch active user quests
    let activeQuery = supabase
      .from('user_quests')
      .select('*, quest:quest_templates(*)')
      .eq('user_id', profile.id)
      .in('status', ['active']);

    if (selectedQuestType !== 'all') {
      activeQuery = activeQuery.eq('quest.quest_type', selectedQuestType);
    }

    const { data: activeData } = await activeQuery;
    
    if (activeData) {
      setActiveQuests(activeData as any);
    }

    // Fetch available quests
    let availableQuery = supabase
      .from('quest_templates')
      .select('*')
      .eq('is_active', true);

    if (selectedQuestType !== 'all') {
      availableQuery = availableQuery.eq('quest_type', selectedQuestType);
    }

    const { data: availableData } = await availableQuery;

    if (availableData) {
      const activeQuestIds = activeData?.map(aq => aq.quest_id) || [];
      setAvailableQuests(availableData.filter(q => !activeQuestIds.includes(q.id)));
    }

    setLoading(false);
  };

  // Achievement Helper Functions
  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: 'from-amber-700 to-amber-900',
      silver: 'from-gray-400 to-gray-600',
      gold: 'from-yellow-400 to-yellow-600',
      platinum: 'from-cyan-400 to-cyan-600',
      diamond: 'from-purple-400 to-purple-600',
    };
    return colors[tier] || 'from-gray-500 to-gray-700';
  };

  const getTierIcon = (tier: string) => {
    const icons: Record<string, string> = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎',
      diamond: '👑',
    };
    return icons[tier] || '🏆';
  };

  const getAchievementProgress = (achievement: PlatformAchievement): number => {
    const userAch = userAchievements.get(achievement.id);
    if (!userAch || !userAch.progress) return 0;
    if (userAch.completed) return 100;

    const req = achievement.requirements;
    const progress = userAch.progress;
    const keys = Object.keys(req);
    if (keys.length === 0) return 0;

    const key = keys[0];
    const required = req[key];
    const current = progress[key] || 0;

    return Math.min(100, (current / required) * 100);
  };

  // Quest Helper Functions
  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'text-green-500 bg-green-500/20',
      medium: 'text-yellow-500 bg-yellow-500/20',
      hard: 'text-orange-500 bg-orange-500/20',
      extreme: 'text-red-500 bg-red-500/20',
    };
    return colors[difficulty] || 'text-gray-500 bg-[#0f0f0f]0/20';
  };

  const getQuestTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      daily: Clock,
      weekly: Target,
      special: Star,
      seasonal: Zap,
    };
    return icons[type] || Target;
  };

  const getQuestProgress = (userQuest: UserQuest): number => {
    if (!userQuest.progress || !userQuest.quest.requirements) return 0;

    const req = userQuest.quest.requirements;
    const prog = userQuest.progress;
    const keys = Object.keys(req);
    if (keys.length === 0) return 0;

    const key = keys[0];
    const required = req[key];
    const current = prog[key] || 0;

    return Math.min(100, (current / required) * 100);
  };

  const handleAcceptQuest = async (questId: string, quest: Quest) => {
    if (!profile) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + quest.cooldown_hours);

    const { error } = await supabase.from('user_quests').insert({
      user_id: profile.id,
      quest_id: questId,
      status: 'active',
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast.error('Failed to accept quest');
    } else {
      toast.success('Quest accepted!');
      fetchQuests();
    }
  };

  const handleClaimReward = async (_userQuestId: string, quest: Quest) => {
    toast.success(`Claimed ${quest.token_reward} tokens and ${quest.xp_reward} XP!`);
    fetchQuests();
  };

  const _getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-500 to-orange-500';
      case 'epic': return 'from-purple-500 to-pink-500';
      case 'rare': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const _getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-500';
      case 'epic': return 'border-purple-500';
      case 'rare': return 'border-blue-500';
      default: return 'border-gray-600';
    }
  };

  const _getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-500';
      case 'epic': return 'text-purple-500';
      case 'rare': return 'text-blue-500';
      case 'uncommon': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  const getTierBadge = (tier: number) => {
    switch (tier) {
      case 1: return { label: 'Tier 1', color: 'bg-yellow-500', text: 'AAA Games' };
      case 2: return { label: 'Tier 2', color: 'bg-blue-500', text: 'Popular Games' };
      case 3: return { label: 'Tier 3', color: 'bg-[#0f0f0f]0', text: 'Other Games' };
      default: return { label: 'Unknown', color: 'bg-[#0f0f0f]0', text: '' };
    }
  };

  const _gameRewards: RewardItem[] = [
    {
      id: 'steam-5',
      category: 'game-rewards',
      name: '$5 Steam Gift Card',
      description: 'Redeem for Steam Wallet funds',
      tokenCost: 5000,
      icon: Gift,
      type: 'gift_card',
      data: { platform: 'steam', amount: 5 }
    },
    {
      id: 'steam-10',
      category: 'game-rewards',
      name: '$10 Steam Gift Card',
      description: 'Redeem for Steam Wallet funds',
      tokenCost: 9500,
      icon: Gift,
      type: 'gift_card',
      data: { platform: 'steam', amount: 10 }
    },
    {
      id: 'vbucks-1000',
      category: 'game-rewards',
      name: '1,000 V-Bucks',
      description: 'Fortnite in-game currency',
      tokenCost: 8000,
      icon: Coins,
      type: 'game_currency',
      data: { game: 'fortnite', amount: 1000 }
    },
    {
      id: 'robux-800',
      category: 'game-rewards',
      name: '800 Robux',
      description: 'Roblox in-game currency',
      tokenCost: 10000,
      icon: Coins,
      type: 'game_currency',
      data: { game: 'roblox', amount: 800 }
    },
  ];

  const _boostRewards: RewardItem[] = [
    {
      id: 'boost-2x-24h',
      category: 'boosts',
      name: '2x Token Boost (24h)',
      description: 'Double your token earnings for 24 hours',
      tokenCost: 500,
      icon: Zap,
      type: 'token_boost',
      data: { multiplier: 2.0, duration: 24 }
    },
    {
      id: 'boost-3x-12h',
      category: 'boosts',
      name: '3x Token Boost (12h)',
      description: 'Triple your token earnings for 12 hours',
      tokenCost: 750,
      icon: Zap,
      type: 'token_boost',
      data: { multiplier: 3.0, duration: 12 }
    },
    {
      id: 'boost-5x-6h',
      category: 'boosts',
      name: '5x Token Boost (6h)',
      description: 'Quintuple your token earnings for 6 hours',
      tokenCost: 1000,
      icon: Zap,
      type: 'token_boost',
      data: { multiplier: 5.0, duration: 6 }
    },
  ];

  const _socialRewards: RewardItem[] = [
    {
      id: 'feed-boost',
      category: 'social',
      name: 'Activity Feed Boost',
      description: 'Pin your post to the top of the feed for 1 hour',
      tokenCost: 100,
      icon: TrendingUp,
      type: 'feed_boost',
      data: { duration: 60 }
    },
    {
      id: 'party-featured',
      category: 'social',
      name: 'Featured Party',
      description: 'Make your party featured for 15 minutes',
      tokenCost: 50,
      icon: Users,
      type: 'party_featured',
      data: { duration: 15 }
    },
    {
      id: 'message-pin',
      category: 'social',
      name: 'Message Pin (10 pins)',
      description: 'Pin important messages in chat channels',
      tokenCost: 150,
      icon: MessageSquare,
      type: 'message_pins',
      data: { quantity: 10 }
    },
    {
      id: 'chat-history',
      category: 'social',
      name: 'Extended Chat History',
      description: 'Access full chat history for 30 days',
      tokenCost: 200,
      icon: Clock,
      type: 'chat_history',
      data: { days: 30 }
    },
  ];

  const _purchaseReward = async (reward: RewardItem) => {
    if (!profile) return;
    
    if (tokenBalance < reward.tokenCost) {
      toast.error('Insufficient tokens!');
      return;
    }

    setLoading(true);

    try {
      if (reward.type === 'token_boost') {
        const { data, error } = await supabase.rpc('purchase_token_boost', {
          p_multiplier: reward.data.multiplier,
          p_duration_hours: reward.data.duration,
          p_cost: reward.tokenCost
        });

        if (error) throw error;

        if (data?.success) {
          toast.success(`${reward.name} activated!`);
          fetchTokenBalance();
        } else {
          toast.error(data?.error || 'Purchase failed');
        }
      } else if (reward.type === 'gift_card' || reward.type === 'game_currency') {
        const { error } = await supabase.from('redemptions').insert({
          user_id: profile.id,
          game: reward.data.platform || reward.data.game,
          amount: `$${reward.data.amount}` || `${reward.data.amount}`,
          tokens_spent: reward.tokenCost,
          status: 'pending',
          user_game_id: 'N/A'
        });

        if (error) throw error;

        await supabase
          .from('profiles')
          .update({ 
            token_balance: tokenBalance - reward.tokenCost,
            total_spent: profile.total_spent + reward.tokenCost
          })
          .eq('id', profile.id);

        await supabase.from('transactions').insert({
          user_id: profile.id,
          amount: -reward.tokenCost,
          type: 'redemption',
          description: `Redeemed: ${reward.name}`
        });

        toast.success('Redemption request submitted! Check your email.');
        fetchTokenBalance();
      } else if (reward.type === 'feed_boost' || reward.type === 'party_featured' || reward.type === 'message_pins' || reward.type === 'chat_history') {
        await supabase
          .from('profiles')
          .update({ 
            token_balance: tokenBalance - reward.tokenCost,
            total_spent: profile.total_spent + reward.tokenCost
          })
          .eq('id', profile.id);

        await supabase.from('transactions').insert({
          user_id: profile.id,
          amount: -reward.tokenCost,
          type: 'social_feature',
          description: `Purchased: ${reward.name}`,
          reference_id: reward.id
        });

        toast.success(`${reward.name} purchased!`);
        fetchTokenBalance();
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  const _purchaseCustomizationItem = async (itemId: string, itemName: string, cost: number) => {
    if (!profile) return;
    
    if (tokenBalance < cost) {
      toast.error('Insufficient tokens!');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('purchase_customization_item', {
        p_item_id: itemId
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`${itemName} purchased!`);
        fetchTokenBalance();
        fetchOwnedItems();
      } else {
        toast.error(data?.error || 'Purchase failed');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Rewards Center</h1>
            <p className="text-gray-400">Earn and spend your tokens</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-white" />
              <div>
                <div className="text-xs text-white/80">Your Balance</div>
                <div className="text-2xl font-bold text-white">{formatTokens(tokenBalance, { showLabel: true })}</div>
              </div>
            </div>
          </div>
        </div>


        {/* Show these only on main view */}
        {activeCategory === 'earn' && (
          <>
            {/* How to Earn Guide */}
            <HowToEarnGuide />

            {/* Hero Dashboard Section */}
            <RewardsDashboardSection />

            {/* Daily Challenges Card */}
            <DailyChallengesCard />
          </>
        )}

        {/* All Widgets - Show only when on main view */}
        {activeCategory === 'earn' && (
          <div className="space-y-6 mt-6">
            {/* Row 1: Gaming & Quests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GamingSessionsWidget onViewAll={() => setActiveCategory('gamingsessions')} />
              <EnhancedQuestsWidget onViewAll={() => setActiveCategory('quests')} />
            </div>
            
            {/* Row 2: Staking & Buy/Sell */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TokenStakingWidget onViewAll={() => setActiveCategory('battlepass')} />
              <div className="space-y-6">
                <QuickBuyTokensWidget onNavigate={() => {
                  window.location.href = '#/enhanced-token-economy';
                  setTimeout(() => window.location.reload(), 100);
                }} />
              </div>
            </div>

            {/* Row 2.5: Withdraw Tokens */}
            <div className="grid grid-cols-1 gap-6">
              <WithdrawTokensWidget onNavigate={() => {
                window.location.href = '#/enhanced-token-economy';
                setTimeout(() => window.location.reload(), 100);
              }} />
            </div>

            {/* Row 3: Achievements & Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AchievementsWidget onViewAll={() => setActiveCategory('achievements')} />
              <TransactionHistoryWidget onViewAll={() => setActiveCategory('transactions')} />
            </div>

            {/* Row 4: Referrals (Full Width) */}
            <div className="grid grid-cols-1 gap-6">
              <ReferralsWidget onViewAll={() => setActiveCategory('referrals')} />
            </div>
          </div>
        )}

        {/* Gaming Sessions Full View */}
        {activeCategory === 'gamingsessions' && (
          <div className="space-y-6 mt-6">
            <button
              onClick={() => setActiveCategory('earn')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-4"
            >
              ← Back to Overview
            </button>
            <GamingSessionsHistory />
          </div>
        )}

        {/* Quests Full View */}
        {activeCategory === 'quests' && (
          <div className="space-y-6 mt-6">
            <button
              onClick={() => setActiveCategory('earn')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-4"
            >
              ← Back to Overview
            </button>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-[#8B5CF6]/20">
                    <Coins className="w-6 h-6 text-[#8B5CF6]" />
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm font-medium mb-1">Today's Earnings</h3>
                <p className="text-3xl font-bold text-white">{todayEarnings}</p>
                <p className="text-xs text-gray-400 mt-1">Tokens earned today</p>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-green-500/20">
                    <Clock className="w-6 h-6 text-green-500" />
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm font-medium mb-1">Total Hours</h3>
                <p className="text-3xl font-bold text-white">{totalHours.toFixed(1)}</p>
                <p className="text-xs text-gray-400 mt-1">Hours played</p>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-purple-500/20">
                    <Trophy className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm font-medium mb-1">Achievements</h3>
                <p className="text-3xl font-bold text-white">{achievements.length}</p>
                <p className="text-xs text-gray-400 mt-1">Unlocked achievements</p>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-gradient-to-br from-[#8B5CF6]/20 to-[#7C3AED]/20 rounded-xl p-6 border border-[#8B5CF6]/30">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Star className="w-6 h-6 mr-2 text-[#8B5CF6]" />
                How to Earn Tokens
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1a1a1a] rounded-lg p-4">
                  <Clock className="w-8 h-8 text-[#8B5CF6] mb-2" />
                  <h3 className="font-bold text-white mb-1">Play Games</h3>
                  <p className="text-sm text-gray-400">Earn 2-5 tokens per hour based on game tier</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-4">
                  <Trophy className="w-8 h-8 text-purple-500 mb-2" />
                  <h3 className="font-bold text-white mb-1">Unlock Achievements</h3>
                  <p className="text-sm text-gray-400">Earn 10-250 tokens based on rarity</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-4">
                  <Award className="w-8 h-8 text-yellow-500 mb-2" />
                  <h3 className="font-bold text-white mb-1">Reach Milestones</h3>
                  <p className="text-sm text-gray-400">Bonus tokens at 10, 50, 100+ hours</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Playtime Rewards */}
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Clock className="w-6 h-6 mr-2 text-[#8B5CF6]" />
                  Recent Playtime
                </h2>
                {playtimeRewards.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No playtime rewards yet</p>
                    <p className="text-sm mt-1">Connect your gaming accounts to start earning!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {playtimeRewards.slice(0, 5).map((reward) => (
                      <div key={reward.id} className="bg-[#1a1a1a] rounded-lg p-3 hover:bg-[#4f5660] transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white">{reward.game_name}</p>
                            <p className="text-sm text-gray-400">
                              {reward.hours_played.toFixed(1)} hours @ {reward.reward_rate} tokens/hr
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#8B5CF6] font-bold">{formatTokens(reward.tokens_earned, { showSign: true })}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(reward.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Achievements */}
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Trophy className="w-6 h-6 mr-2 text-purple-500" />
                  Recent Achievements
                </h2>
                {achievements.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No achievements yet</p>
                    <p className="text-sm mt-1">Unlock achievements to earn bonus tokens!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {achievements.slice(0, 5).map((achievement) => (
                      <div key={achievement.id} className="bg-[#1a1a1a] rounded-lg p-3 hover:bg-[#4f5660] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-white">{achievement.achievement_name}</p>
                            <p className="text-sm text-gray-400">{achievement.platform}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-purple-500 font-bold">+{achievement.tokens_awarded}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(achievement.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Milestones Achieved */}
            {milestones.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Award className="w-6 h-6 mr-2 text-yellow-500" />
                  Milestones Achieved
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">🏆</span>
                        <span className="text-yellow-500 font-bold">+{milestone.tokens_awarded}</span>
                      </div>
                      <p className="font-semibold text-white">{milestone.game_name}</p>
                      <p className="text-sm text-gray-400">{new Date(milestone.achieved_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Game Tiers */}
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <TrendingUp className="w-6 h-6 mr-2 text-[#8B5CF6]" />
                Token Rates by Game
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gameTiers.slice(0, 12).map((tier) => {
                  const badge = getTierBadge(tier.tier);
                  return (
                    <div key={tier.id} className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#4f5660] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-white">{tier.game_name}</p>
                        <span className={`text-xs px-2 py-1 rounded ${badge.color} text-white`}>
                          {tier.tokens_per_hour}/hr
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{badge.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {/* Achievements Tab Content */}
        {activeCategory === 'achievements' && (
          <div className="space-y-6 mt-6">
            <button
              onClick={() => setActiveCategory('earn')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-4"
            >
              ← Back to Overview
            </button>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-[#1a1a1a] rounded-xl p-4 border border-[#202225]">
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
              >
                <option value="all">All Tiers</option>
                <option value="bronze">🥉 Bronze</option>
                <option value="silver">🥈 Silver</option>
                <option value="gold">🥇 Gold</option>
                <option value="platinum">💎 Platinum</option>
                <option value="diamond">👑 Diamond</option>
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="completed">✓ Completed</option>
                <option value="in_progress">⏳ In Progress</option>
                <option value="locked">🔒 Locked</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-6 border border-green-500/30">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                      <div>
                        <p className="text-gray-400 text-sm">Completed</p>
                        <p className="text-white text-3xl font-bold">
                          {Array.from(userAchievements.values()).filter(a => a.completed).length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-6 border border-blue-500/30">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="w-8 h-8 text-blue-400" />
                      <div>
                        <p className="text-gray-400 text-sm">In Progress</p>
                        <p className="text-white text-3xl font-bold">
                          {Array.from(userAchievements.values()).filter(a => !a.completed && a.progress).length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
                    <div className="flex items-center gap-3 mb-2">
                      <Trophy className="w-8 h-8 text-purple-400" />
                      <div>
                        <p className="text-gray-400 text-sm">Total</p>
                        <p className="text-white text-3xl font-bold">{platformAchievements.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Achievement Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {platformAchievements
                    .filter(ach => selectedTier === 'all' || ach.tier === selectedTier)
                    .filter(ach => {
                      if (selectedStatus === 'all') return true;
                      const userAch = userAchievements.get(ach.id);
                      if (selectedStatus === 'completed') return userAch?.completed;
                      if (selectedStatus === 'in_progress') return userAch && !userAch.completed && userAch.progress;
                      if (selectedStatus === 'locked') return !userAch || (!userAch.completed && !userAch.progress);
                      return true;
                    })
                    .map(achievement => {
                      const userAch = userAchievements.get(achievement.id);
                      const progress = getAchievementProgress(achievement);
                      const isCompleted = userAch?.completed || false;
                      const isLocked = !userAch || (!userAch.completed && !userAch.progress);

                      return (
                        <div
                          key={achievement.id}
                          className={`bg-[#1a1a1a] rounded-xl p-6 border-2 transition-all ${
                            isCompleted
                              ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                              : 'border-[#202225] hover:border-[#8B5CF6]'
                          } ${isLocked ? 'opacity-70' : ''}`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className={`text-4xl ${isLocked ? 'grayscale opacity-50' : ''}`}>
                              {getTierIcon(achievement.tier)}
                            </div>
                            {isCompleted && (
                              <CheckCircle2 className="w-6 h-6 text-yellow-500" />
                            )}
                            {isLocked && (
                              <Lock className="w-6 h-6 text-gray-600" />
                            )}
                          </div>

                          <div className={`px-3 py-1 bg-gradient-to-r ${getTierColor(achievement.tier)} rounded-lg text-white text-xs font-bold inline-block mb-3`}>
                            {achievement.tier.toUpperCase()}
                          </div>

                          <h3 className="text-white font-bold text-lg mb-2">{achievement.name}</h3>
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{achievement.description}</p>

                          {/* Progress Bar */}
                          {!isCompleted && !isLocked && (
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Progress</span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                              <div className="h-2 bg-[#202225] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED]"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Rewards */}
                          <div className="flex items-center gap-4 pt-4 border-t border-[#202225]">
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Coins className="w-4 h-4" />
                              <span className="font-bold">{achievement.token_reward}</span>
                            </div>
                            <div className="flex items-center gap-1 text-blue-400">
                              <Star className="w-4 h-4" />
                              <span className="font-bold">{achievement.xp_reward} XP</span>
                            </div>
                          </div>

                          {isCompleted && userAch?.completed_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              Completed {new Date(userAch.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>

                {platformAchievements.length === 0 && (
                  <div className="text-center text-white py-16">
                    <Trophy className="w-20 h-20 mx-auto mb-4 text-[#8B5CF6] opacity-50" />
                    <h2 className="text-2xl font-bold mb-2">No Achievements Yet</h2>
                    <p className="text-gray-400">Achievements will appear here once configured in the database.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Quests Tab Content */}
        {activeCategory === 'quests' && (
          <div className="space-y-6">
            {/* Quest Type Filter */}
            <div className="flex flex-wrap gap-4 bg-[#1a1a1a] rounded-xl p-4 border border-[#202225]">
              <select
                value={selectedQuestType}
                onChange={(e) => setSelectedQuestType(e.target.value)}
                className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
              >
                <option value="all">All Quest Types</option>
                <option value="daily">⏰ Daily Quests</option>
                <option value="weekly">📅 Weekly Quests</option>
                <option value="special">⭐ Special Events</option>
                <option value="seasonal">🎃 Seasonal</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                {/* Active Quests */}
                {activeQuests.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                      <Flame className="w-6 h-6 text-orange-500" />
                      Active Quests
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {activeQuests.map(userQuest => {
                        const quest = userQuest.quest;
                        const QuestIcon = getQuestTypeIcon(quest.quest_type);
                        const progress = getQuestProgress(userQuest);
                        const isCompleted = progress >= 100;
                        const timeLeft = new Date(userQuest.expires_at).getTime() - Date.now();
                        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

                        return (
                          <div
                            key={userQuest.id}
                            className="bg-gradient-to-br from-[#1a1a1a] to-[#1a1a1a] rounded-xl p-6 border-2 border-[#8B5CF6] shadow-lg"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="p-3 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-xl">
                                <QuestIcon className="w-6 h-6 text-white" />
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold ${getDifficultyColor(quest.difficulty)}`}>
                                {quest.difficulty.toUpperCase()}
                              </div>
                            </div>

                            <h4 className="text-white font-bold text-lg mb-2">{quest.name}</h4>
                            <p className="text-gray-400 text-sm mb-4">{quest.description}</p>

                            {/* Progress Bar */}
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Progress</span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                              <div className="h-2 bg-[#202225] rounded-full overflow-hidden">
                                <div
                                  className={`h-full bg-gradient-to-r ${
                                    isCompleted
                                      ? 'from-green-500 to-emerald-500'
                                      : 'from-[#8B5CF6] to-[#7C3AED]'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>

                            {/* Time Remaining */}
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                              <Clock className="w-4 h-4" />
                              <span>
                                {hoursLeft > 0 ? `${hoursLeft} hours remaining` : 'Expires soon!'}
                              </span>
                            </div>

                            {/* Rewards */}
                            <div className="flex items-center justify-between pt-4 border-t border-[#202225]">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 text-yellow-500">
                                  <Coins className="w-4 h-4" />
                                  <span className="font-bold">{quest.token_reward}</span>
                                </div>
                                <div className="flex items-center gap-1 text-blue-400">
                                  <Star className="w-4 h-4" />
                                  <span className="font-bold">{quest.xp_reward} XP</span>
                                </div>
                              </div>
                              {isCompleted && (
                                <button
                                  onClick={() => handleClaimReward(userQuest.id, quest)}
                                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition"
                                >
                                  Claim Reward
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Quests */}
                {availableQuests.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                      <Target className="w-6 h-6 text-[#8B5CF6]" />
                      Available Quests
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {availableQuests.map(quest => {
                        const QuestIcon = getQuestTypeIcon(quest.quest_type);

                        return (
                          <div
                            key={quest.id}
                            className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6] transition-all"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="p-3 bg-[#1a1a1a] rounded-xl">
                                <QuestIcon className="w-6 h-6 text-[#8B5CF6]" />
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold ${getDifficultyColor(quest.difficulty)}`}>
                                {quest.difficulty.toUpperCase()}
                              </div>
                            </div>

                            <h4 className="text-white font-bold text-lg mb-2">{quest.name}</h4>
                            <p className="text-gray-400 text-sm mb-4">{quest.description}</p>

                            {/* Requirements Preview */}
                            <div className="text-xs text-gray-500 mb-4">
                              {Object.entries(quest.requirements).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="capitalize">{key.replace('_', ' ')}:</span>
                                  <span className="font-bold">{value as string}</span>
                                </div>
                              ))}
                            </div>

                            {/* Rewards */}
                            <div className="flex items-center justify-between pt-4 border-t border-[#202225]">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 text-yellow-500">
                                  <Coins className="w-4 h-4" />
                                  <span className="font-bold">{quest.token_reward}</span>
                                </div>
                                <div className="flex items-center gap-1 text-blue-400">
                                  <Star className="w-4 h-4" />
                                  <span className="font-bold">{quest.xp_reward} XP</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAcceptQuest(quest.id, quest)}
                                className="px-4 py-2 bg-[#8B5CF6] text-white rounded-lg font-semibold hover:bg-[#7C3AED] transition"
                              >
                                Accept Quest
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeQuests.length === 0 && availableQuests.length === 0 && (
                  <div className="text-center text-white py-16">
                    <Target className="w-20 h-20 mx-auto mb-4 text-[#8B5CF6] opacity-50" />
                    <h2 className="text-2xl font-bold mb-2">No Quests Available</h2>
                    <p className="text-gray-400">Check back later for new quests!</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Battle Pass Tab Content */}
        {activeCategory === 'battlepass' && (
          <div className="mt-6">
            <button
              onClick={() => setActiveCategory('earn')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-4"
            >
              ← Back to Overview
            </button>
            <TokenStaking />
          </div>
        )}

        {/* Transaction History Tab Content */}
        {activeCategory === 'transactions' && (
          <div className="mt-6">
            <button
              onClick={() => setActiveCategory('earn')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-4"
            >
              ← Back to Overview
            </button>
            <TokenTransactionHistory />
          </div>
        )}

        {/* Buy/Sell Tokens Tab Content */}
        {activeCategory === 'buytokens' && (
          <div className="space-y-6 mt-6">
            <button
              onClick={() => setActiveCategory('earn')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-4"
            >
              ← Back to Overview
            </button>
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Token Economy</h3>
                  <p className="text-white/90">Buy tokens to speed up your progress or sell your earned tokens for crypto!</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/80 mb-1">Current Balance</div>
                  <div className="text-3xl font-bold">{formatTokens(tokenBalance, { showLabel: true })}</div>
                  <div className="text-sm text-white/80">≈ ${(tokenBalance * 0.001).toFixed(2)} USD</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <CreditCard className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Buy Tokens</h3>
                    <p className="text-gray-400 text-sm">Purchase tokens with card or crypto</p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/tokeneconomy'}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Buy Tokens Now
                </button>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Payment Methods:</span>
                    <span className="text-white">Card, Crypto</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Instant Delivery:</span>
                    <span className="text-green-400">✓ Yes</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Bonus Tokens:</span>
                    <span className="text-yellow-400">Up to 50,000</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <Bitcoin className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Sell Tokens</h3>
                    <p className="text-gray-400 text-sm">Withdraw your tokens for cryptocurrency</p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/tokeneconomy'}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Bitcoin className="w-5 h-5" />
                  Withdraw Tokens
                </button>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Min Withdrawal:</span>
                    <span className="text-white">10,000 tokens</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Processing Fee:</span>
                    <span className="text-red-400">2%</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Processing Time:</span>
                    <span className="text-yellow-400">24-48 hours</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Packages Preview */}
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
              <h3 className="text-white font-bold text-xl mb-4">Popular Token Packages</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
                  <div className="text-center">
                    <Coins className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-yellow-500 mb-1">10,000</div>
                    <div className="text-gray-400 text-sm mb-3">tokens</div>
                    <div className="text-white font-bold text-lg">$10.00</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-[#8B5CF6]/20 to-pink-500/20 rounded-lg p-4 border-2 border-[#8B5CF6]">
                  <div className="text-center">
                    <div className="bg-[#8B5CF6] text-white text-xs font-bold px-2 py-1 rounded-full inline-block mb-2">BEST VALUE</div>
                    <Coins className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-yellow-500 mb-1">100,000</div>
                    <div className="text-gray-400 text-sm mb-1">tokens + 20,000 bonus</div>
                    <div className="text-white font-bold text-lg">$100.00</div>
                  </div>
                </div>
                <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
                  <div className="text-center">
                    <Coins className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-yellow-500 mb-1">500,000</div>
                    <div className="text-gray-400 text-sm mb-1">tokens + 50,000 bonus</div>
                    <div className="text-white font-bold text-lg">$500.00</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <button
                  onClick={() => window.location.href = '/tokeneconomy'}
                  className="text-[#8B5CF6] hover:text-[#7C3AED] font-semibold transition"
                >
                  View All Packages →
                </button>
              </div>
            </div>

            {/* FAQs */}
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
              <h3 className="text-white font-bold text-xl mb-4">Frequently Asked Questions</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-white font-semibold mb-2">How do I buy tokens?</h4>
                  <p className="text-gray-400 text-sm">Click the "Buy Tokens Now" button above to purchase tokens using a credit card or cryptocurrency. Tokens are delivered instantly to your account.</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Can I withdraw my earned tokens?</h4>
                  <p className="text-gray-400 text-sm">Yes! You can withdraw tokens you've earned by playing games. Minimum withdrawal is 10,000 tokens ($10). A 2% processing fee applies.</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">What cryptocurrencies are supported?</h4>
                  <p className="text-gray-400 text-sm">We support BTC, ETH, and USDT for both purchasing and withdrawing tokens.</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">How long do withdrawals take?</h4>
                  <p className="text-gray-400 text-sm">Withdrawals are processed manually within 24-48 hours to ensure security and prevent fraud.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Spend Tokens Tab Content */}
        {activeCategory === 'spend' && (
          <div className="space-y-6">
            <div className="text-center text-white py-16">
              <ShoppingBag className="w-20 h-20 mx-auto mb-4 text-[#8B5CF6]" />
              <h2 className="text-2xl font-bold mb-2">Spend Your Tokens</h2>
              <p className="text-gray-400 mb-4">Unlock boosts, customizations, and more!</p>
              <p className="text-sm text-gray-500">Token store coming soon.</p>
            </div>
          </div>
        )}


        {/* Referrals Tab Content */}
        {activeCategory === 'referrals' && (
          <div className="space-y-6 mt-6">
            <button
              onClick={() => setActiveCategory('earn')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-4"
            >
              ← Back to Overview
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Referral Code Card */}
              <div className="bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-xl shadow-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-4">Your Referral Code</h3>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/30">
                    <p className="text-4xl font-black text-center tracking-widest">{profile?.referral_code || 'LOADING...'}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (profile?.referral_code) {
                        navigator.clipboard.writeText(profile.referral_code);
                        toast.success('Referral code copied!');
                      }
                    }}
                    className="w-full bg-white text-[#8B5CF6] py-4 rounded-lg font-bold hover:bg-[#0f0f0f] transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Copy className="w-5 h-5" />
                    Copy Referral Code
                  </button>
                </div>
              </div>

              {/* Referral Stats */}
              <div className="bg-[#1a1a1a] rounded-xl shadow-xl p-8 border border-[#202225]">
                <h3 className="text-2xl font-bold text-white mb-6">Referral Stats</h3>
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-5 border border-green-500/30">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-green-500/30 rounded-xl">
                        <Users className="w-8 h-8 text-green-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Total Referrals</p>
                        <p className="text-4xl font-black text-white">{(profile as any)?.total_referrals || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl p-5 border border-blue-500/30">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-blue-500/30 rounded-xl">
                        <Coins className="w-8 h-8 text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Tokens Earned</p>
                        <p className="text-4xl font-black text-white">{((profile as any)?.total_referrals || 0) * 100}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* How Referrals Work */}
            <div className="bg-gradient-to-br from-[#8B5CF6]/20 to-[#7C3AED]/20 rounded-xl p-8 border border-[#8B5CF6]/30">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Gift className="w-7 h-7 text-[#8B5CF6]" />
                How Referrals Work
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1a1a1a] rounded-xl p-6">
                  <div className="text-4xl mb-4">1️⃣</div>
                  <h4 className="font-bold text-white mb-2">Share Your Code</h4>
                  <p className="text-sm text-gray-400">Send your unique referral code to friends</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-6">
                  <div className="text-4xl mb-4">2️⃣</div>
                  <h4 className="font-bold text-white mb-2">They Sign Up</h4>
                  <p className="text-sm text-gray-400">Your friend creates an account with your code</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-6">
                  <div className="text-4xl mb-4">3️⃣</div>
                  <h4 className="font-bold text-white mb-2">Earn Rewards</h4>
                  <p className="text-sm text-gray-400">Get 100 tokens for each successful referral</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
