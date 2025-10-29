import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, Edit, Trash2, Pin, Eye, EyeOff, X, Save, Newspaper, Calendar
} from 'lucide-react';
import { toast } from './Toast';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  game_name?: string;
  priority: string;
  banner_url?: string;
  link_url?: string;
  is_pinned: boolean;
  is_published: boolean;
  views: number;
  author_id?: string;
  created_at: string;
  updated_at: string;
}

export default function NewsManagementPanel() {
  const { profile } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'announcement',
    game_name: '',
    priority: 'normal',
    banner_url: '',
    link_url: '',
    is_pinned: false,
    is_published: true,
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      content: '',
      category: 'announcement',
      game_name: '',
      priority: 'normal',
      banner_url: '',
      link_url: '',
      is_pinned: false,
      is_published: true,
    });
    setShowModal(true);
  };

  const openEditModal = (article: NewsArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      game_name: article.game_name || '',
      priority: article.priority,
      banner_url: article.banner_url || '',
      link_url: article.link_url || '',
      is_pinned: article.is_pinned,
      is_published: article.is_published,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    try {
      if (editingArticle) {
        // Update existing article
        const { error } = await supabase
          .from('news_articles')
          .update({
            ...formData,
            game_name: formData.game_name || null,
            banner_url: formData.banner_url || null,
            link_url: formData.link_url || null,
          })
          .eq('id', editingArticle.id);

        if (error) throw error;
        toast.success('Article updated successfully!');
      } else {
        // Create new article
        const { error } = await supabase
          .from('news_articles')
          .insert([{
            ...formData,
            game_name: formData.game_name || null,
            banner_url: formData.banner_url || null,
            link_url: formData.link_url || null,
            author_id: profile?.id,
          }]);

        if (error) throw error;
        toast.success('Article created successfully!');
      }

      setShowModal(false);
      fetchArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error('Failed to save article');
    }
  };

  const togglePublish = async (article: NewsArticle) => {
    try {
      const { error } = await supabase
        .from('news_articles')
        .update({ is_published: !article.is_published })
        .eq('id', article.id);

      if (error) throw error;
      toast.success(article.is_published ? 'Article unpublished' : 'Article published');
      fetchArticles();
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error('Failed to update article');
    }
  };

  const togglePin = async (article: NewsArticle) => {
    try {
      const { error } = await supabase
        .from('news_articles')
        .update({ is_pinned: !article.is_pinned })
        .eq('id', article.id);

      if (error) throw error;
      toast.success(article.is_pinned ? 'Article unpinned' : 'Article pinned');
      fetchArticles();
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update article');
    }
  };

  const deleteArticle = async (article: NewsArticle) => {
    if (!confirm(`Are you sure you want to delete "${article.title}"?`)) return;

    try {
      const { error} = await supabase
        .from('news_articles')
        .delete()
        .eq('id', article.id);

      if (error) throw error;
      toast.success('Article deleted successfully');
      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Failed to delete article');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      announcement: 'bg-blue-500',
      patch_notes: 'bg-purple-500',
      community: 'bg-green-500',
      esports: 'bg-yellow-500',
      streamer_live: 'bg-red-500',
      update: 'bg-indigo-500',
      event: 'bg-pink-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-[#8B5CF6]" />
            News Management
          </h2>
          <p className="text-gray-400 mt-1">Create and manage news articles for the dashboard</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Article
        </button>
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5CF6]"></div>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 bg-[#1a1a1a] rounded-xl border border-[#202225]">
          <Newspaper className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg">No articles yet</p>
          <p className="text-gray-500 text-sm mt-2">Create your first news article to get started</p>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#202225]">
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Title</th>
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Category</th>
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Status</th>
                  <th className="text-right text-gray-400 font-semibold py-4 px-6">Views</th>
                  <th className="text-left text-gray-400 font-semibold py-4 px-6">Created</th>
                  <th className="text-right text-gray-400 font-semibold py-4 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} className="border-b border-[#202225] hover:bg-[#0f0f0f] transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {article.is_pinned && (
                          <Pin className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                        <div>
                          <div className="text-white font-semibold">{article.title}</div>
                          {article.game_name && (
                            <div className="text-gray-400 text-sm">{article.game_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold text-white ${getCategoryColor(article.category)}`}>
                        {article.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {article.is_published ? (
                        <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                          <Eye className="w-4 h-4" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
                          <EyeOff className="w-4 h-4" />
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right text-gray-400">
                      {article.views}
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(article.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => togglePin(article)}
                          className={`p-2 rounded-lg transition ${
                            article.is_pinned
                              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                              : 'bg-[#2f3136] text-gray-400 hover:text-white hover:bg-[#36393f]'
                          }`}
                          title={article.is_pinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => togglePublish(article)}
                          className={`p-2 rounded-lg transition ${
                            article.is_published
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-[#2f3136] text-gray-400 hover:text-white hover:bg-[#36393f]'
                          }`}
                          title={article.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {article.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEditModal(article)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteArticle(article)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#202225]">
              <h3 className="text-xl font-bold text-white">
                {editingArticle ? 'Edit Article' : 'Create New Article'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[#2f3136] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none resize-none"
                  required
                />
              </div>

              {/* Category & Game Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="patch_notes">Patch Notes</option>
                    <option value="community">Community</option>
                    <option value="esports">Esports</option>
                    <option value="streamer_live">Live Stream</option>
                    <option value="update">Update</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Game Name (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.game_name}
                    onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                    placeholder="e.g., Battlefield 6"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* URLs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Banner URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.banner_url}
                    onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Link URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="w-4 h-4 rounded border-[#202225] bg-[#0f0f0f] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                  />
                  <span className="text-sm text-gray-400">Pin to top</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4 rounded border-[#202225] bg-[#0f0f0f] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                  />
                  <span className="text-sm text-gray-400">Publish immediately</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingArticle ? 'Update' : 'Create'} Article
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-[#2f3136] hover:bg-[#36393f] text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

