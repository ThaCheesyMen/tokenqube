import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, Lock, Unlock, Coins, AlertCircle, CheckCircle, Clock, Zap
} from 'lucide-react';
import { toast } from './Toast';
import { formatTokens } from '../utils/formatTokens';

interface StakeRecord {
  id: string;
  crypto_currency: string;
  crypto_amount_usd: number;
  crypto_amount: string;
  apy_rate: number;
  tokens_per_day: number;
  staked_at: string;
  status: string;
  total_tokens_earned: number;
  last_reward_at: string;
}

export default function CryptoStakingSection() {
  const { profile } = useAuth();
  const [selectedCrypto, setSelectedCrypto] = useState<'BTC' | 'ETH' | 'USDT'>('USDT');
  const [stakingAmount, setStakingAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [userStakes, setUserStakes] = useState<StakeRecord[]>([]);

  const stakingOptions = [
    {
      crypto: 'USDT' as const,
      name: 'Tether (USDT)',
      apy: 12.0,
      icon: '₮',
      color: 'from-green-500 to-emerald-600',
      minStake: 10
    },
    {
      crypto: 'BTC' as const,
      name: 'Bitcoin (BTC)',
      apy: 8.0,
      icon: '₿',
      color: 'from-orange-500 to-yellow-600',
      minStake: 50
    },
    {
      crypto: 'ETH' as const,
      name: 'Ethereum (ETH)',
      apy: 10.0,
      icon: 'Ξ',
      color: 'from-blue-500 to-cyan-600',
      minStake: 25
    }
  ];

  useEffect(() => {
    if (profile) {
      fetchUserStakes();
    }
  }, [profile]);

  const fetchUserStakes = async () => {
    if (!profile) return;

    console.log('Fetching stakes for user:', profile.id);
    
    const { data, error } = await supabase
      .from('crypto_staking')
      .select('*')
      .eq('user_id', profile.id)
      .order('staked_at', { ascending: false });

    if (error) {
      console.error('Error fetching stakes:', error);
      toast.error('Failed to load stakes');
      return;
    }

    console.log('Stakes fetched:', data);
    setUserStakes(data || []);
  };

  const calculateDailyTokens = (usdAmount: number, apy: number) => {
    // Daily tokens = (USD amount * APY) / 365 days / $0.01 per token
    return Math.floor((usdAmount * (apy / 100)) / 365 / 0.01);
  };

  const handleStake = async () => {
    if (!profile) {
      toast.error('Please log in to stake');
      return;
    }

    const amount = parseFloat(stakingAmount);
    const option = stakingOptions.find(o => o.crypto === selectedCrypto);

    if (!amount || amount < (option?.minStake || 10)) {
      toast.error(`Minimum stake is $${option?.minStake}`);
      return;
    }

    setLoading(true);
    try {
      const tokensPerDay = calculateDailyTokens(amount, option?.apy || 10);

      // Create staking record with explicit timestamps
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('crypto_staking')
        .insert([{
          user_id: profile.id,
          crypto_currency: selectedCrypto,
          crypto_amount_usd: amount,
          crypto_amount: `${amount} ${selectedCrypto}`,
          apy_rate: option?.apy || 10,
          tokens_per_day: tokensPerDay,
          status: 'active',
          staked_at: now,
          last_reward_at: now,
          total_tokens_earned: 0
        }])
        .select()
        .single();

      if (error) {
        console.error('Staking error:', error);
        throw error;
      }

      console.log('Stake created:', data);
      toast.success(`✅ Staked $${amount} ${selectedCrypto}! Earning ${tokensPerDay} tokens daily!`);
      setStakingAmount('');
      
      // Refresh stakes list
      await fetchUserStakes();
    } catch (error: any) {
      console.error('Error staking:', error);
      toast.error(error.message || 'Failed to create stake');
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (stakeId: string) => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crypto_staking')
        .update({ 
          status: 'unstaking',
          unstake_requested_at: new Date().toISOString()
        })
        .eq('id', stakeId)
        .eq('user_id', profile.id);

      if (error) throw error;

      toast.success('Unstaking initiated! Your crypto will be returned within 24 hours.');
      fetchUserStakes();
    } catch (error) {
      console.error('Error unstaking:', error);
      toast.error('Failed to unstake');
    } finally {
      setLoading(false);
    }
  };

  const option = stakingOptions.find(o => o.crypto === selectedCrypto);
  const estimatedDaily = stakingAmount ? calculateDailyTokens(parseFloat(stakingAmount) || 0, option?.apy || 10) : 0;
  const estimatedMonthly = estimatedDaily * 30;
  const estimatedYearly = estimatedDaily * 365;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-[#8B5CF6]" />
          Crypto Staking
        </h2>
        <p className="text-gray-400">Stake crypto, earn platform tokens automatically every day!</p>
      </div>

      {/* Staking Options Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stakingOptions.map((opt) => (
          <button
            key={opt.crypto}
            onClick={() => setSelectedCrypto(opt.crypto)}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedCrypto === opt.crypto
                ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 shadow-lg shadow-[#8B5CF6]/20'
                : 'border-[#202225] hover:border-[#8B5CF6]/50 bg-[#1a1a1a]'
            }`}
          >
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${opt.color} flex items-center justify-center text-4xl mb-4 mx-auto`}>
              {opt.icon}
            </div>
            <h3 className="text-white font-bold text-lg mb-2">{opt.name}</h3>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-2">
              {opt.apy}% APY
            </div>
            <p className="text-gray-400 text-sm">Min: ${opt.minStake}</p>
          </button>
        ))}
      </div>

      {/* Staking Form */}
      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
        <h3 className="text-white font-bold text-lg mb-4">Stake {selectedCrypto}</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-400 mb-2">
            Amount (USD)
          </label>
          <input
            type="number"
            value={stakingAmount}
            onChange={(e) => setStakingAmount(e.target.value)}
            min={option?.minStake}
            placeholder={`Minimum $${option?.minStake}`}
            className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white text-lg focus:border-[#8B5CF6] focus:outline-none"
          />
        </div>

        {/* Earnings Calculator */}
        {estimatedDaily > 0 && (
          <div className="bg-[#0f0f0f] rounded-lg p-4 mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Daily Earnings:</span>
              <span className="text-white font-bold">{formatTokens(estimatedDaily)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Monthly Earnings:</span>
              <span className="text-green-400 font-bold">{formatTokens(estimatedMonthly)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Yearly Earnings:</span>
              <span className="text-yellow-400 font-bold text-lg">{formatTokens(estimatedYearly)}</span>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-semibold mb-1">How Staking Works:</p>
              <ul className="space-y-1 text-xs text-blue-200">
                <li>• Stake crypto to earn platform tokens daily</li>
                <li>• Rewards calculated automatically every 24 hours</li>
                <li>• Unstake anytime - crypto returned within 24h</li>
                <li>• No lock-up period, withdraw whenever you want</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={handleStake}
          disabled={loading || !stakingAmount || parseFloat(stakingAmount) < (option?.minStake || 10)}
          className="w-full px-6 py-4 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="w-6 h-6" />
              Stake ${stakingAmount || '0'} {selectedCrypto}
            </>
          )}
        </button>
      </div>

      {/* Active Stakes */}
      {userStakes.length > 0 && (
        <div>
          <h3 className="text-white font-bold text-xl mb-4">Your Active Stakes</h3>
          <div className="space-y-4">
            {userStakes.map((stake) => {
              const daysSinceStake = Math.floor((Date.now() - new Date(stake.staked_at).getTime()) / (1000 * 60 * 60 * 24));
              const projectedEarnings = stake.tokens_per_day * daysSinceStake;

              return (
                <div key={stake.id} className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#8B5CF6]/20 rounded-lg">
                        <Lock className="w-6 h-6 text-[#8B5CF6]" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-lg">{stake.crypto_amount}</h4>
                        <p className="text-gray-400 text-sm">{stake.apy_rate}% APY</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      stake.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      stake.status === 'unstaking' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {stake.status.toUpperCase()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Daily Reward</p>
                      <p className="text-white font-bold">{formatTokens(stake.tokens_per_day)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Total Earned</p>
                      <p className="text-green-400 font-bold">{formatTokens(stake.total_tokens_earned)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Staked For</p>
                      <p className="text-white font-bold">{daysSinceStake} days</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Projected</p>
                      <p className="text-yellow-400 font-bold">{formatTokens(projectedEarnings)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>Staked on {new Date(stake.staked_at).toLocaleDateString()}</span>
                    <span className="mx-2">•</span>
                    <span>Last reward: {new Date(stake.last_reward_at).toLocaleTimeString()}</span>
                  </div>

                  {stake.status === 'active' && (
                    <button
                      onClick={() => handleUnstake(stake.id)}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Unlock className="w-5 h-5" />
                      Unstake & Withdraw
                    </button>
                  )}

                  {stake.status === 'unstaking' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-500" />
                      <p className="text-yellow-300 text-sm">Unstaking in progress... Your {stake.crypto_currency} will be returned within 24 hours.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="bg-gradient-to-br from-[#8B5CF6]/20 to-[#7C3AED]/20 rounded-xl p-6 border border-[#8B5CF6]/30">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#8B5CF6]" />
          Staking Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold text-sm">Passive Income</p>
              <p className="text-gray-300 text-xs">Earn tokens while you sleep</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold text-sm">No Lock-Up</p>
              <p className="text-gray-300 text-xs">Unstake anytime, no penalties</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold text-sm">Auto-Compound</p>
              <p className="text-gray-300 text-xs">Use earned tokens in marketplace</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold text-sm">High APY</p>
              <p className="text-gray-300 text-xs">Up to 12% annual returns</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

