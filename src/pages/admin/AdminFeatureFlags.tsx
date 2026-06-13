import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Flag, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, Search, Settings, Users, Percent, X, Save } from 'lucide-react';

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  created_at: string;
  admin: {
    email: string;
  } | null;
}

export default function AdminFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [form, setForm] = useState({ name: '', description: '', enabled: false, rollout_percentage: 100 });
  const [saving, setSaving] = useState(false);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_feature_flags', {
        p_search: search
      });
      if (error) throw error;
      if (data) setFlags(data as unknown as FeatureFlag[]);
    } catch (err: any) {
      console.error('[AdminFeatureFlags] Neural sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const createFlag = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { error } = await supabase.rpc('admin_manage_feature_flag', {
        p_action: 'create',
        p_name: form.name,
        p_description: form.description,
        p_enabled: form.enabled,
        p_rollout_percentage: form.rollout_percentage,
        p_admin_id: adminId
      });

      if (error) throw error;

      setForm({ name: '', description: '', enabled: false, rollout_percentage: 100 });
      setShowCreate(false);
      fetchFlags();
    } catch (err: any) {
      alert('Rollout failure: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [form, fetchFlags]);

  const toggleFlag = useCallback(async (id: string, current: boolean) => {
    const adminId = sessionStorage.getItem('adminId');
    try {
      const { error } = await supabase.rpc('admin_manage_feature_flag', {
        p_action: 'toggle',
        p_id: id,
        p_enabled: current,
        p_admin_id: adminId
      });
      if (error) throw error;
      fetchFlags();
    } catch (err: any) {
      console.error('[AdminFeatureFlags] Toggle failure:', err.message);
    }
  }, [fetchFlags]);


  const deleteFlag = useCallback(async (id: string) => {
    if (!confirm('Delete this feature flag permanently?')) return;
    const adminId = sessionStorage.getItem('adminId');
    try {
      const { error } = await supabase.rpc('admin_manage_feature_flag', {
        p_action: 'delete',
        p_id: id,
        p_admin_id: adminId
      });
      if (error) throw error;
      fetchFlags();
    } catch (err: any) {
      alert('Deletion failure: ' + err.message);
    }
  }, [fetchFlags]);

  const saveEdit = useCallback(async () => {
    if (!editingFlag) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_manage_feature_flag', {
        p_action: 'update',
        p_id: editingFlag.id,
        p_name: editingFlag.name,
        p_description: editingFlag.description,
        p_rollout_percentage: editingFlag.rollout_percentage,
        p_admin_id: sessionStorage.getItem('adminId')
      });

      if (error) throw error;

      setEditingFlag(null);
      fetchFlags();
    } catch (err: any) {
      alert('Update sync failure: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [editingFlag, fetchFlags]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Flag size={28} className="text-teal-500" /> Feature Flags</h1>
          <p className="text-sm text-slate-500 mt-0.5">Control features without deployments. Roll out gradually.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
            <input type="text" placeholder="Search flags..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none w-56" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2.5 rounded-xl hover:bg-teal-600 transition font-medium text-sm shadow-sm">
            <Plus size={18} /> New Flag
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={createFlag} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h3 className="font-bold text-slate-900">Create Feature Flag</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" required placeholder="flag_name (snake_case)" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s/g, '_') })} />
            <input type="text" placeholder="Description" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} className="rounded" />
              <span className="text-sm font-medium">Enabled on create</span>
            </label>
            <div className="flex items-center gap-2">
              <Percent size={14} className="text-slate-400" />
              <input type="number" min={0} max={100} value={form.rollout_percentage} onChange={e => setForm({ ...form, rollout_percentage: parseInt(e.target.value) || 0 })} className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
              <span className="text-xs text-slate-400">rollout</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-teal-500 text-white rounded-xl font-medium text-sm hover:bg-teal-600 transition disabled:opacity-50">{saving ? 'Creating...' : 'Create Flag'}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Flags List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-20 text-center"><RefreshCw className="animate-spin h-8 w-8 text-teal-500 mx-auto mb-4" /><p className="text-slate-400 font-bold">Loading flags...</p></div>
        ) : flags.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-20 text-center"><Flag size={48} className="mx-auto text-slate-200 mb-4" /><p className="text-slate-400 font-medium">No feature flags yet.</p></div>
        ) : flags.map(f => (
          <div key={f.id} className={`bg-white rounded-2xl shadow-sm border p-5 transition ${f.enabled ? 'border-teal-200' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <button onClick={() => toggleFlag(f.id, f.enabled)} className={`p-2 rounded-xl transition ${f.enabled ? 'text-teal-500 hover:bg-teal-50' : 'text-slate-300 hover:bg-slate-50'}`}>
                  {f.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-bold text-slate-900 text-sm">{f.name}</code>
                    {f.enabled && <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-black uppercase rounded-full">Active</span>}
                  </div>
                  {f.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{f.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                  <Users size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">{f.rollout_percentage}%</span>
                </div>
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition" style={{ width: `${f.rollout_percentage}%` }} />
                </div>
                <button onClick={() => setEditingFlag({ ...f })} className="p-2 text-slate-400 hover:text-teal-500 hover:bg-teal-50 rounded-xl transition"><Settings size={16} /></button>
                <button onClick={() => deleteFlag(f.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingFlag && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900">Edit Feature Flag</h2>
              <button onClick={() => setEditingFlag(null)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Flag Name</label>
                <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={editingFlag.name} onChange={e => setEditingFlag({ ...editingFlag, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none" rows={2} value={editingFlag.description || ''} onChange={e => setEditingFlag({ ...editingFlag, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Rollout Percentage</label>
                <input type="range" min={0} max={100} value={editingFlag.rollout_percentage} onChange={e => setEditingFlag({ ...editingFlag, rollout_percentage: parseInt(e.target.value) })} className="w-full accent-teal-500" />
                <div className="text-sm font-bold text-teal-600 text-center mt-1">{editingFlag.rollout_percentage}%</div>
              </div>
              <button onClick={saveEdit} disabled={saving} className="w-full py-3 bg-teal-500 text-white rounded-xl font-bold text-sm hover:bg-teal-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
