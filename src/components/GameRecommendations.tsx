import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Gamepad2, Star, ThumbsUp, X, Sparkles } from 'lucide-react';
import { toast } from './Toast';

interface Recommendation {
  id: string;
  game_id: string;
  game_name: string;
  recommendation_score: number;
  reason: string;
  metadata: any;
  clicked: boolean;
  dismissed: boolean;
}

export default function GameRecommendations() {
  const { profile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchRecommendations();
    }
  }, [profile]);

  const fetchRecommendations = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('game_recommendations')
        .select('*')
        .eq('user_id', profile.id)
        .eq('dismissed', false)
        .order('recommendation_score', { ascending: false })
        .limit(6);

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (rec: Recommendation) => {
    try {
      await supabase
        .from('game_recommendations')
        .update({ clicked: true })
        .eq('id', rec.id);

      toast.success(`Opening ${rec.game_name}...`);
    } catch (error) {
      console.error('Error updating click:', error);
    }
  };

  const handleDismiss = async (recId: string) => {
    try {
      await supabase
        .from('game_recommendations')
        .update({ dismissed: true })
        .eq('id', recId);

      setRecommendations(recommendations.filter(r => r.id !== recId));
      toast.success('Recommendation dismissed');
    } catch (error) {
      console.error('Error dismissing:', error);
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'friends_playing': return '👥';
      case 'genre_match': return '🎯';
      case 'trending': return '🔥';
      case 'ai_suggestion': return '🤖';
      default: return '⭐';
    }
  };

  const getReasonText = (reason: string) => {
    switch (reason) {
      case 'friends_playing': return 'Friends are playing';
      case 'genre_match': return 'Matches your taste';
      case 'trending': return 'Trending now';
      case 'ai_suggestion': return 'AI recommends';
      default: return 'Recommended for you';
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[#0f0f0f] rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-[#0f0f0f] rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Recommended For You
        </h3>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225] hover:border-[#8B5CF6] transition-all group relative"
          >
            {/* Dismiss Button */}
            <button
              onClick={() => handleDismiss(rec.id)}
              className="absolute top-2 right-2 p-1 bg-[#1a1a1a] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>

            {/* Game Icon */}
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center mb-3">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>

            {/* Game Name */}
            <h4 className="text-white font-bold mb-1 line-clamp-1">
              {rec.game_name}
            </h4>

            {/* Reason */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{getReasonIcon(rec.reason)}</span>
              <p className="text-sm text-gray-400">{getReasonText(rec.reason)}</p>
            </div>

            {/* Match Score */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">Match Score</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < Math.round((rec.recommendation_score || 0) * 5)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => handleClick(rec)}
              className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              View Game
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

