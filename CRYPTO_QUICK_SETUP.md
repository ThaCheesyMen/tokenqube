# ⚡ CRYPTO SETUP - YOUR PERSONAL GUIDE

**You have your NOWPayments API key! Let's finish setup in 10 minutes!** 🚀

---

## ✅ STEP 1: ADD API KEY TO SUPABASE (2 min)

### Go to Supabase:
1. Open: https://supabase.com/dashboard
2. Select your **TokenQuest** project
3. Click **"Settings"** (gear icon, bottom left)
4. Click **"Secrets"** (in Settings menu)

### Add Your API Key:
1. Click **"New secret"**
2. **Name:** `NOWPAYMENTS_API_KEY`
3. **Value:** `0BK0R0M-1ZDM284-KYQHNEW-HE6R1JM`
4. Click **"Add secret"**

**Done! ✅**

---

## ✅ STEP 2: GET IPN SECRET (1 min)

### In NOWPayments Dashboard:
1. Go to: https://account.nowpayments.io/settings/api
2. Look for **"IPN Secret"** section
3. Click **"Show"** or **"Generate"** if you don't have one
4. **Copy the IPN Secret** (looks like: `ipn_xxxxxxxxxx`)

### Add to Supabase:
1. Go back to Supabase → Settings → Secrets
2. Click **"New secret"**
3. **Name:** `NOWPAYMENTS_IPN_SECRET`
4. **Value:** `[YOUR_IPN_SECRET_HERE]`
5. Click **"Add secret"**

**Done! ✅**

---

## ✅ STEP 3: DEPLOY EDGE FUNCTIONS (5 min)

### Open PowerShell:
Press `Win + X` → Select "Windows PowerShell"

### Run These Commands:
```powershell
# Navigate to your project
cd C:\Users\ronan\Desktop\tokenquest

# Login to Supabase (if not already logged in)
supabase login

# Deploy all 3 crypto functions
supabase functions deploy create-crypto-payment
supabase functions deploy crypto-webhook
supabase functions deploy check-crypto-payment
```

### Expected Output:
```
✅ Deployed Function create-crypto-payment
✅ Deployed Function crypto-webhook
   URL: https://[YOUR_PROJECT].supabase.co/functions/v1/crypto-webhook
✅ Deployed Function check-crypto-payment
```

**💾 COPY THE WEBHOOK URL from the output!**

Example: `https://abcdef123456.supabase.co/functions/v1/crypto-webhook`

**Done! ✅**

---

## ✅ STEP 4: SET UP WEBHOOK (2 min)

### In NOWPayments Dashboard:
1. Go to: https://account.nowpayments.io/settings/ipn
2. Click **"Add IPN Callback URL"**
3. **Paste your webhook URL** (from Step 3)
4. Click **"Save"**

**Done! ✅**

---

## ✅ STEP 5: ADD YOUR WALLET ADDRESS (Optional - 2 min)

### In NOWPayments Dashboard:
1. Go to: https://account.nowpayments.io/wallets
2. Click **"Add Wallet"**
3. Select currencies you want to receive:
   - **USDT (TRC20)** - Recommended first (stable, low fees)
   - **Bitcoin (BTC)** - Most popular
   - **Ethereum (ETH)** - Also popular
4. Enter your wallet addresses

**Don't have a wallet?**
- **Coinbase:** https://www.coinbase.com (easiest)
- **Binance:** https://www.binance.com (lowest fees)
- **Trust Wallet:** https://trustwallet.com (mobile)

**Done! ✅**

---

## 🧪 STEP 6: TEST PAYMENT!

### Test with Small Amount:
1. Go to your app: **https://questcord.app/#/crypto-wallet**
2. Select **USDT** (recommended for testing - stable price)
3. Click **"Starter Pack"** ($4.99)
4. Click **"Pay with USDT"**
5. You'll see:
   - Payment address
   - Amount to send
   - QR code
6. **Send crypto** from your wallet
7. Wait 1-2 minutes
8. **Tokens added automatically!** 🎉

---

## 🎯 VERIFICATION CHECKLIST:

After setup, verify:

### Supabase Secrets:
- [ ] `NOWPAYMENTS_API_KEY` added ✅
- [ ] `NOWPAYMENTS_IPN_SECRET` added ✅

