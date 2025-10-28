import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Coins, LogOut, Menu, X, Moon, Sun, Gamepad2 } from 'lucide-react';
import { useState } from 'react';
import Notifications from './Notifications';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', id: 'dashboard' },
    { name: 'Activity', id: 'activity' },
    { name: 'Search', id: 'search' },
    { name: 'Chat', id: 'chat' },
    { name: 'Earn', id: 'tasks' },
    { name: 'Rewards', id: 'rewards' },
    { name: 'Leaderboard', id: 'leaderboard' },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center space-x-2 text-2xl font-bold text-emerald-600 dark:text-emerald-500"
            >
              <Coins className="w-8 h-8" />
              <span>TokenQuest</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center space-x-2">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-[#0f0f0f] dark:hover:bg-[#1a1a1a]'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-lg">
              <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                {profile?.token_balance?.toLocaleString() || 0}
              </span>
            </div>
            <Notifications />
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-[#0f0f0f] dark:hover:bg-[#1a1a1a] rounded-lg transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-[#0f0f0f] dark:hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-[#0f0f0f] dark:hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-[#0f0f0f] dark:hover:bg-[#1a1a1a]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 rounded-lg mb-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">Your Tokens:</span>
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {profile?.token_balance?.toLocaleString() || 0}
                </span>
              </div>
            </div>
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-[#0f0f0f] dark:hover:bg-[#1a1a1a]'
                }`}
              >
                {item.name}
              </button>
            ))}
            <button
              onClick={signOut}
              className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-[#0f0f0f] dark:hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
