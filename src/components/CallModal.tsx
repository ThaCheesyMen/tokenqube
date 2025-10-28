import { useState, useEffect, useRef } from 'react';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Volume2, VolumeX, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';
import { discordSounds } from '../utils/discordSounds';

interface CallModalProps {
  callId: string | null;
  friendId: string;
  friendUsername: string;
  callType: 'voice' | 'video';
  isIncoming?: boolean;
  onClose: () => void;
}

export default function CallModal({ 
  callId: initialCallId, 
  friendId, 
  friendUsername, 
  callType, 
  isIncoming = false,
  onClose 
}: CallModalProps) {
  const { profile } = useAuth();
  const [callId, setCallId] = useState(initialCallId);
  const [callStatus, setCallStatus] = useState<'ringing' | 'active' | 'ended'>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (isIncoming && callId) {
      // Play incoming call sound
      discordSounds.playCallRinging();
    } else if (!isIncoming) {
      // Initiate outgoing call
      initiateCall();
    }

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (callStatus === 'active') {
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callStatus]);

  useEffect(() => {
    if (!callId) return;

    // Subscribe to call status changes
    const channel = supabase
      .channel(`call:${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'active' && callStatus === 'ringing') {
            setCallStatus('active');
            discordSounds.playJoin();
            setupMediaStreams();
          } else if (['ended', 'declined', 'missed'].includes(newStatus)) {
            handleCallEnd();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, callStatus]);

  const initiateCall = async () => {
    if (!profile) return;

    try {
      // Play call sound
      await discordSounds.playCallRinging();

      // Create call in database
      const { data, error } = await supabase.rpc('initiate_call', {
        p_callee_id: friendId,
        p_call_type: callType,
      });

      if (error) throw error;
      
      setCallId(data);
      setCallStatus('ringing');
    } catch (error: any) {
      console.error('Error initiating call:', error);
      toast.error('Failed to initiate call');
      onClose();
    }
  };

  const setupMediaStreams = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      // Setup WebRTC peer connection
      setupPeerConnection(stream);
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      toast.error('Could not access camera/microphone');
    }
  };

  const setupPeerConnection = (stream: MediaStream) => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    // Add local stream tracks
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to remote peer via Supabase
        // This would be handled through WebRTC signaling table
        console.log('ICE candidate:', event.candidate);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed') {
        handleCallEnd();
      }
    };
  };

  const answerCall = async () => {
    if (!callId) return;

    try {
      await supabase.rpc('answer_call', { p_call_id: callId });
      await discordSounds.playJoin();
      setCallStatus('active');
      setupMediaStreams();
    } catch (error: any) {
      console.error('Error answering call:', error);
      toast.error('Failed to answer call');
    }
  };

  const declineCall = async () => {
    if (!callId) return;

    try {
      await supabase.rpc('decline_call', { p_call_id: callId });
      await discordSounds.playLeave();
      onClose();
    } catch (error: any) {
      console.error('Error declining call:', error);
      onClose();
    }
  };

  const endCall = async () => {
    if (!callId) return;

    try {
      await supabase.rpc('end_call', { p_call_id: callId });
      await discordSounds.playLeave();
      handleCallEnd();
    } catch (error: any) {
      console.error('Error ending call:', error);
      handleCallEnd();
    }
  };

  const handleCallEnd = () => {
    setCallStatus('ended');
    cleanup();
    setTimeout(() => onClose(), 1000);
  };

  const cleanup = () => {
    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Clear interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOff(!isSpeakerOff);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerOff;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100]">
      <div className="bg-[#1a1a1a] rounded-xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-[#202225] px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">{friendUsername}</h3>
            <p className="text-gray-400 text-sm">
              {callStatus === 'ringing' ? (isIncoming ? 'Incoming call...' : 'Calling...') :
               callStatus === 'active' ? formatDuration(duration) :
               'Call ended'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1a1a1a] rounded-lg transition text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Area */}
        {callType === 'video' && (
          <div className="relative bg-black aspect-video">
            {/* Remote Video (Full Screen) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden shadow-xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
                  <div className="w-16 h-16 bg-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {profile?.username?.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>

            {/* No Video Placeholder */}
            {!remoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED]">
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-5xl mb-4">
                  {friendUsername.charAt(0).toUpperCase()}
                </div>
                <p className="text-white text-xl font-semibold">{friendUsername}</p>
                <p className="text-white/80 text-sm mt-2">
                  {callStatus === 'ringing' ? 'Waiting to connect...' : 'Connecting...'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Voice Only */}
        {callType === 'voice' && (
          <div className="py-20 flex flex-col items-center justify-center bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED]">
            <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-5xl mb-6">
              {friendUsername.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">{friendUsername}</h2>
            <p className="text-white/80 text-lg">
              {callStatus === 'ringing' ? (isIncoming ? 'Incoming voice call' : 'Calling...') :
               callStatus === 'active' ? formatDuration(duration) :
               'Call ended'}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="bg-[#202225] px-6 py-6">
          <div className="flex items-center justify-center gap-4">
            {/* Answer Call (Incoming Only) */}
            {isIncoming && callStatus === 'ringing' && (
              <>
                <button
                  onClick={answerCall}
                  className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition shadow-lg"
                  title="Answer"
                >
                  {callType === 'video' ? (
                    <Video className="w-7 h-7 text-white" />
                  ) : (
                    <Phone className="w-7 h-7 text-white" />
                  )}
                </button>
                <button
                  onClick={declineCall}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition shadow-lg"
                  title="Decline"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
              </>
            )}

            {/* Active Call Controls */}
            {callStatus === 'active' && (
              <>
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 ${isMuted ? 'bg-red-500' : 'bg-[#1a1a1a]'} hover:bg-[#4f5660] rounded-full flex items-center justify-center transition`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <MicOff className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </button>

                {callType === 'video' && (
                  <button
                    onClick={toggleVideo}
                    className={`w-14 h-14 ${isVideoOff ? 'bg-red-500' : 'bg-[#1a1a1a]'} hover:bg-[#4f5660] rounded-full flex items-center justify-center transition`}
                    title={isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
                  >
                    {isVideoOff ? (
                      <VideoOff className="w-6 h-6 text-white" />
                    ) : (
                      <Video className="w-6 h-6 text-white" />
                    )}
                  </button>
                )}

                <button
                  onClick={toggleSpeaker}
                  className={`w-14 h-14 ${isSpeakerOff ? 'bg-red-500' : 'bg-[#1a1a1a]'} hover:bg-[#4f5660] rounded-full flex items-center justify-center transition`}
                  title={isSpeakerOff ? 'Unmute Speaker' : 'Mute Speaker'}
                >
                  {isSpeakerOff ? (
                    <VolumeX className="w-6 h-6 text-white" />
                  ) : (
                    <Volume2 className="w-6 h-6 text-white" />
                  )}
                </button>

                <button
                  onClick={endCall}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition shadow-lg ml-4"
                  title="End Call"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
              </>
            )}

            {/* Outgoing Call - End Only */}
            {!isIncoming && callStatus === 'ringing' && (
              <button
                onClick={endCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition shadow-lg"
                title="Cancel"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}

