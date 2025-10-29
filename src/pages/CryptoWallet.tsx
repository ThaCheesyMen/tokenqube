import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Wallet, DollarSign, Download, TrendingUp, Shield,
  CheckCircle, AlertCircle, Clock, Coins, Bitcoin,
  Star, Zap, Award, Copy, ExternalLink, QrCode, Lock, Unlock
} from 'lucide-react';
import { toast } from '../components/Toast';
import { formatTokens } from '../utils/formatTokens';
import CryptoStakingSection from '../components/CryptoStakingSection';

interface CryptoPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  bonus: number;
  popular: boolean;
}

interface PaymentStatus {
  payment_id: string;
  status: 'waiting' | 'confirming' | 'confirmed' | 'failed';
  crypto_amount: number;
  crypto_currency: string;
  address: string;
  qr_code?: string;
}

export default function CryptoWallet() {
  const { profile } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<'BTC' | 'ETH' | 'USDT' | 'LTC' | 'DOGE'>('USDT');
  const [activeTab, setActiveTab] = useState<'buy' | 'withdraw' | 'staking'>('buy');
  const [stakingAmount, setStakingAmount] = useState('');
  const [selectedStakeCrypto, setSelectedStakeCrypto] = useState<'BTC' | 'ETH' | 'USDT'>('USDT');
  const [userStakes, setUserStakes] = useState<any[]>([]);

  // Token Packages (Buy with Crypto)
  const tokenPackages: CryptoPackage[] = [
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

  const cryptoOptions = [
    { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: 'text-orange-500' },
    { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'text-blue-500' },
    { symbol: 'USDT', name: 'Tether', icon: '₮', color: 'text-green-500' },
    { symbol: 'LTC', name: 'Litecoin', icon: 'Ł', color: 'text-gray-400' },
    { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', color: 'text-yellow-500' }
  ];

  useEffect(() => {
    // Check for payment status in URL (after redirect from payment gateway)
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id');
    
    if (paymentId) {
      checkPaymentStatus(paymentId);
    }

    // Fetch user stakes
    if (profile) {
      fetchUserStakes();
    }
  }, [profile]);

  const fetchUserStakes = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('crypto_staking')
      .select('*')
      .eq('user_id', profile.id)
      .order('staked_at', { ascending: false });

    if (data) {
      setUserStakes(data);
    }
  };

  const handleBuyTokens = async (packageId: string) => {
    if (!profile) {
      toast.error('Please log in to purchase tokens');
      return;
    }

    const pkg = tokenPackages.find(p => p.id === packageId);
    if (!pkg) return;

    setLoading(true);
    setSelectedPackage(packageId);
    
    try {
      console.log('Creating crypto payment for package:', pkg.name);
      
      // Call Supabase Edge Function to create crypto payment
      const { data, error } = await supabase.functions.invoke('create-crypto-payment', {
        body: {
          user_id: profile.id,
          amount: pkg.price,
          tokens: pkg.tokens + pkg.bonus,
          crypto_currency: selectedCrypto
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        // If edge function not deployed, show test payment modal
        toast.info('🧪 Test Mode: Payment gateway opening...');
        
        // Create mock payment for testing
        setPaymentStatus({
          payment_id: `test_${Date.now()}`,
          status: 'waiting',
          crypto_amount: pkg.price,
          crypto_currency: selectedCrypto,
          address: `${selectedCrypto}-TEST-ADDRESS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          qr_code: `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${selectedCrypto}:test-address`
        });
        
        toast.success('✅ Payment modal opened (Test Mode)');
        return;
      }

      if (data?.payment_id && data?.payment_address) {
        console.log('Payment created:', data);
        
        // Show payment details
        setPaymentStatus({
          payment_id: data.payment_id,
          status: 'waiting',
          crypto_amount: data.crypto_amount,
          crypto_currency: data.crypto_currency,
          address: data.payment_address,
          qr_code: data.qr_code_url
        });

        // Start polling for payment confirmation
        pollPaymentStatus(data.payment_id);
        toast.success('✅ Payment gateway opened!');
      } else {
        throw new Error('Invalid payment response');
      }

    } catch (error: any) {
      console.error('Error creating crypto payment:', error);
      toast.error(error.message || 'Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-crypto-payment', {
        body: { payment_id: paymentId }
      });

      if (error) throw error;

      if (data.status === 'confirmed') {
        toast.success('Payment confirmed! Tokens added to your account!');
        setPaymentStatus(null);
      } else if (data.status === 'failed') {
        toast.error('Payment failed or expired. Please try again.');
        setPaymentStatus(null);
      } else {
        setPaymentStatus(prev => prev ? { ...prev, status: data.status } : null);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  const pollPaymentStatus = (paymentId: string) => {
    const interval = setInterval(async () => {
      await checkPaymentStatus(paymentId);
      
      // Stop polling if payment is confirmed or failed
      if (paymentStatus?.status === 'confirmed' || paymentStatus?.status === 'failed') {
        clearInterval(interval);
      }
    }, 5000); // Check every 5 seconds

    // Stop polling after 30 minutes
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
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
      const usdAmount = withdrawAmount / 100; // 100 tokens = $1

      const { error } = await supabase
        .from('token_withdrawals')
        .insert([{
          user_id: profile.id,
          tokens_withdrawn: withdrawAmount,
          usd_amount: usdAmount,
          withdrawal_method: 'crypto',
          withdrawal_status: 'pending'
        }]);

      if (error) throw error;

      // Deduct tokens
      await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - withdrawAmount })
        .eq('id', profile.id);

      toast.success(`Withdrawal request for $${usdAmount.toFixed(2)} submitted! You'll receive crypto within 24 hours.`);
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
              <Bitcoin className="w-8 h-8 text-[#8B5CF6]" />
              Crypto Wallet
            </h1>
            <p className="text-gray-400">Buy tokens with cryptocurrency - Lower fees, instant settlement!</p>
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

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-[#202225] pb-2">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all rounded-t-lg ${
              activeTab === 'buy'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-gray-400 hover:text-gray-300 hover:bg-[#1a1a1a]'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Buy Tokens
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all rounded-t-lg ${
              activeTab === 'withdraw'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-gray-400 hover:text-gray-300 hover:bg-[#1a1a1a]'
            }`}
          >
            <Download className="w-5 h-5" />
            Withdraw
          </button>
          <button
            onClick={() => setActiveTab('staking')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all rounded-t-lg ${
              activeTab === 'staking'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-gray-400 hover:text-gray-300 hover:bg-[#1a1a1a]'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Staking
          </button>
        </div>

        {/* Payment Modal */}
        {paymentStatus && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] w-full max-w-lg p-6">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Bitcoin className="w-6 h-6 text-[#8B5CF6]" />
                Send {paymentStatus.crypto_currency}
              </h3>

              {/* Payment Status */}
              <div className={`mb-6 p-4 rounded-lg border-2 ${
                paymentStatus.status === 'waiting' ? 'border-yellow-500 bg-yellow-500/10' :
                paymentStatus.status === 'confirming' ? 'border-blue-500 bg-blue-500/10' :
                paymentStatus.status === 'confirmed' ? 'border-green-500 bg-green-500/10' :
                'border-red-500 bg-red-500/10'
              }`}>
                <div className="flex items-center gap-3">
                  {paymentStatus.status === 'waiting' && <Clock className="w-6 h-6 text-yellow-500 animate-pulse" />}
                  {paymentStatus.status === 'confirming' && <Clock className="w-6 h-6 text-blue-500 animate-spin" />}
                  {paymentStatus.status === 'confirmed' && <CheckCircle className="w-6 h-6 text-green-500" />}
                  {paymentStatus.status === 'failed' && <AlertCircle className="w-6 h-6 text-red-500" />}
                  <div>
                    <p className="text-white font-semibold">
                      {paymentStatus.status === 'waiting' && 'Waiting for Payment'}
                      {paymentStatus.status === 'confirming' && 'Confirming Transaction...'}
                      {paymentStatus.status === 'confirmed' && 'Payment Confirmed!'}
                      {paymentStatus.status === 'failed' && 'Payment Failed'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {paymentStatus.status === 'waiting' && 'Send exact amount to the address below'}
                      {paymentStatus.status === 'confirming' && 'Please wait while we confirm your transaction'}
                      {paymentStatus.status === 'confirmed' && 'Tokens have been added to your account!'}
                      {paymentStatus.status === 'failed' && 'Transaction expired or failed'}
                    </p>
                  </div>
                </div>
              </div>

              {paymentStatus.status !== 'confirmed' && paymentStatus.status !== 'failed' && (
                <>
                  {/* Amount to Send */}
                  <div className="bg-[#0f0f0f] rounded-lg p-4 mb-4">
                    <p className="text-gray-400 text-sm mb-1">Amount to Send</p>
                    <p className="text-white text-3xl font-bold flex items-center gap-2">
                      {paymentStatus.crypto_amount} {paymentStatus.crypto_currency}
                    </p>
                  </div>

                  {/* Payment Address */}
                  <div className="bg-[#0f0f0f] rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-400 text-sm">Payment Address</p>
                      <button
                        onClick={() => copyToClipboard(paymentStatus.address)}
                        className="flex items-center gap-1 text-[#8B5CF6] hover:text-[#7C3AED] text-sm font-semibold"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                    </div>
                    <p className="text-white font-mono text-sm break-all">{paymentStatus.address}</p>
                  </div>

                  {/* QR Code (if available) */}
                  {paymentStatus.qr_code && (
                    <div className="flex justify-center mb-4">
                      <div className="bg-white p-4 rounded-lg">
                        <img src={paymentStatus.qr_code} alt="Payment QR Code" className="w-48 h-48" />
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                    <p className="text-blue-400 text-sm">
                      <strong>⚠️ Important:</strong> Send the exact amount to the address above. 
                      Sending a different amount may result in loss of funds or delayed processing.
                    </p>
                  </div>
                </>
              )}

              {/* Close Button */}
              <button
                onClick={() => setPaymentStatus(null)}
                className="w-full px-6 py-3 bg-[#2f3136] hover:bg-[#36393f] text-white rounded-lg font-semibold transition-colors"
              >
                {paymentStatus.status === 'confirmed' ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Buy Tokens */}
          {activeTab === 'buy' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Bitcoin className="w-6 h-6 text-[#8B5CF6]" />
              Buy Tokens with Crypto
            </h2>
            <p className="text-gray-400 mb-4">Pay with Bitcoin, Ethereum, USDT, and 200+ cryptocurrencies!</p>

            {/* Crypto Selector */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              {cryptoOptions.map((crypto) => (
                <button
                  key={crypto.symbol}
                  onClick={() => setSelectedCrypto(crypto.symbol as any)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedCrypto === crypto.symbol
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/20'
                      : 'border-[#202225] bg-[#1a1a1a] hover:border-[#8B5CF6]/50'
                  }`}
                >
                  <div className={`text-3xl mb-1 ${crypto.color}`}>{crypto.icon}</div>
                  <div className="text-white text-xs font-semibold">{crypto.symbol}</div>
                </button>
              ))}
            </div>

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
                      <p className="text-xs text-gray-500">≈ {(pkg.price / 50000).toFixed(4)} BTC</p>
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
                    <Bitcoin className="w-5 h-5" />
                    Pay with {selectedCrypto}
                  </button>
                </div>
              ))}
            </div>

            {/* Benefits */}
            <div className="mt-6 bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                Why Pay with Crypto?
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold text-sm">Lower Fees (1-2% vs 3-5%)</p>
                    <p className="text-gray-400 text-xs">Save money on every purchase</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold text-sm">Instant Settlement</p>
                    <p className="text-gray-400 text-xs">Tokens added within minutes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold text-sm">No Chargebacks</p>
                    <p className="text-gray-400 text-xs">Secure & final transactions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold text-sm">Global Access</p>
                    <p className="text-gray-400 text-xs">Works in any country</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          )}

          {/* Withdraw Earnings */}
          {activeTab === 'withdraw' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Download className="w-6 h-6 text-[#8B5CF6]" />
              Withdraw to Crypto
            </h2>
            <p className="text-gray-400 mb-6">Convert your tokens to cryptocurrency</p>

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
                  ${(withdrawAmount / 100).toFixed(2)} USD in Crypto
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
                Withdraw ${(withdrawAmount / 100).toFixed(2)} in Crypto
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
                      Crypto withdrawals are processed within 24 hours to your wallet address.
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
                      <li>• Valid crypto wallet address</li>
                      <li>• Account verified</li>
                      <li>• Network fees may apply</li>
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
          )}

          {/* Crypto Staking Tab */}
          {activeTab === 'staking' && (
            <CryptoStakingSection />
          )}
        </div>
      </div>
    </div>
  );
}

