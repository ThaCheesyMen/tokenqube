import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, TrendingUp, ShoppingCart, Wallet, ChevronRight, Sparkles } from 'lucide-react';

interface BuySellTokensWidgetProps {
  onViewAll: () => void;
}

export default function BuySellTokensWidget({ onViewAll }: BuySellTokensWidgetProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

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
                    className={`w-full py-2.5 rounded-lg font-semibold transition-all ${
                      pkg.popular
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:opacity-90'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90'
                    }`}
                  >
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
          <button className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity">
            Sell Tokens for Crypto
          </button>

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-300">
              💰 <span className="font-bold">Withdraw earnings</span> to BTC, ETH, or USDT wallet. Processing time: 1-24 hours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

