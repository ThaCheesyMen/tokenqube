import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  CreditCard, DollarSign, Download, TrendingUp, Shield,
  CheckCircle, AlertCircle, Clock, ArrowRight, Coins,
  Wallet, Star, Zap, Award
} from 'lucide-react';
import { toast } from '../components/Toast';
import { formatTokens } from '../utils/formatTokens';

export default function StripeIntegration() {
  const { profile } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);

  // Token Packages (Buy with USD)
  const tokenPackages = [
    {
      id: 'starter',
      name: 'Starter Pack',
      tokens: 1000,
      price: 4.99,
      bonus: 0,
      popular: false
    },
    {
      id: 'popular',
      name: 'Popular Pack',
      tokens: 2500,
      price: 9.99,
      bonus: 500,
      popular: true
    },
    {
      id: 'premium',
      name: 'Premium Pack',
      tokens: 5000,
      price: 19.99,
      bonus: 1500,
      popular: false
    },
    {
      id: 'ultimate',
      name: 'Ultimate Pack',
      tokens: 10000,
      price: 34.99,
      bonus: 4000,
      popular: false
    }
  ];

  const handleBuyTokens = async (packageId: string) => {
    if (!profile) {
      toast.error('Please log in to purchase tokens');
      return;
    }

    const pkg = tokenPackages.find(p => p.id === packageId);
    if (!pkg) return;

    setLoading(true);
    try {
      // In production, create Stripe Checkout Session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          user_id: profile.id,
          package_id: pkg.id,
          amount: pkg.price,
          tokens: pkg.tokens + pkg.bonus
        }
      });

      if (error) throw error;

      // Redirect to Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        // For demo: Simulate purchase
        toast.success(`Would redirect to Stripe to pay $${pkg.price}`);
        
        // In production, this happens via webhook after payment
        await supabase
          .from('token_purchases')
          .insert([{
            user_id: profile.id,
            package_id: pkg.id,
            tokens_purchased: pkg.tokens + pkg.bonus,
            payment_method: 'stripe',
            payment_status: 'completed'
          }]);

        // Add tokens to user
        await supabase.rpc('add_tokens', {
          user_id: profile.id,
          amount: pkg.tokens + pkg.bonus
        });

        toast.success(`${formatTokens(pkg.tokens + pkg.bonus)} tokens added!`);
      }
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      toast.error('Failed to initiate purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!profile) {
      toast.error('Please log in');
      return;
    }

    if (withdrawAmount < 1000) {
      toast.error('Minimum withdrawal is 1,000 tokens ($10)');
      return;
    }

    if (withdrawAmount > (profile.token_balance || 0)) {
      toast.error('Insufficient token balance');
      return;
    }

    setLoading(true);
    try {
      // In production, create Stripe Transfer
      const usdAmount = withdrawAmount / 100; // 100 tokens = $1

      const { error } = await supabase
        .from('token_withdrawals')
        .insert([{
          user_id: profile.id,
          tokens_withdrawn: withdrawAmount,
          usd_amount: usdAmount,
          withdrawal_method: 'stripe',
          withdrawal_status: 'pending'
        }]);

      if (error) throw error;

      // Deduct tokens
      await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - withdrawAmount })
        .eq('id', profile.id);

      toast.success(`Withdrawal request for $${usdAmount.toFixed(2)} submitted! Processing within 3-5 business days.`);
      setWithdrawAmount(0);
    } catch (error) {
      console.error('Error withdrawing:', error);
      toast.error('Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0f0f0f]">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-[#8B5CF6]" />
              Wallet & Payments
            </h1>
            <p className="text-gray-400">Buy tokens or withdraw earnings</p>
          </div>
        </div>

        {/* Current Balance */}
        <div className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] rounded-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 mb-2">Your Token Balance</p>
              <p className="text-5xl font-bold mb-1">{formatTokens(profile?.token_balance || 0)}</p>
              <p className="text-white/60 text-sm">
                ≈ ${((profile?.token_balance || 0) / 100).toFixed(2)} USD
              </p>
            </div>
            <Coins className="w-24 h-24 text-white/20" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Buy Tokens */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[#8B5CF6]" />
              Buy Tokens
            </h2>
            <p className="text-gray-400 mb-6">Purchase tokens with your credit card via Stripe</p>

            <div className="space-y-4">
              {tokenPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`bg-[#1a1a1a] rounded-xl p-6 border-2 transition-all cursor-pointer ${
                    selectedPackage === pkg.id
                      ? 'border-[#8B5CF6]'
                      : 'border-[#202225] hover:border-[#8B5CF6]/50'
                  } ${pkg.popular ? 'relative' : ''}`}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#8B5CF6] text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      BEST VALUE
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-bold text-lg">{pkg.name}</h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {formatTokens(pkg.tokens)} {pkg.bonus > 0 && (
                          <span className="text-green-500 font-semibold">
                            + {formatTokens(pkg.bonus)} Bonus!
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">${pkg.price}</p>
                      <p className="text-xs text-gray-500">USD</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuyTokens(pkg.id);
                    }}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    Buy Now
                  </button>
                </div>
              ))}
            </div>

            {/* Payment Info */}
            <div className="mt-6 bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold mb-1">Secure Payment via Stripe</p>
                  <p className="text-gray-400 text-sm">
                    Your payment information is encrypted and secure. We never store your card details.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Withdraw Earnings */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Download className="w-6 h-6 text-[#8B5CF6]" />
              Withdraw Earnings
            </h2>
            <p className="text-gray-400 mb-6">Convert your tokens to real money</p>

            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] mb-4">
              <label className="block text-sm font-semibold text-gray-400 mb-3">
                Withdrawal Amount (Tokens)
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
                min={1000}
                max={profile?.token_balance || 0}
                placeholder="Enter amount..."
                className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white text-lg focus:border-[#8B5CF6] focus:outline-none mb-3"
              />

              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-gray-400">You will receive:</span>
                <span className="text-white font-bold text-lg">
                  ${(withdrawAmount / 100).toFixed(2)} USD
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Exchange Rate:</span>
                <span>100 tokens = $1 USD</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>Minimum Withdrawal:</span>
                <span>1,000 tokens ($10)</span>
              </div>

              <button
                onClick={handleWithdraw}
                disabled={loading || withdrawAmount < 1000 || withdrawAmount > (profile?.token_balance || 0)}
                className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="w-6 h-6" />
                Withdraw ${(withdrawAmount / 100).toFixed(2)}
              </button>
            </div>

            {/* Withdrawal Info */}
            <div className="space-y-4">
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold mb-1">Processing Time</p>
                    <p className="text-gray-400 text-sm">
                      Withdrawals are processed within 3-5 business days to your Stripe account or bank.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold mb-1">Requirements</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Minimum: 1,000 tokens ($10 USD)</li>
                      <li>• Valid payment method connected</li>
                      <li>• Account verified</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#8B5CF6]/20 to-[#0f0f0f] rounded-xl p-6 border border-[#8B5CF6]/30">
                <div className="flex items-start gap-3">
                  <Award className="w-6 h-6 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold mb-2">Earn More Tokens!</p>
                    <p className="text-gray-400 text-sm mb-3">
                      Increase your earnings by:
                    </p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Selling items in the marketplace
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Winning auctions and tournaments
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Completing daily quests
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Referring friends
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

