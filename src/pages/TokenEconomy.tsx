import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Coins, TrendingUp, ArrowDownLeft, ArrowUpRight, Wallet, 
  DollarSign, Bitcoin, CreditCard, Shield, AlertCircle,
  ChevronRight, Zap, Gift, Lock
} from 'lucide-react';
import { toast } from '../components/Toast';

interface TokenPackage {
  id: string;
  package_name: string;
  token_amount: number;
  price_usd: number;
  crypto_price_btc?: number;
  crypto_price_eth?: number;
  bonus_tokens: number;
  is_featured: boolean;
}

interface WithdrawalRequest {
  id: string;
  amount_tokens: number;
  amount_usd: number;
  crypto_address: string;
  crypto_type: string;
  status: string;
  created_at: string;
}

export default function TokenEconomy() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'history'>('buy');
  const [tokenBalance, setTokenBalance] = useState(0);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [cryptoType, setCryptoType] = useState<'BTC' | 'ETH' | 'USDT'>('USDT');
  
  const TOKEN_TO_USD_RATE = 0.001; // $1 per 1000 tokens
  const WITHDRAWAL_FEE = 0.02; // 2% fee
  const MIN_WITHDRAWAL = 10000; // 10,000 tokens minimum ($10)

  useEffect(() => {
    if (profile) {
      fetchTokenBalance();
      fetchPackages();
      fetchWithdrawalHistory();
    }
  }, [profile]);

  const fetchTokenBalance = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('profiles')
      .select('token_balance')
      .eq('id', profile.id)
      .single();

    if (data) {
      setTokenBalance(data.token_balance);
    }
  };

  const fetchPackages = async () => {
    const { data } = await supabase
      .from('token_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (data) {
      setPackages(data);
    }
  };

  const fetchWithdrawalHistory = async () => {
    if (!profile) return;

    // This would query a token_withdrawals table
    // For now, using mock data
    setWithdrawalHistory([]);
  };

  const handleCryptoPurchase = async (pkg: TokenPackage, method: 'stripe' | 'crypto') => {
    if (!profile) return;

    setLoading(true);

    try {
      if (method === 'stripe') {
        // Stripe integration for fiat payment
        toast.info('Redirecting to Stripe checkout...');
        
        // TODO: Implement actual Stripe Checkout
        // const response = await fetch('/api/create-checkout-session', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     packageId: pkg.id,
        //     userId: profile.id,
        //     successUrl: `${window.location.origin}/token-economy/success`,
        //     cancelUrl: `${window.location.origin}/token-economy`
        //   })
        // });
        // const { sessionId } = await response.json();
        // const stripe = await loadStripe(process.env.VITE_STRIPE_PUBLIC_KEY);
        // await stripe?.redirectToCheckout({ sessionId });
        
      } else {
        // Crypto payment integration (Coinbase Commerce or similar)
        toast.info('Opening crypto payment gateway...');
        
        // TODO: Implement Coinbase Commerce or blockchain payment
        // const response = await fetch('/api/create-crypto-charge', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     packageId: pkg.id,
        //     userId: profile.id,
        //     amount: pkg.price_usd,
        //     description: `${pkg.token_amount + pkg.bonus_tokens} tokens`
        //   })
        // });
        // const { hostedUrl } = await response.json();
        // window.open(hostedUrl, '_blank');
      }

      // Log the purchase intent
      await supabase.from('token_transactions').insert({
        user_id: profile.id,
        amount: pkg.token_amount + pkg.bonus_tokens,
        type: 'purchase',
        category: 'token_purchase',
        description: `Purchased ${pkg.package_name}`,
        metadata: {
          package_id: pkg.id,
          price_usd: pkg.price_usd,
          payment_method: method
        }
      });

      toast.success('Purchase initiated!');
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to process purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!profile) return;

    const amount = parseInt(withdrawAmount);

    // Validation
    if (!amount || amount < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is ${MIN_WITHDRAWAL.toLocaleString()} tokens ($${(MIN_WITHDRAWAL * TOKEN_TO_USD_RATE).toFixed(2)})`);
      return;
    }

    if (amount > tokenBalance) {
      toast.error('Insufficient token balance');
      return;
    }

    if (!cryptoAddress || cryptoAddress.length < 20) {
      toast.error('Please enter a valid crypto address');
      return;
    }

    setLoading(true);

    try {
      const feeAmount = Math.floor(amount * WITHDRAWAL_FEE);
      const netAmount = amount - feeAmount;
      const usdValue = netAmount * TOKEN_TO_USD_RATE;

      // Create withdrawal request
      const { error } = await supabase.from('token_withdrawals').insert({
        user_id: profile.id,
        amount_tokens: amount,
        fee_tokens: feeAmount,
        net_amount_tokens: netAmount,
        amount_usd: usdValue,
        crypto_address: cryptoAddress,
        crypto_type: cryptoType,
        status: 'pending',
        requested_at: new Date().toISOString()
      });

      if (error) throw error;

      // Deduct tokens immediately
      const { error: balanceError } = await supabase.rpc('add_tokens', {
        p_user_id: profile.id,
        p_amount: -amount
      });

      if (balanceError) throw balanceError;

      // Log transaction
      await supabase.from('token_transactions').insert({
        user_id: profile.id,
        amount: -amount,
        type: 'spend',
        category: 'withdrawal',
        description: `Withdrawal to ${cryptoType} (${cryptoAddress.slice(0, 10)}...)`,
        metadata: {
          crypto_address: cryptoAddress,
          crypto_type: cryptoType,
          fee_amount: feeAmount,
          usd_value: usdValue
        }
      });

      toast.success('Withdrawal request submitted! Processing within 24-48 hours.');
      
      // Reset form
      setWithdrawAmount('');
      setCryptoAddress('');
      fetchTokenBalance();
      fetchWithdrawalHistory();

      // Send admin notification
      await supabase.from('admin_notifications').insert({
        type: 'withdrawal_request',
        title: 'New Token Withdrawal Request',
        message: `User ${profile.username} requested to withdraw ${amount.toLocaleString()} tokens ($${usdValue.toFixed(2)})`,
        data: {
          user_id: profile.id,
          amount_tokens: amount,
          amount_usd: usdValue,
          crypto_type: cryptoType
        }
      });

    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const calculateWithdrawalEstimate = () => {
    const amount = parseInt(withdrawAmount) || 0;
    const feeAmount = Math.floor(amount * WITHDRAWAL_FEE);
    const netAmount = amount - feeAmount;
    const usdValue = netAmount * TOKEN_TO_USD_RATE;

    return {
      gross: amount,
      fee: feeAmount,
      net: netAmount,
      usd: usdValue
    };
  };

  const estimate = calculateWithdrawalEstimate();

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Token Economy</h1>
              <p className="text-gray-400">Buy, sell, and manage your tokens with crypto</p>
            </div>
            
            {/* Balance Card */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 min-w-[250px]">
              <div className="flex items-center gap-3 mb-2">
                <Coins className="w-6 h-6 text-white" />
                <span className="text-white/80 text-sm font-medium">Your Balance</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1">
                {tokenBalance.toLocaleString()}
              </div>
              <div className="text-white/80 text-sm">
                ≈ ${(tokenBalance * TOKEN_TO_USD_RATE).toFixed(2)} USD
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-[#202225]">
            <button
              onClick={() => setActiveTab('buy')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'buy'
                  ? 'text-white border-b-2 border-green-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5" />
                Buy Tokens
              </div>
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'sell'
                  ? 'text-white border-b-2 border-red-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5" />
                Sell Tokens
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'history'
                  ? 'text-white border-b-2 border-[#8B5CF6]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Transaction History
              </div>
            </button>
          </div>
        </div>

        {/* Buy Tab */}
        {activeTab === 'buy' && (
          <div>
            {/* Payment Methods */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <CreditCard className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Pay with Card</h3>
                    <p className="text-gray-400 text-sm">Instant delivery via Stripe</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Shield className="w-4 h-4" />
                  <span>Secure payment • No fees</span>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <Bitcoin className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Pay with Crypto</h3>
                    <p className="text-gray-400 text-sm">BTC, ETH, USDT accepted</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Zap className="w-4 h-4" />
                  <span>Fast • Secure • Anonymous</span>
                </div>
              </div>
            </div>

            {/* Token Packages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const totalTokens = pkg.token_amount + pkg.bonus_tokens;
                const savings = pkg.bonus_tokens > 0 ? Math.round((pkg.bonus_tokens / pkg.token_amount) * 100) : 0;

                return (
                  <div
                    key={pkg.id}
                    className={`bg-[#1a1a1a] rounded-xl overflow-hidden ${
                      pkg.is_featured
                        ? 'border-2 border-yellow-500 shadow-2xl shadow-yellow-500/20'
                        : 'border border-[#202225]'
                    }`}
                  >
                    {pkg.is_featured && (
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-center py-2 font-bold text-sm">
                        ⭐ BEST VALUE
                      </div>
                    )}

                    <div className="p-6">
                      <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Coins className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{pkg.package_name}</h3>
                        <div className="text-3xl font-bold text-yellow-500 mb-1">
                          {totalTokens.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400">tokens</div>
                      </div>

                      {pkg.bonus_tokens > 0 && (
                        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/20 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-center gap-2">
                            <Gift className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 font-bold text-sm">
                              +{pkg.bonus_tokens.toLocaleString()} BONUS ({savings}% extra!)
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-white mb-1">
                          ${pkg.price_usd.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-400">One-time payment</div>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => handleCryptoPurchase(pkg, 'stripe')}
                          disabled={loading}
                          className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-5 h-5" />
                          Buy with Card
                        </button>
                        <button
                          onClick={() => handleCryptoPurchase(pkg, 'crypto')}
                          disabled={loading}
                          className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Bitcoin className="w-5 h-5" />
                          Buy with Crypto
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sell/Withdraw Tab */}
        {activeTab === 'sell' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#202225]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <Wallet className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Withdraw Tokens</h2>
                  <p className="text-gray-400">Convert your tokens to crypto</p>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-yellow-500 font-semibold mb-1">Important Information</div>
                    <ul className="text-sm text-yellow-200/80 space-y-1">
                      <li>• Minimum withdrawal: {MIN_WITHDRAWAL.toLocaleString()} tokens (${(MIN_WITHDRAWAL * TOKEN_TO_USD_RATE).toFixed(2)})</li>
                      <li>• Processing fee: {(WITHDRAWAL_FEE * 100)}%</li>
                      <li>• Processing time: 24-48 hours</li>
                      <li>• Withdrawals are final and cannot be cancelled</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Withdrawal Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Amount to Withdraw
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="10000"
                      className="w-full px-4 py-3 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400">
                      <Coins className="w-5 h-5" />
                      <span className="font-semibold">Tokens</span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    Available: {tokenBalance.toLocaleString()} tokens
                  </div>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">
                    Cryptocurrency Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['BTC', 'ETH', 'USDT'] as const).map((crypto) => (
                      <button
                        key={crypto}
                        onClick={() => setCryptoType(crypto)}
                        className={`px-4 py-3 rounded-lg font-semibold transition ${
                          cryptoType === crypto
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#1a1a1a]'
                        }`}
                      >
                        {crypto}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">
                    {cryptoType} Address
                  </label>
                  <input
                    type="text"
                    value={cryptoAddress}
                    onChange={(e) => setCryptoAddress(e.target.value)}
                    placeholder={`Enter your ${cryptoType} wallet address`}
                    className="w-full px-4 py-3 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none font-mono text-sm"
                  />
                </div>

                {/* Estimate */}
                {withdrawAmount && parseInt(withdrawAmount) >= MIN_WITHDRAWAL && (
                  <div className="bg-[#0f0f0f] rounded-lg p-6 border border-[#202225]">
                    <div className="text-white font-semibold mb-4">Withdrawal Summary</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Withdrawal Amount:</span>
                        <span className="text-white font-semibold">{estimate.gross.toLocaleString()} tokens</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Processing Fee ({(WITHDRAWAL_FEE * 100)}%):</span>
                        <span className="text-red-400">-{estimate.fee.toLocaleString()} tokens</span>
                      </div>
                      <div className="border-t border-[#202225] pt-3 flex items-center justify-between">
                        <span className="text-white font-semibold">You'll Receive:</span>
                        <div className="text-right">
                          <div className="text-green-400 font-bold text-lg">{estimate.net.toLocaleString()} tokens</div>
                          <div className="text-gray-400 text-sm">≈ ${estimate.usd.toFixed(2)} USD in {cryptoType}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleWithdrawal}
                  disabled={loading || !withdrawAmount || !cryptoAddress || parseInt(withdrawAmount) < MIN_WITHDRAWAL}
                  className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5" />
                      Withdraw Tokens
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
            <h2 className="text-white font-bold text-xl mb-6">Transaction History</h2>
            
            {withdrawalHistory.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No transactions yet</p>
                <p className="text-gray-500 text-sm mt-2">Your withdrawal history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawalHistory.map((withdrawal) => (
                  <div key={withdrawal.id} className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          withdrawal.status === 'completed' ? 'bg-green-500/10' :
                          withdrawal.status === 'pending' ? 'bg-yellow-500/10' :
                          'bg-red-500/10'
                        }`}>
                          <ArrowUpRight className={`w-5 h-5 ${
                            withdrawal.status === 'completed' ? 'text-green-500' :
                            withdrawal.status === 'pending' ? 'text-yellow-500' :
                            'text-red-500'
                          }`} />
                        </div>
                        <div>
                          <div className="text-white font-semibold">
                            Withdrawal to {withdrawal.crypto_type}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {new Date(withdrawal.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          {withdrawal.amount_tokens.toLocaleString()} tokens
                        </div>
                        <div className="text-gray-400 text-sm">
                          ${withdrawal.amount_usd.toFixed(2)} USD
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

