import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle } from 'lucide-react';
import { toast } from '../components/Toast';

interface Activity {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  icon: string | null;
  data: any;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  comment: string;
  created_at: string;
}

export default function ActivityFeed() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    
    fetchActivities();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('activity_feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_feed',
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchActivities = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase.rpc('get_activity_feed', {
        p_limit: 20,
        p_offset: 0,
        p_activity_types: null,
      });

      if (error) throw error;
      if (data) setActivities(data);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (activityId: string) => {
    if (!profile) return;

    try {
      await supabase.rpc('toggle_activity_like', {
        p_activity_id: activityId,
      });

      // Update local state
      setActivities(prev =>
        prev.map(activity => {
          if (activity.id === activityId) {
            return {
              ...activity,
              user_liked: !activity.user_liked,
              likes_count: activity.user_liked
                ? activity.likes_count - 1
                : activity.likes_count + 1,
            };
          }
          return activity;
        })
      );
    } catch (error: any) {
      console.error('Error toggling like:', error);
    }
  };

  const fetchComments = async (activityId: string) => {
    if (expandedComments.has(activityId)) {
      setExpandedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_activity_comments', {
        p_activity_id: activityId,
        p_limit: 50,
        p_offset: 0,
      });

      if (error) throw error;
      if (data) {
        setComments(prev => ({ ...prev, [activityId]: data }));
        setExpandedComments(prev => new Set(prev).add(activityId));
      }
    } catch (error: any) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async (activityId: string) => {
    if (!profile || !newComment[activityId]?.trim()) return;

    try {
      const { error } = await supabase.rpc('add_activity_comment', {
        p_activity_id: activityId,
        p_comment: newComment[activityId],
      });

      if (error) throw error;

      // Refresh comments
      await fetchComments(activityId);
      setNewComment(prev => ({ ...prev, [activityId]: '' }));

      // Update comment count
      setActivities(prev =>
        prev.map(activity => {
          if (activity.id === activityId) {
            return {
              ...activity,
              comments_count: activity.comments_count + 1,
            };
          }
          return activity;
        })
      );
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  if (loading) {
    return (
      <div className="h-full w-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0f0f0f]">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#1a1a1a] rounded-lg shadow p-6 border border-[#202225]">
                <div className="h-4 bg-[#1a1a1a] rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-[#1a1a1a] rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0f0f0f]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Activity Feed
          </h1>
          <p className="text-gray-400">
            See what your friends are up to
          </p>
        </div>

        {activities.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-lg shadow p-12 text-center border border-[#202225]">
            <p className="text-gray-400 text-lg">
              No activities yet. Start connecting with friends!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="bg-[#1a1a1a] rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-[#202225]"
              >
                {/* Activity Header */}
                <div className="flex items-start space-x-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white font-bold text-lg"
                    style={{
                      backgroundImage: activity.avatar_url
                        ? `url(${activity.avatar_url})`
                        : undefined,
                      backgroundSize: 'cover',
                    }}
                  >
                    {!activity.avatar_url &&
                      activity.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">
                        {activity.username}
                      </span>
                      <span className="text-2xl">{activity.icon || '🎉'}</span>
                      <span className="text-sm text-gray-400">
                        {formatTime(activity.created_at)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {activity.title}
                    </h3>
                    {activity.description && (
                      <p className="text-gray-400 mt-1">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Activity Actions */}
                <div className="flex items-center space-x-4 pt-4 border-t border-[#202225]">
                  <button
                    onClick={() => toggleLike(activity.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activity.user_liked
                        ? 'bg-red-500/20 text-red-500'
                        : 'text-gray-400 hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${activity.user_liked ? 'fill-current' : ''}`}
                    />
                    <span>{activity.likes_count}</span>
                  </button>

                  <button
                    onClick={() => fetchComments(activity.id)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-400 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{activity.comments_count}</span>
                  </button>
                </div>

                {/* Comments Section */}
                {expandedComments.has(activity.id) && (
                  <div className="mt-4 pt-4 border-t border-[#202225]">
                    {/* Comment Input */}
                    <div className="flex space-x-2 mb-4">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={newComment[activity.id] || ''}
                        onChange={e =>
                          setNewComment(prev => ({
                            ...prev,
                            [activity.id]: e.target.value,
                          }))
                        }
                        onKeyPress={e => {
                          if (e.key === 'Enter') addComment(activity.id);
                        }}
                        className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#202225] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] text-white"
                      />
                      <button
                        onClick={() => addComment(activity.id)}
                        className="px-4 py-2 bg-[#8B5CF6] text-white rounded-lg hover:bg-[#7C3AED] transition-colors"
                      >
                        Send
                      </button>
                    </div>

                    {/* Comments List */}
                    {comments[activity.id] && (
                      <div className="space-y-3">
                        {comments[activity.id].map(comment => (
                          <div
                            key={comment.id}
                            className="flex items-start space-x-3 p-3 bg-[#1a1a1a] rounded-lg"
                          >
                            <div
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white font-bold text-sm"
                              style={{
                                backgroundImage: comment.avatar_url
                                  ? `url(${comment.avatar_url})`
                                  : undefined,
                                backgroundSize: 'cover',
                              }}
                            >
                              {!comment.avatar_url &&
                                comment.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-white text-sm">
                                  {comment.username}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatTime(comment.created_at)}
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm mt-1">
                                {comment.comment}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
