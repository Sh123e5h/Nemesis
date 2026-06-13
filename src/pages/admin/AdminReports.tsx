import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { FileBarChart, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, Calendar, Clock, Download, X } from 'lucide-react';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../../components/Skeleton';

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', report_type: 'weekly_summary', frequency: 'weekly' });
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_reports');
      if (error) throw error;
      if (data) setReports(data);
    } catch (err: any) {
      console.error('[AdminReports] Neural sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const createReport = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { error } = await supabase.rpc('admin_manage_report', {
        p_action: 'create',
        p_name: form.name,
        p_report_type: form.report_type,
        p_frequency: form.frequency,
        p_admin_id: adminId
      });

      if (error) throw error;

      setForm({ name: '', report_type: 'weekly_summary', frequency: 'weekly' });
      setShowCreate(false);
      fetchReports();
    } catch (err: any) {
      alert('Scheduling failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [form, fetchReports]);

  const toggleReport = useCallback(async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.rpc('admin_manage_report', {
        p_action: 'toggle',
        p_id: id,
        p_is_active: current
      });
      if (error) throw error;
      fetchReports();
    } catch (err: any) {
      console.error('[AdminReports] Toggle failure:', err.message);
    }
  }, [fetchReports]);

  const deleteReport = useCallback(async (id: string) => {
    if (!confirm('Delete this report schedule?')) return;
    try {
      const { error } = await supabase.rpc('admin_manage_report', {
        p_action: 'delete',
        p_id: id
      });
      if (error) throw error;
      fetchReports();
    } catch (err: any) {
      alert('Deletion failure: ' + err.message);
    }
  }, [fetchReports]);

  const generateNow = useCallback(async (report: any) => {
    setGeneratingId(report.id);
    try {
      const { data: vitals, error } = await supabase.rpc('admin_generate_report_vitals');
      if (error) throw error;

      // Dynamic CSV Generation: Map database keys to human-readable labels
      const labelMap: Record<string, string> = {
        total_users: 'Total Users',
        active_users_24h: 'Active Users (24h)',
        active_users_7d: 'Active Users (7d)',
        new_signups_7d: 'New Signups (7d)',
        total_materials: 'Total Materials',
        new_materials_7d: 'New Materials (7d)',
        total_groups: 'Total Groups',
        total_files: 'Total Files',
        total_tasks: 'Total Tasks',
        completed_tasks: 'Completed Tasks',
        task_completion_rate: 'Task Completion Rate (%)',
        total_messages: 'Total Messages',
        engagement_index: 'Engagement Index (Msg/User)',
        total_points_awarded: 'Total Points Awarded',
        badges_awarded: 'Badges Awarded',
        total_polls: 'Total Polls',
        total_whiteboards: 'Total Whiteboards',
        total_sessions: 'Total Study Sessions',
        total_focus_hours: 'Total Focus Hours',
        storage_usage_mb: 'Storage Usage (MB)',
        database_size_mb: 'Database Size (MB)',
        open_reports: 'Open Moderation Reports',
        pending_tickets: 'Pending Support Tickets',
        generated_at: 'Report Timestamp'
      };

      const rows = Object.entries(vitals).map(([key, value]) => {
        const label = labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `${label},${value}`;
      });

      const csv = `Metric,Value\n${rows.join('\n')}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `nemesis_report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      await supabase.rpc('admin_manage_report', {
        p_action: 'log_run',
        p_id: report.id
      });
      
      fetchReports();
    } catch (err: any) {
      alert('Extraction failed: ' + err.message);
    } finally {
      setGeneratingId(null);
    }
  }, [fetchReports]);

  const getTypeColor = (t: string) => t === 'daily_digest' ? 'bg-sky-100 text-sky-700' : t === 'weekly_summary' ? 'bg-violet-100 text-violet-700' : t === 'monthly_executive' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FileBarChart size={28} className="text-violet-500" /> Scheduled Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Automated platform digests and report generation.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-violet-500 text-white px-4 py-2.5 rounded-xl hover:bg-violet-600 transition font-medium text-sm shadow-sm"><Plus size={18} /> New Report</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Reports', value: reports.length, icon: FileBarChart, g: 'from-violet-500 to-purple-600' },
          { label: 'Active', value: reports.filter(r => r.is_active).length, icon: Calendar, g: 'from-emerald-500 to-green-600' },
          { label: 'Generated', value: reports.filter(r => r.last_run_at).length, icon: Clock, g: 'from-sky-500 to-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 bg-gradient-to-br ${s.g} rounded-xl flex items-center justify-center`}><s.icon size={22} className="text-white" /></div>
            <div><h3 className="text-xl font-black text-slate-900">{s.value}</h3><p className="text-xs text-slate-400 font-bold uppercase">{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <SkeletonCircle size={28} />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <SkeletonLine width="120px" height="14px" />
                      <Skeleton variant="rectangle" className="w-[80px] h-[18px] rounded-full" />
                      <Skeleton variant="rectangle" className="w-[60px] h-[18px] rounded-full" />
                    </div>
                    <SkeletonLine width="200px" height="10px" className="opacity-40" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton variant="rectangle" className="w-[80px] h-[32px] rounded-lg" />
                  <SkeletonCircle size={24} />
                </div>
              </div>
            </div>
          ))
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-20 text-center"><FileBarChart size={48} className="mx-auto text-slate-200 mb-4" /><p className="text-slate-400">No reports scheduled yet.</p></div>
        ) : reports.map(r => (
          <div key={r.id} className={`bg-white rounded-2xl shadow-sm border p-5 transition ${r.is_active ? 'border-violet-200' : 'border-slate-100 opacity-60'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <button onClick={() => toggleReport(r.id, r.is_active)} className={r.is_active ? 'text-violet-500' : 'text-slate-300'}>{r.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}</button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{r.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getTypeColor(r.report_type)}`}>{r.report_type.replace(/_/g, ' ')}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase">{r.frequency}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex gap-3">
                    {r.last_run_at && <span>Last: {new Date(r.last_run_at).toLocaleDateString()}</span>}
                    {r.next_run_at && <span>Next: {new Date(r.next_run_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => generateNow(r)} disabled={generatingId === r.id} className="px-3 py-1.5 bg-violet-50 text-violet-600 rounded-lg text-xs font-bold border border-violet-100 hover:bg-violet-100 transition flex items-center gap-1.5 disabled:opacity-50">
                  {generatingId === r.id ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />} Generate
                </button>
                <button onClick={() => deleteReport(r.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900">Schedule Report</h2>
              <button onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>
            <form onSubmit={createReport} className="p-6 space-y-4">
              <input type="text" required placeholder="Report Name" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={form.report_type} onChange={e => setForm({ ...form, report_type: e.target.value })}>
                <option value="daily_digest">Daily Digest</option>
                <option value="weekly_summary">Weekly Summary</option>
                <option value="monthly_executive">Monthly Executive</option>
              </select>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <button type="submit" disabled={saving} className="w-full py-3 bg-violet-500 text-white rounded-xl font-bold text-sm hover:bg-violet-600 transition disabled:opacity-50">{saving ? 'Creating...' : 'Schedule Report'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
