import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Settings as SettingsIcon, User, Bell, Shield, Palette, Keyboard,
  Globe, Download, Trash2, LogOut, Eye, EyeOff, Save, X
} from 'lucide-react';
import { toast } from '../components/Toast';
import { InputValidator } from '../utils/validation';

interface SettingsSection {
  id: string;
  name: string;
  icon: any;
}

const sections: SettingsSection[] = [
  { id: 'account', name: 'Account', icon: User },
  { id: 'appearance', name: 'Appearance', icon: Palette },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'privacy', name: 'Privacy & Security', icon: Shield },
  { id: 'shortcuts', name: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'language', name: 'Language & Region', icon: Globe },
  { id: 'data', name: 'Data & Storage', icon: Download },
];

export default function Settings() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('account');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Account settings
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    achievements: true,
    friendRequests: true,
    messages: true,
    partyInvites: true,
    tokenEarned: true,
    marketplaceUpdates: false,
    newsletter: false,
  });

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public' as 'public' | 'friends' | 'private',
    showOnlineStatus: true,
    showCurrentGame: true,
    allowFriendRequests: true,
    showAchievements: true,
  });

  // Appearance settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'dark' as 'dark' | 'light' | 'auto',
    compactMode: false,
    showAnimations: true,
    fontSize: 'medium' as 'small' | 'medium' | 'large',
  });

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setEmail(profile.email || '');
      setBio(profile.bio || '');
      loadSettings();
    }
  }, [profile]);

  const loadSettings = async () => {
    if (!profile) return;

    try {
      // Load user preferences
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (data) {
        setNotificationSettings(data.notifications || notificationSettings);
        setPrivacySettings(data.privacy || privacySettings);
        setAppearanceSettings(data.appearance || appearanceSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveAccountSettings = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Validate username
      const usernameValidation = InputValidator.validateUsername(username);
      if (!usernameValidation.isValid) {
        toast.error(usernameValidation.errors[0]);
        setLoading(false);
        return;
      }

      // Validate bio
      const bioValidation = InputValidator.validateBio(bio);
      if (!bioValidation.isValid) {
        toast.error(bioValidation.errors[0]);
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Account settings saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (type: 'notifications' | 'privacy' | 'appearance') => {
    if (!profile) return;

    setLoading(true);
    try {
      const updates: any = {};
      
      if (type === 'notifications') updates.notifications = notificationSettings;
      if (type === 'privacy') updates.privacy = privacySettings;
      if (type === 'appearance') updates.appearance = appearanceSettings;

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: profile.id,
          ...updates,
        });

      if (error) throw error;

      toast.success('Preferences saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async () => {
    if (!profile) return;

    try {
      toast.info('Preparing your data export...');

      // Fetch all user data
      const [profileData, transactionsData, achievementsData, friendsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', profile.id).single(),
        supabase.from('token_transactions').select('*').eq('user_id', profile.id),
        supabase.from('user_achievements').select('*').eq('user_id', profile.id),
        supabase.from('friends').select('*').eq('user_id', profile.id),
      ]);

      const exportData = {
        profile: profileData.data,
        transactions: transactionsData.data,
        achievements: achievementsData.data,
        friends: friendsData.data,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tokenqube-data-export-${Date.now()}.json`;
      a.click();

      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const deleteAccount = async () => {
    if (!profile) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      'This will permanently delete all your data, tokens, achievements, and friends. Type DELETE to confirm.'
    );

    if (!doubleConfirm) return;

    try {
      setLoading(true);

      // Call delete account RPC function
      const { error } = await supabase.rpc('delete_user_account', {
        p_user_id: profile.id
      });

      if (error) throw error;

      toast.success('Account deleted successfully');
      await signOut();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 bg-[#0f0f0f] text-gray-500 rounded-lg border border-[#202225] cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{bio.length}/500 characters</p>
            </div>

            <button
              onClick={saveAccountSettings}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold disabled:opacity-50 transition-colors"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </button>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Theme</label>
              <div className="grid grid-cols-3 gap-4">
                {(['dark', 'light', 'auto'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setAppearanceSettings({ ...appearanceSettings, theme })}
                    className={`p-4 rounded-lg border-2 transition-colors capitalize ${
                      appearanceSettings.theme === theme
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                        : 'border-[#202225] hover:border-[#8B5CF6]/50'
                    }`}
                  >
                    <span className="text-white font-semibold">{theme}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-3">Font Size</label>
              <div className="grid grid-cols-3 gap-4">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setAppearanceSettings({ ...appearanceSettings, fontSize: size })}
                    className={`p-4 rounded-lg border-2 transition-colors capitalize ${
                      appearanceSettings.fontSize === size
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                        : 'border-[#202225] hover:border-[#8B5CF6]/50'
                    }`}
                  >
                    <span className="text-white font-semibold">{size}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg cursor-pointer">
                <span className="text-white font-semibold">Compact Mode</span>
                <input
                  type="checkbox"
                  checked={appearanceSettings.compactMode}
                  onChange={(e) => setAppearanceSettings({ ...appearanceSettings, compactMode: e.target.checked })}
                  className="w-5 h-5 rounded border-[#202225] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg cursor-pointer">
                <span className="text-white font-semibold">Show Animations</span>
                <input
                  type="checkbox"
                  checked={appearanceSettings.showAnimations}
                  onChange={(e) => setAppearanceSettings({ ...appearanceSettings, showAnimations: e.target.checked })}
                  className="w-5 h-5 rounded border-[#202225] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                />
              </label>
            </div>

            <button
              onClick={() => savePreferences('appearance')}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold disabled:opacity-50 transition-colors"
            >
              <Save className="w-5 h-5" />
              Save Preferences
            </button>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            {Object.entries(notificationSettings).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg cursor-pointer">
                <span className="text-white font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, [key]: e.target.checked })}
                  className="w-5 h-5 rounded border-[#202225] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                />
              </label>
            ))}

            <button
              onClick={() => savePreferences('notifications')}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold disabled:opacity-50 transition-colors mt-6"
            >
              <Save className="w-5 h-5" />
              Save Preferences
            </button>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Profile Visibility</label>
              <select
                value={privacySettings.profileVisibility}
                onChange={(e) => setPrivacySettings({ ...privacySettings, profileVisibility: e.target.value as any })}
                className="w-full px-4 py-3 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
              >
                <option value="public">Public - Anyone can view</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private - Only me</option>
              </select>
            </div>

            <div className="space-y-4">
              {Object.entries(privacySettings).filter(([key]) => key !== 'profileVisibility').map(([key, value]) => (
                <label key={key} className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg cursor-pointer">
                  <span className="text-white font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <input
                    type="checkbox"
                    checked={value as boolean}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, [key]: e.target.checked })}
                    className="w-5 h-5 rounded border-[#202225] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                  />
                </label>
              ))}
            </div>

            <button
              onClick={() => savePreferences('privacy')}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold disabled:opacity-50 transition-colors"
            >
              <Save className="w-5 h-5" />
              Save Preferences
            </button>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <div className="p-6 bg-[#0f0f0f] rounded-lg border border-[#202225]">
              <h3 className="text-lg font-bold text-white mb-2">Export Your Data</h3>
              <p className="text-gray-400 text-sm mb-4">
                Download all your TokenQube data in JSON format (GDPR compliant)
              </p>
              <button
                onClick={exportUserData}
                className="flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
              >
                <Download className="w-5 h-5" />
                Export Data
              </button>
            </div>

            <div className="p-6 bg-red-500/10 rounded-lg border border-red-500/20">
              <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete Account
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={deleteAccount}
                disabled={loading}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                Delete My Account
              </button>
            </div>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-4">
            {[
              { keys: 'Ctrl + K', action: 'Quick Search' },
              { keys: 'Ctrl + N', action: 'New Chat/DM' },
              { keys: 'Ctrl + /', action: 'Show All Shortcuts' },
              { keys: 'Esc', action: 'Close Modal/Dialog' },
              { keys: 'Ctrl + M', action: 'Toggle Mic' },
              { keys: 'Ctrl + D', action: 'Toggle Deafen' },
            ].map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg">
                <span className="text-white font-semibold">{shortcut.action}</span>
                <kbd className="px-3 py-1 bg-[#202225] text-gray-400 rounded-lg text-sm font-mono">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        );

      default:
        return <div className="text-gray-400">Section not implemented yet</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#1a1a1a] border-r border-[#202225] p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            Settings
          </h1>
        </div>

        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-gray-400 hover:bg-[#0f0f0f] hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold">{section.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold text-white mb-6">
            {sections.find(s => s.id === activeSection)?.name}
          </h2>

          {renderSection()}
        </div>
      </div>
    </div>
  );
}

