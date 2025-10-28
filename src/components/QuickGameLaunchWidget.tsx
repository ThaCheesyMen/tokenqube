import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Gamepad2, Play, Clock, ExternalLink } from 'lucide-react';

interface Game {
  game_name: string;
  game_id?: string;
  platform: string;
  total_playtime?: number;
  last_played_at?: string;
  image_url?: string;
}

export default function QuickGameLaunchWidget() {
  const { profile } = useAuth();
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchRecentGames();
  }, [profile]);

  const fetchRecentGames = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Get recently played games from user_games
      const { data: gamesData, error } = await supabase
        .from('user_games')
        .select('game_name, game_id, platform, total_playtime, last_played_at, image_url')
        .eq('user_id', profile.id)
        .order('last_played_at', { ascending: false, nullsFirst: false })
        .limit(6);

      if (error) throw error;

      setRecentGames(gamesData || []);
    } catch (error) {
      console.error('Error fetching recent games:', error);
    } finally {
      setLoading(false);
    }
  };

  const launchGame = async (game: Game) => {
    if (!profile) return;

    try {
      // Log the game launch
      await supabase.from('game_launches').insert({
        user_id: profile.id,
        game_name: game.game_name,
        game_id: game.game_id,
        platform: game.platform
      });

      // Notify Electron to launch the game
      if (window.electron) {
        console.log(`🚀 Launching ${game.game_name}...`);
        // TODO: Implement actual game launch via Electron
      } else {
        alert(`Launching ${game.game_name}...\n(Desktop app required for direct launch)`);
      }
    } catch (error) {
      console.error('Error launching game:', error);
    }
  };

  const formatPlaytime = (minutes?: number) => {
    if (!minutes) return '0h';
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes}m`;
    return `${hours}h`;
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Quick Launch</h2>
            <p className="text-xs text-gray-400">Recently played games</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[#0f0f0f] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : recentGames.length === 0 ? (
        <div className="text-center py-8">
          <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No recent games</p>
          <p className="text-gray-500 text-xs mt-1">Start playing to see them here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {recentGames.map((game, index) => (
            <div
              key={index}
              onClick={() => launchGame(game)}
              className="bg-[#0f0f0f] rounded-lg overflow-hidden border border-[#202225] hover:border-[#8B5CF6] transition-all cursor-pointer group relative"
            >
              {/* Game Cover/Background */}
              <div className="h-20 relative overflow-hidden">
                {game.cover_image ? (
                  <img
                    src={game.cover_image}
                    alt={game.game_name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center">
                    <Gamepad2 className="w-8 h-8 text-white/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <div className="p-3 bg-[#8B5CF6] rounded-full">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
              </div>

              {/* Game Info */}
              <div className="p-3 absolute bottom-0 left-0 right-0">
                <h3 className="text-sm font-bold text-white truncate mb-1">
                  {game.game_name}
                </h3>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatPlaytime(game.total_playtime)}</span>
                  </div>
                  <span className="text-gray-500 capitalize text-xs">
                    {game.platform}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {recentGames.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#202225]">
          <button
            onClick={() => {
              // Navigate to full games library
              alert('Opening full games library...');
            }}
            className="w-full py-2 text-sm text-[#8B5CF6] hover:text-[#7C3AED] transition-colors font-medium flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View All Games
          </button>
        </div>
      )}
    </div>
  );
}

