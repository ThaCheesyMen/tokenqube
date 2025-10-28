import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Trophy, Sparkles, Award, Crown } from 'lucide-react';
import { discordSounds } from '../utils/discordSounds';

interface Achievement {
  id: string;
  game_name: string;
  achievement_name: string;
  achievement_description: string;
  icon_url: string;
  tokens_earned: number;
  rarity_tier: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked_at: string;
}

export default function AchievementNotification() {
  const { profile } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    if (!profile) return;

    // Fetch unnotified achievements on mount
    fetchUnnotifiedAchievements();

    // Subscribe to new achievement unlocks
    const channel = supabase
      .channel('achievement_unlocks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'achievement_unlocks',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newAchievement = payload.new as Achievement;
          setAchievements((prev) => [...prev, newAchievement]);
          discordSounds.playSuccess(); // Play achievement sound
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  useEffect(() => {
    if (achievements.length > 0 && !currentAchievement) {
      showNextAchievement();
    }
  }, [achievements, currentAchievement]);

  const fetchUnnotifiedAchievements = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('achievement_unlocks')
      .select('*')
      .eq('user_id', profile.id)
      .eq('notified', false)
      .order('unlocked_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching unnotified achievements:', error);
      return;
    }

    if (data && data.length > 0) {
      setAchievements(data);
    }
  };

  const showNextAchievement = () => {
    if (achievements.length === 0) {
      setCurrentAchievement(null);
      return;
    }

    const next = achievements[0];
    setCurrentAchievement(next);

    // Mark as notified after showing
    markAsNotified(next.id);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      dismissAchievement();
    }, 5000);
  };

  const markAsNotified = async (achievementId: string) => {
    await supabase
      .from('achievement_unlocks')
      .update({ notified: true })
      .eq('id', achievementId);
  };

  const dismissAchievement = () => {
    setAchievements((prev) => prev.slice(1));
    setCurrentAchievement(null);
  };

  if (!currentAchievement) return null;

  const getRarityConfig = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return {
          bg: 'from-yellow-500 to-orange-500',
          icon: Crown,
          glow: 'shadow-[0_0_30px_rgba(234,179,8,0.6)]',
          text: 'text-yellow-400',
          border: 'border-yellow-500',
        };
      case 'epic':
        return {
          bg: 'from-purple-500 to-pink-500',
          icon: Sparkles,
          glow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
          text: 'text-purple-400',
          border: 'border-purple-500',
        };
      case 'rare':
        return {
          bg: 'from-blue-500 to-cyan-500',
          icon: Award,
          glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]',
          text: 'text-blue-400',
          border: 'border-blue-500',
        };
      default:
        return {
          bg: 'from-gray-500 to-gray-600',
          icon: Trophy,
          glow: 'shadow-lg',
          text: 'text-gray-400',
          border: 'border-gray-500',
        };
    }
  };

  const config = getRarityConfig(currentAchievement.rarity_tier);
  const Icon = config.icon;

  return (
    <div className="fixed top-20 right-6 z-50 animate-slide-in-right">
      <div
        className={`bg-[#1a1a1a] rounded-xl border-2 ${config.border} ${config.glow} overflow-hidden max-w-md transform transition-all hover:scale-105`}
        onClick={dismissAchievement}
      >
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${config.bg} px-4 py-2`}>
          <div className="flex items-center gap-2 text-white">
            <Icon className="w-5 h-5" />
            <span className="font-bold text-sm uppercase tracking-wider">
              {currentAchievement.rarity_tier} Achievement Unlocked!
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex gap-4">
          {/* Achievement Icon */}
          <div className="flex-shrink-0">
            {currentAchievement.icon_url ? (
              <img
                src={currentAchievement.icon_url}
                alt={currentAchievement.achievement_name}
                className={`w-16 h-16 rounded-lg border-2 ${config.border}`}
              />
            ) : (
              <div className={`w-16 h-16 rounded-lg border-2 ${config.border} bg-gradient-to-br ${config.bg} flex items-center justify-center`}>
                <Trophy className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400 mb-1">{currentAchievement.game_name}</div>
            <h3 className="text-white font-bold text-lg leading-tight mb-1">
              {currentAchievement.achievement_name}
            </h3>
            <p className="text-gray-300 text-sm line-clamp-2 mb-2">
              {currentAchievement.achievement_description}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-md">
                <span className="text-yellow-400 text-xl">🪙</span>
                <span className="text-yellow-400 font-bold text-sm">
                  +{currentAchievement.tokens_earned}
                </span>
              </div>
              <span className={`text-xs font-semibold uppercase ${config.text}`}>
                {currentAchievement.rarity_tier}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-[#1a1a1a]">
          <div className={`h-full bg-gradient-to-r ${config.bg} animate-shrink-width`} />
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes shrink-width {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.5s ease-out;
        }
        .animate-shrink-width {
          animation: shrink-width 5s linear;
        }
      `}</style>
    </div>
  );
}

