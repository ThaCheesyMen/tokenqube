import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { X, Smile, Clock } from 'lucide-react';
import { toast } from './Toast';

interface StatusPreset {
  id: string;
  label: string;
  emoji: string;
  duration_minutes: number | null;
  category: string;
}

interface CustomStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus?: string;
  currentEmoji?: string;
}

export default function CustomStatusModal({
  isOpen,
  onClose,
  currentStatus = '',
  currentEmoji = '',
}: CustomStatusModalProps) {
  const { profile } = useAuth();
  const [statusText, setStatusText] = useState(currentStatus);
  const [statusEmoji, setStatusEmoji] = useState(currentEmoji);
  const [duration, setDuration] = useState<number | null>(null);
  const [presets, setPresets] = useState<StatusPreset[]>([]);
  const [loading, setLoading] = useState(false);

  const commonEmojis = ['😀', '😎', '🎮', '💤', '📞', '📚', '🔴', '🎥', '🍕', '💪', '😴', '🎯', '🚀', '⚡', '🔥'];
  const durations = [
    { label: 'Don\'t clear', value: null },
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: '4 hours', value: 240 },
    { label: '8 hours', value: 480 },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchPresets();
    }
  }, [isOpen]);

  const fetchPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('status_presets')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      if (data) setPresets(data);
    } catch (error) {
      console.error('Error fetching status presets:', error);
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!statusText.trim() && !statusEmoji.trim()) {
      await clearStatus();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('set_custom_status', {
        p_user_id: profile.id,
        p_custom_status: statusText.trim() || null,
        p_status_emoji: statusEmoji.trim() || null,
        p_expires_minutes: duration,
      });

      if (error) throw error;

      toast.success('Status updated');
      onClose();
    } catch (error) {
      console.error('Error setting custom status:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const clearStatus = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          custom_status: null,
          status_emoji: null,
          status_expires_at: null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Status cleared');
      onClose();
    } catch (error) {
      console.error('Error clearing status:', error);
      toast.error('Failed to clear status');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: StatusPreset) => {
    setStatusText(preset.label);
    setStatusEmoji(preset.emoji);
    setDuration(preset.duration_minutes);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg w-full max-w-lg border border-[#202225]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#202225]">
          <h2 className="text-xl font-bold text-white">Set Custom Status</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
          {/* Status Input */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Status Message</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusEmoji('')}
                className="p-3 bg-[#0f0f0f] hover:bg-[#2f3136] rounded-lg border border-[#202225] text-2xl flex items-center justify-center w-14 h-14 transition-colors"
                title="Choose emoji"
              >
                {statusEmoji || <Smile className="w-5 h-5 text-gray-400" />}
              </button>
              <input
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What's your status?"
                maxLength={128}
                className="flex-1 px-4 py-3 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Quick Emojis</label>
            <div className="flex flex-wrap gap-2">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setStatusEmoji(emoji)}
                  className={`p-2 rounded-lg text-2xl hover:bg-[#2f3136] transition-colors ${
                    statusEmoji === emoji ? 'bg-[#8B5CF6]' : 'bg-[#0f0f0f]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Clear After
            </label>
            <select
              value={duration || ''}
              onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-3 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
            >
              {durations.map((dur) => (
                <option key={dur.label} value={dur.value || ''}>
                  {dur.label}
                </option>
              ))}
            </select>
          </div>

          {/* Presets */}
          {presets.length > 0 && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Quick Presets</label>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="flex items-center gap-2 p-3 bg-[#0f0f0f] hover:bg-[#2f3136] rounded-lg border border-[#202225] transition-colors text-left"
                  >
                    <span className="text-2xl">{preset.emoji}</span>
                    <span className="text-white text-sm">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-[#202225]">
          <button
            onClick={clearStatus}
            disabled={loading}
            className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            Clear Status
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-[#0f0f0f] hover:bg-[#2f3136] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

