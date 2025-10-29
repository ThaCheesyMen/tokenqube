import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Newspaper, 
  FileText, 
  Users, 
  Trophy, 
  Radio,
  ExternalLink,
  Clock,
  Pin
} from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  game_name?: string;
  priority: string;
  banner_url?: string;
  link_url?: string;
  is_pinned: boolean;
  views: number;
  created_at: string;
}

export default function DashboardNewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchNews();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('news_articles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'news_articles',
        },
        () => {
          fetchNews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('is_published', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'announcement':
        return <Newspaper className="w-4 h-4" />;
      case 'patch_notes':
        return <FileText className="w-4 h-4" />;
      case 'community':
        return <Users className="w-4 h-4" />;
      case 'esports':
        return <Trophy className="w-4 h-4" />;
      case 'streamer_live':
        return <Radio className="w-4 h-4" />;
      default:
        return <Newspaper className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'announcement':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'patch_notes':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'community':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'esports':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'streamer_live':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'announcement', label: 'Announcements' },
    { value: 'patch_notes', label: 'Patch Notes' },
    { value: 'community', label: 'Community' },
    { value: 'esports', label: 'Esports' },
    { value: 'streamer_live', label: 'Live Streams' }
  ];

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg">
            <Newspaper className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">News Feed</h2>
            <p className="text-xs text-gray-400">Latest updates & announcements</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filter === cat.value
                ? 'bg-[#8B5CF6] text-white'
                : 'bg-[#0f0f0f] text-gray-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-[#0f0f0f] rounded-lg animate-pulse" />
          ))
        ) : news.length === 0 ? (
          <div className="text-center py-8">
            <Newspaper className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No news for this category</p>
            <p className="text-gray-500 text-xs mt-1">Check back later for updates!</p>
          </div>
        ) : (
          news.map((item) => (
            <div
              key={item.id}
              className={`bg-[#0f0f0f] rounded-lg p-4 border transition-all hover:border-[#8B5CF6] ${
                item.priority === 'urgent' ? 'border-red-500/50' : 'border-[#202225]'
              }`}
            >
              {item.banner_url && (
                <div className="mb-3 -mx-4 -mt-4">
                  <img
                    src={item.banner_url}
                    alt={item.title}
                    className="w-full h-24 object-cover rounded-t-lg"
                  />
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getCategoryColor(item.category)} border`}>
                  {getCategoryIcon(item.category)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white line-clamp-1 flex items-center gap-2">
                      {item.is_pinned && <Pin className="w-3 h-3 text-[#8B5CF6]" />}
                      {item.title}
                    </h3>
                    {item.priority === 'urgent' && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-medium flex-shrink-0">
                        URGENT
                      </span>
                    )}
                  </div>

                  {item.game_name && (
                    <span className="text-xs text-[#8B5CF6] mb-1 block">{item.game_name}</span>
                  )}

                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">{item.content}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(item.created_at)}
                      </span>
                      <span className="capitalize">{item.category.replace('_', ' ')}</span>
                    </div>

                    {item.link_url && (
                      <button className="flex items-center gap-1 text-xs text-[#8B5CF6] hover:text-[#7C3AED] transition-colors">
                        <span>Read more</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

