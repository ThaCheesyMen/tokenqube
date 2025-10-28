import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { X, GripVertical, Settings, Eye, EyeOff } from 'lucide-react';
import PerformanceDashboardWidget from '../components/PerformanceDashboardWidget';
import QuickGameLaunchWidget from '../components/QuickGameLaunchWidget';
import NotificationsWidget from '../components/NotificationsWidget';
import VoiceChatStatusWidget from '../components/VoiceChatStatusWidget';

export default function Overlay() {
  const { profile } = useAuth();
  const [opacity, setOpacity] = useState(0.95);
  const [compact, setCompact] = useState(false);
  const [widgets, setWidgets] = useState({
    performance: true,
    notifications: true,
    voice: true,
    quickLaunch: false
  });

  useEffect(() => {
    // Listen for escape key to close overlay
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && window.electron) {
        window.electron.closeOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    if (window.electron) {
      window.electron.closeOverlay();
    }
  };

  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
    if (window.electron) {
      window.electron.setOverlayOpacity(newOpacity);
    }
  };

  const toggleWidget = (widget: keyof typeof widgets) => {
    setWidgets(prev => ({ ...prev, [widget]: !prev[widget] }));
  };

  return (
    <div
      className="w-full h-full bg-[#0f0f0f] border-2 border-[#8B5CF6] rounded-xl overflow-hidden flex flex-col"
      style={{ opacity }}
    >
      {/* Header with drag handle */}
      <div className="bg-[#1a1a1a] border-b border-[#202225] p-3 flex items-center justify-between cursor-move select-none drag-handle">
        <div className="flex items-center gap-2">
          <GripVertical className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-bold text-white">TokenQube Overlay</span>
          <span className="text-xs text-gray-400">(Press F9 to toggle)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompact(!compact)}
            className="p-1.5 hover:bg-[#202225] rounded transition-colors"
            title="Toggle compact mode"
          >
            {compact ? <Eye className="w-4 h-4 text-gray-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
          </button>

          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
            title="Close overlay (F9)"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Opacity Control */}
      {!compact && (
        <div className="bg-[#1a1a1a] border-b border-[#202225] p-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Opacity:</span>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-[#202225] rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
            />
            <span className="text-xs text-white font-mono">{Math.round(opacity * 100)}%</span>
          </div>
        </div>
      )}

      {/* Widget Toggles */}
      {!compact && (
        <div className="bg-[#1a1a1a] border-b border-[#202225] p-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleWidget('performance')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                widgets.performance
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#202225] text-gray-400'
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => toggleWidget('notifications')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                widgets.notifications
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#202225] text-gray-400'
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => toggleWidget('voice')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                widgets.voice
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#202225] text-gray-400'
              }`}
            >
              Voice
            </button>
            <button
              onClick={() => toggleWidget('quickLaunch')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                widgets.quickLaunch
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#202225] text-gray-400'
              }`}
            >
              Quick Launch
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {compact ? (
          // Compact Mode - Minimal Info
          <div className="space-y-2">
            <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#202225]">
              <p className="text-xs text-gray-400">Press F9 to expand overlay</p>
            </div>
          </div>
        ) : (
          // Full Mode - Show Selected Widgets
          <>
            {widgets.performance && <PerformanceDashboardWidget />}
            {widgets.notifications && <NotificationsWidget onNavigate={() => {}} />}
            {widgets.voice && <VoiceChatStatusWidget onNavigate={() => {}} />}
            {widgets.quickLaunch && <QuickGameLaunchWidget />}
          </>
        )}
      </div>

      {/* Footer */}
      {!compact && (
        <div className="bg-[#1a1a1a] border-t border-[#202225] p-2 text-center">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-[#202225] rounded text-[#8B5CF6]">Esc</kbd> or{' '}
            <kbd className="px-1.5 py-0.5 bg-[#202225] rounded text-[#8B5CF6]">F9</kbd> to close
          </p>
        </div>
      )}
    </div>
  );
}

