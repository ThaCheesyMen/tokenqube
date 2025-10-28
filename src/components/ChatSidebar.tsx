import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useVoiceChat } from '../contexts/VoiceChatContext';
import { supabase } from '../lib/supabase';
import { 
  Hash, Search, Plus, Circle, Phone, Video, 
  Users, Gamepad2, Crown, Mic, MessageCircle
} from 'lucide-react';
import CreatePartyModal from './CreatePartyModal';
import { toast } from './Toast';

interface Friend {
  id: string;
  username: string;
  status: 'online' | 'offline' | 'in-game';
  last_heartbeat?: string;
  current_game?: string;
  currently_playing?: string;
  currently_playing_platform?: string;
}

interface DMRoom {
  id: string;
  other_user_id: string;
  other_username: string;
  last_message?: string;
  unread_count?: number;
}

interface Party {
  id: string;
  game_name: string;
  party_size: number;
  max_size: number;
  is_voice_enabled: boolean;
  leader_id: string;
  leader_username?: string;
}

interface ChatSidebarProps {
  activeView: 'global' | 'dm' | 'party';
  activeDMRoom: string | null;
  onViewChange: (view: 'global' | 'dm' | 'party') => void;
  onDMSelect: (roomId: string | null) => void;
  onCreateParty?: () => void;
}

