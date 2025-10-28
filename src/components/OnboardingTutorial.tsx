import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  X, ArrowRight, ArrowLeft, Check, Sparkles, Gamepad2,
  Users, MessageCircle, Trophy, Coins, Settings
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  highlightElement?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to TokenQube! 🎮',
    description: 'Your ultimate gaming rewards platform. Earn tokens for playing games, unlock achievements, and connect with friends!',
    icon: Sparkles,
  },
  {
    id: 'gaming',
    title: 'Track Your Gaming',
    description: 'Connect your gaming accounts (Steam, Xbox, PlayStation) to automatically track playtime and achievements. Earn tokens for every hour played!',
    icon: Gamepad2,
    highlightElement: '[data-tour="gaming"]',
  },
  {
    id: 'friends',
    title: 'Connect with Friends',
    description: 'Add friends, see what they\'re playing, join parties, and voice chat. Gaming is better together!',
    icon: Users,
    highlightElement: '[data-tour="friends"]',
  },
  {
    id: 'chat',
    title: 'Stay Connected',
    description: 'Chat with friends, join global conversations, and start voice/video calls. Full Discord-like experience!',
    icon: MessageCircle,
    highlightElement: '[data-tour="chat"]',
  },
  {
    id: 'achievements',
    title: 'Unlock Achievements',
    description: 'Complete in-game achievements to earn bonus tokens. Rare achievements give you even more rewards!',
    icon: Trophy,
    highlightElement: '[data-tour="achievements"]',
  },
  {
    id: 'tokens',
    title: 'Earn & Spend Tokens',
    description: 'Earn tokens by playing, completing quests, and unlocking achievements. Spend them in the marketplace or upgrade to premium!',
    icon: Coins,
    highlightElement: '[data-tour="tokens"]',
  },
  {
    id: 'customize',
    title: 'Customize Your Experience',
    description: 'Visit settings to personalize your profile, adjust notifications, and configure privacy settings.',
    icon: Settings,
    highlightElement: '[data-tour="settings"]',
  },
];

export default function OnboardingTutorial() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, [profile]);

  const checkOnboardingStatus = async () => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('onboarding_completed')
        .eq('user_id', profile.id)
        .single();

      if (!data?.onboarding_completed) {
        // Show onboarding for new users
        setTimeout(() => setIsOpen(true), 1000);
      }
    } catch (error) {
      // New user - show onboarding
      setTimeout(() => setIsOpen(true), 1000);
    }
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = async () => {
    await markOnboardingComplete();
    setIsOpen(false);
  };

  const handleComplete = async () => {
    setCompleted(true);
    await markOnboardingComplete();
    
    setTimeout(() => {
      setIsOpen(false);
      setCompleted(false);
      setCurrentStep(0);
    }, 2000);
  };

  const markOnboardingComplete = async () => {
    if (!profile) return;

    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: profile.id,
          onboarding_completed: true,
        });
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
  };

  const currentStepData = onboardingSteps[currentStep];
  const Icon = currentStepData.icon;
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-xl max-w-2xl w-full border border-[#202225] overflow-hidden">
        {completed ? (
          // Completion Screen
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">You're All Set! 🎉</h2>
            <p className="text-gray-400 text-lg">
              Start earning tokens and connecting with gamers!
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-[#202225]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Getting Started</h2>
                <button
                  onClick={handleSkip}
                  className="p-2 hover:bg-[#0f0f0f] rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-[#0f0f0f] rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-400">
                  Step {currentStep + 1} of {onboardingSteps.length}
                </span>
                <span className="text-sm text-[#8B5CF6] font-semibold">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-full flex items-center justify-center mb-6">
                  <Icon className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">
                  {currentStepData.title}
                </h3>

                <p className="text-gray-400 text-lg max-w-lg">
                  {currentStepData.description}
                </p>
              </div>

              {/* Step Indicators */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {onboardingSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-8 bg-[#8B5CF6]'
                        : index < currentStep
                        ? 'w-2 bg-[#8B5CF6]/50'
                        : 'w-2 bg-[#2f3136]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#202225] flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="px-6 py-3 text-gray-400 hover:text-white transition-colors font-semibold"
              >
                Skip Tutorial
              </button>

              <div className="flex gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-6 py-3 bg-[#0f0f0f] hover:bg-[#2f3136] text-white rounded-lg font-semibold transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
                >
                  {currentStep === onboardingSteps.length - 1 ? (
                    <>
                      Complete
                      <Check className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Quick tips component for contextual help
export function QuickTip({
  title,
  description,
  onDismiss,
}: {
  title: string;
  description: string;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 max-w-sm bg-[#1a1a1a] rounded-lg border border-[#8B5CF6] p-4 shadow-xl z-40 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-[#8B5CF6]/20 rounded-lg flex-shrink-0">
          <Sparkles className="w-5 h-5 text-[#8B5CF6]" />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-1">{title}</h4>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-[#0f0f0f] rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

