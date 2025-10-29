import React from 'react';
import { Home, Search, ArrowLeft } from 'lucide-react';

interface NotFoundProps {
  onNavigate: (page: string) => void;
}

export default function NotFound({ onNavigate }: NotFoundProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        {/* 404 Visual */}
        <div className="mb-8 relative">
          <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-pulse">
            404
          </h1>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 blur-3xl opacity-30 animate-pulse"></div>
        </div>

        {/* Error Message */}
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-xl text-gray-400 mb-12">
          Looks like you ventured into uncharted territory. This page doesn't exist... yet!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-indigo-500/50 hover:scale-105"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5" />
            Go to Dashboard
          </button>
        </div>

        {/* Helpful Links */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <p className="text-gray-500 mb-4">Popular Pages:</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => onNavigate('tournaments')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors duration-200"
            >
              Tournaments
            </button>
            <button
              onClick={() => onNavigate('leaderboard')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors duration-200"
            >
              Leaderboard
            </button>
            <button
              onClick={() => onNavigate('rewards')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors duration-200"
            >
              Rewards
            </button>
            <button
              onClick={() => onNavigate('profile')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors duration-200"
            >
              Profile
            </button>
          </div>
        </div>

        {/* Easter Egg */}
        <p className="mt-8 text-sm text-gray-600">
          Error Code: QUEST_NOT_FOUND 🎮
        </p>
      </div>
    </div>
  );
}

