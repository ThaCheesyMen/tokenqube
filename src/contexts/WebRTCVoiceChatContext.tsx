import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from '../components/Toast';
import { webrtcManager, VoicePeer } from '../lib/webrtc';

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

interface VoiceParticipant {
  user_id: string;
  username: string;
  is_muted: boolean;
  is_deafened: boolean;
  is_speaking: boolean;
  joined_at: string;
}

interface WebRTCVoiceChatContextType {
  // State
  activePartyId: string | null;
  activeParty: Party | null;
  participants: VoiceParticipant[];
  isConnected: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isConnecting: boolean;
  
  // Actions
  joinVoiceChat: (partyId: string) => Promise<void>;
  leaveVoiceChat: () => Promise<void>;
  toggleMute: () => void;
  toggleDeafen: () => void;
  setPeerVolume: (userId: string, volume: number) => void;
  mutePeer: (userId: string, muted: boolean) => void;
  
  // Peer info
  peers: VoicePeer[];
}

const WebRTCVoiceChatContext = createContext<WebRTCVoiceChatContextType | undefined>(undefined);

export function WebRTCVoiceChatProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  
  // State
  const [activePartyId, setActivePartyId] = useState<string | null>(null);
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [peers, setPeers] = useState<VoicePeer[]>([]);
  
  // Refs
  const signalChannelRef = useRef<any>(null);
  const participantsChannelRef = useRef<any>(null);

  // Set up WebRTC callbacks
  useEffect(() => {
    webrtcManager.onPeerConnected = (userId, username) => {
      console.log(`Peer connected: ${username}`);
      toast.success(`${username} joined voice chat`);
      updatePeers();
    };

    webrtcManager.onPeerDisconnected = (userId) => {
      console.log(`Peer disconnected: ${userId}`);
      updatePeers();
    };

    webrtcManager.onSpeakingChanged = async (userId, isSpeaking) => {
      // Update speaking state in database
      if (userId === profile?.id && activePartyId) {
        await supabase.rpc('update_voice_state', {
          p_party_id: activePartyId,
          p_user_id: profile.id,
          p_is_speaking: isSpeaking
        });
      }
      updatePeers();
    };

    webrtcManager.onError = (error) => {
      console.error('WebRTC error:', error);
      toast.error(`Voice chat error: ${error.message}`);
    };

    return () => {
      webrtcManager.cleanup();
    };
  }, [profile?.id, activePartyId]);

  // Update peers state
  const updatePeers = () => {
    setPeers(webrtcManager.getPeers());
  };

  // Fetch active party
  const fetchActiveParty = async (partyId: string) => {
    const { data } = await supabase
      .from('parties')
      .select('*')
      .eq('id', partyId)
      .single();

    if (data) {
      setActiveParty(data as Party);
    }
  };

  // Fetch participants
  const fetchParticipants = async (partyId: string) => {
    const { data } = await supabase
      .rpc('get_voice_participants', { p_party_id: partyId });

    if (data) {
      setParticipants(data as VoiceParticipant[]);
    }
  };

  // Subscribe to signaling messages
  const subscribeToSignaling = (partyId: string) => {
    if (!profile) return;

    const channel = supabase
      .channel(`webrtc_signals_${partyId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `to_user_id=eq.${profile.id}`,
        },
        async (payload) => {
          await handleSignal(payload.new);
        }
      )
      .subscribe();

    signalChannelRef.current = channel;
  };

  // Subscribe to participant changes
  const subscribeToParticipants = (partyId: string) => {
    const channel = supabase
      .channel(`voice_participants_${partyId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_chat_sessions',
          filter: `party_id=eq.${partyId}`,
        },
        () => {
          fetchParticipants(partyId);
        }
      )
      .subscribe();

    participantsChannelRef.current = channel;
  };

  // Handle incoming WebRTC signal
  const handleSignal = async (signal: any) => {
    const { from_user_id, signal_type, signal_data } = signal;

    try {
      switch (signal_type) {
        case 'offer':
          await handleOffer(from_user_id, signal_data);
          break;
        case 'answer':
          await handleAnswer(from_user_id, signal_data);
          break;
        case 'ice-candidate':
          await handleIceCandidate(from_user_id, signal_data);
          break;
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  };

  // Handle offer
  const handleOffer = async (fromUserId: string, offerData: any) => {
    if (!profile || !activePartyId) return;

    // Get username
    const { data: userData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', fromUserId)
      .single();

    const username = userData?.username || 'Unknown';

    // Create peer connection
    await webrtcManager.createPeerConnection(fromUserId, username, false);
    
    // Set remote description
    await webrtcManager.setRemoteDescription(fromUserId, offerData);
    
    // Create answer
    const answer = await webrtcManager.createAnswer(fromUserId);
    
    // Send answer
    await sendSignal(fromUserId, 'answer', answer);
  };

  // Handle answer
  const handleAnswer = async (fromUserId: string, answerData: any) => {
    await webrtcManager.setRemoteDescription(fromUserId, answerData);
  };

  // Handle ICE candidate
  const handleIceCandidate = async (fromUserId: string, candidateData: any) => {
    await webrtcManager.addIceCandidate(fromUserId, candidateData);
  };

  // Send signal to peer
  const sendSignal = async (toUserId: string, signalType: string, signalData: any) => {
    if (!profile || !activePartyId) return;

    await supabase.from('webrtc_signals').insert({
      party_id: activePartyId,
      from_user_id: profile.id,
      to_user_id: toUserId,
      signal_type: signalType,
      signal_data: signalData,
    });
  };

  // Join voice chat
  const joinVoiceChat = async (partyId: string) => {
    if (!profile) {
      toast.error('You must be logged in');
      return;
    }

    setIsConnecting(true);

    try {
      // Initialize local stream
      await webrtcManager.initializeLocalStream();

      // Join voice chat in database
      const { data, error } = await supabase.rpc('join_voice_chat', {
        p_party_id: partyId,
        p_user_id: profile.id,
      });

      if (error) throw error;

      // Set active party
      setActivePartyId(partyId);
      await fetchActiveParty(partyId);

      // Subscribe to signaling and participants
      subscribeToSignaling(partyId);
      subscribeToParticipants(partyId);

      // Fetch current participants
      await fetchParticipants(partyId);

      // Connect to existing participants
      const { data: existingParticipants } = await supabase
        .rpc('get_voice_participants', { p_party_id: partyId });

      if (existingParticipants) {
        for (const participant of existingParticipants) {
          if (participant.user_id !== profile.id) {
            // Create peer connection and send offer
            await webrtcManager.createPeerConnection(
              participant.user_id,
              participant.username,
              true
            );

            const offer = await webrtcManager.createOffer(participant.user_id);
            await sendSignal(participant.user_id, 'offer', offer);
          }
        }
      }

      setIsConnected(true);
      toast.success('Connected to voice chat');
    } catch (error: any) {
      console.error('Error joining voice chat:', error);
      toast.error(`Failed to join voice chat: ${error.message}`);
      await leaveVoiceChat();
    } finally {
      setIsConnecting(false);
    }
  };

  // Leave voice chat
  const leaveVoiceChat = async () => {
    if (!profile || !activePartyId) return;

    try {
      // Leave in database
      await supabase.rpc('leave_voice_chat', {
        p_party_id: activePartyId,
        p_user_id: profile.id,
      });

      // Clean up WebRTC
      webrtcManager.cleanup();

      // Unsubscribe from channels
      if (signalChannelRef.current) {
        supabase.removeChannel(signalChannelRef.current);
      }
      if (participantsChannelRef.current) {
        supabase.removeChannel(participantsChannelRef.current);
      }

      // Reset state
      setActivePartyId(null);
      setActiveParty(null);
      setParticipants([]);
      setIsConnected(false);
      setIsMuted(false);
      setIsDeafened(false);
      setPeers([]);

      toast.success('Left voice chat');
    } catch (error: any) {
      console.error('Error leaving voice chat:', error);
      toast.error(`Failed to leave voice chat: ${error.message}`);
    }
  };

  // Toggle mute
  const toggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    webrtcManager.muteLocalAudio(newMuted);

    if (profile && activePartyId) {
      await supabase.rpc('update_voice_state', {
        p_party_id: activePartyId,
        p_user_id: profile.id,
        p_is_muted: newMuted,
      });
    }

    toast.success(newMuted ? 'Microphone muted' : 'Microphone unmuted');
  };

  // Toggle deafen
  const toggleDeafen = async () => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);

    // Deafen mutes all peers
    peers.forEach((peer) => {
      webrtcManager.mutePeer(peer.userId, newDeafened);
    });

    // Also mute self when deafened
    if (newDeafened && !isMuted) {
      setIsMuted(true);
      webrtcManager.muteLocalAudio(true);
    }

    if (profile && activePartyId) {
      await supabase.rpc('update_voice_state', {
        p_party_id: activePartyId,
        p_user_id: profile.id,
        p_is_deafened: newDeafened,
        p_is_muted: newDeafened ? true : isMuted,
      });
    }

    toast.success(newDeafened ? 'Audio deafened' : 'Audio undeafened');
  };

  // Set peer volume
  const setPeerVolume = (userId: string, volume: number) => {
    webrtcManager.setPeerVolume(userId, volume);
    updatePeers();
  };

  // Mute peer
  const mutePeer = (userId: string, muted: boolean) => {
    webrtcManager.mutePeer(userId, muted);
    updatePeers();
  };

  return (
    <WebRTCVoiceChatContext.Provider
      value={{
        activePartyId,
        activeParty,
        participants,
        isConnected,
        isMuted,
        isDeafened,
        isConnecting,
        joinVoiceChat,
        leaveVoiceChat,
        toggleMute,
        toggleDeafen,
        setPeerVolume,
        mutePeer,
        peers,
      }}
    >
      {children}
    </WebRTCVoiceChatContext.Provider>
  );
}

export function useWebRTCVoiceChat() {
  const context = useContext(WebRTCVoiceChatContext);
  if (context === undefined) {
    throw new Error('useWebRTCVoiceChat must be used within a WebRTCVoiceChatProvider');
  }
  return context;
}

