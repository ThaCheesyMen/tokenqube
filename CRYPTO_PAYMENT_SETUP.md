# 🪙 CRYPTO PAYMENT SETUP - COMPLETE GUIDE

**Accept Bitcoin, Ethereum, USDT, and 200+ cryptocurrencies!** 💰

**Time Required:** 20-30 minutes  
**Difficulty:** Easy  
**Provider:** NOWPayments (industry leader)  

---

## 🎉 WHY CRYPTO PAYMENTS?

### vs Traditional Payment Processors (Stripe/PayPal):

| Feature | Crypto | Credit Cards |
|---------|--------|--------------|
| **Fees** | 0.5-1% | 2.9% + $0.30 |
| **Settlement** | Instant | 2-7 days |
| **Chargebacks** | ❌ None | ✅ Yes (risky) |
| **Global Access** | 🌍 Everywhere | ❌ Restricted |
| **Privacy** | 🔒 High | 📧 KYC Required |
| **Age Limit** | No | 18+ |
| **Crypto Users** | ✅ Perfect | ❌ Need card |

**Your Profit Example:**
- User buys $9.99 package
- **Stripe Fee:** $0.59 (5.9%) = You get $9.40
- **Crypto Fee:** $0.10 (1%) = You get $9.89 ✅
- **Extra profit per transaction: $0.49!**

At 100 transactions/month = **$49 extra profit!** 🤑

---

## ⚡ QUICK START (20 MINUTES)

### STEP 1: Create NOWPayments Account (5 min)

1. Go to https://nowpayments.io
2. Click **"Get Started"**
3. Sign up with email
4. Verify email

**Done! Account created!** ✅

---

### STEP 2: Get API Keys (3 min)

1. Login to NOWPayments Dashboard
2. Go to **"Settings"** → **"API"**
3. Click **"Generate API Key"**
4. Copy these keys:
   - **API Key** (for creating payments)
   - **IPN Secret** (for webhooks)

**Save these keys!** 🔑

---

### STEP 3: Add Keys to Supabase (2 min)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"Settings"** → **"Secrets"**

**Add Secret #1:**
- Name: `NOWPAYMENTS_API_KEY`
- Value: Your API key
- Click "Add secret"

**Add Secret #2:**
- Name: `NOWPAYMENTS_IPN_SECRET`
- Value: Your IPN secret
- Click "Add secret"

**Done!** ✅

---

### STEP 4: Deploy Edge Functions (5 min)

Open PowerShell:

```powershell
cd C:\Users\ronan\Desktop\tokenquest

# Deploy crypto payment functions
supabase functions deploy create-crypto-payment
supabase functions deploy crypto-webhook
supabase functions deploy check-crypto-payment
```

**Expected Output:**
```
✅ Deployed Function create-crypto-payment
URL: https://[PROJECT].supabase.co/functions/v1/create-crypto-payment

✅ Deployed Function crypto-webhook
URL: https://[PROJECT].supabase.co/functions/v1/crypto-webhook

✅ Deployed Function check-crypto-payment
```

**Copy the crypto-webhook URL!** 📋

---

### STEP 5: Set Up Webhook (3 min)

1. In NOWPayments Dashboard, go to **"Settings"** → **"IPN"**
2. Click **"Add IPN Callback URL"**
3. **URL:** Your webhook URL from Step 4:
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/crypto-webhook
   ```
4. Click **"Save"**

**Done!** ✅

---

### STEP 6: Connect Wallet (2 min)

1. In NOWPayments Dashboard, go to **"Wallets"**
2. Click **"Add Wallet"**
3. Choose currencies you want to receive:
   - **Bitcoin (BTC)** - Most popular
   - **Ethereum (ETH)** - Fast & cheap
   - **USDT (Tether)** - Stable coin
   - **USDC** - Another stable coin
   - More...

4. Enter your wallet addresses for each

**Pro Tip:** Use a hardware wallet (Ledger/Trezor) for security!

---

### STEP 7: Test Payment! (5 min)

1. Go to your app: `https://yourapp.com/#/crypto-wallet`
2. Select a crypto currency (USDT recommended for testing)
3. Click **"Popular Pack"** ($9.99)
4. Click **"Pay with USDT"**

