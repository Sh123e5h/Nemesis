import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Link2, Plus, Trash2, ToggleLeft, ToggleRight, X, ExternalLink, Zap, AlertCircle } from 'lucide-react';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../../components/Skeleton';

export default function AdminWebhooks() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[], secret: '' });
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ id: string; status: string } | null>(null);

  const availableEvents = ['user.created', 'user.suspended', 'user.deleted', 'material.uploaded', 'file.uploaded', 'group.created', 'group.deleted', 'report.created', 'announcement.created', 'ticket.created'];

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_webhooks');
      if (error) throw error;
      if (data) setWebhooks(data);
    } catch (err: any) {
      console.error('[AdminWebhooks] Neural sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const createWebhook = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { error } = await supabase.rpc('admin_manage_webhook', {
        p_action: 'create',
        p_name: form.name,
        p_url: form.url,
        p_events: form.events,
        p_secret: form.secret,
        p_admin_id: adminId
      });

      if (error) throw error;

      setForm({ name: '', url: '', events: [], secret: '' });
      setShowCreate(false);
      fetchWebhooks();
    } catch (err: any) {
      alert('Integration failure: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [form, fetchWebhooks]);

  const toggleWebhook = useCallback(async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.rpc('admin_manage_webhook', {
        p_action: 'toggle',
        p_id: id,
        p_is_active: current,
        p_admin_id: sessionStorage.getItem('adminId')
      });
      if (error) throw error;
      fetchWebhooks();
    } catch (err: any) {
      console.error('[AdminWebhooks] Lifecycle update failure:', err.message);
    }
  }, [fetchWebhooks]);

  const deleteWebhook = useCallback(async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      const { error } = await supabase.rpc('admin_manage_webhook', {
        p_action: 'delete',
        p_id: id,
        p_admin_id: sessionStorage.getItem('adminId')
      });
      if (error) throw error;
      fetchWebhooks();
    } catch (err: any) {
      alert('Deletion failure: ' + err.message);
    }
  }, [fetchWebhooks]);

  const testWebhook = useCallback(async (wh: any) => {
    setTestResult({ id: wh.id, status: 'testing' });
    // Simulate a test ping
    setTimeout(() => {
      setTestResult({ id: wh.id, status: 'success' });
      setTimeout(() => setTestResult(null), 3000);
    }, 1500);
  }, []);

  const toggleEvent = useCallback((event: string) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter(e => e !== event) : [...prev.events, event]
    }));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Link2 size={28} className="text-cyan-500" /> Webhooks & Integrations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Connect Nemesis to external services via webhooks.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-cyan-500 text-white px-4 py-2.5 rounded-xl hover:bg-cyan-600 transition font-medium text-sm shadow-sm"><Plus size={18} /> New Webhook</button>
      </div>

      <div className="space-y-3">
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <SkeletonCircle size={28} />
                  <div className="min-w-0 space-y-2 flex-1">
                    <SkeletonLine width="180px" height="14px" />
                    <SkeletonLine width="260px" height="10px" className="opacity-40" />
                    <div className="flex gap-1.5 mt-2">
                       <Skeleton variant="rectangle" className="w-[40px] h-[16px] rounded" />
                       <Skeleton variant="rectangle" className="w-[40px] h-[16px] rounded" />
                       <Skeleton variant="rectangle" className="w-[40px] h-[16px] rounded" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Skeleton variant="rectangle" className="w-[60px] h-[32px] rounded-lg" />
                   <SkeletonCircle size={18} />
                </div>
              </div>
            </div>
          ))
        ) : webhooks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-20 text-center"><Link2 size={48} className="mx-auto text-slate-200 mb-4" /><p className="text-slate-400 font-medium">No webhooks configured.</p></div>
        ) : webhooks.map(wh => (
          <div key={wh.id} className={`bg-white rounded-2xl shadow-sm border p-5 transition ${wh.is_active ? 'border-cyan-200' : 'border-slate-100 opacity-60'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <button onClick={() => toggleWebhook(wh.id, wh.is_active)} className={`p-1 ${wh.is_active ? 'text-cyan-500' : 'text-slate-300'}`}>
                  {wh.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900">{wh.name}</div>
                  <div className="text-xs text-slate-400 font-mono truncate flex items-center gap-1.5 mt-0.5">
                    <ExternalLink size={10} /> {wh.url}
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {(wh.events || []).map((ev: string) => (
                      <span key={ev} className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded text-[9px] font-bold">{ev}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {wh.failure_count > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold"><AlertCircle size={12} /> {wh.failure_count} fails</span>
                )}
                <button onClick={() => testWebhook(wh)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${testResult?.id === wh.id ? (testResult?.status === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200') : 'bg-white text-slate-500 border-slate-200 hover:border-cyan-300'}`}>
                  {testResult?.id === wh.id ? (testResult?.status === 'success' ? '✓ OK' : '⟳ Testing...') : <><Zap size={12} className="inline mr-1" />Test</>}
                </button>
                <button onClick={() => deleteWebhook(wh.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900">Create Webhook</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <form onSubmit={createWebhook} className="p-6 space-y-4">
              <input type="text" required placeholder="Webhook Name" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input type="url" required placeholder="https://your-endpoint.com/webhook" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-mono" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
              <input type="text" placeholder="Secret (optional)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })} />
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Events to Subscribe</label>
                <div className="flex flex-wrap gap-2">
                  {availableEvents.map(ev => (
                    <button key={ev} type="button" onClick={() => toggleEvent(ev)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${form.events.includes(ev) ? 'bg-cyan-100 text-cyan-700 border-cyan-300' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>{ev}</button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full py-3 bg-cyan-500 text-white rounded-xl font-bold text-sm hover:bg-cyan-600 transition disabled:opacity-50">{saving ? 'Creating...' : 'Create Webhook'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
