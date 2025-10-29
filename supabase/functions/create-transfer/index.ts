import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

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
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

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
    const { tokens_withdrawn, usd_amount } = await req.json()

    // Get user's Stripe account ID (you'll need to collect this during onboarding)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_account_id) {
      throw new Error('No Stripe account connected. Please set up your payout method first.')
    }

    // Create transfer to user's connected account
    const transfer = await stripe.transfers.create({
      amount: Math.round(usd_amount * 100), // Convert to cents
      currency: 'usd',
      destination: profile.stripe_account_id,
      description: `Withdrawal of ${tokens_withdrawn} tokens`,
    })

    // Update withdrawal status
    await supabaseClient
      .from('token_withdrawals')
      .update({
        withdrawal_status: 'processing',
        stripe_transfer_id: transfer.id,
      })
      .eq('user_id', user.id)
      .eq('withdrawal_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    // Send notification
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Withdrawal Processing',
        message: `Your withdrawal of $${usd_amount.toFixed(2)} is being processed. Expect it within 3-5 business days.`,
        type: 'system',
      })

    return new Response(
      JSON.stringify({ success: true, transfer_id: transfer.id }),
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

