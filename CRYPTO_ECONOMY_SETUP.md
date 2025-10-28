# 🚀 Crypto Token Economy - Complete Setup Guide

## Overview
Your platform now has a **complete token economy system** where users can:
- ✅ Buy tokens with credit card or cryptocurrency
- ✅ Earn tokens by playing games
- ✅ Trade tokens in the marketplace (5% platform fee)
- ✅ Withdraw tokens for crypto (2% platform fee)
- ✅ **YOU earn passive income from fees automatically**

---

## 📊 Access Your Revenue Dashboard

### URL to Access:
```
http://localhost:5173/adminrevenue
```

Or click on your sidebar and navigate to page ID: `adminrevenue`

### What You'll See:
- **Real-time revenue tracking**
- **Marketplace fees** (5% of all marketplace transactions)
- **Withdrawal fees** (2% of all token withdrawals)
- **Token sales revenue**
- **Pending withdrawal requests** to approve/reject
- **Export revenue data** to CSV

---

## 💰 How You Make Money (Passive Income)

### 1. Marketplace Fees (5%)
- **When**: Any user sells an item on the marketplace
- **How much**: 5% of the transaction automatically goes to you
- **Example**: User sells skin for 10,000 tokens → You get 500 tokens ($0.50)
- **Status**: ✅ Already implemented and automatic

### 2. Withdrawal Fees (2%)
- **When**: User withdraws tokens for crypto
- **How much**: 2% of withdrawal amount
- **Example**: User withdraws 100,000 tokens ($100) → You get 2,000 tokens ($2)
- **Status**: ✅ Implemented, you approve each withdrawal

### 3. Token Sales Revenue
- **When**: User buys tokens with credit card or crypto
- **How much**: Full purchase amount minus payment processing fees
- **Example**: User buys $50 worth of tokens → You get ~$48.50 (after Stripe fees)
- **Status**: ⚠️ Requires Stripe/crypto gateway setup (see below)

---

## 🔧 Step 1: Set Up Stripe (Credit Card Payments)

### Create Stripe Account:
1. Go to https://stripe.com
2. Sign up for account
3. Complete KYC verification
4. Get your API keys

### Add to Environment Variables:
Create `.env` file in root:
```env
# Stripe Keys
VITE_STRIPE_PUBLIC_KEY=pk_live_YOUR_PUBLIC_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY

# Webhook secret for verifying payments
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### Implement Stripe Checkout:
The code is already prepared in `src/pages/TokenEconomy.tsx`.
You need to create a backend endpoint:

```typescript
// Example: /api/create-checkout-session
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(req, res) {
  const { packageId, userId } = req.body;
  
  // Get package details from database
  const package = await supabase
    .from('token_packages')
    .select('*')
    .eq('id', packageId)
    .single();
  
  // Create Stripe session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: package.data.package_name,
          description: `${package.data.token_amount + package.data.bonus_tokens} tokens`
        },
        unit_amount: package.data.price_usd * 100 // cents
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/tokeneconomy/success`,
    cancel_url: `${process.env.FRONTEND_URL}/tokeneconomy`,
    client_reference_id: userId,
    metadata: {
      package_id: packageId,
      user_id: userId,
      tokens: package.data.token_amount + package.data.bonus_tokens
    }
  });
  
  res.json({ sessionId: session.id });
}
```

### Stripe Webhook (Auto-deliver tokens):
```typescript
// /api/stripe-webhook
export async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { user_id, package_id, tokens } = session.metadata;
    
    // Add tokens to user
    await supabase.rpc('add_tokens', {
      p_user_id: user_id,
      p_amount: parseInt(tokens)
    });
    
    // Track revenue
    await supabase.rpc('track_token_purchase_revenue', {
      p_amount_usd: session.amount_total / 100,
      p_tokens_purchased: parseInt(tokens)
    });
    
    // Log transaction
    await supabase.from('token_purchases').insert({
      user_id,
      package_id,
      tokens_purchased: parseInt(tokens),
      price_paid: session.amount_total / 100,
      payment_method: 'stripe',
      stripe_payment_intent_id: session.payment_intent,
      status: 'completed'
    });
  }
  
  res.json({ received: true });
}
```

---

## 💎 Step 2: Set Up Crypto Payments (Optional but Recommended)

### Option A: Coinbase Commerce (Recommended - Easiest)
1. Go to https://commerce.coinbase.com
2. Create account
3. Get API key
4. Accepts BTC, ETH, USDT, etc.

```env
COINBASE_COMMERCE_API_KEY=your_api_key
```

### Option B: Blockchain Integration (Advanced)
- Direct wallet integration
- Lower fees but more complex
- Need to manage private keys

### Implement Crypto Payment:
```typescript
// Example with Coinbase Commerce
import { Client } from 'coinbase-commerce-node';

const client = Client.init(process.env.COINBASE_COMMERCE_API_KEY);

export async function createCryptoCharge(req, res) {
  const { packageId, userId, amount, description } = req.body;
  
  const charge = await client.charges.create({
    name: 'Token Purchase',
    description,
    pricing_type: 'fixed_price',
    local_price: {
      amount: amount.toString(),
      currency: 'USD'
    },
    metadata: {
      package_id: packageId,
      user_id: userId
    },
    redirect_url: `${process.env.FRONTEND_URL}/tokeneconomy/success`,
    cancel_url: `${process.env.FRONTEND_URL}/tokeneconomy`
  });
  
  res.json({ hostedUrl: charge.hosted_url });
}
```

