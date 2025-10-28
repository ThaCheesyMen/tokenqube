import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GamingAccount {
  id: string
  user_id: string
  platform: string
  platform_user_id: string
  platform_username: string
  total_playtime_hours: number
  last_sync: string
}

interface UserGame {
  game_id: string
  game_name: string
  hours_played: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting playtime sync...')

    // 1. Fetch all verified gaming accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('gaming_accounts')
      .select('*')
      .eq('is_verified', true)

    if (accountsError) {
      throw accountsError
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No gaming accounts to sync', accounts_processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${accounts.length} accounts to sync`)

    let totalTokensAwarded = 0
    let accountsProcessed = 0
    let milestonesAwarded = 0

    // 2. Process each account
    for (const account of accounts as GamingAccount[]) {
      try {
        console.log(`Processing account: ${account.platform_username} (${account.platform})`)

        // Get user's games from user_games table
        const { data: userGames, error: gamesError } = await supabase
          .from('user_games')
          .select('game_name, hours_played, gaming_account_id')
          .eq('gaming_account_id', account.id)

        if (gamesError) {
          console.error(`Error fetching games for account ${account.id}:`, gamesError)
          continue
        }

        if (!userGames || userGames.length === 0) {
          console.log(`No games found for account ${account.id}`)
          continue
        }

        // Calculate hours since last sync
        const lastSync = new Date(account.last_sync)
        const now = new Date()
        const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

        // Only sync if more than 30 minutes have passed
        if (hoursSinceSync < 0.5) {
          console.log(`Skipping account ${account.id} - synced ${hoursSinceSync.toFixed(2)} hours ago`)
          continue
        }

        // 3. Process each game
        for (const game of userGames) {
          // Get game tier to determine token rate
          let { data: gameTier } = await supabase
            .from('game_tiers')
            .select('tokens_per_hour')
            .eq('game_name', game.game_name)
            .eq('is_active', true)
            .single()

          // If game not found, try "Other" tier
          if (!gameTier) {
            const { data: otherTier } = await supabase
              .from('game_tiers')
              .select('tokens_per_hour')
              .eq('game_name', 'Other')
              .single()
            
            gameTier = otherTier
          }

          if (!gameTier) {
            console.log(`No tier found for game ${game.game_name}, skipping`)
            continue
          }

          // Calculate new hours (simulate - in production, fetch from Steam/Xbox API)
          // For now, we'll use a small increment based on time since last sync
          const newHours = Math.min(hoursSinceSync * 0.5, 5) // Max 5 hours per sync
          
          if (newHours < 0.1) {
            continue // Skip if less than 6 minutes of playtime
          }

          console.log(`Awarding ${newHours.toFixed(2)} hours for ${game.game_name}`)

          // 4. Award playtime tokens
          const { data: rewardResult, error: rewardError } = await supabase
            .rpc('award_playtime_tokens', {
              p_user_id: account.user_id,
              p_gaming_account_id: account.id,
              p_game_name: game.game_name,
              p_hours_played: newHours,
              p_tokens_per_hour: gameTier.tokens_per_hour
            })

          if (rewardError) {
            console.error(`Error awarding tokens:`, rewardError)
            continue
          }

          if (rewardResult && rewardResult.success) {
            totalTokensAwarded += rewardResult.tokens_earned
            console.log(`Awarded ${rewardResult.tokens_earned} tokens`)
          }

          // 5. Update game hours in user_games
          const newTotalHours = game.hours_played + newHours
          await supabase
            .from('user_games')
            .update({ 
              hours_played: newTotalHours,
              last_sync: now.toISOString()
            })
            .eq('gaming_account_id', account.id)
            .eq('game_name', game.game_name)

          // 6. Check for milestones
          const { data: milestoneResult, error: milestoneError } = await supabase
            .rpc('check_playtime_milestones', {
              p_user_id: account.user_id,
              p_game_name: game.game_name,
              p_total_hours: newTotalHours
            })

          if (milestoneError) {
            console.error(`Error checking milestones:`, milestoneError)
          } else if (milestoneResult && milestoneResult.success) {
            milestonesAwarded += milestoneResult.milestones_achieved
            totalTokensAwarded += milestoneResult.tokens_awarded
            console.log(`Awarded ${milestoneResult.milestones_achieved} milestones (${milestoneResult.tokens_awarded} tokens)`)
          }
        }

        // 7. Update gaming account last_sync and total hours
        const { data: totalHoursData } = await supabase
          .from('user_games')
          .select('hours_played')
          .eq('gaming_account_id', account.id)

        const totalHours = totalHoursData?.reduce((sum, g) => sum + g.hours_played, 0) || 0

        await supabase
          .from('gaming_accounts')
          .update({ 
            last_sync: now.toISOString(),
            total_playtime_hours: totalHours
          })
          .eq('id', account.id)

        accountsProcessed++
        console.log(`Finished processing account ${account.id}`)

      } catch (error) {
        console.error(`Error processing account ${account.id}:`, error)
        continue
      }
    }

    const result = {
      success: true,
      accounts_processed: accountsProcessed,
      total_tokens_awarded: totalTokensAwarded,
      milestones_awarded: milestonesAwarded,
      timestamp: new Date().toISOString()
    }

    console.log('Playtime sync complete:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in sync-playtime:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

