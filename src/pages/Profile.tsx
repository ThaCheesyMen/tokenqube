import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import { useUserStats } from '../hooks/useUserStats';
import { formatTokens } from '../utils/formatTokens';
import ConfirmModal from '../components/ConfirmModal';
import SettingsModal from '../components/SettingsModal';
import AchievementShowcase from '../components/AchievementShowcase';
import GamingHeatmap from '../components/GamingHeatmap';
import ProfileBadges from '../components/ProfileBadges';
import GameCollections from '../components/GameCollections';
import CurrentlyPlaying from '../components/CurrentlyPlaying';
import GamingInsights from '../components/GamingInsights';
import { calculateLevel, getTier } from '../utils/levelSystem';
import { 
  Coins, Trophy, Gamepad2, Users, TrendingUp, Clock, 
  Gift, Star, Award, Activity, CheckCircle,
  Settings, Share2, Zap, Plus, Trash2,
  Crown, Shield, Sparkles, CreditCard, Check, Search,
  X, ChevronLeft, ChevronRight, BarChart3, Target, Flame
} from 'lucide-react';

interface UserStats {
  totalTokens: number;
  totalGames: number;
  totalPlaytime: number;
  achievements: number;
  level: number;
  xp: number;
  xpNeeded: number;
  referrals: number;
}

interface Referral {
  id: string;
  referred_id: string;
  bonus_tokens: number;
  created_at: string;
  profiles: {
    username: string;
  };
}

interface GamingAccount {
  id: string;
  user_id: string;
  platform: string;
  platform_username: string;
  platform_user_id: string;
  total_playtime_hours: number;
}

interface Achievement {
  id: string;
  achievement_name: string;
  achievement_description: string;
  tokens_awarded: number;
  platform: string;
  created_at: string;
}

interface UserGame {
  image_url: any;
  id: string;
  game_name: string;
  game_id: string;
  platform: string;
  hours_played: number;
  is_owned: boolean;
  gaming_account_id: string;
}

interface SubscriptionTier {
  id: string;
  tier_name: string;
  tier_level: number;
  monthly_price: number;
  yearly_price: number;
  token_multiplier: number;
  monthly_bonus_tokens: number;
  features: any;
}

interface TokenPackage {
  id: string;
  package_name: string;
  token_amount: number;
  price_usd: number;
  bonus_tokens: number;
  is_featured: boolean;
}

