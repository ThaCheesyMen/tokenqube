import { useState } from 'react';
import { CreditCard, Bitcoin, X, Coins, Shield, Zap, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from './Toast';

interface UnifiedPaymentModalProps {
  show: boolean;
  onClose: () => void;
  tokensNeeded: number;
  purpose?: string;
  onSuccess?: () => void;
}

export default function UnifiedPaymentModal({ 
  show, 
  onClose, 
  tokensNeeded,
  purpose = 'Purchase',
  onSuccess 
}: UnifiedPaymentModalProps) {
  const { profile } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'crypto'>('crypto');
  const [loading, setLoading] = useState(false);
  
  const usdAmount = tokensNeeded / 100; // 100 tokens = $1
  const cryptoFee = usdAmount * 0.005; // 0.5% fee
  const cardFee = usdAmount * 0.029 + 0.30; // 2.9% + $0.30 fee
  const savings = cardFee - cryptoFee;
  
  const handlePayment = async () => {
    if (!profile) {
      toast.error('Please log in to continue');
      return;
    }
    
    setLoading(true);
    try {
      if (selectedMethod === 'crypto') {
        // Redirect to crypto wallet with pre-filled amount
        const cryptoUrl = new URL('/crypto-wallet', window.location.origin);
        cryptoUrl.hash = '';
        cryptoUrl.searchParams.set('amount', usdAmount.toString());
        cryptoUrl.searchParams.set('tokens', tokensNeeded.toString());
        window.location.href = cryptoUrl.toString();
      } else {
        // Redirect to Stripe wallet with pre-filled amount
        const stripeUrl = new URL('/wallet', window.location.origin);
        stripeUrl.hash = '';
        stripeUrl.searchParams.set('amount', usdAmount.toString());
        stripeUrl.searchParams.set('tokens', tokensNeeded.toString());
        window.location.href = stripeUrl.toString();
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      toast.success('Redirecting to payment...');
      onClose();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#202225]">
          <h3 className="text-xl font-bold text-white">{purpose}</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-[#2f3136] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Amount Needed */}
          <div className="bg-gradient-to-r from-[#8B5CF6]/20 to-[#0f0f0f] rounded-lg p-6 mb-6 text-center border border-[#8B5CF6]/30">
            <p className="text-gray-400 text-sm mb-2">Amount</p>
            <div className="flex items-center justify-center gap-3 mb-2">
              <Coins className="w-8 h-8 text-yellow-500" />
              <p className="text-5xl font-bold text-white">{tokensNeeded.toLocaleString()}</p>
            </div>
            <p className="text-lg text-gray-300 font-semibold">≈ ${usdAmount.toFixed(2)} USD</p>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3 mb-6">
            {/* Crypto - RECOMMENDED */}
            <button
              onClick={() => setSelectedMethod('crypto')}
              className={`w-full p-5 rounded-xl border-2 transition-all ${
                selectedMethod === 'crypto'
                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 shadow-lg shadow-[#8B5CF6]/20'
                  : 'border-[#202225] hover:border-[#8B5CF6]/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Bitcoin className="w-6 h-6 text-orange-500" />
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-bold">Pay with Crypto</p>
                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">BTC, ETH, USDT, and 200+ more</p>
                </div>
                {selectedMethod === 'crypto' && (
                  <CheckCircle className="w-6 h-6 text-[#8B5CF6]" />
                )}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#202225]">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-400">0.5% fee · Instant</span>
                </div>
                <div className="text-right">
                  <p className="text-green-500 font-bold text-sm">${(usdAmount + cryptoFee).toFixed(2)}</p>
                </div>
              </div>
            </button>

            {/* Card */}
            <button
              onClick={() => setSelectedMethod('card')}
              className={`w-full p-5 rounded-xl border-2 transition-all ${
                selectedMethod === 'card'
                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 shadow-lg shadow-[#8B5CF6]/20'
                  : 'border-[#202225] hover:border-[#8B5CF6]/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CreditCard className="w-6 h-6 text-green-500" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-bold mb-1">Pay with Card</p>
                  <p className="text-xs text-gray-400">Credit or Debit Card</p>
                </div>
                {selectedMethod === 'card' && (
                  <CheckCircle className="w-6 h-6 text-[#8B5CF6]" />
                )}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#202225]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-gray-400">2.9% + $0.30 fee</span>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 font-bold text-sm">${(usdAmount + cardFee).toFixed(2)}</p>
                </div>
              </div>
            </button>
          </div>

          {/* Savings Indicator */}
          {savings > 0.01 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Zap className="w-4 h-4" />
                <span>
                  <strong>Save ${savings.toFixed(2)}</strong> by paying with crypto!
                </span>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white rounded-lg font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {selectedMethod === 'crypto' ? <Bitcoin className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                Continue with {selectedMethod === 'crypto' ? 'Crypto' : 'Card'}
              </>
            )}
          </button>

          {/* Security Note */}
          <div className="mt-6 flex items-center gap-2 justify-center text-xs text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secure payment processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

