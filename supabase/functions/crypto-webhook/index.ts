import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (request) => {
  try {
    const body = await request.json()

    // Verify NOWPayments signature (important for security!)
    const signature = request.headers.get('x-nowpayments-sig')
    const NOWPAYMENTS_IPN_SECRET = Deno.env.get('NOWPAYMENTS_IPN_SECRET') || ''

    // Verify signature to ensure request is from NOWPayments
    // In production, implement proper HMAC verification

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const paymentId = body.payment_id
    const paymentStatus = body.payment_status

    console.log('Webhook received:', paymentId, paymentStatus)

    // Handle different payment statuses
    if (paymentStatus === 'finished' || paymentStatus === 'confirmed') {
      // Payment confirmed! Add tokens to user

      // Get purchase details
      const { data: purchase } = await supabaseAdmin
        .from('token_purchases')
        .select('user_id, tokens_purchased')
        .eq('crypto_payment_id', paymentId)
        .single()

      if (purchase) {
        const { user_id, tokens_purchased } = purchase

        // Update purchase status
        await supabaseAdmin
          .from('token_purchases')
          .update({
            payment_status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('crypto_payment_id', paymentId)

        // Get current balance
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('token_balance, total_earned')
          .eq('id', user_id)
          .single()

        if (profile) {
          // Add tokens to user
          await supabaseAdmin
            .from('profiles')
            .update({
              token_balance: (profile.token_balance || 0) + tokens_purchased,
              total_earned: (profile.total_earned || 0) + tokens_purchased,
            })
            .eq('id', user_id)

          // Log transaction
          await supabaseAdmin
            .from('token_transactions')
            .insert({
              user_id,
              amount: tokens_purchased,
              type: 'earn',
              source: 'purchase',
              description: `Purchased ${tokens_purchased} tokens with crypto`,
            })

          // Send notification
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id,
              title: 'Tokens Added!',
              message: `${tokens_purchased.toLocaleString()} tokens have been added to your account!`,
              type: 'system',
            })

          console.log('✅ Payment confirmed:', paymentId, 'User:', user_id, 'Tokens:', tokens_purchased)
        }
      }
    } else if (paymentStatus === 'expired' || paymentStatus === 'failed') {
      // Payment failed or expired
      await supabaseAdmin
        .from('token_purchases')
        .update({
          payment_status: 'cancelled',
        })
        .eq('crypto_payment_id', paymentId)

      console.log('❌ Payment failed:', paymentId, 'Status:', paymentStatus)
    } else if (paymentStatus === 'waiting' || paymentStatus === 'confirming') {
      // Payment received, waiting for confirmations
      await supabaseAdmin
        .from('token_purchases')
        .update({
          payment_status: 'processing',
        })
        .eq('crypto_payment_id', paymentId)

      console.log('⏳ Payment processing:', paymentId, 'Status:', paymentStatus)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})

