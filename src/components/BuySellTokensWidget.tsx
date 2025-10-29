import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DollarSign, TrendingUp, ShoppingCart, Wallet, ChevronRight, Sparkles, Bitcoin, CreditCard } from 'lucide-react';
import { toast } from './Toast';

interface BuySellTokensWidgetProps {
  onViewAll: () => void;
}

export default function BuySellTokensWidget({ onViewAll }: BuySellTokensWidgetProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellAmount, setSellAmount] = useState('');

  const tokenPackages = [
    {
      amount: 1000,
      price: 4.99,
      bonus: 0,
      popular: false,
      icon: '🪙'
    },
    {
      amount: 5000,
      price: 19.99,
      bonus: 500,
      popular: true,
      icon: '💰'
    },
    {
      amount: 10000,
      price: 34.99,
      bonus: 2000,
      popular: false,
      icon: '💎'
    }
  ];

  const currentTokenValue = profile?.token_balance || 0;
  const estimatedValue = (currentTokenValue * 0.004).toFixed(2); // $0.004 per token

  const handleBuyTokens = async () => {
    if (!profile || !selectedPackage) return;

    try {
      // Create a pending purchase record
      const { error: purchaseError } = await supabase
        .from('token_purchases')
        .insert({
          user_id: profile.id,
          amount: selectedPackage.amount + selectedPackage.bonus,
          price_usd: selectedPackage.price,
          payment_method: 'crypto',
          status: 'pending',
        });

      if (purchaseError) throw purchaseError;

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: profile.id,
        amount: selectedPackage.amount + selectedPackage.bonus,
        type: 'purchase',
        description: `Purchased ${selectedPackage.amount + selectedPackage.bonus} tokens for $${selectedPackage.price}`,
      });

      toast.success(`Purchase initiated! You'll receive ${(selectedPackage.amount + selectedPackage.bonus).toLocaleString()} tokens after payment confirmation.`);
      toast.info('Redirecting to payment gateway...', { duration: 3000 });
      
      setShowBuyModal(false);
      setSelectedPackage(null);

      // In a real implementation, redirect to payment gateway here
      // window.location.href = `https://payment-gateway.com/checkout?amount=${selectedPackage.price}`;
    } catch (error: any) {
      console.error('Buy tokens error:', error);
      toast.error(error.message || 'Failed to initiate purchase');
    }
  };

  const handleSellTokens = async () => {
    if (!profile) return;

    const amount = parseInt(sellAmount);
    const minWithdrawal = 1000;
    const platformFee = 0.05; // 5%

    if (isNaN(amount) || amount < minWithdrawal) {
      toast.error(`Minimum withdrawal is ${minWithdrawal} tokens`);
      return;
    }

    if (amount > currentTokenValue) {
      toast.error('Insufficient token balance');
      return;
    }

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
          crypto_address: 'pending', // User would provide this
          status: 'pending',
        });

      if (withdrawalError) throw withdrawalError;

      // Deduct tokens from balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ token_balance: currentTokenValue - amount })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: profile.id,
        amount: -amount,
        type: 'withdrawal',
        description: `Withdrew ${amount} tokens ($${usdValue} USD)`,
      });

      toast.success(`Withdrawal request submitted! You'll receive $${usdValue} after review (24-48h).`);
      setSellAmount('');
      setShowSellModal(false);
    } catch (error: any) {
      console.error('Sell tokens error:', error);
      toast.error(error.message || 'Failed to submit withdrawal request');
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Buy/Sell Tokens</h3>
            <p className="text-sm text-gray-400">Trade tokens with crypto</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
        >
          <span>Full Market</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'buy'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50'
              : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#1a1a1a]'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Buy Tokens
          </div>
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'sell'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
              : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#1a1a1a]'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Wallet className="w-5 h-5" />
            Sell Tokens
          </div>
        </button>
      </div>

      {/* Buy Tab */}
      {activeTab === 'buy' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tokenPackages.map((pkg, index) => (
              <div
                key={index}
                className={`relative bg-[#0f0f0f] rounded-xl p-4 border-2 transition-all cursor-pointer hover:scale-105 ${
                  pkg.popular
                    ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                    : 'border-[#202225] hover:border-green-500/50'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      POPULAR
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-3 pt-2">
                  <div className="text-4xl mb-2">{pkg.icon}</div>
                  <p className="text-2xl font-bold text-white">{pkg.amount.toLocaleString()}</p>
                  {pkg.bonus > 0 && (
                    <p className="text-xs text-green-400 font-semibold">
                      +{pkg.bonus.toLocaleString()} BONUS
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-400">${pkg.price}</p>
                    <p className="text-xs text-gray-500">
                      ${(pkg.price / (pkg.amount + pkg.bonus)).toFixed(4)} per token
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPackage(pkg);
                      setShowBuyModal(true);
                    }}
                    className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                      pkg.popular
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:opacity-90'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-xs text-green-300">
              💳 <span className="font-bold">Instant purchase</span> with crypto (BTC, ETH, USDT). No waiting!
            </p>
          </div>
        </div>
      )}

      {/* Sell Tab */}
      {activeTab === 'sell' && (
        <div className="space-y-4">
          {/* Current Balance */}
          <div className="bg-[#0f0f0f] rounded-xl p-6 border border-[#202225]">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Your Token Balance</p>
              <p className="text-4xl font-bold text-white mb-1">{currentTokenValue.toLocaleString()}</p>
              <p className="text-lg text-green-400">≈ ${estimatedValue} USD</p>
            </div>
          </div>

          {/* Sell Info */}
          <div className="bg-[#0f0f0f] rounded-xl p-6 border border-[#202225]">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-2">Exchange Rate</h4>
                <p className="text-sm text-gray-400 mb-3">
                  Current rate: <span className="text-blue-400 font-bold">$0.004 per token</span>
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Minimum withdrawal: 1,000 tokens ($4.00)</li>
                  <li>• 5% platform fee applies</li>
                  <li>• Instant payout to crypto wallet</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sell Button */}
          <button
            onClick={() => setShowSellModal(true)}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Bitcoin className="w-6 h-6" />
            Sell Tokens for Crypto
          </button>

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-300">
              💰 <span className="font-bold">Withdraw earnings</span> to BTC, ETH, or USDT wallet. Processing time: 1-24 hours.
            </p>
          </div>
        </div>
      )}

      {/* Buy Modal */}
      {showBuyModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowBuyModal(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#202225] max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-2">Purchase Tokens</h3>
            <p className="text-gray-400 mb-6">Complete your purchase with cryptocurrency</p>
            
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6 mb-6">
              <div className="text-center mb-4">
                <p className="text-4xl mb-2">{selectedPackage.icon}</p>
                <p className="text-4xl font-bold text-white">{(selectedPackage.amount + selectedPackage.bonus).toLocaleString()}</p>
                <p className="text-sm text-gray-400">tokens</p>
                {selectedPackage.bonus > 0 && (
                  <p className="text-sm text-green-400 font-semibold mt-1">
                    Includes {selectedPackage.bonus.toLocaleString()} bonus tokens!
                  </p>
                )}
              </div>
              <div className="bg-[#0f0f0f] rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Base amount:</span>
                  <span className="text-white font-semibold">{selectedPackage.amount.toLocaleString()} tokens</span>
                </div>
                {selectedPackage.bonus > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Bonus:</span>
                    <span className="text-green-400 font-semibold">+{selectedPackage.bonus.toLocaleString()} tokens</span>
                  </div>
                )}
                <div className="border-t border-[#202225] pt-2 flex justify-between">
                  <span className="text-white font-bold">Total:</span>
                  <span className="text-white font-bold">{(selectedPackage.amount + selectedPackage.bonus).toLocaleString()} tokens</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225] mb-6">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Bitcoin className="w-5 h-5 text-orange-500" />
                Payment Method
              </h4>
              <p className="text-sm text-gray-400 mb-3">Supported cryptocurrencies:</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="text-lg mb-1">₿</p>
                  <p className="text-xs text-gray-400">Bitcoin</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="text-lg mb-1">Ξ</p>
                  <p className="text-xs text-gray-400">Ethereum</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="text-lg mb-1">₮</p>
                  <p className="text-xs text-gray-400">USDT</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBuyModal(false);
                  setSelectedPackage(null);
                }}
                className="flex-1 px-6 py-3 bg-[#0f0f0f] hover:bg-[#1a1a1a] text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBuyTokens}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Pay ${selectedPackage.price}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSellModal(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#202225] max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-2">Withdraw Tokens</h3>
            <p className="text-gray-400 mb-6">Convert your earned tokens to cryptocurrency</p>
            
            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225] mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Amount to Withdraw</label>
              <input
                type="number"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder="Min: 1,000 tokens"
                className="w-full bg-[#1a1a1a] border border-[#202225] rounded-lg px-4 py-3 text-white focus:border-[#8B5CF6] focus:outline-none"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Available: {currentTokenValue.toLocaleString()} tokens</span>
                <button
                  onClick={() => setSellAmount(currentTokenValue.toString())}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Max
                </button>
              </div>
            </div>

            {sellAmount && parseInt(sellAmount) >= 1000 && (
              <div className="space-y-3 mb-6">
                <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tokens to withdraw:</span>
                      <span className="text-white font-semibold">{parseInt(sellAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Platform fee (5%):</span>
                      <span className="text-red-400 font-semibold">-{Math.floor(parseInt(sellAmount) * 0.05).toLocaleString()}</span>
                    </div>
                    <div className="border-t border-[#202225] pt-2 flex justify-between">
                      <span className="text-white font-bold">You'll receive:</span>
                      <span className="text-green-400 font-bold">
                        ${(Math.floor(parseInt(sellAmount) * 0.95) * 0.004).toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-300">
                    ⏱️ Processing time: 24-48 hours for security verification
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSellModal(false);
                  setSellAmount('');
                }}
                className="flex-1 px-6 py-3 bg-[#0f0f0f] hover:bg-[#1a1a1a] text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSellTokens}
                disabled={!sellAmount || parseInt(sellAmount) < 1000}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Bitcoin className="w-5 h-5" />
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

