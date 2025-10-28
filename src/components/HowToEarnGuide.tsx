import { useState } from 'react';
import { 
  Gamepad2, Calendar, Target, Trophy, Users, TrendingUp, 
  Gift, Zap, ChevronRight, X, Sparkles, Clock, Award, Flame
} from 'lucide-react';

export default function HowToEarnGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  const earningMethods = [
    {
      icon: Gamepad2,
      title: 'Play Games',
      amount: '50 tokens/hour',
      description: 'Automatically tracked when you play games. Tokens awarded every minute!',
      color: 'from-purple-500 to-purple-600',
      details: [
        'Auto-detection for installed games',
        'Manual tracking available',
        'Tokens sync every 60 seconds',
        'No limit on earnings'
      ]
    },
    {
      icon: Calendar,
      title: 'Daily Login',
      amount: '50-500 tokens',
      description: 'Log in every day to maintain your streak and earn bonus tokens',
      color: 'from-blue-500 to-blue-600',
      details: [
        'Day 1: 50 tokens',
        'Day 7: 200 tokens',
        'Day 30: 500 tokens',
        'Streak bonuses multiply'
      ]
    },
    {
      icon: Target,
      title: 'Complete Quests',
      amount: '100-5000 tokens',
      description: 'Daily, weekly, and special quests with big rewards',
      color: 'from-green-500 to-green-600',
      details: [
        'Daily quests: 100-500 tokens',
        'Weekly quests: 500-2000 tokens',
        'Special events: Up to 5000 tokens',
        'Quest resets daily/weekly'
      ]
    },
    {
      icon: Trophy,
      title: 'Unlock Achievements',
      amount: '100-1000 tokens',
      description: 'Earn achievements for milestones and special accomplishments',
      color: 'from-yellow-500 to-yellow-600',
      details: [
        'Platform achievements',
        'Game-specific achievements',
        'Secret achievements',
        'One-time rewards'
      ]
    },
    {
      icon: Users,
      title: 'Refer Friends',
      amount: '500 tokens/friend',
      description: 'Invite friends and earn tokens when they join',
      color: 'from-pink-500 to-pink-600',
      details: [
        '500 tokens per friend',
        'Bonus when they reach Level 5',
        'Unlimited referrals',
        'Track in profile'
      ]
    },
    {
      icon: Award,
      title: 'Leaderboard Rewards',
      amount: '250-1000 tokens',
      description: 'Compete weekly for top positions and earn big rewards',
      color: 'from-orange-500 to-orange-600',
      details: [
        '🥇 1st Place: 1000 tokens',
        '🥈 2nd Place: 500 tokens',
        '🥉 3rd Place: 250 tokens',
        'Resets weekly'
      ]
    },
    {
      icon: TrendingUp,
      title: 'Social Engagement',
      amount: '5-50 tokens',
      description: 'Create posts, host parties, and engage with the community',
      color: 'from-cyan-500 to-cyan-600',
      details: [
        'Create posts: 10 tokens',
        'Get likes: 5 tokens/10 likes',
        'Host parties: 50 tokens',
        'Active participation rewarded'
      ]
    },
    {
      icon: Sparkles,
      title: 'Special Events',
      amount: 'Variable',
      description: 'Tournaments, community events, and seasonal bonuses',
      color: 'from-red-500 to-red-600',
      details: [
        'Tournament prizes',
        'Community events',
        'Seasonal bonuses',
        'Limited-time offers'
      ]
    }
  ];

  if (!isExpanded) {
    return (
      <div className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] rounded-xl p-6 shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">How to Earn Tokens</h2>
              <p className="text-white/80">8 ways to earn tokens - Start earning now!</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="px-6 py-3 bg-white text-[#8B5CF6] rounded-lg font-bold hover:bg-white/90 transition-all flex items-center gap-2 shadow-lg"
          >
            View Guide
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
            <Gamepad2 className="w-6 h-6 text-white mx-auto mb-1" />
            <p className="text-white font-bold text-sm">50/hr</p>
            <p className="text-white/70 text-xs">Gaming</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
            <Calendar className="w-6 h-6 text-white mx-auto mb-1" />
            <p className="text-white font-bold text-sm">50-500</p>
            <p className="text-white/70 text-xs">Daily Login</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
            <Target className="w-6 h-6 text-white mx-auto mb-1" />
            <p className="text-white font-bold text-sm">100-5000</p>
            <p className="text-white/70 text-xs">Quests</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
            <Users className="w-6 h-6 text-white mx-auto mb-1" />
            <p className="text-white font-bold text-sm">500</p>
            <p className="text-white/70 text-xs">Per Friend</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">How to Earn Tokens</h2>
              <p className="text-white/80">Complete guide to all earning methods</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {earningMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <div
                  key={index}
                  className="bg-[#0f0f0f] rounded-xl p-6 border border-[#202225] hover:border-[#8B5CF6] transition-all group"
                >
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 bg-gradient-to-br ${method.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{method.title}</h3>
                      <p className={`text-lg font-bold bg-gradient-to-r ${method.color} bg-clip-text text-transparent`}>
                        {method.amount}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 mb-4">{method.description}</p>

                  {/* Details */}
                  <div className="space-y-2">
                    {method.details.map((detail, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <ChevronRight className="w-4 h-4 text-[#8B5CF6] flex-shrink-0" />
                        <span className="text-gray-300">{detail}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-4 border-t border-[#202225]">
                    <button className={`w-full py-2 bg-gradient-to-r ${method.color} text-white rounded-lg font-semibold hover:opacity-90 transition-opacity`}>
                      Start Earning
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pro Tips */}
          <div className="mt-8 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Flame className="w-6 h-6 text-yellow-500" />
              <h3 className="text-xl font-bold text-white">Pro Tips for Maximum Earnings</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">Play Daily</p>
                  <p className="text-sm text-gray-400">Maintain your streak for massive bonus multipliers</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Target className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">Complete Quests</p>
                  <p className="text-sm text-gray-400">Check daily quests for quick easy tokens</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Gamepad2 className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">Track Your Games</p>
                  <p className="text-sm text-gray-400">Gaming earns 50 tokens per hour automatically</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">Compete Weekly</p>
                  <p className="text-sm text-gray-400">Top 3 on leaderboard get huge rewards</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

