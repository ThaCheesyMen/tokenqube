import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STEAM_API_KEY = '74329FA7ECBB181297FFB2B02A1C4838'

interface SteamAchievement {
  apiname: string
  achieved: number
  unlocktime: number
  name: string
  description: string
}

interface SteamPlayerStatsResponse {
  playerstats: {
    steamID: string
    gameName: string
    achievements?: SteamAchievement[]
  }
}

interface SteamSchemaAchievement {
  name: string
  defaultvalue: number
  displayName: string
  hidden: number
  description: string
  icon: string
  icongray: string
}

interface SteamSchemaResponse {
  game: {
    availableGameStats: {
      achievements: SteamSchemaAchievement[]
    }
  }
}

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

    console.log('Starting achievement sync...')

    // Get all Steam gaming accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('gaming_accounts')
      .select('*')
      .eq('platform', 'steam')

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch accounts' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    console.log(`Found ${accounts?.length || 0} accounts to check`)

    let totalTokensAwarded = 0
    let totalAchievementsFound = 0

    for (const account of accounts || []) {
      try {
        console.log(`Processing achievements for account ${account.id}`)

        // Get user's top 10 games by playtime
        const { data: topGames } = await supabase
          .from('user_games')
          .select('*')
          .eq('gaming_account_id', account.id)
          .order('hours_played', { ascending: false })
          .limit(10)

        if (!topGames || topGames.length === 0) {
          console.log(`No games found for account ${account.id}`)
          continue
        }

        for (const game of topGames) {
          try {
            // Fetch player achievements
            const playerStatsUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${game.game_id}&key=${STEAM_API_KEY}&steamid=${account.platform_user_id}`
            const playerStatsResponse = await fetch(playerStatsUrl)

            if (!playerStatsResponse.ok) {
              console.log(`No achievements available for ${game.game_name}`)
              continue
            }

            const playerStatsData: SteamPlayerStatsResponse = await playerStatsResponse.json()
            const achievements = playerStatsData.playerstats?.achievements || []

            if (achievements.length === 0) {
              continue
            }

            // Fetch achievement schema to get global completion percentages
            const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${game.game_id}`
            const schemaResponse = await fetch(schemaUrl)
            
            let achievementRarityMap = new Map<string, number>()
            if (schemaResponse.ok) {
              const schemaData: SteamSchemaResponse = await schemaResponse.json()
              // In a real implementation, you'd fetch global achievement percentages
              // For now, we'll estimate based on achievement order (later = rarer)
              const schemaAchievements = schemaData.game?.availableGameStats?.achievements || []
              schemaAchievements.forEach((ach, index) => {
                // Estimate rarity: early achievements are more common
                const estimatedRarity = Math.max(5, 100 - (index * 2))
                achievementRarityMap.set(ach.name, estimatedRarity)
              })
            }

            // Get already recorded achievements
            const { data: recordedAchievements } = await supabase
              .from('gaming_achievements')
              .select('achievement_name')
              .eq('gaming_account_id', account.id)
              .eq('game_id', game.game_id)

            const recordedSet = new Set(
              (recordedAchievements || []).map(a => a.achievement_name)
            )

            // Process new achievements
            const completedAchievements = achievements.filter(a => a.achieved === 1)
            
            for (const achievement of completedAchievements) {
              if (recordedSet.has(achievement.apiname)) {
                continue // Already recorded
              }

              // Calculate rarity and tokens
              const rarityPercent = achievementRarityMap.get(achievement.apiname) || 50
              
              // Get multiplier based on rarity
              const { data: multiplier } = await supabase
                .from('achievement_multipliers')
                .select('multiplier')
                .lte('min_rarity', rarityPercent)
                .gte('max_rarity', rarityPercent)
                .maybeSingle()

              const tokenMultiplier = multiplier?.multiplier || 1
              const baseTokens = 10
              const tokensEarned = Math.floor(baseTokens * tokenMultiplier)

              // Record achievement and award tokens
              const { error: insertError } = await supabase
                .from('gaming_achievements')
                .insert({
                  user_id: account.user_id,
                  gaming_account_id: account.id,
                  game_id: game.game_id,
                  achievement_name: achievement.apiname,
                  achievement_display_name: achievement.name,
                  achievement_description: achievement.description,
                  tokens_awarded: tokensEarned,
                  platform: 'steam',
                  rarity_percent: rarityPercent,
                  unlocked_at: new Date(achievement.unlocktime * 1000).toISOString()
                })

              if (insertError) {
                console.error(`Error recording achievement:`, insertError)
                continue
              }

              // Award tokens to user
              await supabase
                .from('profiles')
                .update({
                  token_balance: supabase.raw(`token_balance + ${tokensEarned}`),
                  total_earned: supabase.raw(`total_earned + ${tokensEarned}`)
                })
                .eq('id', account.user_id)

              // Record transaction
              await supabase
                .from('transactions')
                .insert({
                  user_id: account.user_id,
                  amount: tokensEarned,
                  type: 'gaming_achievement',
                  description: `Achievement unlocked: ${achievement.name} in ${game.game_name}`
                })

              totalTokensAwarded += tokensEarned
              totalAchievementsFound++

              console.log(`New achievement: ${achievement.name} (${tokensEarned} tokens)`)
            }

          } catch (gameError) {
            console.error(`Error processing game ${game.game_name}:`, gameError)
          }
        }

      } catch (accountError) {
        console.error(`Error processing account ${account.id}:`, accountError)
      }
    }

    console.log(`Achievement sync complete: ${totalAchievementsFound} new achievements, ${totalTokensAwarded} tokens awarded`)

    return new Response(
      JSON.stringify({
        success: true,
        achievementsFound: totalAchievementsFound,
        totalTokensAwarded,
        message: `Found ${totalAchievementsFound} new achievements and awarded ${totalTokensAwarded} tokens`
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
    console.error('Error in sync-achievements:', error)
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