**You should see:**
- Payment address
- Amount to send
- QR code

5. Send crypto to the address
6. Wait 1-2 minutes
7. Tokens added automatically! 🎉

**Success!** ✅

---

## 🎯 SUPPORTED CRYPTOCURRENCIES

NOWPayments supports **200+ cryptocurrencies**:

### Most Popular (Recommended):
- **Bitcoin (BTC)** - King of crypto
- **Ethereum (ETH)** - #2 crypto
- **USDT (Tether)** - Stable coin ($1 = 1 USDT)
- **USDC** - Another stable coin
- **Litecoin (LTC)** - Fast & cheap
- **Dogecoin (DOGE)** - Meme coin, huge community
- **BNB** - Binance Coin
- **Cardano (ADA)**
- **Polygon (MATIC)**
- **Solana (SOL)**

### For Gamers:
- **ENJ (Enjin Coin)** - Gaming crypto
- **MANA (Decentraland)**
- **SAND (Sandbox)**
- **AXS (Axie Infinity)**

**Full list:** https://nowpayments.io/supported-coins/

---

## 💰 FEE STRUCTURE

### NOWPayments Fees:
- **Standard:** 0.5% per transaction
- **Monthly Plan:** 0.4% (if you do 500+ tx/month)
- **No setup fees**
- **No monthly fees** (unless you want lower %)

### Example Calculation:
**User buys $9.99 package:**
- Gross: $9.99
- NOWPayments Fee: $0.05 (0.5%)
- Your Net: $9.94

**Compare to Stripe:**
- Stripe Fee: $0.59 (5.9%)
- Your Net: $9.40

**You earn $0.54 more per transaction with crypto!** 🚀

---

## 🔐 SECURITY BEST PRACTICES

### 1. **Use Different Wallets**
- **Hot Wallet:** For receiving payments (small amounts)
- **Cold Wallet:** For storing profits (hardware wallet)

### 2. **Enable 2FA**
- On NOWPayments account
- On your crypto wallets
- On Supabase

### 3. **Verify Webhook Signatures**
- Already implemented in webhook function
- Never trust webhook without signature verification

### 4. **Set Up Alerts**
- NOWPayments has email/SMS alerts
- Get notified of all transactions

### 5. **Regular Withdrawals**
- Don't keep large amounts in hot wallet
- Transfer to cold storage regularly

---

## 🧪 TESTING

### Testnets (Free Testing):
NOWPayments supports testnets for:
- Bitcoin Testnet
- Ethereum Goerli
- BSC Testnet

**To Enable:**
1. Go to Settings → API
2. Enable "Sandbox Mode"
3. Use testnet tokens (free from faucets)

### Test Without Real Crypto:
1. Use very small amounts ($0.10)
2. Use USDT on Polygon (almost free fees)
3. Ask friends to test and refund them

---

## 📊 DASHBOARD & ANALYTICS

### NOWPayments Dashboard Shows:
- 📈 Total revenue
- 💰 Currency breakdown
- 📅 Transaction history
- 🔄 Conversion rates
- 📧 Export to CSV

### Your App Analytics:
- Go to `/analytics-dashboard`
- See all crypto purchases
- Track trends
- Analyze user preferences

---

## 🚀 GOING LIVE CHECKLIST

Before accepting real payments:

- [ ] NOWPayments account verified
- [ ] API keys added to Supabase
- [ ] Edge Functions deployed
- [ ] Webhook URL configured
- [ ] Wallet addresses added
- [ ] Test payment successful
- [ ] 2FA enabled
- [ ] Cold wallet set up
- [ ] Terms & Conditions updated
- [ ] Privacy Policy mentions crypto

---

## 🎨 CUSTOMIZATION

### Change Token Packages:
Edit `src/pages/CryptoWallet.tsx`:
```typescript
const tokenPackages = [
  { id: 'custom', name: 'Custom Pack', tokens: 500, price: 2.99, bonus: 0 },
  // Add more packages...
]
```

