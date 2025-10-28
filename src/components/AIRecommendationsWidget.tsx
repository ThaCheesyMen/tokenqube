import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, TrendingUp, Clock, X, ExternalLink } from 'lucide-react';

interface Recommendation {
  id: string;
  recommended_game_name: string;
  recommended_game_id?: string;
  reason: string;
  score: number;
  based_on_games: string[];
  created_at: string;
}

export default function AIRecommendationsWidget() {
  const { profile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchRecommendations();
  }, [profile]);

  const fetchRecommendations = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // First, generate recommendations if needed
      await supabase.rpc('generate_game_recommendations', {
        p_user_id: profile.id
      });

      // Then fetch them
      const { data, error } = await supabase
        .from('game_recommendations')
        .select('*')
        .eq('user_id', profile.id)
        .eq('dismissed', false)
        .order('score', { ascending: false })
        .limit(5);

      if (error) throw error;

      // If no recommendations, generate some based on user's games
      if (!data || data.length === 0) {
        await generateSmartRecommendations();
        return;
      }

      setRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Generate fallback recommendations
      await generateSmartRecommendations();
    } finally {
      setLoading(false);
    }
  };

  const generateSmartRecommendations = async () => {
    if (!profile) return;

    try {
      // Get user's top games
      const { data: userGames } = await supabase
        .from('user_games')
        .select('game_name, total_playtime')
        .eq('user_id', profile.id)
        .order('total_playtime', { ascending: false })
        .limit(3);

      if (userGames && userGames.length > 0) {
        // Generate smart recommendations based on game genres
        const recommendations: Recommendation[] = [];
        
        // Example logic: recommend similar games
        if (userGames.some(g => ['Fortnite', 'Apex Legends', 'Warzone'].includes(g.game_name))) {
          recommendations.push({
            id: '1',
            recommended_game_name: 'PUBG: Battlegrounds',
            reason: 'Similar battle royale gameplay',
            score: 85,
            based_on_games: userGames.map(g => g.game_name),
            created_at: new Date().toISOString()
          });
        }

        if (userGames.some(g => ['Valorant', 'CS:GO', 'Counter-Strike 2'].includes(g.game_name))) {
          recommendations.push({
            id: '2',
            recommended_game_name: 'Rainbow Six Siege',
            reason: 'Tactical shooter with similar gameplay',
            score: 80,
            based_on_games: userGames.map(g => g.game_name),
            created_at: new Date().toISOString()
          });
        }

        if (userGames.some(g => ['Minecraft', 'Terraria', 'Stardew Valley'].includes(g.game_name))) {
          recommendations.push({
            id: '3',
            recommended_game_name: 'Valheim',
            reason: 'Creative survival with building mechanics',
            score: 75,
            based_on_games: userGames.map(g => g.game_name),
            created_at: new Date().toISOString()
          });
        }

        // Add generic popular recommendations
        if (recommendations.length < 3) {
          recommendations.push({
            id: '4',
            recommended_game_name: 'Elden Ring',
            reason: 'Top rated game this year',
            score: 90,
            based_on_games: ['Your gaming preferences'],
            created_at: new Date().toISOString()
          });
        }

        setRecommendations(recommendations.slice(0, 5));
      } else {
        // No games yet, show popular games
        setRecommendations([
          {
            id: 'pop1',
            recommended_game_name: 'Fortnite',
            reason: 'Most popular game on TokenQube',
            score: 95,
            based_on_games: [],
            created_at: new Date().toISOString()
          },
          {
            id: 'pop2',
            recommended_game_name: 'Valorant',
            reason: 'Trending competitive shooter',
            score: 90,
            based_on_games: [],
            created_at: new Date().toISOString()
          },
          {
            id: 'pop3',
            recommended_game_name: 'Apex Legends',
            reason: 'Fast-paced battle royale',
            score: 85,
            based_on_games: [],
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error generating smart recommendations:', error);
    }
  };

  const dismissRecommendation = async (id: string) => {
    try {
      await supabase
        .from('game_recommendations')
        .update({ dismissed: true })
        .eq('id', id);

      setRecommendations(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">You Might Enjoy</h2>
            <p className="text-xs text-gray-400">AI-powered recommendations</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-[#0f0f0f] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No recommendations yet</p>
          <p className="text-gray-500 text-xs mt-1">Play some games to get personalized suggestions!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225] hover:border-[#8B5CF6] transition-all group relative"
            >
              <button
                onClick={() => dismissRecommendation(rec.id)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-[#202225] transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>

              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white truncate">
                      {rec.recommended_game_name}
                    </h3>
                    {rec.score && (
                      <div className="flex items-center gap-1 text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">
                        <TrendingUp className="w-3 h-3" />
                        <span>{rec.score}% match</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mb-2">{rec.reason}</p>

                  {rec.based_on_games && rec.based_on_games.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>Based on: {rec.based_on_games.slice(0, 2).join(', ')}</span>
                      {rec.based_on_games.length > 2 && ` +${rec.based_on_games.length - 2} more`}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#202225]">
                <button className="w-full py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View Game
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-[#202225]">
        <button
          onClick={fetchRecommendations}
          className="w-full py-2 text-sm text-[#8B5CF6] hover:text-[#7C3AED] transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Refresh Recommendations
        </button>
      </div>
    </div>
  );
}

