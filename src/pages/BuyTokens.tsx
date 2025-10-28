import ComingSoon from '../components/ComingSoon';

export default function BuyTokens() {
  return (
    <ComingSoon 
      feature="Buy Tokens"
      description="Purchase tokens with crypto or credit card to accelerate your progress, unlock premium features, and support the platform."
      estimatedRelease="Coming in v1.1.0 (2-3 weeks)"
      icon="sparkles"
      benefits={[
        "Buy with credit card (Stripe)",
        "Buy with crypto (multiple chains)",
        "Instant delivery",
        "Bonus tokens for bulk purchases",
        "Secure payment processing",
        "Transaction history & receipts"
      ]}
    />
  );
}
