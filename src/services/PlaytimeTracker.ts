/**
 * Real-time Playtime Tracking System
 * Tracks active game sessions and syncs to database
 */

import { supabase } from '../lib/supabase';
import { errorHandler } from '../utils/errorHandler';

interface ActiveSession {
  gameId: string;
  gameName: string;
  startTime: number;
  lastSync: number;
  platform: string;
}

class PlaytimeTracker {
  private activeSession: ActiveSession | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private detectionInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 60000; // Sync every 60 seconds
  private readonly DETECTION_INTERVAL_MS = 10000; // Check for games every 10 seconds

  /**
   * Start the playtime tracking service
   */
  start() {
    console.log('🎮 Playtime Tracker: Starting...');
    
    // Check if we're in Electron
    if (typeof window !== 'undefined' && (window as any).electron) {
      console.log('✅ Electron API detected!');
      
      // Use Electron's game detection listener
      (window as any).electron.onGamesDetected(async (games: any[]) => {
        console.log('📨 Received games from Electron:', games);
        
        if (games && games.length > 0) {
          const game = games[0]; // Track first detected game
          console.log('🎯 Processing game:', game);
          await this.handleGameDetected(game);
        } else {
          console.log('❌ No games running, checking active session...');
          // No games running
          if (this.activeSession) {
            console.log('🛑 Ending active session');
            await this.endSession();
          }
        }
      });
      
      console.log('🎮 Playtime Tracker: Using Electron auto-detection');
    } else {
      console.warn('⚠️ Electron API not found, using manual tracking');
      // Fallback to manual detection
      this.detectionInterval = setInterval(() => {
        this.detectRunningGames();
      }, this.DETECTION_INTERVAL_MS);

      // Initial detection
      this.detectRunningGames();
      
      console.log('🎮 Playtime Tracker: Using web mode (manual tracking)');
    }
  }

