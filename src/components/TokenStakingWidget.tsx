import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Coins, TrendingUp, Clock, Gift, ChevronRight, Zap, Lock } from 'lucide-react';
import { toast } from './Toast';

interface StakedToken {
  id: string;
  amount: number;
  staked_at: string;
  unlock_date: string;
  reward_rate: number;
  accumulated_rewards: number;
}

interface TokenStakingWidgetProps {
  onViewAll: () => void;
}

export default function TokenStakingWidget({ onViewAll }: TokenStakingWidgetProps) {
  const { profile } = useAuth();
  const [stakedTokens, setStakedTokens] = useState<StakedToken[]>([]);
  const [totalStaked, setTotalStaked] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{duration: number; rate: number; minAmount: number} | null>(null);
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

      console.log('Stakes found:', data);
      setStakedTokens(data || []);
      
      const staked = data?.reduce((sum, s) => sum + s.amount, 0) || 0;
      const rewards = data?.reduce((sum, s) => sum + (s.accumulated_rewards || 0), 0) || 0;
      
      console.log('Total staked:', staked, 'Total rewards:', rewards);
      setTotalStaked(staked);
      setTotalRewards(rewards);
    } catch (error) {
      console.error('Error fetching staking data:', error);
      toast.error('Failed to load staking data');
    } finally {
      setLoading(false);
    }
  };

  const stakingPlans = [
    {
      duration: '7 Days',
      durationDays: 7,
      rate: '5% APY',
      ratePercent: 5,
      minAmount: 100,
      icon: '⚡',
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    },
    {
      duration: '30 Days',
      durationDays: 30,
      rate: '12% APY',
      ratePercent: 12,
      minAmount: 500,
      icon: '🔥',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30'
    },
    {
      duration: '90 Days',
      durationDays: 90,
      rate: '25% APY',
      ratePercent: 25,
      minAmount: 1000,
      icon: '💎',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    }
  ];

  const handleStake = async () => {
    if (!profile || !selectedPlan) return;

    const amount = parseInt(stakeAmount);
    const balance = profile.token_balance || 0;

    if (isNaN(amount) || amount < selectedPlan.minAmount) {
      toast.error(`Minimum stake amount is ${selectedPlan.minAmount} tokens`);
      return;
    }

    if (amount > balance) {
      toast.error('Insufficient token balance');
      return;
    }

    try {
      setLoading(true);

      // Calculate unlock date
      const now = new Date();
      const unlockDate = new Date();
      unlockDate.setDate(unlockDate.getDate() + selectedPlan.duration);

      // Create staking record with all required fields
      const { data: stakeData, error: stakeError } = await supabase
        .from('token_staking')
        .insert({
          user_id: profile.id,
          amount: amount,
          staked_at: now.toISOString(),
          unlock_date: unlockDate.toISOString(),
          reward_rate: selectedPlan.rate / 100, // Convert percentage to decimal
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

      // Deduct tokens from balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ token_balance: balance - amount })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: profile.id,
        amount: -amount,
        type: 'staking',
        description: `Staked ${amount} tokens for ${selectedPlan.duration} days`,
      });

      toast.success(`✅ Successfully staked ${amount} tokens for ${selectedPlan.duration} days!`);
      setShowStakeModal(false);
      setStakeAmount('');
      setSelectedPlan(null);
      
      // Refresh data immediately
      await fetchStakingData();
    } catch (error: any) {
      console.error('Staking error:', error);
      toast.error(error.message || 'Failed to stake tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (stakeId: string, amount: number, rewards: number) => {
    if (!profile) return;

    try {
      setLoading(true);

      // Mark stake as inactive
      const { error: stakeError } = await supabase
        .from('token_staking')
        .update({ is_active: false })
        .eq('id', stakeId);

      if (stakeError) throw stakeError;

      // Return tokens + rewards to balance
      const currentBalance = profile.token_balance || 0;
      const totalReturn = amount + rewards;

      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ token_balance: currentBalance + totalReturn })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: profile.id,
        amount: totalReturn,
        type: 'unstaking',
        description: `Unstaked ${amount} tokens + ${rewards} rewards`,
      });

      toast.success(`Unstaked ${amount} tokens and claimed ${rewards} rewards!`);
      fetchStakingData();
    } catch (error: any) {
      console.error('Unstaking error:', error);
      toast.error(error.message || 'Failed to unstake tokens');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeRemaining = (unlockDate: string) => {
    const now = new Date().getTime();
    const unlock = new Date(unlockDate).getTime();
    const diff = unlock - now;

    if (diff <= 0) return 'Ready to claim';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#202225] animate-pulse">
        <div className="h-64 bg-[#202225] rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Token Staking</h3>
            <p className="text-sm text-gray-400">Earn passive rewards</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
        >
          <span>Manage</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Total Staked</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalStaked.toLocaleString()}</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Pending Rewards</span>
          </div>
          <p className="text-2xl font-bold text-green-400">+{totalRewards.toLocaleString()}</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Active Positions</span>
          </div>
          <p className="text-2xl font-bold text-white">{stakedTokens.length}</p>
        </div>
      </div>

      {/* Staking Plans */}
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-3">Available Staking Plans</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stakingPlans.map((plan, index) => (
            <div
              key={index}
              className={`${plan.bgColor} border ${plan.borderColor} rounded-xl p-4 hover:scale-105 transition-transform cursor-pointer`}
            >
              <div className="text-center mb-3">
                <div className="text-3xl mb-2">{plan.icon}</div>
                <h5 className="text-white font-bold">{plan.duration}</h5>
                <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  {plan.rate}
                </p>
              </div>
              <div className="space-y-2 text-xs text-gray-400">
                <p>Min: {plan.minAmount} tokens</p>
                <button
                  onClick={() => {
                    setSelectedPlan({ duration: plan.durationDays, rate: plan.ratePercent, minAmount: plan.minAmount });
                    setShowStakeModal(true);
                  }}
                  className={`w-full py-2 bg-gradient-to-r ${plan.color} text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1`}
                >
                  <Lock className="w-3 h-3" />
                  Stake Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Stakes */}
      {stakedTokens.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-3">Your Active Stakes</h4>
          <div className="space-y-2">
            {stakedTokens.slice(0, 2).map((stake) => (
              <div
                key={stake.id}
                className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{stake.amount.toLocaleString()} tokens</p>
                    <p className="text-xs text-gray-500">
                      Staked {new Date(stake.staked_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">+{stake.accumulated_rewards.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                      <Clock className="w-3 h-3" />
                      {calculateTimeRemaining(stake.unlock_date)}
                    </div>
                    {new Date(stake.unlock_date).getTime() <= Date.now() && (
                      <button
                        onClick={() => handleUnstake(stake.id, stake.amount, stake.accumulated_rewards)}
                        className="text-xs px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md font-semibold"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <p className="text-xs text-purple-300">
          💡 <span className="font-bold">Lock your tokens</span> to earn passive rewards. Longer locks = higher APY!
        </p>
      </div>

      {/* Stake Modal */}
      {showStakeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowStakeModal(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#202225] max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-2">Stake Tokens</h3>
            <p className="text-gray-400 mb-6">Lock your tokens for {selectedPlan.duration} days to earn {selectedPlan.rate}% APY</p>
            
            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225] mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Amount to Stake</label>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder={`Min: ${selectedPlan.minAmount} tokens`}
                className="w-full bg-[#1a1a1a] border border-[#202225] rounded-lg px-4 py-3 text-white focus:border-[#8B5CF6] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">Available: {profile?.token_balance?.toLocaleString() || 0} tokens</p>
            </div>

            {stakeAmount && parseInt(stakeAmount) >= selectedPlan.minAmount && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-300">
                  <span className="font-bold">Estimated rewards:</span> +{Math.round(parseInt(stakeAmount) * (selectedPlan.rate / 100))} tokens after {selectedPlan.duration} days
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStakeModal(false);
                  setStakeAmount('');
                  setSelectedPlan(null);
                }}
                className="flex-1 px-6 py-3 bg-[#0f0f0f] hover:bg-[#1a1a1a] text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStake}
                disabled={!stakeAmount || parseInt(stakeAmount) < selectedPlan.minAmount}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" />
                Stake Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

