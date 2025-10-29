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
    const { payment_id } = await req.json()

    // Check payment status with NOWPayments
    const NOWPAYMENTS_API_KEY = Deno.env.get('NOWPAYMENTS_API_KEY') || ''

    const response = await fetch(`https://api.nowpayments.io/v1/payment/${payment_id}`, {
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
      },
    })

    const paymentData = await response.json()

    // Map NOWPayments status to our status
    let status = 'waiting'
    if (paymentData.payment_status === 'finished' || paymentData.payment_status === 'confirmed') {
      status = 'confirmed'
    } else if (paymentData.payment_status === 'expired' || paymentData.payment_status === 'failed') {
      status = 'failed'
    } else if (paymentData.payment_status === 'confirming' || paymentData.payment_status === 'sending') {
      status = 'confirming'
    }

    return new Response(
      JSON.stringify({ status }),
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

