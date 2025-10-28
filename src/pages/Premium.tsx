import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Crown, Check, Zap, Star, Shield, TrendingUp, 
  MessageSquare, Users, Sparkles, Gift
} from 'lucide-react';
import { toast } from '../components/Toast';

interface SubscriptionTier {
  id: string;
  tier_name: string;
  tier_level: number;
  monthly_price: number;
  yearly_price: number;
  token_multiplier: number;
  monthly_bonus_tokens: number;
  features: any;
}

export default function Premium() {
  const { profile } = useAuth();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTiers();
    fetchCurrentSubscription();
  }, [profile]);

  const fetchTiers = async () => {
    const { data } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('tier_level', { ascending: true });

    if (data) {
      setTiers(data);
    }
  };

  const fetchCurrentSubscription = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_tiers(*)
      `)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .single();

    if (data) {
      setCurrentSubscription(data);
    }
  };

  const handleSubscribe = async (tierId: string, tierName: string, price: number, cycle: 'monthly' | 'yearly') => {
    if (!profile) return;

    setLoading(true);

    try {
      // In production, integrate with Stripe
      // For now, simulate subscription
      toast.success(`Redirecting to payment for ${tierName} (${cycle})...`);
      
      // Simulate Stripe checkout
      console.log('Stripe Checkout:', {
        tierId,
        tierName,
        price,
        cycle,
        userId: profile.id
      });

      // TODO: Implement actual Stripe integration
      // const stripe = await loadStripe(process.env.STRIPE_PUBLIC_KEY);
      // const { error } = await stripe.redirectToCheckout({
      //   lineItems: [{ price: priceId, quantity: 1 }],
      //   mode: 'subscription',
      //   successUrl: `${window.location.origin}/premium/success`,
      //   cancelUrl: `${window.location.origin}/premium`,
      //   clientReferenceId: profile.id,
      // });

    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (level: number) => {
    switch (level) {
      case 0: return Shield;
      case 1: return Star;
      case 2: return Crown;
      default: return Shield;
    }
  };

  const getTierColor = (level: number) => {
    switch (level) {
      case 0: return 'from-gray-500 to-gray-600';
      case 1: return 'from-blue-500 to-cyan-500';
      case 2: return 'from-yellow-500 to-orange-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getFeaturesList = (features: any, level: number) => {
    const baseFeatures = [
      { text: 'Access to all games', included: true },
      { text: 'Token earning', included: true },
      { text: 'Basic chat features', included: true },
    ];

    if (level >= 1) {
      baseFeatures.push(
        { text: '1.5x Token Multiplier', included: true },
        { text: '500 Bonus Tokens/Month', included: true },
        { text: 'Ad-Free Experience', included: true },
        { text: 'Priority Support', included: true },
        { text: '30-Day Chat History', included: true },
        { text: 'Reduced Marketplace Fees (3%)', included: true }
      );
    }

    if (level >= 2) {
      baseFeatures.push(
        { text: '2x Token Multiplier', included: true },
        { text: '1,500 Bonus Tokens/Month', included: true },
        { text: 'Unlimited Chat History', included: true },
        { text: 'VIP Badge & Profile', included: true },
        { text: 'Exclusive Customization Items', included: true },
        { text: 'Lowest Marketplace Fees (1%)', included: true },
        { text: 'Featured Profile Placement', included: true }
      );
    }

    return baseFeatures;
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-12 h-12 text-yellow-500" />
            <h1 className="text-4xl font-bold text-white">TokenQuest Premium</h1>
          </div>
          <p className="text-xl text-gray-400">
            Unlock exclusive features and boost your earnings
          </p>
        </div>

        {/* Current Subscription Banner */}
        {currentSubscription && (
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Crown className="w-8 h-8 text-white" />
                <div>
                  <div className="text-white font-bold text-lg">
                    Active: {currentSubscription.subscription_tiers?.tier_name}
                  </div>
                  <div className="text-white/80 text-sm">
                    Renews on {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button className="px-6 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-[#0f0f0f] transition">
                Manage Subscription
              </button>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {tiers.map((tier) => {
            const Icon = getTierIcon(tier.tier_level);
            const features = getFeaturesList(tier.features, tier.tier_level);
            const isCurrentTier = currentSubscription?.tier_id === tier.id;
            const isFree = tier.tier_level === 0;

            return (
              <div
                key={tier.id}
                className={`bg-[#1a1a1a] rounded-lg overflow-hidden border-2 ${
                  tier.tier_level === 1
                    ? 'border-blue-500 transform scale-105'
                    : tier.tier_level === 2
                    ? 'border-yellow-500'
                    : 'border-[#202225]'
                } ${isCurrentTier ? 'ring-4 ring-green-500' : ''}`}
              >
                {/* Header */}
                <div className={`bg-gradient-to-r ${getTierColor(tier.tier_level)} p-6 text-center`}>
                  <Icon className="w-12 h-12 text-white mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-white mb-2">{tier.tier_name}</h3>
                  {!isFree && (
                    <div className="text-white">
                      <div className="text-4xl font-bold mb-1">
                        ${tier.monthly_price}
                        <span className="text-lg font-normal">/mo</span>
                      </div>
                      <div className="text-sm opacity-80">
                        or ${tier.yearly_price}/year (save {Math.round((1 - (tier.yearly_price / (tier.monthly_price * 12))) * 100)}%)
                      </div>
                    </div>
                  )}
                  {isFree && (
                    <div className="text-2xl font-bold text-white">Free Forever</div>
                  )}
                </div>

                {/* Features */}
                <div className="p-6">
                  {/* Key Stats */}
                  {!isFree && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-[#0f0f0f] rounded-lg p-3 text-center">
                        <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                        <div className="text-white font-bold">{tier.token_multiplier}x</div>
                        <div className="text-xs text-gray-400">Multiplier</div>
                      </div>
                      <div className="bg-[#0f0f0f] rounded-lg p-3 text-center">
                        <Gift className="w-6 h-6 text-green-500 mx-auto mb-1" />
                        <div className="text-white font-bold">{tier.monthly_bonus_tokens}</div>
                        <div className="text-xs text-gray-400">Bonus/Month</div>
                      </div>
                    </div>
                  )}

                  {/* Feature List */}
                  <ul className="space-y-3 mb-6">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className={`w-5 h-5 flex-shrink-0 ${
                          feature.included ? 'text-green-500' : 'text-gray-600'
                        }`} />
                        <span className={`text-sm ${
                          feature.included ? 'text-white' : 'text-gray-600'
                        }`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {!isFree && !isCurrentTier && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleSubscribe(tier.id, tier.tier_name, tier.monthly_price, 'monthly')}
                        disabled={loading}
                        className={`w-full px-6 py-3 bg-gradient-to-r ${getTierColor(tier.tier_level)} text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50`}
                      >
                        Subscribe Monthly
                      </button>
                      <button
                        onClick={() => handleSubscribe(tier.id, tier.tier_name, tier.yearly_price, 'yearly')}
                        disabled={loading}
                        className="w-full px-6 py-3 bg-[#1a1a1a] text-white rounded-lg font-semibold hover:bg-[#7C3AED] transition disabled:opacity-50"
                      >
                        Subscribe Yearly (Save {Math.round((1 - (tier.yearly_price / (tier.monthly_price * 12))) * 100)}%)
                      </button>
                    </div>
                  )}
                  {isCurrentTier && (
                    <div className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold text-center">
                      ✓ Current Plan
                    </div>
                  )}
                  {isFree && !currentSubscription && (
                    <div className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold text-center">
                      Current Plan
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="bg-[#1a1a1a] rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Why Go Premium?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-bold mb-2">Earn More Tokens</h3>
              <p className="text-gray-400 text-sm">
                Up to 2x multiplier on all token earnings
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-bold mb-2">Ad-Free Experience</h3>
              <p className="text-gray-400 text-sm">
                Enjoy the platform without any interruptions
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-bold mb-2">Exclusive Items</h3>
              <p className="text-gray-400 text-sm">
                Access premium customization options
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-bold mb-2">Lower Fees</h3>
              <p className="text-gray-400 text-sm">
                Reduced marketplace fees down to 1%
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-[#1a1a1a] rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            <details className="bg-[#0f0f0f] rounded-lg p-4">
              <summary className="text-white font-semibold cursor-pointer">
                Can I cancel anytime?
              </summary>
              <p className="text-gray-400 mt-2 text-sm">
                Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </details>
            <details className="bg-[#0f0f0f] rounded-lg p-4">
              <summary className="text-white font-semibold cursor-pointer">
                What happens to my tokens if I cancel?
              </summary>
              <p className="text-gray-400 mt-2 text-sm">
                You keep all tokens you've earned! Your multiplier will return to 1x, but your token balance remains unchanged.
              </p>
            </details>
            <details className="bg-[#0f0f0f] rounded-lg p-4">
              <summary className="text-white font-semibold cursor-pointer">
                Can I upgrade or downgrade?
              </summary>
              <p className="text-gray-400 mt-2 text-sm">
                Absolutely! You can change your plan at any time. Upgrades take effect immediately, while downgrades apply at the next billing cycle.
              </p>
            </details>
            <details className="bg-[#0f0f0f] rounded-lg p-4">
              <summary className="text-white font-semibold cursor-pointer">
                Are there any hidden fees?
              </summary>
              <p className="text-gray-400 mt-2 text-sm">
                No hidden fees! The price you see is what you pay. All features are included in your subscription.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

