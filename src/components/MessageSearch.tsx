import { useState, useEffect } from 'react';
import { Search, X, Calendar, User, Hash, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface MessageSearchProps {
  isOpen: boolean;
  onClose: () => void;
  channelType: 'global' | 'dm';
  channelId?: string;
  onMessageClick: (messageId: string) => void;
}

interface SearchResult {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  sender_username: string;
  sender_avatar?: string;
}

export default function MessageSearch({
  isOpen,
  onClose,
  channelType,
  channelId,
  onMessageClick,
}: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    fromUser: '',
    dateFrom: '',
    dateTo: '',
    hasAttachments: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (query.trim() && isOpen) {
      const timeoutId = setTimeout(() => {
        performSearch();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
    }
  }, [query, filters, isOpen]);

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      let searchQuery;

      if (channelType === 'global') {
        searchQuery = supabase
          .from('global_chat_messages')
          .select(`
            id,
            message,
            created_at,
            user_id,
            profiles!global_chat_messages_user_id_fkey(username, avatar_url)
          `)
          .ilike('message', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        // Apply date filters
        if (filters.dateFrom) {
          searchQuery = searchQuery.gte('created_at', new Date(filters.dateFrom).toISOString());
        }
        if (filters.dateTo) {
          searchQuery = searchQuery.lte('created_at', new Date(filters.dateTo).toISOString());
        }

        const { data, error } = await searchQuery;

        if (error) throw error;

        if (data) {
          const mappedResults = data.map((msg: any) => ({
            id: msg.id,
            message: msg.message,
            created_at: msg.created_at,
            sender_id: msg.user_id,
            sender_username: msg.profiles?.username || 'Unknown',
            sender_avatar: msg.profiles?.avatar_url,
          }));

          // Filter by username if specified
          const filtered = filters.fromUser
            ? mappedResults.filter(r =>
                r.sender_username.toLowerCase().includes(filters.fromUser.toLowerCase())
              )
            : mappedResults;

          setResults(filtered);
        }
      } else if (channelType === 'dm' && channelId) {
        searchQuery = supabase
          .from('dm_messages')
          .select(`
            id,
            message,
            created_at,
            sender_id,
            profiles!dm_messages_sender_id_fkey(username, avatar_url)
          `)
          .eq('room_id', channelId)
          .ilike('message', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        // Apply date filters
        if (filters.dateFrom) {
          searchQuery = searchQuery.gte('created_at', new Date(filters.dateFrom).toISOString());
        }
        if (filters.dateTo) {
          searchQuery = searchQuery.lte('created_at', new Date(filters.dateTo).toISOString());
        }

        const { data, error } = await searchQuery;

        if (error) throw error;

        if (data) {
          const mappedResults = data.map((msg: any) => ({
            id: msg.id,
            message: msg.message,
            created_at: msg.created_at,
            sender_id: msg.sender_id,
            sender_username: msg.profiles?.username || 'Unknown',
            sender_avatar: msg.profiles?.avatar_url,
          }));

          // Filter by username if specified
          const filtered = filters.fromUser
            ? mappedResults.filter(r =>
                r.sender_username.toLowerCase().includes(filters.fromUser.toLowerCase())
              )
            : mappedResults;

          setResults(filtered);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = (messageId: string) => {
    onMessageClick(messageId);
    onClose();
  };

  const clearFilters = () => {
    setFilters({
      fromUser: '',
      dateFrom: '',
      dateTo: '',
      hasAttachments: false,
    });
  };

  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="bg-yellow-500/30 text-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 w-96 h-full bg-[#1a1a1a] border-l border-[#202225] flex flex-col z-10">
      {/* Header */}
      <div className="p-4 border-b border-[#202225] flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Search className="w-5 h-5" />
          Search Messages
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#0f0f0f] rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-[#202225] space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-10 pr-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none text-sm"
            autoFocus
          />
        </div>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-2 pt-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">From User</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.fromUser}
                  onChange={(e) => setFilters({ ...filters, fromUser: e.target.value })}
                  placeholder="Username..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-[#0f0f0f] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none text-sm"
                />
              </div>
            </div>

            <button
              onClick={clearFilters}
              className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-400 text-sm">Searching...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-3">{results.length} results found</p>
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleMessageClick(result.id)}
                className="w-full text-left p-3 bg-[#0f0f0f] hover:bg-[#2f3136] rounded-lg border border-[#202225] hover:border-[#8B5CF6]/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[#8B5CF6] flex items-center justify-center text-xs text-white font-bold overflow-hidden flex-shrink-0">
                    {result.sender_avatar ? (
                      <img src={result.sender_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      result.sender_username[0]?.toUpperCase()
                    )}
                  </div>
                  <span className="text-white font-semibold text-sm">{result.sender_username}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {format(new Date(result.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2">
                  {highlightMatch(result.message, query)}
                </p>
              </button>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No messages found</p>
            <p className="text-gray-500 text-xs mt-1">Try different keywords or filters</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <Hash className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Start typing to search</p>
            <p className="text-gray-500 text-xs mt-1">Search through all messages in this channel</p>
          </div>
        )}
      </div>
    </div>
  );
}

