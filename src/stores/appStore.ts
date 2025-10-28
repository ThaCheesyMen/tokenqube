/**
 * Centralized Application State Management using Zustand
 * Replaces multiple context providers for better performance
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

// Types
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
  created_at: string;
}

interface PartyMember {
  id: string;
  party_id: string;
  user_id: string;
  role: string;
  profiles?: {
    username: string;
  };
}

interface Profile {
  id: string;
  username: string;
  token_balance: number;
  total_earned: number;
  total_spent: number;
  referral_code: string;
  referred_by: string | null;
  signup_bonus_claimed: boolean;
  created_at: string;
  avatar_url?: string;
  banner_url?: string;
  status?: string;
  last_seen?: string;
  last_heartbeat?: string;
  currently_playing?: string;
  currently_playing_platform?: string;
}

// Store Interface
interface AppStore {
  // Theme
  isDark: boolean;
  toggleTheme: () => void;

  // User Profile
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  refreshProfile: () => Promise<void>;

  // Voice Chat
  activePartyId: string | null;
  activeParty: Party | null;
  partyMembers: PartyMember[];
  isMuted: boolean;
  isDeafened: boolean;
  showVoiceControls: boolean;
  setActivePartyId: (id: string | null) => void;
  setActiveParty: (party: Party | null) => void;
  setPartyMembers: (members: PartyMember[]) => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  setShowVoiceControls: (show: boolean) => void;

  // UI State
  sidebarCollapsed: boolean;
  currentPage: string;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: string) => void;

  // Notifications
  unreadNotifications: number;
  setUnreadNotifications: (count: number) => void;
  incrementUnreadNotifications: () => void;
  decrementUnreadNotifications: () => void;

  // Loading States
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

// Create Store
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Theme
      isDark: true,
      toggleTheme: () => {
        const isDark = !get().isDark;
        set({ isDark });
        
        // Update DOM
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      // User Profile
      profile: null,
      setProfile: (profile) => set({ profile }),
      refreshProfile: async () => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          set({ profile: data as Profile });
        }
      },

      // Voice Chat
      activePartyId: null,
      activeParty: null,
      partyMembers: [],
      isMuted: false,
      isDeafened: false,
      showVoiceControls: false,
      setActivePartyId: (id) => set({ activePartyId: id }),
      setActiveParty: (party) => set({ activeParty: party }),
      setPartyMembers: (members) => set({ partyMembers: members }),
      toggleMute: () => set({ isMuted: !get().isMuted }),
      toggleDeafen: () => {
        const isDeafened = !get().isDeafened;
        set({ 
          isDeafened,
          // Also mute when deafening
          isMuted: isDeafened ? true : get().isMuted 
        });
      },
      setShowVoiceControls: (show) => set({ showVoiceControls: show }),

      // UI State
      sidebarCollapsed: false,
      currentPage: 'dashboard',
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setCurrentPage: (page) => set({ currentPage: page }),

      // Notifications
      unreadNotifications: 0,
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),
      incrementUnreadNotifications: () => 
        set({ unreadNotifications: get().unreadNotifications + 1 }),
      decrementUnreadNotifications: () => 
        set({ unreadNotifications: Math.max(0, get().unreadNotifications - 1) }),

      // Loading States
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'tokenquest-storage',
      // Only persist theme and UI preferences
      partialize: (state) => ({
        isDark: state.isDark,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// Selectors for optimized re-renders
export const useTheme = () => useAppStore((state) => ({
  isDark: state.isDark,
  toggleTheme: state.toggleTheme,
}));

export const useProfile = () => useAppStore((state) => ({
  profile: state.profile,
  setProfile: state.setProfile,
  refreshProfile: state.refreshProfile,
}));

export const useVoiceChat = () => useAppStore((state) => ({
  activePartyId: state.activePartyId,
  activeParty: state.activeParty,
  partyMembers: state.partyMembers,
  isMuted: state.isMuted,
  isDeafened: state.isDeafened,
  showVoiceControls: state.showVoiceControls,
  setActivePartyId: state.setActivePartyId,
  setActiveParty: state.setActiveParty,
  setPartyMembers: state.setPartyMembers,
  toggleMute: state.toggleMute,
  toggleDeafen: state.toggleDeafen,
  setShowVoiceControls: state.setShowVoiceControls,
}));

export const useUI = () => useAppStore((state) => ({
  sidebarCollapsed: state.sidebarCollapsed,
  currentPage: state.currentPage,
  setSidebarCollapsed: state.setSidebarCollapsed,
  setCurrentPage: state.setCurrentPage,
}));

export const useNotifications = () => useAppStore((state) => ({
  unreadNotifications: state.unreadNotifications,
  setUnreadNotifications: state.setUnreadNotifications,
  incrementUnreadNotifications: state.incrementUnreadNotifications,
  decrementUnreadNotifications: state.decrementUnreadNotifications,
}));

