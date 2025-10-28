import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Gift, Target, Zap, ShoppingBag, Trophy, Users, Sparkles } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  gradient: string;
  onClick: () => void;
  badge?: number;
  isClaimable?: boolean;
  disabled?: boolean;
}

interface QuickActionsBarProps {
  onNavigate: (tab: string) => void;
  onClaimDaily: () => void;
}

export default function QuickActionsBar({ onNavigate, onClaimDaily }: QuickActionsBarProps) {
  const { profile } = useAuth();
  const [dailyClaimable, setDailyClaimable] = useState(false);
  const [questsAvailable, setQuestsAvailable] = useState(0);
  const [boostsActive, setBoostsActive] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      checkClaimableStatus();
    }
  }, [profile]);

  const checkClaimableStatus = async () => {
    if (!profile) return;

    try {
      // Check if daily reward is claimable
      const { data: profileData } = await supabase
        .from('profiles')
        .select('last_daily_login')
        .eq('id', profile.id)
        .single();

      const lastLogin = profileData?.last_daily_login;
      const today = new Date().toDateString();
      const canClaimDaily = !lastLogin || new Date(lastLogin).toDateString() !== today;
      setDailyClaimable(canClaimDaily);

      // Check available quests
      const { data: questsData, count } = await supabase
        .from('quests')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('quest_type', 'daily');
      
      setQuestsAvailable(count || 0);

      // Check active boosts (you'll need a token_boosts table for this)
      const { data: boostsData } = await supabase
        .from('token_boosts')
        .select('*')
        .eq('user_id', profile.id)
        .gte('expires_at', new Date().toISOString());
      
      setBoostsActive(boostsData?.length || 0);
    } catch (error) {
      console.error('Error checking claimable status:', error);
    } finally {
      setLoading(false);
    }
  };

  const actions: QuickAction[] = [
    {
      id: 'daily',
      label: dailyClaimable ? 'Claim Daily Reward' : 'Daily Reward Claimed',
      icon: Gift,
      gradient: 'from-pink-500 to-rose-500',
      onClick: onClaimDaily,
      isClaimable: dailyClaimable,
      disabled: !dailyClaimable
    },
    {
      id: 'quests',
      label: 'View Quests',
      icon: Target,
      gradient: 'from-blue-500 to-cyan-500',
      onClick: () => onNavigate('quests'),
      badge: questsAvailable
    },
    {
      id: 'boosts',
      label: 'Token Staking',
      icon: Zap,
      gradient: 'from-yellow-500 to-orange-500',
      onClick: () => onNavigate('battlepass'),
      badge: boostsActive
    },
    {
      id: 'marketplace',
      label: 'Buy/Sell Tokens',
      icon: ShoppingBag,
      gradient: 'from-purple-500 to-indigo-500',
      onClick: () => onNavigate('buytokens')
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: Trophy,
      gradient: 'from-green-500 to-emerald-500',
      onClick: () => onNavigate('achievements')
    },
    {
      id: 'referrals',
      label: 'Invite Friends',
      icon: Users,
      gradient: 'from-orange-500 to-red-500',
      onClick: () => onNavigate('referrals')
    },
    {
      id: 'transactions',
      label: 'History',
      icon: Sparkles,
      gradient: 'from-amber-500 to-yellow-500',
      onClick: () => onNavigate('transactions')
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="animate-pulse bg-[#1a1a1a] rounded-xl h-24 border border-[#202225]"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Quick Actions</h3>
        <button
          onClick={checkClaimableStatus}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`relative group ${
                action.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 active:scale-95'
              } transition-all duration-200`}
            >
              <div className={`bg-[#1a1a1a] rounded-xl p-4 border-2 ${
                action.isClaimable 
                  ? 'border-pink-500 shadow-lg shadow-pink-500/30 animate-pulse' 
                  : action.disabled
                  ? 'border-[#202225]'
                  : 'border-[#202225] hover:border-[#8B5CF6]'
              } transition-all`}>
                {/* Badge */}
                {action.badge !== undefined && action.badge > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-10">
                    {action.badge > 99 ? '99+' : action.badge}
                  </div>
                )}

                {/* Claimable indicator */}
                {action.isClaimable && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full animate-ping"></div>
                )}

                {/* Icon */}
                <div className={`mx-auto mb-2 p-3 bg-gradient-to-br ${action.gradient} rounded-lg shadow-lg ${
                  action.disabled ? 'grayscale' : 'group-hover:scale-110'
                } transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Label */}
                <p className={`text-xs font-semibold text-center ${
                  action.disabled ? 'text-gray-500' : 'text-gray-300 group-hover:text-white'
                } transition-colors`}>
                  {action.label}
                </p>
              </div>

              {/* Tooltip on hover */}
              {!action.disabled && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  {action.label}
                  {action.badge !== undefined && action.badge > 0 && (
                    <span className="ml-1 text-yellow-400">({action.badge} available)</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Special notification banner */}
      {dailyClaimable && (
        <div className="mt-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/20 rounded-lg animate-pulse">
              <Gift className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Daily Reward Available!</p>
              <p className="text-xs text-gray-400">Claim your daily login reward now</p>
            </div>
          </div>
          <button
            onClick={onClaimDaily}
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            Claim Now
          </button>
        </div>
      )}
    </div>
  );
}

