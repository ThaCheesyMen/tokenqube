import React, { useState, useEffect } from 'react';
import { Download, Globe, Trophy, Coins, Users, Zap, Github, Star, Clock, Shield, Gamepad2, TrendingUp, Award, Target, Radio, ChevronRight, Check, X, Mail, AlertCircle } from 'lucide-react';

interface LandingProps {
  onNavigate: (page: string) => void;
}

export default function Landing({ onNavigate }: LandingProps) {
  // Live token counter
  const [tokensDistributed, setTokensDistributed] = useState(1247893);
  const [gamesTracked, setGamesTracked] = useState(12847);
  const [activePlayers, setActivePlayers] = useState(847);

  useEffect(() => {
    const interval = setInterval(() => {
      setTokensDistributed(prev => prev + Math.floor(Math.random() * 15) + 5);
      setGamesTracked(prev => prev + (Math.random() > 0.7 ? 1 : 0));
      setActivePlayers(prev => {
        const change = Math.floor(Math.random() * 3) - 1;
        return Math.max(800, Math.min(900, prev + change));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-950 to-gray-900 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-yellow-500 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Zap className="w-9 h-9 text-yellow-400 animate-pulse" />
              <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-50"></div>
            </div>
            <span className="text-3xl font-black text-white tracking-tight">QuestCord</span>
            <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-gray-900 rounded-full">BETA</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('download')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={() => onNavigate('auth')}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/30"
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 py-20 md:py-32">
        <div className="text-center max-w-5xl mx-auto mb-20">
          {/* Urgency Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-400/30 backdrop-blur-sm mb-4 animate-pulse">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-300">Only 23 Beta Spots Left Today!</span>
          </div>

          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8 hover:bg-white/10 transition-all duration-300">
            <Radio className="w-4 h-4 text-green-400 animate-pulse" />
            <span className="text-sm font-medium text-gray-300">Live Now: Tournament #127 • {activePlayers} Players Online</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-300 mb-8 leading-tight tracking-tight">
            Turn Game Time
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500">
              Into Real Rewards
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
            The ultimate gaming platform where <span className="text-yellow-400 font-bold">every match counts</span>. 
            Earn tokens, compete in tournaments, and dominate the leaderboards.
          </p>
          
          <p className="text-lg text-gray-400 mb-12">
            Join thousands of gamers earning while they play 🎮⚡
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <a
              href="https://github.com/ThaCheesyMen/tokenqube/releases/download/v1.0.0/TokenQube.1.0.0.exe"
              className="group flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-500/80 hover:scale-105 hover:-translate-y-1"
            >
              <Download className="w-6 h-6 group-hover:animate-bounce" />
              Download Desktop App
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>

            <button
              onClick={() => onNavigate('auth')}
              className="group flex items-center gap-3 px-10 py-5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-lg transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 hover:-translate-y-1"
            >
              <Globe className="w-6 h-6" />
              Launch Web Version
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span>100% Free</span>
            </div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>No Credit Card</span>
            </div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>Instant Setup</span>
            </div>
          </div>
        </div>

        {/* App Preview */}
        <div className="max-w-6xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl blur-2xl opacity-75 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-gradient-to-br from-gray-800 via-gray-900 to-black p-8">
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700 backdrop-blur-sm">
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <Gamepad2 className="w-24 h-24 text-indigo-400 animate-pulse" />
                    <div className="absolute inset-0 bg-indigo-400 blur-3xl opacity-50"></div>
                  </div>
                  <p className="text-gray-300 text-2xl font-bold mb-2">Your Gaming Command Center</p>
                  <p className="text-gray-500 text-lg">Track stats • Join tournaments • Earn rewards • Connect with players</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
            Why Gamers Choose QuestCord
          </h2>
          <p className="text-xl text-gray-400">Everything you need to level up your gaming experience</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Feature 1 */}
          <div className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-yellow-400/50 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Coins className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Earn While You Play</h3>
              <p className="text-gray-400 leading-relaxed">
                Get tokens automatically for every minute of gameplay. No complex tasks—just play your favorite games.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-indigo-400/50 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Daily Tournaments</h3>
              <p className="text-gray-400 leading-relaxed">
                Compete every 6 hours for massive rewards. Climb the leaderboards and prove you're the best.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-green-400/50 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Squad Up</h3>
              <p className="text-gray-400 leading-relaxed">
                Voice chat, DMs, and party finder. Connect with gamers worldwide and build your dream team.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-pink-400/50 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Auto Game Detection</h3>
              <p className="text-gray-400 leading-relaxed">
                Seamlessly tracks your gameplay across all supported titles. Set it and forget it.
              </p>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-blue-400/50 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Track Your Progress</h3>
              <p className="text-gray-400 leading-relaxed">
                Detailed stats, achievements, and level progression. Watch yourself improve over time.
              </p>
            </div>
          </div>

          {/* Feature 6 */}
          <div className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-purple-400/50 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Award className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Unlock Achievements</h3>
              <p className="text-gray-400 leading-relaxed">
                Complete challenges and earn exclusive badges. Show off your accomplishments to the community.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="relative z-10 container mx-auto px-4 py-24 bg-gradient-to-b from-transparent via-indigo-950/30 to-transparent">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
            Get Started in 3 Steps
          </h2>
          <p className="text-xl text-gray-400">Start earning rewards in under 2 minutes</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Step 1 */}
          <div className="relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/50">
              1
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 pt-12 border border-white/10 text-center hover:border-indigo-400/50 transition-all duration-300">
              <Download className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">Download & Install</h3>
              <p className="text-gray-400 leading-relaxed">
                Get the QuestCord app for Windows. Quick install, no hassle. Web version also available.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-500/50">
              2
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 pt-12 border border-white/10 text-center hover:border-purple-400/50 transition-all duration-300">
              <Gamepad2 className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">Link Your Games</h3>
              <p className="text-gray-400 leading-relaxed">
                Automatic detection for all major titles. Just launch and play—we handle the rest.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-r from-pink-600 to-yellow-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-pink-500/50">
              3
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 pt-12 border border-white/10 text-center hover:border-yellow-400/50 transition-all duration-300">
              <Coins className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">Start Earning</h3>
              <p className="text-gray-400 leading-relaxed">
                Tokens accumulate automatically as you play. Compete, level up, and cash out anytime.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stats Banner */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-12 shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-20"></div>
          <div className="relative grid md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-5xl md:text-6xl font-black text-white transition-all duration-500">
                {tokensDistributed.toLocaleString()}
              </div>
              <div className="text-indigo-100 text-lg font-medium">Tokens Distributed</div>
              <div className="text-indigo-200 text-sm">🔥 Live Counter</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl md:text-6xl font-black text-white transition-all duration-500">
                {gamesTracked.toLocaleString()}+
              </div>
              <div className="text-indigo-100 text-lg font-medium">Games Tracked</div>
              <div className="text-indigo-200 text-sm">⚡ Real-time</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl md:text-6xl font-black text-white">24/7</div>
              <div className="text-indigo-100 text-lg font-medium">Active Tournaments</div>
              <div className="text-indigo-200 text-sm">🏆 Always On</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl md:text-6xl font-black text-white">Beta</div>
              <div className="text-indigo-100 text-lg font-medium">Join Early Access</div>
              <div className="text-indigo-200 text-sm">🎮 Free Forever</div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="relative z-10 container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
            What Gamers Are Saying
          </h2>
          <p className="text-xl text-gray-400">Join thousands of satisfied players earning rewards</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-yellow-400/50 transition-all duration-300">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              "I've earned over 15K tokens just playing Valorant. This is insane! Finally getting rewarded for my grind."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                M
              </div>
              <div>
                <p className="text-white font-bold">MikeGaming</p>
                <p className="text-gray-400 text-sm">Level 42 • 15,347 tokens</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-green-400/50 transition-all duration-300">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              "The tournaments are so fun! Won 5K tokens yesterday. Best gaming platform I've ever used."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                S
              </div>
              <div>
                <p className="text-white font-bold">SarahPro</p>
                <p className="text-gray-400 text-sm">Level 38 • 12,891 tokens</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-pink-400/50 transition-all duration-300">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              "Simple to use, works perfectly. My whole squad switched to QuestCord. The voice chat is crystal clear!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
                J
              </div>
              <div>
                <p className="text-white font-bold">JaxonFTW</p>
                <p className="text-gray-400 text-sm">Level 51 • 21,093 tokens</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="relative z-10 container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
            QuestCord vs Traditional Gaming
          </h2>
          <p className="text-xl text-gray-400">See why gamers are making the switch</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-red-500/5 border-2 border-red-400/20 rounded-2xl p-8 hover:border-red-400/40 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <X className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-3xl font-bold text-white">Traditional Gaming</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-400">
                <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                <span>No rewards for your playtime</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                <span>Endless grind with zero value</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                <span>Pay to enter most tournaments</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                <span>Limited community features</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                <span>No cross-game progression</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-500/5 border-2 border-green-400/30 rounded-2xl p-8 hover:border-green-400/50 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-green-400 text-gray-900 text-xs font-bold">
              RECOMMENDED
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-3xl font-bold text-white">With QuestCord</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <span><strong className="text-white">Earn tokens</strong> every minute you play</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <span><strong className="text-white">Real value</strong> for your gaming time</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <span><strong className="text-white">Free tournaments</strong> every 6 hours</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <span><strong className="text-white">Voice chat, DMs, squads</strong> built-in</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <span><strong className="text-white">Unified level system</strong> across all games</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-12 border border-white/10 max-w-5xl mx-auto">
          <h3 className="text-2xl font-bold text-white text-center mb-8">Trusted by Gamers Worldwide</h3>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-8 h-8 text-green-400" />
              </div>
              <p className="font-bold text-white">256-bit Encryption</p>
              <p className="text-sm text-gray-400">Bank-level security</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-blue-400" />
              </div>
              <p className="font-bold text-white">GDPR Compliant</p>
              <p className="text-sm text-gray-400">Your data is safe</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-8 h-8 text-purple-400" />
              </div>
              <p className="font-bold text-white">No Spyware</p>
              <p className="text-sm text-gray-400">Open source core</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
              <p className="font-bold text-white">Instant Payouts</p>
              <p className="text-sm text-gray-400">Withdraw anytime</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="relative z-10 container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-400">Everything you need to know</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          <details className="group bg-white/5 rounded-xl p-6 border border-white/10 hover:border-indigo-400/50 transition-all duration-300">
            <summary className="text-xl font-bold text-white cursor-pointer flex items-center justify-between">
              How do I earn tokens?
              <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-gray-400 mt-4 leading-relaxed">
              Simply play your favorite games! QuestCord automatically detects when you're gaming and rewards you with tokens based on your playtime, achievements, and tournament performance. The longer you play, the more you earn.
            </p>
          </details>

          <details className="group bg-white/5 rounded-xl p-6 border border-white/10 hover:border-indigo-400/50 transition-all duration-300">
            <summary className="text-xl font-bold text-white cursor-pointer flex items-center justify-between">
              Is QuestCord really free?
              <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-gray-400 mt-4 leading-relaxed">
              Yes! QuestCord is 100% free to use. No credit card required, no hidden fees, no premium tiers. We make money through optional marketplace features, not by charging you to play.
            </p>
          </details>

          <details className="group bg-white/5 rounded-xl p-6 border border-white/10 hover:border-indigo-400/50 transition-all duration-300">
            <summary className="text-xl font-bold text-white cursor-pointer flex items-center justify-between">
              What games are supported?
              <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-gray-400 mt-4 leading-relaxed">
              We support all major PC games including Valorant, League of Legends, CS:GO, Fortnite, Apex Legends, Overwatch, and many more. New games are added weekly based on community requests.
            </p>
          </details>

          <details className="group bg-white/5 rounded-xl p-6 border border-white/10 hover:border-indigo-400/50 transition-all duration-300">
            <summary className="text-xl font-bold text-white cursor-pointer flex items-center justify-between">
              Can I cash out my tokens?
              <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-gray-400 mt-4 leading-relaxed">
              Absolutely! You can withdraw your tokens at any time. Exchange them for gift cards, gaming gear, or keep them to enter premium tournaments. We're also working on direct cryptocurrency conversion.
            </p>
          </details>

          <details className="group bg-white/5 rounded-xl p-6 border border-white/10 hover:border-indigo-400/50 transition-all duration-300">
            <summary className="text-xl font-bold text-white cursor-pointer flex items-center justify-between">
              How do tournaments work?
              <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-gray-400 mt-4 leading-relaxed">
              Tournaments run every 6 hours and are completely free to enter. Compete against other players based on your gaming performance during the tournament window. Top players win massive token prizes!
            </p>
          </details>

          <details className="group bg-white/5 rounded-xl p-6 border border-white/10 hover:border-indigo-400/50 transition-all duration-300">
            <summary className="text-xl font-bold text-white cursor-pointer flex items-center justify-between">
              Is my data safe?
              <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-gray-400 mt-4 leading-relaxed">
              Your privacy and security are our top priorities. We use 256-bit encryption, are GDPR compliant, and never sell your data. QuestCord only tracks game activity—nothing else on your computer.
            </p>
          </details>
        </div>
      </div>

      {/* Email Signup */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-r from-indigo-600/20 to-purple-600/20 backdrop-blur-sm rounded-3xl p-12 border border-indigo-400/30">
          <Mail className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
          <h3 className="text-3xl font-bold text-white mb-4">Get Early Access Updates</h3>
          <p className="text-gray-300 mb-8">
            Join 3,847 gamers on the beta waitlist. Get exclusive updates, early features, and bonus tokens!
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-indigo-400 focus:outline-none transition-all duration-200"
            />
            <button className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-bold text-white transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:scale-105">
              Join Beta
            </button>
          </form>
          <p className="text-gray-500 text-sm mt-4">
            🎁 First 100 signups get 500 bonus tokens!
          </p>
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative z-10 container mx-auto px-4 py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 backdrop-blur-sm mb-8">
            <Clock className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-green-300">Limited Beta Access • Join Now While It's Free</span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            Ready to Start<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Earning Rewards?</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed">
            Join the gaming revolution. Download QuestCord and start earning today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://github.com/ThaCheesyMen/tokenqube/releases/download/v1.0.0/TokenQube.1.0.0.exe"
              className="group flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-xl transition-all duration-300 shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-500/80 hover:scale-105 hover:-translate-y-1"
            >
              <Download className="w-6 h-6 group-hover:animate-bounce" />
              Download Now
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </a>

            <button
              onClick={() => onNavigate('auth')}
              className="group flex items-center gap-3 px-12 py-5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 hover:-translate-y-1"
            >
              Get Started Free
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <p className="text-gray-500 mt-8 text-sm">
            No credit card required • Free forever • Windows, macOS, Web
          </p>
        </div>
      </div>

      {/* Enhanced Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <Zap className="w-8 h-8 text-yellow-400" />
                  <div className="absolute inset-0 bg-yellow-400 blur-lg opacity-50"></div>
                </div>
                <span className="text-2xl font-black text-white">QuestCord</span>
                <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-gray-900 rounded-full">BETA</span>
              </div>
              <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
                The ultimate gaming platform where every match counts. Earn tokens, compete in tournaments, and connect with gamers worldwide.
              </p>
              <div className="flex gap-4">
                <a 
                  href="https://github.com/ThaCheesyMen/tokenqube" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-center transition-all duration-200 group"
                >
                  <Github className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Product</h3>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => onNavigate('download')} className="text-gray-400 hover:text-white transition-colors duration-200">
                    Download
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('auth')} className="text-gray-400 hover:text-white transition-colors duration-200">
                    Web App
                  </button>
                </li>
                <li>
                  <span className="text-gray-600 cursor-not-allowed">Features</span>
                </li>
                <li>
                  <span className="text-gray-600 cursor-not-allowed">Pricing</span>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => onNavigate('terms')} className="text-gray-400 hover:text-white transition-colors duration-200">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('privacy')} className="text-gray-400 hover:text-white transition-colors duration-200">
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-gray-400 text-sm text-center md:text-left">
                © 2025 QuestCord. All rights reserved. • <span className="text-gray-500">v1.0.0 Beta</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-400/20">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300 font-medium">All Systems Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

