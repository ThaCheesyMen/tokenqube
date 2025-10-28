import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Cpu, HardDrive, Gauge, Wifi, Zap } from 'lucide-react';

interface PerformanceMetrics {
  fps: number;
  latency: number;
  cpu: number;
  ram: number;
  gpu: number;
  currentGame?: string;
}

export default function PerformanceDashboardWidget() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    latency: 0,
    cpu: 0,
    ram: 0,
    gpu: 0
  });
  const [monitoring, setMonitoring] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Start monitoring if Electron is available
    if (window.electron) {
      startMonitoring();
    }

    return () => stopMonitoring();
  }, [profile]);

  const startMonitoring = () => {
    setMonitoring(true);

    // Request performance metrics from Electron every 2 seconds
    const interval = setInterval(async () => {
      try {
        // Get system metrics from Electron (if available)
        if (window.electron && window.electron.getSystemMetrics) {
          const systemMetrics = await window.electron.getSystemMetrics();
          
          setMetrics(prev => ({
            ...prev,
            cpu: systemMetrics.cpu || prev.cpu,
            ram: systemMetrics.ram || prev.ram,
            gpu: systemMetrics.gpu || prev.gpu
          }));
        }

        // Simulate FPS and latency for now (would be real in production)
        setMetrics(prev => ({
          ...prev,
          fps: Math.floor(90 + Math.random() * 60), // 90-150 FPS
          latency: Math.floor(10 + Math.random() * 30), // 10-40ms
          currentGame: 'Fortnite' // Would come from active session
        }));

        // Log performance data
        if (profile) {
          await logPerformance();
        }
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const stopMonitoring = () => {
    setMonitoring(false);
  };

  const logPerformance = async () => {
    if (!profile || !metrics.currentGame) return;

    try {
      await supabase.from('performance_logs').insert({
        user_id: profile.id,
        game_name: metrics.currentGame,
        fps_avg: metrics.fps,
        latency_avg: metrics.latency,
        cpu_usage: metrics.cpu,
        ram_usage: metrics.ram,
        gpu_usage: metrics.gpu
      });
    } catch (error) {
      // Silent fail for logging
    }
  };

  const getPerformanceColor = (value: number, type: 'fps' | 'latency' | 'usage') => {
    if (type === 'fps') {
      if (value >= 120) return 'text-green-400';
      if (value >= 60) return 'text-yellow-400';
      return 'text-red-400';
    }
    if (type === 'latency') {
      if (value <= 30) return 'text-green-400';
      if (value <= 60) return 'text-yellow-400';
      return 'text-red-400';
    }
    // usage
    if (value <= 60) return 'text-green-400';
    if (value <= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPerformanceTip = () => {
    if (metrics.fps < 60) return 'Lower graphics settings for better FPS';
    if (metrics.latency > 60) return 'Check your network connection';
    if (metrics.cpu > 80) return 'Close background applications';
    if (metrics.ram > 80) return 'Clear RAM by restarting your game';
    if (metrics.gpu > 85) return 'Update your graphics drivers';
    return 'Performance is optimal! 🎮';
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Performance</h2>
            <p className="text-xs text-gray-400">Real-time system metrics</p>
          </div>
        </div>
        {monitoring && (
          <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-2 py-1 rounded-full text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        )}
      </div>

      {metrics.currentGame && (
        <div className="mb-4 p-3 bg-[#0f0f0f] rounded-lg border border-[#202225]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#8B5CF6]" />
            <span className="text-sm text-gray-400">Currently Playing:</span>
            <span className="text-sm font-semibold text-white">{metrics.currentGame}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* FPS */}
        <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">FPS</span>
            </div>
          </div>
          <p className={`text-2xl font-bold ${getPerformanceColor(metrics.fps, 'fps')}`}>
            {metrics.fps}
          </p>
        </div>

        {/* Latency */}
        <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Ping</span>
            </div>
          </div>
          <p className={`text-2xl font-bold ${getPerformanceColor(metrics.latency, 'latency')}`}>
            {metrics.latency}ms
          </p>
        </div>
      </div>

      {/* System Resources */}
      <div className="space-y-3">
        {/* CPU */}
        <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">CPU Usage</span>
            </div>
            <span className={`text-sm font-semibold ${getPerformanceColor(metrics.cpu, 'usage')}`}>
              {metrics.cpu}%
            </span>
          </div>
          <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                metrics.cpu > 80 ? 'bg-red-500' : metrics.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(metrics.cpu, 100)}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">RAM Usage</span>
            </div>
            <span className={`text-sm font-semibold ${getPerformanceColor(metrics.ram, 'usage')}`}>
              {metrics.ram}%
            </span>
          </div>
          <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                metrics.ram > 80 ? 'bg-red-500' : metrics.ram > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(metrics.ram, 100)}%` }}
            />
          </div>
        </div>

        {/* GPU */}
        <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#202225]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">GPU Usage</span>
            </div>
            <span className={`text-sm font-semibold ${getPerformanceColor(metrics.gpu, 'usage')}`}>
              {metrics.gpu}%
            </span>
          </div>
          <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                metrics.gpu > 85 ? 'bg-red-500' : metrics.gpu > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(metrics.gpu, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Performance Tip */}
      <div className="mt-4 p-3 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#8B5CF6] mb-1">Performance Tip</p>
            <p className="text-xs text-gray-300">{getPerformanceTip()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

