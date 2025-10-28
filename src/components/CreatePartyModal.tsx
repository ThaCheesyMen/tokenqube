import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useVoiceChat } from '../contexts/VoiceChatContext';
import { supabase } from '../lib/supabase';
import { X, Users, Gamepad2, Mic, MicOff, Lock, Globe } from 'lucide-react';
import { toast } from '../components/Toast';
import { discordSounds } from '../utils/discordSounds';

interface CreatePartyModalProps {
  onClose: () => void;
  onPartyCreated?: (partyId: string) => void;
}

const POPULAR_GAMES = [
  'Counter-Strike 2',
  'Dota 2',
  'League of Legends',
  'Valorant',
  'Fortnite',
  'Apex Legends',
  'Call of Duty',
  'Minecraft',
  'Rust',
  'Among Us',
  'Rocket League',
  'Overwatch 2',
];

export default function CreatePartyModal({ onClose, onPartyCreated }: CreatePartyModalProps) {
  const { profile } = useAuth();
  const { setActivePartyId, setShowVoiceControls } = useVoiceChat();
  const [gameName, setGameName] = useState('');
  const [maxSize, setMaxSize] = useState(4);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!profile) return;
    
    if (!gameName.trim()) {
      toast.error('Please enter a game name');
      return;
    }

    setLoading(true);

    try {
      // Create party
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .insert({
          leader_id: profile.id,
          game_name: gameName.trim(),
          party_size: maxSize,
          current_size: 1,
          voice_chat_enabled: isVoiceEnabled,
          description: description.trim() || null,
          status: 'open',
          platform: 'PC',
        })
        .select()
        .single();

      if (partyError) throw partyError;

      // Add creator as member
      const { error: memberError } = await supabase
        .from('party_members')
        .insert({
          party_id: party.id,
          user_id: profile.id,
          role: 'leader',
        });

      if (memberError) throw memberError;

      // Automatically join the voice chat if enabled
      if (isVoiceEnabled) {
        setActivePartyId(party.id);
        setShowVoiceControls(true);
      }

      // Play join sound
      await discordSounds.playJoin();

      toast.success('Party created successfully!');
      
      if (onPartyCreated) {
        onPartyCreated(party.id);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error creating party:', error);
      toast.error(error.message || 'Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#202225]">
          <h2 className="text-xl font-bold text-white">Create Party</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1a1a1a] rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Game Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Game Name *
            </label>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Enter game name..."
              className="w-full px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
              list="popular-games"
            />
            <datalist id="popular-games">
              {POPULAR_GAMES.map((game) => (
                <option key={game} value={game} />
              ))}
            </datalist>
          </div>

          {/* Quick Select Games */}
          <div className="flex flex-wrap gap-2">
            {POPULAR_GAMES.slice(0, 6).map((game) => (
              <button
                key={game}
                onClick={() => setGameName(game)}
                className="px-3 py-1 bg-[#1a1a1a] hover:bg-[#8B5CF6] text-white text-sm rounded-full transition"
              >
                {game}
              </button>
            ))}
          </div>

          {/* Party Size */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Max Party Size
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6, 8, 10].map((size) => (
                <button
                  key={size}
                  onClick={() => setMaxSize(size)}
                  className={`flex-1 px-3 py-2 rounded-lg font-semibold transition ${
                    maxSize === size
                      ? 'bg-[#8B5CF6] text-white'
                      : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#7C3AED] hover:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Chat */}
          <div>
            <label className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg cursor-pointer hover:bg-[#7C3AED] transition">
              <div className="flex items-center gap-3">
                {isVoiceEnabled ? (
                  <Mic className="w-5 h-5 text-green-500" />
                ) : (
                  <MicOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <div className="text-white font-semibold">Voice Chat</div>
                  <div className="text-sm text-gray-400">
                    Enable voice communication
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isVoiceEnabled}
                onChange={(e) => setIsVoiceEnabled(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
          </div>

          {/* Privacy */}
          <div>
            <label className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg cursor-pointer hover:bg-[#7C3AED] transition">
              <div className="flex items-center gap-3">
                {isPrivate ? (
                  <Lock className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Globe className="w-5 h-5 text-blue-500" />
                )}
                <div>
                  <div className="text-white font-semibold">Private Party</div>
                  <div className="text-sm text-gray-400">
                    Only invited users can join
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-[#202225]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#1a1a1a] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !gameName.trim()}
            className="flex-1 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
          >
            {loading ? 'Creating...' : 'Create Party'}
          </button>
        </div>
      </div>
    </div>
  );
}

