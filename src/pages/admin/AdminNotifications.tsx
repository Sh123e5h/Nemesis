import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, Send, Search, RefreshCw, Users, UserCheck, Clock } from 'lucide-react';

export default function AdminNotifications() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState<'send' | 'templates' | 'history'>('send');
  const [history, setHistory] = useState<any[]>([]);
  const [sendForm, setSendForm] = useState({ target: 'all', title: '', content: '', type: 'info', userSearch: '', selectedUsers: [] as string[], templateId: '' });
  const [sendEmail, setSendEmail] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_notifications_suite');
      if (error) throw error;
      
      if (data) {
        if (data.templates) setTemplates(data.templates);
        if (data.users) setUsers(data.users);
        if (data.history) setHistory(data.history);
      }
    } catch (err: any) {
      console.error('[AdminNotifications] Sync failure:', err.message);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const applyTemplate = useCallback((templateId: string) => {
    const t = templates.find(tm => tm.id === templateId);
    if (t) {
      setSendForm(prev => ({ ...prev, title: t.subject, content: t.body, type: t.type, templateId }));
    }
  }, [templates]);

  const sendNotification = useCallback(async () => {
    if (!sendForm.title.trim() || !sendForm.content.trim()) return;
    setSending(true);

    let targetUsers: any[] = [];
    if (sendForm.target === 'all') {
      targetUsers = users;
    } else if (sendForm.target === 'inactive') {
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase.from('profiles').select('id, email, full_name, username').lt('last_seen', cutoff);
      targetUsers = data || [];
    } else if (sendForm.target === 'new') {
      const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase.from('profiles').select('id, email, full_name, username').gte('created_at', cutoff);
      targetUsers = data || [];
    } else {
      targetUsers = users.filter(u => sendForm.selectedUsers.includes(u.id));
    }

    if (targetUsers.length === 0) { alert('No users to notify.'); setSending(false); return; }

    const adminId = sessionStorage.getItem('adminId');
    const userIds = targetUsers.map(u => u.id);
    const userEmails = targetUsers.map(u => u.email).filter(Boolean);
    
    try {
      // 1. Send In-App Notifications
      const { error } = await supabase.rpc('admin_send_notifications', {
        p_user_ids: userIds,
        p_title: sendForm.title,
        p_content: sendForm.content,
        p_type: sendForm.type,
        p_admin_id: adminId,
        p_target_desc: sendForm.target
      });

      if (error) throw error;

      // 2. Send Emails if enabled
      if (sendEmail && userEmails.length > 0) {
        console.log(`[Admin] Triggering email dispatch for ${userEmails.length} users...`);
        for (const userEmail of userEmails) {
          const { error: mailError } = await supabase.functions.invoke('moderation-mailer-v2', {
            body: {
              email: userEmail,
              type: 'admin_notification',
              title: sendForm.title,
              content: sendForm.content
            }
          });
          if (mailError) console.warn(`[Admin] Mail dispatch warning for ${userEmail}:`, mailError);
        }
      }
      
      alert(`📨 Notification sent to ${targetUsers.length} users${sendEmail ? ' (including Email)' : ''}!`);
      setSendForm({ target: 'all', title: '', content: '', type: 'info', userSearch: '', selectedUsers: [], templateId: '' });
      fetchAll();
    } catch (err: any) {
      console.error('Notification Failure:', err.message);
      alert('Communication Error: ' + err.message);
    } finally {
      setSending(false);
    }
  }, [sendForm, users, sendEmail, fetchAll]);

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(sendForm.userSearch.toLowerCase()) || u.username?.toLowerCase().includes(sendForm.userSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Bell size={28} className="text-orange-500" /> Notification Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Send targeted notifications, manage templates.</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm w-fit">
        {(['send', 'templates', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition ${tab === t ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:bg-slate-50'}`}>{t}</button>
        ))}
      </div>

      {tab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Compose Notification</h3>
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-xs font-bold text-slate-500 group-hover:text-orange-500 transition-colors uppercase">Also send as Email</span>
                <div 
                  onClick={() => setSendEmail(!sendEmail)}
                  className={`w-10 h-5 rounded-full p-1 transition-colors ${sendEmail ? 'bg-orange-500' : 'bg-slate-200'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${sendEmail ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Use Template</label>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={sendForm.templateId} onChange={e => applyTemplate(e.target.value)}>
                <option value="">— Custom Message —</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Title</label>
              <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" placeholder="Notification title..." value={sendForm.title} onChange={e => setSendForm({ ...sendForm, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Message</label>
              <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none" rows={4} placeholder="Write message..." value={sendForm.content} onChange={e => setSendForm({ ...sendForm, content: e.target.value })} />
            </div>
            <div className="flex gap-2">
              {(['info', 'warning', 'critical'] as const).map(t => (
                <button key={t} type="button" onClick={() => setSendForm({ ...sendForm, type: t })} className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border-2 transition ${sendForm.type === t ? (t === 'info' ? 'bg-sky-100 text-sky-700 border-sky-300' : t === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-red-100 text-red-700 border-red-300') : 'bg-white text-slate-400 border-slate-200'}`}>{t}</button>
              ))}
            </div>

            <button onClick={sendNotification} disabled={sending || !sendForm.title || !sendForm.content} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
            <h3 className="font-bold text-slate-900">Target Audience</h3>
            <div className="space-y-2">
              {[
                { id: 'all', label: 'All Users', icon: Users, desc: `${users.length} users` },
                { id: 'inactive', label: 'Inactive (30d+)', icon: Clock, desc: 'Dormant users' },
                { id: 'new', label: 'New Users (7d)', icon: UserCheck, desc: 'Recent signups' },
                { id: 'custom', label: 'Custom Selection', icon: Search, desc: 'Pick specific users' },
              ].map(tg => (
                <button key={tg.id} onClick={() => setSendForm({ ...sendForm, target: tg.id })} className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition ${sendForm.target === tg.id ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <tg.icon size={18} />
                  <div>
                    <div className="text-sm font-bold">{tg.label}</div>
                    <div className="text-[10px] text-slate-400">{tg.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {sendForm.target === 'custom' && (
              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors z-10">
                    <Search size={16} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition font-medium" 
                    value={sendForm.userSearch} 
                    onChange={e => setSendForm({ ...sendForm, userSearch: e.target.value })} 
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredUsers.slice(0, 20).map(u => (
                    <label key={u.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm">
                      <input type="checkbox" checked={sendForm.selectedUsers.includes(u.id)} onChange={e => {
                        setSendForm({ ...sendForm, selectedUsers: e.target.checked ? [...sendForm.selectedUsers, u.id] : sendForm.selectedUsers.filter(id => id !== u.id) });
                      }} className="rounded" />
                      <span className="font-medium">{u.full_name}</span>
                      <span className="text-xs text-slate-400">@{u.username}</span>
                    </label>
                  ))}
                </div>
                {sendForm.selectedUsers.length > 0 && <p className="text-xs font-bold text-orange-500">{sendForm.selectedUsers.length} user(s) selected</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900 capitalize">{t.name.replace(/_/g, ' ')}</h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.type === 'warning' ? 'bg-amber-100 text-amber-700' : t.type === 'critical' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'}`}>{t.type}</span>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">{t.subject}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{t.body}</p>
              {t.variables?.length > 0 && (
                <div className="mt-3 flex gap-1 flex-wrap">
                  {t.variables.map((v: string) => <span key={v} className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded text-[10px] font-mono">{`{{${v}}}`}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="p-4">User</th><th className="p-4">Title</th><th className="p-4">Type</th><th className="p-4">Status</th><th className="p-4">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {history.map(n => (
                <tr key={n.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 font-medium">{n.full_name || 'Unknown'}</td>
                  <td className="p-4 text-slate-700 truncate max-w-xs">{n.title}</td>
                  <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${n.type === 'warning' ? 'bg-amber-100 text-amber-700' : n.type === 'critical' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'}`}>{n.type}</span></td>
                  <td className="p-4"><span className={`text-[10px] font-bold uppercase ${n.is_read ? 'text-emerald-500' : 'text-slate-400'}`}>{n.is_read ? '✓ Read' : 'Unread'}</span></td>
                  <td className="p-4 text-xs text-slate-500">{new Date(n.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
