import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../hooks/useRole';
import { useRealtimeTokenBalance } from '../hooks/useRealtimeTokenBalance';
import { supabase } from '../lib/supabase';
import { 
  Coins, LayoutDashboard, MessageSquare, 
  Trophy, FolderOpen, LogOut, Menu, X, ChevronLeft, ShoppingBag, Radio, 
  Swords, Target, Shield
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatTokens } from '../utils/formatTokens';
import GlobalNotificationsBell from './GlobalNotificationsBell';

interface DiscordSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

interface SidebarItem {
  id: string;
  name: string;
  icon: any;
  section?: 'main' | 'apps' | 'bottom';
}

export default function DiscordSidebar({ currentPage, onNavigate, onCollapseChange }: DiscordSidebarProps) {
  const { profile, signOut } = useAuth();
  const { isAdmin } = useRole();
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed like Discord
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  
  // Real-time token updates - sidebar shows live balance!
  useRealtimeTokenBalance();

  // Track unread chat messages
  useEffect(() => {
    if (!profile) return;

    // Subscribe to new global chat messages
    const globalChatChannel = supabase
      .channel('global_chat_unread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_chat_messages',
        },
        (payload) => {
          // Don't count own messages
          if (payload.new.user_id !== profile.id) {
            setUnreadChatCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    // Subscribe to new DM messages
    const dmChannel = supabase
      .channel('dm_messages_unread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
        },
        async (payload) => {
          // Check if message is for this user
          const { data: room } = await supabase
            .from('dm_rooms')
            .select('user1_id, user2_id')
            .eq('id', payload.new.room_id)
            .single();

          if (room && (room.user1_id === profile.id || room.user2_id === profile.id) && payload.new.sender_id !== profile.id) {
            setUnreadChatCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChatChannel);
      supabase.removeChannel(dmChannel);
    };
  }, [profile]);

  // Clear unread count when navigating to chat
  useEffect(() => {
    if (currentPage === 'chat') {
      setUnreadChatCount(0);
    }
  }, [currentPage]);

  // Notify parent component when collapse state changes
  useEffect(() => {
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

  const mainNavigation: SidebarItem[] = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, section: 'main' },
    { id: 'chat', name: 'Chat', icon: MessageSquare, section: 'main' },
    { id: 'squads', name: 'Squads', icon: FolderOpen, section: 'main' },
    { id: 'ranked', name: 'Ranked', icon: Target, section: 'apps' },
    { id: 'rewards', name: 'Rewards', icon: Coins, section: 'apps' },
    { id: 'marketplace', name: 'Marketplace', icon: ShoppingBag, section: 'apps' },
    { id: 'leaderboard', name: 'Leaderboard', icon: Trophy, section: 'apps' },
  ];

  const bottomNavigation: SidebarItem[] = [
    { id: 'livestudio', name: 'Live Studio', icon: Radio, section: 'bottom' },
    { id: 'tournaments', name: 'Tournaments', icon: Swords, section: 'bottom' },
  ];

  const renderIcon = (Icon: any, isActive: boolean, itemId?: string) => {
    const isLiveStudio = itemId === 'livestudio';
    const isTournaments = itemId === 'tournaments';
    
    const iconColor = isLiveStudio 
      ? (isActive ? 'text-white' : 'text-red-500 group-hover:text-red-400')
      : isTournaments
      ? (isActive ? 'text-white' : 'text-yellow-500 group-hover:text-yellow-400')
      : (isActive ? 'text-white' : 'text-gray-400 group-hover:text-white');
    
    return (
      <Icon className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} ${iconColor}`} />
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1a1a1a] rounded-lg text-white hover:bg-[#2f3136] transition-colors"
      >
        {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-[#1a1a1a] text-white transition-all duration-300 z-40 ${
          isCollapsed ? 'w-20' : 'w-60'
        } ${showMobileMenu ? '' : 'hidden lg:block'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header with Collapse Button & Notifications */}
          <div className={`p-4 border-b border-[#202225] flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <Coins className="w-8 h-8 text-[#8B5CF6]" />
                <span className="text-xl font-bold">TokenQuest</span>
              </div>
            )}
            <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
              <GlobalNotificationsBell />
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 hover:bg-[#2f3136] rounded-lg transition-colors"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                <ChevronLeft className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
            {mainNavigation.map((item) => {
              const isActive = currentPage === item.id;
              const Icon = item.icon;

              const isLiveStudio = item.id === 'livestudio';
              const isTournaments = item.id === 'tournaments';
              
              const buttonClass = isLiveStudio
                ? (isActive
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                    : 'text-red-500 hover:bg-red-500/10 hover:text-red-400')
                : isTournaments
                ? (isActive
                    ? 'bg-gradient-to-r from-yellow-500 via-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/30 animate-pulse'
                    : 'text-yellow-500 hover:bg-gradient-to-r hover:from-yellow-500/20 hover:to-orange-500/20 hover:text-yellow-400 hover:shadow-md hover:shadow-yellow-500/20')
                : (isActive
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-gray-400 hover:bg-[#2f3136] hover:text-white');
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-lg transition-all group ${buttonClass} relative`}
                  title={isCollapsed ? item.name : ''}
                >
                  <div className="relative">
                    {renderIcon(Icon, isActive, item.id)}
                    {/* Unread chat badge */}
                    {item.id === 'chat' && unreadChatCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center animate-pulse px-1">
                        {unreadChatCount > 9 ? '9+' : unreadChatCount}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && <span className="font-medium">{item.name}</span>}
                </button>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="border-t border-[#202225] p-3 space-y-2">
            {/* Bottom Navigation (Live Studio & Tournaments) */}
            {bottomNavigation.map((item) => {
              const isActive = currentPage === item.id;
              const Icon = item.icon;

              const isLiveStudio = item.id === 'livestudio';
              const isTournaments = item.id === 'tournaments';
              
              const buttonClass = isLiveStudio
                ? (isActive
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                    : 'text-red-500 hover:bg-red-500/10 hover:text-red-400')
                : isTournaments
                ? (isActive
                    ? 'bg-gradient-to-r from-yellow-500 via-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/30 animate-pulse'
                    : 'text-yellow-500 hover:bg-gradient-to-r hover:from-yellow-500/20 hover:to-orange-500/20 hover:text-yellow-400 hover:shadow-md hover:shadow-yellow-500/20')
                : '';
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-lg transition-all group ${buttonClass}`}
                  title={isCollapsed ? item.name : ''}
                >
                  {renderIcon(Icon, isActive, item.id)}
                  {!isCollapsed && <span className="font-medium">{item.name}</span>}
                </button>
              );
            })}

            {/* Admin Panel Button (Only for Admins) */}
            {isAdmin() && (
              <button
                onClick={() => {
                  onNavigate('adminpanel');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-lg transition-all group ${
                  currentPage === 'adminpanel'
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                    : 'text-red-500 hover:bg-red-500/10 hover:text-red-400'
                }`}
                title={isCollapsed ? 'Admin Panel' : ''}
              >
                <Shield className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
                {!isCollapsed && <span className="font-medium">Admin Panel</span>}
              </button>
            )}

            {/* User Profile Section */}
            <button
              onClick={() => {
                onNavigate('profile');
                setShowMobileMenu(false);
              }}
              className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                currentPage === 'profile' ? 'bg-[#8B5CF6]' : 'hover:bg-[#2f3136]'
              }`}
              title={isCollapsed ? profile?.username : undefined}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden bg-gradient-to-br from-[#8B5CF6] to-[#7289DA] flex-shrink-0">
                {(profile as any)?.avatar_url ? (
                  <img 
                    src={(profile as any).avatar_url} 
                    alt={profile?.username} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white">{profile?.username?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              
              {/* Username & Token Balance (expanded only) */}
              {!isCollapsed && (
                <div className="flex-1 text-left overflow-hidden">
                  <div className="text-sm font-semibold text-white truncate">
                    {profile?.username || 'User'}
                  </div>
                  {(profile as any)?.custom_status ? (
                    <div className="text-xs text-gray-400 truncate flex items-center gap-1">
                      {(profile as any)?.status_emoji && <span>{(profile as any).status_emoji}</span>}
                      <span className="truncate">{(profile as any).custom_status}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Coins className="w-3 h-3" />
                      <span>{formatTokens(profile?.token_balance || 0)}</span>
                    </div>
                  )}
                </div>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to log out?')) {
                  await signOut();
                  window.location.href = '/';
                }
              }}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2'} p-2 rounded-lg transition-colors hover:bg-red-500/20 text-gray-400 hover:text-red-400 group`}
              title={isCollapsed ? 'Logout' : undefined}
            >
              {isCollapsed ? (
                <LogOut className="w-6 h-6" />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1a1a1a] group-hover:bg-red-500/30 transition-colors flex-shrink-0">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left font-medium">Logout</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {showMobileMenu && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
    </>
  );
}
