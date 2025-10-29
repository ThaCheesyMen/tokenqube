import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { VoiceChatProvider } from './contexts/VoiceChatContext';
import Auth from './pages/Auth';

// Lazy load all pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Download = lazy(() => import('./pages/Download'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LiveStudio = lazy(() => import('./pages/LiveStudio'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Rewards = lazy(() => import('./pages/Rewards'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Referrals = lazy(() => import('./pages/Referrals'));
const Chat = lazy(() => import('./pages/Chat'));
const Profile = lazy(() => import('./pages/Profile'));
const PartyFinder = lazy(() => import('./pages/PartyFinder'));
const Friends = lazy(() => import('./pages/Friends'));
const Squads = lazy(() => import('./pages/Squads'));
const ActivityFeed = lazy(() => import('./pages/ActivityFeed'));
const FriendActivity = lazy(() => import('./pages/FriendActivity'));
const TransactionHistory = lazy(() => import('./pages/TransactionHistory'));
const Settings = lazy(() => import('./pages/Settings'));
const FloatingOverlay = lazy(() => import('./pages/FloatingOverlay'));
const BattlePass = lazy(() => import('./pages/BattlePass'));
const Tournaments = lazy(() => import('./pages/Tournaments'));
const RankedLeaderboard = lazy(() => import('./pages/RankedLeaderboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Clips = lazy(() => import('./pages/Clips'));
const GameLibrary = lazy(() => import('./pages/GameLibrary'));
const TokenEconomy = lazy(() => import('./pages/TokenEconomy'));
const AdminRevenue = lazy(() => import('./pages/AdminRevenue'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

import DiscordSidebar from './components/DiscordSidebar';
import VoiceChatBar from './components/VoiceChatBar';
import AchievementNotification from './components/AchievementNotification';
import DailyLoginReward from './components/DailyLoginReward';
import { ToastContainer, toast as toastManager } from './components/Toast';
import { isElectron } from './utils/platform';

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="h-full w-full p-4 sm:p-6 lg:p-8 bg-[#0f0f0f]">
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-[#1a1a1a] rounded w-1/4"></div>
      <div className="h-4 bg-[#1a1a1a] rounded w-1/2"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-[#1a1a1a] rounded-lg"></div>
        ))}
      </div>
    </div>
  </div>
);

function AppContent() {
  const { user, loading } = useAuth();
  // Set initial page based on platform and URL hash
  const [currentPage, setCurrentPage] = useState(() => {
    if (isElectron()) {
      return 'auth';
    }
    // Check URL hash for initial route
    const hash = window.location.hash.slice(2); // Remove '#/' or '#'
    if (hash === 'landing' || hash === 'home' || hash === '' || hash === '/') {
      return 'home';
    }
    return hash || 'home';
  });
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }>>([]);
  const [openDMData, setOpenDMData] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Listen for navigation to chat with DM data
    const handleNavigateToChat = () => {
      const dmData = localStorage.getItem('openDM');
      if (dmData) {
        setOpenDMData(JSON.parse(dmData));
        setCurrentPage('chat');
        localStorage.removeItem('openDM');
      }
    };

    // Listen for overlay navigation event from Electron
    const handleOverlayNav = () => {
      console.log('🎯 Overlay navigation event received');
      setCurrentPage('overlay');
    };

    window.addEventListener('navigateToChat', handleNavigateToChat);
    window.addEventListener('navigate-overlay', handleOverlayNav);
    return () => {
      window.removeEventListener('navigateToChat', handleNavigateToChat);
      window.removeEventListener('navigate-overlay', handleOverlayNav);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + /: Show shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toastManager.success('Shortcuts: Ctrl+N = New Chat, Esc = Close modals');
      }
      
      // Ctrl/Cmd + N: New chat/DM
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setCurrentPage('chat');
      }
      
      // Escape: Close modals
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-active');
        if (activeModal) {
          (activeModal as HTMLElement).click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Smooth page transitions
  const handlePageChange = (page: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsTransitioning(false);
    }, 150);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B5CF6] mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show appropriate page based on platform and current route
  if (!user) {
    // Landing page routes (only for web)
    if ((currentPage === 'home' || currentPage === 'landing') && !isElectron()) {
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <Landing onNavigate={handlePageChange} />
        </Suspense>
      );
    }
    
    // Download page (only for web)
    if (currentPage === 'download' && !isElectron()) {
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <Download onNavigate={handlePageChange} />
        </Suspense>
      );
    }

    // Terms and Privacy pages (accessible without login)
    if (currentPage === 'terms') {
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <Terms />
        </Suspense>
      );
    }

    if (currentPage === 'privacy') {
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <Privacy />
        </Suspense>
      );
    }

    // For all other cases (including Electron), show Auth
    return <Auth />;
  }

  // Special handling for overlay mode - fullscreen transparent with floating widgets
  if (currentPage === 'overlay') {
    return (
      <Suspense fallback={<div className="fixed inset-0 bg-transparent" />}>
        <FloatingOverlay />
      </Suspense>
    );
  }

  const renderPage = () => {
    const PageComponent = (() => {
      switch (currentPage) {
        case 'home':
        case 'landing': return <Landing onNavigate={handlePageChange} />;
        case 'download': return <Download onNavigate={handlePageChange} />;
        case 'dashboard': return <Dashboard onNavigate={handlePageChange} />;
        case 'livestudio': return <LiveStudio />;
        case 'marketplace': return <Marketplace />;
        case 'rewards': return <Rewards />;
        case 'leaderboard': return <Leaderboard />;
        case 'referrals': return <Referrals />;
        case 'chat': return <Chat openDMData={openDMData} />;
        case 'profile': return <Profile />;
        case 'partyfinder': return <PartyFinder />;
        case 'friends': return <Friends />;
        case 'squads': return <Squads />;
        case 'activity': return <ActivityFeed />;
        case 'friendactivity': return <FriendActivity />;
        case 'transactions': return <TransactionHistory />;
        case 'settings': return <Settings />;
        case 'battlepass': return <BattlePass />;
        case 'tournaments': return <Tournaments />;
        case 'ranked': return <RankedLeaderboard />;
        case 'analytics': return <Analytics />;
        case 'clips': return <Clips />;
        case 'gamelibrary': return <GameLibrary />;
        case 'tokeneconomy': return <TokenEconomy />;
        case 'adminrevenue': return <AdminRevenue />;
        case 'adminpanel': return <AdminPanel onNavigate={handlePageChange} />;
        case 'terms': return <Terms />;
        case 'privacy': return <Privacy />;
        default: return <Dashboard onNavigate={handlePageChange} />;
      }
    })();

    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <div 
          className={`transition-opacity duration-200 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
        >
          {PageComponent}
        </div>
      </Suspense>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col md:flex-row">
      <DiscordSidebar 
        currentPage={currentPage} 
        onNavigate={handlePageChange}
        onCollapseChange={setIsSidebarCollapsed}
      />
      <main 
        className={`flex-1 transition-all duration-300 min-h-screen ${
          currentPage === 'chat' ? 'pb-0 overflow-hidden' : 'pb-16 md:pb-0 overflow-y-auto'
        } bg-[#0f0f0f] ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-60'
        }`}
      >
        {renderPage()}
      </main>
      <VoiceChatBar />
      <AchievementNotification />
      <DailyLoginReward />
      <ToastContainer toasts={toasts} onClose={toastManager.close} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VoiceChatProvider>
          <AppContent />
        </VoiceChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
