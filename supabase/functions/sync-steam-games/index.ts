import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Steam API Key provided by the user
const STEAM_API_KEY = '74329FA7ECBB181297FFB2B02A1C4838'

interface SteamGame {
  appid: number
  name: string
  playtime_forever: number
  img_icon_url?: string
  img_logo_url?: string
  playtime_2weeks?: number
}

interface SteamGamesResponse {
  response: {
    game_count: number
    games: SteamGame[]
  }
}

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
    stats?: any[]
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Set timeout to prevent function from running too long (2 minutes max)
  const timeoutId = setTimeout(() => {
    console.error('Function timeout - exceeded 2 minutes')
  }, 120000)

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No auth header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const { gamingAccountId, steamId64 } = await req.json()

    if (!gamingAccountId || !steamId64) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Initialize Supabase client FIRST
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Resolve custom URL to Steam ID64 if needed
    let resolvedSteamId = steamId64
    if (!/^765\d{14,16}$/.test(steamId64)) {
      console.log(`Resolving custom URL: ${steamId64}`)
      const resolveUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_API_KEY}&vanityurl=${steamId64}`
      const resolveResponse = await fetch(resolveUrl)
      
      if (resolveResponse.ok) {
        const resolveData = await resolveResponse.json()
        if (resolveData.response?.success === 1 && resolveData.response?.steamid) {
          resolvedSteamId = resolveData.response.steamid
          console.log(`Resolved ${steamId64} to ${resolvedSteamId}`)
          
          // Update the gaming account with the resolved Steam ID
          await supabase
            .from('gaming_accounts')
            .update({ platform_user_id: resolvedSteamId })
            .eq('id', gamingAccountId)
        } else {
          return new Response(
            JSON.stringify({ error: 'Could not resolve Steam custom URL. Please check your Steam profile URL.' }),
            { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          )
        }
      }
    }

    // Get gaming account info
    const { data: account, error: accountError } = await supabase
      .from('gaming_accounts')
      .select('user_id, platform')
      .eq('id', gamingAccountId)
      .single()

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: 'Gaming account not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Fetch BOTH owned games AND recently played games from Steam API
    // include_played_free_games=1 ensures F2P games like The Finals are included
    const ownedGamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${resolvedSteamId}&format=json&include_appinfo=true&include_played_free_games=1`
    const recentlyPlayedUrl = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAM_API_KEY}&steamid=${resolvedSteamId}&format=json&count=100`
    
    console.log(`Fetching owned and recently played games for ${resolvedSteamId}...`)
    
    // Fetch both in parallel
    const [ownedResponse, recentResponse] = await Promise.all([
      fetch(ownedGamesUrl),
      fetch(recentlyPlayedUrl)
    ])
    
    if (!ownedResponse.ok) {
      const errorText = await ownedResponse.text()
      console.error('Steam API error (owned games):', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Steam owned games', details: errorText }),
        { status: ownedResponse.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const ownedData: SteamGamesResponse = await ownedResponse.json()
    const ownedGames = ownedData.response?.games || []
    
    let recentGames: SteamGame[] = []
    if (recentResponse.ok) {
      const recentData: SteamGamesResponse = await recentResponse.json()
      recentGames = recentData.response?.games || []
      console.log(`Found ${recentGames.length} recently played games`)
    }
    
    // Merge owned and recently played games (deduplicate by appid)
    const gameMap = new Map<number, SteamGame>()
    
    // Add owned games first
    ownedGames.forEach(game => {
      gameMap.set(game.appid, game)
    })
    
    // Add/update with recently played games (they have more accurate recent playtime)
    recentGames.forEach(game => {
      const existing = gameMap.get(game.appid)
      if (existing) {
        // Update playtime if recently played has more
        if (game.playtime_forever > existing.playtime_forever) {
          gameMap.set(game.appid, { ...existing, playtime_forever: game.playtime_forever, playtime_2weeks: game.playtime_2weeks })
        }
      } else {
        // Add recently played game even if not "owned" (could be family shared or F2P)
        // Make sure it has a name, otherwise skip it
        if (game.name) {
          gameMap.set(game.appid, game)
        } else {
          console.warn(`Skipping game ${game.appid} - no name provided by Steam API`)
        }
      }
    })
    
    const games = Array.from(gameMap.values())

    console.log(`Found ${games.length} total games for Steam ID: ${resolvedSteamId}`)
    console.log(`- Owned games: ${ownedGames.length}`)
    console.log(`- Recently played: ${recentGames.length}`)
    console.log(`- Total after merge: ${games.length}`)
    
    // Log ALL game details for debugging
    console.log('All games received from Steam API:')
    games.forEach((g, index) => {
      console.log(`  ${index + 1}. ${g.name} (AppID: ${g.appid}) - ${(g.playtime_forever / 60).toFixed(1)}h`)
    })

    // Check for specific games
    const theFinalsGame = games.find(g => g.appid === 2073850)
    const supermarketGame = games.find(g => g.appid === 3027960)
    
    console.log('The Finals (2073850):', theFinalsGame ? 'FOUND' : 'NOT FOUND')
    console.log('Supermarket Together (3027960):', supermarketGame ? 'FOUND' : 'NOT FOUND')
    
    if (games.length < 10) {
      console.warn('WARNING: Less than 10 games returned. This usually means:')
      console.warn('1. Privacy settings are not fully public')
      console.warn('2. Steam ID is wrong')
      console.warn('3. Games are in a different Steam account')
    }

    // Process and insert ALL games
    const gamesToInsert = games.map(game => ({
      user_id: account.user_id,
      gaming_account_id: gamingAccountId,
      game_name: game.name,
      game_id: game.appid.toString(),
      platform: 'steam',
      hours_played: Math.round((game.playtime_forever / 60) * 10) / 10,
      is_owned: true,
      last_sync: new Date().toISOString(),
      // Use Steam's CDN for library cover images (portrait format)
      image_url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg`,
      // Add last played timestamp if available from 2 weeks data
      last_played_at: game.playtime_2weeks ? new Date().toISOString() : null,
    }))

    if (gamesToInsert.length > 0) {
      console.log(`Inserting ${gamesToInsert.length} games...`)
      // Insert games (with conflict handling)
      const { error: insertError } = await supabase
        .from('user_games')
        .upsert(gamesToInsert, {
          onConflict: 'user_id,gaming_account_id,game_id',
        })

      if (insertError) {
        console.error('Error inserting games:', insertError)
      } else {
        console.log(`Successfully inserted ${gamesToInsert.length} games`)
      }
    }

    // Fetch achievements only for games with significant playtime (> 30 minutes)
    // This reduces sync time while still catching most achievements
    const gamesWithPlaytime = games
      .filter(game => game.playtime_forever > 30) // At least 30 minutes played
      .sort((a, b) => b.playtime_forever - a.playtime_forever) // Sort by most played
      .slice(0, 20) // Limit to top 20 games for faster sync
    
    console.log(`\n=== FETCHING ACHIEVEMENTS FOR ${gamesWithPlaytime.length} GAMES ===`)
    console.log(`(Filtered from ${games.filter(g => g.playtime_forever > 0).length} total games with playtime)`)
    
    let totalAchievementsProcessed = 0
    let totalNewUnlocks = 0
    let totalTokensAwarded = 0
    
    for (const game of gamesWithPlaytime) {
      try {
        // Fetch player achievements for this game
        const playerStatsUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${game.appid}&key=${STEAM_API_KEY}&steamid=${resolvedSteamId}`
        const playerStatsResponse = await fetch(playerStatsUrl)
        
        if (!playerStatsResponse.ok) {
          console.log(`No achievements for ${game.name} (${game.appid})`)
          continue
        }

        const playerStatsData: SteamPlayerStatsResponse = await playerStatsResponse.json()
        
        if (!playerStatsData.playerstats?.achievements || playerStatsData.playerstats.achievements.length === 0) {
          console.log(`${game.name}: No achievements available`)
          continue
        }

        const achievements = playerStatsData.playerstats.achievements
        console.log(`\n${game.name}: ${achievements.length} total achievements`)
        
        // Fetch achievement schema to get global percentages and icons
        const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=${game.appid}&key=${STEAM_API_KEY}`
        const schemaResponse = await fetch(schemaUrl)
        
        let achievementSchema = new Map()
        if (schemaResponse.ok) {
          const schemaData = await schemaResponse.json()
          if (schemaData.game?.availableGameStats?.achievements) {
            schemaData.game.availableGameStats.achievements.forEach((ach: any) => {
              achievementSchema.set(ach.name, {
                displayName: ach.displayName,
                description: ach.description || '',
                icon: ach.icon,
                iconGray: ach.icongray,
                hidden: ach.hidden === 1
              })
            })
          }
        }

        // Fetch global achievement percentages
        const globalStatsUrl = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${game.appid}`
        const globalStatsResponse = await fetch(globalStatsUrl)
        
        let globalPercentages = new Map()
        if (globalStatsResponse.ok) {
          const globalData = await globalStatsResponse.json()
          if (globalData.achievementpercentages?.achievements) {
            globalData.achievementpercentages.achievements.forEach((ach: any) => {
              globalPercentages.set(ach.name, ach.percent)
            })
          }
        }

        // Process each achievement
        let gameNewUnlocks = 0
        let gameTokensEarned = 0
        
        for (const achievement of achievements) {
          const schema = achievementSchema.get(achievement.apiname)
          const globalPercent = globalPercentages.get(achievement.apiname)
          
          const achievementData = {
            user_id: account.user_id,
            game_id: game.appid.toString(),
            achievement_id: achievement.apiname,
            achievement_name: schema?.displayName || achievement.name || achievement.apiname,
            achievement_description: schema?.description || achievement.description || '',
            icon_url: schema?.icon || '',
            unlocked: achievement.achieved === 1,
            unlock_time: achievement.achieved === 1 ? new Date(achievement.unlocktime * 1000).toISOString() : null,
            global_percentage: globalPercent || null
          }

          // If unlocked, process for token rewards
          if (achievement.achieved === 1) {
            const { data: processResult, error: processError } = await supabase
              .rpc('process_achievement_unlock', {
                p_user_id: account.user_id,
                p_game_id: game.appid.toString(),
                p_game_name: game.name,
                p_achievement_id: achievement.apiname,
                p_achievement_name: achievementData.achievement_name,
                p_achievement_description: achievementData.achievement_description,
                p_icon_url: achievementData.icon_url,
                p_unlock_time: achievementData.unlock_time,
                p_global_percentage: globalPercent
              })

            if (processError) {
              console.error(`Error processing achievement ${achievement.apiname}:`, processError)
            } else if (processResult && processResult.length > 0) {
              const result = processResult[0]
              if (result.is_new_unlock) {
                gameNewUnlocks++
                gameTokensEarned += result.tokens_earned
                console.log(`  ✨ NEW: ${achievementData.achievement_name} - ${result.tokens_earned} tokens (${result.rarity})`)
              }
            }
          } else {
            // Insert locked achievement for tracking
            await supabase
              .from('user_achievements')
              .upsert(achievementData, {
                onConflict: 'user_id,game_id,achievement_id'
              })
          }

          totalAchievementsProcessed++
        }

        if (gameNewUnlocks > 0) {
          console.log(`${game.name}: ${gameNewUnlocks} new unlocks, ${gameTokensEarned} tokens earned`)
          totalNewUnlocks += gameNewUnlocks
          totalTokensAwarded += gameTokensEarned
        }

        // Small delay to avoid rate limiting (reduced to 200ms for faster sync)
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.error(`Error fetching achievements for ${game.name}:`, error)
        // Continue with other games
      }
    }

    console.log(`\n=== ACHIEVEMENT SYNC COMPLETE ===`)
    console.log(`Total achievements processed: ${totalAchievementsProcessed}`)
    console.log(`New unlocks detected: ${totalNewUnlocks}`)
    console.log(`Total tokens awarded: ${totalTokensAwarded}`)

    // Calculate and update total playtime
    const totalHours = games.reduce((sum, game) => sum + (game.playtime_forever / 60), 0)

    const { error: updateError } = await supabase
      .from('gaming_accounts')
      .update({ 
        total_playtime_hours: Math.round(totalHours),
        last_sync: new Date().toISOString(),
      })
      .eq('id', gamingAccountId)

    if (updateError) {
      console.error('Error updating playtime:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        gamesAdded: gamesToInsert.length,
        totalHours: Math.round(totalHours),
        totalGames: games.length,
        achievementsProcessed: totalAchievementsProcessed,
        newUnlocks: totalNewUnlocks,
        tokensAwarded: totalTokensAwarded,
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )

  } catch (error) {
    console.error('Error in sync-steam-games:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})
