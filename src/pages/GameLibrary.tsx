import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Library, Star, Clock, Trophy, Filter, Grid, List } from 'lucide-react';

interface Game {
  id: string;
  game_id: string;
  game_name: string;
  platform: string;
  is_favorite: boolean;
  last_played_at: string | null;
  playtime_minutes: number;
  achievements_unlocked: number;
  metadata: any;
}

export default function GameLibrary() {
  const { profile } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'playtime' | 'name'>('recent');

  useEffect(() => {
    if (profile) {
      fetchLibrary();
    }
  }, [profile, filterPlatform, sortBy]);

  const fetchLibrary = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let query = supabase
        .from('user_game_library')
        .select('*')
        .eq('user_id', profile.id);

      if (filterPlatform !== 'all') {
        query = query.eq('platform', filterPlatform);
      }

      let { data, error } = await query;

      if (error) throw error;

      // Sort
      if (data) {
        data = data.sort((a, b) => {
          if (sortBy === 'recent' && a.last_played_at && b.last_played_at) {
            return new Date(b.last_played_at).getTime() - new Date(a.last_played_at).getTime();
          } else if (sortBy === 'playtime') {
            return b.playtime_minutes - a.playtime_minutes;
          } else if (sortBy === 'name') {
            return a.game_name.localeCompare(b.game_name);
          }
          return 0;
        });
      }

      setGames(data || []);
    } catch (error) {
      console.error('Error fetching library:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (gameId: string, isFavorite: boolean) => {
    try {
      await supabase
        .from('user_game_library')
        .update({ is_favorite: !isFavorite })
        .eq('id', gameId);

      fetchLibrary();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const platforms = ['all', 'steam', 'epic', 'xbox', 'playstation', 'switch'];

  return (
    <div className="h-full w-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0f0f0f]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Library className="w-8 h-8 text-[#8B5CF6]" />
          Game Library
        </h1>
        <p className="text-gray-400">Your cross-platform gaming collection</p>
      </div>

      {/* Filters & Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Platform Filter */}
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
        >
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p === 'all' ? 'All Platforms' : p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
        >
          <option value="recent">Recently Played</option>
          <option value="playtime">Most Played</option>
          <option value="name">Name (A-Z)</option>
        </select>

        {/* View Mode */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-[#8B5CF6] text-white' : 'bg-[#1a1a1a] text-gray-400'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-[#8B5CF6] text-white' : 'bg-[#1a1a1a] text-gray-400'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Games */}
      {loading ? (
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-4`}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#1a1a1a] rounded-xl h-48"></div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-16">
          <Library className="w-24 h-24 mx-auto mb-4 text-gray-600" />
          <h3 className="text-2xl font-bold text-white mb-2">No Games Yet</h3>
          <p className="text-gray-400">Connect your gaming accounts to sync your library!</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-[#1a1a1a] rounded-xl p-4 border border-[#202225] hover:border-[#8B5CF6] transition-all"
            >
              {/* Game Icon/Image */}
              <div className="aspect-square bg-[#0f0f0f] rounded-lg mb-3 flex items-center justify-center">
                <Library className="w-12 h-12 text-gray-600" />
              </div>

              {/* Game Info */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-white font-bold line-clamp-1 flex-1">{game.game_name}</h3>
                <button
                  onClick={() => toggleFavorite(game.id, game.is_favorite)}
                  className={`ml-2 ${game.is_favorite ? 'text-yellow-500' : 'text-gray-600'} hover:text-yellow-400 transition-colors`}
                >
                  <Star className={`w-5 h-5 ${game.is_favorite ? 'fill-yellow-500' : ''}`} />
                </button>
              </div>

              <p className="text-sm text-gray-400 mb-3 capitalize">{game.platform}</p>

              {/* Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Playtime
                  </span>
                  <span className="text-white font-semibold">
                    {(game.playtime_minutes / 60).toFixed(1)}h
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Achievements
                  </span>
                  <span className="text-white font-semibold">
                    {game.achievements_unlocked}
                  </span>
                </div>
              </div>

              {game.last_played_at && (
                <p className="text-xs text-gray-600 mt-3">
                  Last played {new Date(game.last_played_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-[#1a1a1a] rounded-xl p-4 border border-[#202225] hover:border-[#8B5CF6] transition-all"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-16 h-16 bg-[#0f0f0f] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Library className="w-8 h-8 text-gray-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold">{game.game_name}</h3>
                    <button
                      onClick={() => toggleFavorite(game.id, game.is_favorite)}
                      className={`${game.is_favorite ? 'text-yellow-500' : 'text-gray-600'} hover:text-yellow-400 transition-colors`}
                    >
                      <Star className={`w-4 h-4 ${game.is_favorite ? 'fill-yellow-500' : ''}`} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 capitalize">{game.platform}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-white font-bold">{(game.playtime_minutes / 60).toFixed(1)}h</p>
                    <p className="text-gray-500 text-xs">Playtime</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold">{game.achievements_unlocked}</p>
                    <p className="text-gray-500 text-xs">Achievements</p>
                  </div>
                  {game.last_played_at && (
                    <div className="text-center">
                      <p className="text-white font-bold text-xs">
                        {new Date(game.last_played_at).toLocaleDateString()}
                      </p>
                      <p className="text-gray-500 text-xs">Last Played</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

