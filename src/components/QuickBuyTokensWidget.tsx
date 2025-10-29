import { useState } from 'react';
import { ShoppingCart, Coins, Sparkles, CreditCard, Bitcoin, ChevronRight } from 'lucide-react';

interface QuickBuyTokensWidgetProps {
  onViewAll: () => void;
}

const QUICK_PACKAGES = [
  { amount: 10000, price: 10, bonus: 0, icon: '🪙', popular: false },
  { amount: 100000, price: 100, bonus: 20000, icon: '💰', popular: true },
  { amount: 500000, price: 500, bonus: 50000, icon: '💎', popular: false }
];

export default function QuickBuyTokensWidget({ onViewAll }: QuickBuyTokensWidgetProps) {
  const [hoveredPackage, setHoveredPackage] = useState<number | null>(null);

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Buy Tokens</h3>
            <p className="text-sm text-gray-400">Instant delivery with crypto or card</p>
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

      {/* Quick Packages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {QUICK_PACKAGES.map((pkg, index) => (
          <div
            key={index}
            onMouseEnter={() => setHoveredPackage(index)}
            onMouseLeave={() => setHoveredPackage(null)}
            className={`relative bg-[#0f0f0f] rounded-xl p-4 border-2 transition-all cursor-pointer hover:scale-105 ${
              pkg.popular
                ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                : hoveredPackage === index
                ? 'border-green-500/50'
                : 'border-[#202225]'
            }`}
            onClick={() => window.location.hash = '#/enhanced-token-economy'}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <Sparkles className="w-3 h-3" />
                  BEST VALUE
                </div>
              </div>
            )}
            
            <div className="text-center mb-3 pt-2">
              <div className="text-4xl mb-2">{pkg.icon}</div>
              <p className="text-2xl font-bold text-white">{pkg.amount.toLocaleString()}</p>
              {pkg.bonus > 0 && (
                <p className="text-xs text-green-400 font-semibold mt-1">
                  +{pkg.bonus.toLocaleString()} BONUS
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                = {(pkg.amount + pkg.bonus).toLocaleString()} total
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-center py-2 bg-[#1a1a1a] rounded-lg">
                <p className="text-3xl font-bold text-green-400">${pkg.price}</p>
                <p className="text-xs text-gray-500">
                  ${(pkg.price / (pkg.amount + pkg.bonus)).toFixed(4)} per token
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Methods */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-[#1a1a1a]">
                ₿
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-[#1a1a1a]">
                Ξ
              </div>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-[#1a1a1a]">
                ₮
              </div>
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-[#1a1a1a]">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-sm text-green-300 font-semibold">Multiple Payment Options</p>
              <p className="text-xs text-gray-400">Crypto & Credit Card accepted</p>
            </div>
          </div>
          <button
            onClick={() => window.location.hash = '#/enhanced-token-economy'}
            className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
          >
            <Coins className="w-5 h-5" />
            Buy Now
          </button>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 bg-[#0f0f0f] rounded-lg border border-[#202225]">
          <p className="text-green-400 font-bold">⚡ Instant</p>
          <p className="text-gray-500">Delivery</p>
        </div>
        <div className="p-2 bg-[#0f0f0f] rounded-lg border border-[#202225]">
          <p className="text-blue-400 font-bold">🔒 Secure</p>
          <p className="text-gray-500">Payment</p>
        </div>
        <div className="p-2 bg-[#0f0f0f] rounded-lg border border-[#202225]">
          <p className="text-purple-400 font-bold">🎁 Bonus</p>
          <p className="text-gray-500">Tokens</p>
        </div>
      </div>
    </div>
  );
}

