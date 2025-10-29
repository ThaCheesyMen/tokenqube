import React, { useState, useEffect } from 'react';
import { Cookie, X, Settings } from 'lucide-react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show banner after 1 second delay
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleAcceptSelected = () => {
    const consent = {
      ...preferences,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(consent));
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleReject = () => {
    const rejected = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(rejected));
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none">
      <div className="max-w-7xl mx-auto pointer-events-auto">
        {!showSettings ? (
          /* Simple Banner */
          <div className="bg-gray-900/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Cookie className="w-6 h-6 text-indigo-400" />
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">
                  We Value Your Privacy
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  We use cookies to enhance your experience, analyze site traffic, and personalize content. 
                  By clicking "Accept All", you consent to our use of cookies.{' '}
                  <a href="#/privacy" className="text-indigo-400 hover:text-indigo-300 underline">
                    Privacy Policy
                  </a>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all duration-200 backdrop-blur-sm border border-white/20 flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg font-medium transition-all duration-200"
                >
                  Reject All
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-bold transition-all duration-200 shadow-lg shadow-indigo-500/30"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Settings Panel */
          <div className="bg-gray-900/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Cookie Preferences</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 w-5 h-5 rounded accent-indigo-600"
                />
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-1">Necessary Cookies</h4>
                  <p className="text-sm text-gray-400">
                    Required for the website to function properly. Cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="mt-1 w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                />
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-1">Analytics Cookies</h4>
                  <p className="text-sm text-gray-400">
                    Help us understand how visitors interact with our website to improve user experience.
                  </p>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                  className="mt-1 w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                />
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-1">Marketing Cookies</h4>
                  <p className="text-sm text-gray-400">
                    Used to deliver personalized advertisements and track marketing campaign effectiveness.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAcceptSelected}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-bold transition-all duration-200 shadow-lg shadow-indigo-500/30"
              >
                Save Preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all duration-200 backdrop-blur-sm border border-white/20"
              >
                Accept All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

