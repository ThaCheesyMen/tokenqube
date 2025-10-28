import { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, 
  MonitorOff, Maximize2, Minimize2, Volume2, VolumeX,
  Settings, Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { discordSounds } from '../utils/discordSounds';
import { toast } from './Toast';

interface CallInterfaceProps {
  roomId: string;
  isVideoCall: boolean;
  otherUserId: string;
  otherUsername: string;
  isCaller: boolean;
  onEndCall: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export default function CallInterface({
  roomId,
  isVideoCall,
  otherUserId,
  otherUsername,
  isCaller,
  onEndCall,
  isMinimized,
  onToggleMinimize,
}: CallInterfaceProps) {
  const { profile } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const callChannelRef = useRef<any>(null);
  const callStartTimeRef = useRef<number>(Date.now());

  // ICE servers for WebRTC
  const iceServers: IceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  useEffect(() => {
    let isActive = true;
    
    const init = async () => {
      if (isActive) {
        await initializeCall();
      }
    };
    
    init();
    
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);

    return () => {
      isActive = false;
      clearInterval(interval);
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('WebRTC not supported');
        toast.error('Camera/microphone not available. Please use HTTPS or localhost.');
        setConnectionStatus('failed');
        onEndCall(); // Close the call interface
        return;
      }

      // Request permissions explicitly
      console.log('Requesting media permissions...');
      
      // Try to get media stream with proper error handling
      let stream: MediaStream;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: isVideoCall ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          } : false,
        });
        console.log('Media permissions granted, stream obtained');
      } catch (mediaError: any) {
        console.error('Media permission error:', mediaError);
        
        // Handle specific permission errors
        if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
          toast.error('Camera/microphone permission denied. Please allow access in browser settings.');
        } else if (mediaError.name === 'NotFoundError' || mediaError.name === 'DevicesNotFoundError') {
          toast.error('No camera or microphone found. Please check your devices.');
        } else if (mediaError.name === 'NotReadableError' || mediaError.name === 'TrackStartError') {
          toast.error('Camera/microphone is already in use by another application.');
        } else if (mediaError.name === 'OverconstrainedError') {
          // Try again with basic constraints
          console.log('Retrying with basic constraints...');
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: isVideoCall,
            });
            console.log('Media obtained with basic constraints');
          } catch (retryError) {
            toast.error('Failed to access camera/microphone. Please check your browser settings.');
            setConnectionStatus('failed');
            onEndCall();
            return;
          }
        } else {
          toast.error(`Failed to access camera/microphone: ${mediaError.message || 'Unknown error'}`);
          setConnectionStatus('failed');
          onEndCall();
          return;
        }
        
        if (!stream!) {
          setConnectionStatus('failed');
          onEndCall();
          return;
        }
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setConnectionStatus('connected');
          discordSounds.playCallConnected();
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal('ice-candidate', { candidate: event.candidate });
        }
      };

      // Monitor connection state
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log('🔌 Connection state changed:', state);
        
        if (state === 'connected') {
          console.log('✅ Call connected!');
          setConnectionStatus('connected');
          discordSounds.playCallConnected();
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setConnectionStatus('failed');
          toast.error('Call connection lost');
          
          // Auto-disband the call after a short delay
          setTimeout(async () => {
            console.log('Auto-disbanding failed call...');
            await endCallSession();
            cleanup();
            onEndCall();
          }, 2000);
        }
      };

      // Also monitor ICE connection state for more detailed status
      peerConnection.oniceconnectionstatechange = () => {
        const iceState = peerConnection.iceConnectionState;
        console.log('❄️ ICE connection state:', iceState);
        
        if (iceState === 'connected' || iceState === 'completed') {
          console.log('✅ ICE connected!');
          setConnectionStatus('connected');
          discordSounds.playCallConnected();
        }
      };

      // Subscribe to signaling channel
      subscribeToSignaling();

      // Subscribe to call session updates (to detect when other user hangs up)
      subscribeToCallSession();

      // Use isCaller prop to determine role (not based on existing signals)
      if (isCaller) {
        // We're the caller, create offer
        console.log('📞 I am the CALLER, creating offer...');
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await sendSignal('offer', { sdp: offer });
        console.log('✅ Offer created and sent, waiting for answer...');
      } else {
        // We're the receiver, wait for and process the offer
        console.log('📥 I am the RECEIVER, waiting for offer...');
        console.log('📥 Checking for offer in room:', roomId);
        
        // Check for existing offer (caller might have sent it before we opened interface)
        const { data: existingOffer, error: offerError } = await supabase
          .from('call_signals')
          .select('*')
          .eq('room_id', roomId)
          .eq('signal_type', 'offer')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (offerError) {
          console.error('❌ Error fetching offer:', offerError);
        }

        console.log('📊 Query result - offer found:', !!existingOffer, 'data:', existingOffer);

        if (existingOffer) {
          console.log('📥 Found existing offer, processing...');
          await handleSignal(existingOffer);
        } else {
          console.log('⏰ No offer yet, waiting for realtime signal...');
        }
      }

      // Wait a bit for offer/answer exchange to complete before processing ICE candidates
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check for any ICE candidates that arrived before we subscribed
      const { data: existingCandidates } = await supabase
        .from('call_signals')
        .select('*')
        .eq('room_id', roomId)
        .eq('signal_type', 'ice-candidate')
        .neq('sender_id', profile?.id || '');

      if (existingCandidates && existingCandidates.length > 0) {
        console.log(`📥 Found ${existingCandidates.length} existing ICE candidates, processing...`);
        for (const candidate of existingCandidates) {
          await handleSignal(candidate);
        }
      }
    } catch (error) {
      console.error('Error initializing call:', error);
      toast.error('Failed to access camera/microphone');
      setConnectionStatus('failed');
    }
  };

  const subscribeToSignaling = () => {
    const channel = supabase
      .channel(`call_signals_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: any) => {
          const signal = payload.new;
          console.log('📨 Received signal:', signal.signal_type, 'from:', signal.sender_id === profile?.id ? 'self' : 'other');
          if (signal.sender_id === profile?.id) return; // Ignore our own signals

          console.log('🔄 Processing signal:', signal.signal_type);
          await handleSignal(signal);
        }
      )
      .subscribe();

    callChannelRef.current = channel;
  };

  const subscribeToCallSession = () => {
    const sessionChannel = supabase
      .channel(`call_session_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: any) => {
          const session = payload.new;
          console.log('📞 Call session updated:', session.status);
          
          // If the other user ended the call, close our interface
          if (session.status === 'ended' || session.status === 'declined') {
            console.log('🔴 Other user ended the call');
            toast.info('Call ended');
            discordSounds.playCallDisconnect();
            cleanup();
            onEndCall();
          }
        }
      )
      .subscribe();
  };

  const handleSignal = async (signal: any) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.warn('⚠️ No peer connection available to handle signal');
      return;
    }

    try {
      console.log(`🔧 Handling ${signal.signal_type}...`);
      switch (signal.signal_type) {
        case 'offer':
          console.log('📨 Setting remote description (offer)...');
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
          console.log('📤 Creating answer...');
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal('answer', { sdp: answer });
          console.log('✅ Answer sent');
          break;

        case 'answer':
          console.log('📨 Setting remote description (answer)...');
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
          console.log('✅ Answer processed - connection should establish');
          break;

        case 'ice-candidate':
          if (signal.signal_data.candidate) {
            console.log('❄️ Adding ICE candidate...');
            await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
            console.log('✅ ICE candidate added');
          }
          break;
      }
    } catch (error) {
      console.error('❌ Error handling signal:', error);
    }
  };

  const sendSignal = async (signalType: string, signalData: any) => {
    console.log(`📤 Sending ${signalType} signal...`);
    const { error } = await supabase.from('call_signals').insert({
      room_id: roomId,
      sender_id: profile?.id,
      signal_type: signalType,
      signal_data: signalData,
    });
    
    if (error) {
      console.error(`❌ Error sending ${signalType}:`, error);
    } else {
      console.log(`✅ ${signalType} signal sent successfully`);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        discordSounds.playMuteToggle();
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        screenStreamRef.current = screenStream;

        // Replace video track with screen share track
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current
          ?.getSenders()
          .find(s => s.track?.kind === 'video');

        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        // Handle screen share stop
        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
        toast.success('Screen sharing started');
      } else {
        stopScreenShare();
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
      toast.error('Failed to share screen');
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Restore camera track
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = peerConnectionRef.current
        ?.getSenders()
        .find(s => s.track?.kind === 'video');

      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    }

    setIsScreenSharing(false);
    toast.success('Screen sharing stopped');
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsSpeakerMuted(remoteVideoRef.current.muted);
    }
  };

  const endCallSession = async () => {
    // End the call session in the database
    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: callDuration,
        })
        .eq('room_id', roomId)
        .eq('status', 'active');

      if (error) {
        console.error('Error ending call session:', error);
      } else {
        console.log('Call session ended in database');
      }
    } catch (error) {
      console.error('Error updating call session:', error);
    }
  };

  const endCall = async () => {
    console.log('Ending call...');
    await discordSounds.playCallDisconnect();
    await endCallSession();
    cleanup();
    onEndCall();
  };

  const cleanup = () => {
    console.log('Cleaning up call resources...');
    
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach(track => {
      track.stop();
      console.log('Stopped track:', track.kind);
    });
    screenStreamRef.current?.getTracks().forEach(track => {
      track.stop();
      console.log('Stopped screen share track');
    });

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      console.log('Peer connection closed');
    }

    // Unsubscribe from channel
    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current);
      console.log('Signaling channel unsubscribed');
    }

    // Clear refs
    localStreamRef.current = null;
    screenStreamRef.current = null;
    peerConnectionRef.current = null;

    // Delete call signals
    supabase
      .from('call_signals')
      .delete()
      .eq('room_id', roomId)
      .then(() => {});
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-[#1a1a1a] rounded-xl shadow-2xl border border-[#202225] w-80 overflow-hidden">
        {/* Minimized Header */}
        <div className="bg-[#202225] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{otherUsername}</div>
              <div className="text-xs text-gray-400">{formatDuration(callDuration)}</div>
            </div>
          </div>
          <button
            onClick={onToggleMinimize}
            className="p-2 hover:bg-[#0f0f0f] rounded-lg transition"
          >
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Minimized Controls */}
        <div className="p-3 flex items-center justify-around gap-2">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-lg transition ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1a1a1a] hover:bg-[#4f5660]'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
          </button>
          {isVideoCall && (
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-lg transition ${
                !isVideoEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1a1a1a] hover:bg-[#4f5660]'
              }`}
            >
              {isVideoEnabled ? <Video className="w-4 h-4 text-white" /> : <VideoOff className="w-4 h-4 text-white" />}
            </button>
          )}
          <button
            onClick={endCall}
            className="p-3 bg-red-500 hover:bg-red-600 rounded-lg transition"
          >
            <PhoneOff className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1e1f22] flex flex-col">
      {/* Call Header */}
      <div className="bg-[#1a1a1a] px-6 py-4 flex items-center justify-between border-b border-[#202225]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white font-bold text-lg">
            {otherUsername[0].toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-semibold text-white">{otherUsername}</div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`} />
              <span>
                {connectionStatus === 'connected' ? formatDuration(callDuration) : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 
                 'Connection failed'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onToggleMinimize}
          className="p-2 hover:bg-[#1a1a1a] rounded-lg transition"
          title="Minimize"
        >
          <Minimize2 className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-[#1e1f22]">
        {/* Remote Video (Main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-64 h-48 bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border-2 border-[#202225]">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
          {isMuted && (
            <div className="absolute bottom-2 left-2 bg-red-500 rounded-full p-2">
              <MicOff className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Connection Quality Indicator */}
        {connectionStatus === 'connected' && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-white">HD Quality</span>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="bg-[#1a1a1a] px-6 py-6 border-t border-[#202225]">
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-[#1a1a1a] hover:bg-[#4f5660] text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Video Toggle */}
          {isVideoCall && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all ${
                !isVideoEnabled 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-[#1a1a1a] hover:bg-[#4f5660] text-white'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
          )}

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all ${
              isScreenSharing 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-[#1a1a1a] hover:bg-[#4f5660] text-white'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
          </button>

          {/* Speaker */}
          <button
            onClick={toggleSpeaker}
            className={`p-4 rounded-full transition-all ${
              isSpeakerMuted 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-[#1a1a1a] hover:bg-[#4f5660] text-white'
            }`}
            title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
          >
            {isSpeakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>

          {/* Settings */}
          <button
            className="p-4 rounded-full bg-[#1a1a1a] hover:bg-[#4f5660] text-white transition-all"
            title="Settings"
          >
            <Settings className="w-6 h-6" />
          </button>

          {/* End Call */}
          <button
            onClick={endCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all ml-4"
            title="End call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mirror effect for local video */}
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}

