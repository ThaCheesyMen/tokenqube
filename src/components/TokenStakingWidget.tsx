import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Coins, TrendingUp, Clock, ChevronRight, Zap, Lock, Unlock, Award, Shield, CheckCircle, Sparkles } from 'lucide-react';
import { toast } from './Toast';

interface StakedToken {
  id: string;
  amount: number;
  staked_at: string;
  unlock_date: string;
  reward_rate: number;
  accumulated_rewards: number;
  is_active: boolean;
}

interface TokenStakingWidgetProps {
  onViewAll: () => void;
}

const STAKING_PLANS = [
  { duration: 7, rate: 0.05, minAmount: 100, name: '1 Week', apy: 5 },
  { duration: 30, rate: 0.12, minAmount: 500, name: '1 Month', apy: 12 },
  { duration: 90, rate: 0.25, minAmount: 1000, name: '3 Months', apy: 25 },
  { duration: 180, rate: 0.50, minAmount: 5000, name: '6 Months', apy: 50 }
];

export default function TokenStakingWidget({ onViewAll }: TokenStakingWidgetProps) {
  const { profile } = useAuth();
  const [stakedTokens, setStakedTokens] = useState<StakedToken[]>([]);
  const [totalStaked, setTotalStaked] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(STAKING_PLANS[1]);
  const [stakeAmount, setStakeAmount] = useState('');

  useEffect(() => {
    if (profile) {
      fetchStakingData();
    }
  }, [profile]);

  const fetchStakingData = async () => {
    if (!profile) return;

    try {
      console.log('Fetching staking data for user:', profile.id);
      
      // Fetch active stakes
      const { data, error } = await supabase
        .from('token_staking')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .order('staked_at', { ascending: false });

      if (error) {
        console.error('Fetch error:', error);
        throw error;
      }

      console.log('Stakes loaded:', data);
      setStakedTokens(data || []);

      // Calculate stats
      const staked = data?.reduce((sum, stake) => sum + stake.amount, 0) || 0;
      setTotalStaked(staked);

      const rewards = data?.reduce((sum, stake) => {
        const elapsed = Date.now() - new Date(stake.staked_at).getTime();
        const dailyRate = stake.reward_rate / 365;
        const reward = (stake.amount * dailyRate * elapsed) / (1000 * 60 * 60 * 24);
        return sum + Math.floor(reward);
      }, 0) || 0;
      setTotalRewards(rewards);

      // Fetch total earned from completed stakes
      const { data: completedStakes } = await supabase
        .from('token_staking')
        .select('accumulated_rewards')
        .eq('user_id', profile.id)
        .eq('is_active', false);

      const earned = completedStakes?.reduce((sum, stake) => sum + (stake.accumulated_rewards || 0), 0) || 0;
      setTotalEarned(earned);

    } catch (error) {
      console.error('Error loading staking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    if (!profile) {
      toast.error('You must be logged in');
      return;
    }

    const amount = parseInt(stakeAmount);
    if (isNaN(amount) || amount < selectedPlan.minAmount) {
      toast.error(`Minimum stake is ${selectedPlan.minAmount} tokens`);
      return;
    }

    if (amount > (profile.token_balance || 0)) {
      toast.error('Insufficient token balance');
      return;
    }

    try {
      const now = new Date();
      const unlockDate = new Date(now.getTime() + selectedPlan.duration * 24 * 60 * 60 * 1000);

      // Deduct tokens from balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - amount })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      // Create stake
      const { data: newStake, error: stakeError } = await supabase
        .from('token_staking')
        .insert({
          user_id: profile.id,
          amount: amount,
          staked_at: now.toISOString(),
          unlock_date: unlockDate.toISOString(),
          reward_rate: selectedPlan.rate,
          accumulated_rewards: 0,
          is_active: true
        })
        .select()
        .single();

      if (stakeError) throw stakeError;

      console.log('Stake created:', newStake);
      toast.success(`✅ Successfully staked ${amount.toLocaleString()} tokens for ${selectedPlan.name}!`);
      setShowStakeModal(false);
      setStakeAmount('');
      await fetchStakingData();
    } catch (error: any) {
      console.error('Error staking:', error);
      toast.error(error.message || 'Failed to stake tokens');
    }
  };

  const handleUnstake = async (stake: StakedToken, currentRewards: number) => {
    if (!profile) return;

    try {
      // Mark stake as inactive
      await supabase
        .from('token_staking')
        .update({ 
          is_active: false,
          accumulated_rewards: currentRewards
        })
        .eq('id', stake.id);

      // Return tokens + rewards to balance
      await supabase
        .from('profiles')
        .update({ 
          token_balance: (profile?.token_balance || 0) + stake.amount + currentRewards 
        })
        .eq('id', profile?.id);

      toast.success(`✅ Claimed ${(stake.amount + currentRewards).toLocaleString()} tokens!`);
      await fetchStakingData();
    } catch (error) {
      console.error('Unstake error:', error);
      toast.error('Failed to claim stake');
    }
  };

  // Helper: Get time remaining as human-readable string
  const getTimeRemaining = (unlockDate: string) => {
    const now = Date.now();
    const unlock = new Date(unlockDate).getTime();
    const diff = unlock - now;

    if (diff <= 0) return 'Unlocked';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  // Helper: Calculate current rewards for a stake
  const calculateCurrentRewards = (stake: StakedToken) => {
    const elapsed = Date.now() - new Date(stake.staked_at).getTime();
    const dailyRate = stake.reward_rate / 365;
    return Math.floor((stake.amount * dailyRate * elapsed) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#202225] rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-5 w-32 bg-[#202225] rounded"></div>
                <div className="h-3 w-48 bg-[#202225] rounded"></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-[#202225] rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-[#202225] rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Token Staking</h3>
            <p className="text-sm text-gray-400">Earn passive rewards while you play</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStakeModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Stake
          </button>
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
          >
            <span>Manage</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg p-3 border border-blue-500/30 hover:border-blue-500/50 transition-all">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-3 h-3 text-blue-400" />
            <p className="text-xs text-blue-300 font-medium">Total Staked</p>
          </div>
          <p className="text-2xl font-bold text-white">{totalStaked.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">tokens locked</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-500/30 hover:border-green-500/50 transition-all">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <p className="text-xs text-green-300 font-medium">Pending Rewards</p>
          </div>
          <p className="text-2xl font-bold text-green-400">+{totalRewards.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">ready to claim</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-3 border border-purple-500/30 hover:border-purple-500/50 transition-all">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-purple-400" />
            <p className="text-xs text-purple-300 font-medium">Active Stakes</p>
          </div>
          <p className="text-2xl font-bold text-white">{stakedTokens.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">positions</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg p-3 border border-yellow-500/30 hover:border-yellow-500/50 transition-all">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-3 h-3 text-yellow-400" />
            <p className="text-xs text-yellow-300 font-medium">Total Earned</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400">+{totalEarned.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">all-time</p>
        </div>
      </div>

      {/* Active Stakes or Empty State */}
      {stakedTokens.length === 0 ? (
        <div className="text-center py-10 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl border border-[#202225]">
          <div className="relative inline-block mb-4">
            <Lock className="w-16 h-16 text-gray-600" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-white font-semibold mb-2">Start Earning Passive Rewards</p>
          <p className="text-sm text-gray-400 mb-4">Stake your tokens and watch them grow automatically!</p>
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-green-400" />
              Up to 50% APY
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-blue-400" />
              Secure & Safe
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-400" />
              Flexible Terms
            </span>
          </div>
          <button
            onClick={() => setShowStakeModal(true)}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold transition-all inline-flex items-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Stake Your First Tokens
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Active Positions ({stakedTokens.length})
          </h4>
          {stakedTokens.slice(0, 3).map((stake) => {
            const currentRewards = calculateCurrentRewards(stake);
            const isUnlocked = new Date(stake.unlock_date) <= new Date();
            const timeRemaining = getTimeRemaining(stake.unlock_date);
            const elapsed = Date.now() - new Date(stake.staked_at).getTime();
            const totalDuration = new Date(stake.unlock_date).getTime() - new Date(stake.staked_at).getTime();
            const progressPercent = Math.min(100, (elapsed / totalDuration) * 100);

            return (
              <div
                key={stake.id}
                className={`bg-[#0f0f0f] rounded-xl p-4 border-2 transition-all hover:scale-[1.02] ${
                  isUnlocked ? 'border-green-500/50 bg-green-500/5 shadow-lg shadow-green-500/10' : 'border-[#202225] hover:border-[#8B5CF6]/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isUnlocked ? 'bg-gradient-to-br from-green-500 to-emerald-500 animate-pulse' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                      {isUnlocked ? (
                        <Unlock className="w-5 h-5 text-white" />
                      ) : (
                        <Lock className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">{stake.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{(stake.reward_rate * 100).toFixed(0)}% APY</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Earned</p>
                    <p className="text-lg font-bold text-green-400">+{currentRewards.toLocaleString()}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                {!isUnlocked && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeRemaining} remaining
                      </span>
                      <span>{new Date(stake.unlock_date).toLocaleDateString()}</span>
                    </div>
                    <div className="h-1.5 bg-[#202225] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Button */}
                {isUnlocked ? (
                  <button
                    onClick={() => handleUnstake(stake, currentRewards)}
                    className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Claim {(stake.amount + currentRewards).toLocaleString()} Tokens
                  </button>
                ) : (
                  <div className="text-center py-2 text-xs text-gray-500">
                    <span className="flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" />
                      Locked until {new Date(stake.unlock_date).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {stakedTokens.length > 3 && (
            <div className="text-center py-3 bg-[#0f0f0f] rounded-lg border border-[#202225] hover:border-[#8B5CF6] transition-all cursor-pointer" onClick={onViewAll}>
              <p className="text-sm text-gray-400">
                +{stakedTokens.length - 3} more active stake{stakedTokens.length - 3 !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-[#8B5CF6] mt-1">Click to view all</p>
            </div>
          )}
        </div>
      )}

      {/* Staking Modal */}
      {showStakeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowStakeModal(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#202225] max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Coins className="w-7 h-7 text-yellow-500" />
              Stake Tokens
            </h3>
            <p className="text-gray-400 mb-6">Lock your tokens to earn rewards</p>

            {/* Plan Selection */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-3 block font-medium">Select Staking Plan</label>
              <div className="grid grid-cols-2 gap-3">
                {STAKING_PLANS.map((plan) => (
                  <button
                    key={plan.duration}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedPlan.duration === plan.duration
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-[#202225] bg-[#0f0f0f] hover:border-green-500/50'
                    }`}
                  >
                    <p className="text-white font-bold mb-1">{plan.name}</p>
                    <p className="text-2xl font-black text-green-500">{plan.apy}%</p>
                    <p className="text-xs text-gray-400">APY</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-2 block font-medium">Amount to Stake</label>
              <div className="relative">
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder={`Min: ${selectedPlan.minAmount}`}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white text-xl font-bold focus:border-green-500 focus:outline-none"
                />
                <button
                  onClick={() => setStakeAmount((profile?.token_balance || 0).toString())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm font-semibold hover:text-green-400"
                >
                  MAX
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Available: {(profile?.token_balance || 0).toLocaleString()} tokens
              </p>
            </div>

            {/* Estimated Returns */}
            {parseInt(stakeAmount) >= selectedPlan.minAmount && (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-green-300 mb-2 font-medium">Estimated Returns</p>
                <p className="text-3xl font-bold text-green-400">
                  +{Math.floor(parseInt(stakeAmount) * selectedPlan.rate).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  After {selectedPlan.name.toLowerCase()} ({selectedPlan.apy}% APY)
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStakeModal(false);
                  setStakeAmount('');
                }}
                className="flex-1 px-6 py-3 bg-[#0f0f0f] hover:bg-[#1a1a1a] text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStake}
                disabled={!stakeAmount || parseInt(stakeAmount) < selectedPlan.minAmount}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Stake Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Tip */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          💡 <span className="font-bold">Longer stakes = Higher rewards!</span> Your tokens are safe and you can claim them + rewards after the lock period.
        </p>
      </div>
    </div>
  );
}
