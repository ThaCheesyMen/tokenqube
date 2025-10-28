import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, Copy, CheckCircle, Gift, TrendingUp, UserPlus } from 'lucide-react';

interface Referral {
  id: string;
  referred_id: string;
  bonus_tokens: number;
  created_at: string;
  profiles: {
    username: string;
  };
}

export default function Referrals() {
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setReferralCode(profile.referral_code);
      fetchReferrals();
    }
  }, [profile]);

  const fetchReferrals = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('referrals')
      .select(`
        id,
        referred_id,
        bonus_tokens,
        created_at,
        profiles:referred_id (username)
      `)
      .eq('referrer_id', profile.id)
      .order('created_at', { ascending: false });

    if (data) {
      setReferrals(data as any);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyReferralCode = async () => {
    if (!inputCode.trim()) {
      setMessage({ type: 'error', text: 'Please enter a referral code' });
      return;
    }

    if (profile?.referred_by) {
      setMessage({ type: 'error', text: 'You have already used a referral code' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.rpc('process_referral', {
      p_referral_code: inputCode.toUpperCase(),
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else if (data?.success) {
      setMessage({
        type: 'success',
        text: 'Referral code applied! The referrer has been rewarded.',
      });
      setInputCode('');
    } else {
      setMessage({ type: 'error', text: data?.error || 'Invalid referral code' });
    }

    setLoading(false);
  };

  const totalEarned = referrals.reduce((sum, ref) => sum + ref.bonus_tokens, 0);

  return (
    <div className="h-full w-full p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0f0f0f]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Referral Program</h1>
        <p className="text-gray-400">Invite friends and earn 50 tokens for each referral!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1a1a1a] rounded-xl shadow-sm p-6 border border-[#202225]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Referrals</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{referrals.length}</p>
        </div>

        <div className="bg-white dark:bg-[#0f0f0f] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Earned</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalEarned}</p>
        </div>

        <div className="bg-white dark:bg-[#0f0f0f] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <Gift className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Per Referral</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">50</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-4">Your Referral Code</h2>
          <div className="bg-white/20 dark:bg-emerald-900/30 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/30">
            <p className="text-3xl font-bold text-center tracking-wider">{referralCode}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={copyReferralCode}
              className="w-full bg-white dark:bg-[#0f0f0f] text-emerald-600 dark:text-emerald-400 py-3 rounded-lg font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors flex items-center justify-center space-x-2 border border-emerald-600 dark:border-emerald-400"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={copyReferralLink}
              className="w-full bg-white/20 dark:bg-emerald-900/30 backdrop-blur-sm text-white py-3 rounded-lg font-semibold hover:bg-white/30 dark:hover:bg-emerald-900/40 transition-colors border border-white/30"
            >
              Copy Referral Link
            </button>
          </div>

          <p className="text-sm text-emerald-100 mt-4 text-center">
            Share this code with friends to earn 50 tokens per referral!
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f0f0f] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Have a Referral Code?</h2>

          {profile?.referred_by ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-200">Already Applied</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    You've already used a referral code. Thanks for joining through a referral!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Enter a friend's referral code to help them earn bonus tokens!
              </p>

              {message && (
                <div
                  className={`mb-4 p-3 rounded-lg flex items-start space-x-2 ${
                    message.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Users className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-sm ${
                      message.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                    }`}
                  >
                    {message.text}
                  </span>
                </div>
              )}

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Enter referral code"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                  maxLength={8}
                />
                <button
                  onClick={applyReferralCode}
                  disabled={loading}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Apply</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#0f0f0f] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Referrals</h2>

        {referrals.length > 0 ? (
          <div className="space-y-3">
            {referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-4 bg-[#0f0f0f] dark:bg-[#1a1a1a]/50 rounded-lg hover:bg-[#0f0f0f] dark:hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold">
                    {referral.profiles.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{referral.profiles.username}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">+{referral.bonus_tokens}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">tokens earned</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No referrals yet. Start sharing your code to earn bonus tokens!</p>
          </div>
        )}
      </div>
    </div>
  );
}
