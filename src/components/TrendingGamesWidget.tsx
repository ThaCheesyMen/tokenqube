import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Users, Clock, Gamepad2 } from 'lucide-react';

interface TrendingGame {
  game_name: string;
  player_count: number;
  total_hours: number;
  trending_score: number;
}

export default function TrendingGamesWidget() {
  const [trendingGames, setTrendingGames] = useState<TrendingGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingGames();
    const interval = setInterval(fetchTrendingGames, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchTrendingGames = async () => {
    try {
      // Get top games by active players in last 24 hours
      const { data, error } = await supabase
        .from('user_games')
        .select('game_name, total_playtime_hours')
        .gte('last_played_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('total_playtime_hours', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Aggregate by game_name
      const gameStats = new Map<string, { count: number; hours: number }>();
      
      data?.forEach((game) => {
        const existing = gameStats.get(game.game_name) || { count: 0, hours: 0 };
        gameStats.set(game.game_name, {
          count: existing.count + 1,
          hours: existing.hours + (game.total_playtime_hours || 0)
        });
      });

      // Convert to array and calculate trending score
      const trending: TrendingGame[] = Array.from(gameStats.entries())
        .map(([game_name, stats]) => ({
          game_name,
          player_count: stats.count,
          total_hours: stats.hours,
          trending_score: stats.count * 10 + stats.hours
        }))
        .sort((a, b) => b.trending_score - a.trending_score)
        .slice(0, 5);

      setTrendingGames(trending);
    } catch (error) {
      console.error('Error fetching trending games:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#2f3136] to-[#202225] rounded-xl shadow-2xl border border-[#40444b] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Trending Games</h2>
            <p className="text-sm text-white/80">What the community is playing</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-[#1a1a1a] rounded-lg h-16 animate-pulse"></div>
            ))}
          </div>
        ) : trendingGames.length === 0 ? (
          <div className="text-center py-8">
            <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No trending games yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trendingGames.map((game, index) => (
              <div
                key={game.game_name}
                className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#4a4f59] transition cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                    'bg-[#1a1a1a] text-gray-400'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Game Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-lg group-hover:text-[#8B5CF6] transition truncate">
                      {game.game_name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{game.player_count} {game.player_count === 1 ? 'player' : 'players'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{game.total_hours.toFixed(0)}h played</span>
                      </div>
                    </div>
                  </div>

                  {/* Trending Indicator */}
                  <div className="text-green-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

