import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Coins, TrendingUp, Clock, Gift, ChevronRight, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    if (profile) {
      fetchStakingData();
    }
  }, [profile]);

  const fetchStakingData = async () => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('token_staking')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true);

      setStakedTokens(data || []);
      
      const staked = data?.reduce((sum, s) => sum + s.amount, 0) || 0;
      const rewards = data?.reduce((sum, s) => sum + (s.accumulated_rewards || 0), 0) || 0;
      
      setTotalStaked(staked);
      setTotalRewards(rewards);
    } catch (error) {
      console.error('Error fetching staking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stakingPlans = [
    {
      duration: '7 Days',
      rate: '5% APY',
      minAmount: 100,
      icon: '⚡',
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    },
    {
      duration: '30 Days',
      rate: '12% APY',
      minAmount: 500,
      icon: '🔥',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30'
    },
    {
      duration: '90 Days',
      rate: '25% APY',
      minAmount: 1000,
      icon: '💎',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    }
  ];

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
      <div className="grid grid-cols-2 gap-4 mb-6">
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
            <span className="text-xs text-gray-400">Rewards Earned</span>
          </div>
          <p className="text-2xl font-bold text-green-400">+{totalRewards.toLocaleString()}</p>
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
                <button className={`w-full py-2 bg-gradient-to-r ${plan.color} text-white rounded-lg font-semibold hover:opacity-90 transition-opacity`}>
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
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {calculateTimeRemaining(stake.unlock_date)}
                    </div>
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
    </div>
  );
}

