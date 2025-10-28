import { Rocket, Clock, Sparkles, ArrowRight } from 'lucide-react';

interface ComingSoonProps {
  feature: string;
  description: string;
  estimatedRelease?: string;
  icon?: 'rocket' | 'clock' | 'sparkles';
  benefits?: string[];
}

export default function ComingSoon({ 
  feature, 
  description, 
  estimatedRelease = "Coming in a future update",
  icon = 'rocket',
  benefits = []
}: ComingSoonProps) {
  const IconComponent = {
    rocket: Rocket,
    clock: Clock,
    sparkles: Sparkles
  }[icon];

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Main Card */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-[#202225] p-8 sm:p-12 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#8B5CF6] blur-2xl opacity-30 rounded-full"></div>
              <div className="relative bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] p-6 rounded-full">
                <IconComponent className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {feature}
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
            {description}
          </p>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-full mb-8">
            <Clock className="w-5 h-5 text-[#8B5CF6]" />
            <span className="text-[#8B5CF6] font-semibold">{estimatedRelease}</span>
          </div>

          {/* Benefits */}
          {benefits.length > 0 && (
            <div className="mt-12 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-6">What to Expect</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-4 bg-[#1a1a1a] rounded-lg border border-[#202225] text-left"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-6 h-6 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-[#8B5CF6]" />
                      </div>
                    </div>
                    <span className="text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 pt-8 border-t border-[#202225]">
            <p className="text-gray-400 mb-4">
              We're working hard to bring you this feature!
            </p>
            <p className="text-sm text-gray-500">
              In the meantime, explore our other amazing features like 
              <span className="text-[#8B5CF6] font-semibold"> Tournaments</span>,
              <span className="text-[#8B5CF6] font-semibold"> Leaderboards</span>, and
              <span className="text-[#8B5CF6] font-semibold"> Token Rewards</span>!
            </p>
          </div>
        </div>

        {/* Feature Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] p-6 text-center hover:border-[#8B5CF6]/50 transition-colors">
            <div className="text-3xl mb-2">🏆</div>
            <h4 className="text-white font-semibold mb-1">Tournaments</h4>
            <p className="text-sm text-gray-400">Compete for prizes</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] p-6 text-center hover:border-[#8B5CF6]/50 transition-colors">
            <div className="text-3xl mb-2">💰</div>
            <h4 className="text-white font-semibold mb-1">Earn Tokens</h4>
            <p className="text-sm text-gray-400">Play games, get rewarded</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] p-6 text-center hover:border-[#8B5CF6]/50 transition-colors">
            <div className="text-3xl mb-2">👥</div>
            <h4 className="text-white font-semibold mb-1">Social</h4>
            <p className="text-sm text-gray-400">Connect with friends</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-8 bg-[#1a1a1a] rounded-xl border border-[#202225] p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold">Development Progress</span>
            <span className="text-[#8B5CF6] font-bold">In Progress</span>
          </div>
          <div className="w-full bg-[#0f0f0f] rounded-full h-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] rounded-full animate-pulse" style={{ width: '45%' }}></div>
          </div>
          <p className="text-sm text-gray-400 mt-3 text-center">
            We'll notify you when this feature launches! 🚀
          </p>
        </div>
      </div>
    </div>
  );
}

