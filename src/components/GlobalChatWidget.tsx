import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from './Toast';
import RoleBadge from './RoleBadge';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  profiles: {
    username: string;
    avatar_url?: string;
    role?: string;
  };
}

interface TypingUser {
  user_id: string;
  username: string;
  timestamp: number;
}

export default function GlobalChatWidget() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!profile) return;

    fetchMessages();
    subscribeToMessages();
    subscribeToTyping();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [profile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('global_chat_messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        profiles (username, avatar_url, role)
      `)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) {
      setMessages(data as Message[]);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('global_chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_chat_messages'
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
              profiles (username, avatar_url, role)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, data as Message]);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const subscribeToTyping = () => {
    const typingChannel = supabase
      .channel('global_chat_typing')
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id === profile?.id) return; // Ignore own typing

        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.user_id !== payload.user_id);
          if (payload.is_typing) {
            return [...filtered, {
              user_id: payload.user_id,
              username: payload.username,
              timestamp: Date.now()
            }];
          }
          return filtered;
        });

        // Auto-remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => 
            prev.filter(u => u.user_id !== payload.user_id || Date.now() - u.timestamp < 3000)
          );
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
    };
  };

  const broadcastTyping = (isTypingNow: boolean) => {
    supabase.channel('global_chat_typing').send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: profile?.id,
        username: profile?.username,
        is_typing: isTypingNow
      }
    });
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      broadcastTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      broadcastTyping(false);
    }, 1000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsTyping(false);
    broadcastTyping(false);

    const { error } = await supabase
      .from('global_chat_messages')
      .insert({
        content: messageContent,
        sender_id: profile.id,
        room_id: 'global' // Global chat room
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const scrollToBottom = () => {
    // Only scroll within the chat container, not the entire page
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-2xl shadow-xl border border-[#202225] flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-[#202225] bg-[#1a1a1a]/50 backdrop-blur-sm rounded-t-2xl">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#8B5CF6]" />
          <h3 className="font-bold text-white">Global Chat</h3>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-[#8B5CF6] scrollbar-track-[#202225]">
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === profile?.id;
          
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {message.profiles?.avatar_url ? (
                  <img
                    src={message.profiles.avatar_url}
                    alt={message.profiles.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  message.profiles?.username?.charAt(0).toUpperCase() || '?'
                )}
              </div>

              {/* Message */}
              <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-semibold ${isOwnMessage ? 'text-[#8B5CF6]' : 'text-white'}`}>
                    {message.profiles?.username || 'Unknown'}
                  </span>
                  {message.profiles?.role && <RoleBadge role={message.profiles.role} size="sm" />}
                  <span className="text-xs text-gray-500">
                    {new Date(message.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div
                  className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] break-words ${
                    isOwnMessage
                      ? 'bg-[#8B5CF6] text-white rounded-tr-sm'
                      : 'bg-[#1a1a1a] text-gray-100 rounded-tl-sm'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-400 italic">
          {typingUsers.length === 1
            ? `${typingUsers[0].username} is typing...`
            : `${typingUsers.length} people are typing...`}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-[#202225] bg-[#1a1a1a]/50 backdrop-blur-sm rounded-b-2xl">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] border border-[#202225] placeholder-gray-500"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

