import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../lib/db';
import { useDataStore } from '../store/useDataStore';
import { Plus, CheckCircle2, Circle, Clock, Trash2, ChevronLeft, ChevronRight, LayoutList, Columns, X, Search, Zap, AlertCircle } from 'lucide-react';
import { useMobile } from '../hooks/useMobile';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import CustomDateTimePicker from '../components/ui/CustomDateTimePicker';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../components/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';


interface Subtask {
  id: string;
  title: string;
  is_completed: boolean;
  task_id: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: string;
  created_at: string;
  created_by: string;
  group_id?: string | null;
  groups?: { name: string } | null;
  subtasks?: Subtask[];
  is_pending?: boolean;
}

interface Holiday {
  date: string;
  localName: string;
  name: string;
}

// 🧠 High-Performance Memoized Sub-Components (Speed Tier 1)
const SubtaskItem = React.memo(({ st, taskId, onToggle, isMobile }: { st: Subtask, taskId: string, onToggle: (tid: string, stid: string, s: boolean) => void, isMobile: boolean }) => (
  <motion.div 
    layout={!isMobile}
    initial={isMobile ? undefined : { opacity: 0, x: -10 }}
    animate={isMobile ? undefined : { opacity: 1, x: 0 }}
    className="flex items-center gap-2 group/st"
  >
    <button onClick={() => onToggle(taskId, st.id, st.is_completed)} className={`flex-shrink-0 transition-all duration-300 transform active:scale-90 ${st.is_completed ? 'text-emerald-500 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'text-slate-300 hover:text-sky-500'}`}>
      {st.is_completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
    </button>
    <span className={`text-[clamp(10px,2.5vw,11.5px)] sm:text-xs font-semibold select-none transition-all duration-300 ${st.is_completed ? 'text-slate-400 line-through decoration-slate-300/50 italic opacity-70' : 'text-slate-600 group-hover/st:text-slate-900 duration-200'}`}>{st.title}</span>
  </motion.div>
));

SubtaskItem.displayName = 'SubtaskItem';

const TaskCard = React.memo(({ task, onToggleStatus, onToggleSubtask, onDelete, onAddSubtask, isMobile }: { 
  task: Task, 
  onToggleStatus: (t: Task) => void, 
  onToggleSubtask: (tid: string, stid: string, s: boolean) => void,
  onDelete: (id: string) => void,
  onAddSubtask: (tid: string) => void,
  isMobile: boolean
}) => {
  const completedSubtasks = task.subtasks?.filter(st => st.is_completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progressWidth = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const isDone = task.status === 'completed' || task.status === 'done';

  // Calculate priority color (using due date proximity)
  const [now] = useState(() => Date.now());
  const isUrgent = task.due_date && !isDone && (new Date(task.due_date).getTime() - now < 24 * 60 * 60 * 1000);

  return (
    <motion.div 
      layout={!isMobile}
      initial={isMobile ? undefined : { opacity: 0, y: 10 }}
      animate={isMobile ? undefined : { opacity: 1, y: 0 }}
      exit={isMobile ? undefined : { opacity: 0, scale: 0.95 }}
      whileHover={isMobile ? undefined : { y: -2 }}
      className={`glass-premium rounded-2xl md:rounded-3xl shadow-sm flex flex-col transition-all duration-300 group overflow-hidden hover:shadow-xl hover:shadow-sky-500/10 ${isUrgent ? 'border-orange-200/50 hover:border-orange-400/50 bg-orange-50/5' : 'hover:border-sky-300/50'}`}
    >
      <div className="p-2.5 md:p-4 flex items-start gap-3 md:gap-4 w-full relative">
        {totalSubtasks > 0 && (
          <div className="absolute top-0 left-0 h-1 bg-slate-100/50 transition-all duration-500 w-full overflow-hidden">
             <div className="h-full bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.8)] transition-all duration-700 ease-out animate-shimmer" style={{ width: `${progressWidth}%`, backgroundSize: '200% 100%' }}></div>
          </div>
        )}
        <button onClick={() => onToggleStatus(task)} className={`mt-0.5 md:mt-1 flex-shrink-0 transition-all duration-300 transform scale-100 md:scale-110 active:scale-90 ${isDone ? 'text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-300 hover:text-sky-500'}`}>
          {isDone ? <CheckCircle2 size={isMobile ? 18 : 22} /> : <Circle size={isMobile ? 18 : 22} strokeWidth={1.5} />}
        </button>
        <div className="flex-1 min-w-0 z-10 pt-0.5 md:pt-1">
          <h4 className={`text-[13px] md:text-base font-bold tracking-tight flex items-center gap-2 flex-wrap transition-colors duration-300 ${isDone ? 'text-slate-400 font-medium' : 'text-slate-900'}`}>
            {task.title}
            {isUrgent && <AlertCircle className="text-orange-500 animate-pulse" size={14} />}
            {task.groups?.name && (
              <span className="bg-sky-500/10 text-sky-600 text-[8px] px-2 py-0.5 rounded-full tracking-widest font-black border border-sky-200/30">
                {task.groups.name}
              </span>
            )}
          </h4>
          {task.description && <p className={`text-[10px] md:text-sm mt-1 md:mt-1.5 font-medium leading-relaxed line-clamp-2 transition-all duration-300 ${isDone ? 'text-slate-400 opacity-60' : 'text-slate-500 group-hover:text-slate-600'}`}>{task.description}</p>}
          
          <div className="flex items-center gap-2 mt-3 md:mt-4 flex-wrap">
            {task.due_date && (
              <div className={`flex items-center gap-1.5 whitespace-nowrap text-[8px] md:text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest transition-all duration-300 border ${isUrgent ? 'bg-orange-50 text-orange-600 border-orange-100 glow-orange' : isDone ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-sky-50 text-sky-600 border-sky-100 glow-sky'}`}>
                <Clock size={isMobile ? 10 : 12} className="shrink-0" />
                <span>
                  {new Date(task.due_date).toLocaleString([], isMobile 
                    ? { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }
                    : { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }
                  )}
                </span>
              </div>
            )}
            {totalSubtasks > 0 && (
               <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-full uppercase tracking-[0.1em]">
                  <Zap size={10} className={progressWidth === 100 ? 'text-emerald-500' : 'text-amber-500'} />
                  {completedSubtasks}/{totalSubtasks}
               </div>
            )}
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} 
          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all duration-200 p-2 z-10 hover:bg-red-50 rounded-xl active:scale-90"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="w-full pl-11 sm:pl-[60px] pr-4 pb-4 min-w-0">
        <AnimatePresence mode="popLayout">
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-2 mb-3">
              {task.subtasks.map(st => (
                <SubtaskItem key={st.id} st={st} taskId={task.id} onToggle={onToggleSubtask} isMobile={isMobile} />
              ))}
            </div>
          )}
        </AnimatePresence>
        <button 
          onClick={() => onAddSubtask(task.id)}
          className="text-[10px] font-black text-sky-500 hover:text-white flex items-center gap-1.5 mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 uppercase tracking-widest bg-sky-50/50 hover:bg-sky-500 px-3 py-1.5 rounded-xl border border-sky-100/50 hover:border-sky-500 hover:shadow-lg hover:shadow-sky-500/20 active:scale-95"
        >
          <Plus size={12} strokeWidth={3} /> Micro-target
        </button>
      </div>
    </motion.div>
  );
});

