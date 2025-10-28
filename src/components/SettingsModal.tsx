import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';
import {
  X, User, Mail, Lock, Eye, EyeOff, Camera, Upload, Shield,
  Bell, Moon, Sun, Globe, Users, Trash2, Check, Palette,
  Crown, Sparkles, Image as ImageIcon
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'profile' | 'account' | 'privacy' | 'appearance' | 'notifications';
type UserStatus = 'online' | 'idle' | 'dnd' | 'invisible';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);

  // Profile Tab States
  const [displayName, setDisplayName] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [customStatus, setCustomStatus] = useState(profile?.custom_status || '');
  const [statusEmoji, setStatusEmoji] = useState(profile?.status_emoji || '😎');
  const [userStatus, setUserStatus] = useState<UserStatus>(profile?.status || 'online');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Account Tab States
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Privacy Tab States
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'friends' | 'private'>(
    profile?.profile_visibility || 'public'
  );
  const [showEmail, setShowEmail] = useState(profile?.show_email || false);
  const [showGames, setShowGames] = useState(profile?.show_games !== false);
  const [showActivity, setShowActivity] = useState(profile?.show_activity !== false);

  // Appearance Tab States
  const [accentColor, setAccentColor] = useState(profile?.accent_color || '#8B5CF6');
  const [profileTheme, setProfileTheme] = useState<'default' | 'gradient' | 'dark' | 'custom'>(
    profile?.profile_theme || 'default'
  );

  if (!isOpen) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      setAvatarUrl(data.publicUrl);
      toast.success('Avatar uploaded! Click "Save Changes" to apply.');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Banner must be less than 10MB');
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}-banner-${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      setBannerUrl(data.publicUrl);
      toast.success('Banner uploaded! Click "Save Changes" to apply.');
    } catch (error: any) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to upload banner');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: displayName,
          bio,
          custom_status: customStatus,
          status_emoji: statusEmoji,
          status: userStatus,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          accent_color: accentColor,
          profile_theme: profileTheme,
          profile_visibility: profileVisibility,
          show_email: showEmail,
          show_games: showGames,
          show_activity: showActivity,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!email) {
      toast.error('Please enter a new email');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;

      toast.success('Verification email sent! Please check your inbox.');
      setEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions: { value: UserStatus; label: string; color: string; icon: string }[] = [
    { value: 'online', label: 'Online', color: 'bg-green-500', icon: '🟢' },
    { value: 'idle', label: 'Idle', color: 'bg-yellow-500', icon: '🟡' },
    { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500', icon: '🔴' },
    { value: 'invisible', label: 'Invisible', color: 'bg-[#0f0f0f]0', icon: '⚫' },
  ];

  const tabs = [
    { id: 'profile' as SettingsTab, name: 'My Profile', icon: User },
    { id: 'account' as SettingsTab, name: 'Account', icon: Shield },
    { id: 'privacy' as SettingsTab, name: 'Privacy', icon: Lock },
    { id: 'appearance' as SettingsTab, name: 'Appearance', icon: Palette },
    { id: 'notifications' as SettingsTab, name: 'Notifications', icon: Bell },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-[#1a1a1a] p-4 overflow-y-auto">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
            User Settings
          </h2>
          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#8B5CF6] text-white'
                      : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-[#40444b]">
            <button
              onClick={onClose}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-all"
            >
              <X className="w-5 h-5" />
              <span className="font-medium">Close</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#202225] px-6 py-4 flex items-center justify-between border-b border-[#40444b]">
            <h2 className="text-xl font-bold text-white">
              {tabs.find(t => t.id === activeTab)?.name}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1a1a1a] rounded-lg transition text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6 max-w-3xl">
                {/* Banner */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Profile Banner
                  </label>
                  <div className="relative h-32 bg-gradient-to-r from-[#8B5CF6] to-[#7289DA] rounded-lg overflow-hidden group">
                    {bannerUrl && (
                      <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => bannerInputRef.current?.click()}
                        className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Banner
                      </button>
                      {bannerUrl && (
                        <button
                          onClick={() => setBannerUrl('')}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Recommended: 960x540px, Max 10MB
                  </p>
                </div>

                {/* Avatar */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Avatar
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7289DA] flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          profile?.username?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition disabled:opacity-50"
                      >
                        {loading ? 'Uploading...' : 'Change Avatar'}
                      </button>
                      <p className="text-xs text-gray-400 mt-2">
                        Max 5MB, PNG or JPG
                      </p>
                    </div>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    className="w-full px-4 py-3 bg-[#202225] border border-[#40444b] rounded-lg text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    About Me
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                    rows={4}
                    maxLength={190}
                    className="w-full px-4 py-3 bg-[#202225] border border-[#40444b] rounded-lg text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {bio.length}/190 characters
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {statusOptions.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => setUserStatus(status.value)}
                        className={`px-4 py-3 rounded-lg font-medium transition flex items-center gap-3 ${
                          userStatus === status.value
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-[#202225] text-gray-300 hover:bg-[#1a1a1a]'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full ${status.color}`} />
                        <span>{status.label}</span>
                        {userStatus === status.value && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Status */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Custom Status
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={statusEmoji}
                      onChange={(e) => setStatusEmoji(e.target.value)}
                      placeholder="😎"
                      maxLength={2}
                      className="w-16 px-3 py-3 bg-[#202225] border border-[#40444b] rounded-lg text-center text-2xl focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value)}
                      placeholder="Playing games..."
                      maxLength={128}
                      className="flex-1 px-4 py-3 bg-[#202225] border border-[#40444b] rounded-lg text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Set a custom status with an emoji
                  </p>
                </div>
              </div>
            )}

            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div className="space-y-6 max-w-2xl">
                {/* Current Email */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#40444b]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Email Address</p>
                      <p className="text-sm text-gray-400">{profile?.email || 'No email set'}</p>
                    </div>
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Change Email */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Change Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="new.email@example.com"
                      className="flex-1 px-4 py-3 bg-[#202225] border border-[#40444b] rounded-lg text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                    />
                    <button
                      onClick={handleChangeEmail}
                      disabled={loading || !email}
                      className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    A verification email will be sent to your new address
                  </p>
                </div>

                {/* Change Password */}
                <div className="border-t border-[#40444b] pt-6">
                  <h3 className="text-lg font-bold text-white mb-4">Change Password</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-4 py-3 bg-[#202225] border border-[#40444b] rounded-lg text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full px-4 py-3 bg-[#202225] border border-[#40444b] rounded-lg text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-3 bg-[#202225] border border-[#40444b] rounded-lg text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                      />
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={loading || !newPassword || !confirmPassword}
                      className="w-full px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Change Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PRIVACY TAB */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 max-w-2xl">
                {/* Profile Visibility */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Profile Visibility
                  </label>
                  <div className="space-y-2">
                    {(['public', 'friends', 'private'] as const).map((visibility) => (
                      <button
                        key={visibility}
                        onClick={() => setProfileVisibility(visibility)}
                        className={`w-full px-4 py-3 rounded-lg font-medium transition flex items-center justify-between ${
                          profileVisibility === visibility
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-[#202225] text-gray-300 hover:bg-[#1a1a1a]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {visibility === 'public' && <Globe className="w-5 h-5" />}
                          {visibility === 'friends' && <Users className="w-5 h-5" />}
                          {visibility === 'private' && <Lock className="w-5 h-5" />}
                          <span className="capitalize">{visibility}</span>
                        </div>
                        {profileVisibility === visibility && <Check className="w-5 h-5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-white">Show Email</p>
                      <p className="text-xs text-gray-400">Display your email on your profile</p>
                    </div>
                    <button
                      onClick={() => setShowEmail(!showEmail)}
                      className={`relative w-12 h-6 rounded-full transition ${
                        showEmail ? 'bg-[#8B5CF6]' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          showEmail ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-white">Show Games</p>
                      <p className="text-xs text-gray-400">Display your game library</p>
                    </div>
                    <button
                      onClick={() => setShowGames(!showGames)}
                      className={`relative w-12 h-6 rounded-full transition ${
                        showGames ? 'bg-[#8B5CF6]' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          showGames ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-white">Show Activity</p>
                      <p className="text-xs text-gray-400">Display your recent activity</p>
                    </div>
                    <button
                      onClick={() => setShowActivity(!showActivity)}
                      className={`relative w-12 h-6 rounded-full transition ${
                        showActivity ? 'bg-[#8B5CF6]' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          showActivity ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 max-w-2xl">
                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-20 h-12 rounded-lg cursor-pointer"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-full px-4 py-3 bg-[#202225] border border-[#40444b] rounded-lg text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    This color will be used across your profile
                  </p>
                </div>

                {/* Profile Theme */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Profile Theme
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['default', 'gradient', 'dark', 'custom'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setProfileTheme(theme)}
                        className={`px-4 py-3 rounded-lg font-medium transition flex items-center gap-3 ${
                          profileTheme === theme
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-[#202225] text-gray-300 hover:bg-[#1a1a1a]'
                        }`}
                      >
                        {theme === 'default' && <Palette className="w-5 h-5" />}
                        {theme === 'gradient' && <Sparkles className="w-5 h-5" />}
                        {theme === 'dark' && <Moon className="w-5 h-5" />}
                        {theme === 'custom' && <Crown className="w-5 h-5" />}
                        <span className="capitalize">{theme}</span>
                        {profileTheme === theme && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 max-w-2xl">
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Notification Settings</h3>
                  <p className="text-gray-400">
                    Notification preferences coming soon!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {activeTab !== 'notifications' && (
            <div className="bg-[#202225] px-6 py-4 flex items-center justify-between border-t border-[#40444b]">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={activeTab === 'profile' || activeTab === 'privacy' || activeTab === 'appearance' ? handleSaveProfile : undefined}
                disabled={loading}
                className="px-6 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

