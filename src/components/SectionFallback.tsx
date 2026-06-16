import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { 
  HomeSkeleton, 
  PlannerSkeleton, 
  GridSkeleton, 
  DetailSkeleton, 
  ConfigSkeleton, 
  ProfileSkeleton, 
  PageSkeleton,
  WelcomeSkeleton
} from './PageSkeleton';
import AuthSkeleton from './auth/AuthSkeleton';

export const SectionFallback = () => {
  const location = useLocation();
  const { session } = useAuthStore();
  const pathname = location.pathname;
  
  const isAuthPath = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname) || pathname.startsWith('/signup/');
  
  const renderContent = () => {
    // 1. SAFETY GATE: Root Landing Page — show an instant white shell while landing page loads
    if (pathname === '/') return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
    
    // 2. Onboarding Flow (/onboarding or /welcome)
    if (pathname === '/onboarding' || pathname === '/welcome') return <WelcomeSkeleton />;

    // 3. Auth pages (Login, Signup, etc.)
    if (isAuthPath && !session) return <AuthSkeleton />;
    
    // 3. Dashboard / Home / Redirects from Auth
    if (pathname === '/home' || (isAuthPath && session)) return <HomeSkeleton />;
    
    // 4. Planner
    if (pathname === '/planner') return <PlannerSkeleton />;
    
    // 5. Organizer Home / Groups List
    if (pathname === '/organizer' || pathname === '/groups') return <GridSkeleton />;
    
    // 6. Subjects / Topics / Group Detail
    if (pathname.startsWith('/organizer/') || pathname.startsWith('/groups/')) return <DetailSkeleton />;
    
    // 7. Settings / Profile Edit
    if (pathname === '/settings' || pathname === '/profile/edit') return <ConfigSkeleton />;
    
    // 8. Profile (Main)
    if (pathname === '/profile') return <ProfileSkeleton />;
    
    // 9. Default fallback for unknown routes or catch-alls
    return <PageSkeleton />;
  };

  return (
    <div className="relative">
      {renderContent()}
    </div>
  );
};
