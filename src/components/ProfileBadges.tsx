import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Award, Lock, Star, X } from 'lucide-react';
import { toast } from './Toast';

interface Badge {
  id: string;
  badge_key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: string;
  is_animated: boolean;
}

interface UserBadge extends Badge {
  user_badge_id: string;
  unlocked_at: string;
  is_showcased: boolean;
  showcase_order: number;
}

interface ProfileBadgesProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function ProfileBadges({ userId, isOwnProfile = false }: ProfileBadgesProps) {
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [showcasedBadges, setShowcasedBadges] = useState<UserBadge[]>([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    setLoading(true);

    // Fetch all badge definitions
    const { data: badges } = await supabase
      .from('profile_badges')
      .select('*')
      .order('rarity', { ascending: false });

    if (badges) {
      setAllBadges(badges);
    }

    // Fetch user's unlocked badges
    const { data: userBadgesData } = await supabase
      .from('user_badges')
      .select(`
        id,
        unlocked_at,
        is_showcased,
        showcase_order,
        badge_id,
        profile_badges (*)
      `)
      .eq('user_id', userId);

    if (userBadgesData) {
      const formatted = userBadgesData.map((ub: any) => ({
        user_badge_id: ub.id,
        unlocked_at: ub.unlocked_at,
        is_showcased: ub.is_showcased,
        showcase_order: ub.showcase_order,
        ...ub.profile_badges
      }));

      setUserBadges(formatted);
      setShowcasedBadges(formatted.filter((b: UserBadge) => b.is_showcased).sort((a, b) => a.showcase_order - b.showcase_order));
    }

    setLoading(false);
  };

  const toggleShowcase = async (userBadgeId: string, isCurrentlyShowcased: boolean) => {
    if (!isOwnProfile) return;

    const showcaseCount = showcasedBadges.length;
    
    if (!isCurrentlyShowcased && showcaseCount >= 5) {
      toast.error('You can only showcase up to 5 badges!');
      return;
    }

    const { error } = await supabase
      .from('user_badges')
      .update({ 
        is_showcased: !isCurrentlyShowcased,
        showcase_order: !isCurrentlyShowcased ? showcaseCount : null
      })
      .eq('id', userBadgeId);

    if (!error) {
      fetchBadges();
      toast.success(isCurrentlyShowcased ? 'Badge removed from showcase' : 'Badge added to showcase');
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: { [key: string]: string } = {
      common: 'from-gray-500 to-gray-600',
      uncommon: 'from-green-500 to-emerald-500',
      rare: 'from-blue-500 to-cyan-500',
      epic: 'from-purple-500 to-pink-500',
      legendary: 'from-yellow-500 to-orange-500'
    };
    return colors[rarity] || colors.common;
  };

  const getRarityBorder = (rarity: string) => {
    const borders: { [key: string]: string } = {
      common: 'border-gray-500/50',
      uncommon: 'border-green-500/50',
      rare: 'border-blue-500/50',
      epic: 'border-purple-500/50',
      legendary: 'border-yellow-500/50'
    };
    return borders[rarity] || borders.common;
  };

  const unlockedBadgeIds = new Set(userBadges.map(ub => ub.id));

  return (
    <div>
      {/* Showcased Badges (Always visible on profile) */}
      {showcasedBadges.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {showcasedBadges.map((badge) => (
            <div
              key={badge.user_badge_id}
              className={`relative group cursor-pointer bg-gradient-to-br ${badge.color} rounded-xl p-3 shadow-lg hover:scale-110 transition-all border-2 ${getRarityBorder(badge.rarity)}`}
              title={`${badge.name} - ${badge.description}`}
            >
              <div className="text-3xl">{badge.icon}</div>
              {badge.is_animated && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Manage Badges Button (Own Profile Only) */}
      {isOwnProfile && (
        <button
          onClick={() => setShowBadgeModal(true)}
          className="mt-4 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-all flex items-center gap-2"
        >
          <Award className="w-4 h-4" />
          Manage Badges
        </button>
      )}

      {/* Badge Management Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-[#202225]">
            {/* Header */}
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#202225] p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Award className="w-6 h-6 text-[#8B5CF6]" />
                  Badge Collection
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Unlocked {userBadges.length} of {allBadges.length} badges · Showcasing {showcasedBadges.length}/5
                </p>
              </div>
              <button
                onClick={() => setShowBadgeModal(false)}
                className="p-2 hover:bg-[#0f0f0f] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Unlocked Badges */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Unlocked Badges ({userBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {userBadges.map((badge) => (
                    <div
                      key={badge.user_badge_id}
                      className={`relative bg-gradient-to-br ${badge.color} rounded-xl p-4 border-2 ${getRarityBorder(badge.rarity)} ${
                        badge.is_showcased ? 'ring-2 ring-[#8B5CF6] ring-offset-2 ring-offset-[#2f3136]' : ''
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2">{badge.icon}</div>
                        <h4 className="font-bold text-white text-sm mb-1">{badge.name}</h4>
                        <p className="text-xs text-white/80 mb-2">{badge.description}</p>
                        <span className={`inline-block text-xs font-bold uppercase px-2 py-1 rounded bg-gradient-to-r ${getRarityColor(badge.rarity)} text-white`}>
                          {badge.rarity}
                        </span>
                        <p className="text-xs text-white/60 mt-2">
                          {new Date(badge.unlocked_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => toggleShowcase(badge.user_badge_id, badge.is_showcased)}
                        className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                          badge.is_showcased
                            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {badge.is_showcased ? 'Remove from Showcase' : 'Add to Showcase'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Locked Badges */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-gray-500" />
                  Locked Badges ({allBadges.length - userBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {allBadges
                    .filter((badge) => !unlockedBadgeIds.has(badge.id))
                    .map((badge) => (
                      <div
                        key={badge.id}
                        className="relative bg-[#1a1a1a] rounded-xl p-4 border-2 border-[#202225] opacity-60"
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2 grayscale">{badge.icon}</div>
                        <h4 className="font-bold text-gray-400 text-sm mb-1">{badge.name}</h4>
                        <p className="text-xs text-gray-500 mb-2">{badge.description}</p>
                          <span className={`inline-block text-xs font-bold uppercase px-2 py-1 rounded bg-gradient-to-r ${getRarityColor(badge.rarity)} text-white opacity-50`}>
                            {badge.rarity}
                          </span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                          <Lock className="w-8 h-8 text-gray-400" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

