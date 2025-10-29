import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Wallet, DollarSign, Download, TrendingUp, Shield, CheckCircle, AlertCircle, 
  Clock, Coins, Bitcoin, Star, Zap, Award, Copy, ExternalLink, QrCode, Lock, 
  Unlock, ArrowUpRight, ArrowDownRight, History, CreditCard, Sparkles, Info,
  RefreshCw, Check, X, ChevronRight, Flame, Trophy
} from 'lucide-react';
import { toast } from '../components/Toast';
import { formatTokens } from '../utils/formatTokens';

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  bonus: number;
  popular: boolean;
  savings?: number;
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  usd_value: number;
  crypto_type: string;
  status: string;
  created_at: string;
}

export default function EnhancedTokenEconomy() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'history'>('buy');
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState<'BTC' | 'ETH' | 'USDT'>('USDT');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentAddress, setPaymentAddress] = useState('');
  const [paymentQR, setPaymentQR] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'confirming' | 'confirmed' | 'failed'>('waiting');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalBought: 0,
    totalSold: 0,
    netSpent: 0,
    pendingTransactions: 0
  });

  // Enhanced Token Packages with better pricing
  const tokenPackages: TokenPackage[] = [
    {
      id: 'starter',
      name: 'Starter',
      tokens: 10000,
      price: 10,
      bonus: 0,
      popular: false
    },
    {
      id: 'growth',
      name: 'Growth',
      tokens: 50000,
      price: 45,
      bonus: 5000,
      popular: false,
      savings: 10
    },
    {
      id: 'popular',
      name: 'Popular',
      tokens: 100000,
      price: 85,
      bonus: 20000,
      popular: true,
      savings: 15
    },
    {
      id: 'premium',
      name: 'Premium',
      tokens: 250000,
      price: 200,
      bonus: 65000,
      popular: false,
      savings: 20
    },
    {
      id: 'ultimate',
      name: 'Ultimate',
      tokens: 500000,
      price: 375,
      bonus: 150000,
      popular: false,
      savings: 25
    }
  ];

  const cryptoOptions = [
    { 
      symbol: 'BTC' as const, 
      name: 'Bitcoin', 
      icon: '₿', 
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      description: 'Most secure & widely accepted'
    },
    { 
      symbol: 'ETH' as const, 
      name: 'Ethereum', 
      icon: 'Ξ', 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      description: 'Fast transactions'
    },
    { 
      symbol: 'USDT' as const, 
      name: 'Tether', 
      icon: '₮', 
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      description: 'Stable value (1:1 USD)'
    }
  ];

  useEffect(() => {
    if (profile) {
      fetchTransactions();
      fetchStats();
    }
  }, [profile]);

  const fetchTransactions = async () => {
    if (!profile) return;

    try {
      // Fetch buy transactions
      const { data: purchases } = await supabase
        .from('token_purchases')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch sell transactions
      const { data: withdrawals } = await supabase
        .from('token_withdrawals')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const allTransactions: Transaction[] = [
        ...(purchases?.map(p => ({
          id: p.id,
          type: 'buy' as const,
          amount: p.amount,
          usd_value: p.price_usd || 0,
          crypto_type: p.payment_method || 'crypto',
          status: p.status,
          created_at: p.created_at
        })) || []),
        ...(withdrawals?.map(w => ({
          id: w.id,
          type: 'sell' as const,
          amount: w.amount,
          usd_value: w.usd_value || 0,
          crypto_type: w.crypto_type || 'crypto',
          status: w.status,
          created_at: w.created_at
        })) || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchStats = async () => {
    if (!profile) return;

    try {
      const { data: purchases } = await supabase
        .from('token_purchases')
        .select('amount, price_usd, status')
        .eq('user_id', profile.id);

      const { data: withdrawals } = await supabase
        .from('token_withdrawals')
        .select('amount, usd_value, status')
        .eq('user_id', profile.id);

      const totalBought = purchases?.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0) || 0;
      const totalSold = withdrawals?.reduce((sum, w) => sum + (w.status === 'completed' ? w.amount : 0), 0) || 0;
      const totalSpent = purchases?.reduce((sum, p) => sum + (p.status === 'completed' ? p.price_usd : 0), 0) || 0;
      const totalEarned = withdrawals?.reduce((sum, w) => sum + (w.status === 'completed' ? w.usd_value : 0), 0) || 0;
      const pending = [...(purchases || []), ...(withdrawals || [])].filter(t => t.status === 'pending').length;

      setStats({
        totalBought,
        totalSold,
        netSpent: totalSpent - totalEarned,
        pendingTransactions: pending
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleBuyTokens = async (pkg: TokenPackage) => {
    if (!profile) {
      toast.error('Please log in to purchase tokens');
      return;
    }

    setLoading(true);
    setSelectedPackage(pkg);

    try {
      // Call edge function to create crypto payment
      const { data, error } = await supabase.functions.invoke('create-crypto-payment', {
        body: {
          user_id: profile.id,
          amount_usd: pkg.price,
          tokens: pkg.tokens + pkg.bonus,
          crypto_currency: selectedCrypto
        }
      });

      if (error) {
        console.error('Payment creation error:', error);
        // FALLBACK: Show test payment modal
        setPaymentId(`TEST-${Date.now()}`);
        setPaymentAddress(`${selectedCrypto === 'BTC' ? '1' : selectedCrypto === 'ETH' ? '0x' : 'T'}TEST${Math.random().toString(36).substr(2, 9)}`);
        setPaymentQR(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedCrypto}:test-address`);
        setPaymentModal(true);
        toast.info('Test mode: Payment interface shown (backend not configured)');
        return;
      }

      if (data?.payment_id && data?.payment_address) {
        setPaymentId(data.payment_id);
        setPaymentAddress(data.payment_address);
        setPaymentQR(data.qr_code_url || '');
        setPaymentModal(true);
        toast.success('Payment request created! Send crypto to the address below.');
        
        // Start monitoring payment status
        monitorPayment(data.payment_id);
      }
    } catch (error: any) {
      console.error('Buy tokens error:', error);
      toast.error(error.message || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomBuy = async () => {
    const amount = parseInt(customAmount);
    if (isNaN(amount) || amount < 1000) {
      toast.error('Minimum purchase is 1,000 tokens');
      return;
    }

    const price = Math.ceil((amount / 1000) * 1); // $1 per 1000 tokens
    const bonus = amount >= 100000 ? Math.floor(amount * 0.2) : amount >= 50000 ? Math.floor(amount * 0.1) : 0;

    await handleBuyTokens({
      id: 'custom',
      name: 'Custom Amount',
      tokens: amount,
      price,
      bonus,
      popular: false
    });
  };

  const handleSellTokens = async () => {
    if (!profile) return;

    const amount = parseInt(withdrawAmount);
    const minWithdrawal = 10000;

    if (isNaN(amount) || amount < minWithdrawal) {
      toast.error(`Minimum withdrawal is ${minWithdrawal.toLocaleString()} tokens`);
      return;
    }

    if (amount > (profile.token_balance || 0)) {
      toast.error('Insufficient token balance');
      return;
    }

    const platformFee = 0.02; // 2%
    const amountAfterFee = Math.floor(amount * (1 - platformFee));
    const usdValue = (amountAfterFee * 0.001).toFixed(2); // $0.001 per token

    try {
      setLoading(true);

      // Create withdrawal request
      const { error: withdrawalError } = await supabase
        .from('token_withdrawals')
        .insert({
          user_id: profile.id,
          amount: amount,
          amount_after_fee: amountAfterFee,
          fee_amount: amount - amountAfterFee,
          usd_value: parseFloat(usdValue),
          crypto_type: selectedCrypto,
          crypto_address: 'pending',
          status: 'pending',
        });

      if (withdrawalError) throw withdrawalError;

      // Deduct tokens
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - amount })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      toast.success(`✅ Withdrawal request submitted! You'll receive $${usdValue} within 24-48 hours.`);
      setWithdrawAmount('');
      fetchTransactions();
      fetchStats();
    } catch (error: any) {
      console.error('Sell tokens error:', error);
      toast.error(error.message || 'Failed to submit withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const monitorPayment = async (paymentId: string) => {
    const checkInterval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('check-crypto-payment', {
          body: { payment_id: paymentId }
        });

        if (data?.status === 'confirmed') {
          setPaymentStatus('confirmed');
          toast.success('✅ Payment confirmed! Tokens added to your account.');
          clearInterval(checkInterval);
          fetchTransactions();
          fetchStats();
        } else if (data?.status === 'failed') {
          setPaymentStatus('failed');
          toast.error('Payment failed or expired');
          clearInterval(checkInterval);
        } else if (data?.status === 'confirming') {
          setPaymentStatus('confirming');
        }
      } catch (error) {
        console.error('Payment check error:', error);
      }
    }, 10000); // Check every 10 seconds

    // Stop checking after 30 minutes
    setTimeout(() => clearInterval(checkInterval), 30 * 60 * 1000);
  };

  const currentBalance = profile?.token_balance || 0;
  const balanceUSD = (currentBalance * 0.001).toFixed(2);

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              Token Economy
            </h1>
            <p className="text-gray-400 text-lg">Buy tokens with crypto or withdraw your earnings</p>
          </div>
          <button
            onClick={() => {
              fetchTransactions();
              fetchStats();
              toast.success('Refreshed!');
            }}
            className="p-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-xl transition-colors border border-[#202225]"
          >
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Coins className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-green-300 font-medium">Current Balance</p>
                <p className="text-3xl font-bold text-white">{formatTokens(currentBalance)}</p>
                <p className="text-sm text-green-400">≈ ${balanceUSD} USD</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <ArrowDownRight className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-300 font-medium">Total Bought</p>
                <p className="text-2xl font-bold text-white">{stats.totalBought.toLocaleString()}</p>
                <p className="text-xs text-gray-500">tokens purchased</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/30">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <ArrowUpRight className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-orange-300 font-medium">Total Sold</p>
                <p className="text-2xl font-bold text-white">{stats.totalSold.toLocaleString()}</p>
                <p className="text-xs text-gray-500">tokens withdrawn</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-purple-300 font-medium">Pending</p>
                <p className="text-2xl font-bold text-white">{stats.pendingTransactions}</p>
                <p className="text-xs text-gray-500">transactions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-[#1a1a1a] p-2 rounded-xl border border-[#202225]">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'buy'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-[#0f0f0f]'
            }`}
          >
            <ArrowDownRight className="w-5 h-5" />
            Buy Tokens
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'sell'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-[#0f0f0f]'
            }`}
          >
            <ArrowUpRight className="w-5 h-5" />
            Sell Tokens
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-[#0f0f0f]'
            }`}
          >
            <History className="w-5 h-5" />
            History
          </button>
        </div>

        {/* Buy Tab */}
        {activeTab === 'buy' && (
          <div className="space-y-8">
            {/* Crypto Selection */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Bitcoin className="w-6 h-6 text-orange-500" />
                Select Cryptocurrency
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cryptoOptions.map((crypto) => (
                  <button
                    key={crypto.symbol}
                    onClick={() => setSelectedCrypto(crypto.symbol)}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      selectedCrypto === crypto.symbol
                        ? `${crypto.bgColor} ${crypto.borderColor} scale-105`
                        : 'bg-[#1a1a1a] border-[#202225] hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-5xl font-bold bg-gradient-to-r ${crypto.color} bg-clip-text text-transparent`}>
                        {crypto.icon}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-white font-bold text-lg">{crypto.name}</p>
                        <p className="text-gray-400 text-sm">{crypto.description}</p>
                      </div>
                      {selectedCrypto === crypto.symbol && (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Token Packages */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                Choose Your Package
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {tokenPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative bg-[#1a1a1a] rounded-xl p-6 border-2 transition-all hover:scale-105 cursor-pointer ${
                      pkg.popular
                        ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                        : 'border-[#202225] hover:border-green-500/50'
                    }`}
                    onClick={() => handleBuyTokens(pkg)}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1 shadow-lg">
                          <Star className="w-3 h-3" />
                          BEST VALUE
                        </div>
                      </div>
                    )}

                    {pkg.savings && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {pkg.savings}% OFF
                      </div>
                    )}

                    <div className="text-center mb-4 pt-2">
                      <p className="text-gray-400 text-sm mb-2">{pkg.name}</p>
                      <p className="text-4xl font-bold text-white mb-2">{pkg.tokens.toLocaleString()}</p>
                      {pkg.bonus > 0 && (
                        <div className="mb-2">
                          <p className="text-green-400 font-bold text-sm">+{pkg.bonus.toLocaleString()} BONUS</p>
                          <p className="text-xs text-gray-500">= {(pkg.tokens + pkg.bonus).toLocaleString()} total</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="bg-[#0f0f0f] rounded-lg p-3 text-center">
                        <p className="text-3xl font-bold text-green-400">${pkg.price}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          ${(pkg.price / (pkg.tokens + pkg.bonus) * 1000).toFixed(2)} per 1K tokens
                        </p>
                      </div>
                      <button
                        disabled={loading}
                        className={`w-full py-3 rounded-lg font-bold transition-all ${
                          pkg.popular
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
                            : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                        } disabled:opacity-50`}
                      >
                        {loading ? 'Processing...' : 'Buy Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Custom Amount
              </h3>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm text-gray-400 mb-2 block">Enter Amount (minimum 1,000)</label>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white text-lg font-bold focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleCustomBuy}
                    disabled={loading || !customAmount || parseInt(customAmount) < 1000}
                    className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-bold transition-all disabled:cursor-not-allowed"
                  >
                    Buy Custom Amount
                  </button>
                </div>
              </div>
              {customAmount && parseInt(customAmount) >= 1000 && (
                <div className="mt-4 p-4 bg-[#0f0f0f] rounded-lg border border-[#202225]">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">You'll get:</span>
                    <span className="text-white font-bold">
                      {(parseInt(customAmount) + (parseInt(customAmount) >= 100000 ? Math.floor(parseInt(customAmount) * 0.2) : parseInt(customAmount) >= 50000 ? Math.floor(parseInt(customAmount) * 0.1) : 0)).toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-400">Price:</span>
                    <span className="text-green-400 font-bold">${Math.ceil((parseInt(customAmount) / 1000) * 1)} USD</span>
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div className="space-y-2 text-sm text-blue-300">
                  <p className="font-semibold">How it works:</p>
                  <ul className="space-y-1 text-gray-400">
                    <li>• Select your preferred cryptocurrency and package</li>
                    <li>• Send the exact crypto amount to the provided address</li>
                    <li>• Tokens are added to your account within minutes after confirmation</li>
                    <li>• Larger packages include bonus tokens and savings</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sell Tab */}
        {activeTab === 'sell' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Current Balance Card */}
            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-8">
              <div className="text-center mb-6">
                <p className="text-sm text-orange-300 font-medium mb-2">Available to Withdraw</p>
                <p className="text-6xl font-bold text-white mb-2">{currentBalance.toLocaleString()}</p>
                <p className="text-2xl text-green-400">≈ ${balanceUSD} USD</p>
                <p className="text-xs text-gray-500 mt-2">Exchange rate: $0.001 per token</p>
              </div>
            </div>

            {/* Crypto Selection for Withdrawal */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Receive Payment In</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cryptoOptions.map((crypto) => (
                  <button
                    key={crypto.symbol}
                    onClick={() => setSelectedCrypto(crypto.symbol)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedCrypto === crypto.symbol
                        ? `${crypto.bgColor} ${crypto.borderColor}`
                        : 'bg-[#1a1a1a] border-[#202225] hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-3xl font-bold bg-gradient-to-r ${crypto.color} bg-clip-text text-transparent`}>
                        {crypto.icon}
                      </div>
                      <div className="text-left">
                        <p className="text-white font-bold">{crypto.name}</p>
                        <p className="text-gray-400 text-xs">{crypto.symbol}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Withdrawal Form */}
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
              <h3 className="text-xl font-bold text-white mb-4">Withdrawal Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Amount to Withdraw</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Minimum: 10,000"
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white text-xl font-bold focus:border-orange-500 focus:outline-none"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Min: 10,000 tokens</span>
                    <button
                      onClick={() => setWithdrawAmount(currentBalance.toString())}
                      className="text-orange-400 hover:text-orange-300 font-semibold"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {withdrawAmount && parseInt(withdrawAmount) >= 10000 && (
                  <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225] space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Withdraw amount:</span>
                      <span className="text-white font-semibold">{parseInt(withdrawAmount).toLocaleString()} tokens</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Platform fee (2%):</span>
                      <span className="text-red-400">-{Math.floor(parseInt(withdrawAmount) * 0.02).toLocaleString()} tokens</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">After fee:</span>
                      <span className="text-white">{Math.floor(parseInt(withdrawAmount) * 0.98).toLocaleString()} tokens</span>
                    </div>
                    <div className="border-t border-[#202225] pt-2 flex justify-between">
                      <span className="text-white font-bold">You'll receive:</span>
                      <span className="text-green-400 text-lg font-bold">
                        ${(Math.floor(parseInt(withdrawAmount) * 0.98) * 0.001).toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSellTokens}
                  disabled={loading || !withdrawAmount || parseInt(withdrawAmount) < 10000}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-bold text-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  {loading ? 'Processing...' : 'Withdraw Tokens'}
                </button>
              </div>
            </div>

            {/* Withdrawal Info */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-orange-300">
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">Withdrawal Information</span>
                </div>
                <ul className="space-y-2 text-gray-400 ml-7">
                  <li>• Minimum withdrawal: 10,000 tokens ($10 USD)</li>
                  <li>• Platform fee: 2% per withdrawal</li>
                  <li>• Processing time: 24-48 hours</li>
                  <li>• Crypto sent to your provided wallet address</li>
                  <li>• All withdrawals are manually reviewed for security</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <History className="w-6 h-6 text-blue-400" />
                Transaction History
              </h3>
              <button
                onClick={fetchTransactions}
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-lg transition-colors border border-[#202225] flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-16 bg-[#1a1a1a] rounded-xl border border-[#202225]">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-white font-semibold mb-2">No Transactions Yet</p>
                <p className="text-gray-400">Your buy and sell history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${tx.type === 'buy' ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                          {tx.type === 'buy' ? (
                            <ArrowDownRight className="w-6 h-6 text-green-400" />
                          ) : (
                            <ArrowUpRight className="w-6 h-6 text-orange-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-bold text-lg">
                            {tx.type === 'buy' ? 'Bought' : 'Sold'} {tx.amount.toLocaleString()} Tokens
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span>{new Date(tx.created_at).toLocaleString()}</span>
                            <span>•</span>
                            <span className="capitalize">{tx.crypto_type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${tx.type === 'buy' ? 'text-green-400' : 'text-orange-400'}`}>
                          ${tx.usd_value.toFixed(2)}
                        </p>
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                          tx.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {tx.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {tx.status === 'pending' && <Clock className="w-3 h-3" />}
                          {tx.status === 'failed' && <X className="w-3 h-3" />}
                          {tx.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment Modal */}
        {paymentModal && selectedPackage && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPaymentModal(false)}>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#202225] w-full max-w-2xl p-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Bitcoin className="w-7 h-7 text-orange-500" />
                  Complete Payment
                </h3>
                <button
                  onClick={() => setPaymentModal(false)}
                  className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Package Summary */}
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
                  <p className="text-sm text-green-300 mb-2">You're purchasing:</p>
                  <p className="text-4xl font-bold text-white mb-2">{(selectedPackage.tokens + selectedPackage.bonus).toLocaleString()}</p>
                  <p className="text-sm text-gray-400">tokens for ${selectedPackage.price} USD</p>
                </div>

                {/* Payment Address */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Send {selectedCrypto} to this address:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paymentAddress}
                      readOnly
                      className="flex-1 px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white font-mono text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(paymentAddress);
                        toast.success('Address copied!');
                      }}
                      className="px-4 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg transition-colors"
                    >
                      <Copy className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* QR Code */}
                {paymentQR && (
                  <div className="text-center">
                    <div className="inline-block p-4 bg-white rounded-xl">
                      <img src={paymentQR} alt="Payment QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-sm text-gray-400 mt-2">Scan with your crypto wallet</p>
                  </div>
                )}

                {/* Status */}
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  paymentStatus === 'confirmed' ? 'bg-green-500/20 border border-green-500/30' :
                  paymentStatus === 'confirming' ? 'bg-blue-500/20 border border-blue-500/30' :
                  paymentStatus === 'failed' ? 'bg-red-500/20 border border-red-500/30' :
                  'bg-yellow-500/20 border border-yellow-500/30'
                }`}>
                  {paymentStatus === 'confirmed' ? <CheckCircle className="w-6 h-6 text-green-400" /> :
                   paymentStatus === 'confirming' ? <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /> :
                   paymentStatus === 'failed' ? <X className="w-6 h-6 text-red-400" /> :
                   <Clock className="w-6 h-6 text-yellow-400" />}
                  <div>
                    <p className="text-white font-semibold">
                      {paymentStatus === 'confirmed' ? 'Payment Confirmed!' :
                       paymentStatus === 'confirming' ? 'Confirming Payment...' :
                       paymentStatus === 'failed' ? 'Payment Failed' :
                       'Waiting for Payment'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {paymentStatus === 'confirmed' ? 'Tokens have been added to your account' :
                       paymentStatus === 'confirming' ? 'Transaction detected, waiting for confirmations' :
                       paymentStatus === 'failed' ? 'Payment was not received or expired' :
                       'Send crypto to the address above'}
                    </p>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-xs text-blue-300">
                    <span className="font-bold">Important:</span> Send only {selectedCrypto} to this address. Sending other cryptocurrencies will result in loss of funds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

