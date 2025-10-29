import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Wallet, TrendingUp, Bitcoin, ChevronRight, DollarSign, Clock, Shield } from 'lucide-react';
import { toast } from './Toast';

interface WithdrawTokensWidgetProps {
  onViewAll: () => void;
}

export default function WithdrawTokensWidget({ onViewAll }: WithdrawTokensWidgetProps) {
  const { profile } = useAuth();
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [showQuickWithdraw, setShowQuickWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const currentBalance = profile?.token_balance || 0;
  const estimatedValue = (currentBalance * 0.004).toFixed(2);
  const minWithdrawal = 10000;
  const canWithdraw = currentBalance >= minWithdrawal;

  useEffect(() => {
    if (profile) {
      fetchPendingWithdrawals();
    }
  }, [profile]);

  const fetchPendingWithdrawals = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('token_withdrawals')
      .select('amount')
      .eq('user_id', profile.id)
      .eq('status', 'pending');

    const pending = data?.reduce((sum, w) => sum + w.amount, 0) || 0;
    setPendingWithdrawals(pending);
  };

  const handleQuickWithdraw = async () => {
    if (!profile) return;

    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount < minWithdrawal) {
      toast.error(`Minimum withdrawal is ${minWithdrawal.toLocaleString()} tokens`);
      return;
    }

    if (amount > currentBalance) {
      toast.error('Insufficient balance');
      return;
    }

    const platformFee = 0.02; // 2%
    const amountAfterFee = Math.floor(amount * (1 - platformFee));
    const usdValue = (amountAfterFee * 0.004).toFixed(2);

    try {
      // Create withdrawal request
      const { error: withdrawalError } = await supabase
        .from('token_withdrawals')
        .insert({
          user_id: profile.id,
          amount: amount,
          amount_after_fee: amountAfterFee,
          fee_amount: amount - amountAfterFee,
          usd_value: parseFloat(usdValue),
          crypto_address: 'pending',
          status: 'pending',
        });

      if (withdrawalError) throw withdrawalError;

      // Deduct tokens
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ token_balance: currentBalance - amount })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      toast.success(`Withdrawal request submitted for $${usdValue}!`);
      setShowQuickWithdraw(false);
      setWithdrawAmount('');
      fetchPendingWithdrawals();
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Failed to submit withdrawal');
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Withdraw Earnings</h3>
            <p className="text-sm text-gray-400">Convert tokens to cryptocurrency</p>
          </div>
        </div>
          <button
            onClick={() => window.location.hash = '#/enhanced-token-economy'}
            className="flex items-center gap-1 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
      </div>

      {/* Balance Display */}
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-blue-300 font-medium">Your Token Balance</p>
          <TrendingUp className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-3 mb-2">
          <p className="text-4xl font-bold text-white">{currentBalance.toLocaleString()}</p>
          <span className="text-lg text-gray-400">tokens</span>
        </div>
        <p className="text-2xl font-bold text-green-400">≈ ${estimatedValue} USD</p>
        <p className="text-xs text-gray-500 mt-2">
          Exchange rate: $0.004 per token
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3 text-orange-400" />
            <p className="text-xs text-gray-400">Pending</p>
          </div>
          <p className="text-xl font-bold text-orange-400">{pendingWithdrawals.toLocaleString()}</p>
          <p className="text-xs text-gray-500">tokens</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-3 h-3 text-green-400" />
            <p className="text-xs text-gray-400">Available</p>
          </div>
          <p className="text-xl font-bold text-green-400">{(currentBalance - pendingWithdrawals).toLocaleString()}</p>
          <p className="text-xs text-gray-500">tokens</p>
        </div>
      </div>

      {/* Withdrawal Info */}
      {!showQuickWithdraw ? (
        <>
          <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225] mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-2">Withdrawal Info</h4>
                <ul className="text-xs text-gray-400 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Minimum: {minWithdrawal.toLocaleString()} tokens (${(minWithdrawal * 0.004).toFixed(2)})
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Platform fee: 2% per withdrawal
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Processing time: 1-24 hours
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Supported: BTC, ETH, USDT
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Withdraw Button */}
          <button
            onClick={() => canWithdraw ? setShowQuickWithdraw(true) : toast.error(`You need at least ${minWithdrawal.toLocaleString()} tokens to withdraw`)}
            disabled={!canWithdraw}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
              canWithdraw
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-blue-500/20'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Bitcoin className="w-6 h-6" />
            {canWithdraw ? 'Withdraw to Crypto' : `Need ${(minWithdrawal - currentBalance).toLocaleString()} More Tokens`}
          </button>
        </>
      ) : (
        /* Quick Withdraw Form */
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Amount to Withdraw</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder={`Min: ${minWithdrawal.toLocaleString()}`}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white text-xl font-bold focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Available: {currentBalance.toLocaleString()} tokens</span>
              <button
                onClick={() => setWithdrawAmount(currentBalance.toString())}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                MAX
              </button>
            </div>
          </div>

          {withdrawAmount && parseInt(withdrawAmount) >= minWithdrawal && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Withdraw amount:</span>
                  <span className="text-white font-semibold">{parseInt(withdrawAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Platform fee (2%):</span>
                  <span className="text-red-400">-{Math.floor(parseInt(withdrawAmount) * 0.02).toLocaleString()}</span>
                </div>
                <div className="border-t border-blue-500/30 pt-2 flex justify-between">
                  <span className="text-white font-bold">You receive:</span>
                  <span className="text-green-400 font-bold">
                    ${(Math.floor(parseInt(withdrawAmount) * 0.98) * 0.004).toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowQuickWithdraw(false);
                setWithdrawAmount('');
              }}
              className="flex-1 px-6 py-3 bg-[#0f0f0f] hover:bg-[#1a1a1a] text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleQuickWithdraw}
              disabled={!withdrawAmount || parseInt(withdrawAmount) < minWithdrawal}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Bitcoin className="w-5 h-5" />
              Withdraw
            </button>
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          💰 <span className="font-bold">Earn more tokens</span> by playing games, completing quests, and staking!
        </p>
      </div>
    </div>
  );
}

