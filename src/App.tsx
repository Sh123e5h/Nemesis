import { useEffect, useState, Suspense } from 'react';
import { lazyWithRetry as lazy } from './lib/lazyWithRetry';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { supabase } from './lib/supabase';
import MainLayout from './components/MainLayout';
import TopProgressBar from './components/TopProgressBar';
import MaintenanceBanner from './components/MaintenanceBanner';

import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import SEO from './components/SEO';
import PageTransition from './components/PageTransition';
import { SectionFallback } from './components/SectionFallback';
import { syncEngine } from './lib/SyncEngine';

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

const Maintenance = lazy(() => import('./pages/Maintenance'), 'Maintenance');
import PremiumSplashScreen from './components/PremiumSplashScreen';

// Root & Landing Page
const Landing = lazy(() => import('./pages/Landing'), 'Landing');

// Auth & Root Lazy Imports
const Welcome = lazy(() => import('./pages/auth/Welcome'), 'Welcome');
const Login = lazy(() => import('./pages/auth/Login'), 'Login');
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'), 'ResetPassword');
const SignupStep1 = lazy(() => import('./pages/auth/SignupStep1'), 'SignupStep1');
const SignupStep2 = lazy(() => import('./pages/auth/SignupStep2'), 'SignupStep2');
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'), 'ForgotPassword');
const Home = lazy(() => import('./pages/Home'), 'Home');
const Planner = lazy(() => import('./pages/Planner'), 'Planner');
const OrganizerHome = lazy(() => import('./pages/organizer/OrganizerHome'), 'OrganizerHome');
const SubjectView = lazy(() => import('./pages/organizer/SubjectView'), 'SubjectView');
const TopicView = lazy(() => import('./pages/organizer/TopicView'), 'TopicView');
const AddMaterial = lazy(() => import('./pages/organizer/AddMaterial'), 'AddMaterial');
const PdfPreview = lazy(() => import('./pages/organizer/PdfPreview'), 'PdfPreview');
const QuizView = lazy(() => import('./pages/organizer/QuizView'), 'QuizView');

// Group Lazy Imports
const GroupsList = lazy(() => import('./pages/groups/GroupsList'), 'GroupsList');
const GroupDetail = lazy(() => import('./pages/groups/GroupDetail'), 'GroupDetail');
const GroupMembers = lazy(() => import('./pages/groups/GroupMembers'), 'GroupMembers');
const GroupFiles = lazy(() => import('./pages/groups/GroupFiles'), 'GroupFiles');
const GroupMaterials = lazy(() => import('./pages/groups/GroupMaterials'), 'GroupMaterials');
const GroupChat = lazy(() => import('./pages/groups/GroupChat'), 'GroupChat');
const GroupPlanner = lazy(() => import('./pages/groups/GroupPlanner'), 'GroupPlanner');
const GroupWhiteboard = lazy(() => import('./pages/groups/GroupWhiteboard'), 'GroupWhiteboard');

// Admin Lazy Imports
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'), 'AdminLayout');
const AdminAuth = lazy(() => import('./pages/admin/AdminAuth'), 'AdminAuth');
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'), 'AdminDashboard');
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'), 'AdminUsers');
const AdminCollab = lazy(() => import('./pages/admin/AdminCollab'), 'AdminCollab');
const AdminGroups = lazy(() => import('./pages/admin/AdminGroups'), 'AdminGroups');
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'), 'AdminLogs');
const AdminContent = lazy(() => import('./pages/admin/AdminContent'), 'AdminContent');
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'), 'AdminAnnouncements');
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'), 'AdminSettings');
const AdminHealth = lazy(() => import('./pages/admin/AdminHealth'), 'AdminHealth');
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'), 'AdminAnalytics');
const AdminTickets = lazy(() => import('./pages/admin/AdminTickets'), 'AdminTickets');
const AdminFeatureFlags = lazy(() => import('./pages/admin/AdminFeatureFlags'), 'AdminFeatureFlags');
const AdminRBAC = lazy(() => import('./pages/admin/AdminRBAC'), 'AdminRBAC');
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'), 'AdminNotifications');
const AdminGamification = lazy(() => import('./pages/admin/AdminGamification'), 'AdminGamification');
const AdminWebhooks = lazy(() => import('./pages/admin/AdminWebhooks'), 'AdminWebhooks');
const AdminBackups = lazy(() => import('./pages/admin/AdminBackups'), 'AdminBackups');
const AdminTheming = lazy(() => import('./pages/admin/AdminTheming'), 'AdminTheming');
const AdminDataExplorer = lazy(() => import('./pages/admin/AdminDataExplorer'), 'AdminDataExplorer');
const AdminReports = lazy(() => import('./pages/admin/AdminReports'), 'AdminReports');
const AdminQuotas = lazy(() => import('./pages/admin/AdminQuotas'), 'AdminQuotas');
const AdminMailing = lazy(() => import('./pages/admin/AdminMailing'), 'AdminMailing');
const AdminSearch = lazy(() => import('./pages/admin/AdminSearch'), 'AdminSearch');

