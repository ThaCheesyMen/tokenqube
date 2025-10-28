import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Gift, Flame, X, Coins } from 'lucide-react';
import { toast } from './Toast';

interface LoginReward {
  streak_count: number;
  tokens_earned: number;
}

export default function DailyLoginReward() {
  const { profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [reward, setReward] = useState<LoginReward | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      checkDailyLogin();
    }
  }, [profile]);

  const checkDailyLogin = async () => {
    if (!profile || loading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_daily_login', {
        p_user_id: profile.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.tokens_earned > 0) {
          setReward(result);
          setShowModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking daily login:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setTimeout(() => setReward(null), 300);
  };

  if (!showModal || !reward) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-yellow-500 shadow-2xl shadow-yellow-500/20 animate-scaleIn">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-yellow-500 to-orange-500 p-6 rounded-full">
              <Gift className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-black text-center text-white mb-2">
          Daily Login Bonus!
        </h2>
        <p className="text-center text-gray-400 mb-6">
          Welcome back! Here's your reward
        </p>

        {/* Reward Amount */}
        <div className="bg-black/30 rounded-xl p-6 mb-6 border border-yellow-500/30">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Coins className="w-8 h-8 text-yellow-500" />
            <span className="text-5xl font-black text-yellow-500">
              +{reward.tokens_earned}
            </span>
          </div>
          <p className="text-center text-gray-400 text-sm">Tokens Added</p>
        </div>

        {/* Streak Info */}
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 mb-6 border border-orange-500/30">
          <div className="flex items-center justify-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-white font-bold">
              {reward.streak_count} Day Streak!
            </span>
          </div>
          <p className="text-center text-gray-400 text-xs mt-1">
            Login daily to increase your bonus
          </p>
        </div>

        {/* Streak Bonus Table */}
        <div className="bg-black/20 rounded-lg p-4 mb-6">
          <p className="text-xs text-gray-400 text-center mb-3">Daily Bonus Chart:</p>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="text-center">
              <div className="text-yellow-500 font-bold">Day 1</div>
              <div className="text-gray-500">10 🪙</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-500 font-bold">Day 3</div>
              <div className="text-gray-500">16 🪙</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-500 font-bold">Day 7</div>
              <div className="text-gray-500">24 🪙</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-500 font-bold">Day 30</div>
              <div className="text-gray-500">70 🪙</div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105"
        >
          Awesome! 🎉
        </button>
      </div>
    </div>
  );
}

