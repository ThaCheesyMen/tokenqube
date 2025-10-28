import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Clock, Users, Activity, Cpu, Wifi, X, GripVertical } from 'lucide-react';

interface OverlayWidget {
  id: string;
  type: 'clock' | 'friends' | 'performance' | 'fps';
  position: { x: number; y: number };
  visible: boolean;
}

export default function FloatingOverlay() {
  const { profile } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [cpuUsage, setCpuUsage] = useState(0);
  const [onlineFriends, setOnlineFriends] = useState(0);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate FPS and performance metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(Math.floor(90 + Math.random() * 50));
      setLatency(Math.floor(20 + Math.random() * 30));
      setCpuUsage(Math.floor(30 + Math.random() * 40));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch online friends count
  useEffect(() => {
    if (!profile) return;

    const fetchOnlineFriends = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('status', 'online')
        .neq('id', profile.id)
        .limit(20);
      
      setOnlineFriends(data?.length || 0);
    };

    fetchOnlineFriends();
    const interval = setInterval(fetchOnlineFriends, 10000);
    return () => clearInterval(interval);
  }, [profile]);

  const handleClose = () => {
    if (window.electron) {
      window.electron.closeOverlay();
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Clock Widget - Top Left */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="bg-black/80 backdrop-blur-md rounded-lg px-4 py-2 border border-[#8B5CF6]/30 shadow-2xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8B5CF6]" />
            <span className="text-white font-mono text-lg font-bold">
              {currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Friends Online Widget - Top Right */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <div className="bg-black/80 backdrop-blur-md rounded-lg px-4 py-2 border border-[#8B5CF6]/30 shadow-2xl">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-400" />
            <span className="text-white font-medium text-sm">
              <span className="text-green-400 font-bold">{onlineFriends}</span> Online
            </span>
          </div>
        </div>
      </div>

      {/* FPS Counter - Bottom Right */}
      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <div className="bg-black/80 backdrop-blur-md rounded-lg px-3 py-2 border border-[#8B5CF6]/30 shadow-2xl">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-mono text-sm font-bold">
                {fps} FPS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-3 h-3 text-blue-400" />
              <span className="text-gray-300 font-mono text-xs">
                {latency}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CPU Usage Widget - Bottom Left */}
      <div className="absolute bottom-4 left-4 pointer-events-auto">
        <div className="bg-black/80 backdrop-blur-md rounded-lg px-4 py-2 border border-[#8B5CF6]/30 shadow-2xl">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm">CPU</span>
              <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#8B5CF6] to-purple-400 transition-all duration-300"
                  style={{ width: `${cpuUsage}%` }}
                />
              </div>
              <span className="text-gray-300 font-mono text-xs">{cpuUsage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Close Overlay Button - Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <button
          onClick={handleClose}
          className="bg-black/80 backdrop-blur-md rounded-lg px-3 py-2 border border-red-500/30 shadow-2xl hover:bg-red-500/20 transition-all"
        >
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-medium text-xs">Close Overlay (F9)</span>
          </div>
        </button>
      </div>

      {/* TokenQube Watermark - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 border border-[#8B5CF6]/20">
          <span className="text-[#8B5CF6] font-bold text-xs">TokenQube</span>
        </div>
      </div>
    </div>
  );
}

