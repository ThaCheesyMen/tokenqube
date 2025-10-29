# ⚡ STRIPE QUICK START - 30 MINUTES TO PAYMENTS!

**Follow these steps in order** 👇

---

## ✅ STEP 1: CREATE STRIPE ACCOUNT (5 min)

1. Go to https://stripe.com
2. Click **"Start now"** 
3. Sign up with email
4. **Skip business details for now** - you can add later

**Result:** You have a Stripe account! ✅

---

## ✅ STEP 2: GET API KEYS (2 min)

1. In Stripe Dashboard, click **"Developers"** → **"API keys"**
2. Make sure **"Test mode"** is ON (toggle in left sidebar)
3. Copy these 2 keys:

**Publishable Key (Test):**
```
pk_test_XXXXXXXXXXXXXXXX
```

**Secret Key (Test):**
```
sk_test_XXXXXXXXXXXXXXXX
```
(Click "Reveal test key" to see it)

**Result:** You have your API keys! ✅

---

## ✅ STEP 3: ADD KEYS TO SUPABASE (3 min)

1. Go to https://supabase.com/dashboard
2. Select your **TokenQuest** project
3. Click **"Settings"** (bottom left) → **"Secrets"**
4. Click **"New secret"**

**Add Secret #1:**
- Name: `STRIPE_SECRET_KEY`
- Value: `sk_test_...` (your secret key from Step 2)
- Click **"Add secret"**

**Result:** Stripe secret key saved! ✅

---

## ✅ STEP 4: DEPLOY EDGE FUNCTIONS (10 min)

Open PowerShell in your project folder and run:

```powershell
cd C:\Users\ronan\Desktop\tokenquest

# Login to Supabase (if not already logged in)
supabase login

# Link your project (replace with your actual project ref)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all 3 functions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy create-transfer
```

**How to find YOUR_PROJECT_REF:**
1. Supabase Dashboard → Settings → General
2. Copy "Reference ID" (looks like `abcdefgh123`)

**Result:** Functions deployed! ✅

You'll see URLs like:
```
https://abcdefgh123.supabase.co/functions/v1/stripe-webhook
```

**💾 Copy the webhook URL!** You need it for the next step.

---

## ✅ STEP 5: SET UP WEBHOOK (5 min)

1. In Stripe Dashboard, go to **"Developers"** → **"Webhooks"**
2. Click **"Add endpoint"**

**Endpoint URL:**
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```
(Replace YOUR_PROJECT_REF with your actual ID)

**Events to listen to:**
- Click "Select events"
- Check: `checkout.session.completed`
- Check: `checkout.session.expired`
- Click "Add events"

3. Click **"Add endpoint"**

**Get Webhook Secret:**
1. After creating, you'll see **"Signing secret"**
2. Click **"Reveal"** (starts with `whsec_`)
3. Copy it!

**Add to Supabase:**
1. Go back to Supabase → Settings → Secrets
2. Click **"New secret"**
3. Name: `STRIPE_WEBHOOK_SECRET`
4. Value: `whsec_...` (the secret you just copied)
5. Click **"Add secret"**

**Result:** Webhook configured! ✅

---

## ✅ STEP 6: TEST IT! (5 min)

1. Go to your app: `https://yourapp.com/#/wallet`
2. Click **"Buy Tokens"**
3. Select "Popular Pack" ($9.99)
4. Click **"Buy Now"**

**You should be redirected to Stripe Checkout!**

5. Use this test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`

6. Click **"Pay"**

**You should:**
- ✅ Be redirected back to your app
- ✅ See success message
- ✅ See 3,000 tokens added to your balance!

**Result:** Payments working! ✅

---

## ✅ VERIFY (2 min)

**Check Stripe Dashboard:**
1. Go to **"Payments"**
2. You should see your test payment
3. Status: **"Succeeded"** ✅

**Check Webhook:**
1. Go to **"Developers"** → **"Webhooks"**
2. Click your webhook
3. Scroll to **"Event logs"**
4. You should see `checkout.session.completed`
5. Response: **200 OK** ✅

**Check Your App:**
1. Go to `/analytics-dashboard`
2. You should see the earnings!

---

## 🎉 YOU'RE DONE!

**Stripe is now fully integrated!**

You can now:
- ✅ Accept test payments
- ✅ Deliver tokens automatically
- ✅ Track all transactions
- ✅ Test withdrawals

---

## 🚀 GOING LIVE (When Ready)

To accept real payments:

1. **Complete Stripe activation:**
   - Add business details
   - Connect bank account
   - Verify identity

2. **Switch to live mode:**
   - Get live API keys (`pk_live_...` and `sk_live_...`)
   - Update Supabase secrets with live keys
   - Create new webhook for live mode
   - Update `STRIPE_WEBHOOK_SECRET` with live secret

3. **Test with real card:**
   - Make a $4.99 test purchase
   - Verify everything works

4. **Launch!** 🎊

---

## 📞 TROUBLESHOOTING

### ❌ "Webhook signature verification failed"
**Fix:** Make sure `STRIPE_WEBHOOK_SECRET` in Supabase matches the secret shown in Stripe Dashboard

### ❌ "Invalid API Key"
**Fix:** Make sure you copied the full key (starts with `sk_test_` or `pk_test_`)

### ❌ Tokens not added after payment
**Fix:** 
1. Check Stripe webhook logs (should show 200 OK)
2. Check Supabase Edge Function logs: `supabase functions logs stripe-webhook`
3. Make sure webhook secret is correct

### ❌ Can't deploy functions
**Fix:** 
1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. Run `supabase login` again
3. Make sure you're linked to correct project

---

## 💡 NEXT STEPS

1. **Test all 4 token packages** ($4.99, $9.99, $19.99, $34.99)
2. **Test failed payments** (use card `4000 0000 0000 0002`)
3. **Check analytics** to see earnings tracked
4. **Customize token packages** if you want different prices

---

## 🎯 TEST CARDS REFERENCE

**Successful Payment:**
- `4242 4242 4242 4242`

**Declined:**
- `4000 0000 0000 0002`

**Insufficient Funds:**
- `4000 0000 0000 9995`

**Expired Card:**
- `4000 0000 0000 0069`

**Full list:** https://stripe.com/docs/testing

---

**You're ready to make money! Good luck! 🚀💰**