TaskCard.displayName = 'TaskCard';

const CalendarGrid = React.memo(({ daysInMonth, firstDay, currentDate, holidays, tasks, isMobile }: {
  daysInMonth: number,
  firstDay: number,
  currentDate: Date,
  holidays: Holiday[],
  tasks: Task[],
  isMobile: boolean
}) => {
  // ⚡ Memoize the expensive per-day task lookup so it only re-runs when
  // the month or task list actually changes — not on every subtask toggle.
  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    for (const t of tasks) {
      if (!t.due_date) continue;
      if (t.status === 'completed' || t.status === 'done') continue;
      const prefix = `${year}-${month}`;
      if (t.due_date.startsWith(prefix)) {
        const day = t.due_date.substring(8, 10);
        if (!map[day]) map[day] = [];
        map[day].push(t);
      }
    }
    return map;
  }, [tasks, currentDate]);

  return (
    <div className={`grid grid-cols-7 ${isMobile ? 'gap-1' : 'gap-1.5'} relative z-0`}>
      {Array.from({ length: firstDay }).map((_, i) => (
        <div key={`empty-${i}`} className="h-[28px] md:h-10"></div>
      ))}
      {Array.from({ length: daysInMonth }).map((_, i) => {
        const todayDt = new Date();
        const todayStr = `${todayDt.getFullYear()}-${String(todayDt.getMonth() + 1).padStart(2, '0')}-${String(todayDt.getDate()).padStart(2, '0')}`;
        const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        const isToday = dayStr === todayStr;
        const holiday = holidays.find(h => h.date === dayStr);
        const dayKey = String(i + 1).padStart(2, '0');
        const dayTasks = tasksByDay[dayKey] || [];
        const showTooltip = holiday || dayTasks.length > 0;
        
        return (
          <motion.div 
            key={i} 
            whileHover={isMobile ? undefined : { scale: 1.1, zIndex: 10 }}
            className={`h-[28px] sm:h-10 rounded-xl flex flex-col items-center justify-center relative border transition-all duration-300 cursor-pointer ${isToday ? 'bg-sky-500 text-white border-sky-400 shadow-lg glow-sky' : 'bg-white/40 text-slate-700 border-slate-100/50 hover:bg-white hover:border-sky-200/50'} group`}
          >
            <span className={`text-[10px] sm:text-sm font-bold ${isToday ? 'text-white' : 'text-slate-700'}`}>{i + 1}</span>
            <div className="flex gap-0.5 mt-0.5">
               {dayTasks.length > 0 && <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]'}`}></div>}
               {holiday && <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'}`}></div>}
            </div>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[180px] bg-slate-900/95 backdrop-blur-md text-white text-[9px] sm:text-[10px] px-2.5 py-2 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none z-50 text-center transition-all duration-300 flex flex-col gap-1 border border-white/10 scale-90 group-hover:scale-100">
                {holiday && <div className="text-emerald-400 font-black tracking-wider uppercase text-[8px]">{holiday.localName}</div>}
                {dayTasks.map(t => <div key={t.id} className="truncate text-orange-200 font-medium">{t.title}</div>)}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900/95"></div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
});

CalendarGrid.displayName = 'CalendarGrid';

export default function Planner() {
  const { user } = useAuthStore();
  const { isMobile } = useMobile();
  const { plannerTasks, fetchPlanner } = useDataStore();
  const loading = useDataStore(state => state.lastFetched.planner === 0);

  // UI State
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Subtasks State
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // ─── Initial Load & Background Revalidation ───────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetchPlanner(user.id);
  }, [user, fetchPlanner]);

  const mutate = useCallback(() => {
    if (user) fetchPlanner(user.id, true);
  }, [user, fetchPlanner]);

  // Compatibility mapping
  const tasks = plannerTasks;

  const syncPendingTasks = useCallback(async () => {
    if (!navigator.onLine || !user) return;
    try {
      const pending = await db.tasks.where('is_pending').equals(1).toArray();
      if (pending.length === 0) return;

      const batch = pending.map(task => ({
        created_by: user.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        status: task.status
      }));

      const { data: insertedTasks, error } = await supabase
        .from('tasks')
        .insert(batch)
        .select();

      if (error) throw error;

      if (insertedTasks) {
        await Promise.all(insertedTasks.map((serverTask, i) =>
          db.tasks.update(pending[i].id, { is_pending: false, id: serverTask.id })
        ));
      }
    } catch (err) {
      console.error('[Planner] syncPendingTasks failed:', err);
    }
  }, [user]);

  const fetchHolidays = useCallback(async (year: number) => {
    try {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
      if (!response.ok) throw new Error('Failed to fetch holidays');
      const data = await response.json();
      const holidaysData: Holiday[] = data.map((h: any) => ({
        date: h.date,
        localName: h.localName,
        name: h.name
      }));
      setHolidays(holidaysData);
    } catch (err) {
      console.warn('[Planner] Failed to fetch live holidays, using fallback.', err);
      const holidaysData: Holiday[] = [
        { date: `${year}-01-26`, localName: 'Republic Day', name: 'Republic Day' },
        { date: `${year}-03-04`, localName: 'Holi', name: 'Holi' },
        { date: `${year}-03-20`, localName: 'Eid ul-Fitr', name: 'Eid ul-Fitr' },
        { date: `${year}-04-03`, localName: 'Good Friday', name: 'Good Friday' },
        { date: `${year}-08-15`, localName: 'Independence Day', name: 'Independence Day' },
        { date: `${year}-10-02`, localName: 'Gandhi Jayanti', name: 'Gandhi Jayanti' },
        { date: `${year}-10-19`, localName: 'Dussehra', name: 'Dussehra' },
        { date: `${year}-11-08`, localName: 'Diwali', name: 'Diwali' },
        { date: `${year}-12-25`, localName: 'Christmas Day', name: 'Christmas Day' }
      ];
      setHolidays(holidaysData);
    }
  }, []);

  // 🧠 Memoized Filtering
  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return tasks;
    const term = searchTerm.toLowerCase();
    return tasks.filter((t: Task) => 
      t.title.toLowerCase().includes(term) || 
      t.description?.toLowerCase().includes(term) ||
      t.groups?.name.toLowerCase().includes(term)
    );
  }, [tasks, searchTerm]);

  const pendingTasks = useMemo(() => filteredTasks.filter((t: Task) => t.status === 'pending'), [filteredTasks]);
  const inProgressTasks = useMemo(() => filteredTasks.filter((t: Task) => t.status === 'in_progress'), [filteredTasks]);
  const completedTasks = useMemo(() => filteredTasks.filter((t: Task) => t.status === 'completed' || t.status === 'done'), [filteredTasks]);

  const syncPlanner = useCallback(async () => {
    await syncPendingTasks();
    await mutate();
  }, [syncPendingTasks, mutate]);

  useEffect(() => {
    if (user) {
      db.tasks.where('created_by').equals(user.id).toArray()
        .then((cached: Task[]) => {
          if (cached.length > 0) {
            useDataStore.setState({ plannerTasks: cached.sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime()) });
          }
        });


      const handleSync = (e: any) => {
        const { table } = e.detail;
        if (['tasks', 'subtasks', 'announcements', 'groups', 'group_members'].includes(table)) {
          mutate();
        }
      };

      window.addEventListener('nemesis_sync', handleSync);

      return () => {
        window.removeEventListener('nemesis_sync', handleSync);
      };
    }
  }, [user, syncPlanner, mutate]);

  const isLoading = loading && tasks.length === 0;
  const currentYear = currentDate.getFullYear();
  
  useEffect(() => {
    fetchHolidays(currentYear);
  }, [currentYear, fetchHolidays]);

  const addTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTask.title) return;
    
    let isoDate = null;
    if (newTask.due_date) isoDate = new Date(newTask.due_date).toISOString();

    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      title: newTask.title,
      description: newTask.description,
      due_date: isoDate || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      created_by: user.id,
      subtasks: []
    };

    useDataStore.setState(state => ({ plannerTasks: [optimisticTask, ...state.plannerTasks] }));
    useDataStore.getState().invalidateCache(['upcoming']);
    setNewTask({ title: '', description: '', due_date: '' });
    setShowAdd(false);

    await db.tasks.add({ ...optimisticTask, is_pending: true });

    if (!navigator.onLine) return;

    const { data: addData, error: addError } = await supabase.from('tasks').insert({
      created_by: user.id,
      title: optimisticTask.title,
      description: optimisticTask.description,
      due_date: isoDate,
      status: 'pending'
    }).select().single();

    if (!addError && addData) {
      await db.tasks.delete(tempId);
      await db.tasks.put({ ...addData, is_pending: false });
      mutate();
    }
  }, [user, newTask, mutate]);

  const toggleStatus = useCallback(async (task: Task) => {
    const isCompleted = task.status === 'completed' || task.status === 'done';
    const newStatus = isCompleted ? 'pending' : (task.group_id ? 'done' : 'completed');
    
    useDataStore.setState(state => ({ plannerTasks: state.plannerTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t) }));
    useDataStore.getState().invalidateCache(['upcoming']);
    await db.tasks.update(task.id, { status: newStatus });

    if (!navigator.onLine) return;
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
  }, []);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    useDataStore.setState(state => ({
      plannerTasks: state.plannerTasks.map(t => {
        if (t.id === taskId && t.subtasks) {
          return {
            ...t,
            subtasks: t.subtasks.map(st => st.id === subtaskId ? { ...st, is_completed: newStatus } : st)
          };
        }
        return t;
      })
    }));
    
    const t = await db.tasks.get(taskId);
    if (t && t.subtasks) {
        t.subtasks = t.subtasks.map((st: Subtask) => st.id === subtaskId ? { ...st, is_completed: newStatus } : st);
        await db.tasks.put(t);
    }

    if (!navigator.onLine) return;
    await supabase.from('subtasks').update({ is_completed: newStatus }).eq('id', subtaskId);
  }, []);

  const handleAddSubtaskSubmit = useCallback(async (taskId: string) => {
    if (!newSubtaskTitle.trim()) return;
    
    const tempId = 'temp-' + Date.now();
    const tempSubtask = { id: tempId, title: newSubtaskTitle, is_completed: false, task_id: taskId };
    
    useDataStore.setState(state => ({
      plannerTasks: state.plannerTasks.map(t => {
        if (t.id === taskId) {
          return { ...t, subtasks: [...(t.subtasks || []), tempSubtask] };
        }
        return t;
      })
    }));

    const localTask = await db.tasks.get(taskId);
    if (localTask) {
        localTask.subtasks = [...(localTask.subtasks || []), tempSubtask];
        await db.tasks.put(localTask);
    }
    
    const titleToSave = newSubtaskTitle;
    setNewSubtaskTitle('');
    setAddingSubtaskTo(null);

    const { data: subtaskData } = await supabase.from('subtasks').insert({
      task_id: taskId,
      title: titleToSave,
      is_completed: false
    }).select().single();

    if (subtaskData) {
      useDataStore.setState(state => ({
        plannerTasks: state.plannerTasks.map(t => {
          if (t.id === taskId && t.subtasks) {
            return {
              ...t,
              subtasks: t.subtasks.map(st => st.id === tempId ? subtaskData : st)
            };
          }
          return t;
        })
      }));

      const dbTask = await db.tasks.get(taskId);
      if (dbTask && dbTask.subtasks) {
        dbTask.subtasks = dbTask.subtasks.map((st: Subtask) => st.id === tempId ? subtaskData : st);
        await db.tasks.put(dbTask);
      }
    }
  }, [newSubtaskTitle]);

  const deleteTask = useCallback(async (id: string) => {
    useDataStore.setState(state => ({ plannerTasks: state.plannerTasks.filter(t => t.id !== id) }));
    useDataStore.getState().invalidateCache(['upcoming']);
    await db.tasks.delete(id);
    
    if (!navigator.onLine) return;
    await supabase.from('tasks').delete().eq('id', id);
  }, []);

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    const newStatus = destination.droppableId;
    useDataStore.setState(state => ({ plannerTasks: state.plannerTasks.map(t => t.id === draggableId ? { ...t, status: newStatus } : t) }));
    useDataStore.getState().invalidateCache(['upcoming']);
    await supabase.from('tasks').update({ status: newStatus }).eq('id', draggableId);
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  // ⚡ Neural Fit: Adjust empty state height for mobile fold visibility
  const emptyStateHeight = isMobile ? 'py-4 px-3' : 'py-12';

  const nextMonth = useCallback(() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)), [currentDate]);
  const prevMonth = useCallback(() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)), [currentDate]);

  const toggleShowAdd = useCallback(() => setShowAdd(prev => !prev), []);
  const closeShowAdd = useCallback(() => setShowAdd(false), []);
  const setListView = useCallback(() => setViewMode('list'), []);
  const setBoardView = useCallback(() => setViewMode('board'), []);

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  return (
    <div className="flex flex-col items-stretch justify-start px-4 md:px-8 pt-0 md:pt-8 md:pb-6 max-w-6xl mx-auto min-w-0 w-full flex-1 md:h-[calc(100vh-80px)] md:max-h-[calc(100vh-80px)] md:overflow-hidden transition-all mobile-hardened">
      <div className="py-1 sm:p-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 mb-4 md:mb-8">
        <div className="min-w-0">
          <h1 className="text-[clamp(16px,5vw,22px)] sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Personal Planner
            <div className={`h-2 w-2 rounded-full ${loading ? 'bg-amber-400 animate-bounce' : 'bg-sky-500 animate-pulse shadow-[0_0_10px_rgba(14,165,233,0.5)]'}`}></div>
          </h1>
          <p className="hidden sm:block text-sm text-slate-500 font-bold mt-1 tracking-tight opacity-70">Orchestrate your missions and daily targets.</p>
        </div>
        
        {/* 🔍 Search Hub */}
        <div className="relative group/search w-full md:w-80 order-3 sm:order-2 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 transition-all duration-300 group-focus-within/search:text-sky-500 group-focus-within/search:scale-110" size={18} />
          <input 
            type="text" 
            placeholder="Scan objectives..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 md:py-3 glass-premium border-slate-200/40 rounded-2xl text-xs md:text-sm font-bold text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 focus:bg-white/80 transition-all"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 shrink-0 w-full sm:w-auto order-2 sm:order-3">
          <div className="flex glass-premium p-1 md:p-1.5 rounded-2xl border-slate-200/30 flex-1 sm:flex-none">
            <button onClick={setListView} className={`flex-1 sm:flex-none px-3 sm:px-6 py-1.5 md:py-2 rounded-xl text-[clamp(10px,2.5vw,11px)] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${viewMode === 'list' ? 'bg-white shadow-lg text-sky-600 cyberpunk:bg-emerald-500 cyberpunk:text-black' : 'text-slate-500 hover:text-slate-900 cyberpunk:text-emerald-500/60'}`}>
              <LayoutList size={isMobile ? 12 : 16}/> <span className="truncate">List View</span>
            </button>
            <button onClick={setBoardView} className={`flex-1 sm:flex-none px-3 sm:px-6 py-1.5 md:py-2 rounded-xl text-[clamp(10px,2.5vw,11px)] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${viewMode === 'board' ? 'bg-white shadow-lg text-sky-600 cyberpunk:bg-emerald-500 cyberpunk:text-black' : 'text-slate-500 hover:text-slate-900 cyberpunk:text-emerald-500/60'}`}>
              <Columns size={isMobile ? 12 : 16}/> <span className="truncate">Board</span>
            </button>
          </div>
          <motion.button 
            whileHover={isMobile ? undefined : { scale: 1.05, y: -2 }}
            whileTap={isMobile ? undefined : { scale: 0.95 }}
            onClick={toggleShowAdd}
            className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 cyberpunk:bg-emerald-500 cyberpunk:hover:bg-emerald-400 text-white cyberpunk:text-black px-4 sm:px-8 py-2.5 md:py-3 rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-[0.15em] transition-all shadow-xl shadow-sky-500/20 cyberpunk:shadow-emerald-500/40 shrink-0 border border-sky-400/50 cyberpunk:border-emerald-400/60"
          >
            <Plus size={isMobile ? 14 : 18} strokeWidth={3} /> <span className="hidden sm:inline">New Objective</span><span className="sm:hidden">Add</span>
          </motion.button>
        </div>
      </div>

      {showAdd && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <form onSubmit={addTask} className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-md space-y-5 relative z-[1001] animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">New Personal Task</h2>
              <button type="button" onClick={closeShowAdd} className="w-10 h-10 rounded-full flex items-center justify-center text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1.5 px-0.5">Task Title</label>
              <input 
                autoFocus type="text" required placeholder="What needs to be done?" 
                className="w-full text-sm font-bold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1.5 px-0.5">Mission Directives</label>
              <textarea 
                placeholder="Add more details or personal notes..." 
                className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none transition resize-none"
                value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} rows={3}
              />
            </div>
            <div className="space-y-4">
              <CustomDateTimePicker label="DUE DATE & TIME" value={newTask.due_date} onChange={val => setNewTask({...newTask, due_date: val})} />
              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition shadow-lg shadow-slate-200 mt-2">
                Finalize Task
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {isLoading ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 p-1 sm:p-0">
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-4">
               <SkeletonLine width="200px" height="12px" className="mb-6" />
               {[1, 2, 3].map(i => (
                 <div key={i} className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/60 p-4 sm:p-6 flex items-start gap-4">
                    <SkeletonCircle size={isMobile ? 18 : 22} />
                    <div className="flex-1 space-y-3">
                       <SkeletonLine width="60%" height="16px" />
                       <SkeletonLine width="40%" height="12px" className="opacity-40" />
                       <div className="pt-2">
                          <Skeleton variant="rectangle" className="w-[120px] h-[24px] rounded-full opacity-10" />
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
          <div className="md:col-span-1">
            <div className="bg-white/80 backdrop-blur-3xl rounded-3xl border border-slate-200/60 p-6 space-y-6">
              <div className="flex items-center justify-between">
                 <SkeletonLine width="100px" height="1.25rem" />
                 <div className="flex gap-2">
                    <SkeletonCircle size={20} />
                    <SkeletonCircle size={20} />
                 </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <SkeletonLine key={i} width="100%" height="8px" className="opacity-20" />
                ))}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {Array.from({ length: 31 }).map((_, i) => (
                  <SkeletonCircle key={i} size={isMobile ? 22 : 28} className="mx-auto opacity-10" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="flex-1 flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-8 px-4 pt-1 sm:px-0 pb-4 md:pb-0 min-w-0 w-full"
        >
          <div className="md:col-span-2 pr-0 md:pr-2 flex flex-col h-auto overflow-visible md:overflow-y-auto custom-scrollbar">
            {viewMode === 'list' ? (
              <div className="space-y-6 md:space-y-10">
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                       <div className="w-8 h-px bg-orange-500/30"></div>
                       Pending Objectives <span className="text-orange-500/60 ml-1">({pendingTasks.length})</span>
                    </h3>
                  </div>
                  
                  <AnimatePresence mode="popLayout" initial={false}>
                    {pendingTasks.length === 0 && !showAdd && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`text-center ${emptyStateHeight} bg-white/30 backdrop-blur-md border border-slate-200/50 border-dashed rounded-3xl text-slate-400 font-bold uppercase tracking-widest text-[10px] flex flex-col items-center justify-center gap-3 overflow-hidden group`}
                      >
                        <div className="p-3 bg-slate-100/50 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                          <Zap size={20} className="text-slate-300" />
                        </div>
                        Zero pending objectives. Ready for mission.
                      </motion.div>
                    )}
                    {pendingTasks.map((task: Task) => (
                      <div key={task.id} className="relative">
                        <TaskCard task={task} onToggleStatus={toggleStatus} onToggleSubtask={toggleSubtask} onDelete={deleteTask} onAddSubtask={setAddingSubtaskTo} isMobile={isMobile} />
                        {addingSubtaskTo === task.id && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 mt-3 bg-white/80 backdrop-blur-xl p-3 rounded-2xl border border-sky-100 shadow-xl shadow-sky-500/5 relative z-20"
                          >
                            <input
                              type="text" autoFocus placeholder="Define micro-task success..." className="flex-1 text-xs font-bold p-1.5 outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
                              value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleAddSubtaskSubmit(task.id);
                                if (e.key === 'Escape') { setAddingSubtaskTo(null); setNewSubtaskTitle(''); }
                              }}
                            />
                            <div className="flex gap-1.5">
                              <button onClick={() => { setAddingSubtaskTo(null); setNewSubtaskTitle(''); }} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition">
                                <X size={16} />
                              </button>
                              <button onClick={() => handleAddSubtaskSubmit(task.id)} className="text-[10px] font-black uppercase tracking-widest bg-sky-500 text-white px-4 py-2 rounded-xl active:scale-95 transition shadow-lg shadow-sky-500/20">Add</button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </AnimatePresence>
                </div>

                {completedTasks.length > 0 && (
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                        <div className="w-8 h-px bg-emerald-500/30"></div>
                        Completed High-Ground <span className="text-emerald-500/60 ml-1">({completedTasks.length})</span>
                      </h3>
                    </div>
                    <AnimatePresence mode="popLayout">
                      {completedTasks.map((task: Task) => (
                        <TaskCard key={task.id} task={task} onToggleStatus={toggleStatus} onToggleSubtask={toggleSubtask} onDelete={deleteTask} onAddSubtask={setAddingSubtaskTo} isMobile={isMobile} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-nowrap gap-4 md:gap-6 w-full h-full overflow-x-auto md:overflow-x-visible hide-scrollbar snap-x snap-mandatory md:snap-none pb-4 items-start select-none px-1 py-0.5">
                  {[
                    { id: 'pending', title: 'To Do', items: pendingTasks },
                    { id: 'in_progress', title: 'In Progress', items: inProgressTasks },
                    { id: 'completed', title: 'Done', items: completedTasks }
                  ].map(column => (
                    <div key={column.id} className="bg-slate-50/50 w-[84vw] sm:w-auto md:flex-1 flex-shrink-0 md:flex-shrink rounded-3xl flex flex-col max-h-full border border-slate-200 overflow-hidden transition snap-center">
                      <div className="p-3 md:p-4 flex items-center justify-between border-b border-slate-200/60 bg-white/50 backdrop-blur-xl">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          {column.title}
                          <span className="bg-sky-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm">{column.items.length}</span>
                        </h3>
                      </div>
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef} {...provided.droppableProps}
                            className={`flex-1 p-2 md:p-3 overflow-y-auto hide-scrollbar min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-sky-50/50' : ''}`}
                          >
                            {column.items.map((task: Task, index: number) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                    className={`mb-3 transition-transform ${snapshot.isDragging ? 'z-[5000]' : ''}`}
                                  >
                                    <TaskCard task={task} onToggleStatus={toggleStatus} onToggleSubtask={toggleSubtask} onDelete={deleteTask} onAddSubtask={setAddingSubtaskTo} isMobile={isMobile} />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </DragDropContext>
            )}
          </div>
          <div className="shrink-0 md:col-span-1">
            <div className="glass-premium rounded-3xl shadow-xl shadow-sky-500/5 p-3 md:p-6 md:sticky md:top-0 border-slate-200/40">
              <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
                <h3 className="font-black text-slate-900 text-sm md:text-lg tracking-tight uppercase flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-sky-500 rounded-full"></div>
                  {currentDate.toLocaleString('default', { month: 'long' })}
                  <span className="text-slate-400 font-medium">{currentDate.getFullYear()}</span>
                </h3>
                <div className="flex gap-1">
                  <button onClick={prevMonth} className="p-1.5 hover:bg-sky-50 rounded-xl text-slate-400 hover:text-sky-600 transition-all active:scale-90 border border-transparent hover:border-sky-100">
                    <ChevronLeft size={isMobile ? 16 : 20}/>
                  </button>
                  <button onClick={nextMonth} className="p-1.5 hover:bg-sky-50 rounded-xl text-slate-400 hover:text-sky-600 transition-all active:scale-90 border border-transparent hover:border-sky-100">
                    <ChevronRight size={isMobile ? 16 : 20}/>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 md:mb-5">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="min-h-0">
                <CalendarGrid daysInMonth={daysInMonth} firstDay={firstDay} currentDate={currentDate} holidays={holidays} tasks={tasks} isMobile={isMobile} />
              </div>
              <div className="mt-4 md:mt-8 pt-4 md:pt-6 border-t border-slate-100/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"></div> 
                    Objectives
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{pendingTasks.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> 
                    Holidays
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{holidays.filter(h => h.date.startsWith(currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0'))).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
