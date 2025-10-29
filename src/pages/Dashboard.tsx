import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Coins, TrendingUp, Gift, Users, Gamepad2, Mic, UserPlus, Trophy, Zap, Award, Copy } from 'lucide-react';
import { ExtendedProfile } from '../types/profile';
import GlobalChatWidget from '../components/GlobalChatWidget';
import TrendingGamesWidget from '../components/TrendingGamesWidget';
import { DailyQuestsWidget, ActivityStreakWidget, RecentActivityWidget, FriendsOnlineWidget } from '../components/DashboardWidgets';
import { calculateLevel, getTier } from '../utils/levelSystem';
import ActiveSessionTracker from '../components/ActiveSessionTracker';
import QuickGameLaunchWidget from '../components/QuickGameLaunchWidget';
import VoiceChatStatusWidget from '../components/VoiceChatStatusWidget';
import TournamentsWidget from '../components/TournamentsWidget';
import TokenEconomyWidget from '../components/TokenEconomyWidget';
import { GamingWeatherWidget, GameOfTheDayWidget, SocialFeedWidget } from '../components/ExtraDashboardWidgets';
import AIRecommendationsWidget from '../components/AIRecommendationsWidget';
import PerformanceDashboardWidget from '../components/PerformanceDashboardWidget';
import DashboardNewsFeed from '../components/DashboardNewsFeed';
import SmartPartyFinderWidget from '../components/SmartPartyFinderWidget';
import OverlayToggleButton from '../components/OverlayToggleButton';
import ProfileViewModal from '../components/ProfileViewModal';
import CollapsibleWidget from '../components/CollapsibleWidget';
import QuickActionsBar from '../components/QuickActionsBar';
import { useParties } from '../hooks/useParties';
import { useUserStats } from '../hooks/useUserStats';
import { useRealtimeTokenBalance } from '../hooks/useRealtimeTokenBalance';
import { toast } from '../components/Toast';
import { LazyImage } from '../components/LazyImage';
import { formatTokens } from '../utils/formatTokens';

interface Party {
  id: string;
  leader_id: string;
  game_name: string;
  platform: string;
  party_size: number;
  current_size: number;
  description?: string;
  voice_chat_enabled: boolean;
  status: string;
  profiles?: {
    username: string;
  };
}


interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { profile } = useAuth();
  const extendedProfile = profile as ExtendedProfile | null;
  
  // Use new realtime hooks (no more polling!)
  const { 
    parties: activeParties, 
    joinedParties, 
    loading: partiesLoading,
    joinParty: handleJoinParty,
    leaveParty: handleLeaveParty
  } = useParties({
    userId: profile?.id,
    autoSubscribe: true,
    filterStatus: 'open'
  });

  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  
  // Use unified stats hook - replaces multiple queries with one!
  const { stats: userStats, loading: statsLoading, refetch } = useUserStats(profile?.id);
  
  // Real-time token updates - automatically syncs when tokens change!
  useRealtimeTokenBalance((newBalance) => {
    console.log('💰 Dashboard: Token balance updated to', newBalance);
    refetch(); // Refetch all stats to stay in sync
  });

  // Calculate level and tier from profile data (memoized)
  const levelInfo = useMemo(() => {
    if (!profile) return { level: 1, progress: 0, currentXP: 0, xpForCurrentLevel: 100, xpForNextLevel: 173, totalXPForCurrentLevel: 0 };
    return calculateLevel(profile.total_earned || 0);
  }, [profile?.total_earned]);

  const tier = useMemo(() => getTier(levelInfo.level), [levelInfo.level]);

  // Stats are now loaded automatically by useUserStats hook - no manual fetching needed! 🚀

  // Memoized join party handler
  const joinParty = useCallback(async (partyId: string) => {
    if (!profile) return;

    // Check if already joined
    if (joinedParties.has(partyId)) {
      toast.info('You are already in this party');
      return;
    }

    const result = await handleJoinParty(partyId);
    if (result.success) {
      toast.success('Joined party successfully!');
    }
  }, [profile, joinedParties, handleJoinParty]);



  return (
    <div className="h-full w-full p-0 sm:p-6 lg:p-8 bg-[#0f0f0f]">
      {/* Enhanced Profile Banner */}
      <div className="mb-6 sm:mb-8 sm:mx-6 lg:mx-8">
        <div className="rounded-none sm:rounded-2xl shadow-2xl overflow-hidden relative h-80 sm:h-96">
          {/* Banner Background */}
          <div className="absolute inset-0">
            {extendedProfile?.banner_url ? (
              <LazyImage
                src={extendedProfile.banner_url}
                alt="Profile Banner"
                className="w-full h-full object-cover"
                placeholder="/images/banner-placeholder.jpg"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#3b4199]"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30"></div>
            {/* Animated particles */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 animate-pulse" style={{backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "30px 30px"}}></div>
            </div>
          </div>

          {/* Profile Content Overlay */}
          <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
            {/* Top Section - Welcome */}
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-2xl animate-fadeIn">
                Welcome back, {profile?.username}! 👋
              </h1>
              <p className="text-white/90 text-base sm:text-lg drop-shadow-lg animate-fadeIn" style={{animationDelay: '0.1s'}}>
                {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}! Ready to dominate the leaderboard?
              </p>
            </div>

            {/* Bottom Section - Profile & Stats */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
              {/* Avatar & User Info */}
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] p-1 shadow-2xl ring-4 ring-black/20">
                  {extendedProfile?.avatar_url ? (
                    <LazyImage
                      src={extendedProfile.avatar_url}
                      alt={profile?.username || 'User avatar'}
                      className="w-full h-full rounded-xl object-cover"
                      placeholder="/images/avatar-placeholder.png"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-[#1a1a1a] flex items-center justify-center text-white text-4xl font-bold">
                      {profile?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg">
                      {profile?.username}
                    </span>
                    <div className={`px-3 py-1 bg-gradient-to-r ${tier.color} rounded-lg text-white text-xs font-bold shadow-lg`}>
                      Lvl {levelInfo.level}
                    </div>
                  </div>
                  {extendedProfile?.custom_status && (
                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                      {extendedProfile?.status_emoji && (
                        <span>{extendedProfile.status_emoji}</span>
                      )}
                      <span className="text-sm text-white/90">{extendedProfile.custom_status}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-3 sm:ml-auto">
                <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl shadow-xl border border-white/10 hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    <div>
                      <div className="text-xs text-white/60">Tokens</div>
                      <div className="text-xl font-bold text-white">{formatTokens(userStats?.token_balance || profile?.token_balance || 0)}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl shadow-xl border border-white/10 hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-purple-400" />
                    <div>
                      <div className="text-xs text-white/60">Rank</div>
                      <div className="text-xl font-bold text-white">#{userStats?.rank || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl shadow-xl border border-white/10 hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-xs text-white/60">Streak</div>
                      <div className="text-xl font-bold text-white">{userStats?.login_streak || 0} {userStats?.login_streak === 1 ? 'day' : 'days'}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl shadow-xl border border-white/10 hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-400" />
                    <div>
                      <div className="text-xs text-white/60">Achievements</div>
                      <div className="text-xl font-bold text-white">{userStats?.total_achievements || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="px-4 sm:px-6 lg:px-8 mb-8">
        <QuickActionsBar 
          onNavigate={(_category) => {
            // Navigate to rewards page
            // Specific category navigation happens on the Rewards page itself
            onNavigate('rewards');
          }}
          onClaimDaily={async () => {
            if (!profile) return;
            try {
              const { data, error } = await supabase.rpc('check_daily_login', {
                p_user_id: profile.id
              });
              if (error) throw error;
              if (data?.success) {
                toast.success(`${data.message} +${data.tokens} tokens!`);
                // Refresh user stats to update token balance
                fetchUserStats();
              } else {
                toast.info(data?.message || 'Already claimed today');
              }
            } catch (error: any) {
              toast.error(error.message || 'Failed to claim daily reward');
            }
          }}
        />
      </div>

      {/* Quick Stats Overview - Redesigned */}
      <div className="px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gaming Progress Card */}
          <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#202225] hover:border-[#8B5CF6] transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-gray-400">This Week</span>
            </div>
              <div className="text-2xl font-bold text-white mb-1">{userStats?.total_achievements || 0}</div>
            <div className="text-xs text-gray-400">Achievements Unlocked</div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: '65%' }}></div>
              </div>
              <span className="text-xs text-blue-400 font-medium">+12%</span>
            </div>
          </div>

          {/* Rank Progress Card */}
          <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#202225] hover:border-[#8B5CF6] transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-gray-400">Global</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">#{userStats?.rank || 'N/A'}</div>
            <div className="text-xs text-gray-400">Leaderboard Rank</div>
            <div className="mt-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-green-400 font-medium">Moved up 5 spots</span>
            </div>
          </div>

          {/* Activity Streak Card */}
          <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#202225] hover:border-[#8B5CF6] transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-gray-400">Current</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{userStats?.login_streak || 0} Days</div>
            <div className="text-xs text-gray-400">Login Streak 🔥</div>
            <div className="mt-3 flex items-center gap-1">
              {[...Array(7)].map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 h-1.5 rounded-full ${i < (userStats?.login_streak || 0) % 7 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-[#1a1a1a]'}`}
                />
              ))}
            </div>
          </div>

          {/* Quick Invite Card */}
          <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#202225] hover:border-[#8B5CF6] transition-all group cursor-pointer" onClick={() => {
            navigator.clipboard.writeText(profile?.referral_code || '');
            toast.success('Referral code copied to clipboard!');
          }}>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
            <div className="text-sm font-mono font-bold text-white mb-1 tracking-wider">{profile?.referral_code || '---'}</div>
            <div className="text-xs text-gray-400">Referral Code (Click to Copy)</div>
            <div className="mt-3 flex items-center gap-2">
              <Gift className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Earn 500 tokens per friend!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Parties Section */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
      {activeParties.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] shadow-lg">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Active Parties</h2>
                <p className="text-sm text-gray-400">Teams looking for players</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-full text-sm font-medium">
              {activeParties.length} Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeParties.map((party) => {
              const isJoined = joinedParties.has(party.id);
              
              return (
                <div
                  key={party.id}
                  className="bg-[#1a1a1a] rounded-xl p-4 hover:shadow-lg transition-all duration-200 border border-[#202225] hover:border-[#8B5CF6] group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg group-hover:text-[#8B5CF6] transition-colors">
                        {party.game_name}
                      </h3>
                      <p className="text-sm text-gray-400 flex items-center mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {party.profiles?.username || 'Unknown'}
                      </p>
                    </div>
                    <span className="text-xs bg-[#8B5CF6] text-white px-2.5 py-1 rounded-full font-medium shadow">
                      {party.current_size}/{party.party_size}
                    </span>
                  </div>

                  {party.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                      {party.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-[#202225]">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-[#202225] px-2.5 py-1 rounded-full capitalize text-gray-300 font-medium">
                        {party.platform}
                      </span>
                      {party.voice_chat_enabled && (
                        <div className="flex items-center text-green-500 bg-green-500/20 px-2 py-1 rounded-full">
                          <Mic className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => joinParty(party.id)}
                      disabled={isJoined}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1 shadow-lg ${
                        isJoined
                          ? 'bg-gray-600 text-white cursor-not-allowed'
                          : 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white hover:shadow-xl'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{isJoined ? 'Joined' : 'Join'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* News Feed */}
            <CollapsibleWidget id="news-feed">
              <DashboardNewsFeed />
            </CollapsibleWidget>

            {/* AI Recommendations */}
            <CollapsibleWidget id="ai-recommendations">
              <AIRecommendationsWidget />
            </CollapsibleWidget>

            {/* Tournaments & Events */}
            <CollapsibleWidget id="tournaments">
              <TournamentsWidget />
            </CollapsibleWidget>

            {/* Daily Quests Widget */}
            <CollapsibleWidget id="daily-quests">
              <DailyQuestsWidget />
            </CollapsibleWidget>

            {/* Social Feed */}
            <CollapsibleWidget id="social-feed">
              <SocialFeedWidget />
            </CollapsibleWidget>

            {/* Recent Activity Widget */}
            <CollapsibleWidget id="recent-activity">
              <RecentActivityWidget />
            </CollapsibleWidget>

            {/* Trending Games Widget */}
            <CollapsibleWidget id="trending-games">
              <TrendingGamesWidget />
            </CollapsibleWidget>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Overlay Toggle */}
            <OverlayToggleButton />

            {/* Performance Dashboard */}
            <CollapsibleWidget id="performance">
              <PerformanceDashboardWidget />
            </CollapsibleWidget>

            {/* Smart Party Finder */}
            <CollapsibleWidget id="party-finder">
              <SmartPartyFinderWidget />
            </CollapsibleWidget>

            {/* Active Session Tracker */}
            <CollapsibleWidget id="session-tracker">
              <ActiveSessionTracker />
            </CollapsibleWidget>

            {/* Token Economy */}
            <CollapsibleWidget id="token-economy">
              <TokenEconomyWidget />
            </CollapsibleWidget>

            {/* Quick Game Launch */}
            <CollapsibleWidget id="game-launch">
              <QuickGameLaunchWidget />
            </CollapsibleWidget>

            {/* Voice Chat Status */}
            <CollapsibleWidget id="voice-chat">
              <VoiceChatStatusWidget onNavigate={onNavigate} />
            </CollapsibleWidget>

            {/* Gaming Weather */}
            <CollapsibleWidget id="gaming-weather">
              <GamingWeatherWidget />
            </CollapsibleWidget>

            {/* Game of the Day */}
            <CollapsibleWidget id="game-of-day">
              <GameOfTheDayWidget />
            </CollapsibleWidget>

            {/* Activity Streak Widget */}
            <CollapsibleWidget id="activity-streak">
              <ActivityStreakWidget streak={userStats?.login_streak || 0} />
            </CollapsibleWidget>

            {/* Friends Online Widget */}
            <CollapsibleWidget id="friends-online">
              <FriendsOnlineWidget onNavigate={onNavigate} onViewProfile={setViewingProfileId} />
            </CollapsibleWidget>

            {/* Global Chat Widget */}
            <CollapsibleWidget id="global-chat">
              <GlobalChatWidget />
            </CollapsibleWidget>
          </div>
        </div>

        {/* Profile View Modal */}
        {viewingProfileId && (
          <ProfileViewModal 
            userId={viewingProfileId} 
            onClose={() => setViewingProfileId(null)} 
          />
        )}
      </div>
    </div>
  );
}
