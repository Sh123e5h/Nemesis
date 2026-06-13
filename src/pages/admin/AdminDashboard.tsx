import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Folder, TrendingUp, AlertCircle, FileText, HardDrive, Wifi, Clock, Megaphone, Trash2, RefreshCw } from 'lucide-react';
import UserAvatar from '../../components/UserAvatar';
import { Link } from 'react-router-dom';
import { Skeleton, SkeletonLine } from '../../components/Skeleton';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeGroups: 0,
    newUsersWeek: 0,
    totalMaterials: 0,
    totalFiles: 0,
    onlineUsers: 0,
    supabaseBytes: 0,
    r2Bytes: 0,
    infraLimits: { supabase_max_mb: 850, r2_max_gb: 9.5 }
  });

  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [dailySignups, setDailySignups] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setRefreshing(true);

    try {
      const adminId = sessionStorage.getItem('adminId');
      
      // 1. Fetch aggregated stats and trends in a single high-performance call
      const { data: dashboardData, error: statsError } = await supabase.rpc('get_admin_dashboard_stats');
      
      // 2. Fetch recent profiles (already bypassing RLS via security definer)
      const { data: recent, error: recentError } = await supabase.rpc('get_admin_profiles', { 
        p_page_size: 8 
      });

      // 3. Fetch recent audit logs
      const { data: logs, error: logsError } = await supabase.rpc('get_admin_audit_logs', { 
        p_admin_id: adminId,
        p_limit: 8 
      });

      if (statsError || recentError || logsError) {
        console.error('Data sync failed:', { statsError, recentError, logsError });
      }

      if (dashboardData) {
        setStats({
          totalUsers: dashboardData.totalUsers || 0,
          activeGroups: dashboardData.activeGroups || 0,
          newUsersWeek: dashboardData.newUsersWeek || 0,
          totalMaterials: dashboardData.totalMaterials || 0,
          totalFiles: dashboardData.totalFiles || 0,
          onlineUsers: dashboardData.onlineUsers || 0,
          supabaseBytes: dashboardData.supabaseBytes || 0,
          r2Bytes: dashboardData.r2Bytes || 0,
          infraLimits: dashboardData.infraLimits || { supabase_max_mb: 850, r2_max_gb: 9.5 }
        });
        
        if (dashboardData.signupTrend) {
          setDailySignups(dashboardData.signupTrend.map((t: any) => t.count || 0));
        }
      }

      if (recent) setRecentUsers(recent);
      if (logs) setRecentLogs(logs);

    } catch (err) {
      console.error('Critical Dashboard Failure:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    
    // Global sync listener for admin updates
    const handleSync = (e: any) => {
      const { table } = e.detail;
      // Refresh dashboard on audit logs, profiles, or groups changes
      if (['audit_logs', 'profiles', 'groups', 'group_members'].includes(table)) {
        fetchDashboardData();
      }
    };
    
    window.addEventListener('nemesis_sync', handleSync);
    return () => window.removeEventListener('nemesis_sync', handleSync);
  }, [fetchDashboardData]);

  const maxSignup = Math.max(...dailySignups, 1);
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const purgeOldLogs = useCallback(async () => {
    if (!confirm('Delete audit logs older than 30 days?')) return;
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { data, error } = await supabase.rpc('admin_purge_audit_logs', {
        p_days_to_keep: 30,
        p_admin_id: adminId
      });

      if (error) throw error;
      
      alert(`Optimization complete: ${data?.count || 0} legacy log entries purged.`);
      fetchDashboardData();
    } catch (err: any) {
      console.error('Log Purge Failed:', err.message);
      alert('Maintenance Error: ' + err.message);
    }
  }, [fetchDashboardData]);

  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('PURGE') || act.includes('REMOVE')) return 'bg-red-50 text-red-700 border-red-100';
    if (act.includes('SUSPEND') || act.includes('RESTRICT') || act.includes('BAN')) return 'bg-amber-50 text-amber-700 border-amber-100';
    if (act.includes('ACTIVATE') || act.includes('SETUP') || act.includes('ENABLED') || act.includes('CREATE')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (act.includes('EDIT') || act.includes('UPDATE') || act.includes('SYNC')) return 'bg-sky-50 text-sky-700 border-sky-100';
    if (act.includes('LOGIN') || act.includes('AUTH') || act.includes('OTP')) return 'bg-violet-50 text-violet-700 border-violet-100';
    return 'bg-slate-50 text-slate-700 border-slate-100';
  };

  if (loading) return (
    <div className="space-y-6 px-4 md:px-0 mobile-hardened">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <SkeletonLine width="200px" height="2rem" />
          <SkeletonLine width="280px" height="0.875rem" />
        </div>
        <Skeleton variant="rectangle" className="w-[100px] h-[40px] rounded-xl" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
             <Skeleton variant="rectangle" className="w-10 h-10 rounded-xl" />
             <SkeletonLine width="60px" height="1.5rem" />
             <SkeletonLine width="80px" height="10px" className="opacity-40" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {[1, 2].map(i => (
           <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <div className="flex justify-between">
                <SkeletonLine width="140px" />
                <SkeletonLine width="60px" />
              </div>
              <SkeletonLine width="200px" height="1.5rem" />
              <Skeleton variant="rectangle" className="w-full h-3 rounded-full opacity-20" />
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-6 space-y-4">
           <SkeletonLine width="200px" />
           <div className="flex items-end gap-3 h-36">
             {[30, 70, 40, 80, 50, 60, 45].map((height, i) => (
               <Skeleton key={i} variant="rectangle" className="flex-1 rounded-t-lg opacity-10" style={{ height: `${height}%` }} />
             ))}
           </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-3">
           <SkeletonLine width="120px" className="mb-4" />
           {[1,2,3,4].map(i => <Skeleton variant="rectangle" key={i} className="h-10 w-full rounded-xl opacity-10" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 px-4 md:px-0 mobile-hardened">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time system health and activity</p>
        </div>
        <button 
          onClick={fetchDashboardData} 
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'sky', gradient: 'from-sky-500 to-blue-600' },
          { label: 'Active Groups', value: stats.activeGroups, icon: Folder, color: 'indigo', gradient: 'from-indigo-500 to-violet-600' },
          { label: 'New Users (7d)', value: stats.newUsersWeek, icon: TrendingUp, color: 'emerald', gradient: 'from-emerald-500 to-green-600' },
          { label: 'Study Materials', value: stats.totalMaterials, icon: FileText, color: 'amber', gradient: 'from-amber-500 to-orange-600' },
          { label: 'Group Files', value: stats.totalFiles, icon: HardDrive, color: 'rose', gradient: 'from-rose-500 to-pink-600' },
          { label: 'Online Now', value: stats.onlineUsers, icon: Wifi, color: 'green', gradient: 'from-green-500 to-emerald-600' },
          { label: 'Search Health', value: 'Active', icon: TrendingUp, color: 'sky', gradient: 'from-blue-600 to-indigo-600' },
        ].map(stat => (
          <div key={stat.label} className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition group ${stat.label === 'Search Health' ? 'xl:col-span-2' : ''}`}>
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition`}>
                <stat.icon size={20} className="text-white" />
              </div>
              {stat.label === 'Search Health' && (
                <div className="flex flex-wrap gap-1.5 justify-end max-w-[140px]">
                   {[
                     { n: 'INOW', s: 'V' },
                     { n: 'BING', s: 'P' },
                     { n: 'YNDX', s: 'OK' },
                     { n: 'MAP', s: 'V1' }
                   ].map(b => (
                     <div key={b.n} className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded-md flex items-center gap-1">
                        <span className="text-[7px] font-black text-slate-400">{b.n}</span>
                        <span className="text-[7px] font-black text-sky-600">{b.s}</span>
                     </div>
                   ))}
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              {stat.label === 'Search Health' && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Discovery Active</span>}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</p>
          </div>
        ))}

        {/* Infrastructure Gauges: Supabase */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition group relative overflow-hidden">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition shadow-sm">
                <HardDrive size={20} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-none">Supabase Storage</h3>
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Infrastructure: Database</p>
              </div>
            </div>
            <div className="px-1.5 py-0.5 text-[8px] font-black bg-emerald-50 text-emerald-500 rounded uppercase border border-emerald-100 tracking-tighter">Production</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xl font-black text-slate-800 tracking-tight">{(stats.supabaseBytes / 1024 / 1024).toFixed(1)}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase ml-1">MB / {stats.infraLimits.supabase_max_mb} MB</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{( (stats.supabaseBytes / (stats.infraLimits.supabase_max_mb * 1024 * 1024)) * 100 ).toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50 p-[1px]">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${Math.max(2, Math.min(100, (stats.supabaseBytes / (stats.infraLimits.supabase_max_mb * 1024 * 1024)) * 100))}%` }} />
            </div>
          </div>
        </div>
      </div>



      {/* Middle row: Charts + Quick Actions */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signup Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">User Signups (Last 7 Days)</h2>
          <div className="flex items-end gap-3 h-36">
            {dailySignups.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-slate-700">{count}</span>
                <div 
                  className="w-full bg-gradient-to-t from-sky-500 to-indigo-500 rounded-t-lg transition duration-500 min-h-[4px]"
                  style={{ height: `${Math.max((count / maxSignup) * 100, 4)}%` }}
                />
                <span className="text-[10px] text-slate-400 font-medium">{dayLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-2 flex-1">
            <Link to="/admin/announcements" className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 transition font-medium text-sm w-full">
              <Megaphone size={18} /> Broadcast Announcement
            </Link>
            <Link to="/admin/users" className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition font-medium text-sm w-full">
              <Users size={18} /> Manage Users
            </Link>
            <Link to="/admin/content" className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition font-medium text-sm w-full">
              <AlertCircle size={18} /> Content Moderation
            </Link>
            <button onClick={purgeOldLogs} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition font-medium text-sm w-full text-left">
              <Trash2 size={18} /> Purge Old Logs
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Recent Users + Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent Users</h2>
            <Link to="/admin/users" className="text-xs text-sky-500 font-medium hover:underline">View All →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentUsers.map(u => !u ? null : (
              <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition">
                    <UserAvatar 
                      url={u.avatar_url} 
                      name={u.full_name} 
                      size="sm" 
                    />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm truncate">{u.full_name}</div>
                  <div className="text-slate-500 text-xs">@{u.username}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {u.status}
                </span>
              </div>
            ))}
            {recentUsers.length === 0 && <div className="p-6 text-center text-slate-500 text-sm">No users found.</div>}
          </div>
        </div>

        {/* Recent Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2"><Clock size={16} className="text-slate-400" /> Recent Actions</h2>
            <Link to="/admin/logs" className="text-xs text-sky-500 font-medium hover:underline">View All →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentLogs.map(l => !l ? null : (
              <div key={l.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition">
                <div className="flex-1 min-w-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getActionColor(l.action)}`}>
                    {l.action.replace(/_/g, ' ')}
                  </span>
                  <div className="text-slate-500 text-xs mt-1">
                    by {l.admin_email}
                  </div>
                </div>
                <div className="text-slate-400 text-xs whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && <div className="p-6 text-center text-slate-500 text-sm">No recent actions.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
