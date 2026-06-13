import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Search, Filter, Calendar, Clock, User, ArrowRight, RefreshCw, Download } from 'lucide-react';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../../components/Skeleton';

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [pulseData, setPulseData] = useState<number[]>([]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const adminId = sessionStorage.getItem('adminId');
      const { data, error: rpcError } = await supabase.rpc('admin_get_audit_logs', {
        p_admin_id: adminId,
        p_limit: 100,
        p_offset: 0,
        p_action: filterAction,
        p_admin_email: filterAdmin,
        p_start_date: dateRange.start ? new Date(dateRange.start).toISOString() : null,
        p_end_date: dateRange.end ? new Date(dateRange.end).toISOString() : null
      });

      if (rpcError) throw rpcError;

      if (data) {
        setLogs(data);
        
        // Generate Pulse Data (Log volume for last 12 hours)
        const counts = Array(12).fill(0);
        const now = Date.now();
        data.forEach((log: any) => {
          const hoursAgo = Math.floor((now - new Date(log.created_at).getTime()) / (1000 * 60 * 60));
          if (hoursAgo < 12) counts[11 - hoursAgo]++;
        });
        setPulseData(counts);
      }
    } catch (err: any) {
      console.error('Log sync failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterAdmin, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
 
  const exportIntel = useCallback(() => {
    if (logs.length === 0) return;
    
    const headers = ['Action', 'Admin Email', 'Target Type', 'Target ID', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.action,
        log.admin_email,
        log.target_type,
        log.target_id || '',
        log.created_at
      ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nemesis_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [logs]);

  const getLogTypeColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('PURGE')) return 'bg-red-50 text-red-600 border-red-100';
    if (action.includes('MAINTENANCE') || action.includes('SUSPEND')) return 'bg-amber-50 text-amber-600 border-amber-100';
    if (action.includes('ENABLED') || action.includes('PASSWORD')) return 'bg-sky-50 text-sky-600 border-sky-100';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity size={24} className="text-sky-500" /> System Audit Logs
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track administrative actions and security events.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-600 hover:bg-slate-50 transition shadow-sm uppercase tracking-tighter"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync Logs
          </button>
          <button 
            onClick={exportIntel}
            disabled={loading || logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-600 hover:bg-slate-50 transition shadow-sm uppercase tracking-tighter disabled:opacity-50"
          >
            <Download size={16} /> Export Intel
          </button>
        </div>
        
        {/* Quick Stats / Pulse */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">System Pulse (12h)</div>
            <div className="flex items-end gap-1 h-8">
              {pulseData.map((v, i) => (
                <div 
                  key={i} 
                  className="w-2 bg-sky-200 rounded-t-sm transition duration-500"
                  style={{ height: `${Math.max((v / Math.max(...pulseData, 1)) * 100, 10)}%` }}
                />
              ))}
            </div>
          </div>
          <div className="h-10 w-px bg-slate-100" />
          <div>
            <div className="text-2xl font-bold text-slate-900">{logs.length}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Matches Found</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
            value={filterAction} onChange={e => setFilterAction(e.target.value)}
          >
            <option value="all">All Action Types</option>
            <option value="MAINTENANCE_ENABLED">Maintenance Mode</option>
            <option value="USER_STATUS_UPDATED">User Status</option>
            <option value="PASSWORD_CHANGED">Password Changes</option>
            <option value="MATERIAL_DELETED">Content Removal</option>
            <option value="INFRA_LIMITS_UPDATED">Infra Limits</option>
          </select>
        </div>

        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by Admin Email..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
            value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)}
          />
        </div>

        <div className="relative md:col-span-2 flex items-center gap-2">
          <Calendar className="text-slate-400 shrink-0" size={16} />
          <input 
            type="date" 
            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
            value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
          />
          <ArrowRight size={14} className="text-slate-300" />
          <input 
            type="date" 
            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
            value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-4">Admin Session</th>
                <th className="p-4">Event Action</th>
                <th className="p-4">Targeting</th>
                <th className="p-4">Executed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <tr key={i}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton variant="rectangle" className="w-8 h-8 rounded-lg" />
                        <div className="space-y-1.5">
                           <SkeletonLine width="120px" height="12px" />
                           <SkeletonLine width="60px" height="8px" className="opacity-40" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                       <Skeleton variant="rectangle" className="w-[100px] h-[20px] rounded-lg" />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                         <SkeletonLine width="60px" />
                         <Skeleton variant="rectangle" className="w-[50px] h-[16px] rounded" />
                      </div>
                    </td>
                    <td className="p-4">
                       <div className="flex items-center gap-1.5">
                         <SkeletonCircle size={14} />
                         <SkeletonLine width="80px" />
                       </div>
                    </td>
                  </tr>
                ))
              ) : logs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs uppercase group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                        {l.admin_email?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{l.admin_email}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{l.id.split('-')[0]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 border rounded-lg text-[10px] font-black uppercase tracking-tight ${getLogTypeColor(l.action)}`}>
                      {l.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       <span className="text-slate-500 capitalize font-medium">
                         {l.target_username ? `@${l.target_username}` : l.target_type}
                       </span>
                       {l.target_id && (
                         <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded text-[10px] font-mono border border-slate-100">
                           #{l.target_id.slice(-6)}
                         </span>
                       )}
                    </div>
                  </td>
                  <td className="p-4 text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock size={14} className="text-slate-300" />
                      {new Date(l.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && logs.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Search size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No logs match your filter criteria.</p>
              <button 
                onClick={() => { setFilterAction('all'); setFilterAdmin(''); setDateRange({ start: '', end: '' }); }}
                className="mt-2 text-sky-500 text-sm font-bold hover:underline"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
