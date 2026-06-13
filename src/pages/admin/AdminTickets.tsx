import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Ticket, Search, RefreshCw, MessageSquare, ChevronRight, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../../components/Skeleton';

export default function AdminTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_tickets', {
        p_filter: filter,
        p_search: search
      });
      if (error) throw error;
      if (data) setTickets(data);
    } catch (err: any) {
      console.error('[AdminTickets] Retrieval failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const fetchReplies = useCallback(async (ticketId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_get_ticket_replies', {
        p_ticket_id: ticketId
      });
      if (error) throw error;
      if (data) setReplies(data);
    } catch (err: any) {
      console.error('[AdminTickets] Reply sync failure:', err.message);
    }
  }, []);

  const selectTicket = useCallback(async (ticket: any) => {
    setSelectedTicket(ticket);
    await fetchReplies(ticket.id);
  }, [fetchReplies]);

  const updateStatus = useCallback(async (ticketId: string, status: string) => {
    const adminId = sessionStorage.getItem('adminId');
    try {
      const { error } = await supabase.rpc('admin_manage_ticket', {
        p_action: 'status',
        p_ticket_id: ticketId,
        p_status: status,
        p_admin_id: adminId
      });
      if (error) throw error;
      fetchTickets();
      if (selectedTicket?.id === ticketId) setSelectedTicket((prev: any) => prev ? { ...prev, status } : null);
    } catch (err: any) {
      alert('Lifecycle update failure: ' + err.message);
    }
  }, [fetchTickets, selectedTicket]);

  const sendReply = useCallback(async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { error } = await supabase.rpc('admin_manage_ticket', {
        p_action: 'reply',
        p_ticket_id: selectedTicket.id,
        p_message: replyText.trim(),
        p_admin_id: adminId
      });

      if (error) throw error;

      if (selectedTicket.status === 'open') {
        setSelectedTicket((prev: any) => prev ? { ...prev, status: 'in_progress' } : null);
        fetchTickets();
      }

      setReplyText('');
      fetchReplies(selectedTicket.id);
    } catch (err: any) {
      alert('Communication failure: ' + err.message);
    } finally {
      setSending(false);
    }
  }, [replyText, selectedTicket, fetchTickets, fetchReplies]);

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'medium': return 'bg-sky-100 text-sky-700 border-sky-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'open': return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'in_progress': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'resolved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'closed': return 'bg-slate-50 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  return (
    <div className="space-y-6 text-slate-900 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Ticket size={28} className="text-rose-500" /> Support Tickets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage user feedback, bug reports, and support requests.</p>
        </div>
        <div className="flex items-center gap-3">
          {(['open', 'in_progress', 'resolved'] as const).map(s => (
            <div key={s} className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase ${getStatusStyle(s)}`}>
              {s.replace('_', ' ')} <span className="ml-1 font-mono">{counts[s]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
          <input type="text" placeholder="Search tickets..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition ${filter === f ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:bg-slate-50'}`}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="p-5">Ticket</th>
                <th className="p-5">Reporter</th>
                <th className="p-5">Priority</th>
                <th className="p-5">Status</th>
                <th className="p-5">Created</th>
                <th className="p-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td className="p-5">
                      <div className="space-y-2">
                         <SkeletonLine width="180px" height="14px" />
                         <SkeletonLine width="240px" height="10px" className="opacity-40" />
                         <Skeleton variant="rectangle" className="w-[60px] h-[18px] rounded mt-1" />
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="space-y-2">
                         <SkeletonLine width="100px" height="14px" />
                         <SkeletonLine width="60px" height="10px" className="opacity-40" />
                      </div>
                    </td>
                    <td className="p-5">
                       <Skeleton variant="rectangle" className="w-[70px] h-[24px] rounded-lg" />
                    </td>
                    <td className="p-5">
                       <Skeleton variant="rectangle" className="w-[80px] h-[24px] rounded-lg" />
                    </td>
                    <td className="p-5">
                       <SkeletonLine width="80px" />
                    </td>
                    <td className="p-5 text-right">
                       <SkeletonCircle size={18} />
                    </td>
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-bold">No tickets found.</td></tr>
              ) : tickets.map(t => (
                <tr key={t.id} onClick={() => selectTicket(t)} className="hover:bg-slate-50/80 transition cursor-pointer group">
                  <td className="p-5">
                    <div className="font-bold text-slate-900 group-hover:text-rose-600 transition">{t.subject}</div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{t.description}</div>
                    <div className="mt-1"><span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{t.category}</span></div>
                  </td>
                  <td className="p-5">
                    <div className="font-medium">{t.profiles?.full_name || 'Unknown'}</div>
                    <div className="text-xs text-slate-400">@{t.profiles?.username}</div>
                  </td>
                  <td className="p-5"><span className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase ${getPriorityStyle(t.priority)}`}>{t.priority}</span></td>
                  <td className="p-5"><span className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase ${getStatusStyle(t.status)}`}>{t.status.replace('_', ' ')}</span></td>
                  <td className="p-5 text-slate-500 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="p-5 text-right"><ChevronRight size={18} className="text-slate-300 group-hover:text-rose-500 transition inline" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Drawer */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTicket(null)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md">
                <h2 className="text-lg font-black text-slate-900 truncate pr-4">{selectedTicket.subject}</h2>
                <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-100 rounded-xl transition"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-lg border text-xs font-black uppercase ${getPriorityStyle(selectedTicket.priority)}`}>{selectedTicket.priority}</span>
                  <span className={`px-3 py-1 rounded-lg border text-xs font-black uppercase ${getStatusStyle(selectedTicket.status)}`}>{selectedTicket.status.replace('_', ' ')}</span>
                  <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 uppercase">{selectedTicket.category}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-3">
                    {selectedTicket.profiles?.avatar_url ? (
                      <img src={selectedTicket.profiles.avatar_url} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 font-bold flex items-center justify-center">{selectedTicket.profiles?.full_name?.charAt(0) || '?'}</div>
                    )}
                    <div>
                      <div className="font-bold text-slate-900">{selectedTicket.profiles?.full_name}</div>
                      <div className="text-xs text-slate-400">@{selectedTicket.profiles?.username}</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedTicket.description}</p>
                  <div className="text-[10px] text-slate-400 mt-3">{new Date(selectedTicket.created_at).toLocaleString()}</div>
                </div>

                {/* Status Update */}
                <div className="flex gap-2">
                  {(['open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                    <button key={s} onClick={() => updateStatus(selectedTicket.id, s)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition ${selectedTicket.status === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Replies Thread */}
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MessageSquare size={14} /> Conversation</h4>
                  <div className="space-y-3">
                    {replies.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">No replies yet.</p>}
                    {replies.map(r => (
                      <div key={r.id} className={`p-3 rounded-xl text-sm ${r.sender_type === 'admin' ? 'bg-sky-50 border border-sky-100 ml-6' : 'bg-slate-50 border border-slate-100 mr-6'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase ${r.sender_type === 'admin' ? 'text-sky-600' : 'text-slate-500'}`}>
                            {r.sender_type === 'admin' ? `🛡️ ${r.sender_display_name || 'Admin'}` : `👤 ${r.sender_display_name || 'User'}`}
                          </span>
                          <span className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{r.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reply Input */}
              <div className="p-4 border-t border-slate-100 shrink-0 bg-white">
                <div className="flex gap-2">
                  <input type="text" placeholder="Type a reply..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20" value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()} />
                  <button onClick={sendReply} disabled={sending || !replyText.trim()} className="px-4 py-3 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition disabled:opacity-50">
                    {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
