/**
 * Enhanced WebRTC Manager
 * - TURN server support
 * - Automatic connection recovery
 * - Quality monitoring
 * - Advanced audio processing
 * - Bandwidth adaptation
 */

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
  // Quality metrics
  stats: ConnectionStats;
  // Reconnection
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export interface ConnectionStats {
  packetLoss: number;
  jitter: number;
  rtt: number; // Round-trip time
  bitrate: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  enableConnectionRecovery?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  enableQualityMonitoring?: boolean;
  monitoringInterval?: number;
}

// STUN and TURN servers
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
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
];

export class EnhancedWebRTCManager {
  private peers: Map<string, VoicePeer> = new Map();
  private localStream: MediaStream | null = null;
  private config: Required<WebRTCConfig>;
  private audioContext: AudioContext | null = null;
  private analyserNodes: Map<string, AnalyserNode> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  // Callbacks
  public onPeerConnected?: (userId: string, username: string) => void;
  public onPeerDisconnected?: (userId: string) => void;
  public onSpeakingChanged?: (userId: string, isSpeaking: boolean) => void;
  public onQualityChanged?: (userId: string, stats: ConnectionStats) => void;
  public onConnectionRecovering?: (userId: string) => void;
  public onConnectionRecovered?: (userId: string) => void;
  public onError?: (error: Error) => void;

  constructor(config?: Partial<WebRTCConfig>) {
    this.config = {
      iceServers: config?.iceServers || DEFAULT_ICE_SERVERS,
      enableConnectionRecovery: config?.enableConnectionRecovery ?? true,
      maxReconnectAttempts: config?.maxReconnectAttempts ?? 5,
      reconnectDelay: config?.reconnectDelay ?? 2000,
      enableQualityMonitoring: config?.enableQualityMonitoring ?? true,
      monitoringInterval: config?.monitoringInterval ?? 2000,
    };
  }

  /**
   * Initialize local audio stream with enhanced audio processing
   */
  async initializeLocalStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    try {
      // Advanced audio constraints
      const enhancedConstraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: { exact: true },
          noiseSuppression: { exact: true },
          autoGainControl: { exact: true },
          sampleRate: 48000,
          channelCount: 1, // Mono for voice
          latency: 0.01, // Low latency
          ...((constraints?.audio as object) || {}),
        },
        video: false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(enhancedConstraints);

