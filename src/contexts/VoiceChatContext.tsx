import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from '../components/Toast';

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
}

interface PartyMember {
  id: string;
  party_id: string;
  user_id: string;
  role: string;
  profiles?: {
    username: string;
  };
}

interface VoiceChatContextType {
  activePartyId: string | null;
  setActivePartyId: (id: string | null) => void;
  showVoiceControls: boolean;
  setShowVoiceControls: (show: boolean) => void;
  isMuted: boolean;
  isDeafened: boolean;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => Promise<void>;
  partyMembers: PartyMember[];
  activeParty: Party | null;
  friends: any[];
  showInviteModal: boolean;
  setShowInviteModal: (show: boolean) => void;
  inviteTargetPartyId: string | null;
  setInviteTargetPartyId: (id: string | null) => void;
  selectedFriends: Set<string>;
  setSelectedFriends: (friends: Set<string>) => void;
  openInviteModal: (partyId: string) => void;
  inviteFriends: () => Promise<void>;
  leaveParty: (partyId: string) => Promise<void>;
  playSound: (type: 'join' | 'leave' | 'mute' | 'deafen') => Promise<void>;
}

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

export function VoiceChatProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [activePartyId, setActivePartyId] = useState<string | null>(null);
  const [showVoiceControls, setShowVoiceControls] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTargetPartyId, setInviteTargetPartyId] = useState<string | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

  const partyMembersChannelRef = useRef<any>(null);

  // Fetch active party data when activePartyId changes
  useEffect(() => {
    if (activePartyId && profile) {
      fetchActiveParty();
      fetchPartyMembers();
      subscribeToPartyMembers(activePartyId);
    } else {
      setActiveParty(null);
      setPartyMembers([]);
      if (partyMembersChannelRef.current) {
        supabase.removeChannel(partyMembersChannelRef.current);
        partyMembersChannelRef.current = null;
      }
    }

    return () => {
      if (partyMembersChannelRef.current) {
        supabase.removeChannel(partyMembersChannelRef.current);
        partyMembersChannelRef.current = null;
      }
    };
  }, [activePartyId, profile?.id]);

  // Fetch active party details
  const fetchActiveParty = async () => {
    if (!activePartyId) return;
    
    try {
      const { data } = await supabase
        .from('parties')
        .select('*')
        .eq('id', activePartyId)
        .single();

      if (data) {
        setActiveParty(data as Party);
      }
    } catch (error) {
      console.error('Error fetching active party:', error);
    }
  };

  // Fetch party members
  const fetchPartyMembers = async () => {
    if (!activePartyId) return;

    try {
      const { data } = await supabase
        .from('party_members')
        .select(`
          *,
          profiles:user_id (username)
        `)
        .eq('party_id', activePartyId);

      if (data) {
        setPartyMembers(data as PartyMember[]);
      }
    } catch (error) {
      console.error('Error fetching party members:', error);
    }
  };

  // Subscribe to party members changes
  const subscribeToPartyMembers = (partyId: string) => {
    if (!profile) return;

    try {
      const channel = supabase
        .channel(`party_members_${partyId}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'party_members',
            filter: `party_id=eq.${partyId}`,
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              await playSound('join');
              fetchPartyMembers();
            } else if (payload.eventType === 'DELETE') {
              await playSound('leave');
              fetchPartyMembers();
            } else if (payload.eventType === 'UPDATE') {
              fetchPartyMembers();
            }
          }
        )
        .subscribe();

      partyMembersChannelRef.current = channel;
    } catch (error) {
      console.error('Error subscribing to party members:', error);
    }
  };

  // Fetch friends for invitations
  const fetchFriends = async () => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('friends')
        .select(`
          friend_id,
          profiles!friends_friend_id_fkey(id, username, status)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'accepted');

      if (data) {
        setFriends(data.map((f: any) => ({
          id: f.friend_id,
          username: Array.isArray(f.profiles) ? f.profiles[0]?.username : f.profiles?.username,
          status: Array.isArray(f.profiles) ? f.profiles[0]?.status : f.profiles?.status
        })));
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  // Fetch friends on mount
  useEffect(() => {
    if (profile) {
      fetchFriends();
    }
  }, [profile?.id]);

  // Play audio feedback
  const playSound = async (type: 'join' | 'leave' | 'mute' | 'deafen') => {
    try {
      let ctx = audioContext;
      if (!ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioContextClass();
        setAudioContext(ctx);
      }

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'join') {
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      } else if (type === 'leave') {
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      } else if (type === 'mute') {
        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      } else if (type === 'deafen') {
        oscillator.frequency.setValueAtTime(250, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      }

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + (type === 'mute' || type === 'deafen' ? 0.05 : 0.1));
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Toggle mute
  const toggleMute = async () => {
    setIsMuted(!isMuted);
    await playSound('mute');
  };

  // Toggle deafen
  const toggleDeafen = async () => {
    setIsDeafened(!isDeafened);
    await playSound('deafen');
  };

  // Open invite modal
  const openInviteModal = (partyId: string) => {
    setInviteTargetPartyId(partyId);
    setShowInviteModal(true);
    setSelectedFriends(new Set());
  };

  // Invite friends
  const inviteFriends = async () => {
    if (!profile || !inviteTargetPartyId) return;

    try {
      for (const friendId of selectedFriends) {
        const friend = friends.find(f => f.id === friendId);
        if (friend) {
          toast.success(`Invitation sent to ${friend.username}`);
        }
      }

      setShowInviteModal(false);
      setInviteTargetPartyId(null);
      setSelectedFriends(new Set());
    } catch (error) {
      console.error('Error inviting friends:', error);
      toast.error('Failed to send invitations');
    }
  };

  // Leave party
  const leaveParty = async (partyId: string) => {
    if (!profile) return;

    try {
      // Close voice controls if this is the active party
      if (activePartyId === partyId) {
        setActivePartyId(null);
        setShowVoiceControls(false);
        setIsMuted(false);
        setIsDeafened(false);
        setPartyMembers([]);
      }

      // Remove the member from party_members
      const { error: removeError } = await supabase
        .from('party_members')
        .delete()
        .eq('party_id', partyId)
        .eq('user_id', profile.id);
      
      if (removeError) {
        console.error('Error removing member:', removeError);
        toast.error('Failed to leave party');
        return;
      }

      // Wait for trigger to update current_size
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if party should be deleted
      const { data: members } = await supabase
        .from('party_members')
        .select('id')
        .eq('party_id', partyId);

      // If no members left, delete the party
      if (members && members.length === 0) {
        const { error: deleteError } = await supabase
          .from('parties')
          .delete()
          .eq('id', partyId);
        
        if (deleteError && deleteError.code !== 'PGRST116') {
          console.error('Error deleting party:', deleteError);
        }
      }

      // Play leave sound
      await playSound('leave');
      
      toast.success('Left party');
    } catch (error) {
      console.error('Error leaving party:', error);
      toast.error('Failed to leave party');
    }
  };

  return (
    <VoiceChatContext.Provider
      value={{
        activePartyId,
        setActivePartyId,
        showVoiceControls,
        setShowVoiceControls,
        isMuted,
        isDeafened,
        toggleMute,
        toggleDeafen,
        partyMembers,
        activeParty,
        friends,
        showInviteModal,
        setShowInviteModal,
        inviteTargetPartyId,
        setInviteTargetPartyId,
        selectedFriends,
        setSelectedFriends,
        openInviteModal,
        inviteFriends,
        leaveParty,
        playSound,
      }}
    >
      {children}
    </VoiceChatContext.Provider>
  );
}

export function useVoiceChat() {
  const context = useContext(VoiceChatContext);
  if (context === undefined) {
    throw new Error('useVoiceChat must be used within a VoiceChatProvider');
  }
  return context;
}
