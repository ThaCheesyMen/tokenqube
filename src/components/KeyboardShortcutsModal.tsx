import { X, Keyboard, Command } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['Ctrl', 'K'], description: 'Quick Search', category: 'Navigation' },
  { keys: ['Ctrl', 'N'], description: 'New Chat/DM', category: 'Navigation' },
  { keys: ['Ctrl', 'H'], description: 'Go to Dashboard', category: 'Navigation' },
  { keys: ['Ctrl', 'F'], description: 'Go to Friends', category: 'Navigation' },
  { keys: ['Ctrl', 'M'], description: 'Go to Marketplace', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close Modal/Dialog', category: 'Navigation' },

  // Chat
  { keys: ['Ctrl', 'Enter'], description: 'Send Message', category: 'Chat' },
  { keys: ['Shift', 'Enter'], description: 'New Line in Message', category: 'Chat' },
  { keys: ['↑'], description: 'Edit Last Message', category: 'Chat' },
  { keys: ['Ctrl', 'E'], description: 'Open Emoji Picker', category: 'Chat' },
  { keys: ['Ctrl', 'G'], description: 'Open GIF Picker', category: 'Chat' },

  // Voice Chat
  { keys: ['Ctrl', 'Shift', 'M'], description: 'Toggle Mute', category: 'Voice' },
  { keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle Deafen', category: 'Voice' },
  { keys: ['Ctrl', 'Shift', 'V'], description: 'Start/Stop Video', category: 'Voice' },
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Start/Stop Screen Share', category: 'Voice' },

  // General
  { keys: ['Ctrl', '/'], description: 'Show All Shortcuts', category: 'General' },
  { keys: ['Ctrl', ','], description: 'Open Settings', category: 'General' },
  { keys: ['Ctrl', 'R'], description: 'Refresh Page', category: 'General' },
  { keys: ['Ctrl', 'Shift', 'I'], description: 'Open Developer Tools', category: 'General' },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const formatKey = (key: string) => {
    if (isMac) {
      if (key === 'Ctrl') return '⌘';
      if (key === 'Alt') return '⌥';
      if (key === 'Shift') return '⇧';
    }
    return key;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[#1a1a1a] rounded-xl max-w-4xl w-full border border-[#202225] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#202225] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#8B5CF6]/20 rounded-lg">
              <Keyboard className="w-6 h-6 text-[#8B5CF6]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-400">Boost your productivity with these shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#0f0f0f] rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {categories.map((category) => (
            <div key={category} className="mb-8 last:mb-0">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Command className="w-5 h-5 text-[#8B5CF6]" />
                {category}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg border border-[#202225] hover:border-[#8B5CF6]/50 transition-colors"
                    >
                      <span className="text-white font-medium">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <div key={keyIndex} className="flex items-center">
                            {keyIndex > 0 && (
                              <span className="mx-1 text-gray-600">+</span>
                            )}
                            <kbd className="px-3 py-1.5 bg-[#1a1a1a] border border-[#202225] text-gray-300 rounded-lg text-sm font-mono shadow-sm min-w-[2.5rem] text-center">
                              {formatKey(key)}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {/* Platform Info */}
          <div className="mt-8 p-4 bg-[#8B5CF6]/10 rounded-lg border border-[#8B5CF6]/20">
            <p className="text-sm text-gray-400 text-center">
              {isMac ? (
                <>⌘ Command  •  ⌥ Option  •  ⇧ Shift</>
              ) : (
                <>Using Windows/Linux shortcuts. On Mac, Ctrl = ⌘ Command</>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#202225] flex items-center justify-between bg-[#0f0f0f]">
          <p className="text-sm text-gray-400">
            Press <kbd className="px-2 py-1 bg-[#1a1a1a] border border-[#202225] text-gray-300 rounded text-xs font-mono">Ctrl + /</kbd> anytime to open this menu
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook to manage keyboard shortcuts modal
export function useKeyboardShortcuts() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + / to open shortcuts modal
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Esc to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return { isOpen, setIsOpen };
}

import React from 'react';