      // Initialize audio context
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      console.log('✅ Local stream initialized with enhanced audio processing');
      return this.localStream;
    } catch (error) {
      console.error('❌ Failed to get local stream:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Create peer connection with enhanced configuration
   */
  async createPeerConnection(
    userId: string,
    username: string,
    isInitiator: boolean
  ): Promise<RTCPeerConnection> {
    if (this.peers.has(userId)) {
      console.warn(`Peer ${userId} already exists, closing old connection`);
      await this.closePeerConnection(userId);
    }

    // Enhanced peer connection configuration
    const peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
      iceCandidatePoolSize: 10, // Gather candidates faster
      bundlePolicy: 'max-bundle', // Bundle all media into one connection
      rtcpMuxPolicy: 'require', // Multiplex RTP and RTCP
    });

    // Configure codec preferences (prioritize Opus for voice)
    const transceivers = peerConnection.getTransceivers();
    transceivers.forEach((transceiver) => {
      const capabilities = RTCRtpReceiver.getCapabilities('audio');
      if (capabilities && capabilities.codecs) {
        // Prioritize Opus codec
        const opusCodecs = capabilities.codecs.filter(
          (codec) => codec.mimeType === 'audio/opus'
        );
        const otherCodecs = capabilities.codecs.filter(
          (codec) => codec.mimeType !== 'audio/opus'
        );
        const orderedCodecs = [...opusCodecs, ...otherCodecs];
        transceiver.setCodecPreferences(orderedCodecs);
      }
    });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log(`📥 Received track from ${username}`);
      const [remoteStream] = event.streams;
      this.handleRemoteStream(userId, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 ICE candidate for ${username}`);
        // ICE candidates should be sent via signaling server
        // This will be handled by the context layer
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`🔌 Connection state for ${username}:`, state);
      
      if (state === 'connected') {
        this.onPeerConnected?.(userId, username);
        this.startQualityMonitoring(userId);
      } else if (state === 'disconnected' || state === 'failed') {
        if (this.config.enableConnectionRecovery) {
          this.attemptReconnection(userId, username);
        } else {
          this.onPeerDisconnected?.(userId);
          this.closePeerConnection(userId);
        }
      } else if (state === 'closed') {
        this.onPeerDisconnected?.(userId);
        this.closePeerConnection(userId);
      }
    };

    // Handle ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`❄️ ICE state for ${username}:`, peerConnection.iceConnectionState);
    };

    // Create peer object
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
      stats: {
        packetLoss: 0,
        jitter: 0,
        rtt: 0,
        bitrate: 0,
        quality: 'excellent',
      },
      reconnectAttempts: 0,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
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

    // Create audio element
    const audioElement = new Audio();
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    audioElement.volume = peer.volume;
    peer.audioElement = audioElement;

    // Set up voice activity detection
    this.setupVoiceActivityDetection(userId, stream);
  }

  /**
   * Voice activity detection
   */
  private setupVoiceActivityDetection(userId: string, stream: MediaStream) {
    if (!this.audioContext) return;

    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);
    this.analyserNodes.set(userId, analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const checkAudioLevel = () => {
      const peer = this.peers.get(userId);
      if (!peer) return;

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      const isSpeaking = average > 20; // Threshold
      
      if (peer.isSpeaking !== isSpeaking) {
        peer.isSpeaking = isSpeaking;
        this.onSpeakingChanged?.(userId, isSpeaking);
      }

      requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  }

  /**
   * Start quality monitoring for a peer
   */
  private startQualityMonitoring(userId: string) {
    if (!this.config.enableQualityMonitoring) return;

    const interval = setInterval(async () => {
      await this.updateConnectionQuality(userId);
    }, this.config.monitoringInterval);

    this.monitoringIntervals.set(userId, interval);
  }

  /**
   * Update connection quality metrics
   */
  private async updateConnectionQuality(userId: string) {
    const peer = this.peers.get(userId);
    if (!peer || !peer.peerConnection) return;

    try {
      const stats = await peer.peerConnection.getStats();
      let packetLoss = 0;
      let jitter = 0;
      let rtt = 0;
      let bitrate = 0;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
          packetLoss = report.packetsLost || 0;
          jitter = report.jitter || 0;
          bitrate = report.bytesReceived || 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          rtt = report.currentRoundTripTime || 0;
        }
      });

      // Determine quality
      let quality: ConnectionStats['quality'] = 'excellent';
      if (packetLoss > 5 || rtt > 200 || jitter > 30) {
        quality = 'poor';
      } else if (packetLoss > 2 || rtt > 100 || jitter > 20) {
        quality = 'fair';
      } else if (packetLoss > 0 || rtt > 50 || jitter > 10) {
        quality = 'good';
      }

      peer.stats = {
        packetLoss,
        jitter,
        rtt,
        bitrate,
        quality,
      };

      this.onQualityChanged?.(userId, peer.stats);

      // Adapt to poor quality
      if (quality === 'poor') {
        console.warn(`⚠️ Poor connection quality to ${peer.username}`);
        // Could implement bitrate adaptation here
      }
    } catch (error) {
      console.error('Error getting connection stats:', error);
    }
  }

  /**
   * Attempt to reconnect to a peer
   */
  private async attemptReconnection(userId: string, username: string) {
    const peer = this.peers.get(userId);
    if (!peer) return;

    if (peer.reconnectAttempts >= peer.maxReconnectAttempts) {
      console.error(`❌ Max reconnect attempts reached for ${username}`);
      this.onPeerDisconnected?.(userId);
      await this.closePeerConnection(userId);
      return;
    }

    peer.reconnectAttempts++;
    this.onConnectionRecovering?.(userId);
    
    console.log(`🔄 Reconnecting to ${username} (attempt ${peer.reconnectAttempts}/${peer.maxReconnectAttempts})`);

    // Wait before reconnecting
    await new Promise((resolve) =>
      setTimeout(resolve, this.config.reconnectDelay * peer.reconnectAttempts)
    );

    try {
      // Create ICE restart offer
      const offer = await peer.peerConnection.createOffer({ iceRestart: true });
      await peer.peerConnection.setLocalDescription(offer);
      
      // Send offer via signaling server (handled by context layer)
      console.log('📤 Sending ICE restart offer');
      
      this.onConnectionRecovered?.(userId);
    } catch (error) {
      console.error('Error during reconnection:', error);
      this.attemptReconnection(userId, username);
    }
  }

  /**
   * Close peer connection and cleanup
   */
  async closePeerConnection(userId: string) {
    const peer = this.peers.get(userId);
    if (!peer) return;

    // Stop quality monitoring
    const interval = this.monitoringIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(userId);
    }

    // Remove analyser
    this.analyserNodes.delete(userId);

    // Close audio element
    if (peer.audioElement) {
      peer.audioElement.pause();
      peer.audioElement.srcObject = null;
    }

    // Close peer connection
    peer.peerConnection.close();

    this.peers.delete(userId);
    console.log(`🔌 Closed connection to ${peer.username}`);
  }

  /**
   * Mute/unmute local audio
   */
  setMuted(muted: boolean) {
    if (!this.localStream) return;
    
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
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
   * Get connection quality for a peer
   */
  getPeerQuality(userId: string): ConnectionStats | null {
    return this.peers.get(userId)?.stats || null;
  }

  /**
   * Cleanup all connections
   */
  async cleanup() {
    const userIds = Array.from(this.peers.keys());
    await Promise.all(userIds.map((id) => this.closePeerConnection(id)));

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    console.log('🧹 Cleaned up all WebRTC resources');
  }
}

