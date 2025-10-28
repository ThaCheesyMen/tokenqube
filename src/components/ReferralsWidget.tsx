import { useAuth } from '../contexts/AuthContext';
import { Users, Copy, Gift, Coins, ChevronRight, Share2, Link as LinkIcon } from 'lucide-react';
import { toast } from './Toast';

interface ReferralsWidgetProps {
  onViewAll: () => void;
}

export default function ReferralsWidget({ onViewAll }: ReferralsWidgetProps) {
  const { profile } = useAuth();

  const referralCode = profile?.referral_code || 'LOADING...';
  const referralUrl = `${window.location.origin}/signup?ref=${referralCode}`;
  
  // These would come from database in a real implementation
  const totalReferrals = (profile as any)?.total_referrals || 0;
  const tokensEarned = totalReferrals * 100; // 100 tokens per referral

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const shareReferral = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join TokenQuest!',
        text: `Join me on TokenQuest and earn tokens by playing games! Use my referral code: ${referralCode}`,
        url: referralUrl
      }).catch(() => {
        // Fallback to copy if sharing fails
        copyToClipboard(referralUrl, 'Referral link');
      });
    } else {
      copyToClipboard(referralUrl, 'Referral link');
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-[#202225] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Referral Program</h3>
            <p className="text-sm text-gray-400">Invite friends, earn rewards</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
        >
          <span>Details</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Total Referrals</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalReferrals}</p>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Tokens Earned</span>
          </div>
          <p className="text-3xl font-bold text-yellow-400">+{tokensEarned}</p>
        </div>
      </div>

      {/* Referral Code Card */}
      <div className="bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-xl p-6 mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-white/80" />
            <p className="text-white/80 text-sm font-medium">Your Referral Code</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-3 border border-white/30">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-white tracking-wider">{referralCode}</span>
              <button
                onClick={() => copyToClipboard(referralCode, 'Referral code')}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Copy className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          <p className="text-white/90 text-sm mb-3">
            Share your code and earn <span className="font-bold text-yellow-300">100 tokens</span> for each friend who joins!
          </p>
        </div>
      </div>

      {/* Quick Share Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => copyToClipboard(referralUrl, 'Referral link')}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0f0f0f] hover:bg-[#1a1a1a] border border-[#202225] hover:border-[#8B5CF6] text-white rounded-lg font-semibold transition-all"
        >
          <LinkIcon className="w-5 h-5" />
          <span>Copy Link</span>
        </button>
        <button
          onClick={shareReferral}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white rounded-lg font-semibold transition-all"
        >
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </button>
      </div>

      {/* How It Works */}
      <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
        <h4 className="text-white font-semibold mb-3 text-sm">How It Works</h4>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-green-500/20 rounded-lg mt-0.5">
              <span className="text-xs font-bold text-green-400">1</span>
            </div>
            <p className="text-xs text-gray-400 flex-1">Share your referral code or link with friends</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-green-500/20 rounded-lg mt-0.5">
              <span className="text-xs font-bold text-green-400">2</span>
            </div>
            <p className="text-xs text-gray-400 flex-1">They sign up using your code</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-green-500/20 rounded-lg mt-0.5">
              <span className="text-xs font-bold text-green-400">3</span>
            </div>
            <p className="text-xs text-gray-400 flex-1">You both earn <span className="text-yellow-400 font-semibold">100 tokens</span>!</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <p className="text-xs text-green-300">
          🎁 <span className="font-bold">Unlimited referrals!</span> The more friends you invite, the more you earn.
        </p>
      </div>
    </div>
  );
}

