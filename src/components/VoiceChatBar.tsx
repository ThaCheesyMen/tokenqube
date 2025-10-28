import { useVoiceChat } from '../contexts/VoiceChatContext';
import { UserPlus, Mic, MicOff, Volume2, VolumeX, PhoneOff, Crown, X, CheckCircle } from 'lucide-react';
import { toast } from './Toast';

export default function VoiceChatBar() {
  const {
    showVoiceControls,
    activeParty,
    partyMembers,
    activePartyId,
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    leaveParty,
    openInviteModal,
    friends,
    showInviteModal,
    setShowInviteModal,
    selectedFriends,
    setSelectedFriends,
    inviteTargetPartyId,
    setInviteTargetPartyId,
    inviteFriends,
  } = useVoiceChat();

  // Don't render if no active party
  if (!showVoiceControls || !activeParty) {
    return null;
  }

  return (
    <>
      {/* Persistent Voice Chat Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
        <div className="flex items-center justify-between px-4 py-2 h-16">
          {/* Left: Party Info */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {activeParty.game_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {activeParty.game_name || 'Unknown Game'}
              </p>
              <p className="text-xs text-gray-400">
                {partyMembers.length}/{activeParty.party_size}
              </p>
            </div>
          </div>

          {/* Middle: Party Members */}
          <div className="flex items-center space-x-2 flex-1 justify-center overflow-x-auto max-w-md">
            {partyMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center space-x-2 bg-[#1a1a1a] rounded-lg px-2 py-1 flex-shrink-0"
                title={member.profiles?.username || 'Unknown'}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {member.profiles?.username?.charAt(0) || '?'}
                </div>
                <span className="text-xs text-gray-300 whitespace-nowrap">
                  {member.profiles?.username && member.profiles.username.length > 8 
                    ? member.profiles.username.substring(0, 6) + '...' 
                    : member.profiles?.username || 'Unknown'}
                </span>
                {member.role === 'leader' && (
                  <Crown className="w-3 h-3 text-yellow-400" />
                )}
              </div>
            ))}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => activePartyId && openInviteModal(activePartyId)}
              className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#1a1a1a] text-gray-300 hover:text-white transition-colors"
              title="Invite Friends"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg transition-colors ${
                isMuted
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-[#1a1a1a] hover:bg-[#1a1a1a] text-gray-300 hover:text-white'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleDeafen}
              className={`p-2 rounded-lg transition-colors ${
                isDeafened
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-[#1a1a1a] hover:bg-[#1a1a1a] text-gray-300 hover:text-white'
              }`}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => activePartyId && leaveParty(activePartyId)}
              className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              title="Leave Party"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && inviteTargetPartyId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invite Friends</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteTargetPartyId(null);
                  setSelectedFriends(new Set());
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {friends.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No friends to invite
                </p>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => {
                      const newSelected = new Set(selectedFriends);
                      if (newSelected.has(friend.id)) {
                        newSelected.delete(friend.id);
                      } else {
                        newSelected.add(friend.id);
                      }
                      setSelectedFriends(newSelected);
                    }}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedFriends.has(friend.id)
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
                          {friend.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{friend.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {friend.status === 'online' ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </div>
                      {selectedFriends.has(friend.id) && (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={inviteFriends}
                disabled={selectedFriends.size === 0}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Invitations ({selectedFriends.size})
              </button>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteTargetPartyId(null);
                  setSelectedFriends(new Set());
                }}
                className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-[#0f0f0f] dark:hover:bg-[#1a1a1a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
