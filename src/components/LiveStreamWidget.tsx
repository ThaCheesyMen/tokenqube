import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Radio, Eye, Play, ExternalLink, Video } from 'lucide-react';

interface LiveStreamWidgetProps {
  onNavigate: (page: string) => void;
}

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  is_live: boolean;
  viewer_count: number;
  started_at: string;
}

export default function LiveStreamWidget({ onNavigate }: LiveStreamWidgetProps) {
  const { profile } = useAuth();
  const [myStream, setMyStream] = useState<LiveStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchMyStream();
      
      // Subscribe to stream updates
      const channel = supabase
        .channel('my_stream_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_streams',
            filter: `streamer_id=eq.${profile.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setMyStream(payload.new as LiveStream);
            } else if (payload.eventType === 'DELETE') {
              setMyStream(null);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const fetchMyStream = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('streamer_id', profile.id)
        .eq('is_live', true)
        .maybeSingle();

      if (!error && data) {
        setMyStream(data);
      }
    } catch (error) {
      console.error('Error fetching stream:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStreamDuration = () => {
    if (!myStream?.started_at) return '0:00';
    const start = new Date(myStream.started_at).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-br from-[#2f3136] to-[#202225] rounded-xl shadow-2xl border border-[#40444b] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-pink-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Live Streaming</h2>
              <p className="text-sm text-white/80">Broadcast to your community</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
        ) : myStream?.is_live ? (
          /* Live Stream Preview */
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {/* Thumbnail/Preview Image */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                <Video className="w-24 h-24 text-white/30" />
              </div>
              
              {/* Live Indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white font-bold text-sm">LIVE</span>
              </div>

              {/* Viewer Count */}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1">
                <Eye className="w-4 h-4 text-white" />
                <span className="text-white font-semibold text-sm">{myStream.viewer_count}</span>
              </div>

              {/* Stream Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white font-bold">{myStream.title}</p>
                {myStream.description && (
                  <p className="text-gray-300 text-sm mt-1 line-clamp-1">{myStream.description}</p>
                )}
                <p className="text-gray-400 text-xs mt-2">Live for {getStreamDuration()}</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('livestudio')}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 rounded-lg font-bold hover:from-red-600 hover:to-pink-600 transition shadow-lg flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              Go to Live Studio
            </button>
          </div>
        ) : (
          /* Offline - Go to Studio */
          <div className="space-y-4">
            <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden">
              {/* Thumbnail */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Radio className="w-20 h-20 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 font-semibold">You're Offline</p>
                  <p className="text-gray-600 text-sm mt-1">Start streaming from Live Studio</p>
                </div>
              </div>
              
              {/* Offline Indicator */}
              <div className="absolute top-3 left-3 bg-[#1a1a1a] px-3 py-1.5 rounded-full">
                <span className="text-white font-bold text-sm">OFFLINE</span>
              </div>

              {/* Profile Thumbnail Overlay */}
              {(profile as any)?.avatar_url && (
                <div className="absolute bottom-3 left-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                    <img 
                      src={(profile as any).avatar_url} 
                      alt={profile?.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate('livestudio')}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 rounded-lg font-bold hover:from-red-600 hover:to-pink-600 transition shadow-lg flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Open Live Studio
            </button>

            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <p className="text-gray-300 text-sm">
                <span className="font-semibold text-white">Pro Tip:</span> Use Live Studio to manage your stream settings, view analytics, and interact with your viewers in real-time.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
