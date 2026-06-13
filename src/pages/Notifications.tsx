import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Bell } from 'lucide-react';
import Skeleton from '../components/ui/Skeleton';
import { queryCache } from '../lib/queryCache';
import NotificationItem from '../components/notifications/NotificationItem';
import { motion, AnimatePresence } from 'framer-motion';

interface BaseNotification {
  id: string;
  created_at: string;
  group_id?: string;
  groups?: { name: string };
}

interface TaskNotification extends BaseNotification {
  title: string;
  due_date: string | null;
  status: string;
}

interface MessageNotification extends BaseNotification {
  content: string;
  sender_id: string;
  profiles?: { full_name: string };
  message_reads?: { user_id: string }[];
}

interface FileNotification extends BaseNotification {
  file_name: string;
  profiles?: { full_name: string };
}

interface MaterialNotification extends BaseNotification {
  title: string;
  profiles?: { full_name: string };
}

interface ActionData {
  invite_code?: string;
  group_name?: string;
  [key: string]: any;
}

interface UserNotification extends BaseNotification {
  title: string;
  content: string;
  type: string;
  action_data: ActionData | null;
  is_read: boolean;
}

export default function Notifications() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<TaskNotification[]>([]);
  const [messages, setMessages] = useState<MessageNotification[]>([]);
  const [files, setFiles] = useState<FileNotification[]>([]);
  const [materials, setMaterials] = useState<MaterialNotification[]>([]);
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    // 1. Fetch System Notifications
    const { data: sysNotifs } = await supabase
      .from('user_notifications')
      .select('id, title, content, type, action_data, created_at, is_read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sysNotifs && sysNotifs.length > 0) {
      setUserNotifications(sysNotifs);
      const unreadIds = sysNotifs.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase.from('user_notifications').update({ is_read: true }).in('id', unreadIds);
      }
    } else {
      setUserNotifications([]);
    }

    // 2. Fetch Group-based notifications
    const memberData = await queryCache.fetch(
      `user-groups-${user.id}`,
      async () => {
        const { data, error } = await supabase.from('group_members').select('group_id').eq('user_id', user.id);
        if (error) throw error;
        return data;
      }
    ).catch(() => []);
    
    if (memberData && memberData.length > 0) {
      const groupIds = memberData.map(m => m.group_id);
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, due_date, status, group_id, groups(name), created_at')
        .in('group_id', groupIds)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });
        
      setTasks((tasksData || []).map(t => ({
        ...t,
        groups: Array.isArray(t.groups) ? t.groups[0] : t.groups
      })) as unknown as TaskNotification[]);

      const lastVisitedStr = localStorage.getItem('lastVisitedNotifications');
      let lastVisitedMs = 0;
      if (lastVisitedStr) {
        const parsed = parseInt(lastVisitedStr, 10);
        if (!isNaN(parsed)) lastVisitedMs = parsed;
      }
      const isoDate = new Date(lastVisitedMs).toISOString();
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const isoSevenDaysAgo = sevenDaysAgo.toISOString();
      
      const { data: filesData } = await supabase
        .from('files')
        .select('id, file_name, created_at, group_id, groups(name), profiles(full_name)')
        .in('group_id', groupIds)
        .neq('uploaded_by', user.id)
        .gt('created_at', isoDate)
        .order('created_at', { ascending: false });
        
      setFiles((filesData || []).map(f => ({
        ...f,
        groups: Array.isArray(f.groups) ? f.groups[0] : f.groups,
        profiles: Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
      })) as unknown as FileNotification[]);

      const { data: materialsData } = await supabase
        .from('study_materials')
        .select('id, title, created_at, group_id, groups(name), profiles(full_name)')
        .in('group_id', groupIds)
        .eq('is_personal', false)
        .neq('user_id', user.id)
        .gt('created_at', isoDate)
        .order('created_at', { ascending: false });
        
      setMaterials((materialsData || []).map(m => ({
        ...m,
        groups: Array.isArray(m.groups) ? m.groups[0] : m.groups,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      })) as unknown as MaterialNotification[]);
      
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id, group_id, groups(name), profiles!messages_sender_id_fkey(full_name), message_reads(user_id)')
        .in('group_id', groupIds)
        .gte('created_at', isoSevenDaysAgo)
        .order('created_at', { ascending: false });

      const unreadMsgs = (recentMessages || []).filter(m => 
        (m.sender_id !== user.id || m.content?.startsWith('[System]')) && 
        !m.message_reads?.some((r: { user_id: string }) => r.user_id === user.id)
      );
      setMessages(unreadMsgs as unknown as MessageNotification[]);
      
      if (unreadMsgs.length > 0) {
        const records = unreadMsgs.map(m => ({ message_id: m.id, user_id: user.id }));
        await supabase.from('message_reads').upsert(records, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
      }
      
      localStorage.setItem('lastVisitedNotifications', Date.now().toString());
      window.dispatchEvent(new Event('notifications_visited'));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    
    // Subscribe to global sync events from MainLayout
    const handleSync = () => {
      fetchNotifications();
    };

    window.addEventListener('nemesis_sync', handleSync);
      
    return () => {
      window.removeEventListener('nemesis_sync', handleSync);
    };
  }, [user, fetchNotifications]);


  const handleAcceptInvite = async (notifId: string, inviteCode: string) => {
    setLoading(true);
    const { data: targetGroupId, error: joinError } = await supabase.rpc('join_group_by_code', {
      code_param: inviteCode
    });
    
    if (joinError) {
      alert(joinError.message || 'Failed to join group. The invite code may have been revoked or the group deleted.');
    } else {
      if (user) {
        await supabase.from('messages').insert({
          group_id: targetGroupId,
          sender_id: user.id,
          content: `[System] Joined the group via private invitation`
        });
      }
      alert('Successfully joined the group!');
    }
    
    // Cleanup notification
    await handleDeclineInvite(notifId);
    setLoading(false);
  };

  const handleDeclineInvite = async (notifId: string) => {
    await supabase.from('user_notifications').delete().eq('id', notifId);
    setUserNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto p-4 sm:p-4 md:p-8 space-y-6 min-w-0 w-full overflow-x-hidden mobile-hardened">
      <div className="mb-6 md:mb-8 p-4 md:p-6 bg-white dark:bg-slate-800 cyberpunk:bg-emerald-950/40 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 flex items-center justify-between">
        <Skeleton variant="text" className="w-48 h-8" />
        <Skeleton variant="rect" className="w-24 h-10 rounded-xl" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="p-4 rounded-2xl border bg-white dark:bg-slate-800/40 cyberpunk:bg-emerald-950/40 border-slate-100 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 flex gap-4 items-start shadow-sm">
            <Skeleton variant="circle" className="w-10 h-10 mt-1" />
            <div className="flex-1 space-y-2">
               <Skeleton variant="text" className="w-1/3 h-4" />
               <Skeleton variant="text" className="w-full h-3" />
               <Skeleton variant="text" className="w-1/4 h-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 flex flex-col w-full flex-1 md:h-[calc(100vh-80px)] md:max-h-[calc(100vh-80px)] md:overflow-hidden transition-all duration-500 mobile-hardened">
      <div className="mb-4 md:mb-8 p-4 md:p-6 glass-premium rounded-[1.5rem] flex items-center gap-3 md:gap-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-sky-50 dark:bg-slate-800 cyberpunk:bg-emerald-950/60 text-sky-600 dark:text-slate-300 cyberpunk:text-emerald-400 p-2.5 rounded-2xl hidden sm:block border border-sky-100 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 shadow-sm transition-transform hover:rotate-3">
            <Bell size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 uppercase tracking-tight leading-none">Intelligence</h1>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-500/80 uppercase tracking-[0.2em] mt-1">Notification Center</p>
          </div>
        </div>
        
        {(userNotifications.length > 0 || messages.length > 0 || files.length > 0 || materials.length > 0) && (
          <button 
            onClick={async () => {
              setClearing(true);
              
              if (user) {
                await supabase.from('user_notifications').delete().eq('user_id', user.id);
              }
              
              const now = new Date();
              localStorage.setItem('lastVisitedNotifications', now.getTime().toString());
              
              setUserNotifications([]);
              setMessages([]);
              setFiles([]);
              setMaterials([]);
              
              setClearing(false);
            }}
            disabled={clearing}
            className="px-5 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest bg-slate-900 dark:bg-slate-700 cyberpunk:bg-emerald-900 text-white hover:bg-black dark:hover:bg-slate-600 cyberpunk:hover:bg-emerald-800 rounded-xl transition-all shadow-lg shadow-slate-200 dark:shadow-none cyberpunk:shadow-none active:scale-95 disabled:opacity-50"
          >
            {clearing ? 'Clearing...' : 'Clear All'}
          </button>
        )}
      </div>

      {(tasks.length > 0 || messages.length > 0 || files.length > 0 || materials.length > 0 || userNotifications.length > 0) ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-8">
          <AnimatePresence initial={false}>
            {userNotifications.map(notif => (
              <motion.div 
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <NotificationItem 
                  type="user" 
                  data={notif} 
                  onAccept={handleAcceptInvite} 
                  onDecline={handleDeclineInvite} 
                />
              </motion.div>
            ))}
            {files.map(file => (
              <motion.div 
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <NotificationItem type="file" data={file} />
              </motion.div>
            ))}
            {materials.map(mat => (
              <motion.div 
                key={mat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <NotificationItem type="material" data={mat} />
              </motion.div>
            ))}
            {messages.map(msg => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <NotificationItem type="message" data={msg} />
              </motion.div>
            ))}
            {tasks.map(task => (
              <motion.div 
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <NotificationItem type="task" data={task} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center p-12 sm:p-20 text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500 glass-premium rounded-[1.5rem] h-full flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-50/10 dark:via-slate-800/10 cyberpunk:via-emerald-900/10 to-transparent pointer-events-none" />
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950/50 rounded-full flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-700/50 cyberpunk:border-emerald-500/30 shadow-inner">
            <Bell size={40} className="text-slate-200 dark:text-slate-600 cyberpunk:text-emerald-700 drop-shadow-sm" />
          </div>
          <p className="font-black text-sm sm:text-lg text-slate-900 dark:text-white cyberpunk:text-emerald-400 uppercase tracking-tight">System Optimized</p>
          <p className="text-[10px] sm:text-xs mt-1.5 font-bold text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-500/80 uppercase tracking-[0.2em] max-w-[200px]">You are fully synchronized with the network.</p>
        </div>
      )}
    </div>
  );
}
