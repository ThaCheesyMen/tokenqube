import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Users, Plus, Search, Crown, Shield, User, X, 
  MessageSquare, Settings, UserPlus, Trash2, Gamepad2,
  Lock, Unlock, LogOut, Edit2
} from 'lucide-react';
import { toast } from '../components/Toast';

interface Squad {
  id: string;
  name: string;
  description: string;
  avatar_url?: string;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
  };
  member_count?: number;
  user_role?: string;
}

interface SquadMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    username: string;
    status: string;
  };
}

interface SquadMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  profiles?: {
    username: string;
  };
}

export default function Squads() {
  const { profile } = useAuth();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newSquad, setNewSquad] = useState({
    name: '',
    description: '',
    is_public: true,
  });
  const [friendSearch, setFriendSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    
    fetchSquads();
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    if (selectedSquad) {
      fetchMembers();
      fetchMessages();
      subscribeToMessages();
      subscribeToMembers();
    }
  }, [selectedSquad]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSquads = async () => {
    if (!profile) return;

    try {
      // Get squads user is a member of
      const { data: memberships } = await supabase
        .from('squad_members')
        .select('squad_id, role')
        .eq('user_id', profile.id);

      if (!memberships || memberships.length === 0) {
        setSquads([]);
        return;
      }

      const squadIds = memberships.map(m => m.squad_id);

      const { data: squadsData, error } = await supabase
        .from('squads')
        .select(`
          *,
          profiles:owner_id (username)
        `)
        .in('id', squadIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get member counts
      const squadsWithCounts = await Promise.all(
        (squadsData || []).map(async (squad) => {
          const { count } = await supabase
            .from('squad_members')
            .select('*', { count: 'exact', head: true })
            .eq('squad_id', squad.id);

          const membership = memberships.find(m => m.squad_id === squad.id);
          
          return {
            ...squad,
            member_count: count || 0,
            user_role: membership?.role
          };
        })
      );

      setSquads(squadsWithCounts as Squad[]);
    } catch (error) {
      console.error('Error fetching squads:', error);
      toast.error('Failed to fetch squads');
    }
  };

  const fetchPublicSquads = async () => {
    try {
      const { data } = await supabase
        .from('squads')
        .select(`
          *,
          profiles:owner_id (username)
        `)
        .eq('is_public', true)
        .order('member_count', { ascending: false })
        .limit(20);

      if (data) {
        setSquads(data as Squad[]);
      }
    } catch (error) {
      console.error('Error fetching public squads:', error);
    }
  };

  const fetchMembers = async () => {
    if (!selectedSquad) return;

    try {
      const { data, error } = await supabase
        .from('squad_members')
        .select(`
          *,
          profiles:user_id (id, username, status)
        `)
        .eq('squad_id', selectedSquad.id)
        .order('role', { ascending: false });

      if (error) throw error;
      if (data) setMembers(data as SquadMember[]);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedSquad) return;

    try {
      const { data, error } = await supabase
        .from('squad_messages')
        .select(`
          *,
          profiles:sender_id (username)
        `)
        .eq('squad_id', selectedSquad.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      if (data) setMessages(data as SquadMessage[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedSquad) return;

    const channel = supabase
      .channel(`squad_messages_${selectedSquad.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'squad_messages',
          filter: `squad_id=eq.${selectedSquad.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as SquadMessage;
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', newMsg.sender_id)
            .single();
          
          newMsg.profiles = { username: data?.username || 'Unknown' };
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToMembers = () => {
    if (!selectedSquad) return;

    const channel = supabase
      .channel(`squad_members_${selectedSquad.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squad_members',
          filter: `squad_id=eq.${selectedSquad.id}`,
        },
        () => {
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createSquad = async () => {
    if (!profile || !newSquad.name.trim()) return;

    try {
      const { data: squadId, error } = await supabase.rpc('create_squad_and_add_owner', {
        p_name: newSquad.name.trim(),
        p_description: newSquad.description.trim() || null,
        p_is_public: newSquad.is_public
      });

      if (error) throw error;

      setShowCreateModal(false);
      setNewSquad({ name: '', description: '', is_public: true });
      toast.success('Squad created successfully!');
      
      // Refresh squads
      await fetchSquads();
    } catch (error: any) {
      console.error('Error creating squad:', error);
      toast.error(error.message || 'Failed to create squad');
    }
  };

  const joinSquad = async (squadId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase.rpc('add_squad_member', {
        p_squad_id: squadId,
        p_user_id: profile.id
      });

      if (error) throw error;

      toast.success('Joined squad successfully!');
      fetchSquads();
    } catch (error: any) {
      console.error('Error joining squad:', error);
      toast.error(error.message || 'Failed to join squad');
    }
  };

  const leaveSquad = async () => {
    if (!profile || !selectedSquad) return;

    try {
      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', selectedSquad.id)
        .eq('user_id', profile.id);

      if (error) throw error;

      toast.success('Left squad successfully');
      setSelectedSquad(null);
      fetchSquads();
    } catch (error) {
      console.error('Error leaving squad:', error);
      toast.error('Failed to leave squad');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSquad || !profile) return;

    try {
      const { error } = await supabase
        .from('squad_messages')
        .insert({
          squad_id: selectedSquad.id,
          sender_id: profile.id,
          message: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'admin':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] dark:bg-[#0f0f0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0f0f0f]">
      {/* Squads Sidebar */}
      <div className="w-80 bg-[#1a1a1a] border-r border-[#202225] flex flex-col">
        <div className="p-4 border-b border-[#202225]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Users className="w-6 h-6 mr-2 text-[#8B5CF6]" />
              Squads
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {squads.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No squads yet</p>
              <p className="text-sm">Create your first squad to get started!</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {squads.map((squad) => (
                <button
                  key={squad.id}
                  onClick={() => setSelectedSquad(squad)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedSquad?.id === squad.id
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500'
                      : 'hover:bg-[#0f0f0f] dark:hover:bg-[#1a1a1a] border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                      {squad.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {squad.name}
                        </h3>
                        {!squad.is_public && (
                          <Lock className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {squad.member_count || 0} members
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Squad View */}
      {selectedSquad ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-2xl">
                  {selectedSquad.name[0].toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    {selectedSquad.name}
                    {!selectedSquad.is_public && (
                      <Lock className="w-5 h-5 ml-2 text-gray-400" />
                    )}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedSquad.description || 'No description'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {(selectedSquad.user_role === 'owner' || selectedSquad.user_role === 'admin') && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Invite</span>
                  </button>
                )}
                <button
                  onClick={leaveSquad}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Leave</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex min-h-0">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-emerald-600" />
                  Chat
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isOwnMessage = msg.sender_id === profile?.id;
                  const username = msg.profiles?.username || 'Unknown';

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        isOwnMessage 
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' 
                          : 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                      }`}>
                        {username[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col max-w-lg">
                        {!isOwnMessage && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">{username}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(msg.created_at)}</span>
                          </div>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl ${
                          isOwnMessage
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                            : 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                        }`}>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                        {isOwnMessage && (
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(msg.created_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="border-t border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Members Sidebar */}
            <div className="w-64 bg-[#0f0f0f] dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">Members</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      {member.profiles.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {member.profiles.username}
                        </p>
                        <span className={`${getRoleColor(member.role)}`}>
                          {getRoleIcon(member.role)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users className="w-24 h-24 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Select a Squad
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Choose a squad from the sidebar to start chatting
            </p>
          </div>
        </div>
      )}

      {/* Create Squad Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0f0f0f] rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create Squad</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Squad Name *
                </label>
                <input
                  type="text"
                  value={newSquad.name}
                  onChange={(e) => setNewSquad({ ...newSquad, name: e.target.value })}
                  placeholder="My Awesome Squad"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newSquad.description}
                  onChange={(e) => setNewSquad({ ...newSquad, description: e.target.value })}
                  placeholder="What's this squad about?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newSquad.is_public}
                  onChange={(e) => setNewSquad({ ...newSquad, is_public: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-1">
                  <Unlock className="w-4 h-4" />
                  <span>Public (others can join)</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={createSquad}
                disabled={!newSquad.name.trim()}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Squad
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-[#0f0f0f] dark:hover:bg-[#1a1a1a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
