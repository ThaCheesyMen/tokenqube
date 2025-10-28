import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Search, X, User, MessageCircle, Gamepad2, ShoppingBag,
  Trophy, Clock, TrendingUp
} from 'lucide-react';
import { debounce } from '../utils/debounce';

interface SearchResult {
  id: string;
  type: 'user' | 'game' | 'message' | 'marketplace' | 'achievement';
  title: string;
  subtitle?: string;
  avatar?: string;
  icon?: any;
  onClick: () => void;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string, data?: any) => void;
}

export default function GlobalSearch({ isOpen, onClose, onNavigate }: GlobalSearchProps) {
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      loadRecentSearches();
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim()) {
      debouncedSearch(query);
    } else {
      setResults([]);
    }
  }, [query]);

  const loadRecentSearches = () => {
    const recent = localStorage.getItem('recentSearches');
    if (recent) {
      setRecentSearches(JSON.parse(recent));
    }
  };

  const saveRecentSearch = (searchQuery: string) => {
    const recent = [searchQuery, ...recentSearches.filter(q => q !== searchQuery)].slice(0, 5);
    setRecentSearches(recent);
    localStorage.setItem('recentSearches', JSON.stringify(recent));
  };

  const performSearch = async (searchQuery: string) => {
    if (!profile || !searchQuery.trim()) return;

    setLoading(true);
    try {
      const searchLower = searchQuery.toLowerCase();
      const searchResults: SearchResult[] = [];

      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .limit(5);

      if (users) {
        users.forEach(user => {
          searchResults.push({
            id: `user-${user.id}`,
            type: 'user',
            title: user.username,
            subtitle: 'User Profile',
            avatar: user.avatar_url,
            icon: User,
            onClick: () => {
              saveRecentSearch(searchQuery);
              onNavigate('profile', { userId: user.id });
              onClose();
            }
          });
        });
      }

      // Search games
      const { data: games } = await supabase
        .from('user_games')
        .select('game_name, game_id, platform')
        .eq('user_id', profile.id)
        .ilike('game_name', `%${searchQuery}%`)
        .limit(5);

      if (games) {
        const uniqueGames = Array.from(new Map(games.map(g => [g.game_id, g])).values());
        uniqueGames.forEach(game => {
          searchResults.push({
            id: `game-${game.game_id}`,
            type: 'game',
            title: game.game_name,
            subtitle: game.platform,
            icon: Gamepad2,
            onClick: () => {
              saveRecentSearch(searchQuery);
              onNavigate('profile', { tab: 'gaming' });
              onClose();
            }
          });
        });
      }

      // Search marketplace items
      const { data: items } = await supabase
        .from('marketplace_listings')
        .select('id, item_name, price, category')
        .ilike('item_name', `%${searchQuery}%`)
        .eq('status', 'active')
        .limit(5);

      if (items) {
        items.forEach(item => {
          searchResults.push({
            id: `item-${item.id}`,
            type: 'marketplace',
            title: item.item_name,
            subtitle: `${item.price} tokens • ${item.category}`,
            icon: ShoppingBag,
            onClick: () => {
              saveRecentSearch(searchQuery);
              onNavigate('marketplace', { itemId: item.id });
              onClose();
            }
          });
        });
      }

      // Search achievements
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select('achievement_name, achievement_description, rarity_tier, icon_url')
        .eq('user_id', profile.id)
        .ilike('achievement_name', `%${searchQuery}%`)
        .limit(5);

      if (achievements) {
        achievements.forEach(achievement => {
          searchResults.push({
            id: `achievement-${achievement.achievement_name}`,
            type: 'achievement',
            title: achievement.achievement_name,
            subtitle: achievement.achievement_description,
            avatar: achievement.icon_url,
            icon: Trophy,
            onClick: () => {
              saveRecentSearch(searchQuery);
              onNavigate('profile', { tab: 'achievements' });
              onClose();
            }
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      performSearch(searchQuery);
    }, 300),
    [profile]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      results[selectedIndex].onClick();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const getResultIcon = (result: SearchResult) => {
    const Icon = result.icon || Search;
    
    if (result.avatar) {
      return (
        <img
          src={result.avatar}
          alt={result.title}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }

    return (
      <div className="w-10 h-10 bg-[#8B5CF6]/20 rounded-full flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#8B5CF6]" />
      </div>
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'user': return 'text-blue-400';
      case 'game': return 'text-green-400';
      case 'message': return 'text-purple-400';
      case 'marketplace': return 'text-yellow-400';
      case 'achievement': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1a1a] rounded-xl max-w-2xl w-full border border-[#202225] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-4 border-b border-[#202225]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search users, games, marketplace, achievements..."
              className="w-full pl-12 pr-12 py-3 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-[#202225] rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-400 text-sm">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={result.onClick}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    selectedIndex === index
                      ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/50'
                      : 'hover:bg-[#0f0f0f]'
                  }`}
                >
                  {getResultIcon(result)}
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{result.title}</span>
                      <span className={`text-xs uppercase font-bold ${getTypeColor(result.type)}`}>
                        {result.type}
                      </span>
                    </div>
                    {result.subtitle && (
                      <p className="text-sm text-gray-400">{result.subtitle}</p>
                    )}
                  </div>

                  {selectedIndex === index && (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <kbd className="px-2 py-1 bg-[#0f0f0f] rounded text-xs">Enter</kbd>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No results found for "{query}"</p>
            </div>
          ) : recentSearches.length > 0 ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-400">Recent Searches</span>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(search)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#0f0f0f] transition-colors text-left"
                >
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-white">{search}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Start typing to search...</p>
              <p className="text-sm text-gray-500 mt-2">
                Find users, games, marketplace items, and more
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#202225] bg-[#0f0f0f] flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-[#1a1a1a] rounded">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-[#1a1a1a] rounded">Enter</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-[#1a1a1a] rounded">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
          
          <span className="text-xs text-gray-500">
            Press <kbd className="px-2 py-1 bg-[#1a1a1a] rounded">Ctrl K</kbd> to search
          </span>
        </div>
      </div>
    </div>
  );
}

// Hook to manage global search
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
}

