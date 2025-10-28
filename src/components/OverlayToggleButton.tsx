import { useState, useEffect } from 'react';
import { Monitor, MonitorOff, Maximize2 } from 'lucide-react';

export default function OverlayToggleButton() {
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(!!window.electron);

    // Check initial overlay status
    if (window.electron && window.electron.isOverlayEnabled) {
      window.electron.isOverlayEnabled().then(setOverlayEnabled);
    }

    // Listen for overlay toggle events
    if (window.electron && window.electron.onOverlayToggled) {
      window.electron.onOverlayToggled((enabled: boolean) => {
        setOverlayEnabled(enabled);
      });
    }
  }, []);

  const toggleOverlay = async () => {
    if (window.electron && window.electron.toggleOverlay) {
      const newState = await window.electron.toggleOverlay();
      setOverlayEnabled(newState);
    }
  };

  if (!isElectron) {
    return null; // Only show in Electron app
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-4 border border-[#202225]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${overlayEnabled ? 'bg-green-500' : 'bg-gray-600'}`}>
            {overlayEnabled ? (
              <Monitor className="w-4 h-4 text-white" />
            ) : (
              <MonitorOff className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Desktop Overlay</h3>
            <p className="text-xs text-gray-400">
              {overlayEnabled ? 'Active (Press F9)' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={toggleOverlay}
        className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
          overlayEnabled
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white'
        }`}
      >
        {overlayEnabled ? (
          <>
            <MonitorOff className="w-4 h-4" />
            Disable Overlay
          </>
        ) : (
          <>
            <Maximize2 className="w-4 h-4" />
            Enable Overlay
          </>
        )}
      </button>

      {!overlayEnabled && (
        <div className="mt-3 p-2 bg-[#0f0f0f] rounded-lg border border-[#202225]">
          <p className="text-xs text-gray-400">
            <strong className="text-[#8B5CF6]">Tip:</strong> Press <kbd className="px-1 py-0.5 bg-[#202225] rounded text-xs">F9</kbd> anytime to toggle overlay
          </p>
        </div>
      )}
    </div>
  );
}

