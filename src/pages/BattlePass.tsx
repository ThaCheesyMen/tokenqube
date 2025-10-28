import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle, Zap, Crown, Star, TrendingUp } from 'lucide-react';
import { toast } from '../components/Toast';

interface BattlePass {
  id: string;
  season_number: number;
  season_name: string;
  start_date: string;
  end_date: string;
  max_tier: number;
  is_active: boolean;
}

interface UserProgress {
  current_tier: number;
  current_xp: number;
  is_premium: boolean;
  claimed_free_tiers: number[];
  claimed_premium_tiers: number[];
}

interface Tier {
  tier_number: number;
  xp_required: number;
  free_rewards: any[];
  premium_rewards: any[];
}

export default function BattlePass() {
  const { profile } = useAuth();
  const [battlePass, setBattlePass] = useState<BattlePass | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchBattlePass();
    }
  }, [profile]);

  const fetchBattlePass = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Fetch active battle pass
      const { data: bpData, error: bpError } = await supabase
        .from('battle_passes')
        .select('*')
        .eq('is_active', true)
        .single();

      if (bpError) throw bpError;
      setBattlePass(bpData);

      if (bpData) {
        // Fetch user progress
        const { data: progressData } = await supabase
          .from('user_battle_pass_progress')
          .select('*')
          .eq('user_id', profile.id)
          .eq('battle_pass_id', bpData.id)
          .maybeSingle();

        setProgress(progressData || {
          current_tier: 0,
          current_xp: 0,
          is_premium: false,
          claimed_free_tiers: [],
          claimed_premium_tiers: []
        });

        // Fetch tiers
        const { data: tiersData } = await supabase
          .from('battle_pass_tiers')
          .select('*')
          .eq('battle_pass_id', bpData.id)
          .order('tier_number');

        setTiers(tiersData || []);
      }
    } catch (error) {
      console.error('Error fetching battle pass:', error);
      toast.error('Failed to load Battle Pass');
    } finally {
      setLoading(false);
    }
  };

  const purchasePremium = async () => {
    if (!profile || !battlePass || !progress) return;

    const cost = 1000; // 1000 tokens
    if ((profile.token_balance || 0) < cost) {
      toast.error('Not enough tokens!');
      return;
    }

    try {
      // Deduct tokens
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - cost })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      // Update progress
      const { error: progressError } = await supabase
        .from('user_battle_pass_progress')
        .upsert({
          user_id: profile.id,
          battle_pass_id: battlePass.id,
          ...progress,
          is_premium: true,
          purchased_at: new Date().toISOString()
        });

      if (progressError) throw progressError;

      toast.success('Premium Battle Pass activated! 🎉');
      fetchBattlePass();
    } catch (error) {
      console.error('Error purchasing premium:', error);
      toast.error('Failed to purchase Premium');
    }
  };

  const claimReward = async (tier: number, isPremium: boolean) => {
    if (!profile || !battlePass || !progress) return;

    const alreadyClaimed = isPremium 
      ? progress.claimed_premium_tiers.includes(tier)
      : progress.claimed_free_tiers.includes(tier);

    if (alreadyClaimed) {
      toast.info('Already claimed!');
      return;
    }

    if (tier > progress.current_tier) {
      toast.error('Tier not unlocked yet!');
      return;
    }

    if (isPremium && !progress.is_premium) {
      toast.error('Premium Battle Pass required!');
      return;
    }

    try {
      const updatedProgress = {
        ...progress,
        [isPremium ? 'claimed_premium_tiers' : 'claimed_free_tiers']: [
          ...(isPremium ? progress.claimed_premium_tiers : progress.claimed_free_tiers),
          tier
        ]
      };

      const { error } = await supabase
        .from('user_battle_pass_progress')
        .upsert({
          user_id: profile.id,
          battle_pass_id: battlePass.id,
          ...updatedProgress
        });

      if (error) throw error;

      setProgress(updatedProgress);
      toast.success('Reward claimed! 🎁');
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward');
    }
  };

  const calculateProgress = () => {
    if (!progress || !tiers || tiers.length === 0) return 0;
    const nextTier = tiers.find(t => t.tier_number === progress.current_tier + 1);
    if (!nextTier) return 100;
    return (progress.current_xp / nextTier.xp_required) * 100;
  };

  const getDaysRemaining = () => {
    if (!battlePass) return 0;
    const end = new Date(battlePass.end_date);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B5CF6]"></div>
      </div>
    );
  }

  if (!battlePass) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8">
        <div className="text-center">
          <Zap className="w-24 h-24 mx-auto mb-6 text-gray-600" />
          <h2 className="text-3xl font-bold text-white mb-2">No Active Battle Pass</h2>
          <p className="text-gray-400">Check back soon for the next season!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-2xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "30px 30px"}}></div>
        </div>
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">
                {battlePass.season_name}
              </h1>
              <p className="text-purple-200">Season {battlePass.season_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-200">Ends in</p>
              <p className="text-3xl font-bold text-white">{getDaysRemaining()} days</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-black/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-bold text-lg">Tier {progress?.current_tier || 0} / {battlePass.max_tier}</p>
                <p className="text-sm text-purple-200">{progress?.current_xp || 0} XP</p>
              </div>
              {!progress?.is_premium && (
                <button
                  onClick={purchasePremium}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <Crown className="w-5 h-5" />
                  Upgrade to Premium (1000 🪙)
                </button>
              )}
              {progress?.is_premium && (
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Premium Active
                </div>
              )}
            </div>
            <div className="h-4 bg-black/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div className="space-y-4">
        {tiers.map((tier) => {
          const isUnlocked = (progress?.current_tier || 0) >= tier.tier_number;
          const isFreeClaimed = progress?.claimed_free_tiers.includes(tier.tier_number);
          const isPremiumClaimed = progress?.claimed_premium_tiers.includes(tier.tier_number);

          return (
            <div 
              key={tier.tier_number}
              className={`bg-[#1a1a1a] rounded-xl p-6 border-2 transition-all ${
                isUnlocked ? 'border-purple-500' : 'border-[#202225]'
              }`}
            >
              <div className="flex items-center gap-6">
                {/* Tier Number */}
                <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-black ${
                  isUnlocked ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' : 'bg-[#0f0f0f] text-gray-600'
                }`}>
                  {tier.tier_number}
                </div>

                {/* Free Rewards */}
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-2">Free Reward</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-[#0f0f0f] rounded-lg p-4">
                      {tier.free_rewards.length > 0 ? (
                        <p className="text-white">{JSON.stringify(tier.free_rewards[0])}</p>
                      ) : (
                        <p className="text-gray-600">No reward</p>
                      )}
                    </div>
                    <button
                      onClick={() => claimReward(tier.tier_number, false)}
                      disabled={!isUnlocked || isFreeClaimed}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                        isFreeClaimed
                          ? 'bg-green-500/20 text-green-500 cursor-not-allowed'
                          : isUnlocked
                          ? 'bg-purple-500 hover:bg-purple-600 text-white'
                          : 'bg-[#0f0f0f] text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {isFreeClaimed ? <CheckCircle className="w-5 h-5" /> : isUnlocked ? 'Claim' : <Lock className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Premium Rewards */}
                <div className="flex-1">
                  <p className="text-sm text-yellow-400 mb-2 flex items-center gap-1">
                    <Crown className="w-4 h-4" /> Premium Reward
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/30">
                      {tier.premium_rewards.length > 0 ? (
                        <p className="text-white">{JSON.stringify(tier.premium_rewards[0])}</p>
                      ) : (
                        <p className="text-gray-600">No reward</p>
                      )}
                    </div>
                    <button
                      onClick={() => claimReward(tier.tier_number, true)}
                      disabled={!isUnlocked || isPremiumClaimed || !progress?.is_premium}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                        isPremiumClaimed
                          ? 'bg-green-500/20 text-green-500 cursor-not-allowed'
                          : isUnlocked && progress?.is_premium
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
                          : 'bg-[#0f0f0f] text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {isPremiumClaimed ? <CheckCircle className="w-5 h-5" /> : (isUnlocked && progress?.is_premium) ? 'Claim' : <Lock className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

