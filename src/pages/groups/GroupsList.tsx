import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { Hash, Search, Plus, Users } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { useDataStore } from '../../store/useDataStore';
import SEO from '../../components/SEO';
import GroupListItem from '../../components/groups/GroupListItem';
import { motion, AnimatePresence } from 'framer-motion';

// Redundant local Group interface removed as data is now managed via useDataStore

export default function GroupsList() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { groups, fetchGroups: syncGroups, lastFetched } = useDataStore();
  const loading = lastFetched.groups === 0;
  const [searchQuery, setSearchQuery] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const [createData, setCreateData] = useState({ name: '', description: '', isPrivate: false });
  const [joinCode, setJoinCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchGroups = useCallback(async (force = false) => {
    if (!user) return;
    await syncGroups(user.id, force);
  }, [user, syncGroups]);

  useEffect(() => {
    if (!user) return;
    fetchGroups();

    const handleSync = (e: any) => {
      const { table } = e.detail;
      if (table === 'groups' || table === 'group_members') {
        fetchGroups(true);
      }
    };

    window.addEventListener('nemesis_sync', handleSync);

    return () => {
      window.removeEventListener('nemesis_sync', handleSync);
    };
  }, [user, fetchGroups]);


  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setActionLoading(true);
    setError('');

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: createData.name,
        description: createData.description,
        created_by: user.id,
        is_private: createData.isPrivate
      })
      .select()
      .single();

    if (groupError) {
      setError(groupError.message);
      setActionLoading(false);
      return;
    }

    if (groupData) {
      await supabase.from('group_members').insert({
        group_id: groupData.id,
        user_id: user.id,
        role: 'admin'
      });

      setShowCreate(false);
      setCreateData({ name: '', description: '', isPrivate: false });
      fetchGroups();
    }
    setActionLoading(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setActionLoading(true);
    setError('');

    const { data: targetGroupId, error: joinError } = await supabase.rpc('join_group_by_code', {
      code_param: joinCode.toUpperCase()
    });

    if (joinError) {
      setError(joinError.message || 'Failed to join group.');
      setActionLoading(false);
      return;
    }

    await supabase.from('messages').insert({
      group_id: targetGroupId,
      sender_id: user.id,
      content: `[System] Joined the group via invite code`
    });

    setShowJoin(false);
    setJoinCode('');
    fetchGroups();
    navigate(`/groups/${targetGroupId}`);
    setActionLoading(false);
  };

  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="px-4 pt-2 md:p-8 max-w-5xl mx-auto flex flex-col items-stretch justify-start w-full flex-1 min-h-0 overflow-hidden">
      <SEO 
        title="Group Spaces" 
        description="Collaborate with your peers in private or public group spaces. Share files, plan tasks, and chat in real-time."
      />
      <div className="flex flex-row justify-between items-center mb-4 md:mb-6 shrink-0">
        <h1 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 tracking-tight leading-tight truncate">Group Spaces</h1>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => { setError(''); setShowJoin(true); }}
            className="w-10 h-10 flex items-center justify-center bg-white/40 dark:bg-slate-800/40 cyberpunk:bg-emerald-950/40 backdrop-blur-md border border-slate-200 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 text-slate-700 dark:text-slate-300 cyberpunk:text-emerald-400 font-bold hover:border-sky-300 dark:hover:border-slate-500 cyberpunk:hover:border-emerald-400 transition sm:w-auto sm:px-4 sm:py-2 rounded-xl"
          >
            <Hash size={18} /> <span className="hidden sm:inline ml-2 text-sm">Join</span>
          </button>
          <button 
            onClick={() => { setError(''); setShowCreate(true); }}
            className="w-10 h-10 flex items-center justify-center bg-sky-500 text-white font-bold transition shadow-sm hover:bg-sky-600 cyberpunk:bg-emerald-600 cyberpunk:hover:bg-emerald-700 sm:w-auto sm:px-4 sm:py-2 rounded-xl"
          >
            <Plus size={20} /> <span className="hidden sm:inline ml-2 text-sm">Create</span>
          </button>
        </div>
      </div>

      <div className="relative mb-4 md:mb-8 shrink-0 group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-600/80 group-focus-within:text-sky-500 dark:group-focus-within:text-sky-400 cyberpunk:group-focus-within:text-emerald-400 transition-colors z-10 pointer-events-none">
          <Search size={16} />
        </div>
        <input 
          type="text" 
          placeholder="Search group spaces..." 
          className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950/40 backdrop-blur-md border border-slate-200 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 dark:focus:border-sky-400 cyberpunk:focus:border-emerald-400 text-xs md:text-sm text-slate-900 dark:text-white cyberpunk:text-emerald-300 transition"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-6 min-h-0">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white/80 dark:bg-slate-800/40 cyberpunk:bg-emerald-950/40 backdrop-blur-xl p-4 md:p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 flex flex-col gap-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <Skeleton variant="rectangle" className="w-11 h-11 md:w-14 md:h-14 rounded-xl shrink-0 bg-slate-100 dark:bg-slate-700 cyberpunk:bg-emerald-900/50" />
                  <div className="flex-1 space-y-2.5">
                     <Skeleton variant="text" className="w-4/5 h-4 md:h-5 rounded bg-slate-100 dark:bg-slate-700 cyberpunk:bg-emerald-900/50" />
                     <Skeleton variant="text" className="w-2/5 h-3 rounded bg-slate-100 dark:bg-slate-700 cyberpunk:bg-emerald-900/50 opacity-60" />
                  </div>
                </div>
                <div className="space-y-2">
                   <Skeleton variant="text" className="w-full h-3 rounded bg-slate-100 dark:bg-slate-700 cyberpunk:bg-emerald-900/50 opacity-40" />
                   <Skeleton variant="text" className="w-2/3 h-3 rounded bg-slate-100 dark:bg-slate-700 cyberpunk:bg-emerald-900/50 opacity-40" />
                </div>
              </div>
            ))}
          </div>
        ) : groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
          <div className="text-center bg-white/80 dark:bg-slate-800/40 cyberpunk:bg-emerald-950/40 backdrop-blur-xl p-10 md:p-12 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 h-full flex flex-col justify-center">
            <Users className="mx-auto text-sky-200 dark:text-slate-600 cyberpunk:text-emerald-700 mb-4 opacity-50" size={40} />
            <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 mb-1">No groups found</h3>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500/70">Try a different search query.</p>
          </div>
        ) : (
            <motion.div variants={containerVars} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {groups
                .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(group => (
                  <GroupListItem key={group.id} group={group} variants={itemVars} />
              ))}
            </motion.div>
        )}
      </div>
      {/* Create Modal */}
      {createPortal(
        <AnimatePresence>
          {showCreate && (
            <div 
              key="create-modal-overlay"
              className="modal-overlay pb-[calc(1rem+env(safe-area-inset-bottom,0px))]" 
              onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
            >
              <motion.div 
                key="create-modal-content"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white/90 dark:bg-slate-900/90 cyberpunk:bg-emerald-950/90 backdrop-blur-2xl rounded-3xl shadow-2xl w-[92%] max-w-md p-6 md:p-8 border border-white/40 dark:border-slate-700/50 cyberpunk:border-emerald-500/30"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 mb-2">Create Group Space</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500/80 mb-6 font-medium">Coordinate, collab, and sync in a secure environment.</p>
                
                {error && <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-6 font-semibold">{error}</div>}
                
                <form onSubmit={handleCreate} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-600 uppercase tracking-widest ml-1">Group Name</label>
                    <input 
                      type="text" required placeholder="e.g. Thesis Research"
                      className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950/50 border border-slate-200 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 rounded-2xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 dark:focus:border-sky-400 cyberpunk:focus:border-emerald-400 focus:outline-none transition placeholder:text-slate-300 dark:placeholder:text-slate-600 cyberpunk:placeholder:text-emerald-900 font-medium text-slate-900 dark:text-white cyberpunk:text-emerald-300"
                      value={createData.name} onChange={e => setCreateData({...createData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-600 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      placeholder="Briefly describe the focus of this group..."
                      className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950/50 border border-slate-200 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 rounded-2xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 dark:focus:border-sky-400 cyberpunk:focus:border-emerald-400 focus:outline-none transition h-24 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600 cyberpunk:placeholder:text-emerald-900 font-medium text-slate-900 dark:text-white cyberpunk:text-emerald-300"
                      value={createData.description} onChange={e => setCreateData({...createData, description: e.target.value})}
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group/toggle p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cyberpunk:hover:bg-emerald-900/20 rounded-xl transition-colors">
                    <div className="relative w-10 h-6">
                      <input 
                        type="checkbox" className="sr-only peer"
                        checked={createData.isPrivate} 
                        onChange={e => setCreateData({...createData, isPrivate: e.target.checked})}
                      />
                      <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 cyberpunk:bg-emerald-900/50 rounded-full peer peer-checked:bg-sky-500 transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition peer-checked:after:translate-x-4"></div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 cyberpunk:text-emerald-400 tracking-tight">Make Private <span className="text-[10px] text-slate-400 dark:text-slate-500 opacity-80">(Invite Only)</span></span>
                  </label>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100/60 dark:border-slate-800/60 cyberpunk:border-emerald-500/20 mt-6">
                    <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition">Cancel</button>
                    <button type="submit" disabled={actionLoading} className="px-7 py-2.5 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/25 hover:bg-sky-600 cyberpunk:bg-emerald-600 cyberpunk:hover:bg-emerald-700 disabled:opacity-50 transition active:scale-95">
                      {actionLoading ? 'Creating...' : 'Create Space'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Join Modal */}
      {createPortal(
        <AnimatePresence>
          {showJoin && (
            <div 
              key="join-modal-overlay"
              className="modal-overlay pb-[calc(1rem+env(safe-area-inset-bottom,0px))]" 
              onClick={(e) => e.target === e.currentTarget && setShowJoin(false)}
            >
              <motion.div 
                key="join-modal-content"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white/90 dark:bg-slate-900/90 cyberpunk:bg-emerald-950/90 backdrop-blur-2xl rounded-3xl shadow-2xl w-[92%] max-w-sm p-6 md:p-8 border border-white/40 dark:border-slate-700/50 cyberpunk:border-emerald-500/30"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 mb-2 text-center">Join Group Space</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500/80 mb-8 text-center font-medium">Enter the 6-character invite code provided by the group organizer.</p>
                
                {error && <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-6 font-semibold text-center">{error}</div>}
                
                <form onSubmit={handleJoin} className="space-y-6">
                  <div className="relative">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-slate-100 dark:bg-slate-800 cyberpunk:bg-emerald-900/30" />
                    <input 
                      type="text" required maxLength={6} placeholder="INVITE CODE"
                      className="relative w-full p-4 bg-white/80 dark:bg-slate-800/80 cyberpunk:bg-emerald-950/40 border-2 border-slate-200 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 rounded-2xl font-mono text-xl md:text-2xl tracking-[0.4em] uppercase focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 dark:focus:border-sky-400 cyberpunk:focus:border-emerald-400 focus:outline-none transition text-center font-black placeholder:text-slate-200 dark:placeholder:text-slate-700 cyberpunk:placeholder:text-emerald-900 z-10 text-slate-900 dark:text-white cyberpunk:text-emerald-300"
                      value={joinCode} onChange={e => setJoinCode(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-3 pt-2">
                    <button type="submit" disabled={actionLoading} className="w-full py-4 bg-sky-500 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-lg shadow-sky-500/25 hover:bg-sky-600 cyberpunk:bg-emerald-600 cyberpunk:hover:bg-emerald-700 disabled:opacity-50 transition active:scale-[0.98]">
                      {actionLoading ? 'Verifying...' : 'Join Group Space'}
                    </button>
                    <button type="button" onClick={() => setShowJoin(false)} className="w-full py-3 text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-700 font-bold hover:text-slate-600 dark:hover:text-slate-300 transition text-sm">Dismiss</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
