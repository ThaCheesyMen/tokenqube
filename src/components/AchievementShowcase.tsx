import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Award, Crown, Sparkles, Lock, Search, Filter, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from './Toast';

interface Achievement {
  id: string;
  game_id: string;
  game_name?: string;
  achievement_id: string;
  achievement_name: string;
  achievement_description: string;
  icon_url: string;
  unlocked: boolean;
  unlock_time: string | null;
  tokens_awarded: number;
  rarity_tier: 'common' | 'rare' | 'epic' | 'legendary';
  global_percentage: number | null;
}

interface GameGroup {
  game_id: string;
  game_name: string;
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
  totalTokens: number;
}

interface AchievementStats {
  total_achievements: number;
  unlocked_achievements: number;
  total_tokens_from_achievements: number;
  legendary_count: number;
  epic_count: number;
  rare_count: number;
  common_count: number;
  completion_percentage: number;
}

interface Props {
  userId: string;
}

export default function AchievementShowcase({ userId }: Props) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'rarity' | 'tokens'>('recent');
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped' | 'all'>('grouped');
  const [itemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAchievements();
    fetchStats();
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      // Fetch achievements with game names
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlock_time', { ascending: false, nullsFirst: false });

      if (achievementsError) throw achievementsError;

      // Fetch game names from user_games
      const { data: gamesData, error: gamesError } = await supabase
        .from('user_games')
        .select('game_id, game_name')
        .eq('user_id', userId);

      if (gamesError) throw gamesError;

      // Create a map of game_id to game_name
      const gameNamesMap = new Map(
        gamesData?.map(g => [g.game_id, g.game_name]) || []
      );

      // Add game names to achievements
      const achievementsWithNames = (achievementsData || []).map(ach => ({
        ...ach,
        game_name: gameNamesMap.get(ach.game_id) || `Game ${ach.game_id}`,
      }));

      setAchievements(achievementsWithNames);
    } catch (error: any) {
      console.error('Error fetching achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_achievement_stats', { p_user_id: userId });

      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching achievement stats:', error);
    }
  };

  const getRarityConfig = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return {
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500',
          glow: 'shadow-[0_0_20px_rgba(234,179,8,0.3)]',
          icon: Crown,
        };
      case 'epic':
        return {
          color: 'text-purple-400',
          bg: 'bg-purple-500/10',
          border: 'border-purple-500',
          glow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
          icon: Sparkles,
        };
      case 'rare':
        return {
          color: 'text-blue-400',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500',
          glow: 'shadow-[0_0_10px_rgba(59,130,246,0.2)]',
          icon: Award,
        };
      default:
        return {
          color: 'text-gray-400',
          bg: 'bg-[#0f0f0f]0/10',
          border: 'border-gray-500',
          glow: '',
          icon: Trophy,
        };
    }
  };

  const toggleGame = (gameId: string) => {
    const newExpanded = new Set(expandedGames);
    if (newExpanded.has(gameId)) {
      newExpanded.delete(gameId);
    } else {
      newExpanded.add(gameId);
    }
    setExpandedGames(newExpanded);
  };

  const filteredAchievements = achievements
    .filter((ach) => {
      // Search filter
      if (searchQuery && !ach.achievement_name.toLowerCase().includes(searchQuery.toLowerCase()) && !ach.game_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Rarity filter
      if (filterRarity !== 'all' && ach.rarity_tier !== filterRarity) {
        return false;
      }
      // Status filter
      if (filterStatus === 'unlocked' && !ach.unlocked) return false;
      if (filterStatus === 'locked' && ach.unlocked) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        if (!a.unlock_time) return 1;
        if (!b.unlock_time) return -1;
        return new Date(b.unlock_time).getTime() - new Date(a.unlock_time).getTime();
      }
      if (sortBy === 'tokens') {
        return b.tokens_awarded - a.tokens_awarded;
      }
      if (sortBy === 'rarity') {
        const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
        return rarityOrder[b.rarity_tier] - rarityOrder[a.rarity_tier];
      }
      return 0;
    });

  // Group achievements by game
  const gameGroups: GameGroup[] = [];
  const gameMap = new Map<string, Achievement[]>();

  filteredAchievements.forEach(ach => {
    if (!gameMap.has(ach.game_id)) {
      gameMap.set(ach.game_id, []);
    }
    gameMap.get(ach.game_id)!.push(ach);
  });

  gameMap.forEach((achievements, gameId) => {
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalTokens = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.tokens_awarded, 0);
    
    gameGroups.push({
      game_id: gameId,
      game_name: achievements[0].game_name || `Game ${gameId}`,
      achievements,
      unlockedCount,
      totalCount: achievements.length,
      totalTokens,
    });
  });

  // Sort game groups by most achievements unlocked
  gameGroups.sort((a, b) => b.unlockedCount - a.unlockedCount);

  // Pagination for "all" view
  const totalPages = Math.ceil(filteredAchievements.length / itemsPerPage);
  const paginatedAchievements = filteredAchievements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#8B5CF6] border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading achievements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#40444b]">
            <div className="text-3xl font-bold text-white">{stats.unlocked_achievements}</div>
            <div className="text-sm text-gray-400">Unlocked</div>
            <div className="text-xs text-gray-500">/ {stats.total_achievements} total</div>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#40444b]">
            <div className="text-3xl font-bold text-yellow-400">{stats.total_tokens_from_achievements.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Tokens Earned</div>
            <div className="text-xs text-gray-500">from achievements</div>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#40444b]">
            <div className="text-3xl font-bold text-[#8B5CF6]">{stats.completion_percentage}%</div>
            <div className="text-sm text-gray-400">Completion</div>
            <div className="h-2 bg-[#1a1a1a] rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#7289DA] transition-all"
                style={{ width: `${stats.completion_percentage}%` }}
              />
            </div>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#40444b]">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-lg font-bold text-yellow-400">{stats.legendary_count}</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-lg font-bold text-purple-400">{stats.epic_count}</span>
              <Award className="w-4 h-4 text-blue-400" />
              <span className="text-lg font-bold text-blue-400">{stats.rare_count}</span>
            </div>
            <div className="text-sm text-gray-400 mt-1">Rare Achievements</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#40444b]">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search games or achievements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#202225] border border-[#40444b] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
            />
          </div>

          {/* View Mode */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-4 py-2 bg-[#202225] border border-[#40444b] rounded-lg text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
          >
            <option value="grouped">By Game</option>
            <option value="all">All Achievements</option>
          </select>

          {/* Rarity Filter */}
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
            className="px-4 py-2 bg-[#202225] border border-[#40444b] rounded-lg text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
          >
            <option value="all">All Rarities</option>
            <option value="legendary">Legendary</option>
            <option value="epic">Epic</option>
            <option value="rare">Rare</option>
            <option value="common">Common</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-[#202225] border border-[#40444b] rounded-lg text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="unlocked">Unlocked</option>
            <option value="locked">Locked</option>
          </select>
        </div>
      </div>

      {/* Achievements Display */}
      {filteredAchievements.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Achievements Found</h3>
          <p className="text-gray-400">
            {searchQuery || filterRarity !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Sync your Steam games to start earning achievements!'}
          </p>
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped by Game View */
        <div className="space-y-4">
          {gameGroups.map((group) => (
            <div key={group.game_id} className="bg-[#1a1a1a] rounded-xl border border-[#40444b] overflow-hidden">
              {/* Game Header */}
              <button
                onClick={() => toggleGame(group.game_id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#0f0f0f] transition"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🎮</div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-white">{group.game_name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <span>{group.unlockedCount} / {group.totalCount} unlocked</span>
                      <span>•</span>
                      <span className="text-yellow-400 flex items-center gap-1">
                        🪙 {group.totalTokens} tokens
                      </span>
                      <span>•</span>
                      <span>{((group.unlockedCount / group.totalCount) * 100).toFixed(0)}% complete</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedGames.has(group.game_id) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Achievements Grid (Expanded) */}
              {expandedGames.has(group.game_id) && (
                <div className="p-4 bg-[#202225] border-t border-[#40444b]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {group.achievements.slice(0, 24).map((achievement) => {
                      const config = getRarityConfig(achievement.rarity_tier);
                      return (
                        <div
                          key={achievement.id}
                          className={`bg-[#1a1a1a] rounded-lg border ${config.border} overflow-hidden transition-all hover:scale-105 ${
                            !achievement.unlocked ? 'opacity-50' : config.glow
                          }`}
                          title={`${achievement.achievement_name}\n${achievement.achievement_description || ''}`}
                        >
                          {/* Achievement Icon */}
                          <div className={`aspect-square relative ${config.bg} flex items-center justify-center p-2`}>
                            {achievement.icon_url ? (
                              <img
                                src={achievement.icon_url}
                                alt={achievement.achievement_name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Lock className={`w-8 h-8 ${achievement.unlocked ? config.color : 'text-gray-600'}`} />
                            )}
                            {/* Rarity Corner */}
                            <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                              achievement.rarity_tier === 'legendary' ? 'bg-yellow-400' :
                              achievement.rarity_tier === 'epic' ? 'bg-purple-400' :
                              achievement.rarity_tier === 'rare' ? 'bg-blue-400' :
                              'bg-gray-400'
                            }`} />
                          </div>
                          {/* Achievement Name */}
                          <div className="p-2 bg-[#202225]">
                            <p className="text-xs text-white font-medium line-clamp-2 leading-tight">
                              {achievement.achievement_name}
                            </p>
                            {achievement.tokens_awarded > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-yellow-400 text-xs">🪙</span>
                                <span className="text-xs font-bold text-yellow-400">{achievement.tokens_awarded}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {group.achievements.length > 24 && (
                    <div className="text-center mt-4">
                      <span className="text-sm text-gray-400">
                        +{group.achievements.length - 24} more achievements
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* All Achievements View with Pagination */
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {paginatedAchievements.map((achievement) => {
              const config = getRarityConfig(achievement.rarity_tier);
              return (
                <div
                  key={achievement.id}
                  className={`bg-[#1a1a1a] rounded-xl border ${config.border} overflow-hidden transition-all hover:scale-105 ${
                    !achievement.unlocked ? 'opacity-60' : config.glow
                  }`}
                >
                  {/* Achievement Icon */}
                  <div className={`aspect-square relative ${config.bg} flex items-center justify-center p-3`}>
                    {achievement.icon_url ? (
                      <img
                        src={achievement.icon_url}
                        alt={achievement.achievement_name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Lock className={`w-12 h-12 ${achievement.unlocked ? config.color : 'text-gray-600'}`} />
                    )}
                  </div>
                  {/* Achievement Info */}
                  <div className="p-3 bg-[#202225]">
                    <div className="text-xs text-gray-500 mb-1">{achievement.game_name}</div>
                    <h3 className="font-bold text-white text-sm line-clamp-2 mb-2">
                      {achievement.achievement_name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">🪙</span>
                        <span className="text-sm font-bold text-yellow-400">{achievement.tokens_awarded}</span>
                      </div>
                      {achievement.global_percentage && (
                        <div className="text-xs text-gray-500">
                          {achievement.global_percentage.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#0f0f0f] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#0f0f0f] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