// Other Page Lazy Imports
const Profile = lazy(() => import('./pages/Profile'), 'Profile');
const ProfileEdit = lazy(() => import('./pages/ProfileEdit'), 'ProfileEdit');
const PublicProfile = lazy(() => import('./pages/PublicProfile'), 'PublicProfile');
const Settings = lazy(() => import('./pages/Settings'), 'Settings');
const GlobalSearch = lazy(() => import('./pages/GlobalSearch'), 'GlobalSearch');
const Notifications = lazy(() => import('./pages/Notifications'), 'Notifications');
const DirectMessages = lazy(() => import('./pages/DirectMessages'), 'DirectMessages');
const SuspendedNotice = lazy(() => import('./pages/SuspendedNotice'), 'SuspendedNotice');
const DevTeam = lazy(() => import('./pages/DevTeam'), 'DevTeam');
const NotFound = lazy(() => import('./pages/NotFound'), 'NotFound');
const TermsOfService = lazy(() => import('./pages/TermsOfService'), 'TermsOfService');
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'), 'PrivacyPolicy');
const FAQ = lazy(() => import('./pages/FAQ'), 'FAQ');

import LiveBackground from './components/LiveBackground';



/**
 * Wrapper component for admin routes.
 * Routes unauthenticated users to AdminAuth, authenticated users get AdminLayout + nested routes.
 * 
 * Auth check uses sessionStorage values set by AdminAuth.tsx on successful login,
 * with a backend validation to ensure the admin ID is still valid.
 */
function AdminAuthGate() {
  const location = useLocation();
  const [isInvalidated, setIsInvalidated] = useState(false);
  
  // Synchronous session check prevents routing flash and race conditions
  const hasSession = sessionStorage.getItem('adminAuth') === 'true' && !!sessionStorage.getItem('adminId');

  useEffect(() => {
    async function verifyAdmin() {
      if (!hasSession) return;
      try {
        // Backend validation: verify the admin ID still exists and is active
        const { data: isEmpty, error } = await supabase.rpc('is_admin_users_empty');
        if (error) {
          console.warn('Admin backend check failed, using session auth:', error.message);
          return;
        }

        if (isEmpty === true) {
          // No admin users exist — the session is stale
          sessionStorage.removeItem('adminAuth');
          sessionStorage.removeItem('adminId');
          setIsInvalidated(true);
        }
      } catch {
        // Ignore network/unexpected errors to preserve graceful degradation
      }
    }
    verifyAdmin();
  }, [location.pathname, hasSession]);

  if (isInvalidated || (!hasSession && location.pathname !== '/admin')) {
    // If the backend invalidated the session, or they aren't logged in, redirect to login
    return <Navigate to="/admin" replace />;
  }

  if (!hasSession) {
    // Renders the AdminAuth login component at /admin
    return <Outlet />;
  }

  // If they have a session and try to visit the login page, redirect to dashboard
  if (hasSession && location.pathname === '/admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <AdminLayout />;
}

/**
 * A wrapper to prevent authenticated users from 'flickering' through guest-only pages.
 * GuestRoute — prevents fully-authenticated users from accessing auth pages.
 *
 * Rules:
 * 1. Never show a spinner here — it would unmount the Login component and lose
 *    local state like the OTP code, tempSession ref, etc.
 * 2. Only redirect once we KNOW the user is authenticated AND has a complete
 *    profile (username set). This handles: returning users, post-login.
 * 3. isFetchingProfile: don't redirect while profile is loading — we don't yet
 *    know whether the user has finished onboarding.
 */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, isFetchingProfile } = useAuthStore();

  // Only redirect when we definitively know the user is fully authenticated.
  // Wait for isFetchingProfile=false so we don't redirect before profile loads.
  if (session && !isFetchingProfile && profile?.username) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}



