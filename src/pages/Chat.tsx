import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Hash, Phone, Video, ScreenShare, Settings, Pin, X, Circle, Gamepad2, Search as SearchIcon } from 'lucide-react';
import { toast } from '../components/Toast';
import ChatSidebar from '../components/ChatSidebar';
import RichTextInput from '../components/RichTextInput';
import EnhancedMessage from '../components/EnhancedMessage';
import CallInterface from '../components/CallInterface';
import IncomingCallNotification from '../components/IncomingCallNotification';
import MessageSearch from '../components/MessageSearch';
import { discordSounds } from '../utils/discordSounds';
import { debounce } from '../utils/debounce';
import RoleBadge from '../components/RoleBadge';

interface ChatMessage {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  edited_at?: string;
  reply_to_message_id?: string;
  is_pinned?: boolean;
  attachments?: any[];
  profiles?: {
    username: string;
    avatar_url?: string;
    role?: string;
  };
}

interface DMMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  edited_at?: string;
  reply_to_message_id?: string;
  is_pinned?: boolean;
  attachments?: any[];
  profiles?: {
    username: string;
    avatar_url?: string;
    role?: string;
  };
}

interface ChatProps {
  openDMData?: any;
}

export default function Chat({ openDMData }: ChatProps) {
  const { profile } = useAuth();
  
  // View state
  const [activeView, setActiveView] = useState<'global' | 'dm' | 'party'>('global');
  const [activeDMRoom, setActiveDMRoom] = useState<string | null>(null);
  
  // Messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dmMessages, setDMMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // UI state
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [dmUserStatus, setDmUserStatus] = useState<{
    username: string;
    isOnline: boolean;
    currently_playing?: string;
    currently_playing_platform?: string;
  } | null>(null);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Call state
  const [activeCall, setActiveCall] = useState<{
    roomId: string;
    isVideoCall: boolean;
    otherUserId: string;
    otherUsername: string;
    isCaller: boolean;
  } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callSessionId: string;
    callerId: string;
    callerUsername: string;
    callerAvatar?: string;
    isVideoCall: boolean;
    roomId: string;
  } | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageChannelRef = useRef<any>(null);
  const dmChannelRef = useRef<any>(null);
  const callChannelRef = useRef<any>(null);

  // Global chat now uses global_chat_messages table directly (no need for room init)

  // Handle opening DM from external navigation
  useEffect(() => {
    if (openDMData) {
      setActiveView('dm');
      setActiveDMRoom(openDMData.roomId);
    }
  }, [openDMData]);

  // Fetch messages
  useEffect(() => {
    if (activeView === 'global') {
      fetchGlobalMessages();
      subscribeToGlobalMessages();
      setDmUserStatus(null);
    } else if (activeView === 'dm' && activeDMRoom) {
      fetchDMMessages();
      subscribeToDMMessages();
      fetchDMUserStatus();
    }

    return () => {
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
      }
      if (dmChannelRef.current) {
        supabase.removeChannel(dmChannelRef.current);
      }
    };
  }, [activeView, activeDMRoom]);

  // Subscribe to incoming calls
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('incoming_calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `receiver_id=eq.${profile.id}`,
        },
        async (payload: any) => {
          const callSession = payload.new;
          if (callSession.status !== 'ringing') return;

          // Fetch caller info
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', callSession.caller_id)
            .single();

          if (callerProfile) {
            setIncomingCall({
              callSessionId: callSession.id,
              callerId: callSession.caller_id,
              callerUsername: callerProfile.username,
              callerAvatar: callerProfile.avatar_url,
              isVideoCall: callSession.call_type === 'video',
              roomId: callSession.room_id,
            });
          }
        }
      )
      .subscribe();

    callChannelRef.current = channel;

    return () => {
      if (callChannelRef.current) {
        supabase.removeChannel(callChannelRef.current);
      }
    };
  }, [profile]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, dmMessages]);

  const fetchGlobalMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('global_chat_messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          room_id,
          profiles (username, avatar_url, role)
        `)
        .eq('room_id', 'global')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      if (data) {
        // Map to ChatMessage format
        const mappedMessages = data.map((msg: any) => ({
          id: msg.id,
          message: msg.content,
          user_id: msg.sender_id,
          created_at: msg.created_at,
          profiles: Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles,
        }));

        setMessages(mappedMessages as ChatMessage[]);
      }
    } catch (error) {
      console.error('Error in fetchGlobalMessages:', error);
    }
  };

  const fetchDMMessages = async () => {
    if (!activeDMRoom) return;

    try {
      // Efficient join query - fetch profiles in one go
      const { data, error } = await supabase
        .from('dm_messages')
        .select(`
          *,
          profiles:sender_id (
            username,
            avatar_url,
            role
          )
        `)
        .eq('room_id', activeDMRoom)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching DM messages:', error);
        toast.error('Failed to load messages');
        return;
      }

      if (data) {
        setDMMessages(data as DMMessage[]);
      }
    } catch (error) {
      console.error('Error in fetchDMMessages:', error);
      toast.error('Failed to load messages');
    }
  };

  const subscribeToGlobalMessages = () => {
    const channel = supabase
      .channel('global_chat_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_chat_messages',
        },
        async (payload) => {
          // Fetch the full message with profile data
          const { data } = await supabase
            .from('global_chat_messages')
            .select(`
              id,
              content,
              created_at,
              sender_id,
              room_id,
              profiles (username, avatar_url, role)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            // Map to ChatMessage format
            const mappedMessage = {
              id: data.id,
              message: data.content,
              user_id: data.sender_id,
              created_at: data.created_at,
              profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
            };

            setMessages((prev) => [...prev, mappedMessage as ChatMessage]);

            // Play sound if not own message
            if (data.sender_id !== profile?.id) {
              await discordSounds.playNotification();
            }
          }
        }
      )
      .subscribe();

    messageChannelRef.current = channel;
  };

  const subscribeToDMMessages = () => {
    if (!activeDMRoom) return;

    const channel = supabase
      .channel(`dm_messages_${activeDMRoom}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `room_id=eq.${activeDMRoom}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('profiles')
            .select('username, avatar_url, role')
            .eq('id', payload.new.sender_id)
            .single();

          setDMMessages((prev) => [
            ...prev,
            { ...payload.new, profiles: data } as DMMessage,
          ]);

          // Play sound if not own message
          if (payload.new.sender_id !== profile?.id) {
            await discordSounds.playNotification();
          }
        }
      )
      .subscribe();

    dmChannelRef.current = channel;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !profile) return;

    const messageData: any = {
      message: newMessage.trim(),
    };

    if (replyingTo) {
      messageData.reply_to_message_id = replyingTo.id;
    }

    try {
      if (activeView === 'global') {
        // Use global_chat_messages table with new schema
        const globalMessageData = {
          content: newMessage.trim(),
          sender_id: profile.id,
          room_id: 'global',
        };
        
        const { error } = await supabase.from('global_chat_messages').insert(globalMessageData);
        
        if (error) {
          console.error('Error sending global message:', error);
          toast.error('Failed to send message');
          return;
        }
      } else if (activeView === 'dm' && activeDMRoom) {
        messageData.room_id = activeDMRoom;
        messageData.sender_id = profile.id;
        
        const { error } = await supabase.from('dm_messages').insert(messageData);
        
        if (error) {
          console.error('Error sending DM:', error);
          toast.error('Failed to send message');
          return;
        }
      }

      setNewMessage('');
      setReplyingTo(null);
      await discordSounds.playMessageSent();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    const table = activeView === 'dm' ? 'dm_messages' : 'global_chat_messages';
    const updateField = activeView === 'dm' ? 'message' : 'content';
    
    const { error } = await supabase
      .from(table)
      .update({ [updateField]: newContent })
      .eq('id', messageId);

    if (error) {
      toast.error('Failed to edit message');
    } else {
      toast.success('Message updated');
      // Refresh messages
      if (activeView === 'global') {
        fetchGlobalMessages();
      } else {
        fetchDMMessages();
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const table = activeView === 'dm' ? 'dm_messages' : 'global_chat_messages';
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', messageId);

    if (error) {
      toast.error('Failed to delete message');
    } else {
      toast.success('Message deleted');
      // Refresh messages
      if (activeView === 'global') {
        fetchGlobalMessages();
      } else {
        fetchDMMessages();
      }
    }
  };

  const handleReplyToMessage = (messageId: string, username: string, message: string) => {
    setReplyingTo({ id: messageId, username, message });
  };

  const initiateCall = async (isVideoCall: boolean) => {
    if (activeView !== 'dm' || !activeDMRoom || !profile) {
      toast.error('Calls are only available in direct messages');
      return;
    }

    try {
      // Get the other user's ID from the DM room
      const { data: roomData } = await supabase
        .from('dm_rooms')
        .select('user1_id, user2_id, user1:user1_id(username, avatar_url), user2:user2_id(username, avatar_url)')
        .eq('id', activeDMRoom)
        .single();

      if (!roomData) {
        toast.error('Could not find chat room');
        return;
      }

      const otherUserId = roomData.user1_id === profile.id ? roomData.user2_id : roomData.user1_id;
      const otherUser = roomData.user1_id === profile.id ? roomData.user2 : roomData.user1;

      // Clear any old call signals for this room
      await supabase
        .from('call_signals')
        .delete()
        .eq('room_id', activeDMRoom);

      // Create call session
      const { data: callSession, error } = await supabase
        .from('call_sessions')
        .insert({
          room_id: activeDMRoom,
          caller_id: profile.id,
          receiver_id: otherUserId,
          call_type: isVideoCall ? 'video' : 'voice',
          status: 'ringing',
        })
        .select()
        .single();

      if (error || !callSession) {
        toast.error('Failed to initiate call');
        return;
      }

      // Play outgoing call sound
      await discordSounds.playOutgoingCall();

      // Set active call
      setActiveCall({
        roomId: activeDMRoom,
        isVideoCall,
        otherUserId,
        otherUsername: (otherUser as any).username,
        isCaller: true, // This user initiated the call
      });

      toast.success(`${isVideoCall ? 'Video' : 'Voice'} call started`);
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Failed to start call');
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !profile) return;

    console.log('Accepting call:', incomingCall);

    try {
      // Stop incoming call ringtone
      discordSounds.stopIncomingCall();

      // Update call session status
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({
          status: 'active',
          answered_at: new Date().toISOString(),
        })
        .eq('id', incomingCall.callSessionId);

      if (updateError) {
        console.error('Error updating call session:', updateError);
        toast.error('Failed to accept call');
        return;
      }

      console.log('Call session updated to active');

      // Start the call
      setActiveCall({
        roomId: incomingCall.roomId,
        isVideoCall: incomingCall.isVideoCall,
        otherUserId: incomingCall.callerId,
        otherUsername: incomingCall.callerUsername,
        isCaller: false, // This user is receiving the call
      });

      // Clear incoming call notification
      setIncomingCall(null);

      console.log('Call accepted, interface should show');
      toast.success('Call connected');
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
      discordSounds.stopIncomingCall();
    }
  };

  const declineCall = async () => {
    if (!incomingCall) return;

    try {
      // Update call session status
      await supabase
        .from('call_sessions')
        .update({
          status: 'declined',
          ended_at: new Date().toISOString(),
        })
        .eq('id', incomingCall.callSessionId);

      setIncomingCall(null);
      discordSounds.stopIncomingCall();
      toast.info('Call declined');
    } catch (error) {
      console.error('Error declining call:', error);
    }
  };

  const endCall = async () => {
    if (!activeCall) return;

    try {
      // Update call session status
      await supabase
        .from('call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('room_id', activeCall.roomId)
        .eq('status', 'active');

      setActiveCall(null);
      setIsCallMinimized(false);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const fetchDMUserStatus = async () => {
    if (!profile || !activeDMRoom) return;

    try {
      // Get the DM room to find the other user
      const { data: roomData } = await supabase
        .from('dm_rooms')
        .select('user1_id, user2_id')
        .eq('id', activeDMRoom)
        .single();

      if (!roomData) return;

      const otherUserId = roomData.user1_id === profile.id ? roomData.user2_id : roomData.user1_id;

      // Get the other user's status
      const { data: userData } = await supabase
        .from('profiles')
        .select('username, last_heartbeat, currently_playing, currently_playing_platform')
        .eq('id', otherUserId)
        .single();

      if (userData) {
        const isOnline = userData.last_heartbeat && 
          new Date(userData.last_heartbeat) >= new Date(Date.now() - 2 * 60 * 1000);

        setDmUserStatus({
          username: userData.username,
          isOnline,
          currently_playing: userData.currently_playing,
          currently_playing_platform: userData.currently_playing_platform,
        });
      }
    } catch (error) {
      console.error('Error fetching DM user status:', error);
    }
  };


  // Group messages by user and time (Discord-style)
  const groupedMessages = useMemo(() => {
    const current = activeView === 'dm' ? dmMessages : messages;
    return current.map((msg, i) => {
      const prev = current[i - 1];
      const userId = activeView === 'dm' ? (msg as DMMessage).sender_id : (msg as ChatMessage).user_id;
      const prevUserId = prev ? (activeView === 'dm' ? (prev as DMMessage).sender_id : (prev as ChatMessage).user_id) : null;
      
      const timeDiff = prev ? new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() : Infinity;
      const shouldGroup = prev && userId === prevUserId && timeDiff < 60000; // Group if within 1 minute
      
      return { ...msg, grouped: shouldGroup };
    });
  }, [messages, dmMessages, activeView]);

  // Typing indicator handler with debounce
  const handleTyping = useMemo(() => debounce(() => {
    if (activeView !== 'dm' || !activeDMRoom || !profile) return;
    
    setIsTyping(true);
    
    // Update typing status in database
    supabase.from('dm_typing_indicators').upsert({
      room_id: activeDMRoom,
      user_id: profile.id,
      is_typing: true,
      updated_at: new Date().toISOString()
    });
    
    // Clear typing after 3 seconds
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      supabase.from('dm_typing_indicators')
        .delete()
        .eq('room_id', activeDMRoom)
        .eq('user_id', profile.id);
    }, 3000);
  }, 500), [activeView, activeDMRoom, profile]);

  const channelName = activeView === 'dm' ? (dmUserStatus?.username || 'Direct Message') : 'global-chat';

  // Subscribe to typing indicators for DMs
  useEffect(() => {
    if (activeView !== 'dm' || !activeDMRoom || !profile) return;

    const channel = supabase
      .channel(`typing_${activeDMRoom}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dm_typing_indicators',
        filter: `room_id=eq.${activeDMRoom}`
      }, (payload) => {
        if (payload.new && (payload.new as any).user_id !== profile.id) {
          setOtherUserTyping((payload.new as any).is_typing);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeView, activeDMRoom, profile]);

  return (
    <div className="flex h-screen bg-[#0f0f0f]">
      {/* Sidebar */}
      <ChatSidebar
        activeView={activeView}
        activeDMRoom={activeDMRoom}
        onViewChange={setActiveView}
        onDMSelect={setActiveDMRoom}
        onCreateParty={() => {/* TODO: Implement party creation modal */}}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 bg-[#0f0f0f] border-b border-[#202225] flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {activeView === 'dm' && dmUserStatus ? (
              <>
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white font-semibold text-sm">
                    {dmUserStatus.username[0].toUpperCase()}
                  </div>
                  <Circle
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0f0f0f] ${
                      dmUserStatus.isOnline
                        ? 'fill-green-500 text-green-500'
                        : 'fill-gray-500 text-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <h2 className="text-white font-semibold">{dmUserStatus.username}</h2>
                  {dmUserStatus.currently_playing ? (
                    <div className="flex items-center gap-1 text-xs text-[#8B5CF6]">
                      <Gamepad2 className="w-3 h-3" />
                      <span>{dmUserStatus.currently_playing}</span>
                      {dmUserStatus.currently_playing_platform && (
                        <span className="text-gray-500">({dmUserStatus.currently_playing_platform})</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">
                      {dmUserStatus.isOnline ? 'Online' : 'Offline'}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Hash className="w-5 h-5 text-gray-400" />
                <h2 className="text-white font-semibold">{channelName}</h2>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMessageSearch(!showMessageSearch)}
              className="p-2 hover:bg-[#1a1a1a] rounded transition hover:text-white"
              title="Search Messages"
            >
              <SearchIcon className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => initiateCall(false)}
              className="p-2 hover:bg-[#1a1a1a] rounded transition hover:text-white disabled:opacity-50"
              title="Voice Call"
              disabled={activeView !== 'dm' || !!activeCall}
            >
              <Phone className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => initiateCall(true)}
              className="p-2 hover:bg-[#1a1a1a] rounded transition hover:text-white disabled:opacity-50"
              title="Video Call"
              disabled={activeView !== 'dm' || !!activeCall}
            >
              <Video className="w-5 h-5 text-gray-400" />
            </button>
            <button
              className="p-2 hover:bg-[#1a1a1a] rounded transition disabled:opacity-50"
              title="Screen Share (Available in call)"
              disabled
            >
              <ScreenShare className="w-5 h-5 text-gray-400" />
            </button>
            <button
              className="p-2 hover:bg-[#1a1a1a] rounded transition"
              title="Pinned Messages"
            >
              <Pin className="w-5 h-5 text-gray-400" />
            </button>
            <button
              className="p-2 hover:bg-[#1a1a1a] rounded transition"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
          {groupedMessages.length > 0 ? (
            groupedMessages.map((msg) => {
              const isOwnMessage = activeView === 'dm' 
                ? (msg as DMMessage).sender_id === profile?.id
                : (msg as ChatMessage).user_id === profile?.id;
              
              const username = msg.profiles?.username || 'Unknown';
              const avatarUrl = (msg.profiles as any)?.avatar_url || '';
              const userRole = msg.profiles?.role;

              return (
                <EnhancedMessage
                  key={msg.id}
                  id={msg.id}
                  message={msg.message}
                  username={username}
                  avatar={avatarUrl}
                  timestamp={msg.created_at}
                  isOwnMessage={isOwnMessage}
                  showAvatar={!(msg as any).grouped}
                  showUsername={!(msg as any).grouped}
                  messageType={activeView === 'dm' ? 'dm' : 'global'}
                  roomId={activeDMRoom || undefined}
                  editedAt={msg.edited_at}
                  isPinned={msg.is_pinned}
                  attachments={msg.attachments || []}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  onReply={handleReplyToMessage}
                  userRole={userRole}
                />
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Hash className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-semibold">Welcome to #{channelName}</p>
              <p className="text-sm">This is the beginning of your conversation</p>
            </div>
          )}
          
          {/* Typing Indicator */}
          {otherUserTyping && activeView === 'dm' && (
            <div className="flex items-center gap-2 px-4 py-2 text-gray-400 text-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>{dmUserStatus?.username} is typing...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Indicator */}
        {replyingTo && (
          <div className="px-4 py-2 bg-[#1a1a1a] border-t border-[#202225] flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Replying to <span className="text-white font-semibold">{replyingTo.username}</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-[#1a1a1a] rounded transition"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-[#0f0f0f]">
          <RichTextInput
            value={newMessage}
            onChange={(value) => {
              setNewMessage(value);
              handleTyping();
            }}
            onSend={handleSendMessage}
            placeholder={`Message #${channelName}`}
          />
        </div>
      </div>

      {/* Incoming Call Notification */}
      {incomingCall && (
        <IncomingCallNotification
          callerUsername={incomingCall.callerUsername}
          callerAvatar={incomingCall.callerAvatar}
          isVideoCall={incomingCall.isVideoCall}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {/* Active Call Interface */}
      {activeCall && (
        <CallInterface
          roomId={activeCall.roomId}
          isVideoCall={activeCall.isVideoCall}
          otherUserId={activeCall.otherUserId}
          otherUsername={activeCall.otherUsername}
          isCaller={activeCall.isCaller}
          onEndCall={endCall}
          isMinimized={isCallMinimized}
          onToggleMinimize={() => setIsCallMinimized(!isCallMinimized)}
        />
      )}

      {/* Message Search */}
      {showMessageSearch && (
        <MessageSearch
          isOpen={showMessageSearch}
          onClose={() => setShowMessageSearch(false)}
          channelType={activeView as 'global' | 'dm'}
          channelId={activeView === 'dm' ? activeDMRoom || undefined : undefined}
          onMessageClick={(messageId) => {
            // Scroll to message (implement highlight logic if needed)
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement) {
              messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              messageElement.classList.add('bg-yellow-500/20');
              setTimeout(() => {
                messageElement.classList.remove('bg-yellow-500/20');
              }, 2000);
            }
          }}
        />
      )}
    </div>
  );
}

