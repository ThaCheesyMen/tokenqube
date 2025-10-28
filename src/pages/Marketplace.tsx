import ComingSoon from '../components/ComingSoon';

export default function Marketplace() {
  return (
    <ComingSoon 
      feature="Marketplace"
      description="Trade items, buy and sell game assets, and participate in auctions with other players. Your one-stop shop for all gaming items and currency."
      estimatedRelease="Coming in v1.1.0 (2-3 weeks)"
      icon="sparkles"
      benefits={[
        "Buy and sell game items safely",
        "Participate in live auctions",
        "Trade with other players",
        "Secure escrow system",
        "Price history & trends",
        "Seller ratings & reviews"
      ]}
    />
  );
}
