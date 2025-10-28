import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// This Edge Function is designed to be called by a cron job
// It syncs achievements for all users with connected Steam accounts

serve(async (req) => {
  try {
    // Verify this is a cron job request (check Authorization header)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting automated achievement sync for all users...')

    // Get all gaming accounts with Steam platform
    const { data: steamAccounts, error: accountsError } = await supabase
      .from('gaming_accounts')
      .select('id, user_id, platform_user_id, platform_username')
      .eq('platform', 'steam')

    if (accountsError) {
      console.error('Error fetching Steam accounts:', accountsError)
      throw accountsError
    }

    if (!steamAccounts || steamAccounts.length === 0) {
      console.log('No Steam accounts found to sync')
      return new Response(
        JSON.stringify({ message: 'No Steam accounts to sync', accountsProcessed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${steamAccounts.length} Steam accounts to sync`)

    let successCount = 0
    let errorCount = 0
    const results = []

    // Call sync-steam-games for each account
    for (const account of steamAccounts) {
      try {
        console.log(`Syncing account: ${account.platform_username} (${account.platform_user_id})`)

        // Call the sync-steam-games function
        const syncResponse = await fetch(
          `${supabaseUrl}/functions/v1/sync-steam-games`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              gamingAccountId: account.id,
              steamId64: account.platform_user_id,
            }),
          }
        )

        if (syncResponse.ok) {
          const syncData = await syncResponse.json()
          successCount++
          results.push({
            userId: account.user_id,
            success: true,
            ...syncData,
          })
          console.log(`✅ Synced ${account.platform_username}: ${syncData.newUnlocks || 0} new achievements`)
        } else {
          const errorText = await syncResponse.text()
          errorCount++
          results.push({
            userId: account.user_id,
            success: false,
            error: errorText,
          })
          console.error(`❌ Failed to sync ${account.platform_username}:`, errorText)
        }

        // Rate limiting: wait 2 seconds between accounts to avoid Steam API throttling
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.error(`Error syncing account ${account.id}:`, error)
        errorCount++
        results.push({
          userId: account.user_id,
          success: false,
          error: error.message,
        })
      }
    }

    console.log(`\n=== SYNC COMPLETE ===`)
    console.log(`Total accounts: ${steamAccounts.length}`)
    console.log(`Successful: ${successCount}`)
    console.log(`Failed: ${errorCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        totalAccounts: steamAccounts.length,
        successCount,
        errorCount,
        results,
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in sync-all-achievements:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

