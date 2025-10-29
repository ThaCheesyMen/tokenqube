import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Video, Upload, Play, Heart, Eye, MessageSquare, Share2,
  TrendingUp, Clock, Star, Trophy, Filter, Plus, X, Download,
  ThumbsUp, Flag, Bookmark, Sparkles
} from 'lucide-react';
import { toast } from '../components/Toast';
import { formatTokens } from '../utils/formatTokens';

interface Clip {
  id: string;
  user_id: string;
  title: string;
  description: string;
  game_name: string;
  video_url: string;
  thumbnail_url?: string;
  duration: number;
  views: number;
  likes: number;
  comments_count: number;
  is_featured: boolean;
  tags: string[];
  created_at: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

export default function ClipsSystem() {
  const { profile } = useAuth();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filter, setFilter] = useState<'trending' | 'recent' | 'following' | 'mine'>('trending');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [newClip, setNewClip] = useState({
    title: '',
    description: '',
    game_name: '',
    video_file: null as File | null,
    thumbnail_file: null as File | null,
    tags: [] as string[]
  });

  useEffect(() => {
    fetchClips();
  }, [filter, profile]);

  const fetchClips = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('clips')
        .select(`
          *,
          profiles(username, avatar_url)
        `);

      if (filter === 'mine' && profile) {
        query = query.eq('user_id', profile.id);
      } else if (filter === 'following' && profile) {
        // Get following users
        const { data: following } = await supabase
          .from('friends')
          .select('friend_id')
          .eq('user_id', profile.id)
          .eq('status', 'accepted');
        
        const followingIds = following?.map(f => f.friend_id) || [];
        if (followingIds.length > 0) {
          query = query.in('user_id', followingIds);
        }
      }

