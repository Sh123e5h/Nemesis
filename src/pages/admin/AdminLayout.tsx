import { useState, useCallback } from 'react';
import { useNavigate, Link, useOutlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Folder, Activity, LogOut, ShieldAlert, Megaphone, 
  Settings, ChevronLeft, ChevronRight, Cpu, BookOpen, BarChart3, Ticket, 
  Flag, Shield, Bell, Trophy, Link2, HardDrive, Palette, Database, 
  FileBarChart, Gauge, Mail 
} from 'lucide-react';
import PageTransition from '../../components/PageTransition';
import { AnimatePresence } from 'framer-motion';

const NAV_SECTIONS = [
  {
    title: 'Core',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
      { label: 'Users', path: '/admin/users', icon: Users },
      { label: 'Groups', path: '/admin/groups', icon: Folder },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Tickets', path: '/admin/tickets', icon: Ticket },
      { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
      { label: 'Notifications', path: '/admin/notifications', icon: Bell },
      { label: 'Mailing Center', path: '/admin/mailing', icon: Mail },
      { label: 'Content', path: '/admin/content', icon: ShieldAlert },
    ],
  },
  {
    title: 'Control',
    items: [
      { label: 'Feature Flags', path: '/admin/flags', icon: Flag },
      { label: 'Access Control', path: '/admin/rbac', icon: Shield },
      { label: 'Quotas', path: '/admin/quotas', icon: Gauge },
      { label: 'Gamification', path: '/admin/gamification', icon: Trophy },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Health', path: '/admin/health', icon: Cpu },
      { label: 'Audit Logs', path: '/admin/logs', icon: Activity },
      { label: 'Reports', path: '/admin/reports', icon: FileBarChart },
      { label: 'Backups', path: '/admin/backups', icon: HardDrive },
      { label: 'SEO & Analytics', path: '/admin/search', icon: BarChart3 },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { label: 'Webhooks', path: '/admin/webhooks', icon: Link2 },
      { label: 'Theming', path: '/admin/theming', icon: Palette },
      { label: 'Data Explorer', path: '/admin/explorer', icon: Database },
      { label: 'Collab Hub', path: '/admin/collab', icon: BookOpen },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
  },
];

export default function AdminLayout() {
  // Call all hooks unconditionally at the top
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  
  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('adminAuth');
    sessionStorage.removeItem('adminId');
    navigate('/admin');
  }, [navigate]);

  return (
    <div className="flex bg-slate-100 h-screen font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20 transition-all duration-300 shrink-0 h-full`}>
        {/* Header */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} p-4 mb-1 h-16`}>
          {!sidebarCollapsed && (
            <h2 className="text-white font-bold text-lg flex items-center gap-2 truncate">
              <img src="/logo.svg" alt="Nemesis" className="w-7 h-7 shrink-0" /> Nemesis Admin
            </h2>
          )}
          {sidebarCollapsed && (
            <img src="/logo.svg" alt="Nemesis" className="w-7 h-7" />
          )}
          {!sidebarCollapsed && (
            <button 
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {sidebarCollapsed && (
          <div className="flex justify-center mb-4">
             <button 
              onClick={() => setSidebarCollapsed(false)}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
        
        {/* Nav Sections */}
        <nav className="flex flex-col gap-1 flex-1 px-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {NAV_SECTIONS.map(section => (
            <div key={section.title} className="mb-2">
              {!sidebarCollapsed && (
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.15em] px-3 pt-3 pb-1">{section.title}</div>
              )}
              {sidebarCollapsed && <div className="h-px bg-slate-800 mx-2 my-1" />}
              {section.items.map(item => {
                const segment = item.path.split('/admin/')[1];
                const isActive = location.pathname === item.path || (segment && location.pathname.startsWith(item.path) && segment.length > 0);
                return (
                  <Link 
                    key={item.path}
                    to={item.path} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition group relative ${
                      isActive 
                        ? 'bg-sky-600 text-white shadow-sm shadow-sky-500/20' 
                        : 'hover:bg-slate-800 hover:text-white'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon size={16} className="shrink-0" />
                    {!sidebarCollapsed && <span className="text-[13px] font-medium truncate">{item.label}</span>}
                    
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50 shadow-lg capitalize">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 pb-4 pt-2 border-t border-slate-800">
          <button 
            onClick={handleLogout} 
            className={`flex items-center gap-3 px-3 py-2.5 w-full hover:bg-red-500/10 rounded-xl text-red-400 transition font-medium ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? 'Logout Session' : undefined}
          >
            <LogOut size={16} className="shrink-0" />
            {!sidebarCollapsed && <span className="text-[13px]">Logout Session</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen scrollbar-premium">
        <div className="max-w-7xl mx-auto w-full pb-10">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              {outlet}
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

