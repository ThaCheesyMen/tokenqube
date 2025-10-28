// WebRTC Voice Chat Manager
// Handles peer-to-peer voice connections using WebRTC

export interface VoicePeer {
  userId: string;
  username: string;
  peerConnection: RTCPeerConnection;
  audioStream: MediaStream | null;
  audioElement: HTMLAudioElement | null;
  videoStream: MediaStream | null;
  screenStream: MediaStream | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  volume: number;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

// STUN and TURN servers for NAT traversal
// NOTE: Add your own TURN server credentials in production
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  // Public STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Free TURN servers (limited usage)
  { 
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  { 
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  // Add your own TURN server here:
  // { 
  //   urls: 'turn:your-turn-server.com:3478',
  //   username: import.meta.env.VITE_TURN_USERNAME,
  //   credential: import.meta.env.VITE_TURN_CREDENTIAL
  // },
];

export class WebRTCManager {
  private peers: Map<string, VoicePeer> = new Map();
  private localStream: MediaStream | null = null;
  private localVideoStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;
  private config: WebRTCConfig;
  private audioContext: AudioContext | null = null;
  private analyserNodes: Map<string, AnalyserNode> = new Map();
  
  // Callbacks
  public onPeerConnected?: (userId: string, username: string) => void;
  public onPeerDisconnected?: (userId: string) => void;
  public onSpeakingChanged?: (userId: string, isSpeaking: boolean) => void;
  public onVideoEnabled?: (userId: string, enabled: boolean) => void;
  public onScreenSharing?: (userId: string, sharing: boolean) => void;
  public onError?: (error: Error) => void;

  constructor(config?: Partial<WebRTCConfig>) {
    this.config = {
      iceServers: config?.iceServers || DEFAULT_ICE_SERVERS,
    };
  }

  /**
   * Initialize local audio stream
   */
  async initializeLocalStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    try {
      // Default constraints with noise suppression and echo cancellation
      const defaultConstraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints
      );

      // Initialize audio context for voice activity detection
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      return this.localStream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Create a peer connection for a remote user
   */
  async createPeerConnection(
    userId: string,
    username: string,
    isInitiator: boolean
  ): Promise<RTCPeerConnection> {
    if (this.peers.has(userId)) {
      console.warn(`Peer ${userId} already exists, closing old connection`);
      this.closePeerConnection(userId);
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log(`Received track from ${username}`);
      const [remoteStream] = event.streams;
      this.handleRemoteStream(userId, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`ICE candidate for ${username}:`, event.candidate);
        // This should be sent to the remote peer via signaling
        // We'll handle this in the VoiceChatContext
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state for ${username}:`, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'connected') {
        this.onPeerConnected?.(userId, username);
      } else if (
        peerConnection.connectionState === 'disconnected' ||
        peerConnection.connectionState === 'failed' ||
        peerConnection.connectionState === 'closed'
      ) {
        this.onPeerDisconnected?.(userId);
        this.closePeerConnection(userId);
      }
    };

    // Handle ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${username}:`, peerConnection.iceConnectionState);
    };

    // Store peer
    const peer: VoicePeer = {
      userId,
      username,
      peerConnection,
      audioStream: null,
      audioElement: null,
      videoStream: null,
      screenStream: null,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      isVideoEnabled: false,
      isScreenSharing: false,
      volume: 1.0,
    };

    this.peers.set(userId, peer);

    return peerConnection;
  }

  /**
   * Handle remote audio stream
   */
  private handleRemoteStream(userId: string, stream: MediaStream) {
    const peer = this.peers.get(userId);
    if (!peer) return;

    peer.audioStream = stream;

    // Create audio element for playback
    const audioElement = new Audio();
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    audioElement.volume = peer.volume;
    peer.audioElement = audioElement;

    // Set up voice activity detection
    this.setupVoiceActivityDetection(userId, stream);
  }

  /**
   * Set up voice activity detection for a peer
   */
  private setupVoiceActivityDetection(userId: string, stream: MediaStream) {
    if (!this.audioContext) return;

    const peer = this.peers.get(userId);
    if (!peer) return;

    try {
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      this.analyserNodes.set(userId, analyser);

      // Start monitoring
      this.monitorVoiceActivity(userId);
    } catch (error) {
      console.error('Failed to setup voice activity detection:', error);
    }
  }

  /**
   * Monitor voice activity for a peer
   */
  private monitorVoiceActivity(userId: string) {
    const analyser = this.analyserNodes.get(userId);
    const peer = this.peers.get(userId);
    
    if (!analyser || !peer) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkActivity = () => {
      if (!this.peers.has(userId)) return; // Stop if peer disconnected

      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      // Threshold for speaking detection (adjust as needed)
      const SPEAKING_THRESHOLD = 20;
      const isSpeaking = average > SPEAKING_THRESHOLD;

      if (peer.isSpeaking !== isSpeaking) {
        peer.isSpeaking = isSpeaking;
        this.onSpeakingChanged?.(userId, isSpeaking);
      }

      // Continue monitoring
      requestAnimationFrame(checkActivity);
    };

    checkActivity();
  }

  /**
   * Create an offer for a peer
   */
  async createOffer(userId: string): Promise<RTCSessionDescriptionInit> {
    const peer = this.peers.get(userId);
    if (!peer) throw new Error(`Peer ${userId} not found`);

    const offer = await peer.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await peer.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Create an answer for a peer
   */
  async createAnswer(userId: string): Promise<RTCSessionDescriptionInit> {
    const peer = this.peers.get(userId);
    if (!peer) throw new Error(`Peer ${userId} not found`);

    const answer = await peer.peerConnection.createAnswer();
    await peer.peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Set remote description
   */
  async setRemoteDescription(userId: string, description: RTCSessionDescriptionInit) {
    const peer = this.peers.get(userId);
    if (!peer) throw new Error(`Peer ${userId} not found`);

    await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(userId: string, candidate: RTCIceCandidateInit) {
    const peer = this.peers.get(userId);
    if (!peer) throw new Error(`Peer ${userId} not found`);

    await peer.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Mute local audio
   */
  muteLocalAudio(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Set volume for a peer
   */
  setPeerVolume(userId: string, volume: number) {
    const peer = this.peers.get(userId);
    if (!peer || !peer.audioElement) return;

    peer.volume = Math.max(0, Math.min(1, volume));
    peer.audioElement.volume = peer.volume;
  }

  /**
   * Mute a peer (local only)
   */
  mutePeer(userId: string, muted: boolean) {
    const peer = this.peers.get(userId);
    if (!peer || !peer.audioElement) return;

    peer.isMuted = muted;
    peer.audioElement.volume = muted ? 0 : peer.volume;
  }

  /**
   * Enable/disable video
   */
  async toggleVideo(enabled: boolean): Promise<MediaStream | null> {
    try {
      if (enabled && !this.localVideoStream) {
        // Start video
        this.localVideoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });

        // Add video track to all peer connections
        const videoTrack = this.localVideoStream.getVideoTracks()[0];
        this.peers.forEach((peer) => {
          peer.peerConnection.addTrack(videoTrack, this.localVideoStream!);
        });

        return this.localVideoStream;
      } else if (!enabled && this.localVideoStream) {
        // Stop video
        this.localVideoStream.getTracks().forEach((track) => track.stop());
        
        // Remove video track from all peer connections
        this.peers.forEach((peer) => {
          const senders = peer.peerConnection.getSenders();
          senders.forEach((sender) => {
            if (sender.track?.kind === 'video' && sender.track.label !== 'screen') {
              peer.peerConnection.removeTrack(sender);
            }
          });
        });

        this.localVideoStream = null;
        return null;
      }

      return this.localVideoStream;
    } catch (error) {
      console.error('Error toggling video:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<MediaStream | null> {
    try {
      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Add screen track to all peer connections
      const screenTrack = this.localScreenStream.getVideoTracks()[0];
      
      // Handle screen share stop (when user clicks browser's stop button)
      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      this.peers.forEach((peer) => {
        // Remove existing video track if any
        const senders = peer.peerConnection.getSenders();
        senders.forEach((sender) => {
          if (sender.track?.kind === 'video') {
            peer.peerConnection.removeTrack(sender);
          }
        });

        // Add screen track
        peer.peerConnection.addTrack(screenTrack, this.localScreenStream!);
        
        // Add audio if available
        const audioTracks = this.localScreenStream!.getAudioTracks();
        if (audioTracks.length > 0) {
          peer.peerConnection.addTrack(audioTracks[0], this.localScreenStream!);
        }
      });

      return this.localScreenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare() {
    if (!this.localScreenStream) return;

    // Stop all tracks
    this.localScreenStream.getTracks().forEach((track) => track.stop());

    // Remove screen tracks from all peer connections
    this.peers.forEach((peer) => {
      const senders = peer.peerConnection.getSenders();
      senders.forEach((sender) => {
        if (sender.track && this.localScreenStream?.getTracks().includes(sender.track)) {
          peer.peerConnection.removeTrack(sender);
        }
      });

      // Re-add video track if it was enabled
      if (this.localVideoStream) {
        const videoTrack = this.localVideoStream.getVideoTracks()[0];
        peer.peerConnection.addTrack(videoTrack, this.localVideoStream);
      }
    });

    this.localScreenStream = null;
  }

  /**
   * Check if video is enabled
   */
  isVideoEnabled(): boolean {
    return this.localVideoStream !== null && this.localVideoStream.active;
  }

  /**
   * Check if screen sharing is active
   */
  isScreenSharing(): boolean {
    return this.localScreenStream !== null && this.localScreenStream.active;
  }

  /**
   * Get local video stream
   */
  getLocalVideoStream(): MediaStream | null {
    return this.localVideoStream;
  }

  /**
   * Get local screen stream
   */
  getLocalScreenStream(): MediaStream | null {
    return this.localScreenStream;
  }

  /**
   * Close a peer connection
   */
  closePeerConnection(userId: string) {
    const peer = this.peers.get(userId);
    if (!peer) return;

    // Stop audio element
    if (peer.audioElement) {
      peer.audioElement.pause();
      peer.audioElement.srcObject = null;
    }

    // Close peer connection
    peer.peerConnection.close();

    // Clean up analyser
    this.analyserNodes.delete(userId);

    // Remove from peers
    this.peers.delete(userId);

    console.log(`Closed connection for ${peer.username}`);
  }

  /**
   * Close all connections and clean up
   */
  cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Stop video stream
    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach((track) => track.stop());
      this.localVideoStream = null;
    }

    // Stop screen stream
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((track) => track.stop());
      this.localScreenStream = null;
    }

    // Close all peer connections
    this.peers.forEach((_, userId) => {
      this.closePeerConnection(userId);
    });

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.peers.clear();
    this.analyserNodes.clear();
  }

  /**
   * Get all connected peers
   */
  getPeers(): VoicePeer[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get a specific peer
   */
  getPeer(userId: string): VoicePeer | undefined {
    return this.peers.get(userId);
  }

  /**
   * Check if local stream is active
   */
  hasLocalStream(): boolean {
    return this.localStream !== null && this.localStream.active;
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}

// Export singleton instance
export const webrtcManager = new WebRTCManager();