function App() {
  const { profile } = useAuthStore();
  const [isMaintenance, setIsMaintenance] = useState(() => {
    // 🧠 Initial state from cache to prevent "Dashboard flicker" on fresh loads
    const cached = localStorage.getItem('nemesis_maintenance_cached');
    return cached === 'true';
  });

  useEffect(() => {
    if (profile) {
      syncEngine.initialize();
    }
  }, [profile]);


  const [isVisible, setIsVisible] = useState(true);

  // TAB VISIBILITY DETECTOR
  useEffect(() => {
    const handleVisibility = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      if (visible) {
        document.documentElement.classList.remove('is-hidden');
      } else {
        document.documentElement.classList.add('is-hidden');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ─── NATIVE BACK BUTTON HANDLER (ANDROID) ───
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListener: any;
    const initBackListener = async () => {
      backListener = await CapApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapApp.exitApp();
        } else {
          window.history.back();
        }
      });
    };

    initBackListener();
    return () => {
      if (backListener) backListener.remove();
    };
  }, []);

  useEffect(() => {
    // ⚡ DEFERRED: Non-critical cleanup
    const timer = setTimeout(() => {
      const keysToPurge = [
        'drive_scopes_valid',
        'gdrive_usage',
        'gdrive_limit',
        'last_backup_at',
        'pending_gdrive_config'
      ];
      keysToPurge.forEach(k => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Background sync is now handled by CloudSyncManager / useCloudSync in MainLayout

  const [isLowPerf, setIsLowPerf] = useState(false);
  
  useEffect(() => {
    const checkPerformance = () => {
      const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // Basic heuristic for low-end hardware
      const isSlowHardware = (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) || 
                             ((navigator as Navigator & { deviceMemory?: number }).deviceMemory && (navigator as Navigator & { deviceMemory?: number }).deviceMemory! < 4);
      
      const lowPerf = !!(isReducedMotion || isSlowHardware);
      setIsLowPerf(lowPerf);
      if (lowPerf) {
        document.documentElement.classList.add('low-perf');
      } else {
        document.documentElement.classList.remove('low-perf');
      }
    };
    
    checkPerformance();
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', checkPerformance);
    return () => mediaQuery.removeEventListener('change', checkPerformance);
  }, []);

  useEffect(() => {
    const theme = profile?.theme_preference || 'glassmorphism';
    const root = document.documentElement;
    for (const cls of [...root.classList]) {
      if (cls.startsWith('theme-')) root.classList.remove(cls);
    }
    root.classList.add(`theme-${theme}`);
    return () => {
      root.classList.remove(`theme-${theme}`);
    };
  }, [profile?.theme_preference]);


  useEffect(() => {
    const checkMaintenance = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
      if (data) {
        const val = data.value as unknown;
        if (typeof val === 'object' && val !== null) {
          const config = val as Record<string, unknown>;
          if (config.enabled === true) {
            setIsMaintenance(true);
            localStorage.setItem('nemesis_maintenance_cached', 'true');
            // Handle expires_at safely
            if (config.expires_at && typeof config.expires_at === 'string') {
              const expiry = new Date(config.expires_at);
              if (expiry < new Date()) {
                setIsMaintenance(false);
                return;
              }
            }
          } else {
            setIsMaintenance(false);
          }
        } else {
          setIsMaintenance(val === true);
          localStorage.setItem('nemesis_maintenance_cached', String(val === true));
        }
      } else {
        // If no data/key found, default to false and clear cache
        setIsMaintenance(false);
        localStorage.setItem('nemesis_maintenance_cached', 'false');
      }
    };
    
    // Execute maintenance check immediately to prevent route-flicker
    checkMaintenance();
    
    // Use a unique channel name to avoid conflicts with Maintenance.tsx's own channel
    const channel = supabase
      .channel('app-maintenance-watcher')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings', filter: 'key=eq.maintenance_mode' }, () => {
        // With REPLICA IDENTITY FULL, payload.new contains the full updated row.
        // Always re-fetch on any change to guarantee correctness.
        checkMaintenance();
      })
      .subscribe();
      
    return () => { 
      supabase.removeChannel(channel); 
    };
  }, []);

  // 🛡️ COMPREHENSIVE PLATFORM DETECTION
  // Uses safe detection to avoid crashing if Capacitor is not fully shimmed in production web
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  const Router = isNative ? HashRouter : BrowserRouter;

  return (
    <Router>
      <AppRoutes 
        isMaintenance={isMaintenance} 
        isLowPerf={isLowPerf} 
        isVisible={isVisible} 
      />
    </Router>
  );
}

// Inner component — has access to useLocation() inside <BrowserRouter>
function AppRoutes({ isMaintenance, isLowPerf, isVisible }: {
  isMaintenance: boolean;
  isLowPerf: boolean;
  isVisible: boolean;
}) {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const { profile } = useAuthStore();
  const [showSplash, setShowSplash] = useState(() => {
    return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  });

  // ⚡ GUARANTEED MOBILE SCROLL UNLOCK
  // Framer Motion's delayed unmounting can sometimes leave scroll-locks stuck on the HTML root
  // when navigating away from Home to scrolling pages like Profile or Settings.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const applyStatusBarStyle = async () => {
      try {
        const theme = profile?.theme_preference || 'glassmorphism';
        const isDark = theme === 'dark' || theme === 'cyberpunk';
        
        await StatusBar.setStyle({
          style: isDark ? Style.Dark : Style.Light
        });
      } catch (err) {
        console.error('Failed to sync StatusBar style:', err);
      }
    };

    applyStatusBarStyle();
  }, [profile?.theme_preference, location.pathname]);

  useEffect(() => {
    if (location.pathname !== '/home') {
      document.documentElement.classList.remove('home-mobile-lock');
      document.body.classList.remove('home-mobile-lock');
    }
    
    // Safety check for Landing Page: ensure scroll is NEVER locked here
    if (location.pathname === '/' || Capacitor.getPlatform() === 'android') {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.documentElement.classList.remove('is-hidden');
    }
  }, [location.pathname]);


  // AUTH & STATUS INITIALIZATION GUARD: Don't render routes until session status AND maintenance status are known.
  // This completely eliminates the "Maintenance flicker" and "Login flicker" by using the Elite Payloader as a hard gate.

  if (isMaintenance && !isAdminPath) {
    return (
      <Suspense fallback={<SectionFallback />}>
        <Maintenance />
      </Suspense>
    );
  }

  return (
    <GlobalErrorBoundary>
      <Suspense fallback={null}>
        <PremiumSplashScreen isVisible={showSplash} onFinish={() => setShowSplash(false)} />
      </Suspense>

      <TopProgressBar />
      <SEO />
      <MaintenanceBanner />
    <div className="app-wrapper min-h-screen min-h-[100dvh] flex flex-col items-stretch justify-start transition-colors duration-300 relative overflow-x-hidden min-w-0">
      {(!profile?.theme_preference || profile.theme_preference === 'glassmorphism') && !isLowPerf && (
        <Suspense fallback={null}>
          <LiveBackground isVisible={isVisible} />
        </Suspense>
      )}

      <Suspense fallback={<SectionFallback />}>
          <Routes>
            <Route 
              path="/" 
              element={
                <GuestRoute>
                  <PageTransition>
                    {Capacitor.getPlatform() === 'android' ? <SignupStep1 /> : <Landing />}
                  </PageTransition>
                </GuestRoute>
              } 
            />
            <Route path="/welcome" element={<GuestRoute><PageTransition><Welcome /></PageTransition></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><PageTransition><ForgotPassword /></PageTransition></GuestRoute>} />
            <Route path="/reset-password" element={<GuestRoute><PageTransition><ResetPassword /></PageTransition></GuestRoute>} />
            <Route path="/login" element={<GuestRoute><PageTransition><Login /></PageTransition></GuestRoute>} />
            <Route path="/signup" element={<GuestRoute><PageTransition><SignupStep1 /></PageTransition></GuestRoute>} />
            
            <Route element={<MainLayout />}>
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/dev-team" element={<DevTeam />} />

              <Route element={<ProtectedRoute requireUsername={true} />}>
                <Route path="/home" element={<Home />} />
                <Route path="/planner" element={<Planner />} />
                
                <Route path="/organizer">
                  <Route index element={<OrganizerHome />} />
                  <Route path="add" element={<AddMaterial />} />
                  <Route path="flashcards/*" element={<Navigate to="/organizer" replace />} />
                  <Route path=":subject" element={<SubjectView />} />
                  <Route path=":subject/:topic" element={<TopicView />} />
                </Route>
    
                <Route path="/groups">
                  <Route index element={<GroupsList />} />
                  <Route path=":groupId" element={<GroupDetail />}>
                    <Route index element={<GroupMaterials />} />
                    <Route path="files" element={<GroupFiles />} />
                    <Route path="planner" element={<GroupPlanner />} />
                    <Route path="chat" element={<GroupChat />} />
                    <Route path="whiteboard" element={<GroupWhiteboard />} />
                    <Route path="members" element={<GroupMembers />} />
                  </Route>
                </Route>
    
                <Route path="/profile">
                  <Route index element={<Profile />} />
                  <Route path="edit" element={<ProfileEdit />} />
                  <Route path=":username" element={<PublicProfile />} />
                </Route>
    
                <Route path="/search" element={<GlobalSearch />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/team" element={<Navigate to="/dev-team" replace />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/messages" element={<DirectMessages />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute requireUsername={false} />}>
              <Route path="/signup/username" element={<PageTransition><SignupStep2 /></PageTransition>} />
            </Route>

            <Route path="/suspended" element={<PageTransition><SuspendedNotice /></PageTransition>} />
          
            {/* Full-screen Focus Views (No Layout Header/Footer) */}
            <Route element={<ProtectedRoute requireUsername={true} />}>
              <Route path="/onboarding" element={<PageTransition><Welcome /></PageTransition>} />
              <Route path="/organizer/preview/:fileId" element={<PageTransition><PdfPreview /></PageTransition>} />
              <Route path="/organizer/quiz/:quizId" element={<PageTransition><QuizView /></PageTransition>} />
            </Route>
    
            <Route path="/admin" element={<AdminAuthGate />}>
              <Route index element={<AdminAuth />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="mailing" element={<AdminMailing />} />
              <Route path="collab" element={<AdminCollab />} />
              <Route path="groups" element={<AdminGroups />} />
              <Route path="content" element={<AdminContent />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="health" element={<AdminHealth />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="tickets" element={<AdminTickets />} />
              <Route path="flags" element={<AdminFeatureFlags />} />
              <Route path="rbac" element={<AdminRBAC />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="gamification" element={<AdminGamification />} />
              <Route path="webhooks" element={<AdminWebhooks />} />
              <Route path="backups" element={<AdminBackups />} />
              <Route path="theming" element={<AdminTheming />} />
              <Route path="explorer" element={<AdminDataExplorer />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="quotas" element={<AdminQuotas />} />
              <Route path="search" element={<AdminSearch />} />
            </Route>
    
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
      </Suspense>
    </div>
    </GlobalErrorBoundary>
  );
}

export default App;

