import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Coins, AlertCircle, Eye, EyeOff, Sparkles, Trophy, 
  Gamepad2, Users, Zap, Gift, ArrowRight, Check, Star, MessageCircle, Shield
} from 'lucide-react';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import UsernameChecker from '../components/UsernameChecker';
import SuccessConfetti from '../components/SuccessConfetti';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { signIn, signUp } = useAuth();

  const features = [
    { icon: Coins, text: 'Earn tokens by playing games', color: 'from-yellow-500 to-orange-500' },
    { icon: Trophy, text: 'Unlock achievements & rewards', color: 'from-purple-500 to-pink-500' },
    { icon: Gamepad2, text: 'Connect your gaming accounts', color: 'from-blue-500 to-cyan-500' },
    { icon: Users, text: 'Chat & party with friends', color: 'from-green-500 to-emerald-500' },
  ];

  const testimonials = [
    { name: 'Alex M.', avatar: '🎮', text: 'Earned 5,000 tokens in my first week! Love the achievement rewards.', stars: 5 },
    { name: 'Sarah K.', avatar: '🏆', text: 'The voice chat quality is amazing. Best gaming companion app!', stars: 5 },
    { name: 'Mike R.', avatar: '⚡', text: 'Finally an app that rewards me for playing. 10/10 would recommend!', stars: 5 },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        // Remember me logic could be implemented with Supabase's persistSession option
        if (rememberMe) {
          localStorage.setItem('tokenquest_remember', 'true');
        }
      } else {
        if (!username.trim()) {
          setError('Username is required');
          setLoading(false);
          return;
        }
        if (!usernameAvailable && username.trim()) {
          setError('Please choose an available username');
          setLoading(false);
          return;
        }
        await signUp(email, password, username);
        // Show confetti on successful signup
        setShowConfetti(true);
        // Confetti will auto-hide after animation
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1f22] flex">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#3b4199] relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 animate-pulse" style={{backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "50px 50px"}}></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo & Title */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">TokenQuest</h1>
                <p className="text-sm text-white/80">Level up your gaming</p>
              </div>
            </div>

            {/* Features Carousel */}
            <div className="space-y-6 mb-12">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                      currentFeature === index
                        ? 'bg-white/20 backdrop-blur-md scale-105 shadow-2xl'
                        : 'bg-white/5 backdrop-blur-sm scale-95 opacity-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-lg font-semibold text-white">{feature.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-white mb-1">10K+</div>
              <div className="text-sm text-white/80">Active Users</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-white mb-1">1M+</div>
              <div className="text-sm text-white/80">Tokens Earned</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-white mb-1">500+</div>
              <div className="text-sm text-white/80">Games Supported</div>
            </div>
          </div>

          {/* Testimonials Carousel */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-white" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">What Players Say</h3>
            </div>
            <div className="relative">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`transition-all duration-500 ${
                    currentTestimonial === index
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-95 absolute inset-0'
                  }`}
                >
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.stars)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-white/90 text-sm mb-3 leading-relaxed">"{testimonial.text}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">
                      {testimonial.avatar}
                    </div>
                    <span className="text-white/80 text-sm font-semibold">{testimonial.name}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentTestimonial === index ? 'bg-white w-6' : 'bg-white/30'
                  }`}
                  aria-label={`View testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">TokenQuest</h1>
          </div>

          {/* Auth Card */}
          <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl border border-[#202225] overflow-hidden">
            {/* Header */}
            <div className="p-8 pb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isLogin ? 'Welcome back!' : 'Create an account'}
              </h2>
              <p className="text-gray-400 text-sm">
                {isLogin 
                  ? 'We\'re excited to see you again!' 
                  : 'Join the community and start earning tokens!'}
              </p>
            </div>

            {/* Form */}
            <div className="px-8 pb-8">
              {/* Tab Switcher */}
              <div className="flex bg-[#202225] rounded-lg p-1 mb-6">
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setError('');
                  }}
                  className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${
                    isLogin
                      ? 'bg-[#8B5CF6] text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setError('');
                  }}
                  className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${
                    !isLogin
                      ? 'bg-[#8B5CF6] text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3 animate-shake">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-400 font-medium">{error}</span>
                </div>
              )}

              {/* Welcome Bonus Banner */}
              {!isLogin && (
                <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        Welcome Bonus
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div className="text-xs text-gray-300">Get 100 free tokens instantly!</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      USERNAME <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full px-4 py-3 bg-[#202225] text-white rounded-lg border border-[#40444b] focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/50 transition-all outline-none placeholder-gray-500"
                      required
                      minLength={3}
                      maxLength={20}
                    />
                    <UsernameChecker username={username} onChange={setUsernameAvailable} />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    EMAIL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 bg-[#202225] text-white rounded-lg border border-[#40444b] focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/50 transition-all outline-none placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-300">
                      PASSWORD <span className="text-red-400">*</span>
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => alert('Password reset functionality coming soon! Please contact support if you need immediate assistance.')}
                        className="text-xs text-[#8B5CF6] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 bg-[#202225] text-white rounded-lg border border-[#40444b] focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/50 transition-all outline-none placeholder-gray-500 pr-12"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {!isLogin && <PasswordStrengthIndicator password={password} />}
                </div>

                {/* Referral Code (Optional) */}
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      REFERRAL CODE <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="Enter referral code"
                      className="w-full px-4 py-3 bg-[#202225] text-white rounded-lg border border-[#40444b] focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/50 transition-all outline-none placeholder-gray-500 uppercase"
                      maxLength={10}
                    />
                    {referralCode && (
                      <p className="mt-2 text-xs text-green-400 flex items-center gap-1">
                        <Gift className="w-3 h-3" />
                        You'll earn bonus tokens for using a referral code!
                      </p>
                    )}
                  </div>
                )}

                {/* Remember Me */}
                {isLogin && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#40444b] bg-[#202225] text-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/50"
                    />
                    <label htmlFor="rememberMe" className="text-sm text-gray-400 cursor-pointer select-none">
                      Remember me on this device
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white py-3.5 rounded-lg font-bold hover:from-[#7C3AED] hover:to-[#3b4199] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[#8B5CF6]/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {isLogin ? 'Login' : 'Create Account'}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Features List for Sign Up */}
              {!isLogin && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Track playtime across all games</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Earn tokens for achievements</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Voice & video chat with friends</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Join parties and find teammates</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Text */}
          <p className="text-center text-sm text-gray-500 mt-6">
            By {isLogin ? 'logging in' : 'signing up'}, you agree to our{' '}
            <a href="#" className="text-[#8B5CF6] hover:underline">Terms of Service</a>
            {' and '}
            <a href="#" className="text-[#8B5CF6] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>

      {/* Success Confetti */}
      <SuccessConfetti show={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