export default function ChatSidebar({
  activeView,
  activeDMRoom,
  onViewChange,
  onDMSelect,
}: ChatSidebarProps) {
  const { profile } = useAuth();
  const { setActivePartyId, setShowVoiceControls, activePartyId } = useVoiceChat();
  const [activeTab, setActiveTab] = useState<'messages' | 'online' | 'parties'>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [dmRooms, setDMRooms] = useState<DMRoom[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<Friend[]>([]);
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [activeParties, setActiveParties] = useState<Party[]>([]);
  const [showCreateParty, setShowCreateParty] = useState(false);

  useEffect(() => {
    fetchDMRooms();
    fetchOnlineFriends();
    fetchAllFriends();
    fetchActiveParties();

    // Subscribe to real-time updates
    const partyChannel = supabase
      .channel('parties_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parties' },
        () => fetchActiveParties()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(partyChannel);
    };
  }, []);

  const fetchDMRooms = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('dm_rooms')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`);

      if (error) {
        console.error('Error fetching DM rooms:', error);
        return;
      }

      if (data) {
        // Filter out rooms where user is chatting with themselves
        const validRooms = data.filter((room: any) => room.user1_id !== room.user2_id);

        // Fetch usernames separately
        const roomsData = await Promise.all(
          validRooms.map(async (room: any) => {
            const isUser1 = room.user1_id === profile.id;
            const otherUserId = isUser1 ? room.user2_id : room.user1_id;
            
            // Skip if somehow the other user is still the same
            if (otherUserId === profile.id) {
              return null;
            }
            
            const { data: otherUserData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', otherUserId)
              .single();

            const dmRoom: DMRoom = {
              id: room.id,
              other_user_id: otherUserId,
              other_username: otherUserData?.username || 'Unknown',
              unread_count: 0,
            };
            return dmRoom;
          })
        );

        // Filter out null values
        const rooms = roomsData.filter((room): room is DMRoom => room !== null);
        setDMRooms(rooms);
      }
    } catch (error) {
      console.error('Error in fetchDMRooms:', error);
    }
  };

  const fetchOnlineFriends = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('friends')
      .select(`
        friend_id,
        profiles!friends_friend_id_fkey(id, username, status, last_heartbeat, currently_playing, currently_playing_platform)
      `)
      .eq('user_id', profile.id)
      .eq('status', 'accepted');

    if (data) {
      const friends: Friend[] = data
        .map((f: any) => ({
          id: f.friend_id,
          username: f.profiles?.username || 'Unknown',
          status: f.profiles?.status || 'offline',
          last_heartbeat: f.profiles?.last_heartbeat,
          currently_playing: f.profiles?.currently_playing,
          currently_playing_platform: f.profiles?.currently_playing_platform,
        }))
        .filter((friend: Friend) => {
          // Only show truly online friends (heartbeat within last 2 minutes)
          if (!friend.last_heartbeat) return false;
          const lastHeartbeat = new Date(friend.last_heartbeat);
          const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
          return lastHeartbeat >= twoMinutesAgo;
        });

      setOnlineFriends(friends);
    }
  };

  const fetchAllFriends = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('friends')
      .select(`
        friend_id,
        profiles!friends_friend_id_fkey(id, username, status, last_heartbeat, currently_playing, currently_playing_platform, avatar_url)
      `)
      .eq('user_id', profile.id)
      .eq('status', 'accepted');

    if (data) {
      const friends: Friend[] = data
        .map((f: any) => ({
          id: f.friend_id,
          username: f.profiles?.username || 'Unknown',
          status: f.profiles?.status || 'offline',
          last_heartbeat: f.profiles?.last_heartbeat,
          currently_playing: f.profiles?.currently_playing,
          currently_playing_platform: f.profiles?.currently_playing_platform,
        }));

      // Sort by online status (online first)
      friends.sort((a, b) => {
        const aOnline = a.last_heartbeat && new Date(a.last_heartbeat) >= new Date(Date.now() - 2 * 60 * 1000);
        const bOnline = b.last_heartbeat && new Date(b.last_heartbeat) >= new Date(Date.now() - 2 * 60 * 1000);
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        return 0;
      });

      setAllFriends(friends);
    }
  };

  const fetchActiveParties = async () => {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('id, game_name, party_size, current_size, voice_chat_enabled, leader_id, status')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching parties:', error);
        return;
      }

      if (data) {
        // Fetch leader usernames and actual member count
        const parties: Party[] = await Promise.all(
          data.map(async (p: any) => {
            // Get actual member count
            const { count: memberCount } = await supabase
              .from('party_members')
              .select('*', { count: 'exact', head: true })
              .eq('party_id', p.id);

            const { data: leaderData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', p.leader_id)
              .single();

            return {
              id: p.id,
              game_name: p.game_name,
              party_size: memberCount || 0,
              max_size: p.party_size || 4,
              is_voice_enabled: p.voice_chat_enabled || false,
              leader_id: p.leader_id,
              leader_username: leaderData?.username || 'Unknown',
            };
          })
        );

        setActiveParties(parties);
      }
    } catch (error) {
      console.error('Error in fetchActiveParties:', error);
    }
  };

  const startDMWithFriend = async (friendId: string, friendUsername: string) => {
    if (!profile) return;

    try {
      // Check if DM room already exists
      const { data: existingRoom } = await supabase
        .from('dm_rooms')
        .select('id')
        .or(`and(user1_id.eq.${profile.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${profile.id})`)
        .maybeSingle();

      let roomId: string;

      if (existingRoom) {
        roomId = existingRoom.id;
      } else {
        // Create new DM room
        const { data: newRoom, error } = await supabase
          .from('dm_rooms')
          .insert({
            user1_id: profile.id,
            user2_id: friendId,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error creating DM room:', error);
          toast.error('Failed to start chat');
          return;
        }

        roomId = newRoom.id;
      }

      // Switch to DM view
      onViewChange('dm');
      onDMSelect(roomId);
      
      // Refresh DM rooms list
      await fetchDMRooms();
      
      // Switch to messages tab to show the new chat
      setActiveTab('messages');

      toast.success(`Chat started with ${friendUsername}`);
    } catch (error) {
      console.error('Error starting DM:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleJoinParty = async (partyId: string) => {
    if (!profile) return;

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('party_members')
        .select('id')
        .eq('party_id', partyId)
        .eq('user_id', profile.id)
        .single();

      if (existingMember) {
        // Already a member, just join voice
        setActivePartyId(partyId);
        setShowVoiceControls(true);
        toast.success('Joined party voice chat!');
        return;
      }

      // Not a member yet, add them
      const { error } = await supabase
        .from('party_members')
        .insert({
          party_id: partyId,
          user_id: profile.id,
          role: 'member',
        });

      if (error) throw error;

      // Join voice chat
      setActivePartyId(partyId);
      setShowVoiceControls(true);
      toast.success('Joined party successfully!');
      fetchActiveParties();
    } catch (error: any) {
      console.error('Error joining party:', error);
      toast.error('Failed to join party');
    }
  };

  const filteredDMRooms = dmRooms.filter((room) =>
    room.other_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllFriends = allFriends.filter((friend) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredParties = activeParties.filter((party) =>
    party.game_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-60 bg-[#1a1a1a] flex flex-col border-r border-[#202225]">
      {/* Search Bar */}
      <div className="p-2 border-b border-[#202225]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Find conversation"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#202225] text-white text-sm rounded border-none focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#202225]">
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex-1 py-2 text-xs font-semibold transition ${
            activeTab === 'messages'
              ? 'text-white border-b-2 border-[#8B5CF6]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Messages
        </button>
        <button
          onClick={() => setActiveTab('online')}
          className={`flex-1 py-2 text-xs font-semibold transition ${
            activeTab === 'online'
              ? 'text-white border-b-2 border-[#8B5CF6]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Friends
        </button>
        <button
          onClick={() => setActiveTab('parties')}
          className={`flex-1 py-2 text-xs font-semibold transition ${
            activeTab === 'parties'
              ? 'text-white border-b-2 border-[#8B5CF6]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Parties
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div>
            {/* Global Chat */}
            <button
              onClick={() => {
                onViewChange('global');
                onDMSelect(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-[#0f0f0f] transition ${
                activeView === 'global' ? 'bg-[#0f0f0f]' : ''
              }`}
            >
              <Hash className="w-5 h-5 text-gray-400" />
              <span className="text-white text-sm font-medium">global-chat</span>
            </button>

            {/* DM Rooms */}
            <div className="mt-2">
              <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">
                Direct Messages
              </div>
              {filteredDMRooms.length > 0 ? (
                filteredDMRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => {
                      onViewChange('dm');
                      onDMSelect(room.id);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-[#0f0f0f] transition ${
                      activeDMRoom === room.id ? 'bg-[#0f0f0f]' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white font-semibold text-sm">
                      {room.other_username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-white text-sm font-medium">
                        {room.other_username}
                      </div>
                      {room.last_message && (
                        <div className="text-gray-400 text-xs truncate">
                          {room.last_message}
                        </div>
                      )}
                    </div>
                    {room.unread_count && room.unread_count > 0 && (
                      <div className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {room.unread_count}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-gray-400 text-xs">
                  No conversations yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'online' && (
          <div className="p-2">
            {filteredAllFriends.length > 0 ? (
              filteredAllFriends.map((friend) => {
                const isOnline = friend.last_heartbeat && 
                  new Date(friend.last_heartbeat) >= new Date(Date.now() - 2 * 60 * 1000);
                
                return (
                  <div
                    key={friend.id}
                    className="flex items-center gap-2 px-2 py-2 hover:bg-[#0f0f0f] rounded transition cursor-pointer"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white font-semibold text-sm">
                        {friend.username[0].toUpperCase()}
                      </div>
                      <Circle
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1a1a] ${
                          isOnline
                            ? 'fill-green-500 text-green-500'
                            : 'fill-gray-500 text-gray-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        {friend.username}
                      </div>
                      {isOnline ? (
                        friend.currently_playing ? (
                          <div className="text-[#8B5CF6] text-xs flex items-center gap-1 truncate">
                            <Gamepad2 className="w-3 h-3 flex-shrink-0" />
                            <span className="font-medium truncate">{friend.currently_playing}</span>
                          </div>
                        ) : (
                          <div className="text-green-400 text-xs">Online</div>
                        )
                      ) : (
                        <div className="text-gray-500 text-xs">Offline</div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => startDMWithFriend(friend.id, friend.username)}
                        className="p-1.5 hover:bg-[#8B5CF6] hover:text-white rounded transition group"
                        title="Message"
                      >
                        <MessageCircle className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      </button>
                      <button
                        onClick={() => startDMWithFriend(friend.id, friend.username)}
                        className="p-1.5 hover:bg-green-600 hover:text-white rounded transition group"
                        title="Voice Call"
                      >
                        <Phone className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      </button>
                      <button
                        onClick={() => startDMWithFriend(friend.id, friend.username)}
                        className="p-1.5 hover:bg-[#8B5CF6] hover:text-white rounded transition group"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-400 text-xs py-8">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No friends yet</p>
                <p className="text-xs mt-1">Add friends to see them here</p>
              </div>
            )}
          </div>
        )}

        {/* Parties Tab */}
        {activeTab === 'parties' && (
          <div className="p-2">
            <button
              onClick={() => setShowCreateParty(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded transition mb-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Create Party</span>
            </button>

            {filteredParties.length > 0 ? (
              filteredParties.map((party) => (
                <div
                  key={party.id}
                  className="bg-[#0f0f0f] rounded p-3 mb-2 hover:bg-[#1a1a1a] transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-white text-sm font-semibold mb-1">
                        {party.game_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Users className="w-3 h-3" />
                        <span>
                          {party.party_size}/{party.max_size}
                        </span>
                        {party.is_voice_enabled && (
                          <>
                            <Mic className="w-3 h-3 ml-1" />
                            <span>Voice</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Crown className="w-3 h-3" />
                      <span>{party.leader_username}</span>
                    </div>
                    {activePartyId === party.id ? (
                      <div className="px-3 py-1 bg-green-600 text-white text-xs rounded flex items-center gap-1">
                        <Circle className="w-2 h-2 fill-white" />
                        Active
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoinParty(party.id)}
                        className="px-3 py-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs rounded transition"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 text-xs py-4">
                No active parties
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Party Modal */}
      {showCreateParty && (
        <CreatePartyModal
          onClose={() => setShowCreateParty(false)}
          onPartyCreated={() => {
            fetchActiveParties();
            setActiveTab('parties');
          }}
        />
      )}
    </div>
  );
}
