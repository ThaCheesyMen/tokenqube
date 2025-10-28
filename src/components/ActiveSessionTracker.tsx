import { useEffect, useState } from 'react';
import { playtimeTracker } from '../services/PlaytimeTracker';
import { Clock, Gamepad2, Pause, Play, Square } from 'lucide-react';

export default function ActiveSessionTracker() {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const [manualTracking, setManualTracking] = useState(false);
  const [manualGameName, setManualGameName] = useState('');

  useEffect(() => {
    // Update active session every second
    const interval = setInterval(() => {
      const session = playtimeTracker.getActiveSession();
      setActiveSession(session);
      
      if (session) {
        setDuration(playtimeTracker.getSessionDuration());
      } else {
        setDuration(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (hours: number): string => {
    const totalMinutes = Math.floor(hours * 60);
    const displayHours = Math.floor(totalMinutes / 60);
    const displayMinutes = totalMinutes % 60;
    const displaySeconds = Math.floor((hours * 3600) % 60);

    if (displayHours > 0) {
      return `${displayHours}h ${displayMinutes}m`;
    } else if (displayMinutes > 0) {
      return `${displayMinutes}m ${displaySeconds}s`;
    } else {
      return `${displaySeconds}s`;
    }
  };

  const handleManualStart = () => {
    if (!manualGameName.trim()) return;
    
    playtimeTracker.manualStartTracking(
      manualGameName.toLowerCase().replace(/\s+/g, '-'),
      manualGameName,
      'PC'
    );
    
    setManualGameName('');
    setManualTracking(false);
  };

  const handleManualStop = () => {
    playtimeTracker.manualStopTracking();
  };

  if (!activeSession && !manualTracking) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#202225] hover:border-[#8B5CF6]/50 transition">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-500/20 rounded-lg">
              <Gamepad2 className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">No Active Session</h3>
              <p className="text-gray-400 text-xs">Start playing to track your time</p>
            </div>
          </div>
          <button
            onClick={() => setManualTracking(true)}
            className="p-2 bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg transition flex items-center gap-1.5 text-white text-xs font-medium"
          >
            <Play className="w-4 h-4" />
            <span>Manual Track</span>
          </button>
        </div>
        
        <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
          <p className="text-gray-500 text-xs text-center">
            🎮 Launch a game to start automatic tracking
          </p>
        </div>
      </div>
    );
  }

  if (manualTracking) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#202225]">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-[#8B5CF6]/20 rounded-lg">
            <Gamepad2 className="w-5 h-5 text-[#8B5CF6]" />
          </div>
          <h3 className="text-white font-semibold">Start Manual Tracking</h3>
        </div>
        
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Enter game name..."
            value={manualGameName}
            onChange={(e) => setManualGameName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualStart()}
            className="w-full bg-[#0f0f0f] border border-[#202225] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#8B5CF6] transition"
            autoFocus
          />
          
          <div className="flex gap-2">
            <button
              onClick={handleManualStart}
              disabled={!manualGameName.trim()}
              className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Tracking
            </button>
            <button
              onClick={() => setManualTracking(false)}
              className="px-4 bg-[#0f0f0f] hover:bg-[#2f3136] text-gray-400 hover:text-white py-2.5 rounded-lg font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active session display
  const tokensPerHour = 50;
  const estimatedTokens = Math.floor(duration * tokensPerHour);

  return (
    <div className="bg-gradient-to-br from-[#8B5CF6]/10 to-[#7C3AED]/5 rounded-xl p-5 border border-[#8B5CF6]/30 hover:border-[#8B5CF6]/50 transition">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-lg shadow-lg animate-pulse">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Now Playing
            </h3>
            <p className="text-gray-400 text-xs">Session Active</p>
          </div>
        </div>
        
        <button
          onClick={handleManualStop}
          className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition group"
          title="Stop Tracking"
        >
          <Square className="w-4 h-4 text-red-400 group-hover:text-red-300" />
        </button>
      </div>

      {/* Game Info */}
      <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4 border border-[#202225]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <h4 className="text-white font-bold text-lg truncate">{activeSession.gameName}</h4>
            <p className="text-gray-400 text-xs uppercase tracking-wider">{activeSession.platform}</p>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 text-[#8B5CF6] bg-[#8B5CF6]/10 rounded-lg px-3 py-2">
          <Clock className="w-4 h-4" />
          <span className="font-mono font-bold text-lg">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Earnings Preview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
          <div className="text-xs text-gray-400 mb-1">Est. Tokens</div>
          <div className="text-white font-bold text-lg">+{estimatedTokens}</div>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
          <div className="text-xs text-gray-400 mb-1">Hourly Rate</div>
          <div className="text-green-400 font-bold text-lg">{tokensPerHour}/hr</div>
        </div>
      </div>

      {/* Auto-sync indicator */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
        <span>Auto-syncing every 60 seconds</span>
      </div>
    </div>
  );
}

