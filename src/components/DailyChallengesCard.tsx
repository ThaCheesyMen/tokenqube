import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Target, CheckCircle, Circle, Gift, Gamepad2, Trophy, Users, Zap } from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  goal: number;
  completed: boolean;
  icon: React.ElementType;
  color: string;
}

export default function DailyChallengesCard() {
  const { profile } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (profile) {
      fetchDailyChallenges();
    }
  }, [profile]);

  const fetchDailyChallenges = async () => {
    if (!profile) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Check daily login
      const { data: profileData } = await supabase
        .from('profiles')
        .select('last_daily_login')
        .eq('id', profile.id)
        .single();

      const loginCompleted = profileData?.last_daily_login 
        && new Date(profileData.last_daily_login).toISOString().split('T')[0] === today;

      // Check today's playtime
      const { data: activityData } = await supabase
        .from('gaming_activity')
        .select('hours_played')
        .eq('user_id', profile.id)
        .gte('activity_date', new Date().setHours(0, 0, 0, 0));

      const hoursPlayed = activityData?.reduce((sum, a) => sum + (a.hours_played || 0), 0) || 0;

      // Check quest completions today
      const { data: questsData } = await supabase
        .from('user_quests')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .gte('completed_at', new Date().setHours(0, 0, 0, 0));

      const questsCompleted = questsData?.length || 0;

      // Check achievements unlocked today
      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', profile.id)
        .eq('unlocked', true)
        .gte('unlocked_at', new Date().setHours(0, 0, 0, 0));

      const achievementsUnlocked = achievementsData?.length || 0;

      // Create challenges array
      const dailyChallenges: Challenge[] = [
        {
          id: 'login',
          title: 'Daily Login',
          description: 'Log in to claim your daily reward',
          reward: 50,
          progress: loginCompleted ? 1 : 0,
          goal: 1,
          completed: loginCompleted,
          icon: Gift,
          color: 'from-pink-500 to-rose-500'
        },
        {
          id: 'playtime',
          title: 'Play 1 Hour',
          description: 'Play any game for 1 hour',
          reward: 100,
          progress: Math.min(hoursPlayed, 1),
          goal: 1,
          completed: hoursPlayed >= 1,
          icon: Gamepad2,
          color: 'from-blue-500 to-cyan-500'
        },
        {
          id: 'quests',
          title: 'Complete 1 Quest',
          description: 'Finish any daily or weekly quest',
          reward: 150,
          progress: Math.min(questsCompleted, 1),
          goal: 1,
          completed: questsCompleted >= 1,
          icon: Target,
          color: 'from-green-500 to-emerald-500'
        },
        {
          id: 'achievements',
          title: 'Unlock Achievement',
          description: 'Unlock any achievement',
          reward: 200,
          progress: Math.min(achievementsUnlocked, 1),
          goal: 1,
          completed: achievementsUnlocked >= 1,
          icon: Trophy,
          color: 'from-yellow-500 to-orange-500'
        }
      ];

      setChallenges(dailyChallenges);
      setCompletedCount(dailyChallenges.filter(c => c.completed).length);
    } catch (error) {
      console.error('Error fetching daily challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const allCompleted = completedCount === challenges.length;
  const bonusReward = 500;
  const totalReward = challenges.reduce((sum, c) => sum + c.reward, 0) + (allCompleted ? bonusReward : 0);

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#202225] animate-pulse">
        <div className="h-64 bg-[#202225] rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-3xl"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 ${
              allCompleted 
                ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
                : 'bg-gradient-to-br from-blue-500 to-cyan-500'
            } rounded-xl shadow-lg`}>
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Daily Challenges</h3>
              <p className="text-sm text-gray-400">{completedCount}/{challenges.length} completed</p>
            </div>
          </div>
          <button
            onClick={fetchDailyChallenges}
            className="p-2 hover:bg-[#202225] rounded-lg transition-colors"
            title="Refresh challenges"
          >
            <Zap className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Overall Progress</span>
            <span className="text-sm font-bold text-[#8B5CF6]">{Math.round((completedCount / challenges.length) * 100)}%</span>
          </div>
          <div className="h-3 bg-[#202225] rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                allCompleted 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500'
              } rounded-full transition-all duration-500`}
              style={{ width: `${(completedCount / challenges.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Challenges List */}
        <div className="space-y-3 mb-6">
          {challenges.map((challenge) => {
            const Icon = challenge.icon;
            const progressPercentage = (challenge.progress / challenge.goal) * 100;
            
            return (
              <div
                key={challenge.id}
                className={`bg-[#0f0f0f] rounded-xl p-4 border-2 ${
                  challenge.completed 
                    ? 'border-green-500/30 bg-green-500/5' 
                    : 'border-[#202225] hover:border-[#8B5CF6]/30'
                } transition-all group`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 bg-gradient-to-br ${challenge.color} rounded-lg shadow-lg flex-shrink-0 ${
                    challenge.completed ? '' : 'opacity-50'
                  }`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className={`font-semibold ${
                          challenge.completed ? 'text-white' : 'text-gray-300'
                        }`}>
                          {challenge.title}
                        </h4>
                        <p className="text-xs text-gray-500">{challenge.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-md">
                          <Gift className="w-3 h-3 text-yellow-400" />
                          <span className="text-xs font-bold text-yellow-400">+{challenge.reward}</span>
                        </div>
                        {challenge.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {!challenge.completed && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Progress</span>
                          <span className="text-xs font-semibold text-white">
                            {challenge.progress.toFixed(challenge.id === 'playtime' ? 1 : 0)}/{challenge.goal}
                          </span>
                        </div>
                        <div className="h-2 bg-[#202225] rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${challenge.color} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bonus Reward */}
        <div className={`${
          allCompleted 
            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50' 
            : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30'
        } border-2 rounded-xl p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 ${
              allCompleted 
                ? 'bg-gradient-to-br from-yellow-500 to-orange-500 animate-pulse' 
                : 'bg-[#8B5CF6]/20'
            } rounded-lg`}>
              <Gift className={`w-5 h-5 ${allCompleted ? 'text-white' : 'text-[#8B5CF6]'}`} />
            </div>
            <div>
              <p className={`text-sm font-bold ${allCompleted ? 'text-yellow-400' : 'text-white'}`}>
                {allCompleted ? '🎉 All Challenges Complete!' : 'Complete All Challenges'}
              </p>
              <p className="text-xs text-gray-400">
                {allCompleted 
                  ? `Earned ${totalReward} total tokens today!` 
                  : `Bonus: +${bonusReward} tokens`
                }
              </p>
            </div>
          </div>
          {allCompleted && (
            <div className="text-right">
              <p className="text-2xl font-bold text-yellow-400">+{bonusReward}</p>
              <p className="text-xs text-yellow-600">BONUS!</p>
            </div>
          )}
        </div>

        {/* Reset Timer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Challenges reset in{' '}
            <span className="font-semibold text-white">
              {Math.floor((24 - new Date().getHours()))}h {Math.floor((60 - new Date().getMinutes()))}m
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

