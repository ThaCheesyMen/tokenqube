import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mic, MicOff, Volume2, Users, Phone, Radio } from 'lucide-react';

interface VoiceChannel {
  id: string;
  name: string;
  type: 'party' | 'call' | 'room';
  participants: VoiceParticipant[];
  active: boolean;
}

interface VoiceParticipant {
  id: string;
  username: string;
  avatar_url?: string;
  is_muted: boolean;
  is_deafened: boolean;
  is_speaking: boolean;
}

interface VoiceChatStatusWidgetProps {
  onNavigate?: (page: string) => void;
}

export default function VoiceChatStatusWidget({ onNavigate }: VoiceChatStatusWidgetProps) {
  const { profile } = useAuth();
  const [voiceChannels, setVoiceChannels] = useState<VoiceChannel[]>([]);
  const [myActiveChannel, setMyActiveChannel] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    fetchActiveVoiceChannels();

    // Refresh every 5 seconds
    const interval = setInterval(fetchActiveVoiceChannels, 5000);

    return () => clearInterval(interval);
  }, [profile]);

  const fetchActiveVoiceChannels = async () => {
    if (!profile) return;

    try {
      // Get active calls
      const { data: callsData } = await supabase
        .from('call_sessions')
        .select(`
          id,
          dm_room_id,
          dm_rooms!inner(
            id,
            user1_id,
            user2_id,
            profiles!dm_rooms_user1_id_fkey(id, username, avatar_url),
            profiles2:profiles!dm_rooms_user2_id_fkey(id, username, avatar_url)
          )
        `)
        .eq('status', 'active');

      // Get active parties with voice
      const { data: partiesData } = await supabase
        .from('parties')
        .select(`
          id,
          game_name,
          voice_chat_enabled,
          party_members(
            user_id,
            profiles(id, username, avatar_url)
          )
        `)
        .eq('status', 'open')
        .eq('voice_chat_enabled', true);

      const channels: VoiceChannel[] = [];

      // Process calls
      if (callsData) {
        callsData.forEach((call: any) => {
          const room = call.dm_rooms;
          const otherUser = room.user1_id === profile.id 
            ? room.profiles2 
            : room.profiles;

          if (otherUser) {
            channels.push({
              id: call.id,
              name: `Call with ${otherUser.username}`,
              type: 'call',
              participants: [
                {
                  id: otherUser.id,
                  username: otherUser.username,
                  avatar_url: otherUser.avatar_url,
                  is_muted: false,
                  is_deafened: false,
                  is_speaking: false
                }
              ],
              active: true
            });
          }
        });
      }

      // Process parties
      if (partiesData) {
        partiesData.forEach((party: any) => {
          if (party.party_members && party.party_members.length > 0) {
            channels.push({
              id: party.id,
              name: `${party.game_name} Party`,
              type: 'party',
              participants: party.party_members
                .filter((m: any) => m.profiles)
                .map((m: any) => ({
                  id: m.profiles.id,
                  username: m.profiles.username,
                  avatar_url: m.profiles.avatar_url,
                  is_muted: false,
                  is_deafened: false,
                  is_speaking: false
                })),
              active: true
            });
          }
        });
      }

      setVoiceChannels(channels);

      // Check if user is in any channel
      const userInChannel = channels.find(c => 
        c.participants.some(p => p.id === profile.id)
      );
      setMyActiveChannel(userInChannel?.id || null);

    } catch (error) {
      console.error('Error fetching voice channels:', error);
    }
  };

  const joinChannel = (channelId: string, type: string) => {
    if (type === 'call') {
      onNavigate?.('chat');
    } else if (type === 'party') {
      onNavigate?.('party-finder');
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Voice Activity</h2>
            <p className="text-xs text-gray-400">
              {voiceChannels.length} active channel{voiceChannels.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {myActiveChannel && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">Connected</span>
          </div>
        )}
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {voiceChannels.length === 0 ? (
          <div className="text-center py-8">
            <Radio className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No active voice channels</p>
            <p className="text-gray-500 text-xs mt-1">Start a call or join a party!</p>
          </div>
        ) : (
          voiceChannels.map((channel) => {
            const isMyChannel = channel.id === myActiveChannel;
            
            return (
              <div
                key={channel.id}
                onClick={() => !isMyChannel && joinChannel(channel.id, channel.type)}
                className={`p-3 rounded-lg border transition-all ${
                  isMyChannel
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-[#0f0f0f] border-[#202225] hover:border-[#8B5CF6] cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {channel.type === 'call' ? (
                      <Phone className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Users className="w-4 h-4 text-purple-400" />
                    )}
                    <h3 className="text-sm font-semibold text-white">
                      {channel.name}
                    </h3>
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {channel.participants.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {channel.participants.slice(0, 4).map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-1.5 bg-[#1a1a1a] px-2 py-1 rounded-md"
                    >
                      {participant.avatar_url ? (
                        <img
                          src={participant.avatar_url}
                          alt={participant.username}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white text-xs">
                          {participant.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-gray-300">
                        {participant.username}
                      </span>
                      {participant.is_muted ? (
                        <MicOff className="w-3 h-3 text-red-400" />
                      ) : participant.is_speaking ? (
                        <Volume2 className="w-3 h-3 text-green-400 animate-pulse" />
                      ) : (
                        <Mic className="w-3 h-3 text-gray-500" />
                      )}
                    </div>
                  ))}
                  {channel.participants.length > 4 && (
                    <div className="flex items-center px-2 py-1 text-xs text-gray-400">
                      +{channel.participants.length - 4} more
                    </div>
                  )}
                </div>

                {!isMyChannel && (
                  <div className="mt-2 pt-2 border-t border-[#202225]">
                    <button className="w-full py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1">
                      <Phone className="w-3 h-3" />
                      Join Voice
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

