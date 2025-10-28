import { MessageSquare, Send, Layers, Plus, Trash2, Copy, Wand2, X, Save } from 'lucide-react';

interface Scene {
  id: string;
  name: string;
  sources: any[];
  thumbnail?: string;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
  avatar?: string;
}

interface StreamEffect {
  id: string;
  name: string;
  type: 'blur' | 'grayscale' | 'sepia' | 'brightness' | 'contrast' | 'saturation';
  value: number;
}

// Scene Manager Component
export function SceneManager({ 
  scenes, 
  activeSceneId, 
  onSwitchScene, 
  onCreateScene, 
  onDeleteScene,
  onDuplicateScene
}: {
  scenes: Scene[];
  activeSceneId: string;
  onSwitchScene: (id: string) => void;
  onCreateScene: () => void;
  onDeleteScene: (id: string) => void;
  onDuplicateScene: (id: string) => void;
}) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Scenes
        </h3>
        <button
          onClick={onCreateScene}
          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
        {scenes.map(scene => (
          <div
            key={scene.id}
            className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
              activeSceneId === scene.id
                ? 'bg-[#8B5CF6] text-white'
                : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#4f5660]'
            }`}
            onClick={() => onSwitchScene(scene.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold">{scene.name}</h4>
                <p className="text-xs opacity-70">{scene.sources.length} sources</p>
              </div>
              
              {activeSceneId !== scene.id && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateScene(scene.id);
                    }}
                    className="p-1.5 bg-black/20 hover:bg-black/40 rounded transition"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScene(scene.id);
                    }}
                    className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stream Chat Component
export function StreamChat({
  messages,
  chatInput,
  onChatInputChange,
  onSendMessage
}: {
  messages: ChatMessage[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSendMessage: () => void;
}) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] overflow-hidden flex flex-col h-96">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Stream Chat
        </h3>
        <span className="text-xs bg-white/20 px-2 py-1 rounded-full text-white">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7289da] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {msg.user[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-white text-sm">{msg.user}</span>
                <span className="text-xs text-gray-500">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-gray-300 text-sm break-words">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#202225]">
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder="Send a message..."
            className="flex-1 bg-[#1a1a1a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] border border-[#202225]"
          />
          <button
            onClick={onSendMessage}
            disabled={!chatInput.trim()}
            className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Effects Panel Component
export function EffectsPanel({
  effects,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect
}: {
  effects: StreamEffect[];
  onAddEffect: (type: StreamEffect['type']) => void;
  onUpdateEffect: (id: string, value: number) => void;
  onRemoveEffect: (id: string) => void;
}) {
  const availableEffects: StreamEffect['type'][] = ['blur', 'grayscale', 'sepia', 'brightness', 'contrast', 'saturation'];

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] overflow-hidden">
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          Stream Effects
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Active Effects */}
        {effects.length > 0 && (
          <div className="space-y-3">
            {effects.map(effect => (
              <div key={effect.id} className="bg-[#1a1a1a] rounded-lg p-3 border border-[#202225]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold text-sm">{effect.name}</span>
                  <button
                    onClick={() => onRemoveEffect(effect.id)}
                    className="p-1 hover:bg-red-500/20 rounded transition"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={effect.value}
                    onChange={(e) => onUpdateEffect(effect.id, Number(e.target.value))}
                    className="flex-1 h-2 bg-[#202225] rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-gray-400 text-sm w-10 text-right">{effect.value}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Effect Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {availableEffects.map(type => (
            <button
              key={type}
              onClick={() => onAddEffect(type)}
              disabled={effects.some(e => e.type === type)}
              className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#4f5660] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition border border-[#202225]"
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Recording Controls Component
export function RecordingControls({
  isRecording,
  recordingDuration,
  replayBufferEnabled,
  onStartRecording,
  onStopRecording,
  onSaveReplayBuffer,
  onToggleReplayBuffer
}: {
  isRecording: boolean;
  recordingDuration: number;
  replayBufferEnabled: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSaveReplayBuffer: () => void;
  onToggleReplayBuffer: () => void;
}) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] overflow-hidden">
      <div className="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Save className="w-5 h-5" />
          Recording
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Recording Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Status</p>
            <div className="flex items-center gap-2 mt-1">
              {isRecording && (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-white font-mono">{formatDuration(recordingDuration)}</span>
                </>
              )}
              {!isRecording && <span className="text-gray-500">Not recording</span>}
            </div>
          </div>
          
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white'
            }`}
          >
            {isRecording ? 'Stop' : 'Record'}
          </button>
        </div>

        {/* Replay Buffer */}
        <div className="pt-4 border-t border-[#202225]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white">Replay Buffer</p>
              <p className="text-xs text-gray-400">Save last 30 seconds</p>
            </div>
            <button
              onClick={onToggleReplayBuffer}
              className={`relative w-12 h-6 rounded-full transition ${
                replayBufferEnabled ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  replayBufferEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>
          
          {replayBufferEnabled && (
            <button
              onClick={onSaveReplayBuffer}
              className="w-full px-4 py-2 bg-[#1a1a1a] hover:bg-[#4f5660] text-white text-sm rounded-lg transition border border-[#202225]"
            >
              Save Replay
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

