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
const AuctionHouse = lazy(() => import('./pages/AuctionHouse'));
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
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const Clips = lazy(() => import('./pages/Clips'));
const ClipsSystem = lazy(() => import('./pages/ClipsSystem'));
const StripeIntegration = lazy(() => import('./pages/StripeIntegration'));
const CryptoWallet = lazy(() => import('./pages/CryptoWallet'));
const GameLibrary = lazy(() => import('./pages/GameLibrary'));
const TokenEconomy = lazy(() => import('./pages/TokenEconomy'));
const EnhancedTokenEconomy = lazy(() => import('./pages/EnhancedTokenEconomy'));
const AdminRevenue = lazy(() => import('./pages/AdminRevenue'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

import DiscordSidebar from './components/DiscordSidebar';
import VoiceChatBar from './components/VoiceChatBar';
import AchievementNotification from './components/AchievementNotification';
import DailyLoginReward from './components/DailyLoginReward';
import CookieConsent from './components/CookieConsent';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import { ToastContainer, toast as toastManager } from './components/Toast';
import { isElectron } from './utils/platform';

// Loading skeleton component
const LoadingSkeleton = () => <LoadingSpinner fullScreen message="Loading QuestCord..." />;

function AppContent() {
  const { user, loading } = useAuth();
  // Set initial page based on platform and URL hash
  const [currentPage, setCurrentPage] = useState(() => {
    if (isElectron()) {
      console.log('🖥️ Electron detected - starting at auth');
      return 'auth';
    }
    // Check URL hash for initial route
    const hash = window.location.hash.slice(2); // Remove '#/' or '#'
    console.log('🌐 Web detected - Hash:', window.location.hash, 'Parsed:', hash);
    
    if (hash === 'landing' || hash === 'home' || hash === '' || hash === '/') {
      console.log('✅ Initial page set to: home (landing page)');
      return 'home';
    }
    console.log('📍 Initial page set to:', hash || 'home');
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

  // Auto-redirect to dashboard after login
  useEffect(() => {
    console.log('🔍 Redirect Check - User:', !!user, 'Loading:', loading, 'CurrentPage:', currentPage);
    
    if (user && !loading) {
      console.log('✅ User authenticated, currentPage:', currentPage);
      
      // FORCE redirect from auth/home/landing to dashboard
      if (currentPage === 'auth' || currentPage === 'home' || currentPage === 'landing') {
        console.log('🚀 FORCING REDIRECT to dashboard from:', currentPage);
        setTimeout(() => setCurrentPage('dashboard'), 0);
        return;
      }
      
      // List of valid pages for logged-in users
      const validPages = ['dashboard', 'rewards', 'leaderboard', 'chat', 'profile', 'settings', 
                         'partyfinder', 'friends', 'squads', 'activity', 'friendactivity',
                         'transactions', 'battlepass', 'tournaments', 'ranked', 'analytics', 'analytics-dashboard',
                         'clips', 'clips-system', 'wallet', 'crypto-wallet', 'gamelibrary', 'tokeneconomy', 'adminpanel', 'adminrevenue', 
                         'marketplace', 'auctionhouse', 'livestudio', 'referrals', 'terms', 'privacy'];
      
      // If on any other invalid page → go to dashboard
      if (!validPages.includes(currentPage) && currentPage !== 'overlay' && currentPage !== 'download') {
        console.log('🔄 Redirecting to dashboard from invalid page:', currentPage);
        setTimeout(() => setCurrentPage('dashboard'), 0);
      }
    }
  }, [user, loading, currentPage]);

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

    // Handle browser back/forward button navigation
    const handlePopState = () => {
      if (user) {
        // If user is logged in and tries to go back to landing page, redirect to dashboard
        const hash = window.location.hash.slice(2);
        if (hash === 'landing' || hash === 'home' || hash === '' || hash === '/') {
          console.log('🚫 Preventing logged-in user from accessing landing page via back button');
          setCurrentPage('dashboard');
          window.location.hash = '#/dashboard';
        }
      }
    };

    window.addEventListener('navigateToChat', handleNavigateToChat);
    window.addEventListener('navigate-overlay', handleOverlayNav);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('navigateToChat', handleNavigateToChat);
      window.removeEventListener('navigate-overlay', handleOverlayNav);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user]);

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

  // 🚨 CRITICAL: If user is logged in and on landing/home/auth → redirect IMMEDIATELY
  if (user && (currentPage === 'home' || currentPage === 'landing' || currentPage === 'auth')) {
    console.log('🚀 INSTANT REDIRECT: User logged in on landing page → dashboard');
    // Use setTimeout to avoid state update during render
    setTimeout(() => setCurrentPage('dashboard'), 0);
    
    // Return dashboard immediately to avoid showing landing page
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col md:flex-row">
        <DiscordSidebar 
          currentPage="dashboard" 
          onNavigate={handlePageChange}
        />
        <div className="flex-1 flex flex-col">
          <Suspense fallback={<LoadingSkeleton />}>
            <Dashboard onNavigate={handlePageChange} />
          </Suspense>
        </div>
        <VoiceChatBar />
        <ToastContainer toasts={toasts} onClose={(id) => setToasts(toasts.filter(t => t.id !== id))} />
        <CookieConsent />
      </div>
    );
  }

  // If not logged in, show appropriate page based on platform and current route
  if (!user) {
    // Debug logging
    console.log('🔍 Landing Page Debug:', {
      user: user ? 'LOGGED IN' : 'NOT LOGGED IN',
      currentPage,
      isElectron: isElectron(),
      hash: window.location.hash,
      shouldShowLanding: (currentPage === 'home' || currentPage === 'landing') && !isElectron()
    });

    // Landing page routes (only for web)
    if ((currentPage === 'home' || currentPage === 'landing') && !isElectron()) {
      console.log('✅ Showing Landing Page!');
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
    console.log('❌ Not showing Landing - Showing Auth instead. CurrentPage:', currentPage);
    return <Auth />;
  }

  // User is logged in
  console.log('👤 User is logged in, currentPage:', currentPage);

  // IMMEDIATE redirect for invalid pages when logged in
  const validLoggedInPages = ['dashboard', 'rewards', 'leaderboard', 'chat', 'profile', 'settings', 
                              'partyfinder', 'friends', 'squads', 'activity', 'friendactivity',
                              'transactions', 'battlepass', 'tournaments', 'ranked', 'analytics',
                              'clips', 'gamelibrary', 'tokeneconomy', 'enhanced-token-economy', 'adminpanel', 'adminrevenue', 
                              'marketplace', 'livestudio', 'referrals', 'terms', 'privacy', 'overlay'];
  
  if (!validLoggedInPages.includes(currentPage)) {
    console.log('⚡ INSTANT REDIRECT from invalid page:', currentPage, '→ dashboard');
    // Use synchronous state update
    setTimeout(() => setCurrentPage('dashboard'), 0);
    
    // Show dashboard immediately
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col md:flex-row">
        <DiscordSidebar 
          currentPage="dashboard" 
          onNavigate={handlePageChange}
        />
        <div className="flex-1 flex flex-col">
          <Suspense fallback={<LoadingSkeleton />}>
            <Dashboard onNavigate={handlePageChange} />
          </Suspense>
        </div>
        <VoiceChatBar />
        <ToastContainer toasts={toasts} onClose={(id) => setToasts(toasts.filter(t => t.id !== id))} />
        <CookieConsent />
      </div>
    );
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
        case 'dashboard': return <Dashboard onNavigate={handlePageChange} />;
        case 'livestudio': return <LiveStudio />;
        case 'marketplace': return <Marketplace />;
        case 'auctionhouse': return <AuctionHouse />;
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
        case 'analytics-dashboard': return <AnalyticsDashboard />;
        case 'clips': return <Clips />;
        case 'clips-system': return <ClipsSystem />;
        case 'wallet': return <StripeIntegration />;
        case 'crypto-wallet': return <CryptoWallet />;
        case 'gamelibrary': return <GameLibrary />;
        case 'tokeneconomy': return <TokenEconomy />;
        case 'enhanced-token-economy': return <EnhancedTokenEconomy />;
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
      <CookieConsent />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <VoiceChatProvider>
            <AppContent />
          </VoiceChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
