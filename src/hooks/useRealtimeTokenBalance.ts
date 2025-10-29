import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to subscribe to real-time token balance updates
 * Automatically refreshes profile when token balance changes
 * 
 * @param onUpdate - Optional callback when balance changes
 * 
 * @example
 * ```tsx
 * // Basic usage - auto-refreshes profile
 * useRealtimeTokenBalance();
 * 
 * // With callback - refetch stats
 * useRealtimeTokenBalance(() => {
 *   refetchStats();
 * });
 * ```
 */
export function useRealtimeTokenBalance(onUpdate?: (newBalance: number, totalEarned?: number) => void) {
  const { profile, refreshProfile } = useAuth();
  
  // Store callback in ref to avoid re-subscriptions when callback changes
  const onUpdateRef = useRef(onUpdate);
  const refreshProfileRef = useRef(refreshProfile);
  
  // Update refs when values change
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    refreshProfileRef.current = refreshProfile;
  }, [onUpdate, refreshProfile]);

  useEffect(() => {
    if (!profile?.id) return;

    console.log('🔄 Setting up real-time token balance listener for:', profile.username);

    // Subscribe to profile changes for this user
    const channel = supabase
      .channel(`profile-tokens-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`
        },
        (payload) => {
          const oldBalance = payload.old?.token_balance || 0;
          const newBalance = payload.new?.token_balance || 0;
          const change = newBalance - oldBalance;

          if (change !== 0) {
            console.log(
              '💰 Token balance updated!',
              `${oldBalance} → ${newBalance}`,
              change > 0 ? `(+${change})` : `(${change})`
            );
          }

          // Call callback if provided (using ref to avoid re-subscriptions)
          if (onUpdateRef.current) {
            onUpdateRef.current(newBalance, payload.new?.total_earned);
          }

          // Refresh profile in context (using ref to avoid re-subscriptions)
          refreshProfileRef.current();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time token updates active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to token updates');
        }
      });

    return () => {
      console.log('🔌 Unsubscribing from token updates');
      supabase.removeChannel(channel);
    };
  }, [profile?.id]); // Only re-subscribe when user ID changes
}

