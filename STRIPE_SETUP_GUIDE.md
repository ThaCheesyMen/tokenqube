# 💳 STRIPE SETUP GUIDE - COMPLETE INSTRUCTIONS

**Time Required:** 30-45 minutes  
**Difficulty:** Medium  
**Result:** Real money payments working! 💰

---

## 📋 OVERVIEW

This guide will help you:
1. Create a Stripe account
2. Get API keys
3. Deploy Supabase Edge Functions
4. Set up webhooks
5. Test payments
6. Go live!

---

## 🚀 STEP 1: CREATE STRIPE ACCOUNT

### 1.1 Sign Up for Stripe
1. Go to https://stripe.com
2. Click **"Start now"** (top right)
3. Enter your email
4. Create a password
5. Verify your email

### 1.2 Complete Business Profile
1. **Business Name:** QuestCord (or your app name)
2. **Business Type:** Individual or Company
3. **Country:** Your country
4. **Industry:** Software / Gaming
5. **Website:** Your app URL (e.g., questcord.app)

### 1.3 Activate Your Account
1. Click **"Activate account"** in Stripe Dashboard
2. Enter business details:
   - Legal business name
   - Tax ID (if applicable)
   - Bank account for payouts
   - Verify phone number
3. Submit verification documents (if required)

**⏱️ Activation Time:** Instant to 2 business days

---

## 🔑 STEP 2: GET STRIPE API KEYS

### 2.1 Get Test Keys (For Testing)
1. In Stripe Dashboard, click **"Developers"** (top right)
2. Click **"API keys"**
3. Toggle **"Test mode"** ON (switch in left sidebar)
4. Copy these keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - Click "Reveal test key"

### 2.2 Get Live Keys (For Production)
1. Toggle **"Test mode"** OFF
2. Copy these keys:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`) - Click "Reveal live key"

**⚠️ NEVER share your secret keys publicly!**

---

## 🔧 STEP 3: ADD KEYS TO SUPABASE

### 3.1 Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project: **TokenQuest**
3. Click **"Settings"** (gear icon, bottom left)
4. Click **"Secrets"** (in Settings menu)

### 3.2 Add Stripe Secret Key
1. Click **"New secret"**
2. Name: `STRIPE_SECRET_KEY`
3. Value: Your Stripe secret key (e.g., `sk_test_...`)
4. Click **"Add secret"**

### 3.3 Add Webhook Secret (We'll get this in Step 5)
_Come back here after Step 5.3_

---

## 📦 STEP 4: DEPLOY SUPABASE EDGE FUNCTIONS

### 4.1 Install Supabase CLI (If Not Installed)

**Windows (PowerShell):**
```powershell
scoop install supabase
```
OR download from: https://github.com/supabase/cli/releases

**Mac:**
```bash
brew install supabase/tap/supabase
```

**Verify Installation:**
```bash
supabase --version
```

### 4.2 Login to Supabase
```bash
supabase login
```
Follow the prompts to authenticate.

### 4.3 Link Your Project
```bash
cd C:\Users\ronan\Desktop\tokenquest
supabase link --project-ref YOUR_PROJECT_REF
```

**Where to find PROJECT_REF:**
1. Go to Supabase Dashboard
2. Click "Settings" → "General"
3. Copy "Reference ID" (looks like: `abcdefghijklm`)

### 4.4 Deploy Edge Functions
```bash
# Deploy checkout function
supabase functions deploy create-checkout-session

# Deploy webhook function
supabase functions deploy stripe-webhook

# Deploy transfer function (for withdrawals)
supabase functions deploy create-transfer
```

**Expected Output:**
```
✅ Deployed Function create-checkout-session
URL: https://[PROJECT_REF].supabase.co/functions/v1/create-checkout-session

✅ Deployed Function stripe-webhook
URL: https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhook

✅ Deployed Function create-transfer
URL: https://[PROJECT_REF].supabase.co/functions/v1/create-transfer
```

**💾 Save these URLs! You'll need them.**

---

## 🎣 STEP 5: SET UP STRIPE WEBHOOKS

### 5.1 Go to Stripe Webhooks
1. In Stripe Dashboard, go to **"Developers"** → **"Webhooks"**
2. Click **"Add endpoint"** (or "Test in a local environment" for testing)

### 5.2 Add Webhook Endpoint
1. **Endpoint URL:** 
   ```
   https://[YOUR_PROJECT_REF].supabase.co/functions/v1/stripe-webhook
   ```
   Replace `[YOUR_PROJECT_REF]` with your actual project ref

2. **Description:** `QuestCord Payment Webhook`

3. **Select events to listen to:**
   - Click "Select events"
   - Check these events:
     ✅ `checkout.session.completed`
     ✅ `checkout.session.expired`
   - Click "Add events"

4. Click **"Add endpoint"**

### 5.3 Get Webhook Signing Secret
1. After creating the webhook, you'll see a **"Signing secret"**
2. Click **"Reveal"** to show it (starts with `whsec_`)
3. Copy this secret

### 5.4 Add Webhook Secret to Supabase
1. Go back to Supabase Dashboard → Settings → Secrets
2. Click **"New secret"**
3. Name: `STRIPE_WEBHOOK_SECRET`
4. Value: Your webhook signing secret (e.g., `whsec_...`)
5. Click **"Add secret"**

---

## 🧪 STEP 6: TEST PAYMENTS (TEST MODE)

### 6.1 Use Stripe Test Cards
Stripe provides test card numbers that simulate different scenarios:

**✅ Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**❌ Card Declined:**
- Card: `4000 0000 0000 0002`

**⏳ Requires Authentication (3D Secure):**
- Card: `4000 0027 6000 3184`

### 6.2 Test in Your App
1. Go to your app: `https://yourapp.com/#/wallet`
2. Click **"Buy Tokens"**
3. Select a package (e.g., Popular Pack - $9.99)
4. Click **"Buy Now"**
5. You should be redirected to Stripe Checkout
6. Enter test card: `4242 4242 4242 4242`
7. Complete payment
8. You should be redirected back with success message
9. Check your token balance - tokens should be added!

### 6.3 Verify in Stripe Dashboard
1. Go to Stripe Dashboard → **"Payments"**
2. You should see your test payment
3. Status should be "Succeeded"

### 6.4 Verify Webhook Received
1. Go to Stripe Dashboard → **"Developers"** → **"Webhooks"**
2. Click on your webhook endpoint
3. Scroll down to **"Event logs"**
4. You should see `checkout.session.completed` event
5. Status should be "Succeeded" (200 response)

---

## 🚀 STEP 7: GO LIVE!

### 7.1 Switch to Live Mode
1. In Stripe Dashboard, toggle **"Test mode"** OFF
2. Copy your **LIVE keys** (not test keys!)
3. Update Supabase secrets:
   - Update `STRIPE_SECRET_KEY` with live key (`sk_live_...`)

### 7.2 Update Webhook for Live Mode
1. Go to Stripe Dashboard → **"Developers"** → **"Webhooks"**
2. Toggle to **"Live mode"**
3. Add a new webhook endpoint (same URL as before)
4. Copy the new **live webhook secret**
5. Update Supabase secret:
   - Update `STRIPE_WEBHOOK_SECRET` with live secret

### 7.3 Complete Stripe Activation
Before accepting live payments, Stripe requires:
- ✅ Business verification (if not done yet)
- ✅ Bank account added for payouts
- ✅ Phone number verified
- ✅ Agree to Stripe's terms

### 7.4 Test One Live Payment
1. Make a small test purchase ($4.99)
2. Use a REAL card (not test card!)
3. Verify tokens are added
4. Check Stripe Dashboard for successful payment

---

## 💸 STEP 8: SET UP PAYOUTS (FOR WITHDRAWALS)

### 8.1 Enable Stripe Connect (Optional but Recommended)
For users to withdraw earnings:

1. Go to Stripe Dashboard → **"Connect"**
2. Click **"Get started"**
3. Choose **"Express"** (easiest for users)
4. Follow setup wizard

### 8.2 Implement Connect Onboarding
This requires additional code to let users connect their bank accounts.

**For now, withdrawals will be manual:**
- Users request withdrawal in app
- You manually process via Stripe Dashboard
- Takes 3-5 business days

