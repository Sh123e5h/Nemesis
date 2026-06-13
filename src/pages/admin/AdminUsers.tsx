import { useState, useEffect, useCallback } from 'react';
import UserAvatar from '../../components/UserAvatar';
import { supabase } from '../../lib/supabase';
import { Search, UserX, UserCheck, X, FileText, Folder, AlertTriangle, ExternalLink, Trash2, Download, Cloud, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton, SkeletonLine } from '../../components/Skeleton';

const isOnline = (lastSeen: string | null) => {
  if (!lastSeen) return false;
  const lastSeenDate = new Date(lastSeen).getTime();
  const now = new Date().getTime();
  return (now - lastSeenDate) < (5 * 60 * 1000); // 5 minutes threshold
};

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<{
    materials: any[];
    files: any[];
    reports: any[];
  }>({
    materials: [],
    files: [],
    reports: []
  });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Smart Pagination State
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page when search changes
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1); // Reset to first page when filter changes
  }, [filter]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rpcData, error } = await supabase.rpc('get_admin_profiles', {
        p_search: debouncedSearch,
        p_filter: filter,
        p_page: page,
        p_page_size: ITEMS_PER_PAGE
      });

      if (error) throw error;

      if (rpcData && rpcData.length > 0) {
        setUsers(rpcData);
        setTotalUsers(Number(rpcData[0].full_count));
      } else {
        setUsers([]);
        setTotalUsers(0);
      }
    } catch (err) {
      console.error('Failed to sync intelligence pool:', err);
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchUserDetails = useCallback(async (userId: string) => {
    setDetailsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_admin_intel', { p_user_id: userId });
      if (error) throw error;
      if (data) setUserDetails(data);
    } catch {
      setUserDetails({ materials: [], files: [], reports: [] });
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails(selectedUserId);
    } else {
      setUserDetails({
        materials: [],
        files: [],
        reports: []
      });
    }
  }, [selectedUserId, fetchUserDetails]);

  const toggleStatus = useCallback(async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this user?`)) return;

    const adminId = sessionStorage.getItem('adminId');
    const { error } = await supabase.rpc('admin_moderate_user', { 
      target_user_id: userId, 
      action_type: newStatus === 'suspended' ? 'suspend' : 'activate',
      p_admin_id: adminId
    });
    
    if (error) {
      console.error('Moderation Failure:', error.message);
      alert('Moderation Error: ' + error.message);
      return;
    }

    fetchUsers();
  }, [fetchUsers]);

  const deleteUser = useCallback(async (userId: string, username: string) => {
    if (!confirm(`CRITICAL WARNING:\n\nAre you absolutely sure you want to permanently delete user @${username}?\nThis action cannot be undone.`)) return;

    const adminId = sessionStorage.getItem('adminId');
    const { error } = await supabase.rpc('admin_moderate_user', { 
      target_user_id: userId, 
      action_type: 'delete',
      p_admin_id: adminId
    });
    
    if (error) {
      console.error('Purge Failed:', error.message);
      alert('Moderation Error: ' + error.message);
      return;
    }

    fetchUsers();
  }, [fetchUsers]);

  const exportToCSV = useCallback(async () => {
    if (totalUsers === 0) return;
    
    // Fetch all records for current filter to export
    const { data: exportData } = await supabase.rpc('get_admin_profiles', {
      p_search: debouncedSearch,
      p_filter: filter,
      p_page: 1,
      p_page_size: 1000 // Export limit
    });
    if (!exportData || exportData.length === 0) return;
    
    // Create CSV content
    const headers = ['Full Name', 'Username', 'Email', 'Status', 'Joined Date'];
    const rows = exportData.map((u: any) => [
      u.full_name || '',
      u.username || '',
      u.email || '',
      u.status || '',
      u.created_at ? new Date(u.created_at).toLocaleDateString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `nemesis_users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [debouncedSearch, filter, totalUsers]);

  return (
    <div className="space-y-6 text-slate-900 relative px-4 md:px-0 mobile-hardened">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">User Integrity</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage and moderate platform intelligence assets.</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={exportToCSV}
             className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-600 hover:bg-slate-50 transition shadow-sm uppercase tracking-tighter"
           >
             <Download size={16} /> Export Intel
           </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10">
            <Search size={18} strokeWidth={2.5} />
          </div>
          <input 
            type="text" 
            placeholder="Search by name, username or email..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition placeholder:text-slate-400 font-bold text-sm tracking-tight"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
          {(['all', 'active', 'suspended'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${filter === f ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="p-5">Member Identity</th>
                <th className="p-5">Protocol Status</th>
                <th className="p-5">Drive Intel</th>
                <th className="p-5">Joining Epoch</th>
                <th className="p-5 text-right">Directives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <tr key={i}>
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <Skeleton variant="rectangle" className="w-12 h-12 rounded-2xl" />
                        <div className="space-y-2">
                           <SkeletonLine width="100px" height="14px" />
                           <SkeletonLine width="160px" height="10px" className="opacity-40" />
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <Skeleton variant="rectangle" className="w-[80px] h-[24px] rounded-full" />
                    </td>
                    <td className="p-5">
                      <SkeletonLine width="70px" />
                    </td>
                    <td className="p-5">
                      <SkeletonLine width="90px" />
                    </td>
                    <td className="p-5">
                       <div className="flex justify-end gap-2">
                         <Skeleton variant="rectangle" className="w-[40px] h-[40px] rounded-xl" />
                         <Skeleton variant="rectangle" className="w-[40px] h-[40px] rounded-xl" />
                       </div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-tight">No intelligence matches found.</td></tr>
              ) : users.map(user => !user ? null : (
                <tr 
                  key={user.id} 
                  onClick={() => setSelectedUserId(user.id)}
                  className="hover:bg-slate-50/80 transition cursor-pointer group"
                >
                  <td className="p-5 text-sm uppercase font-black text-[10px] tracking-widest">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                      <UserAvatar 
                        url={user.avatar_url} 
                        name={user.full_name}
                        size="lg"
                        shape="square"
                        ring={true}
                        ringColor="ring-slate-100"
                      />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline(user.last_seen) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 truncate group-hover:text-sky-600 transition-colors uppercase tracking-tight text-sm">
                          {user.full_name}
                        </div>
                        <div className="text-sky-500/60 text-[10px] font-black leading-none mt-1 group-hover:text-sky-500 transition-colors lowercase tracking-normal flex flex-col gap-0.5">
                          <span>@{user.username}</span>
                          <span className="text-slate-400 group-hover:text-sky-400 transition-colors font-medium lowercase italic">{user.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 w-fit text-[10px] font-black uppercase tracking-widest ${
                      user.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {user.status}
                    </span>
                  </td>
                  <td className="p-5">
                    {user.gdrive_backup_status?.valid ? (
                      <div className="flex items-center gap-2 text-sky-500 font-bold text-[10px] uppercase tracking-widest border border-sky-100 bg-sky-50 px-2 py-1 rounded-md w-fit">
                        <Cloud size={14} /> Synced
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-300 font-bold text-[10px] uppercase tracking-widest w-fit">
                        <Cloud size={14} /> Unlinked
                      </div>
                    )}
                  </td>
                  <td className="p-5 text-slate-400 text-xs font-black uppercase tracking-tight">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => toggleStatus(user.id, user.status)}
                      className={`p-2.5 rounded-xl transition ${
                        user.status === 'active' 
                          ? 'text-red-400 hover:bg-red-100 hover:text-red-600' 
                          : 'text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600'
                      }`}
                      title={user.status === 'active' ? 'Impose Suspension' : 'Allow Access'}
                    >
                      {user.status === 'active' ? <UserX size={20} /> : <UserCheck size={20} />}
                    </button>
                    <button 
                       onClick={() => deleteUser(user.id, user.username)}
                       className="p-2.5 rounded-xl text-slate-300 hover:bg-red-100 hover:text-red-600 transition"
                       title="Permanently Purge Intel"
                    >
                      <Trash2 size={20} />
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalUsers > 0 && Math.ceil(totalUsers / ITEMS_PER_PAGE) > 1 && (
            <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between text-sm gap-4">
              <div className="text-slate-500 font-medium text-xs">
                Showing <span className="font-bold text-slate-900">{((page - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-bold text-slate-900">{Math.min(page * ITEMS_PER_PAGE, totalUsers)}</span> of <span className="font-bold text-slate-900">{totalUsers}</span> intelligence profiles
              </div>
              <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl p-1 bg-white shadow-sm overflow-hidden">
                <button 
                  onClick={() => setPage(1)} 
                  disabled={page === 1}
                  title="First Page"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  title="Previous Page"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                
                <div className="flex items-center px-1">
                  {Array.from({ length: Math.ceil(totalUsers / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === Math.ceil(totalUsers / ITEMS_PER_PAGE) || Math.abs(p - page) <= 1)
                    .map((p, i, arr) => (
                      <div key={p} className="flex items-center">
                        {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2 text-slate-300">...</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`min-w-[28px] h-8 flex items-center justify-center rounded-lg text-xs font-black transition ${
                            page === p ? 'bg-sky-500 text-white shadow-md shadow-sky-200 scale-105' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    ))}
                </div>

                <button 
                  onClick={() => setPage(p => Math.min(Math.ceil(totalUsers / ITEMS_PER_PAGE), p + 1))} 
                  disabled={page === Math.ceil(totalUsers / ITEMS_PER_PAGE)}
                  title="Next Page"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
                <button 
                  onClick={() => setPage(Math.ceil(totalUsers / ITEMS_PER_PAGE))} 
                  disabled={page === Math.ceil(totalUsers / ITEMS_PER_PAGE)}
                  title="Last Page"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedUserId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedUserId(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Intelligence Drilldown</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Detailed user metrics and activity logs</p>
                </div>
                <button onClick={() => setSelectedUserId(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              {users.find(u => u.id === selectedUserId) && (
                <div className="p-5 space-y-6">
                  {/* Profile Header */}
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                    <div className="relative">
                      <UserAvatar 
                        url={users.find(u => u.id === selectedUserId)?.avatar_url} 
                        name={users.find(u => u.id === selectedUserId)?.full_name} 
                        size="lg" 
                      />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${isOnline(users.find(u => u.id === selectedUserId)?.last_seen) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">{users.find(u => u.id === selectedUserId)?.full_name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sky-600 font-semibold text-xs">@{users.find(u => u.id === selectedUserId)?.username}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-slate-400 text-[10px] font-medium truncate">{users.find(u => u.id === selectedUserId)?.email}</span>
                      </div>
                      <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white w-fit px-2 py-0.5 rounded-md border border-slate-100">
                        Joined {new Date(users.find(u => u.id === selectedUserId)?.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {(() => {
                      const selUser = users.find(u => u.id === selectedUserId);
                      if (!selUser?.gdrive_quota) return null;
                      
                      const quota = selUser.gdrive_quota;
                      const limit = quota.limit || 15 * 1024 * 1024 * 1024;
                      const usage = quota.usage || 0;
                      const nemesisMetadata = quota.nemesis_usage || 0;
                      const nemesisBlobs = quota.nemesis_blobs_usage || 0;
                      const nemesisTotal = nemesisMetadata + nemesisBlobs;
                      const otherUsage = Math.max(0, usage - nemesisTotal);
                      
                      const nemesisPct = (nemesisTotal / limit) * 100;
                      const otherPct = (otherUsage / limit) * 100;
                      
                      const formatBytes = (bytes: number) => {
                        if (bytes === 0) return '0 B';
                        const k = 1024;
                        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                        const i = Math.floor(Math.log(bytes) / Math.log(k));
                        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                      };

                      const isHealthy = selUser.gdrive_backup_status?.valid;
                      const lastSynced = quota.last_synced ? new Date(quota.last_synced).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Cloud size={14} className="text-sky-500" /> Cloud Analytics
                            </h4>
                            <div className="flex items-center gap-2">
                              {isHealthy ? (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Live
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Sync Error</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Clean Horizontal Bar */}
                          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-slate-700">Storage Distribution</span>
                              <span className="font-medium text-slate-400">{((usage/limit)*100).toFixed(1)}% Capacity Used</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden flex border border-slate-100">
                              <div className="h-full bg-sky-500 transition duration-1000 ease-out" style={{ width: `${nemesisPct}%` }} title={`Nemesis: ${formatBytes(nemesisTotal)}`} />
                              <div className="h-full bg-slate-300 transition duration-1000 ease-out" style={{ width: `${otherPct}%` }} title={`Other: ${formatBytes(otherUsage)}`} />
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-sky-500" />
                                <div className="min-w-0">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nemesis Data</div>
                                  <div className="text-xs font-bold text-slate-800 uppercase">{formatBytes(nemesisTotal)}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                                <div className="min-w-0">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Other Drive Files</div>
                                  <div className="text-xs font-bold text-slate-800 uppercase">{formatBytes(otherUsage)}</div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-medium italic">Last Sync: {lastSynced || 'Never'}</span>
                              <span className="text-[10px] font-bold text-slate-700 uppercase">Limit: {formatBytes(limit)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Compact Manifest */}
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} className="text-sky-500" /> Recent Uploads
                      </h4>
                      <div className="space-y-1.5">
                        {detailsLoading ? (
                           <div className="space-y-3">
                             {[1,2,3].map(i => (
                               <div key={i} className="flex items-center gap-3 p-2.5">
                                 <Skeleton variant="rectangle" className="w-8 h-8 rounded-lg" />
                                 <div className="flex-1 space-y-1.5">
                                   <SkeletonLine width="60%" />
                                   <SkeletonLine width="40%" height="8px" className="opacity-40" />
                                 </div>
                               </div>
                             ))}
                           </div>
                        ) : userDetails?.materials?.length > 0 ? (
                          userDetails.materials.map((m: any) => (
                            <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                                <FileText size={14} />
                              </div>
                               <div className="flex-1 min-w-0">
                                 <div className="text-[11px] font-bold text-slate-800 truncate">{m.title}</div>
                                 <div className="text-[9px] text-slate-400 font-medium capitalize">{m.file_type} • {m.subject}</div>
                               </div>
                               {(m.file_url) && (
                                 <a href={m.file_url} target="_blank" rel="noreferrer" className="p-2 hover:bg-white rounded-xl text-slate-300 hover:text-sky-500 transition-colors group/link">
                                   <ExternalLink size={12} className="group-hover/link:scale-110 transition-transform" />
                                 </a>
                               )}
                             </div>
                           ))
                        ) : (
                          <div className="py-6 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No assets uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Compact Contributions */}
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Folder size={14} className="text-indigo-500" /> Group Contributions
                      </h4>
                      <div className="space-y-1.5">
                        {detailsLoading ? (
                           <div className="space-y-3">
                             {[1,2].map(i => (
                               <div key={i} className="flex items-center gap-3 p-2.5">
                                 <Skeleton variant="rectangle" className="w-8 h-8 rounded-lg" />
                                 <div className="flex-1 space-y-1.5">
                                   <SkeletonLine width="60%" />
                                   <SkeletonLine width="40%" height="8px" className="opacity-40" />
                                 </div>
                               </div>
                             ))}
                           </div>
                        ) : userDetails?.files?.length > 0 ? (
                          userDetails.files.map((f: any) => (
                            <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Folder size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-slate-800 truncate">{f.file_name}</div>
                                <div className="text-[9px] text-indigo-500 font-bold">In {f.groups?.name || 'Group'}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-6 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No group activity</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Compact History */}
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-500" /> Behavioral History
                      </h4>
                      <div className="space-y-2">
                         {detailsLoading ? (
                            <div className="space-y-2 p-3">
                              <SkeletonLine width="100%" height="48px" className="rounded-xl opacity-20" />
                            </div>
                         ) : userDetails?.reports?.length > 0 ? (
                           userDetails.reports.map((r: any) => {
                             const isInbound = r.target_id === selectedUserId;
                             return (
                               <div key={r.id} className={`p-3 rounded-xl border ${
                                 isInbound ? 'bg-red-50/30 border-red-100' : 'bg-slate-50/50 border-slate-100'
                               }`}>
                                 <div className="flex items-center justify-between mb-1">
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                      isInbound ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'
                                    }`}>{isInbound ? 'Inbound' : 'Outbound'}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">{new Date(r.created_at).toLocaleDateString()}</span>
                                 </div>
                                 <div className="text-[11px] font-bold text-slate-800 truncate">Flagged {r.target_type}</div>
                                 <div className="text-[10px] text-slate-500 italic mt-0.5 leading-snug truncate">"{r.reason}"</div>
                               </div>
                             );
                           })
                         ) : (
                           <div className="py-8 text-center bg-emerald-50/20 rounded-2xl border border-dashed border-emerald-200 flex flex-col items-center">
                             <UserCheck size={18} className="text-emerald-500 mb-1" />
                             <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Clear Integrity Record</p>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
