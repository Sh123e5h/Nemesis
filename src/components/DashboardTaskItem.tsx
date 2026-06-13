import React from 'react';

interface DashboardTask {
  id: string;
  title: string;
  due_date?: string;
  status: string;
  subtasks?: { id: string; title: string; is_completed: boolean }[];
}

interface DashboardTaskItemProps {
  task: DashboardTask;
  index: number;
  onToggle?: (taskId: string, currentStatus: string) => void;
}

export const DashboardTaskItem = React.memo(({ task, index, onToggle }: DashboardTaskItemProps) => {
  const dotColor = ['bg-rose-500', 'bg-amber-500', 'bg-sky-500'][index % 3];
  
  return (
    <div className="flex items-start gap-3 group/task transition duration-300 md:hover:translate-x-1 py-1">
      <button 
        onClick={() => onToggle?.(task.id, task.status)}
        className="mt-1 shrink-0 w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/30 flex items-center justify-center hover:border-sky-500 dark:hover:border-sky-400 cyberpunk:hover:border-emerald-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 cyberpunk:hover:bg-emerald-500/10 transition duration-300 md:active:scale-90 group-hover/task:border-sky-300 dark:group-hover/task:border-slate-500 cyberpunk:group-hover/task:border-emerald-500/50"
      >
        <div className={`w-2 h-2 rounded-full ${dotColor} opacity-40 transition-opacity group-hover/task:opacity-100`}></div>
      </button>
      
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-800 dark:text-white cyberpunk:text-emerald-400 text-[12px] md:text-sm leading-tight line-clamp-1 transition-colors group-hover/task:text-sky-600 dark:group-hover/task:text-sky-400 cyberpunk:group-hover/task:text-emerald-300">
          {task.title}
        </p>
        <p className="text-[10px] md:text-[11px] font-semibold text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-600/70 mt-0.5 uppercase tracking-widest flex items-center gap-2">
          {task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Date'}
          {task.status && <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/50 cyberpunk:bg-emerald-950/50 rounded-lg text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500/80">{task.status}</span>}
        </p>
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {task.subtasks.map(st => (
              <div key={st.id} className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                 <div className={`w-1 h-1 rounded-full shrink-0 ${st.is_completed ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600 cyberpunk:bg-emerald-500/30'}`} />
                 <span className={`text-[10px] md:text-[11px] font-medium truncate ${st.is_completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300 cyberpunk:text-emerald-500/80'}`}>
                   {st.title}
                 </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

DashboardTaskItem.displayName = 'DashboardTaskItem';