const GAMING_PLATFORMS = [
  { 
    id: 'steam', 
    name: 'Steam', 
    icon: '🎮', 
    color: 'from-[#1b2838] to-[#2a475e]',
    accentColor: '#66c0f4',
    description: 'Connect your Steam account to sync games and achievements',
    urlPlaceholder: 'https://steamcommunity.com/id/yourname',
    enabled: true
  },
  { 
    id: 'xbox', 
    name: 'Xbox', 
    icon: '🎯', 
    color: 'from-[#0e7a0d] to-[#107c10]',
    accentColor: '#107c10',
    description: 'Connect your Xbox Live account',
    urlPlaceholder: 'Your Xbox Gamertag',
    enabled: true
  },
  { 
    id: 'playstation', 
    name: 'PlayStation', 
    icon: '🎮', 
    color: 'from-[#003087] to-[#0070cc]',
    accentColor: '#0070cc',
    description: 'Connect your PlayStation Network account',
    urlPlaceholder: 'Your PSN ID',
    enabled: true
  },
  { 
    id: 'epic', 
    name: 'Epic Games', 
    icon: '⚡', 
    color: 'from-gray-700 to-gray-900',
    accentColor: '#0078f2',
    description: 'Coming soon',
    urlPlaceholder: '',
    enabled: false
  },
  { 
    id: 'riot', 
    name: 'Riot Games', 
    icon: '⚔️', 
    color: 'from-red-600 to-pink-600',
    accentColor: '#eb0029',
    description: 'Coming soon',
    urlPlaceholder: '',
    enabled: false
  },
  { 
    id: 'battlenet', 
    name: 'Battle.net', 
    icon: '🛡️', 
    color: 'from-blue-600 to-purple-600',
    accentColor: '#00aeff',
    description: 'Coming soon',
    urlPlaceholder: '',
    enabled: false
  },
];

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const { stats: userStats } = useUserStats(profile?.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'achievements' | 'premium' | 'tokens'>('overview');
  const [stats, setStats] = useState<UserStats>({
    totalTokens: 0,
    totalGames: 0,
    totalPlaytime: 0,
    achievements: 0,
    level: 1,
    xp: 0,
    xpNeeded: 100,
    referrals: 0,
  });
  const [achievementStats, setAchievementStats] = useState({
    legendary: 0,
    epic: 0,
    rare: 0,
    uncommon: 0,
    common: 0,
    total: 0
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gamingAccounts, setGamingAccounts] = useState<GamingAccount[]>([]);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [topRarestAchievements, setTopRarestAchievements] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGamingModal, setShowGamingModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('steam');
  const [platformUrl, setPlatformUrl] = useState('');
  const [platformUserId, setPlatformUserId] = useState('');
  const [platformUsername, setPlatformUsername] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'warning' | 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning',
  });

  // Premium & Token Store States
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTier[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // New Profile Enhancement States
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [gamesScrollPosition, setGamesScrollPosition] = useState(0);
  const gamesScrollRef = useState<HTMLDivElement | null>(null)[0];

  useEffect(() => {
    if (profile) {
      setNewUsername(profile.username || '');
    }
    fetchProfileData();
  }, [profile]);

  const fetchProfileData = async () => {
    if (!profile) return;

    try {
      const [gamingAccountsRes, userGamesRes, achievementsRes, referralsData, allProfiles] = await Promise.all([
        supabase.from('gaming_accounts').select('id, user_id, platform, platform_username, platform_user_id, total_playtime_hours').eq('user_id', profile.id),
        supabase.from('user_games').select('*').eq('user_id', profile.id).order('hours_played', { ascending: false }),
        supabase.from('gaming_achievements').select('id, achievement_name, achievement_description, tokens_awarded, platform, created_at').eq('user_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('referrals').select('id, referred_id, bonus_tokens, created_at, profiles:referred_id (username)').eq('referrer_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, total_earned').order('total_earned', { ascending: false }),
      ]);

      if (allProfiles.data) {
        const rank = allProfiles.data.findIndex((p) => p.id === profile.id);
        setGlobalRank(rank >= 0 ? rank + 1 : null);
      }

      const totalPlaytime = userGamesRes.data?.reduce((sum, game) => sum + (parseFloat(game.hours_played.toString()) || 0), 0) || 0;
      const totalOwnedGames = userGamesRes.data?.filter(game => game.is_owned).length || 0;

      setGamingAccounts(gamingAccountsRes.data || []);
      setUserGames(userGamesRes.data || []);
      setAchievements(achievementsRes.data || []);
      
      setStats({
        totalTokens: profile.total_earned || 0,
        totalGames: totalOwnedGames,
        totalPlaytime: Math.round(totalPlaytime),
        achievements: achievementsRes.data?.length || 0,
        level: 1,
        xp: (profile.total_earned || 0) / 10,
        xpNeeded: 100,
        referrals: referralsData.data?.length || 0,
      });

      setReferrals(referralsData.data as any || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract Steam info from URL (client-side only extraction)
  const extractSteamInfo = (input: string): { username: string; userId: string; needsResolution: boolean } => {
    try {
      const cleanInput = input.trim();
      
      // Check if it's already a Steam ID64 (17-digit number starting with 765)
      if (/^765\d{14,16}$/.test(cleanInput)) {
        return { userId: cleanInput, username: cleanInput, needsResolution: false };
      }
      
      // Extract from full URL: steamcommunity.com/profiles/76561198...
      if (cleanInput.includes('steamcommunity.com/profiles/')) {
        const match = cleanInput.match(/steamcommunity\.com\/profiles\/(\d+)/);
        if (match && /^765\d{14,16}$/.test(match[1])) {
          return { userId: match[1], username: match[1], needsResolution: false };
        }
      }
      
      // Extract custom URL: steamcommunity.com/id/customname
      if (cleanInput.includes('steamcommunity.com/id/')) {
        const match = cleanInput.match(/steamcommunity\.com\/id\/([^/?]+)/);
        if (match) {
          return { username: match[1], userId: match[1], needsResolution: true };
        }
      }
      
      // If it's just a custom name without URL
      if (!cleanInput.includes('/') && !cleanInput.includes('.') && !cleanInput.includes('steamcommunity')) {
        return { username: cleanInput, userId: cleanInput, needsResolution: true };
      }
      
      // Fallback
      return { username: cleanInput, userId: cleanInput, needsResolution: true };
    } catch (error) {
      console.error('Error extracting Steam info:', error);
      return { username: input, userId: input, needsResolution: true };
    }
  };

  // Fetch user badges
  const fetchUserBadges = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from('user_badges')
      .select('*, profile_badges(*)')
      .eq('user_id', profile.id)
      .order('earned_at', { ascending: false });
    
    if (data) setUserBadges(data);
  };

  // Fetch achievement stats by rarity
  const fetchAchievementStats = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('rarity_tier')
        .eq('user_id', profile.id)
        .eq('unlocked', true);
      
      if (error) {
        console.error('Error fetching achievement stats:', error);
        return;
      }
      
      const stats = {
        legendary: data?.filter(a => a.rarity_tier === 'legendary').length || 0,
        epic: data?.filter(a => a.rarity_tier === 'epic').length || 0,
        rare: data?.filter(a => a.rarity_tier === 'rare').length || 0,
        uncommon: data?.filter(a => a.rarity_tier === 'uncommon').length || 0,
        common: data?.filter(a => a.rarity_tier === 'common').length || 0,
        total: data?.length || 0
      };
      
      setAchievementStats(stats);
    } catch (error) {
      console.error('Error fetching achievement stats:', error);
    }
  };

  // Fetch top 3 rarest achievements
  const fetchTopRarestAchievements = async () => {
    if (!profile) return;
    
    try {
      // Join with user_games to get game_name
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          achievement_name, 
          achievement_description, 
          icon_url, 
          rarity_tier, 
          global_percentage, 
          tokens_awarded,
          game_id,
          user_games!inner(game_name)
        `)
        .eq('user_id', profile.id)
        .eq('unlocked', true)
        .order('global_percentage', { ascending: true })
        .limit(3);
      
      if (error) {
        console.error('Error fetching top rarest achievements:', error);
        return;
      }
      
      if (data) {
        // Map the data to include game_name from the joined table
        const mapped = data.map(a => ({
          ...a,
          game_name: (a.user_games as any)?.game_name || 'Unknown Game'
        }));
        setTopRarestAchievements(mapped as any);
      }
    } catch (error) {
      console.error('Error fetching top rarest achievements:', error);
    }
  };

  // Fetch recent gaming sessions
  const fetchRecentSessions = async () => {
    if (!profile) return;
    
    try {
      // Fetch recent playtime rewards as sessions
      const { data, error } = await supabase
        .from('playtime_rewards')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching recent sessions:', error);
        return;
      }
      
      if (data) {
        setRecentSessions(data);
      }
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchUserBadges();
      fetchAchievementStats();
      fetchTopRarestAchievements();
      fetchRecentSessions();
    }
  }, [profile]);

  // Sync Steam games via edge function
  const syncSteamGames = async (accountId: string, steamId: string) => {
    setSyncingAccountId(accountId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      toast.info('Syncing Steam games... This may take a moment.');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-steam-games`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            gamingAccountId: accountId,
            steamId64: steamId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync games');
      }

      const result = await response.json();
      toast.success(`Synced ${result.gamesAdded || 0} games successfully! Total playtime: ${result.totalHours}h`);
      
      // Refresh profile data
      await fetchProfileData();
    } catch (error: any) {
      console.error('Error syncing Steam games:', error);
      toast.error(`Failed to sync games: ${error.message}`);
    } finally {
      setSyncingAccountId(null);
    }
  };

  // Helper to filter and sort games
  const getFilteredGames = (accountId: string) => {
    const accountGames = userGames.filter(
      (game) => game.gaming_account_id === accountId && game.hours_played > 0
    );

    let filteredGames = accountGames;
    if (gameSearchQuery) {
      filteredGames = accountGames.filter((game) =>
        game.game_name.toLowerCase().includes(gameSearchQuery.toLowerCase())
      );
    }

    // Add image URLs for Steam games if not present
    return filteredGames
      .sort((a, b) => b.hours_played - a.hours_played)
      .map(game => ({
        ...game,
        image_url: game.image_url || getSteamGameImage(game.game_id, game.game_name)
      }));
  };

  // Fetch Premium & Token data
  useEffect(() => {
    if (activeTab === 'premium') {
      fetchSubscriptionTiers();
      fetchCurrentSubscription();
    } else if (activeTab === 'tokens') {
      fetchTokenPackages();
    }
  }, [activeTab, profile]);

  const fetchSubscriptionTiers = async () => {
    const { data } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('tier_level', { ascending: true });
    if (data) setSubscriptionTiers(data);
  };

  const fetchCurrentSubscription = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('user_subscriptions')
      .select(`*, subscription_tiers(*)`)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .single();
    if (data) setCurrentSubscription(data);
  };

  const fetchTokenPackages = async () => {
    const { data } = await supabase
      .from('token_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (data) setTokenPackages(data);
  };

  const handleSubscribe = async (tierId: string, tierName: string, price: number, cycle: 'monthly' | 'yearly') => {
    if (!profile) return;
    setPurchaseLoading(true);
    try {
      toast.success(`Redirecting to payment for ${tierName} (${cycle})...`);
      console.log('Stripe Checkout:', { tierId, tierName, price, cycle, userId: profile.id });
      // TODO: Implement Stripe integration
    } catch (error) {
      toast.error('Failed to process subscription');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleTokenPurchase = async (pkg: TokenPackage) => {
    if (!profile) return;
    setPurchaseLoading(true);
    try {
      toast.success(`Redirecting to payment for ${pkg.package_name}...`);
      console.log('Stripe Checkout:', { packageId: pkg.id, price: pkg.price_usd, tokens: pkg.token_amount + pkg.bonus_tokens, userId: profile.id });
      // TODO: Implement Stripe integration
    } catch (error) {
      toast.error('Failed to process purchase');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const getTierIcon = (level: number) => {
    switch (level) {
      case 0: return Shield;
      case 1: return Star;
      case 2: return Crown;
      default: return Shield;
    }
  };

  const getTierColor = (level: number) => {
    switch (level) {
      case 0: return 'from-gray-500 to-gray-600';
      case 1: return 'from-blue-500 to-cyan-500';
      case 2: return 'from-yellow-500 to-orange-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getFeaturesList = (features: any, level: number) => {
    const baseFeatures = [
      { text: 'Access to all games', included: true },
      { text: 'Token earning', included: true },
      { text: 'Basic chat features', included: true },
    ];

    if (level >= 1) {
      baseFeatures.push(
        { text: '1.5x Token Multiplier', included: true },
        { text: '500 Bonus Tokens/Month', included: true },
        { text: 'Ad-Free Experience', included: true },
        { text: 'Priority Support', included: true },
        { text: '30-Day Chat History', included: true },
        { text: 'Reduced Marketplace Fees (3%)', included: true }
      );
    }

    if (level >= 2) {
      baseFeatures.push(
        { text: '2x Token Multiplier', included: true },
        { text: '1,500 Bonus Tokens/Month', included: true },
        { text: 'Unlimited Chat History', included: true },
        { text: 'VIP Badge & Profile', included: true },
        { text: 'Exclusive Customization Items', included: true },
        { text: 'Lowest Marketplace Fees (1%)', included: true },
        { text: 'Featured Profile Placement', included: true }
      );
    }

    return baseFeatures;
  };

  const getValuePerToken = (price: number, tokens: number) => {
    return (price / tokens).toFixed(3);
  };

  const getSavingsPercent = (pkg: TokenPackage) => {
    const baseValue = 0.001;
    const packageValue = pkg.price_usd / (pkg.token_amount + pkg.bonus_tokens);
    return Math.round((1 - (packageValue / baseValue)) * 100);
  };

  // Calculate level and tier from profile data using centralized utility
  const levelInfo = useMemo(() => {
    if (!profile) return { level: 1, progress: 0, currentXP: 0, xpForCurrentLevel: 100, xpForNextLevel: 173, totalXPForCurrentLevel: 0 };
    return calculateLevel(profile.total_earned || 0);
  }, [profile]);

  const tier = useMemo(() => getTier(levelInfo.level), [levelInfo.level]);

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareProfile = async () => {
    const profileUrl = `${window.location.origin}/profile?user=${profile?.username}`;
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateUsername = async () => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', profile.id);

      if (error) throw error;
      
      await refreshProfile();
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating username:', error);
    }
  };

  const connectGamingAccount = async () => {
    if (!profile || !platformUrl.trim()) return;

    try {
      let username = '';
      let userId = '';

      if (selectedPlatform === 'steam') {
        // Extract Steam info (client-side)
        const extracted = extractSteamInfo(platformUrl);
        username = extracted.username;
        userId = extracted.userId;
        
        // If it needs resolution (custom URL), we'll let the sync function handle it
        // For now, just save what we have and the sync will validate it
        if (!extracted.needsResolution) {
          toast.success(`Steam ID resolved: ${userId}`);
        }
      } else {
        // For other platforms, use simple extraction
        username = platformUrl.trim();
        userId = platformUrl.trim();
      }

      const { data, error } = await supabase
        .from('gaming_accounts')
        .insert({
          user_id: profile.id,
          platform: selectedPlatform,
          platform_username: username,
          platform_user_id: userId,
          total_playtime_hours: 0,
        })
        .select()
        .single();

      if (error) throw error;
      
      setPlatformUrl('');
      setShowGamingModal(false);
      
      if (selectedPlatform === 'steam') {
        toast.success('Steam account connected! Click "Sync Games" to import your library.');
      } else {
        toast.success('Gaming account connected successfully!');
      }
      
      fetchProfileData();
    } catch (error) {
      console.error('Error connecting gaming account:', error);
      toast.error('Failed to connect gaming account. Please check the URL and try again.');
    }
  };

  const handleDisconnectClick = (accountId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Disconnect Gaming Account',
      message: 'Are you sure you want to disconnect this account? All associated games will be removed.',
      type: 'danger',
      onConfirm: () => disconnectGamingAccount(accountId),
    });
  };

  const disconnectGamingAccount = async (accountId: string) => {
    if (!profile) return;

    try {
      console.log('Starting disconnect for account:', accountId);
      
      // Use the RPC function to delete the account
      const { data, error } = await supabase
        .rpc('delete_gaming_account', { p_account_id: accountId });

      console.log('RPC delete result:', { error, data });

      if (error) {
        console.error('Delete error details:', error);
        throw error;
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to delete account');
      }
      
      // Immediately update the local state WITHOUT re-fetching
      setGamingAccounts(prev => prev.filter(acc => acc.id !== accountId));
      setUserGames(prev => prev.filter(game => game.gaming_account_id !== accountId));
      
      toast.success('Account disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting gaming account:', error);
      toast.error(`Failed to disconnect account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getAchievementProgress = (achievementName: string) => {
    const achievementMap: { [key: string]: string } = {
      'Getting Started': 'Play games for 10+ hours',
      'Casual Gamer': 'Play games for 50+ hours',
      'Active Gamer': 'Play games for 100+ hours',
      'Gaming Enthusiast': 'Play games for 250+ hours',
      'Dedicated Player': 'Play games for 500+ hours',
      'Master Gamer': 'Play games for 1000+ hours',
    };
    return achievementMap[achievementName] || 'Complete your gaming milestones';
  };

  // Helper to get Steam game cover image
  const getSteamGameImage = (gameId: string, _gameName?: string) => {
    // If gameId is a valid Steam app ID (numeric), use Steam's CDN
    if (gameId && /^\d+$/.test(gameId)) {
      return `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/library_600x900.jpg`;
    }
    // Fallback: Try to extract app ID from common Steam game ID formats
    const appIdMatch = gameId?.match(/app[_\/]?(\d+)/i);
    if (appIdMatch) {
      return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appIdMatch[1]}/library_600x900.jpg`;
    }
    // No valid ID, return null to show emoji
    return null;
  };

  // Helper to get top games for an account (only games with playtime > 0)
  const getTopGamesForAccount = (accountId: string, limit = 10) => {
    return userGames
      .filter(game =>
        game.gaming_account_id === accountId &&
        game.hours_played > 0 // Only include games with actual playtime
      )
      .sort((a, b) => b.hours_played - a.hours_played)
      .slice(0, limit)
      .map(game => ({
        ...game,
        // Add computed image_url if not present
        image_url: game.image_url || getSteamGameImage(game.game_id, game.game_name)
      }));
  };

  // Helper to get platform color
  const getPlatformColor = (platform: string) => {
    const platformConfig = GAMING_PLATFORMS.find(p => p.id === platform);
    return platformConfig?.color || 'from-gray-600 to-gray-800';
  };

  const syncSteamGamesViaEdgeFunction = async (gamingAccountId: string, steamIdOrUrl: string) => {
    try {
      console.log('Syncing Steam games via Edge Function...');
      toast.info('🎮 Syncing games & achievements... This may take 30-60 seconds.');

      // Extract Steam64 ID from URL if needed
      let steamId64 = steamIdOrUrl;
      
      // If it's a Steam profile URL, extract the Steam64 ID
      if (steamIdOrUrl.includes('steamcommunity.com')) {
        const steam64Match = steamIdOrUrl.match(/\/profiles\/(\d+)/);
        if (steam64Match) {
          steamId64 = steam64Match[1];
        } else {
          console.error('Could not extract Steam64 ID from URL');
          toast.info('Steam account connected! Please enter your Steam64 ID for automatic game sync.');
          return;
        }
      }
      
      // Validate Steam64 ID is numeric
      if (!steamId64.match(/^\d+$/)) {
        console.error('Invalid Steam64 ID:', steamId64);
        toast.info('Steam account connected! Please enter your Steam64 ID for automatic game sync.');
        return;
      }

      console.log('Calling Edge Function with Steam64 ID:', steamId64);

      // Call the Edge Function
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('sync-steam-games', {
        body: { 
          gamingAccountId, 
          steamId64 
        }
      });

      if (edgeError) {
        console.error('Edge function error:', edgeError);
        console.error('Edge function error details:', edgeError.message, edgeError.context);
        // Don't throw - just show a note
        toast.info('Steam account connected! Automatic game sync will be available once Steam API is configured.');
        return;
      }

      if (edgeData?.success) {
        // Show detailed sync results
        console.log('🔍 FULL SYNC RESULTS:', edgeData);
        console.log('  - Games Added:', edgeData.gamesAdded);
        console.log('  - Achievements Processed:', edgeData.achievementsProcessed);
        console.log('  - New Unlocks:', edgeData.newUnlocks);
        console.log('  - Tokens Awarded:', edgeData.tokensAwarded);
        
        const messages = [];
        
        if (edgeData.gamesAdded > 0) {
          messages.push(`📦 ${edgeData.gamesAdded} games imported`);
        }
        
        if (edgeData.achievementsProcessed > 0) {
          messages.push(`🏆 ${edgeData.achievementsProcessed} achievements tracked`);
        }
        
        if (edgeData.newUnlocks > 0) {
          messages.push(`✨ ${edgeData.newUnlocks} achievements already unlocked`);
        }
        
        if (edgeData.tokensAwarded > 0) {
          messages.push(`🪙 ${edgeData.tokensAwarded} tokens earned`);
          
          // Show celebratory message for token rewards
          toast.success(
            `🎉 Achievement Rewards Claimed!\n\n` +
            messages.join('\n')
          );
          
          // Refresh profile to show new token balance and achievements
          await refreshProfile();
          
          // Optionally navigate to achievements tab to see them
          setTimeout(() => {
            toast.info('💡 Check the Achievements tab to see your unlocked achievements!');
          }, 2000);
        } else {
          toast.success(`Sync complete!\n${messages.join('\n')}`);
        }
        
        // Refresh the profile data
        await fetchProfileData();
      } else {
        toast.info('Steam account connected! Manual game entry may be required.');
      }
    } catch (error) {
      console.error('Error syncing Steam games:', error);
      toast.info('Steam account connected! Manual game entry may be required.');
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full bg-[#0f0f0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B5CF6]"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#0f0f0f] overflow-y-auto">
      <div className="max-w-[1600px] mx-auto">
        {/* Profile Header */}
        <div className="rounded-none sm:rounded-2xl shadow-2xl mb-0 sm:mb-6 sm:mx-6 lg:mx-8 text-white relative overflow-hidden border-0 sm:border border-[#202225]">
          {/* Banner with Profile Info Overlay */}
          <div className="h-96 sm:h-[28rem] relative w-full overflow-hidden">
            {/* Banner Image */}
            {profile?.banner_url ? (
              <img 
                src={profile.banner_url} 
                alt="Profile Banner" 
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${tier.color}`}></div>
            )}
            
            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
            
            {/* Achievement Rarity Badges - Top Right */}
            {achievementStats.total > 0 && (
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-black/60 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-white/10 shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                  <span className="text-white font-bold text-xs sm:text-sm">Achievements</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {achievementStats.legendary > 0 && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-yellow-500/30">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50"></div>
                      <div>
                        <div className="text-xs text-yellow-200 font-semibold">Legendary</div>
                        <div className="text-base sm:text-lg font-bold text-white">{achievementStats.legendary}</div>
                      </div>
                    </div>
                  )}
                  {achievementStats.epic > 0 && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-purple-500/30">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg shadow-purple-500/50"></div>
                      <div>
                        <div className="text-xs text-purple-200 font-semibold">Epic</div>
                        <div className="text-base sm:text-lg font-bold text-white">{achievementStats.epic}</div>
                      </div>
                    </div>
                  )}
                  {achievementStats.rare > 0 && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-blue-500/30">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg shadow-blue-500/50"></div>
                      <div>
                        <div className="text-xs text-blue-200 font-semibold">Rare</div>
                        <div className="text-base sm:text-lg font-bold text-white">{achievementStats.rare}</div>
                      </div>
                    </div>
                  )}
                  {achievementStats.uncommon > 0 && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-green-500/30">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/50"></div>
                      <div>
                        <div className="text-xs text-green-200 font-semibold">Uncommon</div>
                        <div className="text-base sm:text-lg font-bold text-white">{achievementStats.uncommon}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-white">{achievementStats.total}</div>
                    <div className="text-xs text-gray-300">Total Unlocked</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Profile Info Overlay - Centered Layout */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6">
              {/* Profile Info */}
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div className="flex items-end gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-4xl sm:text-5xl font-bold border-4 border-[#8B5CF6] bg-[#1a1a1a] overflow-hidden shadow-2xl flex-shrink-0">
                      {profile?.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={profile.username} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#8B5CF6] to-[#7289DA] flex items-center justify-center">
                          {profile?.username?.[0].toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white drop-shadow-2xl truncate">{profile?.username || 'User'}</h1>
                        {profile?.status && (
                          <div className={`w-4 h-4 rounded-full ${
                            profile.status === 'online' ? 'bg-green-500' :
                            profile.status === 'idle' ? 'bg-yellow-500' :
                            profile.status === 'dnd' ? 'bg-red-500' :
                            'bg-[#0f0f0f]0'
                          } shadow-lg flex-shrink-0`} title={profile.status} />
                        )}
                      </div>

                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-lg border border-white/10">
                          <Award className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm font-semibold text-white">Level {levelInfo.level}</span>
                        </div>
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-lg border border-white/10">
                          <Star className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-semibold text-white">{tier.name}</span>
                        </div>
                        <span className="text-white/90 text-sm font-mono">@{profile?.username || 'user'}</span>
                      </div>

                      {/* XP Progress Bar - More Compact */}
                      <div className="mb-3 max-w-xs">
                        <div className="flex justify-between text-xs mb-1 text-white/80">
                          <span>Level {levelInfo.level + 1}</span>
                          <span className="font-semibold">{levelInfo.progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden backdrop-blur-sm border border-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 rounded-full transition-all duration-500 shadow-lg"
                            style={{ width: `${levelInfo.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Custom Status */}
                      {profile?.custom_status && (
                        <div className="mb-2 text-white/90 flex items-center gap-2 text-sm sm:text-base">
                          {profile?.status_emoji && <span>{profile.status_emoji}</span>}
                          <span>{profile.custom_status}</span>
                        </div>
                      )}

                      {/* Bio */}
                      {profile?.bio && (
                        <p className="text-white/80 text-sm sm:text-base mb-2 line-clamp-2">{profile.bio}</p>
                      )}
                    </div>
                  </div>

                  {/* Global Rank - Bottom Right */}
                  <div className="flex-shrink-0 mb-2">
                    <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg shadow-xl border border-white/10">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <div>
                          <div className="text-xs text-white/60">Global Rank</div>
                          <div className="text-xl font-bold text-white">#{globalRank || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Centered and Compact with Action Buttons */}
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="bg-[#1a1a1a] rounded-xl p-2 border border-[#202225] shadow-lg inline-flex gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all text-sm ${
                  activeTab === 'overview'
                    ? 'bg-[#8B5CF6] text-white shadow-md'
                    : 'text-gray-400 hover:bg-[#0f0f0f] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Overview
                </div>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all text-sm ${
                  activeTab === 'stats'
                    ? 'bg-[#8B5CF6] text-white shadow-md'
                    : 'text-gray-400 hover:bg-[#0f0f0f] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Statistics
                </div>
              </button>
              <button
                onClick={() => setActiveTab('achievements')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all text-sm ${
                  activeTab === 'achievements'
                    ? 'bg-[#8B5CF6] text-white shadow-md'
                    : 'text-gray-400 hover:bg-[#0f0f0f] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Achievements
                </div>
              </button>
              <button
                onClick={() => setActiveTab('premium')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all text-sm ${
                  activeTab === 'premium'
                    ? 'bg-[#8B5CF6] text-white shadow-md'
                    : 'text-gray-400 hover:bg-[#0f0f0f] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Premium
                </div>
              </button>
              <button
                onClick={() => setActiveTab('tokens')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all text-sm ${
                  activeTab === 'tokens'
                    ? 'bg-[#8B5CF6] text-white shadow-md'
                    : 'text-gray-400 hover:bg-[#0f0f0f] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Buy Tokens
                </div>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowSettingsModal(true)} 
                className="bg-[#1a1a1a] hover:bg-[#0f0f0f] p-2.5 rounded-lg transition-colors shadow-lg border border-[#202225] hover:border-[#8B5CF6]" 
                title="Settings"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
              <button 
                onClick={shareProfile} 
                className="bg-[#4a4a4a] hover:bg-[#5a5a5a] p-2.5 rounded-lg transition-colors shadow-lg border border-[#3a3a3a]" 
                title={copied ? "Copied!" : "Share Profile"}
              >
                {copied ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5 text-gray-300" />}
              </button>
            </div>
          </div>
        </div>

        {/* Content Wrapper with Padding */}
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <>
          {/* Overview Tab */}
          {activeTab === 'overview' ? (
            <div>
            {/* Connected Gaming Accounts */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Gamepad2 className="w-8 h-8 text-[#8B5CF6]" />
                    Gaming Accounts
                  </h2>
                  <p className="text-gray-400 mt-2">Connect your gaming platforms to track achievements and playtime</p>
                </div>
                <button
                  onClick={() => setShowGamingModal(true)}
                  className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-[#8B5CF6]/50"
                >
                  <Plus className="w-5 h-5" />
                  <span>Connect Account</span>
                </button>
            </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gamingAccounts.map((account) => {
              const topGames = getTopGamesForAccount(account.id, 3);
              const platformConfig = GAMING_PLATFORMS.find(p => p.id === account.platform);
              
              // Platform logo URLs
              const getPlatformLogo = (platform: string) => {
                const logos: { [key: string]: string } = {
                  steam: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg',
                  xbox: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Xbox_one_logo.svg',
                  playstation: 'https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_logo.svg'
                };
                return logos[platform] || '';
              };
              
              return (
                <div key={account.id} className="relative bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-2xl shadow-2xl border border-[#202225] overflow-hidden group hover:shadow-[#8B5CF6]/20 hover:border-[#8B5CF6]/50 transition-all">
                  {/* Gradient Header */}
                  <div className={`bg-gradient-to-r ${platformConfig?.color || 'from-gray-700 to-gray-900'} p-6 text-white relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-xl">
                          {getPlatformLogo(account.platform) ? (
                            <img 
                              src={getPlatformLogo(account.platform)} 
                              alt={account.platform}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Gamepad2 className="w-8 h-8 text-gray-700" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-xl capitalize block">{account.platform}</span>
                          <p className="text-sm text-white/80 truncate">@{account.platform_username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDisconnectClick(account.id)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors border border-white/20"
                        title="Disconnect Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Stats in Header */}
                    <div className="relative flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20">
                        <Clock className="w-4 h-4" />
                        <span className="font-semibold">{Math.round(account.total_playtime_hours)}h</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20">
                        <Gamepad2 className="w-4 h-4" />
                        <span className="font-semibold">{topGames.length} games</span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 bg-[#1a1a1a]">

                    {/* Sync Button for Steam */}
                    {account.platform === 'steam' && (
                      <button
                        onClick={async () => {
                          setSyncingAccountId(account.id);
                          try {
                            await syncSteamGamesViaEdgeFunction(account.id, account.platform_user_id);
                          } finally {
                            setSyncingAccountId(null);
                          }
                        }}
                        disabled={syncingAccountId === account.id}
                        className="w-full mb-3 px-3 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {syncingAccountId === account.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <Activity className="w-4 h-4" />
                            Sync Games
                          </>
                        )}
                      </button>
                    )}

                    {/* Top Games */}
                    {topGames.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Top 3 Most Played
                        </p>
                        
                        <div className="space-y-2.5">
                          {topGames.map((game, index) => (
                            <div key={game.id} className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-3 hover:bg-[#4f5660] transition-all group">
                              {/* Rank Badge */}
                              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg ${
                                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                                'bg-gradient-to-br from-orange-500 to-red-600'
                              }`}>
                                {index + 1}
                              </div>
                              
                              {/* Game Cover */}
                              <div className="flex-shrink-0 w-12 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg overflow-hidden shadow-md border border-[#202225]">
                                {game.image_url ? (
                                  <img
                                    src={game.image_url}
                                    alt={game.game_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xl">🎮</div>';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xl">
                                    🎮
                                  </div>
                                )}
                              </div>
                              
                              {/* Game Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate group-hover:text-[#8B5CF6] transition-colors">
                                  {game.game_name}
                                </p>
                                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                                  {game.hours_played.toFixed(1)}h played
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-semibold">No games found</p>
                        <p className="text-sm mt-1">Sync your games to see your library!</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {gamingAccounts.length === 0 && (
              <div className="col-span-full text-center py-12 bg-[#1a1a1a] rounded-xl border border-dashed border-[#202225]">
                <Gamepad2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No gaming accounts connected</p>
                <button
                  onClick={() => setShowGamingModal(true)}
                  className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Connect Your First Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Games Library - Horizontal Scrollable */}
        {userGames.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Gamepad2 className="w-8 h-8 text-[#8B5CF6]" />
                  Games Library
                </h2>
                <p className="text-gray-400 mt-2">
                  {userGames.length} games · {userGames.filter(g => g.hours_played > 0).length} with playtime
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Search for games */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={gameSearchQuery}
                    onChange={(e) => setGameSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-[#1a1a1a] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] border border-[#202225] w-56"
                  />
                </div>
                {/* Scroll Arrows */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const container = document.getElementById('games-scroll-container');
                      if (container) {
                        container.scrollBy({ left: -400, behavior: 'smooth' });
                      }
                    }}
                    className="p-2 bg-[#1a1a1a] hover:bg-[#8B5CF6] text-white rounded-lg transition-colors border border-[#202225]"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      const container = document.getElementById('games-scroll-container');
                      if (container) {
                        container.scrollBy({ left: 400, behavior: 'smooth' });
                      }
                    }}
                    className="p-2 bg-[#1a1a1a] hover:bg-[#8B5CF6] text-white rounded-lg transition-colors border border-[#202225]"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Privacy Warning if only a few games */}
            {userGames.length < 10 && gamingAccounts.some(acc => acc.platform === 'steam') && (
              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="text-yellow-500 mt-0.5">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-yellow-500 font-semibold mb-1">Only seeing a few games?</h3>
                    <p className="text-sm text-gray-300 mb-2">
                      Steam's API may be limited by your privacy settings. To import all your games:
                    </p>
                    <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                      <li>Go to <a href="https://steamcommunity.com/my/edit/settings" target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] hover:underline">Steam Privacy Settings</a></li>
                      <li>Set "Game details" to <strong className="text-white">Public</strong></li>
                      <li>Click "Sync Games" again in your Steam account card above</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
            <div 
              id="games-scroll-container"
              className="flex gap-4 overflow-x-hidden pb-4"
              style={{ 
                scrollBehavior: 'smooth',
                overflowX: 'hidden',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {userGames.map((game) => {
                const gameImageUrl = game.image_url || getSteamGameImage(game.game_id, game.game_name);
                return (
                  <div
                    key={game.id}
                    className="group relative bg-[#1a1a1a] rounded-xl shadow-xl border border-[#202225] overflow-hidden hover:shadow-2xl hover:border-[#8B5CF6]/50 transition-all hover:scale-105 cursor-pointer flex-shrink-0 w-48"
                  >
                    {/* Game Cover */}
                    <div className="aspect-[3/4] relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                      {gameImageUrl ? (
                        <img
                          src={gameImageUrl}
                          alt={game.game_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-6xl">🎮</div>';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          🎮
                        </div>
                      )}
                    {/* Platform Badge */}
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-medium rounded capitalize">
                        {game.platform}
                      </span>
                    </div>
                    {/* Hours Badge */}
                    <div className="absolute bottom-2 left-2 right-2">
                      {game.hours_played > 0 ? (
                        <div className="px-2 py-1 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold rounded flex items-center justify-between">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{game.hours_played.toFixed(1)}h</span>
                        </div>
                      ) : (
                        <div className="px-2 py-1 bg-[#0f0f0f]0/90 backdrop-blur-sm text-white text-xs font-bold rounded flex items-center justify-center">
                          <span>Not Played</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Game Info */}
                  <div className="p-2">
                    <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-[#8B5CF6] transition-colors">
                      {game.game_name}
                    </h3>
                  </div>
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-2xl mb-1">🎮</div>
                      <div className="text-xs font-medium">View Details</div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            {/* Total Playtime Summary */}
            <div className="bg-[#1a1a1a] rounded-xl shadow-sm border border-[#202225] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Playtime</p>
                    <p className="text-xl font-bold text-white">
                      {userGames.reduce((sum, game) => sum + game.hours_played, 0).toFixed(1)} hours
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Games Owned</p>
                  <p className="text-xl font-bold text-white">
                    {userGames.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Badges */}
        {profile && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-6">
              <Award className="w-8 h-8 text-[#8B5CF6]" />
              Badge Collection
            </h2>
            <ProfileBadges userId={profile.id} isOwnProfile={true} />
          </div>
        )}

        {/* Currently Playing Widget */}
        {profile && (
          <div className="mb-8">
            <CurrentlyPlaying userId={profile.id} showOtherPlayers={true} />
          </div>
        )}

        {/* Game Collections */}
        {profile && (
          <div className="mb-8">
            <GameCollections userId={profile.id} isOwnProfile={true} />
          </div>
        )}

        {/* Gaming Activity Heatmap */}
        {profile && (
          <div className="mb-8">
            <GamingHeatmap userId={profile.id} />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#1a1a1a] rounded-xl shadow-sm p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-500/20">
                <Coins className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Total Tokens</h3>
            <p className="text-3xl font-bold text-white">{formatTokens(userStats?.token_balance || stats.totalTokens)}</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl shadow-sm p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-500/20">
                <Gamepad2 className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Games Owned</h3>
            <p className="text-3xl font-bold text-white">{stats.totalGames}</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl shadow-sm p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Total Playtime</h3>
            <p className="text-3xl font-bold text-white">{stats.totalPlaytime}h</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl shadow-sm p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-yellow-500/20">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Achievements</h3>
            <p className="text-3xl font-bold text-white">{stats.achievements}</p>
          </div>
        </div>

        {/* Achievements from Connected Accounts */}
        {achievements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
              Gaming Achievements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="bg-[#1a1a1a] rounded-xl shadow-sm p-4 border border-[#202225]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-bold text-white">{achievement.achievement_name}</h3>
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded capitalize">
                          {achievement.platform}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{achievement.achievement_description}</p>
                      <p className="text-xs text-green-500 font-semibold">
                        +{achievement.tokens_awarded} tokens earned
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievement Showcase - Actual Stats */}
        {achievementStats.total > 0 && (
          <div className="bg-gradient-to-br from-[#2f3136] to-[#1a1c1f] rounded-2xl shadow-2xl p-8 border border-[#202225] mb-8 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-400" />
                    Achievement Collection
                  </h2>
                  <p className="text-gray-400">Your rarest gaming accomplishments</p>
                </div>
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 rounded-xl shadow-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">{achievementStats.total}</div>
                    <div className="text-xs text-white/80 uppercase tracking-wider">Total Unlocked</div>
                  </div>
                </div>
              </div>

              {/* Rarity Grid - Fancy Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {achievementStats.legendary > 0 && (
                  <div className="group relative bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-xl p-5 border-2 border-yellow-500/40 hover:border-yellow-500/80 transition-all hover:scale-105 shadow-lg hover:shadow-yellow-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50 animate-pulse"></div>
                        <span className="text-xs font-bold text-yellow-200 uppercase tracking-wider">Legendary</span>
                      </div>
                      <div className="text-4xl font-black text-white mb-1">{achievementStats.legendary}</div>
                      <div className="text-xs text-yellow-200/70">Ultra Rare</div>
                    </div>
                  </div>
                )}

                {achievementStats.epic > 0 && (
                  <div className="group relative bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-xl p-5 border-2 border-purple-500/40 hover:border-purple-500/80 transition-all hover:scale-105 shadow-lg hover:shadow-purple-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg shadow-purple-500/50 animate-pulse"></div>
                        <span className="text-xs font-bold text-purple-200 uppercase tracking-wider">Epic</span>
                      </div>
                      <div className="text-4xl font-black text-white mb-1">{achievementStats.epic}</div>
                      <div className="text-xs text-purple-200/70">Very Rare</div>
                    </div>
                  </div>
                )}

                {achievementStats.rare > 0 && (
                  <div className="group relative bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-xl p-5 border-2 border-blue-500/40 hover:border-blue-500/80 transition-all hover:scale-105 shadow-lg hover:shadow-blue-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-cyan-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg shadow-blue-500/50"></div>
                        <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Rare</span>
                      </div>
                      <div className="text-4xl font-black text-white mb-1">{achievementStats.rare}</div>
                      <div className="text-xs text-blue-200/70">Uncommon</div>
                    </div>
                  </div>
                )}

                {achievementStats.uncommon > 0 && (
                  <div className="group relative bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl p-5 border-2 border-green-500/40 hover:border-green-500/80 transition-all hover:scale-105 shadow-lg hover:shadow-green-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/50"></div>
                        <span className="text-xs font-bold text-green-200 uppercase tracking-wider">Uncommon</span>
                      </div>
                      <div className="text-4xl font-black text-white mb-1">{achievementStats.uncommon}</div>
                      <div className="text-xs text-green-200/70">Common</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Top 3 Rarest Achievements */}
              {topRarestAchievements.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                    Rarest Achievements
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topRarestAchievements.map((achievement, index) => {
                      const rarityColors = {
                        legendary: 'from-yellow-500 to-orange-500',
                        epic: 'from-purple-500 to-pink-500',
                        rare: 'from-blue-500 to-cyan-500',
                        uncommon: 'from-green-500 to-emerald-500',
                        common: 'from-gray-500 to-gray-600'
                      };
                      const rarityBorders = {
                        legendary: 'border-yellow-500/50',
                        epic: 'border-purple-500/50',
                        rare: 'border-blue-500/50',
                        uncommon: 'border-green-500/50',
                        common: 'border-gray-500/50'
                      };
                      
                      return (
                        <div key={index} className={`relative bg-[#1a1a1a] rounded-xl p-4 border-2 ${rarityBorders[achievement.rarity_tier as keyof typeof rarityBorders]} hover:scale-105 transition-all group`}>
                          {/* Rank Badge */}
                          <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg border-2 border-[#2f3136]">
                            #{index + 1}
                          </div>
                          
                          {/* Achievement Icon */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-16 h-16 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#202225]">
                              {achievement.icon_url ? (
                                <img 
                                  src={achievement.icon_url} 
                                  alt={achievement.achievement_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Trophy className="w-8 h-8 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white text-sm line-clamp-1">{achievement.achievement_name}</h4>
                              <p className="text-xs text-gray-400 line-clamp-2 mt-1">{achievement.achievement_description}</p>
                            </div>
                          </div>
                          
                          {/* Stats */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold uppercase px-2 py-1 rounded bg-gradient-to-r ${rarityColors[achievement.rarity_tier as keyof typeof rarityColors]} text-white`}>
                                {achievement.rarity_tier}
                              </span>
                              <span className="text-xs text-gray-400">{achievement.game_name}</span>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-[#202225]">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-white font-semibold">{achievement.global_percentage?.toFixed(2)}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Coins className="w-3 h-3 text-yellow-500" />
                                <span className="text-xs text-yellow-500 font-bold">+{achievement.tokens_awarded}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Action */}
              <div className="mt-6 text-center">
                <button 
                  onClick={() => setActiveTab('achievements')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-[#8B5CF6]/50"
                >
                  <Trophy className="w-5 h-5" />
                  View All Achievements
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gaming Goals & Targets */}
        <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-2xl shadow-xl p-8 border border-[#202225] mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#8B5CF6]/10 to-purple-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <Target className="w-8 h-8 text-[#8B5CF6]" />
                  Gaming Goals
                </h2>
                <p className="text-gray-400">Track your progress towards gaming milestones</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Goal 1: Total Playtime */}
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6]/50 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">Marathon Gamer</h3>
                      <p className="text-sm text-gray-400">Reach 1,000 hours playtime</p>
                    </div>
                  </div>
                  {stats.totalPlaytime >= 1000 && (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{stats.totalPlaytime.toFixed(1)}h / 1,000h</span>
                    <span className="font-bold text-white">{Math.min(100, (stats.totalPlaytime / 1000) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#202225] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (stats.totalPlaytime / 1000) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Goal 2: Games Collection */}
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6]/50 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      <Gamepad2 className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">Collector</h3>
                      <p className="text-sm text-gray-400">Own 100 games</p>
                    </div>
                  </div>
                  {stats.totalGames >= 100 && (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{stats.totalGames} / 100 games</span>
                    <span className="font-bold text-white">{Math.min(100, (stats.totalGames / 100) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#202225] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (stats.totalGames / 100) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Goal 3: Achievement Hunter */}
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6]/50 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-500/20 rounded-xl">
                      <Trophy className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">Achievement Hunter</h3>
                      <p className="text-sm text-gray-400">Unlock 500 achievements</p>
                    </div>
                  </div>
                  {achievementStats.total >= 500 && (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{achievementStats.total} / 500 achievements</span>
                    <span className="font-bold text-white">{Math.min(100, (achievementStats.total / 500) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#202225] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (achievementStats.total / 500) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Goal 4: Token Master */}
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6]/50 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-500/20 rounded-xl">
                      <Coins className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">Token Master</h3>
                      <p className="text-sm text-gray-400">Earn 50,000 tokens</p>
                    </div>
                  </div>
                  {stats.totalTokens >= 50000 && (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{formatTokens(userStats?.token_balance || stats.totalTokens)} / {formatTokens(50000)} tokens</span>
                    <span className="font-bold text-white">{Math.min(100, ((userStats?.token_balance || stats.totalTokens) / 50000) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#202225] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (stats.totalTokens / 50000) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Gaming Sessions */}
        {recentSessions.length > 0 && (
          <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-2xl shadow-xl p-8 border border-[#202225] mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <Activity className="w-8 h-8 text-[#8B5CF6]" />
                  Recent Gaming Sessions
                </h2>
                <p className="text-gray-400">Your latest gaming activity and rewards</p>
              </div>
            </div>

            <div className="space-y-4">
              {recentSessions.map((session, index) => {
                const game = userGames.find(g => g.game_name === session.game_name);
                const gameImage = game ? (game.image_url || getSteamGameImage(game.game_id, game.game_name)) : null;
                
                return (
                  <div key={session.id || index} className="bg-[#1a1a1a] rounded-xl p-5 border border-[#202225] hover:border-[#8B5CF6]/50 transition-all group">
                    <div className="flex items-center gap-4">
                      {/* Game Cover */}
                      <div className="w-20 h-28 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 overflow-hidden flex-shrink-0 shadow-lg">
                        {gameImage ? (
                          <img 
                            src={gameImage} 
                            alt={session.game_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-3xl">🎮</div>';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">
                            🎮
                          </div>
                        )}
                      </div>

                      {/* Session Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-lg truncate">{session.game_name}</h3>
                            <p className="text-sm text-gray-400">
                              {new Date(session.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <div className="px-3 py-1 bg-[#8B5CF6]/20 rounded-lg border border-[#8B5CF6]/30">
                              <span className="text-[#8B5CF6] font-bold text-sm">{session.reward_rate}x</span>
                            </div>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-semibold text-white">{session.hours_played?.toFixed(1)}h</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
                            <Coins className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-bold text-green-400">+{session.tokens_earned} tokens</span>
                          </div>
                          {session.reward_rate > 2 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                              <Zap className="w-4 h-4 text-yellow-400" />
                              <span className="text-xs font-semibold text-yellow-400">Tier {Math.floor(session.reward_rate)} Game</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
            </div>
          ) : null}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl shadow-2xl max-w-md w-full p-6 border border-[#202225]">
            <h2 className="text-2xl font-bold text-white mb-6">Edit Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-[#202225] rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-[#1a1a1a] text-white"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={updateUsername}
                className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 border border-[#202225] text-gray-300 rounded-lg font-semibold hover:bg-[#1a1a1a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl shadow-2xl max-w-md w-full p-6 border border-[#202225]">
            <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
            <div className="space-y-4">
              <p className="text-gray-400">Settings panel coming soon!</p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full px-6 py-3 bg-[#1a1a1a] text-gray-300 rounded-lg font-semibold hover:bg-[#4f5660] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Gaming Account Modal - Advanced */}
      {showGamingModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#202225]">
            {/* Header */}
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#202225] p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Gamepad2 className="w-7 h-7 text-[#8B5CF6]" />
                    Connect Gaming Account
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Link your gaming platforms to track achievements and playtime</p>
                </div>
                <button
                  onClick={() => {
                    setShowGamingModal(false);
                    setPlatformUrl('');
                    setSelectedPlatform('steam');
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Platform Selection */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Choose Platform</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {GAMING_PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setSelectedPlatform(platform.id)}
                    disabled={!platform.enabled}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      selectedPlatform === platform.id
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                        : 'border-[#202225] bg-[#1a1a1a] hover:border-[#8B5CF6]/50'
                    } ${!platform.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${platform.color} opacity-10 rounded-xl`}></div>
                    <div className="relative flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center text-2xl shadow-lg`}>
                        {platform.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-white flex items-center gap-2">
                          {platform.name}
                          {selectedPlatform === platform.id && (
                            <CheckCircle className="w-4 h-4 text-[#8B5CF6]" />
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {platform.enabled ? platform.description : 'Coming Soon'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Connection Form */}
              {GAMING_PLATFORMS.find(p => p.id === selectedPlatform)?.enabled && (
                <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#202225]">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${GAMING_PLATFORMS.find(p => p.id === selectedPlatform)?.color} flex items-center justify-center text-xl`}>
                      {GAMING_PLATFORMS.find(p => p.id === selectedPlatform)?.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-lg">
                        Connect {GAMING_PLATFORMS.find(p => p.id === selectedPlatform)?.name}
                      </h4>
                      <p className="text-sm text-gray-400 mt-1">
                        {GAMING_PLATFORMS.find(p => p.id === selectedPlatform)?.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {selectedPlatform === 'steam' && 'Steam Profile URL or Custom ID'}
                        {selectedPlatform === 'xbox' && 'Xbox Gamertag'}
                        {selectedPlatform === 'playstation' && 'PlayStation Network ID'}
                      </label>
                      <input
                        type="text"
                        value={platformUrl}
                        onChange={(e) => setPlatformUrl(e.target.value)}
                        placeholder={GAMING_PLATFORMS.find(p => p.id === selectedPlatform)?.urlPlaceholder}
                        className="w-full px-4 py-3 border border-[#202225] rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-[#0f0f0f] text-white placeholder-gray-500"
                      />
                      {selectedPlatform === 'steam' && (
                        <div className="mt-3 p-3 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-lg">
                          <p className="text-xs text-gray-300 flex items-start gap-2">
                            <span className="text-[#8B5CF6] mt-0.5">💡</span>
                            <span>
                              You can paste your full Steam profile URL (steamcommunity.com/id/yourname), 
                              just your custom ID, or your Steam ID64. We'll automatically detect it!
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-[#1a1a1a] border-t border-[#202225] p-6 flex gap-3">
              <button
                onClick={() => {
                  setShowGamingModal(false);
                  setPlatformUrl('');
                  setSelectedPlatform('steam');
                }}
                className="px-6 py-3 border border-[#202225] text-gray-300 rounded-lg font-semibold hover:bg-[#1a1a1a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={connectGamingAccount}
                disabled={!platformUrl.trim() || !GAMING_PLATFORMS.find(p => p.id === selectedPlatform)?.enabled}
                className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-[#8B5CF6]/50"
              >
                <Zap className="w-4 h-4" />
                Connect Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && profile && (
      <div>
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                Achievement Showcase
              </h2>
              <p className="text-gray-400 mt-2">
                Track your gaming accomplishments and earn tokens for unlocking achievements
              </p>
            </div>
            <AchievementShowcase userId={profile.id} />
          </div>
        )}

          {/* Premium Tab */}
          {activeTab === 'premium' && (
          <div>
            {/* Header */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Crown className="w-16 h-16 text-yellow-500" />
                <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">
                  Quest Elite
                </h1>
              </div>
              <p className="text-xl text-gray-300">
                Unlock the ultimate gaming rewards experience
              </p>
            </div>

            {/* Current Subscription Banner */}
            {currentSubscription && (
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-6 mb-8 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-xl flex items-center gap-2">
                        Quest Elite Active
                        <span className="text-2xl">✨</span>
                      </div>
                      <div className="text-white/90 text-sm">
                        Renews on {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button className="px-6 py-3 bg-white text-orange-600 rounded-lg font-semibold hover:bg-[#0f0f0f] transition shadow-lg">
                    Manage Subscription
                  </button>
                </div>
              </div>
            )}

            {/* Single Premium Card */}
            <div className="max-w-4xl mx-auto mb-12">
              <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border-2 border-yellow-500 shadow-2xl">
                {/* Animated Banner */}
                <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 p-1">
                  <div className="bg-[#1a1a1a] px-4 py-2 text-center">
                    <span className="text-white font-bold text-sm">⚡ LIMITED TIME: Get 2 months free with yearly subscription ⚡</span>
                  </div>
                </div>

                {/* Header */}
                <div className="bg-gradient-to-br from-yellow-500 via-orange-500 to-pink-500 p-12 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative z-10">
                    <Crown className="w-20 h-20 text-white mx-auto mb-4 drop-shadow-lg" />
                    <h2 className="text-4xl font-bold text-white mb-3">Quest Elite</h2>
                    <p className="text-white/90 text-lg mb-6">The ultimate gaming rewards membership</p>
                    
                    {!currentSubscription && (
                      <div>
                        <div className="text-6xl font-bold text-white mb-2">
                          $9.99
                          <span className="text-2xl font-normal">/mo</span>
                        </div>
                        <div className="text-white/90">
                          or $99.99/year <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold ml-2">Save 17%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="p-8">
                  {/* Key Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 text-center border border-yellow-500/30">
                      <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <div className="text-white font-bold text-2xl">2x</div>
                      <div className="text-sm text-gray-400">Token Multiplier</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 text-center border border-green-500/30">
                      <Gift className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <div className="text-white font-bold text-2xl">2,000</div>
                      <div className="text-sm text-gray-400">Bonus Tokens/Month</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 text-center border border-purple-500/30">
                      <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-white font-bold text-2xl">VIP</div>
                      <div className="text-sm text-gray-400">Exclusive Access</div>
                    </div>
                  </div>

                  {/* Feature List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {[
                      '2x Token Multiplier on all earnings',
                      '2,000 Bonus Tokens every month',
                      'Ad-Free Experience',
                      'Priority Customer Support',
                      'Unlimited Chat History',
                      'Exclusive Profile Badge & VIP Status',
                      'Premium Customization Items',
                      'Lowest Marketplace Fees (1%)',
                      'Early Access to New Features',
                      'Featured Profile Placement',
                      'Custom Profile Banner',
                      'Enhanced Friend List (500+ friends)'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 bg-[#0f0f0f] rounded-lg p-3">
                        <Check className="w-5 h-5 flex-shrink-0 text-green-500" />
                        <span className="text-white text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Buttons */}
                  {!currentSubscription ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => handleSubscribe('quest-elite', 'Quest Elite', 9.99, 'monthly')}
                        disabled={purchaseLoading}
                        className="w-full px-8 py-4 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50 shadow-lg"
                      >
                        Subscribe Monthly - $9.99/mo
                      </button>
                      <button
                        onClick={() => handleSubscribe('quest-elite', 'Quest Elite', 99.99, 'yearly')}
                        disabled={purchaseLoading}
                        className="w-full px-8 py-4 bg-[#1a1a1a] text-white rounded-xl font-bold text-lg hover:bg-[#7C3AED] transition disabled:opacity-50 shadow-lg"
                      >
                        Subscribe Yearly - $99.99/year (Save 17%)
                      </button>
                      <p className="text-center text-gray-400 text-sm mt-4">
                        Cancel anytime. No commitments.
                      </p>
                    </div>
                  ) : (
                    <div className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg text-center shadow-lg">
                      ✓ Quest Elite Active
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Benefits Section */}
            <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#202225]">
              <h2 className="text-3xl font-bold text-white mb-8 text-center">
                Why Join Quest Elite?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center group hover:scale-105 transition-transform">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-yellow-500/50 transition">
                    <Zap className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-2 text-lg">Double Your Earnings</h3>
                  <p className="text-gray-400 text-sm">
                    2x multiplier means you earn twice as many tokens from every activity
                  </p>
                </div>
                <div className="text-center group hover:scale-105 transition-transform">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-blue-500/50 transition">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-2 text-lg">Premium Experience</h3>
                  <p className="text-gray-400 text-sm">
                    Ad-free platform with priority support and exclusive features
                  </p>
                </div>
                <div className="text-center group hover:scale-105 transition-transform">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-purple-500/50 transition">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-2 text-lg">VIP Status</h3>
                  <p className="text-gray-400 text-sm">
                    Stand out with exclusive badges, custom banners, and premium items
                  </p>
                </div>
                <div className="text-center group hover:scale-105 transition-transform">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-green-500/50 transition">
                    <TrendingUp className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-2 text-lg">Save More</h3>
                  <p className="text-gray-400 text-sm">
                    Lowest marketplace fees (1%) save you more on every transaction
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* Buy Tokens Tab */}
          {activeTab === 'tokens' && (
          <div>
            {/* Token Balance Display */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 rounded-lg">
                <Coins className="w-6 h-6 text-white" />
                <div className="text-left">
                  <div className="text-xs text-white/80">Your Balance</div>
                  <div className="text-2xl font-bold text-white">{formatTokens(userStats?.token_balance || stats.totalTokens)}</div>
                </div>
              </div>
            </div>

            {/* First-Time Buyer Banner */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Gift className="w-12 h-12 text-white" />
                  <div>
                    <div className="text-white font-bold text-xl">First-Time Buyer Bonus!</div>
                    <div className="text-white/90">Get 100% bonus tokens on your first purchase</div>
                  </div>
                </div>
                <Star className="w-16 h-16 text-yellow-300" />
              </div>
            </div>

            {/* Token Packages */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {tokenPackages.map((pkg) => {
                const totalTokens = pkg.token_amount + pkg.bonus_tokens;
                const savings = getSavingsPercent(pkg);

                return (
                  <div
                    key={pkg.id}
                    className={`bg-[#1a1a1a] rounded-lg overflow-hidden ${
                      pkg.is_featured
                        ? 'border-2 border-yellow-500 transform scale-105 shadow-2xl'
                        : 'border border-[#202225]'
                    }`}
                  >
                    {pkg.is_featured && (
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-center py-2 font-bold text-sm">
                        ⭐ MOST POPULAR
                      </div>
                    )}

                    <div className="p-6">
                      {/* Package Header */}
                      <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Coins className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{pkg.package_name}</h3>
                        <div className="text-4xl font-bold text-yellow-500 mb-1">
                          {pkg.token_amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400">Base Tokens</div>
                      </div>

                      {/* Bonus Tokens */}
                      {pkg.bonus_tokens > 0 && (
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-3 mb-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Zap className="w-5 h-5 text-white" />
                            <span className="text-white font-bold">
                              +{pkg.bonus_tokens.toLocaleString()} Bonus Tokens!
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Total */}
                      <div className="bg-[#0f0f0f] rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400">Total Tokens:</span>
                          <span className="text-white font-bold text-xl">
                            {totalTokens.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Value:</span>
                          <span className="text-green-500 font-semibold">
                            ${getValuePerToken(pkg.price_usd, totalTokens)} per token
                          </span>
                        </div>
                      </div>

                      {/* Savings Badge */}
                      {savings > 0 && (
                        <div className="text-center mb-4">
                          <span className="inline-block bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                            Save {savings}%
                          </span>
                        </div>
                      )}

                      {/* Price & CTA */}
                      <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-white mb-1">
                          ${pkg.price_usd.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-400">One-time payment</div>
                      </div>

                      <button
                        onClick={() => handleTokenPurchase(pkg)}
                        disabled={purchaseLoading}
                        className={`w-full px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 ${
                          pkg.is_featured
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:opacity-90'
                            : 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED]'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          Buy Now
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Why Buy Tokens */}
            <div className="bg-[#1a1a1a] rounded-lg p-8">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Why Buy Tokens?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Instant Access</h3>
                  <p className="text-gray-400 text-sm">
                    Get tokens immediately and redeem rewards right away
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Bonus Tokens</h3>
                  <p className="text-gray-400 text-sm">
                    Get up to 50,000 bonus tokens with larger packages
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Secure Payment</h3>
                  <p className="text-gray-400 text-sm">
                    Powered by Stripe - your payment info is always safe
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Advanced Statistics Tab */}
          {activeTab === 'stats' && (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
                <BarChart3 className="w-10 h-10 text-[#8B5CF6]" />
                Gaming Statistics
              </h2>
              <p className="text-gray-400">Comprehensive overview of your gaming activity and achievements</p>
            </div>

            {/* Advanced Gaming Insights Dashboard */}
            {profile && (
              <GamingInsights userId={profile.id} />
            )}

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6]/50 transition group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition">
                    <Clock className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-500 text-sm font-semibold">
                      <TrendingUp className="w-4 h-4" />
                      +12%
                    </div>
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm mb-1 uppercase tracking-wide">Total Playtime</h3>
                <p className="text-4xl font-bold text-white mb-1">{stats.totalPlaytime}h</p>
                <p className="text-xs text-gray-500">≈ {Math.round(stats.totalPlaytime / 24)} days total</p>
              </div>

              <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6]/50 transition group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition">
                    <Gamepad2 className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-500 text-sm font-semibold">
                      <TrendingUp className="w-4 h-4" />
                      +8
                    </div>
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm mb-1 uppercase tracking-wide">Games Collection</h3>
                <p className="text-4xl font-bold text-white mb-1">{stats.totalGames}</p>
                <p className="text-xs text-gray-500">{userGames.filter(g => g.hours_played > 0).length} actively played</p>
              </div>

              <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6]/50 transition group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-500/20 rounded-xl group-hover:bg-yellow-500/30 transition">
                    <Trophy className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-500 text-sm font-semibold">
                      <Flame className="w-4 h-4" />
                      Hot!
                    </div>
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm mb-1 uppercase tracking-wide">Achievements</h3>
                <p className="text-4xl font-bold text-white mb-1">{achievementStats.total}</p>
                <p className="text-xs text-gray-500">{achievementStats.legendary} legendary unlocked</p>
              </div>

              <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6]/50 transition group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-500/20 rounded-xl group-hover:bg-orange-500/30 transition">
                    <Coins className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-500 text-sm font-semibold">
                      <Target className="w-4 h-4" />
                      95%
                    </div>
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm mb-1 uppercase tracking-wide">Tokens Earned</h3>
                <p className="text-4xl font-bold text-white mb-1">{stats.totalTokens.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Rank #{globalRank || 'N/A'} globally</p>
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Activity className="w-6 h-6 mr-2 text-[#8B5CF6]" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {achievements.slice(0, 10).map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg hover:bg-[#4f5660] transition">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold truncate">{achievement.achievement_name}</h4>
                      <p className="text-gray-400 text-sm truncate">{achievement.achievement_description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-yellow-500 font-bold">+{achievement.tokens_awarded}</div>
                      <div className="text-xs text-gray-400">{new Date(achievement.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
                {achievements.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Games This Month */}
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Gamepad2 className="w-6 h-6 mr-2 text-[#8B5CF6]" />
                Most Played Games
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userGames.slice(0, 6).map((game, index) => (
                  <div key={game.id} className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#4f5660] transition">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                        index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                        index === 2 ? 'bg-gradient-to-br from-orange-600 to-red-600' :
                        'bg-[#8B5CF6]'
                      }`}>
                        {index + 1}
                      </div>
                      <h4 className="text-white font-semibold flex-1 truncate">{game.game_name}</h4>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Playtime</span>
                      <span className="text-white font-semibold">{game.hours_played.toFixed(1)}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
          </>
        </div>
        {/* End Content Wrapper */}

        {/* Modals */}
        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmText="Disconnect"
          cancelText="Cancel"
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      </div>
    </div>
  );
}
