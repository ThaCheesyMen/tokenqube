import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Zap, Settings, X, Bell, UserPlus } from 'lucide-react';
import { toast } from './Toast';

interface PartyMatch {
  user_id: string;
  username: string;
  avatar_url?: string;
  skill_level: string;
  playstyle: string;
  match_score: number;
}

export default function SmartPartyFinderWidget() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<PartyMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [lfgEnabled, setLfgEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const matchingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousMatchCountRef = useRef(0);

  useEffect(() => {
    if (!profile) return;
    fetchPreferences();
    checkNotificationPermission();
  }, [profile]);

  // Auto-matching effect
  useEffect(() => {
    if (lfgEnabled && profile) {
      // Start auto-matching interval (check every 15 seconds)
      matchingIntervalRef.current = setInterval(() => {
        findMatches();
      }, 15000);

      // Initial match search
      findMatches();

      toast.success('🔍 Auto-matchmaking started!');
    } else {
      // Clear interval when stopping
      if (matchingIntervalRef.current) {
        clearInterval(matchingIntervalRef.current);
        matchingIntervalRef.current = null;
      }
    }

    return () => {
      if (matchingIntervalRef.current) {
        clearInterval(matchingIntervalRef.current);
        matchingIntervalRef.current = null;
      }
    };
  }, [lfgEnabled, profile]);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      } else if (Notification.permission === 'default') {
        setNotificationsEnabled(false);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        toast.success('Desktop notifications enabled!');
      } else {
        toast.error('Notifications permission denied');
      }
    }
  };

  const sendNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'party-finder'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const fetchPreferences = async () => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('party_finder_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (data) {
        setLfgEnabled(data.looking_for_group || false);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const findMatches = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('find_party_matches', {
        p_user_id: profile.id,
        p_game_name: null
      });

      if (error) {
        console.error('RPC Error:', error);
        // Fallback to basic query if RPC doesn't exist
        const { data: fallbackData } = await supabase
          .from('party_finder_preferences')
          .select(`
            user_id,
            profiles:user_id (
              id,
              username,
              avatar_url
            ),
            skill_level,
            playstyle
          `)
          .eq('looking_for_group', true)
          .neq('user_id', profile.id)
          .limit(5);

        const formattedMatches = (fallbackData || []).map((item: any) => ({
          user_id: item.user_id,
          username: item.profiles?.username || 'Unknown',
          avatar_url: item.profiles?.avatar_url,
          skill_level: item.skill_level || 'intermediate',
          playstyle: item.playstyle || 'balanced',
          match_score: 75
        }));

        setMatches(formattedMatches);

        // Send notification for new matches
        if (formattedMatches.length > previousMatchCountRef.current && lfgEnabled) {
          const newMatchCount = formattedMatches.length - previousMatchCountRef.current;
          sendNotification(
            '🎮 Party Matches Found!',
            `Found ${newMatchCount} new potential ${newMatchCount === 1 ? 'teammate' : 'teammates'}!`
          );
          toast.success(`Found ${newMatchCount} new match${newMatchCount === 1 ? '' : 'es'}!`);
        }

        previousMatchCountRef.current = formattedMatches.length;
        return;
      }

      setMatches(data || []);

      // Send notification for new matches
      if (data && data.length > previousMatchCountRef.current && lfgEnabled) {
        const newMatchCount = data.length - previousMatchCountRef.current;
        sendNotification(
          '🎮 Party Matches Found!',
          `Found ${newMatchCount} new potential ${newMatchCount === 1 ? 'teammate' : 'teammates'}!`
        );
        toast.success(`Found ${newMatchCount} new match${newMatchCount === 1 ? '' : 'es'}!`);
      }

      previousMatchCountRef.current = data?.length || 0;
    } catch (error) {
      console.error('Error finding matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickMatch = async () => {
    if (!profile || loading) return;

    const newStatus = !lfgEnabled;

    try {
      setLoading(true);

      // Update database first
      const { error } = await supabase
        .from('party_finder_preferences')
        .upsert({
          user_id: profile.id,
          looking_for_group: newStatus,
          auto_match: newStatus,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Database error:', error);
        toast.error('Failed to update matchmaking status');
        return;
      }

      // Update UI state after successful database update
      setLfgEnabled(newStatus);
      
      if (!newStatus) {
        // If disabling, clear matches and reset counter
        setMatches([]);
        previousMatchCountRef.current = 0;
        toast.info('❌ Stopped looking for matches');
      } else {
        // If enabling, request notifications if not already granted
        if (!notificationsEnabled && Notification.permission === 'default') {
          await requestNotificationPermission();
        }
      }
    } catch (error) {
      console.error('Error toggling LFG:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const inviteToParty = async (matchUserId: string, username: string) => {
    if (!profile) return;

    try {
      // TODO: Implement actual party invitation
      // For now, send a friend request or notification
      toast.success(`Invitation sent to ${username}!`);
      
      // Could create a notification in the database
      await supabase.from('notifications').insert({
        user_id: matchUserId,
        type: 'party_invite',
        title: 'Party Invitation',
        message: `${profile.username} wants to party up with you!`,
        data: { sender_id: profile.id, sender_username: profile.username }
      });
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('Failed to send invitation');
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            lfgEnabled 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 animate-pulse' 
              : 'bg-gradient-to-br from-green-500 to-emerald-600'
          }`}>
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Smart Party Finder</h2>
            <p className="text-xs text-gray-400">
              {lfgEnabled ? 'Auto-matching active' : 'AI-powered matching'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {lfgEnabled && (
            <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Searching</span>
            </div>
          )}
          
          <button
            onClick={requestNotificationPermission}
            className={`p-2 rounded-lg transition-colors ${
              notificationsEnabled
                ? 'bg-[#8B5CF6] text-white'
                : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
            }`}
            title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Match Button */}
      <button
        onClick={quickMatch}
        disabled={loading}
        className={`w-full p-4 rounded-lg bg-gradient-to-r mb-4 transition-all shadow-lg ${
          lfgEnabled
            ? 'from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 hover:shadow-red-500/30'
            : 'from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:shadow-green-500/30'
        } text-white font-semibold flex items-center justify-center gap-2 ${
          loading ? 'opacity-75 cursor-not-allowed' : ''
        }`}
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Updating...</span>
          </>
        ) : lfgEnabled ? (
          <>
            <X className="w-5 h-5" />
            <span>Stop Looking</span>
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            <span>Start Quick Match</span>
          </>
        )}
      </button>

      {/* Matches List */}
      {matches.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-300 font-medium">
              🎯 Found {matches.length} compatible {matches.length === 1 ? 'player' : 'players'}
            </p>
            {lfgEnabled && (
              <div className="text-xs text-green-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                Auto-updating
              </div>
            )}
          </div>
          {matches.map((match) => (
            <div
              key={match.user_id}
              className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225] hover:border-[#8B5CF6] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {match.avatar_url ? (
                    <img
                      src={match.avatar_url}
                      alt={match.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    match.username.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white truncate">
                      {match.username}
                    </span>
                    {match.match_score > 70 && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 text-xs rounded-full font-medium border border-green-500/20">
                        {match.match_score}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="capitalize">{match.skill_level}</span>
                    <span>•</span>
                    <span className="capitalize">{match.playstyle}</span>
                  </div>
                </div>

                <button 
                  onClick={() => inviteToParty(match.user_id, match.username)}
                  className="px-3 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 group-hover:shadow-lg group-hover:shadow-[#8B5CF6]/30"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Invite
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : lfgEnabled ? (
        <div className="text-center py-6">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Searching for matches...</p>
          <p className="text-gray-500 text-xs mt-1">This may take a moment</p>
        </div>
      ) : (
        <div className="text-center py-6">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Click Quick Match to find players</p>
          <p className="text-gray-500 text-xs mt-1">We'll match you with compatible teammates</p>
        </div>
      )}

      {/* Settings Link */}
      <div className="mt-4 pt-4 border-t border-[#202225]">
        <button className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors font-medium flex items-center justify-center gap-2">
          <Settings className="w-4 h-4" />
          Configure Preferences
        </button>
      </div>
    </div>
  );
}

