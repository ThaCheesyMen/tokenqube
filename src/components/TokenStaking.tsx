import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Coins, TrendingUp, Lock, Unlock, Zap, Calendar } from 'lucide-react';
import { toast } from './Toast';

interface StakePosition {
  id: string;
  user_id: string;
  amount: number;
  staked_at: string;
  unlock_date: string;
  reward_rate: number;
  accumulated_rewards: number;
  is_active: boolean;
}

const STAKING_PLANS = [
  { duration: 7, apy: 5, name: '1 Week', color: 'blue' },
  { duration: 30, apy: 12, name: '1 Month', color: 'purple' },
  { duration: 90, apy: 25, name: '3 Months', color: 'yellow' },
  { duration: 180, apy: 50, name: '6 Months', color: 'green' }
];

export default function TokenStaking() {
  const { profile } = useAuth();
  const [stakes, setStakes] = useState<StakePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [selectedPlan, setSelectedPlan] = useState(STAKING_PLANS[1]);
  const [showStakeModal, setShowStakeModal] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchStakes();
    }
  }, [profile]);

  const fetchStakes = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      console.log('Fetching stakes for management page...');
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
      setStakes(data || []);
    } catch (error) {
      console.error('Error fetching stakes:', error);
      toast.error('Failed to load stakes');
    } finally {
      setLoading(false);
    }
  };

  const createStake = async () => {
    if (!profile || stakeAmount <= 0) {
      toast.error('Invalid stake amount');
      return;
    }

    if (stakeAmount > (profile.token_balance || 0)) {
      toast.error('Insufficient tokens!');
      return;
    }

    try {
      const now = new Date();
      const unlockDate = new Date();
      unlockDate.setDate(unlockDate.getDate() + selectedPlan.duration);

      // Deduct tokens
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - stakeAmount })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      // Create stake with correct column names
      const { data: stakeData, error: stakeError } = await supabase
        .from('token_staking')
        .insert({
          user_id: profile.id,
          amount: stakeAmount,
          staked_at: now.toISOString(),
          unlock_date: unlockDate.toISOString(),
          reward_rate: selectedPlan.apy / 100, // Convert to decimal
          accumulated_rewards: 0,
          is_active: true
        })
        .select()
        .single();

      if (stakeError) {
        console.error('Stake error:', stakeError);
        throw stakeError;
      }

      console.log('Stake created:', stakeData);
      toast.success(`✅ Staked ${stakeAmount} tokens for ${selectedPlan.name}!`);
      setShowStakeModal(false);
      setStakeAmount(0);
      await fetchStakes();
    } catch (error: any) {
      console.error('Error creating stake:', error);
      toast.error(error.message || 'Failed to stake tokens');
    }
  };

  const unstake = async (stakeId: string, amount: number, rewardsEarned: number) => {
    if (!profile) return;

    try {
      // Update stake to inactive
      const { error: stakeError } = await supabase
        .from('token_staking')
        .update({ is_active: false })
        .eq('id', stakeId);

      if (stakeError) throw stakeError;

      // Return tokens + rewards
      const totalReturn = amount + rewardsEarned;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) + totalReturn })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      toast.success(`✅ Unstaked ${amount} tokens + ${rewardsEarned} rewards!`);
      await fetchStakes();
    } catch (error: any) {
      console.error('Error unstaking:', error);
      toast.error(error.message || 'Failed to unstake');
    }
  };

  const calculateRewards = (stake: StakePosition) => {
    const start = new Date(stake.staked_at);
    const end = new Date(stake.unlock_date);
    const now = new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = Math.min(now.getTime() - start.getTime(), totalDuration);
    const progress = elapsed / totalDuration;

    const maxRewards = stake.amount * stake.reward_rate;
    return Math.floor(maxRewards * progress);
  };

  const getProgressPercentage = (stake: StakePosition) => {
    const start = new Date(stake.staked_at);
    const end = new Date(stake.unlock_date);
    const now = new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = Math.min(now.getTime() - start.getTime(), totalDuration);
    
    return (elapsed / totalDuration) * 100;
  };

  const canUnstake = (unlockDate: string) => {
    return new Date(unlockDate) <= new Date();
  };

  const getTotalStaked = () => {
    return stakes
      .filter(s => s.is_active)
      .reduce((sum, s) => sum + s.amount, 0);
  };

  const getTotalRewards = () => {
    return stakes
      .filter(s => s.is_active)
      .reduce((sum, s) => sum + calculateRewards(s), 0);
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-yellow-500" />
            Token Staking
          </h2>
          <p className="text-sm text-gray-400 mt-1">Earn passive rewards on your tokens</p>
        </div>
        <button
          onClick={() => setShowStakeModal(true)}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
        >
          Stake Tokens
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <p className="text-sm text-gray-400 mb-1">Total Staked</p>
          <p className="text-2xl font-bold text-white">{getTotalStaked()} 🪙</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-green-500/30">
          <p className="text-sm text-gray-400 mb-1">Pending Rewards</p>
          <p className="text-2xl font-bold text-green-500">+{getTotalRewards()} 🪙</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <p className="text-sm text-gray-400 mb-1">Active Positions</p>
          <p className="text-2xl font-bold text-white">
            {stakes.filter(s => s.is_active).length}
          </p>
        </div>
      </div>

      {/* Active Stakes */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#0f0f0f] rounded-xl h-32"></div>
          ))}
        </div>
      ) : stakes.filter(s => s.is_active).length === 0 ? (
        <div className="text-center py-12">
          <Lock className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No active stakes</p>
          <p className="text-sm text-gray-500 mt-2">Start staking to earn passive rewards!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stakes
            .filter(s => s.is_active)
            .map((stake) => {
              const rewards = calculateRewards(stake);
              const progress = getProgressPercentage(stake);
              const unlocked = canUnstake(stake.unlock_date);

              return (
                <div
                  key={stake.id}
                  className="bg-[#0f0f0f] rounded-xl p-5 border border-[#202225]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xl font-bold text-white">{stake.amount} 🪙</p>
                      <p className="text-sm text-gray-400">{(stake.reward_rate * 100).toFixed(0)}% APY</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Rewards</p>
                      <p className="text-lg font-bold text-green-500">+{rewards} 🪙</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Progress</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          unlocked
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Dates & Action */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Ends {new Date(stake.unlock_date).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => unstake(stake.id, stake.amount, rewards)}
                      disabled={!unlocked}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        unlocked
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {unlocked ? (
                        <span className="flex items-center gap-1">
                          <Unlock className="w-4 h-4" />
                          Unstake
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Lock className="w-4 h-4" />
                          Locked
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Stake Modal */}
      {showStakeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-8 max-w-lg w-full border border-[#202225]">
            <h2 className="text-2xl font-bold text-white mb-6">Stake Tokens</h2>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount to Stake
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={stakeAmount || ''}
                  onChange={(e) => setStakeAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white text-xl font-bold focus:border-[#8B5CF6] focus:outline-none"
                  placeholder="0"
                />
                <button
                  onClick={() => setStakeAmount(profile?.token_balance || 0)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B5CF6] text-sm font-semibold hover:text-[#7C3AED]"
                >
                  MAX
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Available: {profile?.token_balance || 0} 🪙
              </p>
            </div>

            {/* Staking Plans */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Plan
              </label>
              <div className="grid grid-cols-2 gap-3">
                {STAKING_PLANS.map((plan) => (
                  <button
                    key={plan.duration}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedPlan.duration === plan.duration
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                        : 'border-[#202225] bg-[#0f0f0f] hover:border-[#8B5CF6]/50'
                    }`}
                  >
                    <p className="text-white font-bold mb-1">{plan.name}</p>
                    <p className="text-2xl font-black text-green-500">{plan.apy}%</p>
                    <p className="text-xs text-gray-400">APY</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Returns */}
            {stakeAmount > 0 && (
              <div className="bg-[#0f0f0f] rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400 mb-2">Estimated Returns</p>
                <p className="text-3xl font-bold text-green-500">
                  +{Math.floor(stakeAmount * (selectedPlan.apy / 100))} 🪙
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  After {selectedPlan.name.toLowerCase()}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={createStake}
                disabled={stakeAmount <= 0}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all"
              >
                Stake Tokens
              </button>
              <button
                onClick={() => {
                  setShowStakeModal(false);
                  setStakeAmount(0);
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

