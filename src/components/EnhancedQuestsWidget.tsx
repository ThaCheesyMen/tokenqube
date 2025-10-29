import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Target, CheckCircle, Clock, Coins, ChevronRight, Zap, Play, Trophy, Flame, Gift } from 'lucide-react';
import { toast } from './Toast';

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
  expires_at?: string;
}

interface EnhancedQuestsWidgetProps {
  onViewAll: () => void;
}

export default function EnhancedQuestsWidget({ onViewAll }: EnhancedQuestsWidgetProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'available'>('active');
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [availableQuests, setAvailableQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchQuests();
    }
  }, [profile, activeTab]);

  const fetchQuests = async () => {
    if (!profile) return;

    try {
      // Fetch active user quests
      const { data: userQuests } = await supabase
        .from('user_quests')
        .select(`
          *,
          quest_id,
          status,
          progress,
          expires_at
        `)
        .eq('user_id', profile.id)
        .eq('status', 'active');

      // Fetch quest templates
      const { data: questTemplates } = await supabase
        .from('quest_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (userQuests && questTemplates) {
        // Match user quests with templates
        const active = userQuests.map(uq => {
          const template = questTemplates.find(qt => qt.id === uq.quest_id);
          return {
            ...template,
            ...uq,
            status: uq.status,
            progress: uq.progress,
            expires_at: uq.expires_at
          };
        }).filter(q => q.id);

        setActiveQuests(active as Quest[]);

        // Get available quests (not in user's active quests)
        const activeQuestIds = userQuests.map(uq => uq.quest_id);
        const available = questTemplates.filter(qt => !activeQuestIds.includes(qt.id));
        setAvailableQuests(available as Quest[]);
      }
    } catch (error) {
      console.error('Error fetching quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuest = async (questId: string, questTitle: string) => {
    if (!profile) {
      toast.error('You must be logged in to start a quest');
      return;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error } = await supabase
        .from('user_quests')
        .insert({
          user_id: profile.id,
          quest_id: questId,
          status: 'active',
          progress: {},
          assigned_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        toast.error('Failed to start quest. You may already have this quest active.');
        return;
      }

      toast.success(`Quest "${questTitle}" started! 🎯`);
      fetchQuests();
      setActiveTab('active');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start quest');
    }
  };

  const handleClaimQuest = async (questId: string, quest: Quest) => {
    if (!profile) return;

    try {
      // Update quest status
      await supabase
        .from('user_quests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('user_id', profile.id)
        .eq('quest_id', questId);

      // Award rewards
      await supabase
        .from('profiles')
        .update({
          token_balance: (profile.token_balance || 0) + (quest.token_reward || 0),
          total_earned: (profile.total_earned || 0) + (quest.token_reward || 0)
        })
        .eq('id', profile.id);

      toast.success(`🎉 Claimed ${quest.token_reward} tokens + ${quest.xp_reward} XP!`);
      fetchQuests();
    } catch (error) {
      toast.error('Failed to claim reward');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'from-green-500 to-emerald-500';
      case 'medium': return 'from-yellow-500 to-orange-500';
      case 'hard': return 'from-red-500 to-rose-500';
      case 'extreme': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'extreme': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return 'No expiry';
    
    const now = Date.now();
    const expire = new Date(expiresAt).getTime();
    const diff = expire - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getQuestProgress = (quest: Quest) => {
    if (!quest.progress || !quest.goal) return 0;
    // Simplified progress calculation
    return Math.min(100, ((quest.progress || 0) / (quest.goal || 1)) * 100);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#202225] rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-5 w-32 bg-[#202225] rounded"></div>
                <div className="h-3 w-48 bg-[#202225] rounded"></div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-[#202225] rounded-lg"></div>
            <div className="h-10 w-24 bg-[#202225] rounded-lg"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-[#202225] rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayQuests = activeTab === 'active' ? activeQuests : availableQuests;

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Quest System</h3>
            <p className="text-sm text-gray-400">Complete challenges to earn rewards</p>
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'active'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
              : 'bg-[#0f0f0f] text-gray-400 hover:text-gray-300'
          }`}
        >
          <Flame className="w-4 h-4" />
          Active ({activeQuests.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'available'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
              : 'bg-[#0f0f0f] text-gray-400 hover:text-gray-300'
          }`}
        >
          <Gift className="w-4 h-4" />
          Available ({availableQuests.length})
        </button>
      </div>

      {/* Quests List */}
      {displayQuests.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl border border-[#202225]">
          <div className="relative inline-block mb-4">
            <Target className="w-16 h-16 text-gray-600" />
            {activeTab === 'available' && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <p className="text-white font-semibold mb-2">
            {activeTab === 'active' ? 'No Active Quests' : 'All Quests Completed!'}
          </p>
          <p className="text-sm text-gray-400">
            {activeTab === 'active' 
              ? 'Start a quest from the Available tab to begin earning!'
              : 'Check back later for new quests to complete!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayQuests.slice(0, 3).map((quest) => {
            const progress = getQuestProgress(quest);
            const isCompleted = progress >= 100;
            const timeRemaining = getTimeRemaining(quest.expires_at);
            const isExpired = timeRemaining === 'Expired';

            return (
              <div
                key={quest.id}
                className={`bg-[#0f0f0f] rounded-xl p-4 border-2 transition-all hover:scale-[1.01] ${
                  isCompleted ? 'border-green-500/50 bg-green-500/5' : 
                  isExpired ? 'border-red-500/50 bg-red-500/5 opacity-60' :
                  activeTab === 'active' ? 'border-blue-500/30' : 'border-[#202225]'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-bold">{quest.title || 'Daily Challenge'}</h4>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getDifficultyBadge(quest.difficulty)}`}>
                        {quest.difficulty?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{quest.description || 'Complete this quest to earn rewards'}</p>
                  </div>
                  {activeTab === 'active' && (
                    <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Progress Bar for Active Quests */}
                {activeTab === 'active' && !isExpired && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-[#202225] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Time Remaining */}
                {activeTab === 'active' && quest.expires_at && (
                  <div className={`flex items-center gap-2 text-xs mb-3 px-2 py-1.5 rounded-lg ${
                    isExpired ? 'bg-red-500/20 text-red-400' : 'bg-[#1a1a1a] text-gray-400'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>{isExpired ? 'Quest expired' : `${timeRemaining} remaining`}</span>
                  </div>
                )}

                {/* Rewards & Action */}
                <div className="flex items-center justify-between pt-3 border-t border-[#202225]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 bg-gradient-to-br ${getDifficultyColor(quest.difficulty)} rounded-lg`}>
                        <Coins className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tokens</p>
                        <p className="text-sm font-bold text-yellow-400">+{quest.token_reward || 100}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500/20 rounded-lg">
                        <Trophy className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">XP</p>
                        <p className="text-sm font-bold text-blue-400">+{quest.xp_reward || 50}</p>
                      </div>
                    </div>
                  </div>
                  
                  {activeTab === 'available' ? (
                    <button
                      onClick={() => handleStartQuest(quest.id, quest.title || 'Quest')}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </button>
                  ) : isCompleted ? (
                    <button
                      onClick={() => handleClaimQuest(quest.id, quest)}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Claim
                    </button>
                  ) : isExpired ? (
                    <span className="text-xs text-red-400 font-semibold">Expired</span>
                  ) : (
                    <span className="text-xs text-gray-500">In Progress...</span>
                  )}
                </div>
              </div>
            );
          })}

          {displayQuests.length > 3 && (
            <div className="text-center py-3 bg-[#0f0f0f] rounded-lg border border-[#202225] hover:border-[#8B5CF6] transition-all cursor-pointer" onClick={onViewAll}>
              <p className="text-sm text-gray-400">
                +{displayQuests.length - 3} more {activeTab} quest{displayQuests.length - 3 !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-[#8B5CF6] mt-1">View all quests</p>
            </div>
          )}
        </div>
      )}

      {/* Info Tip */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          💡 <span className="font-bold">Daily quests reset every 24 hours!</span> Complete them before they expire to maximize your earnings.
        </p>
      </div>
    </div>
  );
}

