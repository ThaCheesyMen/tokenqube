import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Search, Users, Plus, Play, Mic, MicOff, Crown, UserPlus, 
  Trash2, Gamepad2, Clock, Filter 
} from 'lucide-react';

interface Party {
  id: string;
  leader_id: string;
  game_name: string;
  game_id?: string;
  platform: string;
  party_size: number;
  current_size: number;
  description?: string;
  voice_chat_enabled: boolean;
  min_level?: number;
  language?: string;
  status: string;
  created_at: string;
  expires_at?: string;
  profiles?: {
    username: string;
  };
  members?: PartyMember[];
}

interface PartyMember {
  id: string;
  party_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    username: string;
  };
}

export default function PartyFinder() {
  const { profile, refreshProfile } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [myParties, setMyParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create party form state
  const [newParty, setNewParty] = useState({
    game_name: '',
    platform: 'steam',
    party_size: 4,
    description: '',
    voice_chat_enabled: true,
    min_level: 0,
  });

  useEffect(() => {
    fetchParties();
    fetchMyParties();
  }, []);

  const fetchParties = async () => {
    try {
      const { data } = await supabase
        .from('parties')
        .select(`
          *,
          profiles:leader_id (username)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (data) {
        // Fetch members for each party
        const partiesWithMembers = await Promise.all(
          data.map(async (party) => {
            const { data: members } = await supabase
              .from('party_members')
              .select(`
                *,
                profiles:user_id (username)
              `)
              .eq('party_id', party.id);

            return { ...party, members: members || [] };
          })
        );
        setParties(partiesWithMembers as Party[]);
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyParties = async () => {
    if (!profile) return;

    try {
      // Parties I created
      const { data: createdParties } = await supabase
        .from('parties')
        .select('*')
        .eq('leader_id', profile.id);

      // Parties I joined
      const { data: myMemberships } = await supabase
        .from('party_members')
        .select('party_id')
        .eq('user_id', profile.id);

      const partyIds = myMemberships?.map(m => m.party_id) || [];
      
      const { data: joinedParties } = partyIds.length > 0
        ? await supabase
            .from('parties')
            .select('*')
            .in('id', partyIds)
        : { data: [] };

      setMyParties([...(createdParties || []), ...(joinedParties || [])]);
    } catch (error) {
      console.error('Error fetching my parties:', error);
    }
  };

  const createParty = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('parties')
        .insert({
          leader_id: profile.id,
          game_name: newParty.game_name,
          platform: newParty.platform,
          party_size: newParty.party_size,
          description: newParty.description,
          voice_chat_enabled: newParty.voice_chat_enabled,
          min_level: newParty.min_level || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add leader as member
      await supabase
        .from('party_members')
        .insert({
          party_id: data.id,
          user_id: profile.id,
          role: 'leader',
        });

      setShowCreateModal(false);
      setNewParty({
        game_name: '',
        platform: 'steam',
        party_size: 4,
        description: '',
        voice_chat_enabled: true,
        min_level: 0,
      });
      fetchParties();
      fetchMyParties();
    } catch (error) {
      console.error('Error creating party:', error);
    }
  };

  const joinParty = async (partyId: string) => {
    if (!profile) return;

    try {
      await supabase
        .from('party_members')
        .insert({
          party_id: partyId,
          user_id: profile.id,
          role: 'member',
        });

      fetchParties();
      fetchMyParties();
    } catch (error) {
      console.error('Error joining party:', error);
    }
  };

  const leaveParty = async (partyId: string) => {
    if (!profile) return;

    try {
      await supabase
        .from('party_members')
        .delete()
        .eq('party_id', partyId)
        .eq('user_id', profile.id);

      fetchParties();
      fetchMyParties();
    } catch (error) {
      console.error('Error leaving party:', error);
    }
  };

  const deleteParty = async (partyId: string) => {
    if (!profile) return;

    try {
      await supabase
        .from('parties')
        .delete()
        .eq('id', partyId);

      fetchParties();
      fetchMyParties();
    } catch (error) {
      console.error('Error deleting party:', error);
    }
  };

  const filteredParties = parties.filter(party => {
    const matchesSearch = party.game_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         party.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = selectedPlatform === 'all' || party.platform === selectedPlatform;
    return matchesSearch && matchesPlatform;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] dark:bg-[#0f0f0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0f0f0f]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🎮 Party Finder
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Find teammates for your favorite games
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Create Party</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by game or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
          />
        </div>
        <div className="relative">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white cursor-pointer"
          >
            <option value="all">All Platforms</option>
            <option value="steam">Steam</option>
            <option value="epic">Epic Games</option>
            <option value="origin">Origin</option>
            <option value="xbox">Xbox</option>
            <option value="playstation">PlayStation</option>
            <option value="nintendo">Nintendo</option>
            <option value="riot">Riot Games</option>
            <option value="other">Other</option>
          </select>
          <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* My Parties */}
      {myParties.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">My Parties</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myParties.map((party) => (
              <div
                key={party.id}
                className="bg-white dark:bg-[#0f0f0f] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {party.game_name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Gamepad2 className="w-4 h-4" />
                      <span className="capitalize">{party.platform}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">
                    <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {party.current_size}/{party.party_size}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {party.description || 'No description'}
                </p>
                <div className="flex items-center space-x-2 mb-4">
                  {party.voice_chat_enabled ? (
                    <span className="flex items-center text-xs text-green-600 dark:text-green-400">
                      <Mic className="w-3 h-3 mr-1" />
                      Voice Chat
                    </span>
                  ) : (
                    <span className="flex items-center text-xs text-gray-500">
                      <MicOff className="w-3 h-3 mr-1" />
                      No Voice
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => leaveParty(party.id)}
                    className="flex-1 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 py-2 rounded-lg font-semibold transition-colors text-sm"
                  >
                    Leave
                  </button>
                  {party.leader_id === profile?.id && (
                    <button
                      onClick={() => deleteParty(party.id)}
                      className="p-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Parties */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Available Parties ({filteredParties.length})
        </h2>
        {filteredParties.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No parties found. Create one to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParties.map((party) => {
              const isAlreadyJoined = myParties.some(p => p.id === party.id);
              const canJoin = !isAlreadyJoined && party.status === 'open';

              return (
                <div
                  key={party.id}
                  className="bg-white dark:bg-[#0f0f0f] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {party.game_name}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <Gamepad2 className="w-4 h-4" />
                        <span className="capitalize">{party.platform}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">
                      <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {party.current_size}/{party.party_size}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {party.description || 'No description'}
                  </p>

                  <div className="flex items-center space-x-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(party.created_at).toLocaleDateString()}
                    </div>
                    {party.voice_chat_enabled ? (
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Mic className="w-3 h-3 mr-1" />
                        Voice
                      </div>
                    ) : null}
                    {party.min_level && (
                      <div className="flex items-center">
                        <Crown className="w-3 h-3 mr-1" />
                        Lv.{party.min_level}+
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Members:</div>
                    <div className="flex items-center space-x-2">
                      {party.members?.slice(0, 4).map((member) => (
                        <div
                          key={member.id}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xs"
                          title={member.profiles?.username}
                        >
                          {member.role === 'leader' ? (
                            <Crown className="w-4 h-4" />
                          ) : (
                            member.profiles?.username[0].toUpperCase() || 'U'
                          )}
                        </div>
                      ))}
                      {(party.members?.length || 0) > 4 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          +{(party.members?.length || 0) - 4} more
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => canJoin ? joinParty(party.id) : null}
                    disabled={!canJoin}
                    className={`w-full py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                      canJoin
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                        : 'bg-[#0f0f0f] dark:bg-[#1a1a1a] text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isAlreadyJoined ? (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Already Joined</span>
                      </>
                    ) : party.status === 'full' ? (
                      <span>Full</span>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Join Party</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Party Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0f0f0f] rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Party</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Game Name *
                </label>
                <input
                  type="text"
                  value={newParty.game_name}
                  onChange={(e) => setNewParty({ ...newParty, game_name: e.target.value })}
                  placeholder="e.g., Valorant, CS:GO, Fortnite"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Platform *
                  </label>
                  <select
                    value={newParty.platform}
                    onChange={(e) => setNewParty({ ...newParty, platform: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                  >
                    <option value="steam">Steam</option>
                    <option value="epic">Epic Games</option>
                    <option value="origin">Origin</option>
                    <option value="xbox">Xbox</option>
                    <option value="playstation">PlayStation</option>
                    <option value="nintendo">Nintendo</option>
                    <option value="riot">Riot Games</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Party Size *
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={newParty.party_size}
                    onChange={(e) => setNewParty({ ...newParty, party_size: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newParty.description}
                  onChange={(e) => setNewParty({ ...newParty, description: e.target.value })}
                  placeholder="What are you looking for in teammates?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={newParty.min_level}
                  onChange={(e) => setNewParty({ ...newParty, min_level: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="voiceChat"
                  checked={newParty.voice_chat_enabled}
                  onChange={(e) => setNewParty({ ...newParty, voice_chat_enabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="voiceChat" className="text-sm text-gray-700 dark:text-gray-300">
                  Enable Voice Chat
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={createParty}
                disabled={!newParty.game_name.trim()}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Party
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