**Future:** Automate with Stripe Connect Express accounts

---

## ✅ VERIFICATION CHECKLIST

After setup, verify:

### Stripe Dashboard:
- [ ] Account is activated
- [ ] Live mode is enabled
- [ ] Webhook endpoint is configured
- [ ] Bank account is connected

### Supabase:
- [ ] `STRIPE_SECRET_KEY` secret added (live key)
- [ ] `STRIPE_WEBHOOK_SECRET` secret added (live key)
- [ ] All 3 Edge Functions deployed

### Your App:
- [ ] `/wallet` page loads
- [ ] Token packages display
- [ ] "Buy Now" redirects to Stripe Checkout
- [ ] Successful payment adds tokens
- [ ] Withdrawal form works

---

## 🐛 TROUBLESHOOTING

### Error: "No such customer"
**Solution:** Make sure webhook secret is correct in Supabase

### Error: "Invalid API Key"
**Solution:** 
- Check you're using the correct key (test vs live)
- Make sure secret is saved correctly in Supabase

### Webhook Not Receiving Events
**Solution:**
- Verify webhook URL is correct
- Check Supabase function logs for errors
- Ensure webhook secret matches

### Tokens Not Added After Payment
**Solution:**
- Check webhook event log in Stripe Dashboard
- Look at Supabase Edge Function logs
- Verify `token_purchases` table has entry

### Can't Access Edge Function Logs
**View logs:**
```bash
supabase functions logs create-checkout-session
supabase functions logs stripe-webhook
```

---

## 💰 PRICING & FEES

### Stripe Fees:
- **Card Payments:** 2.9% + $0.30 per transaction
- **Payouts:** Free (to US bank accounts)
- **International Cards:** +1.5%

### Example Calculation:
**User buys $9.99 package:**
- Gross: $9.99
- Stripe Fee: $0.59 (2.9% + $0.30)
- Your Net: $9.40

**Your Profit Per Transaction:**
- User gets 3,000 tokens (worth $30 at $0.01/token)
- You receive $9.40
- Cost to you: $30 in tokens
- **WAIT...** You control the token economy! Tokens are free for you.
- **Actual Profit:** $9.40 (94% margin!)

---

## 📊 MONITORING & ANALYTICS

### Stripe Dashboard:
- **Payments:** Track all transactions
- **Customers:** See user purchases
- **Payouts:** Monitor your earnings
- **Reports:** Export data for taxes

### Supabase:
- **token_purchases** table: All purchases
- **token_withdrawals** table: All withdrawals
- **token_transactions** table: Complete audit trail

---

## 🔐 SECURITY BEST PRACTICES

1. **NEVER commit API keys to GitHub**
   - Use Supabase secrets
   - Add `.env` to `.gitignore`

2. **Use webhook signatures**
   - Always verify webhook signatures
   - Prevents fake webhook calls

3. **Implement rate limiting**
   - Prevent abuse
   - Use Supabase Edge Function rate limits

4. **Monitor for fraud**
   - Check Stripe Radar (automatic fraud detection)
   - Set up alerts for suspicious activity

5. **Test thoroughly**
   - Use test mode extensively
   - Test all error scenarios

---

## 📞 NEED HELP?

### Stripe Support:
- **Email:** support@stripe.com
- **Docs:** https://stripe.com/docs
- **Chat:** Available in Stripe Dashboard

### Supabase Support:
- **Docs:** https://supabase.com/docs
- **Discord:** https://discord.supabase.com
- **GitHub:** https://github.com/supabase/supabase

---

## 🎉 YOU'RE ALL SET!

You now have:
- ✅ Real credit card payments
- ✅ Automated token delivery
- ✅ Webhook integration
- ✅ Secure payment processing
- ✅ Ready to make money!

**Start accepting payments and grow your platform!** 💰🚀

---

## 📈 NEXT STEPS

1. **Test everything** in test mode first
2. **Switch to live mode** when ready
3. **Monitor transactions** daily
4. **Analyze sales data** weekly
5. **Optimize pricing** monthly

**Good luck! You're about to make your first sale!** 🎊

