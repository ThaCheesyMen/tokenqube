import React from 'react';
import { Download, Globe, Trophy, Coins, Users, Zap, Github, Twitter, MessageCircle } from 'lucide-react';

interface LandingProps {
  onNavigate: (page: string) => void;
}

export default function Landing({ onNavigate }: LandingProps) {
  // QuestCord Landing Page v1.0
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-900 to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-400" />
            <span className="text-2xl font-bold text-white">QuestCord</span>
          </div>
          <button
            onClick={() => onNavigate('auth')}
            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all duration-200 font-medium"
          >
            Login
          </button>
        </nav>

        {/* Hero Content */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Game. Earn. Dominate.
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12">
            QuestCord is where gamers earn real rewards. Join tournaments,
            track your progress, and connect with millions of players worldwide.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Download Button */}
            <a
              href="https://github.com/ThaCheesyMen/tokenqube/releases/latest/download/QuestCord-Setup.exe"
              className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg shadow-indigo-500/50 hover:shadow-indigo-500/70 hover:scale-105"
            >
              <Download className="w-5 h-5" />
              Download for Windows
            </a>

            {/* Web App Button */}
            <button
              onClick={() => onNavigate('auth')}
              className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold text-lg transition-all duration-200 backdrop-blur hover:scale-105"
            >
              <Globe className="w-5 h-5" />
              Open Web App
            </button>
          </div>

          <p className="text-sm text-gray-400 mt-6">
            Windows 10+ • macOS 10.14+ • Web Browser • 100% Free Beta
          </p>
        </div>

        {/* Screenshot/Preview Placeholder */}
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-gray-800 to-gray-900 p-8">
            <div className="aspect-video flex items-center justify-center bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="text-center">
                <Zap className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">QuestCord Dashboard Preview</p>
                <p className="text-gray-500 text-sm mt-2">Real-time tournaments, token rewards, and more</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-24">
        <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
          Why Gamers Love QuestCord
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-8 border border-white/10 hover:border-yellow-400/50 transition-all duration-300 hover:scale-105">
            <Coins className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Earn Real Rewards</h3>
            <p className="text-gray-300">
              Get tokens for every game you play. Trade, stake, or cash out—your progress has real value.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-8 border border-white/10 hover:border-indigo-400/50 transition-all duration-300 hover:scale-105">
            <Trophy className="w-12 h-12 text-indigo-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Join Tournaments</h3>
            <p className="text-gray-300">
              Compete in official tournaments every 6 hours. Climb the ranks and win big prizes.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-8 border border-white/10 hover:border-green-400/50 transition-all duration-300 hover:scale-105">
            <Users className="w-12 h-12 text-green-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Connect & Compete</h3>
            <p className="text-gray-300">
              Voice chat, messaging, and teams. Build your gaming community in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 shadow-2xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">1M+</div>
              <div className="text-indigo-200 text-lg">Tokens Earned</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">Beta</div>
              <div className="text-indigo-200 text-lg">Active Testing Phase</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">24/7</div>
              <div className="text-indigo-200 text-lg">Tournaments Running</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to Start Earning?
        </h2>
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          Join gamers already earning on QuestCord
        </p>
        <button
          onClick={() => onNavigate('auth')}
          className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xl transition-all duration-200 shadow-lg shadow-indigo-500/50 hover:shadow-indigo-500/70 hover:scale-105"
        >
          Get Started Free
        </button>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              <span className="text-lg font-bold text-white">QuestCord</span>
              <span className="text-gray-500 ml-2">Beta v1.0.0</span>
            </div>
            
            <div className="flex gap-6 text-gray-400">
              <button 
                onClick={() => onNavigate('terms')} 
                className="hover:text-white transition-colors duration-200"
              >
                Terms
              </button>
              <button 
                onClick={() => onNavigate('privacy')} 
                className="hover:text-white transition-colors duration-200"
              >
                Privacy
              </button>
              <a 
                href="https://github.com/ThaCheesyMen/tokenqube" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors duration-200 flex items-center gap-1"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </div>
            
            <div className="text-gray-400 text-sm">
              © 2025 QuestCord. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