### Edge Functions Deployed:
- [ ] `create-crypto-payment` deployed ✅
- [ ] `crypto-webhook` deployed ✅
- [ ] `check-crypto-payment` deployed ✅

### NOWPayments:
- [ ] IPN callback URL configured ✅
- [ ] Wallet address(es) added ✅

### Your App:
- [ ] `/crypto-wallet` page loads ✅
- [ ] Can select crypto currencies ✅
- [ ] Payment address shows when buying ✅
- [ ] Test payment successful ✅

---

## 📊 YOUR SETUP SUMMARY:

```
✅ Provider: NOWPayments
✅ API Key: 0BK0R0M-1ZDM284-KYQHNEW-HE6R1JM
✅ Route: /crypto-wallet
✅ Supported: 200+ cryptocurrencies
✅ Fees: 0.5% (vs 2.9% for Stripe)
✅ Settlement: Instant
```

---

## 🚀 YOU'RE READY!

After completing the steps above:
- ✅ Users can buy tokens with crypto
- ✅ 200+ cryptocurrencies supported
- ✅ Automatic token delivery
- ✅ Lower fees than credit cards
- ✅ Global reach

---

## 🎮 RECOMMENDED SETTINGS:

### For Gaming Platforms:
**Enable these cryptocurrencies:**
1. **USDT (TRC20)** - Stable, low fees, perfect!
2. **Bitcoin (BTC)** - Most popular
3. **Ethereum (ETH)** - Also very popular
4. **Dogecoin (DOGE)** - Gamers love it!
5. **Litecoin (LTC)** - Fast & cheap

**Why USDT?**
- No price volatility ($1 = 1 USDT always)
- Super low fees on TRON network
- Fast confirmations (1-2 minutes)
- Perfect for gaming!

---

## 💰 PRICING OPTIMIZATION:

### Current Packages:
- Starter: $4.99 → 1,000 tokens
- Popular: $9.99 → 3,000 tokens (500 bonus!) ⭐
- Premium: $19.99 → 6,500 tokens (1,500 bonus!)
- Ultimate: $34.99 → 14,000 tokens (4,000 bonus!)

### Pro Tip:
Offer **5% extra bonus for crypto payments** to incentivize adoption!

Example:
- Pay with card: 3,000 tokens
- Pay with crypto: 3,150 tokens (+150 bonus!)

This is still profitable because crypto fees are 5x lower! 🤑

---

## 🐛 TROUBLESHOOTING:

### ❌ "Invalid API Key"
**Check:**
- Key is exactly: `0BK0R0M-1ZDM284-KYQHNEW-HE6R1JM`
- No extra spaces
- In Supabase Secrets (not .env file)

### ❌ Payment address not showing
**Check:**
1. Edge Functions deployed successfully
2. Check logs: `supabase functions logs create-crypto-payment`
3. API key is correct in Supabase

### ❌ Tokens not added after payment
**Check:**
1. Webhook URL configured in NOWPayments
2. IPN secret is correct
3. Check logs: `supabase functions logs crypto-webhook`

### View Logs:
```powershell
supabase functions logs create-crypto-payment --limit 50
supabase functions logs crypto-webhook --limit 50
```

---

## 📞 NEED HELP?

### NOWPayments Support:
- **Dashboard:** https://account.nowpayments.io
- **Support:** support@nowpayments.io
- **Telegram:** @NOWPayments_support
- **Status:** https://status.nowpayments.io

### Documentation:
- **API Docs:** https://documenter.getpostman.com/view/7907941/S1a32n38
- **FAQ:** https://nowpayments.io/help

---

## 🎉 CONGRATULATIONS!

Once setup is complete, you'll have:
- ✅ **Crypto payments** working
- ✅ **Lower fees** (0.5% vs 2.9%)
- ✅ **Instant settlement**
- ✅ **Global reach**
- ✅ **200+ cryptocurrencies**

**You're about to accept your first crypto payment!** 🚀🪙

---

## 📈 WHAT'S NEXT?

### Today:
1. Complete setup (10 min)
2. Test payment (5 min)
3. Verify everything works

### This Week:
1. Add wallet addresses for all major cryptos
2. Test with different cryptocurrencies
3. Announce crypto payments to users!

### This Month:
1. Track crypto adoption rate
2. Calculate savings vs Stripe
3. Optimize pricing/bonuses

**Good luck! Let me know if you need any help!** 💬

