import React from 'react';
import { Bell, Clock, CheckCircle, MessageSquare, FileText } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';

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

interface NotificationItemProps {
  type: 'user' | 'file' | 'material' | 'message' | 'task';
  data: any;
  onAccept?: (id: string, code: string) => void;
  onDecline?: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ type, data, onAccept, onDecline }) => {
  if (type === 'user') {
    const notif = data as UserNotification;
    return (
        <div className="p-3.5 sm:p-4 rounded-2xl border bg-amber-500/5 backdrop-blur-sm border-amber-500/20 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between transition hover:bg-amber-500/10">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2 rounded-full mt-1 bg-amber-500/10 text-amber-600 shrink-0 shadow-sm">
            <Bell size={18} />
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-300 cyberpunk:text-emerald-400 text-sm sm:text-base flex items-center gap-2">
              {notif.title}
              {notif.type === 'group_invite' && <span className="bg-amber-500/20 text-amber-700 dark:text-amber-400 cyberpunk:text-amber-400 text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest translate-y-[1px]">Action Required</span>}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 cyberpunk:text-emerald-500/80 mt-0.5 font-medium leading-relaxed">{notif.content}</div>
            <div className="text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest opacity-80">
              {new Date(notif.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
        </div>
        
        {notif.type === 'group_invite' && notif.action_data?.invite_code && (
          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-amber-500/10">
            <button 
              onClick={() => onDecline?.(notif.id)}
              className="flex-1 sm:flex-none px-4 py-2 bg-white/50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950/50 hover:bg-white dark:hover:bg-slate-700 cyberpunk:hover:bg-emerald-900 text-slate-600 dark:text-slate-300 cyberpunk:text-emerald-400 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 active:scale-95"
            >
              Decline
            </button>
            <button 
              onClick={() => notif.action_data?.invite_code && onAccept?.(notif.id, notif.action_data.invite_code)}
              className="flex-1 sm:flex-none px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 rounded-xl text-xs font-black uppercase tracking-widest transition active:scale-95"
            >
              Accept
            </button>
          </div>
        )}
      </div>
    );
  }

  if (type === 'file') {
    const file = data as FileNotification;
    return (
      <div className="p-3.5 sm:p-4 rounded-2xl border bg-emerald-500/5 backdrop-blur-sm border-emerald-500/20 flex gap-3 sm:gap-4 items-start transition hover:bg-emerald-500/10">
        <div className="p-2 rounded-full mt-1 bg-emerald-500/10 text-emerald-600 shadow-sm">
          <CheckCircle size={18} />
        </div>
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-300 cyberpunk:text-emerald-400 text-sm sm:text-base tracking-tight">New file from <span className="text-emerald-700 dark:text-emerald-400 cyberpunk:text-emerald-500">{file.profiles?.full_name}</span></div>
          <div className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5 opacity-80">Space: {file.groups?.name}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 cyberpunk:text-emerald-400 mt-1.5 font-medium flex items-center gap-1.5 bg-white/40 dark:bg-emerald-900/10 cyberpunk:bg-emerald-950/50 self-start px-2 py-0.5 rounded-lg border border-emerald-500/10 dark:border-emerald-500/20 cyberpunk:border-emerald-500/30">
            <FileText size={12} className="shrink-0" />
            <span className="truncate max-w-[200px]">{file.file_name}</span>
          </div>
          <div className="text-[10px] mt-2.5 font-bold text-slate-400 uppercase tracking-widest opacity-80">
            {new Date(file.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'material') {
    const mat = data as MaterialNotification;
    return (
      <div className="p-3.5 sm:p-4 rounded-2xl border bg-purple-500/5 backdrop-blur-sm border-purple-500/20 flex gap-3 sm:gap-4 items-start transition hover:bg-purple-500/10">
        <div className="p-2 rounded-full mt-1 bg-purple-500/10 text-purple-600 shadow-sm">
          <FileText size={18} />
        </div>
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-300 cyberpunk:text-emerald-400 text-sm sm:text-base tracking-tight">Material shared by <span className="text-purple-700 dark:text-purple-400 cyberpunk:text-purple-400">{mat.profiles?.full_name}</span></div>
          <div className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5 opacity-80">Space: {mat.groups?.name}</div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-400 cyberpunk:text-purple-400/80 mt-2 line-clamp-1 border-l-2 border-purple-500/20 pl-2">{mat.title}</div>
          <div className="text-[10px] mt-3 font-bold text-slate-400 uppercase tracking-widest opacity-80">
            {new Date(mat.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'message') {
    const msg = data as MessageNotification;
    return (
      <div className="p-3.5 sm:p-4 rounded-2xl border bg-sky-500/5 backdrop-blur-sm border-sky-500/20 flex gap-3 sm:gap-4 items-start transition hover:bg-sky-500/10">
        <div className="p-2 rounded-full mt-1 bg-sky-500/10 text-sky-600 shadow-sm">
          <MessageSquare size={18} />
        </div>
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-300 cyberpunk:text-emerald-400 text-sm sm:text-base tracking-tight"><span className="text-sky-700 dark:text-sky-400 cyberpunk:text-sky-400">{msg.profiles?.full_name}</span> sent a message</div>
          <div className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5 opacity-80">Space: {msg.groups?.name}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 cyberpunk:text-sky-400/80 italic mt-2 line-clamp-1 border-l-2 border-sky-500/20 pl-2 max-w-sm">"{msg.content || 'Shared an attachment'}"</div>
          <div className="text-[10px] mt-3 font-bold text-slate-400 uppercase tracking-widest opacity-80">
            {new Date(msg.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'task') {
    const task = data as TaskNotification;
    const overdue = task.due_date && isPast(parseISO(task.due_date));
    return (
      <div className={`p-3.5 sm:p-4 rounded-2xl border backdrop-blur-sm transition ${overdue ? 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 dark:bg-rose-900/10 dark:border-rose-500/30' : 'bg-slate-500/5 border-slate-500/20 hover:bg-slate-500/10 dark:bg-slate-800/40 dark:border-slate-700/60 cyberpunk:bg-emerald-950/40 cyberpunk:border-emerald-500/30'} flex gap-3 sm:gap-4 items-start`}>
        <div className={`p-2 rounded-full mt-1 shadow-sm ${overdue ? 'bg-rose-500/10 text-rose-500 animate-pulse' : 'bg-sky-500/10 text-sky-500'}`}>
          {overdue ? <Clock size={18} /> : <CheckCircle size={18} />}
        </div>
        <div>
          <div className={`font-bold text-sm sm:text-base tracking-tight ${overdue ? 'text-rose-900 dark:text-rose-400 cyberpunk:text-rose-400' : 'text-slate-800 dark:text-slate-300 cyberpunk:text-emerald-400'}`}>{task.title}</div>
          <div className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5 opacity-80">Space: {task.groups?.name}</div>
          {task.due_date && (
            <div className={`text-[10px] mt-2.5 font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${overdue ? 'text-rose-600 bg-rose-500/10 border-rose-500/10' : 'text-slate-500 bg-slate-500/5 border-slate-500/10'}`}>
              {overdue ? 'CRITICAL: OVERDUE' : `Deadline: ${new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default React.memo(NotificationItem);
