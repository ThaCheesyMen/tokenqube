/**
 * useParties Hook
 * Manages party data with real-time subscriptions instead of polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { errorHandler } from '../utils/errorHandler';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Party {
  id: string;
  leader_id: string;
  game_name: string;
  platform: string;
  party_size: number;
  current_size: number;
  description?: string;
  voice_chat_enabled: boolean;
  status: string;
  created_at: string;
  profiles?: {
    username: string;
  };
}

interface UsePartiesOptions {
  userId?: string;
  autoSubscribe?: boolean;
  filterStatus?: string;
}

export function useParties(options: UsePartiesOptions = {}) {
  const { userId, autoSubscribe = true, filterStatus = 'open' } = options;

  const [parties, setParties] = useState<Party[]>([]);
  const [joinedParties, setJoinedParties] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const partiesChannelRef = useRef<RealtimeChannel | null>(null);
  const membersChannelRef = useRef<RealtimeChannel | null>(null);

  // Fetch all active parties
  const fetchParties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const query = supabase
        .from('parties')
        .select(`
          *,
          profiles:leader_id (username)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus) {
        query.eq('status', filterStatus);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setParties((data as Party[]) || []);
    } catch (err) {
      const appError = errorHandler.handle(err, 'FetchParties');
      setError(new Error(appError.message));
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  // Fetch parties user has joined
  const fetchJoinedParties = useCallback(async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .from('party_members')
        .select('party_id')
        .eq('user_id', userId);

      if (data) {
        setJoinedParties(new Set(data.map(m => m.party_id)));
      }
    } catch (err) {
      errorHandler.handle(err, 'FetchJoinedParties');
    }
  }, [userId]);

  // Subscribe to real-time party changes
  const subscribeToParties = useCallback(() => {
    if (!autoSubscribe) return;

    // Subscribe to parties table changes
    const partiesChannel = supabase
      .channel('parties_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parties',
        },
        (payload) => {
          console.log('Party change detected:', payload);

          if (payload.eventType === 'INSERT') {
            const newParty = payload.new as Party;
            if (!filterStatus || newParty.status === filterStatus) {
              setParties(prev => [newParty, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedParty = payload.new as Party;
            setParties(prev =>
              prev.map(p => p.id === updatedParty.id ? updatedParty : p)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedParty = payload.old as Party;
            setParties(prev => prev.filter(p => p.id !== deletedParty.id));
          }
        }
      )
      .subscribe();

    partiesChannelRef.current = partiesChannel;

    // Subscribe to party_members changes if userId is provided
    if (userId) {
      const membersChannel = supabase
        .channel('party_members_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'party_members',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('Party member change detected:', payload);

            if (payload.eventType === 'INSERT') {
              const newMember = payload.new as { party_id: string };
              setJoinedParties(prev => new Set(prev).add(newMember.party_id));
            } else if (payload.eventType === 'DELETE') {
              const deletedMember = payload.old as { party_id: string };
              setJoinedParties(prev => {
                const newSet = new Set(prev);
                newSet.delete(deletedMember.party_id);
                return newSet;
              });
            }
          }
        )
        .subscribe();

      membersChannelRef.current = membersChannel;
    }
  }, [autoSubscribe, filterStatus, userId]);

  // Clean up subscriptions
  const unsubscribe = useCallback(() => {
    if (partiesChannelRef.current) {
      supabase.removeChannel(partiesChannelRef.current);
      partiesChannelRef.current = null;
    }

    if (membersChannelRef.current) {
      supabase.removeChannel(membersChannelRef.current);
      membersChannelRef.current = null;
    }
  }, []);

  // Join a party
  const joinParty = useCallback(async (partyId: string) => {
    if (!userId) {
      throw new Error('User ID is required to join a party');
    }

    try {
      const { error: joinError } = await supabase
        .from('party_members')
        .insert({
          party_id: partyId,
          user_id: userId,
          role: 'member',
        });

      if (joinError) throw joinError;

      // Update local state optimistically
      setJoinedParties(prev => new Set(prev).add(partyId));

      // Increment party size
      const { error: updateError } = await supabase.rpc('increment_party_size', {
        p_party_id: partyId,
      });

      if (updateError) {
        console.error('Error updating party size:', updateError);
      }

      return { success: true };
    } catch (err) {
      errorHandler.handle(err, 'JoinParty');
      return { success: false, error: err };
    }
  }, [userId]);

  // Leave a party
  const leaveParty = useCallback(async (partyId: string) => {
    if (!userId) {
      throw new Error('User ID is required to leave a party');
    }

    try {
      const { error: leaveError } = await supabase
        .from('party_members')
        .delete()
        .eq('party_id', partyId)
        .eq('user_id', userId);

      if (leaveError) throw leaveError;

      // Update local state optimistically
      setJoinedParties(prev => {
        const newSet = new Set(prev);
        newSet.delete(partyId);
        return newSet;
      });

      return { success: true };
    } catch (err) {
      errorHandler.handle(err, 'LeaveParty');
      return { success: false, error: err };
    }
  }, [userId]);

  // Initial fetch and subscription setup
  useEffect(() => {
    fetchParties();
    fetchJoinedParties();
    subscribeToParties();

    return () => {
      unsubscribe();
    };
  }, [fetchParties, fetchJoinedParties, subscribeToParties, unsubscribe]);

  return {
    parties,
    joinedParties,
    loading,
    error,
    refetch: fetchParties,
    joinParty,
    leaveParty,
  };
}

// Hook for a single party with realtime updates
export function useParty(partyId: string | null) {
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchParty = useCallback(async () => {
    if (!partyId) {
      setParty(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('parties')
        .select(`
          *,
          profiles:leader_id (username)
        `)
        .eq('id', partyId)
        .single();

      if (fetchError) throw fetchError;

      setParty(data as Party);
    } catch (err) {
      const appError = errorHandler.handle(err, 'FetchParty');
      setError(new Error(appError.message));
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    if (!partyId) return;

    fetchParty();

    // Subscribe to changes for this specific party
    const channel = supabase
      .channel(`party_${partyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parties',
          filter: `id=eq.${partyId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setParty(payload.new as Party);
          } else if (payload.eventType === 'DELETE') {
            setParty(null);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [partyId, fetchParty]);

  return {
    party,
    loading,
    error,
    refetch: fetchParty,
  };
}

