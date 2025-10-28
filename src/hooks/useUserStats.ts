import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UserStats {
  total_playtime: number;
  total_games: number;
  total_achievements: number;
  token_balance: number;
  total_earned: number;
  total_spent: number;
  login_streak: number;
  level: number;
  xp: number;
  rank: number;
  total_friends: number;
  total_referrals: number;
}

export function useUserStats(userId: string | undefined) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_user_stats', { p_user_id: userId });

        if (error) throw error;
        setStats(data as UserStats);
      } catch (e) {
        setError(e as Error);
        console.error('Error fetching user stats:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  const refetch = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_stats', { p_user_id: userId });

      if (error) throw error;
      setStats(data as UserStats);
    } catch (e) {
      setError(e as Error);
    }
  };

  return { stats, loading, error, refetch };
}

