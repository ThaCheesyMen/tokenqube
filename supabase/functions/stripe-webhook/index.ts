import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (request) => {
  const signature = request.headers.get('Stripe-Signature')
  const body = await request.text()

  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }

  // Initialize Supabase Admin Client
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      
      const { user_id, tokens } = session.metadata as {
        user_id: string
        tokens: string
      }

      // Update purchase status
      await supabaseAdmin
        .from('token_purchases')
        .update({
          payment_status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('stripe_session_id', session.id)

      // Add tokens to user
      const tokensToAdd = parseInt(tokens)
      
      // Get current balance
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('token_balance, total_earned')
        .eq('id', user_id)
        .single()

      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({
            token_balance: (profile.token_balance || 0) + tokensToAdd,
            total_earned: (profile.total_earned || 0) + tokensToAdd,
          })
          .eq('id', user_id)

        // Log transaction
        await supabaseAdmin
          .from('token_transactions')
          .insert({
            user_id,
            amount: tokensToAdd,
            type: 'earn',
            source: 'purchase',
            description: `Purchased ${tokensToAdd} tokens`,
          })

        // Send notification
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id,
            title: 'Tokens Added!',
            message: `${tokensToAdd.toLocaleString()} tokens have been added to your account!`,
            type: 'system',
          })
      }

      console.log('✅ Payment completed:', session.id, 'User:', user_id, 'Tokens:', tokens)
      break
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      
      // Update purchase status to cancelled
      await supabaseAdmin
        .from('token_purchases')
        .update({
          payment_status: 'cancelled',
        })
        .eq('stripe_session_id', session.id)

      console.log('❌ Payment expired:', session.id)
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})

