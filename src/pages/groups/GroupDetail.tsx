import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useDataStore } from '../../store/useDataStore';
import { ChevronLeft, FileText, Folder, Calendar, MessageCircle, Users, Settings, X, AlertTriangle, Trash2, Camera, Upload, Palette } from 'lucide-react';

import clsx from 'clsx';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // ⚡ INSTANT PAINT: Seed from store cache so header renders immediately
  // without waiting for the network fetch to complete.
  const cachedGroup = useDataStore.getState().groups.find(g => g.id === groupId) ?? null;

  const [group, setGroup] = useState<any>(cachedGroup);
  const [role, setRole] = useState<string>('');
  // Skip the initial skeleton flash if we already have cached group data
  const [isInitialLoad, setIsInitialLoad] = useState(!cachedGroup);
  
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState(cachedGroup?.name ?? '');
  const [editDescription, setEditDescription] = useState(cachedGroup?.description ?? '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const fetchGroupData = useCallback(async () => {
    if (!user || !groupId) return;
    
    // Parallelize membership and group metadata fetching
    const [memberRes, groupRes] = await Promise.all([
      supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).maybeSingle(),
      supabase.from('groups').select('*').eq('id', groupId).single()
    ]);

    if (memberRes.error || !memberRes.data) {
      navigate('/groups');
      return;
    }

    setRole(memberRes.data.role);

    if (groupRes.data) {
      setGroup(groupRes.data);
      setEditName(groupRes.data.name);
      setEditDescription(groupRes.data.description || '');
    }
    
    setIsInitialLoad(false);
  }, [user, groupId, navigate]);

  useEffect(() => {
    if (!user || !groupId) return;
    fetchGroupData();

    // Realtime subscription for group info
    const channel = supabase.channel(`group-detail-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` }, fetchGroupData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` }, fetchGroupData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, user, fetchGroupData]);


  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !group) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);

    try {
      const { uploadSmart } = await import('../../lib/storage');
      const { url: publicUrl } = await uploadSmart(file, 'avatars');

      // Update group record
      const { error } = await supabase.from('groups').update({ avatar_url: publicUrl }).eq('id', group.id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      setGroup({ ...group, avatar_url: publicUrl });
    } catch (err: any) {
      alert("Failed to upload image: " + (err.message || 'Unknown error'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Only show the full-screen pulse on the very first load when we have no data
  if (isInitialLoad && !group) return (
    <div className="flex flex-col h-[calc(100vh-64px)] animate-pulse">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="w-32 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="w-full h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="w-2/3 h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    </div>
  );

  if (!group) return null;

  const tabs = [
    { name: 'Materials', path: `/groups/${groupId}`, icon: FileText, exact: true },
    { name: 'Files', path: `/groups/${groupId}/files`, icon: Folder, exact: false },
    { name: 'Planner', path: `/groups/${groupId}/planner`, icon: Calendar, exact: false },
    { name: 'Chat', path: `/groups/${groupId}/chat`, icon: MessageCircle, exact: false },
    { name: 'Whiteboard', path: `/groups/${groupId}/whiteboard`, icon: Palette, exact: false },
    { name: 'Members', path: `/groups/${groupId}/members`, icon: Users, exact: false }

  ];

  const isChatTab = location.pathname.endsWith('/chat');

  return (
    <div className="flex-1 flex flex-col md:h-[calc(100vh-80px)] md:max-h-[calc(100vh-80px)] md:overflow-hidden items-stretch transition-all duration-500 mobile-hardened">
      {/* Header */}
      <div className={clsx(
        "bg-white/80 md:bg-white/60 dark:bg-slate-900/80 dark:md:bg-slate-900/60 cyberpunk:bg-emerald-950/80 cyberpunk:md:bg-emerald-950/60 backdrop-blur-xl border-b border-slate-200/60 md:border-slate-200/30 dark:border-slate-800/60 cyberpunk:border-emerald-500/20 shrink-0 z-10 transition-all duration-300",
        isChatTab ? "px-2 py-0.5 md:p-6" : "px-3 py-1 md:p-6"
      )}>
        <div className="max-w-5xl mx-auto">
          <div className={clsx(
            "flex items-center gap-2 md:gap-4 transition-all duration-300",
            isChatTab ? "mb-0.5 md:mb-2" : "mb-1 md:mb-4"
          )}>
            <Link to="/groups" className="p-1.5 text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500 hover:text-sky-500 dark:hover:text-sky-400 cyberpunk:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 cyberpunk:bg-emerald-900/20 rounded-full transition shrink-0">
              <ChevronLeft size={18} className="md:w-6 md:h-6" />
            </Link>
            
            {/* Conditional Avatar: Hide on mobile when chatting to save vertical space */}
            {(!isChatTab) && (
              group.avatar_url ? (
                <img src={group.avatar_url} alt={group.name} className="w-9 h-9 md:w-12 md:h-12 rounded-lg object-cover border border-slate-200/60 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 shrink-0 bg-white dark:bg-slate-800" />
              ) : (
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-sky-100 dark:bg-slate-800 cyberpunk:bg-emerald-900/20 text-sky-600 dark:text-sky-400 cyberpunk:text-emerald-500 flex items-center justify-center font-bold text-base md:text-xl border border-sky-200/60 dark:border-slate-700 shrink-0">
                  {group.name.charAt(0).toUpperCase()}
                </div>
              )
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className={clsx(
                  "font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 leading-none truncate transition-all",
                  isChatTab ? "text-sm md:text-2xl" : "text-base md:text-2xl"
                )}>{group.name}</h1>
                {role === 'admin' && (
                  <button 
                    onClick={() => setShowSettings(true)} 
                    className="text-slate-400 hover:text-slate-700 p-1 transition"
                  >
                    <Settings size={14} className="md:w-[18px] md:h-[18px]" />
                  </button>
                )}
              </div>
              
              {/* Conditional Meta: Only show on desktop or if not in Chat tab */}
              {(!isChatTab) && (
                <div className="hidden md:flex items-center gap-1.5 text-xs mt-1">
                  <span className="capitalize px-1.5 py-0.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded font-bold border border-sky-100 dark:border-sky-500/20 uppercase tracking-tighter leading-none">
                    {role}
                  </span>
                  {group.is_private && (
                    <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded font-bold border border-amber-100 dark:border-amber-500/20 uppercase tracking-tighter leading-none">
                      Private
                    </span>
                  )}
                </div>
              )}
              {/* Show role badge in mini-header only on desktop or when not chatting */}
              {!isChatTab && (
                <div className="flex md:hidden items-center gap-1 text-[8px] mt-0.5">
                   <span className="capitalize px-1 py-0.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-sm font-bold border border-sky-100 dark:border-sky-500/20 uppercase tracking-tighter leading-none">{role}</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs - Modern Scrollable Pills for Mobile */}
          <div className="md:flex md:justify-between md:items-center md:gap-1 flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-1.5 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0">
            {tabs.map(tab => {
              const isActive = tab.exact 
                ? location.pathname === tab.path 
                : location.pathname.startsWith(tab.path);
              const Icon = tab.icon;
              
              return (
                <Link
                  key={tab.name}
                  to={tab.path}
                  title={tab.name}
                  className={clsx(
                    "flex items-center transition-all duration-500 font-bold uppercase tracking-widest h-9 md:h-10 min-w-0 justify-center snap-center flex-none md:flex-1",
                    isActive 
                      ? "md:flex-[2] bg-sky-500 text-white cyberpunk:bg-emerald-500 cyberpunk:text-black shadow-lg shadow-sky-200/50 dark:shadow-sky-900/20 cyberpunk:shadow-emerald-500/40 px-4 md:px-4 gap-2 rounded-full md:rounded-xl" 
                      : "text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500/80 hover:bg-slate-100 dark:hover:bg-slate-800 cyberpunk:hover:bg-emerald-900/20 hover:text-slate-900 dark:hover:text-white cyberpunk:hover:text-emerald-400 px-4 md:px-0 rounded-full md:rounded-xl border border-slate-200/50 dark:border-slate-800/50 md:border-transparent md:dark:border-transparent"
                  )}
                >
                  <Icon size={isActive ? 16 : 18} className={clsx("shrink-0 transition-all", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} /> 
                  <span className={clsx(
                    "text-[10px] md:text-xs transition-all duration-300 origin-left whitespace-nowrap",
                    isActive ? "opacity-100 ml-2" : "opacity-100 ml-2 md:opacity-0 md:hidden lg:block lg:opacity-100"
                  )}>
                    {tab.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-0 md:p-8 bg-slate-50/30 dark:bg-transparent overflow-hidden">
        <div className="max-w-5xl mx-auto h-full flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col">
            <Outlet context={{ group, role }} />
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && role === 'admin' && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="bg-white dark:bg-slate-900 cyberpunk:bg-emerald-950 rounded-3xl shadow-2xl w-full max-w-[340px] overflow-hidden flex flex-col relative z-[1001] animate-in fade-in zoom-in duration-200 max-h-[85vh] border dark:border-slate-800 cyberpunk:border-emerald-500/20">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 cyberpunk:bg-emerald-950 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Settings className="text-slate-600 dark:text-slate-400 cyberpunk:text-emerald-500" size={16} />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 tracking-tight">Group Settings</h2>
              </div>
              <button 
                onClick={() => setShowSettings(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar scroll-smooth pb-8">
              <div className="flex flex-col items-center">
                <div className="relative group/avatar cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  {group.avatar_url ? (
                    <img src={group.avatar_url} alt="Group Icon" className="w-16 h-16 rounded-xl object-cover border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm transition group-hover/avatar:opacity-75" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-sky-50 dark:bg-slate-800 border-2 border-dashed border-sky-200 dark:border-slate-700 text-sky-500 dark:text-sky-400 flex flex-col items-center justify-center transition group-hover/avatar:bg-sky-100 dark:group-hover/avatar:bg-slate-700">
                      <Camera size={20} className="mb-0.5 opacity-50" />
                      <span className="text-[8px] uppercase font-bold tracking-wider opacity-50">Icon</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition">
                    <Upload className="text-white" size={16} />
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={avatarInputRef}
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
                <button 
                  onClick={() => avatarInputRef.current?.click()}
                  className="mt-2 text-xs font-bold text-sky-600 hover:text-sky-700 transition uppercase tracking-widest"
                  disabled={uploadingAvatar}
                >
                  Change Icon
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-900 dark:text-slate-300 cyberpunk:text-emerald-500 uppercase tracking-[0.2em] mb-4">Configure Group</label>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-900 dark:text-slate-400 cyberpunk:text-emerald-600 uppercase tracking-widest mb-1.5 px-0.5">Group Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700/60 cyberpunk:border-emerald-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950/50 text-slate-900 dark:text-white cyberpunk:text-emerald-300 font-medium transition"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-900 dark:text-slate-400 cyberpunk:text-emerald-600 uppercase tracking-widest mb-1.5 px-0.5">Description</label>
                    <textarea 
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700/60 cyberpunk:border-emerald-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950/50 text-slate-900 dark:text-white cyberpunk:text-emerald-300 min-h-[100px] font-medium transition"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="What is this group about?"
                    />
                  </div>
                  <div className="flex justify-end mt-1">
                    <button 
                      onClick={async () => {
                        if (!editName.trim()) return;
                        const updates = { 
                          name: editName.trim(),
                          description: editDescription.trim() || null
                        };
                        await supabase.from('groups').update(updates).eq('id', group.id);
                        setGroup({ ...group, ...updates });
                        setShowSettings(false);
                      }}
                      className="px-6 py-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 font-bold uppercase tracking-widest text-[10px] transition disabled:opacity-50 shadow-md shadow-sky-200"
                      disabled={!editName.trim() || (editName === group.name && editDescription === (group.description || ''))}
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 cyberpunk:border-emerald-500/20">
                <h3 className="text-[9px] font-bold text-red-500 uppercase tracking-[0.2em] mb-2 px-0.5 flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-red-500" /> Danger zone
                </h3>
                <button 
                  onClick={async () => {
                    const confirm = window.confirm(`Are you absolutely sure you want to permanently delete "${group.name}"?`);
                    if (confirm) {
                      await supabase.from('groups').delete().eq('id', group.id);
                      navigate('/groups');
                    }
                  }}
                  className="w-full flex justify-center items-center gap-3 bg-white dark:bg-slate-900/40 text-red-600 hover:bg-red-600 hover:text-white border-2 border-red-600/10 dark:border-red-600/20 hover:border-red-600 p-2.5 rounded-xl transition font-bold text-[10px] uppercase tracking-widest shadow-sm"
                >
                  <Trash2 size={14} /> Delete Group
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