      if (filter === 'trending') {
        query = query.order('likes', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Check likes and bookmarks for logged-in user
      if (profile && data) {
        const clipsWithUserData = await Promise.all(
          data.map(async (clip) => {
            const [likes, bookmarks] = await Promise.all([
              supabase
                .from('clip_likes')
                .select('id')
                .eq('clip_id', clip.id)
                .eq('user_id', profile.id)
                .single(),
              supabase
                .from('clip_bookmarks')
                .select('id')
                .eq('clip_id', clip.id)
                .eq('user_id', profile.id)
                .single()
            ]);

            return {
              ...clip,
              is_liked: !!likes.data,
              is_bookmarked: !!bookmarks.data
            };
          })
        );

        setClips(clipsWithUserData);
      } else {
        setClips(data || []);
      }
    } catch (error) {
      console.error('Error fetching clips:', error);
      toast.error('Failed to load clips');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClip = async () => {
    if (!profile) {
      toast.error('Please log in to upload clips');
      return;
    }

    if (!newClip.video_file || !newClip.title) {
      toast.error('Please provide a video and title');
      return;
    }

    try {
      setUploadProgress(10);

      // In production, you'd upload to Supabase Storage or a video hosting service
      // For now, we'll simulate the upload
      const videoUrl = URL.createObjectURL(newClip.video_file);
      const thumbnailUrl = newClip.thumbnail_file 
        ? URL.createObjectURL(newClip.thumbnail_file)
        : undefined;

      setUploadProgress(50);

      // Get video duration
      const video = document.createElement('video');
      video.src = videoUrl;
      await new Promise(resolve => video.onloadedmetadata = resolve);
      const duration = Math.round(video.duration);

      setUploadProgress(75);

      // Insert clip data
      const { error } = await supabase
        .from('clips')
        .insert([{
          user_id: profile.id,
          title: newClip.title,
          description: newClip.description,
          game_name: newClip.game_name,
          video_url: videoUrl, // In production, use actual storage URL
          thumbnail_url: thumbnailUrl,
          duration,
          tags: newClip.tags
        }]);

      if (error) throw error;

      setUploadProgress(100);
      toast.success('Clip uploaded successfully!');
      setShowUploadModal(false);
      setNewClip({
        title: '',
        description: '',
        game_name: '',
        video_file: null,
        thumbnail_file: null,
        tags: []
      });
      fetchClips();
    } catch (error) {
      console.error('Error uploading clip:', error);
      toast.error('Failed to upload clip');
    } finally {
      setUploadProgress(0);
    }
  };

  const handleLikeClip = async (clipId: string, isLiked: boolean) => {
    if (!profile) {
      toast.error('Please log in to like clips');
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('clip_likes')
          .delete()
          .eq('clip_id', clipId)
          .eq('user_id', profile.id);
      } else {
        await supabase
          .from('clip_likes')
          .insert([{ clip_id: clipId, user_id: profile.id }]);
      }

      // Update local state
      setClips(clips.map(clip => 
        clip.id === clipId 
          ? { ...clip, likes: clip.likes + (isLiked ? -1 : 1), is_liked: !isLiked }
          : clip
      ));

    } catch (error) {
      console.error('Error liking clip:', error);
      toast.error('Failed to like clip');
    }
  };

  const handleViewClip = async (clip: Clip) => {
    setSelectedClip(clip);

    // Increment view count
    await supabase
      .from('clips')
      .update({ views: clip.views + 1 })
      .eq('id', clip.id);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0f0f0f]">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Video className="w-8 h-8 text-[#8B5CF6]" />
              Gaming Clips
            </h1>
            <p className="text-gray-400">Share your epic moments</p>
          </div>
          
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-all transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Upload Clip
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'trending', label: 'Trending', icon: TrendingUp },
            { key: 'recent', label: 'Recent', icon: Clock },
            { key: 'following', label: 'Following', icon: Heart },
            { key: 'mine', label: 'My Clips', icon: Video }
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === key
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Clips Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-[#1a1a1a] rounded-xl h-64"></div>
            ))}
          </div>
        ) : clips.length === 0 ? (
          <div className="text-center py-16">
            <Video className="w-24 h-24 mx-auto mb-4 text-gray-600" />
            <h3 className="text-2xl font-bold text-white mb-2">No Clips Yet</h3>
            <p className="text-gray-400 mb-6">Be the first to upload an epic gaming moment!</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
            >
              Upload Your First Clip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#202225] hover:border-[#8B5CF6] transition-all cursor-pointer group"
                onClick={() => handleViewClip(clip)}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-[#8B5CF6]/20 to-[#0f0f0f] flex items-center justify-center relative overflow-hidden">
                  {clip.thumbnail_url ? (
                    <img 
                      src={clip.thumbnail_url} 
                      alt={clip.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Video className="w-16 h-16 text-gray-600" />
                  )}

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 bg-[#8B5CF6] rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-semibold">
                    {formatDuration(clip.duration)}
                  </div>

                  {/* Featured Badge */}
                  {clip.is_featured && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded-full flex items-center gap-1 font-bold">
                      <Star className="w-3 h-3" />
                      Featured
                    </div>
                  )}
                </div>

                {/* Clip Info */}
                <div className="p-4">
                  {/* Title */}
                  <h3 className="text-white font-bold mb-2 line-clamp-2 group-hover:text-[#8B5CF6] transition-colors">
                    {clip.title}
                  </h3>

                  {/* Author & Game */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-[#8B5CF6] rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {clip.profiles.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-400 truncate">{clip.profiles.username}</p>
                      <p className="text-xs text-gray-500 truncate">{clip.game_name}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {clip.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className={`w-4 h-4 ${clip.is_liked ? 'fill-red-500 text-red-500' : ''}`} />
                      {clip.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {clip.comments_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#202225]">
                <h3 className="text-xl font-bold text-white">Upload Clip</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-[#2f3136] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newClip.title}
                    onChange={(e) => setNewClip({ ...newClip, title: e.target.value })}
                    placeholder="Epic 5K clutch"
                    maxLength={100}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Description</label>
                  <textarea
                    value={newClip.description}
                    onChange={(e) => setNewClip({ ...newClip, description: e.target.value })}
                    placeholder="Describe your clip..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none resize-none"
                  />
                </div>

                {/* Game Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Game *</label>
                  <input
                    type="text"
                    value={newClip.game_name}
                    onChange={(e) => setNewClip({ ...newClip, game_name: e.target.value })}
                    placeholder="Valorant, CS:GO, Fortnite..."
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>

                {/* Video Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Video File *</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setNewClip({ ...newClip, video_file: e.target.files?.[0] || null })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max 100MB, MP4/MOV/AVI</p>
                </div>

                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Thumbnail (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewClip({ ...newClip, thumbnail_file: e.target.files?.[0] || null })}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && (
                  <div className="bg-[#0f0f0f] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">Uploading...</span>
                      <span className="text-[#8B5CF6] font-bold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#202225] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#8B5CF6] transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={handleUploadClip}
                    disabled={!newClip.video_file || !newClip.title || uploadProgress > 0}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Clip
                  </button>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-6 py-3 bg-[#2f3136] hover:bg-[#36393f] text-white rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Player Modal */}
        {selectedClip && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setSelectedClip(null)}>
            <div className="w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
              {/* Video Player */}
              <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4">
                <video 
                  controls 
                  autoPlay
                  className="w-full h-full"
                  src={selectedClip.video_url}
                >
                  Your browser doesn't support video playback.
                </video>
              </div>

              {/* Clip Info */}
              <div className="bg-[#1a1a1a] rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">{selectedClip.title}</h2>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold">
                      {selectedClip.profiles.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{selectedClip.profiles.username}</p>
                      <p className="text-gray-400 text-sm">{selectedClip.game_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleLikeClip(selectedClip.id, selectedClip.is_liked || false)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2f3136] hover:bg-[#36393f] rounded-lg transition-colors"
                    >
                      <Heart className={`w-5 h-5 ${selectedClip.is_liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                      <span className="text-white font-semibold">{selectedClip.likes}</span>
                    </button>
                    <button className="p-2 bg-[#2f3136] hover:bg-[#36393f] rounded-lg transition-colors">
                      <Share2 className="w-5 h-5 text-white" />
                    </button>
                    <button 
                      onClick={() => setSelectedClip(null)}
                      className="p-2 bg-[#2f3136] hover:bg-[#36393f] rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
                {selectedClip.description && (
                  <p className="text-gray-400">{selectedClip.description}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

