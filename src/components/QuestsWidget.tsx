import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Target, CheckCircle, Clock, Coins, ChevronRight, Zap } from 'lucide-react';

interface Quest {
  id: string;
  title: string;
  description: string;
  token_reward: number;
  xp_reward: number;
  quest_type: string;
  difficulty: string;
  progress?: number;
  goal?: number;
  status?: string;
}

interface QuestsWidgetProps {
  onViewAll: () => void;
}

export default function QuestsWidget({ onViewAll }: QuestsWidgetProps) {
  const { profile } = useAuth();
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchQuests();
    }
  }, [profile]);

  const fetchQuests = async () => {
    if (!profile) return;

    try {
      // Get active quests
      const { data: questsData } = await supabase
        .from('quests')
        .select('*')
        .eq('is_active', true)
        .order('difficulty', { ascending: true })
        .limit(4);

      setActiveQuests(questsData || []);
    } catch (error) {
      console.error('Error fetching quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'from-green-500 to-emerald-500';
      case 'medium': return 'from-yellow-500 to-orange-500';
      case 'hard': return 'from-red-500 to-rose-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#202225] animate-pulse">
        <div className="h-64 bg-[#202225] rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Active Quests</h3>
            <p className="text-sm text-gray-400">Complete quests to earn rewards</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quests List */}
      {activeQuests.length === 0 ? (
        <div className="text-center py-12 bg-[#0f0f0f] rounded-lg border border-[#202225]">
          <Target className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No active quests available</p>
          <p className="text-sm text-gray-500 mt-1">Check back later for new quests!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeQuests.map((quest) => (
            <div
              key={quest.id}
              className="bg-[#0f0f0f] rounded-xl p-4 border-2 border-[#202225] hover:border-[#8B5CF6] transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-white font-bold">{quest.title || 'Complete Daily Tasks'}</h4>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getDifficultyBadgeColor(quest.difficulty)}`}>
                      {quest.difficulty?.toUpperCase() || 'MEDIUM'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{quest.description || 'Complete various tasks to earn rewards'}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-gray-600 flex-shrink-0 ml-2" />
              </div>

              {/* Rewards */}
              <div className="flex items-center gap-4 pt-3 border-t border-[#202225]">
                <div className="flex items-center gap-2">
                  <div className={`p-2 bg-gradient-to-br ${getDifficultyColor(quest.difficulty)} rounded-lg`}>
                    <Coins className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reward</p>
                    <p className="text-sm font-bold text-yellow-400">+{quest.token_reward || 100} tokens</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Zap className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">XP</p>
                    <p className="text-sm font-bold text-blue-400">+{quest.xp_reward || 50}</p>
                  </div>
                </div>
                <button className="ml-auto px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                  Start Quest
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quest Type Filter Hint */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          💡 Complete quests daily for bonus tokens. Daily quests reset every 24 hours!
        </p>
      </div>
    </div>
  );
}