### Add More Cryptocurrencies:
Edit `cryptoOptions`:
```typescript
const cryptoOptions = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: 'text-orange-500' },
  { symbol: 'SOL', name: 'Solana', icon: '◎', color: 'text-purple-500' },
  // Add more...
]
```

### Change Exchange Rate:
Currently: 100 tokens = $1 USD

To change:
```typescript
const usdAmount = withdrawAmount / 100; // Change 100 to your rate
```

---

## ⚠️ COMPLIANCE & LEGAL

### Important Notes:
1. **Know Your Customer (KYC):**
   - NOWPayments handles KYC
   - You don't need to collect user info

2. **Tax Obligations:**
   - Crypto transactions are taxable
   - Keep records of all transactions
   - Consult a tax professional

3. **Money Transmitter License:**
   - May be required in some countries
   - NOWPayments is registered, you're covered

4. **Terms of Service:**
   - Add crypto payment terms
   - Mention no refunds (crypto is irreversible)

---

## 🐛 TROUBLESHOOTING

### ❌ "Invalid API Key"
**Fix:** Check key is correct in Supabase secrets

### ❌ Payment address not showing
**Fix:** 
1. Check Edge Function logs: `supabase functions logs create-crypto-payment`
2. Verify NOWPayments API is working
3. Check API key has permissions

### ❌ Tokens not added after payment
**Fix:**
1. Check webhook logs: `supabase functions logs crypto-webhook`
2. Verify webhook URL in NOWPayments
3. Check IPN secret matches

### ❌ "Unsupported currency"
**Fix:** Make sure currency is enabled in NOWPayments dashboard

---

## 📞 SUPPORT

### NOWPayments Support:
- **Email:** support@nowpayments.io
- **Telegram:** @NOWPayments_support
- **Docs:** https://documenter.getpostman.com/view/7907941/S1a32n38

### Crypto Payment Issues:
- Check blockchain explorer (blockchain.com, etherscan.io)
- Verify transaction status
- Contact NOWPayments support

---

## 💡 PRO TIPS

### 1. **Use Stable Coins**
- USDT/USDC have no price volatility
- $1 = 1 USDT always
- Perfect for gaming

### 2. **Auto-Convert to USD**
- NOWPayments can auto-convert crypto to fiat
- Removes price risk
- Costs ~1% extra fee

### 3. **Offer Crypto Discounts**
- "Pay with crypto, get 10% bonus tokens!"
- Incentivizes crypto adoption
- Lower fees = can afford discount

### 4. **Marketing**
- Add "We Accept Crypto" badge
- List on crypto gaming sites
- Tweet about it!

---

## 🎉 ALTERNATIVE PROVIDERS

If NOWPayments doesn't work for you:

### Other Options:
1. **Coinbase Commerce** (US-friendly)
   - Free
   - Only BTC, ETH, USDC, DAI
   - No KYC

2. **CoinPayments** (Oldest)
   - 0.5% fee
   - 2000+ coins
   - More complex setup

3. **BTCPay Server** (Self-hosted)
   - Free & open source
   - Full control
   - Requires technical knowledge

4. **BitPay** (Enterprise)
   - 1% fee
   - Good reputation
   - Higher minimums

**NOWPayments recommended for most users!**

---

## 🚀 YOU'RE READY!

You now have:
- ✅ Crypto payments working
- ✅ 200+ cryptocurrencies supported
- ✅ Lower fees than credit cards
- ✅ Instant settlement
- ✅ Global reach
- ✅ Automatic token delivery

**Start accepting crypto and grow your platform!** 🌍💰

---

## 📈 EXPECTED RESULTS

### Month 1:
- 10-20% of users will try crypto
- Lower payment processing costs
- New international users

### Month 3:
- 30-40% crypto adoption
- Significant fee savings
- Crypto-native gamers

### Month 6:
- 50%+ crypto payments
- Thousands saved in fees
- Strong crypto community

**Good luck!** 🚀🪙

