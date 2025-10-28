import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STEAM_API_KEY = '74329FA7ECBB181297FFB2B02A1C4838'

interface SteamGame {
  appid: number
  name: string
  playtime_forever: number
}

interface SteamGamesResponse {
  response: {
    game_count: number
    games: SteamGame[]
  }
}

// This function can be called manually or set up as a cron job
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting playtime sync...')

    // Get all Steam gaming accounts that need syncing (last synced > 1 hour ago)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const { data: accounts, error: accountsError } = await supabase
      .from('gaming_accounts')
      .select('*')
      .eq('platform', 'steam')
      .lt('last_sync', oneHourAgo)

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch accounts' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    console.log(`Found ${accounts?.length || 0} accounts to sync`)

    let totalTokensAwarded = 0
    let accountsProcessed = 0

    for (const account of accounts || []) {
      try {
        console.log(`Processing account ${account.id} for user ${account.user_id}`)

        // Fetch current playtime from Steam
        const steamApiUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${account.platform_user_id}&format=json&include_appinfo=true`
        const steamResponse = await fetch(steamApiUrl)

        if (!steamResponse.ok) {
          console.error(`Steam API error for account ${account.id}`)
          continue
        }

        const steamData: SteamGamesResponse = await steamResponse.json()
        const currentGames = steamData.response?.games || []

        // Get stored playtime data
        const { data: storedGames } = await supabase
          .from('user_games')
          .select('game_id, game_name, hours_played')
          .eq('gaming_account_id', account.id)

        const storedGamesMap = new Map(
          (storedGames || []).map(g => [g.game_id, g])
        )

        let tokensEarnedThisSync = 0

        // Calculate new hours played for each game
        for (const currentGame of currentGames) {
          const gameId = currentGame.appid.toString()
          const currentHours = currentGame.playtime_forever / 60
          const storedGame = storedGamesMap.get(gameId)
          const previousHours = storedGame?.hours_played || 0
          const newHoursPlayed = Math.max(0, currentHours - previousHours)

          if (newHoursPlayed > 0) {
            console.log(`Game ${currentGame.name}: ${newHoursPlayed.toFixed(2)} new hours`)

            // Get game tier to determine token rate
            const { data: gameTier } = await supabase
              .from('game_tiers')
              .select('tokens_per_hour')
              .eq('game_name', currentGame.name)
              .maybeSingle()

            const tokensPerHour = gameTier?.tokens_per_hour || 2 // Default to tier 3
            const tokensEarned = Math.floor(newHoursPlayed * tokensPerHour)

            if (tokensEarned > 0) {
              // Award tokens using the RPC function
              const { error: awardError } = await supabase.rpc('award_playtime_tokens', {
                p_user_id: account.user_id,
                p_gaming_account_id: account.id,
                p_game_name: currentGame.name,
                p_game_id: gameId,
                p_hours_played: newHoursPlayed,
                p_tokens_earned: tokensEarned
              })

              if (awardError) {
                console.error(`Error awarding tokens for ${currentGame.name}:`, awardError)
              } else {
                tokensEarnedThisSync += tokensEarned
                console.log(`Awarded ${tokensEarned} tokens for ${currentGame.name}`)
              }
            }

            // Update stored hours
            await supabase
              .from('user_games')
              .upsert({
                user_id: account.user_id,
                gaming_account_id: account.id,
                game_name: currentGame.name,
                game_id: gameId,
                platform: 'steam',
                hours_played: Math.round(currentHours * 10) / 10,
                is_owned: true,
                last_sync: new Date().toISOString()
              }, {
                onConflict: 'user_id,gaming_account_id,game_id'
              })
          }
        }

        // Check for milestones
        if (tokensEarnedThisSync > 0) {
          await supabase.rpc('check_playtime_milestones', {
            p_user_id: account.user_id
          })
        }

        // Update account last_sync and total playtime
        const totalHours = currentGames.reduce((sum, game) => sum + (game.playtime_forever / 60), 0)
        await supabase
          .from('gaming_accounts')
          .update({
            total_playtime_hours: Math.round(totalHours),
            last_sync: new Date().toISOString()
          })
          .eq('id', account.id)

        totalTokensAwarded += tokensEarnedThisSync
        accountsProcessed++

        console.log(`Account ${account.id} processed: ${tokensEarnedThisSync} tokens awarded`)

      } catch (error) {
        console.error(`Error processing account ${account.id}:`, error)
      }
    }

    console.log(`Sync complete: ${accountsProcessed} accounts, ${totalTokensAwarded} total tokens awarded`)

    return new Response(
      JSON.stringify({
        success: true,
        accountsProcessed,
        totalTokensAwarded,
        message: `Synced ${accountsProcessed} accounts and awarded ${totalTokensAwarded} tokens`
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Error in sync-playtime-rewards:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})