---

## 💸 Step 3: Processing Token Withdrawals

### How It Works:
1. User requests withdrawal in `/tokeneconomy` page (Sell tab)
2. Tokens are immediately deducted from their balance
3. **You see the request in `/adminrevenue` dashboard**
4. You manually send crypto to their wallet address
5. You click "Approve" to mark as completed
6. **Your 2% fee is automatically tracked**

### Manual Processing Steps:
1. Open `/adminrevenue` dashboard
2. See pending withdrawal requests
3. For each request:
   - User wants to withdraw X tokens for $Y
   - Send $Y worth of BTC/ETH/USDT to their address
   - Click "Approve" in dashboard
   - Fee is automatically added to your revenue

### Automation (Advanced):
You can automate withdrawals using:
- Coinbase API for automatic crypto sends
- Blockchain integration
- But manual is safer to start

---

## 📈 Database Migration

Run the migration to set up tables:
```bash
# Apply the migration
npx supabase db push

# Or if using Supabase CLI
supabase migration up
```

The migration file: `supabase/migrations/20251028130000_crypto_economy_system.sql`

Creates:
- `token_withdrawals` table
- `platform_revenue` table  
- `admin_notifications` table
- Auto-tracking triggers for fees
- Revenue analytics views

---

## 🎮 User Flow

### Earning Tokens:
1. User plays games → Earns tokens automatically (already works)
2. User completes quests → Earns tokens
3. User sells items in marketplace → Gets tokens (you get 5% fee)

### Spending Tokens:
1. User buys items in marketplace (you get 5% fee)
2. User redeems for in-game currency
3. **User withdraws for crypto (you get 2% fee)**

### Buying More Tokens:
1. User goes to `/tokeneconomy` page
2. Chooses package
3. Pays with:
   - Credit card (Stripe) → **You get revenue**
   - Crypto (Coinbase/blockchain) → **You get revenue**
4. Tokens delivered instantly

---

## 💵 Revenue Tracking

### View in Real-Time:
```
Navigate to: /adminrevenue
```

### What's Tracked:
- Daily revenue breakdown
- Total gross revenue
- Net revenue (after fees)
- Marketplace fees collected
- Withdrawal fees collected
- Token sales
- Average daily revenue
- Profit margins

### Export Data:
Click "Export CSV" button to download full revenue history

---

## 🔐 Security Features

### Already Implemented:
- ✅ RLS policies on all tables
- ✅ Minimum withdrawal amounts (10,000 tokens = $10)
- ✅ 2% withdrawal fee
- ✅ Admin approval required for withdrawals
- ✅ Automatic fee tracking
- ✅ Transaction logging
- ✅ Fraud prevention (tokens deducted immediately)

### Recommended:
- Set up 2FA for your admin account
- Use environment variables for all API keys
- Enable Stripe Radar for fraud detection
- Monitor suspicious withdrawal patterns

---

## 📊 Token Economics

### Token Value:
- **$1 USD = 1,000 tokens**
- Easy conversion: 10,000 tokens = $10

### Your Profit Margins:
- Token sales: ~3-5% (after payment processing fees)
- Marketplace: 5% per transaction
- Withdrawals: 2% per withdrawal

### Example Monthly Revenue:
If you have:
- 1,000 active users
- $50k total marketplace volume → **$2,500 in fees**
- $10k token withdrawals → **$200 in fees**
- $20k token purchases → **~$800 in fees**
- **Total: ~$3,500/month passive income**

---

## 🚀 Quick Start Checklist

- [ ] Run database migration
- [ ] Set up Stripe account
- [ ] Add Stripe keys to `.env`
- [ ] Create Stripe webhook endpoint
- [ ] (Optional) Set up Coinbase Commerce
- [ ] Access `/adminrevenue` to view dashboard
- [ ] Test buying tokens (use Stripe test mode)
- [ ] Test withdrawal process
- [ ] Monitor first transactions

---

## 🎯 Next Steps

1. **Test in Development**:
   - Use Stripe test mode
   - Make test purchases
   - Process test withdrawals

2. **Go Live**:
   - Switch to Stripe live keys
   - Update webhook URLs
   - Start accepting real payments

3. **Scale**:
   - Add more payment methods
   - Automate crypto withdrawals
   - Add subscription plans
   - Implement token staking (already in Rewards page)

---

## 📞 Support & Documentation

- Stripe Docs: https://stripe.com/docs
- Coinbase Commerce: https://commerce.coinbase.com/docs
- Supabase RPC Functions: Already implemented
- Revenue Tracking: Automatic via triggers

---

## 🎉 You're All Set!

Your platform now has a **complete monetization system** with:
- Multiple revenue streams
- Automatic fee collection
- Real-time analytics
- Professional payment processing

**Start earning passive income from your gaming platform! 💰**

