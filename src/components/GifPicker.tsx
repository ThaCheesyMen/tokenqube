import { useState, useRef, useEffect } from 'react';
import { Search, TrendingUp, X, Loader } from 'lucide-react';

interface GifPickerProps {
  onGifSelect: (gifUrl: string, gifTitle: string) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    gif: {
      url: string;
      dims: number[];
      size: number;
    };
    tinygif: {
      url: string;
      dims: number[];
      size: number;
    };
  };
}

// Tenor API Key - You'll need to get your own from https://tenor.com/developer/dashboard
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // This is a demo key, get your own!
const TENOR_API_URL = 'https://tenor.googleapis.com/v2';

export default function GifPicker({ onGifSelect, onClose, position = 'bottom' }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trending' | 'search'>('trending');
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Load trending GIFs on mount
  useEffect(() => {
    loadTrendingGifs();
  }, []);

  const loadTrendingGifs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${TENOR_API_URL}/featured?key=${TENOR_API_KEY}&client_key=tokenquest&limit=20`
      );
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error('Error loading trending GIFs:', error);
      // Fallback to mock data if API fails
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      loadTrendingGifs();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${TENOR_API_URL}/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=tokenquest&limit=20`
      );
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error('Error searching GIFs:', error);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setActiveTab('search');

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchGifs(value);
    }, 500);
  };

  const handleGifClick = (gif: TenorGif) => {
    const gifUrl = gif.media_formats.gif.url;
    onGifSelect(gifUrl, gif.title);
    onClose();
  };

  const handleTrendingClick = () => {
    setActiveTab('trending');
    setSearchQuery('');
    loadTrendingGifs();
  };

  return (
    <div
      ref={pickerRef}
      className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 w-96 bg-[#1a1a1a] border border-[#202225] rounded-lg shadow-2xl z-50 overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#202225]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">GIF Picker</h3>
          <span className="text-xs text-gray-400">Powered by Tenor</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#1a1a1a] rounded transition"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[#202225]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search for GIFs..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-[#1a1a1a] text-gray-100 text-sm rounded border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-[#202225]">
        <button
          onClick={handleTrendingClick}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition ${
            activeTab === 'trending'
              ? 'bg-[#8B5CF6] text-white'
              : 'text-gray-400 hover:bg-[#1a1a1a]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Trending
        </button>
        {searchQuery && (
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition ${
              activeTab === 'search'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-gray-400 hover:bg-[#1a1a1a]'
            }`}
          >
            <Search className="w-4 h-4" />
            Search Results
          </button>
        )}
      </div>

      {/* GIF Grid */}
      <div className="p-2 h-96 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="w-8 h-8 text-[#8B5CF6] animate-spin" />
          </div>
        ) : gifs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => handleGifClick(gif)}
                className="relative aspect-square rounded overflow-hidden hover:ring-2 hover:ring-[#8B5CF6] transition group"
              >
                <img
                  src={gif.media_formats.tinygif.url}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition flex items-end p-2">
                  <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition truncate">
                    {gif.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Search className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No GIFs found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[#202225] text-center">
        <a
          href="https://tenor.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-300 transition"
        >
          Search powered by Tenor
        </a>
      </div>
    </div>
  );
}

