import React from 'react';
import { Download, Apple, Laptop, ArrowLeft, Zap } from 'lucide-react';

interface DownloadProps {
  onNavigate: (page: string) => void;
}

export default function DownloadPage({ onNavigate }: DownloadProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-900 to-gray-900 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            <span className="text-xl font-bold">QuestCord</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        <h1 className="text-5xl md:text-6xl font-bold text-center mb-8">
          Download QuestCord
        </h1>
        <p className="text-xl text-gray-300 text-center mb-16 max-w-2xl mx-auto">
          Get the desktop app for the best gaming experience with overlay support and system tray integration
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {/* Windows */}
          <div className="bg-white/5 rounded-xl p-8 text-center border border-white/10 hover:border-indigo-400/50 transition-all duration-300 hover:scale-105">
            <Laptop className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h3 className="text-2xl font-bold mb-2">Windows</h3>
            <p className="text-gray-400 mb-6">Windows 10 or later</p>
            <a
              href="https://github.com/ThaCheesyMen/tokenqube/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/50"
            >
              <Download className="w-5 h-5" />
              Download
            </a>
            <p className="text-xs text-gray-500 mt-4">~85MB installer</p>
          </div>

          {/* macOS */}
          <div className="bg-white/5 rounded-xl p-8 text-center border border-white/10 opacity-60">
            <Apple className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-2xl font-bold mb-2">macOS</h3>
            <p className="text-gray-400 mb-6">macOS 10.14 or later</p>
            <button
              disabled
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 rounded-lg font-semibold cursor-not-allowed"
            >
              Coming Soon
            </button>
            <p className="text-xs text-gray-500 mt-4">In development</p>
          </div>

          {/* Linux */}
          <div className="bg-white/5 rounded-xl p-8 text-center border border-white/10 opacity-60">
            <Laptop className="w-16 h-16 mx-auto mb-4 text-orange-400" />
            <h3 className="text-2xl font-bold mb-2">Linux</h3>
            <p className="text-gray-400 mb-6">Ubuntu 18.04+</p>
            <button
              disabled
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 rounded-lg font-semibold cursor-not-allowed"
            >
              Coming Soon
            </button>
            <p className="text-xs text-gray-500 mt-4">In development</p>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-white/5 rounded-xl p-8 border border-white/10">
            <h3 className="text-2xl font-bold mb-6">Installation Instructions</h3>
            <ol className="space-y-4 text-gray-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">1</span>
                <span>Download the installer for your operating system</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">2</span>
                <span>Run the installer and follow the setup wizard</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">3</span>
                <span>Launch QuestCord and sign in with your account</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">4</span>
                <span>Start gaming and earning tokens!</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Web Alternative */}
        <div className="text-center">
          <div className="inline-block bg-white/5 rounded-xl p-8 border border-white/10">
            <p className="text-gray-300 mb-4 text-lg">
              Prefer not to install anything?
            </p>
            <button
              onClick={() => onNavigate('auth')}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/50"
            >
              Use Web Version Instead →
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Works in any modern browser • No installation required
            </p>
          </div>
        </div>

        {/* System Requirements */}
        <div className="max-w-3xl mx-auto mt-16">
          <h3 className="text-2xl font-bold mb-6 text-center">System Requirements</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h4 className="font-bold text-lg mb-4 text-indigo-400">Minimum</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Windows 10 (64-bit)</li>
                <li>• 4GB RAM</li>
                <li>• 500MB disk space</li>
                <li>• Internet connection</li>
              </ul>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h4 className="font-bold text-lg mb-4 text-green-400">Recommended</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Windows 11 (64-bit)</li>
                <li>• 8GB RAM</li>
                <li>• 1GB disk space</li>
                <li>• Broadband connection</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