  /**
   * Stop the playtime tracking service
   */
  stop() {
    console.log('🎮 Playtime Tracker: Stopping...');
    
    // Remove Electron listener
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.removeGamesDetectedListener();
    }
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Save final session
    if (this.activeSession) {
      this.endSession();
    }
  }

  /**
   * Detect running games
   * This needs to be implemented based on your platform
   */
  private async detectRunningGames() {
    try {
      // Check if we're in Electron environment
      if (typeof window !== 'undefined' && (window as any).electron) {
        const runningGames = await (window as any).electron.getRunningGames();
        
        if (runningGames && runningGames.length > 0) {
          const game = runningGames[0]; // Track first detected game
          await this.handleGameDetected(game);
        } else {
          // No games running
          if (this.activeSession) {
            await this.endSession();
          }
        }
      } else {
        // Web fallback: Check Steam web API or manual tracking
        // For now, we'll use a manual trigger system
        console.log('🎮 Playtime Tracker: Running in web mode, use manual tracking');
      }
    } catch (error) {
      console.error('Error detecting running games:', error);
    }
  }

  /**
   * Handle when a game is detected
   */
  private async handleGameDetected(game: { id: string; name: string; platform: string }) {
    console.log('🎮 handleGameDetected called with:', game);
    
    // If same game is already being tracked, do nothing
    if (this.activeSession?.gameId === game.id) {
      console.log('ℹ️ Same game already being tracked, skipping');
      return;
    }

    // If different game, end current session and start new one
    if (this.activeSession && this.activeSession.gameId !== game.id) {
      console.log('🔄 Different game detected, switching sessions');
      await this.endSession();
    }

    // Start new session
    console.log('▶️ Starting new tracking session');
    await this.startSession(game.id, game.name, game.platform);
  }

  /**
   * Start tracking a game session
   */
  private async startSession(gameId: string, gameName: string, platform: string) {
    const now = Date.now();
    
    this.activeSession = {
      gameId,
      gameName,
      platform,
      startTime: now,
      lastSync: now
    };

    console.log(`🎮 Started tracking: ${gameName} (${platform})`);

    // Update "Currently Playing" status in database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('update_currently_playing', {
          p_user_id: user.id,
          p_game_name: gameName,
          p_platform: platform
        });
        console.log('✅ Updated "Currently Playing" status');
      }
    } catch (error) {
      console.error('Error updating currently playing status:', error);
    }

    // Start sync interval
    this.syncInterval = setInterval(() => {
      this.syncPlaytime();
    }, this.SYNC_INTERVAL_MS);

    // Initial sync
    this.syncPlaytime();
  }

  /**
   * End current tracking session
   */
  private async endSession() {
    if (!this.activeSession) return;

    console.log(`🎮 Ending session: ${this.activeSession.gameName}`);

    // Final sync
    await this.syncPlaytime(true);

    // Clear "Currently Playing" status
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('clear_currently_playing', {
          p_user_id: user.id
        });
        console.log('✅ Cleared "Currently Playing" status');
      }
    } catch (error) {
      errorHandler.handle(error, 'PlaytimeTracker:endSession:clearStatus');
    }

    // Clear interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.activeSession = null;
  }

  /**
   * Sync playtime to database
   */
  private async syncPlaytime(isFinalSync: boolean = false) {
    if (!this.activeSession) return;

    const now = Date.now();
    const sessionDuration = (now - this.activeSession.startTime) / 1000 / 60 / 60; // Convert to hours
    const incrementalHours = (now - this.activeSession.lastSync) / 1000 / 60 / 60;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update user_games table
      const { error: gameError } = await supabase.rpc('update_playtime', {
        p_user_id: user.id,
        p_game_name: this.activeSession.gameName,
        p_hours_to_add: incrementalHours,
        p_platform: this.activeSession.platform
      });

      if (gameError) {
        errorHandler.handle(gameError, 'PlaytimeTracker:syncPlaytime:updatePlaytime');
        return;
      }

      // Log gaming activity
      const { error: activityError } = await supabase
        .from('gaming_activity')
        .upsert({
          user_id: user.id,
          game_name: this.activeSession.gameName,
          activity_type: 'game_session',
          hours_played: incrementalHours,
          activity_date: new Date().toISOString(),
          tokens_earned: Math.floor(incrementalHours * 50) // 50 tokens per hour
        });

      if (activityError) {
        errorHandler.handle(activityError, 'PlaytimeTracker:syncPlaytime:logActivity');
      }

      // Update quest progress
      await this.updateQuestProgress(incrementalHours);

      // Update last sync time
      this.activeSession.lastSync = now;

      console.log(`✅ Synced ${incrementalHours.toFixed(2)}h for ${this.activeSession.gameName}`);

      // Award tokens
      await this.awardTokens(incrementalHours);

    } catch (error) {
      errorHandler.handle(error, 'PlaytimeTracker:syncPlaytime');
    }
  }

  /**
   * Update quest progress based on playtime
   */
  private async updateQuestProgress(hoursPlayed: number) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get active daily quests
      const { data: quests } = await supabase
        .from('quests')
        .select('*')
        .eq('quest_type', 'daily')
        .eq('is_active', true);

      if (!quests) return;

      // Update playtime-based quests
      for (const quest of quests) {
        if (quest.title?.toLowerCase().includes('play') || 
            quest.title?.toLowerCase().includes('hour')) {
          
          const { error } = await supabase.rpc('update_quest_progress', {
            p_quest_id: quest.id,
            p_user_id: user.id,
            p_progress_increment: hoursPlayed
          });

          if (error) {
            console.error('Error updating quest:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error updating quest progress:', error);
    }
  }

  /**
   * Award tokens for playtime
   */
  private async awardTokens(hoursPlayed: number) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tokensEarned = Math.floor(hoursPlayed * 50); // 50 tokens per hour

      if (tokensEarned > 0) {
        await supabase.rpc('add_tokens', {
          p_user_id: user.id,
          p_amount: tokensEarned,
          p_source: 'playtime'
        });

        console.log(`💰 Awarded ${tokensEarned} tokens for ${hoursPlayed.toFixed(2)}h played`);
      }
    } catch (error) {
      console.error('Error awarding tokens:', error);
    }
  }

  /**
   * Manually start tracking a game (for web version)
   */
  public manualStartTracking(gameId: string, gameName: string, platform: string = 'PC') {
    this.startSession(gameId, gameName, platform);
  }

  /**
   * Manually stop tracking (for web version)
   */
  public manualStopTracking() {
    this.endSession();
  }

  /**
   * Get current active session
   */
  public getActiveSession(): ActiveSession | null {
    return this.activeSession;
  }

  /**
   * Get session duration in hours
   */
  public getSessionDuration(): number {
    if (!this.activeSession) return 0;
    return (Date.now() - this.activeSession.startTime) / 1000 / 60 / 60;
  }
}

// Singleton instance
export const playtimeTracker = new PlaytimeTracker();

// Auto-start on app load (will be stopped/started by app lifecycle)
if (typeof window !== 'undefined') {
  // Start immediately (don't wait for load event in Electron)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🚀 DOM loaded, starting PlaytimeTracker...');
      playtimeTracker.start();
    });
  } else {
    // DOM already loaded (Electron), start immediately
    console.log('🚀 Starting PlaytimeTracker immediately...');
    playtimeTracker.start();
  }

  // Stop tracker on unload
  window.addEventListener('beforeunload', () => {
    playtimeTracker.stop();
  });
}

export default PlaytimeTracker;

