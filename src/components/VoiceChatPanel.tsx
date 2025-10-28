import { useState } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, PhoneOff, Settings,
  User, Minimize2, Maximize2, Users, Radio
} from 'lucide-react';
import { useWebRTCVoiceChat } from '../contexts/WebRTCVoiceChatContext';

interface VoiceChatPanelProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export default function VoiceChatPanel({ isMinimized = false, onToggleMinimize }: VoiceChatPanelProps) {
  const {
    activeParty,
    participants,
    isConnected,
    isMuted,
    isDeafened,
    isConnecting,
    leaveVoiceChat,
    toggleMute,
    toggleDeafen,
    setPeerVolume,
    mutePeer,
    peers,
  } = useWebRTCVoiceChat();

  const [showSettings, setShowSettings] = useState(false);
  const [peerVolumes, setPeerVolumes] = useState<Record<string, number>>({});

  if (!activeParty) return null;

  const handleVolumeChange = (userId: string, volume: number) => {
    setPeerVolume(userId, volume);
    setPeerVolumes(prev => ({ ...prev, [userId]: volume }));
  };

  const handleMutePeer = (userId: string) => {
    const peer = peers.find(p => p.userId === userId);
    if (peer) {
      mutePeer(userId, !peer.isMuted);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 left-20 right-0 bg-[#1a1a1a] border-t border-[#202225] px-4 py-2 flex items-center justify-between z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-green-500 animate-pulse" />
            <span className="text-sm text-white font-semibold">{activeParty.game_name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="w-3 h-3" />
            <span>{participants.length} connected</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`p-2 rounded transition ${
              isMuted
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#4f5660]'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleDeafen}
            className={`p-2 rounded transition ${
              isDeafened
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#4f5660]'
            }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={leaveVoiceChat}
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            title="Disconnect"
          >
            <PhoneOff className="w-4 h-4" />
          </button>

          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="p-2 bg-[#1a1a1a] text-gray-300 rounded hover:bg-[#4f5660] transition"
              title="Expand"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-20 right-0 bg-[#1a1a1a] border-t border-[#202225] z-40">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#202225] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-green-500 animate-pulse" />
          <div>
            <h3 className="text-white font-semibold">{activeParty.game_name}</h3>
            <p className="text-xs text-gray-400">Voice Chat</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded transition ${
              showSettings
                ? 'bg-[#8B5CF6] text-white'
                : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#4f5660]'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="p-2 bg-[#1a1a1a] text-gray-300 rounded hover:bg-[#4f5660] transition"
              title="Minimize"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Participants */}
      <div className="px-4 py-3 max-h-48 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {participants.map((participant) => {
            const peer = peers.find(p => p.userId === participant.user_id);
            const isSpeaking = peer?.isSpeaking || participant.is_speaking;

            return (
              <div
                key={participant.user_id}
                className={`relative bg-[#1a1a1a] rounded-lg p-3 transition ${
                  isSpeaking ? 'ring-2 ring-green-500' : ''
                }`}
              >
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition ${
                    isSpeaking
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                      : 'bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white'
                  }`}>
                    {participant.username[0].toUpperCase()}
                  </div>

                  {/* Username */}
                  <span className="text-xs text-white truncate w-full text-center">
                    {participant.username}
                  </span>

                  {/* Status Icons */}
                  <div className="flex items-center gap-1">
                    {participant.is_muted && (
                      <div className="p-1 bg-red-500 rounded-full" title="Muted">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {participant.is_deafened && (
                      <div className="p-1 bg-red-500 rounded-full" title="Deafened">
                        <VolumeX className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Volume Control (for peers only) */}
                  {peer && showSettings && (
                    <div className="w-full mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Volume</span>
                        <span>{Math.round((peerVolumes[peer.userId] || peer.volume) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={peerVolumes[peer.userId] || peer.volume}
                        onChange={(e) => handleVolumeChange(peer.userId, parseFloat(e.target.value))}
                        className="w-full h-1 bg-[#202225] rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
                      />
                      <button
                        onClick={() => handleMutePeer(peer.userId)}
                        className="w-full text-xs py-1 bg-[#1a1a1a] hover:bg-[#202225] rounded transition"
                      >
                        {peer.isMuted ? 'Unmute' : 'Mute'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {participants.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No one in voice chat yet</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-t border-[#202225] flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          {isConnecting ? (
            <>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span>Connecting...</span>
            </>
          ) : isConnected ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span>Disconnected</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`px-4 py-2 rounded transition flex items-center gap-2 ${
              isMuted
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED]'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span className="text-sm font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            onClick={toggleDeafen}
            className={`px-4 py-2 rounded transition flex items-center gap-2 ${
              isDeafened
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-[#1a1a1a] text-white hover:bg-[#4f5660]'
            }`}
          >
            {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="text-sm font-medium">{isDeafened ? 'Undeafen' : 'Deafen'}</span>
          </button>

          <button
            onClick={leaveVoiceChat}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="text-sm font-medium">Disconnect</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 border-t border-[#202225] bg-[#0f0f0f]">
          <h4 className="text-sm font-semibold text-white mb-3">Voice Settings</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Input Device</label>
              <select className="w-full bg-[#1a1a1a] text-white text-sm px-3 py-2 rounded border border-[#202225] focus:border-[#8B5CF6] focus:outline-none">
                <option>Default Microphone</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Output Device</label>
              <select className="w-full bg-[#1a1a1a] text-white text-sm px-3 py-2 rounded border border-[#202225] focus:border-[#8B5CF6] focus:outline-none">
                <option>Default Speakers</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" className="rounded" defaultChecked />
                <span>Noise Suppression</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" className="rounded" defaultChecked />
                <span>Echo Cancellation</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

