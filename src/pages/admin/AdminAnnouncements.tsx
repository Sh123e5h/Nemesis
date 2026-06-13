import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Megaphone, Plus, Trash2, X, AlertTriangle, Info, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../../components/Skeleton';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  is_active: boolean;
  created_at: string;
  admin_id: string;
  admin_users?: { email: string };
}

export default function AdminAnnouncements() {
  // Declare all state hooks BEFORE any useCallback or other hooks
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info' as 'info' | 'warning' | 'critical' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_manage_announcement', { p_action: 'fetch' });
      if (rpcError) throw rpcError;
      if (data) setAnnouncements(data);
    } catch (err: any) {
      console.error('[AdminAnnouncements] Failed to fetch:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const createAnnouncement = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    setSubmitting(true);
    setError('');
    
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { error: rpcError } = await supabase.rpc('admin_broadcast_announcement', {
        p_title: form.title.trim(),
        p_content: form.message.trim(),
        p_type: form.type,
        p_admin_id: adminId
      });

      if (rpcError) throw rpcError;

      setForm({ title: '', message: '', type: 'info' });
      setShowCreate(false);
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [form, fetchAnnouncements]);

  const toggleActive = useCallback(async (id: string, currentState: boolean) => {
    const adminId = sessionStorage.getItem('adminId');
    await supabase.rpc('admin_manage_announcement', {
      p_action: 'toggle',
      p_id: id,
      p_is_active: currentState,
      p_admin_id: adminId
    });
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const deleteAnnouncement = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this announcement?')) return;
    const adminId = sessionStorage.getItem('adminId');
    await supabase.rpc('admin_manage_announcement', {
      p_action: 'delete',
      p_id: id,
      p_admin_id: adminId
    });
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'warning': return { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle, dot: 'bg-amber-500' };
      case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle, dot: 'bg-red-500' };
      default: return { bg: 'bg-sky-100', text: 'text-sky-700', icon: Info, dot: 'bg-sky-500' };
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="text-sky-500" size={24} /> Platform Announcements
          </h1>
          <p className="text-slate-500 text-sm mt-1">Broadcast messages to all users on the platform.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2.5 rounded-xl hover:bg-sky-600 transition font-medium shadow-sm"
        >
          <Plus size={18} /> New Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 flex items-start gap-4">
               <Skeleton variant="rectangle" className="w-10 h-10 rounded-xl" />
               <div className="flex-1 space-y-2">
                 <div className="flex items-center gap-2">
                   <SkeletonLine width="120px" height="14px" />
                   <Skeleton variant="rectangle" className="w-[60px] h-[18px] rounded-full" />
                 </div>
                 <SkeletonLine width="100%" height="10px" />
                 <SkeletonLine width="80%" height="10px" />
                 <div className="flex items-center gap-3 pt-2">
                    <SkeletonLine width="140px" height="8px" className="opacity-40" />
                 </div>
               </div>
               <div className="flex gap-1">
                  <SkeletonCircle size={18} />
                  <SkeletonCircle size={18} />
               </div>
            </div>
          ))
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100 shadow-sm ring-4 ring-white">
              <Megaphone size={36} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No announcements yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-2">Create your first announcement to broadcast to all users. It will appear directly on their platform dashboards.</p>
          </div>
        ) : (
          announcements.map(a => {
            const style = getTypeStyle(a.type);
            const Icon = style.icon;
            return (
              <div key={a.id} className={`bg-white rounded-xl border shadow-sm p-5 flex items-start gap-4 transition ${a.is_active ? 'border-slate-100' : 'border-slate-200 opacity-50'}`}>
                <div className={`${style.bg} ${style.text} p-2.5 rounded-xl shrink-0`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{a.title}</h3>
                    <span className={`${style.bg} ${style.text} text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider`}>
                      {a.type}
                    </span>
                    {!a.is_active && (
                      <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-2 leading-relaxed">{a.message}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>By {a.admin_users?.email || 'Unknown'}</span>
                    <span>•</span>
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(a.id, a.is_active)}
                    className={`p-2 rounded-lg transition ${a.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}
                    title={a.is_active ? 'Disable' : 'Enable'}
                  >
                    {a.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button
                    onClick={() => deleteAnnouncement(a.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><Megaphone size={20} className="text-sky-500" /> New Announcement</h2>
              <button onClick={() => { setShowCreate(false); setError(''); }} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={createAnnouncement} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input 
                  type="text" required
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. Scheduled Maintenance"
                  value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea 
                  required rows={4}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
                  placeholder="Write the announcement message..."
                  value={form.message} onChange={e => setForm({...form, message: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                <div className="flex gap-2">
                  {(['info', 'warning', 'critical'] as const).map(t => {
                    const s = getTypeStyle(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({...form, type: t})}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition capitalize ${
                          form.type === t 
                            ? `${s.bg} ${s.text} border-current` 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setError(''); }} className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition font-medium disabled:opacity-50 flex items-center gap-2">
                  <Megaphone size={16} /> {submitting ? 'Broadcasting...' : 'Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
