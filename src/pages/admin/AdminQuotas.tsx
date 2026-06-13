import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Gauge, RefreshCw, Save, AlertTriangle, Users, HardDrive, Zap, Shield } from 'lucide-react';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../../components/Skeleton';

export default function AdminQuotas() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quotas, setQuotas] = useState({ max_file_size_mb: 50, max_materials_per_user: 100, max_groups_per_user: 10, max_group_members: 50, max_messages_per_day: 500, storage_quota_mb: 500 });
  const [usage, setUsage] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_quotas_suite');
      if (error) throw error;
      
      if (data) {
        if (data.config) setQuotas(data.config);
        if (data.usage) setUsage(data.usage);
      }
    } catch (err: any) {
      console.error('[AdminQuotas] Sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveQuotas = useCallback(async () => {
    setSaving(true);
    try {
      const adminId = sessionStorage.getItem('adminId');
      const { error } = await supabase.rpc('admin_save_system_setting', {
        p_key: 'quota_config',
        p_value: quotas as any,
        p_admin_id: adminId
      });

      if (error) throw error;
      alert('Quotas saved and audited successfully!');
    } catch (err: any) {
      alert('Quota sync failure: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [quotas]);

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <SkeletonLine width="180px" height="2rem" />
          <SkeletonLine width="260px" height="0.875rem" />
        </div>
        <Skeleton variant="rectangle" className="w-[124px] h-[40px] rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div className="flex items-center gap-2">
               <SkeletonCircle size={18} />
               <SkeletonLine width="100px" />
            </div>
            <Skeleton variant="rectangle" className="h-[48px] w-full rounded-xl opacity-20" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <SkeletonLine width="150px" />
          <SkeletonCircle size={16} />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
               <div className="space-y-1">
                 <SkeletonLine width="120px" />
                 <SkeletonLine width="80px" height="10px" />
               </div>
               <SkeletonLine width="60px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Gauge size={28} className="text-sky-500" /> Quotas & Limits</h1>
          <p className="text-sm text-slate-500 mt-0.5">Per-user quotas, rate limits, and usage monitoring.</p>
        </div>
        <button onClick={saveQuotas} disabled={saving} className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2.5 rounded-xl hover:bg-sky-600 transition font-medium text-sm shadow-sm disabled:opacity-50">
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Save Quotas
        </button>
      </div>

      {/* Quota Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { key: 'max_file_size_mb', label: 'Max File Size', unit: 'MB', icon: HardDrive, color: 'text-indigo-500' },
          { key: 'max_materials_per_user', label: 'Max Materials / User', unit: '', icon: Zap, color: 'text-violet-500' },
          { key: 'max_groups_per_user', label: 'Max Groups / User', unit: '', icon: Users, color: 'text-sky-500' },
          { key: 'max_group_members', label: 'Max Group Members', unit: '', icon: Users, color: 'text-emerald-500' },
          { key: 'max_messages_per_day', label: 'Max Messages / Day', unit: '', icon: Shield, color: 'text-amber-500' },
          { key: 'storage_quota_mb', label: 'Storage Quota / User', unit: 'MB', icon: HardDrive, color: 'text-rose-500' },
        ].map(q => (
          <div key={q.key} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <q.icon size={18} className={q.color} />
              <span className="text-sm font-bold text-slate-700">{q.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min={0} value={(quotas as any)[q.key]} onChange={e => setQuotas({ ...quotas, [q.key]: parseInt(e.target.value) || 0 })} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-900 text-center outline-none focus:ring-2 focus:ring-sky-500/20" />
              {q.unit && <span className="text-sm font-bold text-slate-400">{q.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Usage Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">User Usage Overview</h2>
          <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-sky-500 transition"><RefreshCw size={16} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="p-4">User</th><th className="p-4 text-center">Materials</th><th className="p-4 text-center">Files</th><th className="p-4 text-center">Groups</th><th className="p-4 text-center">Messages</th><th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {usage.map(u => {
                const nearLimit = u.materials >= quotas.max_materials_per_user * 0.8 || u.groups >= quotas.max_groups_per_user * 0.8;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4"><div className="font-bold text-slate-900">{u.full_name}</div><div className="text-xs text-slate-400">@{u.username}</div></td>
                    <td className="p-4 text-center"><span className={`font-bold ${u.materials >= quotas.max_materials_per_user ? 'text-red-600' : 'text-slate-700'}`}>{u.materials}</span><span className="text-slate-300 text-xs">/{quotas.max_materials_per_user}</span></td>
                    <td className="p-4 text-center font-bold text-slate-700">{u.files}</td>
                    <td className="p-4 text-center"><span className={`font-bold ${u.groups >= quotas.max_groups_per_user ? 'text-red-600' : 'text-slate-700'}`}>{u.groups}</span><span className="text-slate-300 text-xs">/{quotas.max_groups_per_user}</span></td>
                    <td className="p-4 text-center font-bold text-slate-700">{u.messages}</td>
                    <td className="p-4 text-center">{nearLimit ? <span className="flex items-center justify-center gap-1 text-amber-500 text-xs font-bold"><AlertTriangle size={12} /> Near Limit</span> : <span className="text-emerald-500 text-xs font-bold">Normal</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
