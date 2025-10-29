import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    // Get request body
    const { package_id, amount, tokens, crypto_currency } = await req.json()

    // NOWPayments API (or use CoinPayments, Coinbase Commerce, etc.)
    const NOWPAYMENTS_API_KEY = Deno.env.get('NOWPAYMENTS_API_KEY') || ''

    // Create payment request
    const paymentResponse = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': NOWPAYMENTS_API_KEY,
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: 'usd',
        pay_currency: crypto_currency.toLowerCase(),
        order_id: `${user.id}_${Date.now()}`,
        order_description: `${tokens} Token Package`,
        ipn_callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/crypto-webhook`,
      }),
    })

    const paymentData = await paymentResponse.json()

    if (!paymentResponse.ok) {
      throw new Error(paymentData.message || 'Failed to create payment')
    }

    // Log the purchase intent
    await supabaseClient
      .from('token_purchases')
      .insert({
        user_id: user.id,
        package_id,
        tokens_purchased: tokens,
        payment_method: 'crypto',
        payment_status: 'pending',
        crypto_payment_id: paymentData.payment_id,
        crypto_currency: crypto_currency,
      })

    return new Response(
      JSON.stringify({
        payment_id: paymentData.payment_id,
        payment_address: paymentData.pay_address,
        crypto_amount: paymentData.pay_amount,
        crypto_currency: paymentData.pay_currency.toUpperCase(),
        qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${paymentData.pay_address}`,
        expires_at: paymentData.expiration_estimate_date,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

