import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Search, UserPlus, Users, Check, X, MessageCircle, 
  Gamepad2, Circle, Flag, Phone, Video
} from 'lucide-react';
import { toast } from '../components/Toast';
import { debounce } from '../utils/debounce';
import { formatDistanceToNow } from 'date-fns';
import CreatePartyModal from '../components/CreatePartyModal';
import CallModal from '../components/CallModal';
import { discordSounds } from '../utils/discordSounds';
import ProfileViewModal from '../components/ProfileViewModal';
import FriendGifting from '../components/FriendGifting';

interface Friend {
  id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    status: string;
    last_seen: string;
    last_heartbeat?: string;
    avatar_url?: string;
    currently_playing?: string;
    currently_playing_platform?: string;
    game_started_at?: string;
  };
}

interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  profiles?: {
    id: string;
    username: string;
  };
}

export default function Friends() {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'pending' | 'add' | 'gifting'>('online');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportUserId, setReportUserId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  
  // Call states
  const [activeCall, setActiveCall] = useState<{
    callId: string | null;
    friendId: string;
    friendUsername: string;
    callType: 'voice' | 'video';
    isIncoming: boolean;
  } | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetchFriends();
    fetchFriendRequests();

    // Subscribe to friend updates
    const friendsChannel = supabase
      .channel('friends_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchFriends();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_user_id=eq.${profile.id}`,
        },
        () => {
          fetchFriendRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendsChannel);
    };
  }, [profile]);

  const fetchFriends = async () => {
    if (!profile) return;

    try {
      // Efficient join query - fetch profiles in one go
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          friend_id,
          status,
          created_at,
          profiles:friend_id (
            id,
            username,
            status,
            last_seen,
            last_heartbeat,
            currently_playing,
            currently_playing_platform,
            game_started_at,
            avatar_url
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error fetching friends:', error);
        toast.error('Failed to load friends');
        return;
      }

      if (data) {
        setFriends(data as Friend[]);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Failed to load friends');
    }
  };

  const fetchFriendRequests = async () => {
    if (!profile) return;

    try {
      // Efficient join query
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id,
          from_user_id,
          to_user_id,
          status,
          created_at,
          profiles:from_user_id (
            id,
            username
          )
        `)
        .eq('to_user_id', profile.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching friend requests:', error);
        toast.error('Failed to load friend requests');
        return;
      }

      if (data) {
        setFriendRequests(data as FriendRequest[]);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast.error('Failed to load friend requests');
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, status')
          .ilike('username', `%${query}%`)
          .limit(10);

        if (data) {
          // Filter out current user and existing friends
          const friendIds = friends.map(f => f.friend_id);
          const filtered = data.filter(
            (user: any) => user.id !== profile?.id && !friendIds.includes(user.id)
          );
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      }
    }, 300),
    [friends, profile]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const sendFriendRequest = async (userId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          from_user_id: profile.id,
          to_user_id: userId,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Friend request sent!');
      setSearchResults(searchResults.filter(u => u.id !== userId));
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Friend request already sent');
      } else {
        toast.error('Failed to send friend request');
      }
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    if (!profile) return;

    try {
      // Use the database function to handle acceptance
      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      });

      if (error) throw error;

      await discordSounds.playSuccess();
      toast.success('Friend request accepted!');
      
      // Refresh both lists
      await fetchFriends();
      await fetchFriendRequests();
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      toast.error(error.message || 'Failed to accept friend request');
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      toast.success('Friend request rejected');
      fetchFriendRequests();
    } catch (error) {
      toast.error('Failed to reject friend request');
    }
  };

  const openDMWithFriend = async (friendId: string) => {
    if (!profile) return;

    try {
      // Get or create DM room
      const user1 = profile.id < friendId ? profile.id : friendId;
      const user2 = profile.id < friendId ? friendId : profile.id;

      let { data: room } = await supabase
        .from('dm_rooms')
        .select('id')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .single();

      if (!room) {
        const { data: newRoom } = await supabase
          .from('dm_rooms')
          .insert({ user1_id: user1, user2_id: user2 })
          .select('id')
          .single();

        room = newRoom;
      }

      if (room) {
        // Navigate to chat
        localStorage.setItem('openDM', JSON.stringify({ roomId: room.id }));
        window.dispatchEvent(new Event('navigateToChat'));
        window.location.hash = '#/chat';
      }
    } catch (error) {
      console.error('Error opening DM:', error);
      toast.error('Failed to open chat');
    }
  };

  const reportUser = async () => {
    if (!profile || !reportUserId || !reportReason.trim()) return;

    try {
      await supabase.from('user_reports').insert({
        reporter_id: profile.id,
        reported_id: reportUserId,
        reason: reportReason,
        context: 'friends_list',
      });

      toast.success('User reported. Our team will review this.');
      setShowReportModal(false);
      setReportUserId(null);
      setReportReason('');
    } catch (error) {
      toast.error('Failed to submit report');
    }
  };

  const startVoiceCall = async (friendId: string, friendUsername: string) => {
    if (!profile) return;
    
    setActiveCall({
      callId: null,
      friendId,
      friendUsername,
      callType: 'voice',
      isIncoming: false,
    });
  };

  const startVideoCall = async (friendId: string, friendUsername: string) => {
    if (!profile) return;
    
    setActiveCall({
      callId: null,
      friendId,
      friendUsername,
      callType: 'video',
      isIncoming: false,
    });
  };

  const getLastSeenText = (lastSeen: string, status: string) => {
    if (status === 'online') return 'Online';
    try {
      return `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`;
    } catch {
      return 'Offline';
    }
  };

  const onlineFriends = friends.filter(f => {
    if (!f.profiles?.last_heartbeat) return false;
    const lastHeartbeat = new Date(f.profiles.last_heartbeat);
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    return lastHeartbeat >= twoMinutesAgo;
  });
  const allFriends = friends;

  const displayedFriends = activeTab === 'online' ? onlineFriends : allFriends;

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Friends</h1>
            <p className="text-gray-400">
              {onlineFriends.length} online • {allFriends.length} total
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b border-[#202225]">
          <button
            onClick={() => setActiveTab('online')}
            className={`px-4 py-3 font-semibold transition ${
              activeTab === 'online'
                ? 'text-white border-b-2 border-[#8B5CF6]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 fill-green-500 text-green-500" />
              Online — {onlineFriends.length}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 font-semibold transition ${
              activeTab === 'all'
                ? 'text-white border-b-2 border-[#8B5CF6]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              All — {allFriends.length}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-3 font-semibold transition ${
              activeTab === 'pending'
                ? 'text-white border-b-2 border-[#8B5CF6]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Pending — {friendRequests.length}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-3 font-semibold transition ${
              activeTab === 'add'
                ? 'text-white border-b-2 border-[#8B5CF6]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add Friend
            </div>
          </button>
          <button
            onClick={() => setActiveTab('gifting')}
            className={`px-4 py-3 font-semibold transition ${
              activeTab === 'gifting'
                ? 'text-white border-b-2 border-pink-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              🎁 Gifting
            </div>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'add' && (
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Add Friend</h2>
            <p className="text-gray-400 mb-4">
              You can add friends by searching for their username.
            </p>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-3 bg-[#202225] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg hover:bg-[#1a1a1a] transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white font-semibold">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{user.username}</div>
                        <div className="text-sm text-gray-400">{user.status}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(user.id)}
                      className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg transition"
                    >
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="space-y-3">
            {friendRequests.length === 0 ? (
              <div className="bg-[#1a1a1a] rounded-lg p-12 text-center">
                <UserPlus className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No pending friend requests</p>
              </div>
            ) : (
              friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg hover:bg-[#0f0f0f] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white font-semibold text-lg">
                      {request.profiles?.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        {request.profiles?.username}
                      </div>
                      <div className="text-sm text-gray-400">Incoming Friend Request</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptFriendRequest(request.id)}
                      className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition"
                      title="Accept"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => rejectFriendRequest(request.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition"
                      title="Reject"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {(activeTab === 'online' || activeTab === 'all') && (
          <div className="space-y-2">
            {displayedFriends.length === 0 ? (
              <div className="bg-[#1a1a1a] rounded-lg p-12 text-center">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  {activeTab === 'online'
                    ? 'No friends online'
                    : 'No friends yet. Add some friends to get started!'}
                </p>
              </div>
            ) : (
              displayedFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg hover:bg-[#0f0f0f] transition group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      className="relative cursor-pointer"
                      onClick={() => setViewingProfileId(friend.friend_id)}
                    >
                      <div className="w-12 h-12 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white font-semibold text-lg overflow-hidden">
                        {friend.profiles?.avatar_url ? (
                          <img src={friend.profiles.avatar_url} alt={friend.profiles.username} className="w-full h-full object-cover" />
                        ) : (
                          friend.profiles?.username[0].toUpperCase()
                        )}
                      </div>
                      <Circle
                        className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#1a1a1a] ${
                          friend.profiles?.last_heartbeat && 
                          new Date(friend.profiles.last_heartbeat) >= new Date(Date.now() - 2 * 60 * 1000)
                            ? 'fill-green-500 text-green-500'
                            : 'fill-gray-500 text-gray-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">
                        {friend.profiles?.username}
                      </div>
                      <div className="text-sm text-gray-400">
                        {friend.profiles?.currently_playing ? (
                          <div className="flex items-center gap-1.5 text-[#8B5CF6]">
                            <Gamepad2 className="w-3.5 h-3.5" />
                            <span>Playing <span className="font-semibold">{friend.profiles.currently_playing}</span></span>
                            {friend.profiles.currently_playing_platform && (
                              <span className="text-xs text-gray-500">({friend.profiles.currently_playing_platform})</span>
                            )}
                          </div>
                        ) : (
                          getLastSeenText(friend.profiles?.last_seen, friend.profiles?.status)
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openDMWithFriend(friend.friend_id)}
                      className="p-2 bg-[#1a1a1a] hover:bg-[#7C3AED] text-white rounded-full transition"
                      title="Message"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => startVoiceCall(friend.friend_id, friend.profiles.username)}
                      className="p-2 bg-[#1a1a1a] hover:bg-green-600 text-white rounded-full transition"
                      title="Voice Call"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => startVideoCall(friend.friend_id, friend.profiles.username)}
                      className="p-2 bg-[#1a1a1a] hover:bg-blue-600 text-white rounded-full transition"
                      title="Video Call"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowCreateParty(true)}
                      className="p-2 bg-[#1a1a1a] hover:bg-[#8B5CF6] text-white rounded-full transition"
                      title="Create Party"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setReportUserId(friend.friend_id);
                        setShowReportModal(true);
                      }}
                      className="p-2 bg-[#1a1a1a] hover:bg-red-600 text-white rounded-full transition"
                      title="Report User"
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'gifting' && (
          <FriendGifting />
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Report User</h3>
            <p className="text-gray-400 mb-4">
              Please describe why you're reporting this user. Our moderation team will review this report.
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Reason for report..."
              className="w-full p-3 bg-[#1a1a1a] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none mb-4"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={reportUser}
                disabled={!reportReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                Submit Report
              </button>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportUserId(null);
                  setReportReason('');
                }}
                className="flex-1 px-4 py-2 bg-[#1a1a1a] hover:bg-[#7C3AED] text-white rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Party Modal */}
      {showCreateParty && (
        <CreatePartyModal
          onClose={() => setShowCreateParty(false)}
          onPartyCreated={() => {
            // TODO: Invite the friend to the party
            toast.success('Party created! Invite your friend to join.');
          }}
        />
      )}

      {/* Call Modal */}
      {activeCall && (
        <CallModal
          callId={activeCall.callId}
          friendId={activeCall.friendId}
          friendUsername={activeCall.friendUsername}
          callType={activeCall.callType}
          isIncoming={activeCall.isIncoming}
          onClose={() => setActiveCall(null)}
        />
      )}

      {/* Profile View Modal */}
      {viewingProfileId && (
        <ProfileViewModal 
          userId={viewingProfileId} 
          onClose={() => setViewingProfileId(null)} 
        />
      )}
    </div>
  );
}

