import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useDataStore } from '../../store/useDataStore';
import { CheckSquare, Check, Clock, Plus, ChevronLeft, ChevronRight, LayoutList, Columns, GripVertical, CheckCircle2, Circle, AlertCircle, X, Users } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import CustomDateTimePicker from '../../components/ui/CustomDateTimePicker';
import { motion, AnimatePresence } from 'framer-motion';

interface Holiday {
  date: string;
  localName: string;
  name: string;
}

interface GroupSubtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
}

interface GroupTask {
  id: string;
  title: string;
  description?: string;
  due_date?: string | null;
  status: string;
  created_by: string;
  group_id: string;
  profiles?: { full_name: string };
  subtasks?: GroupSubtask[];
}

export default function GroupPlanner() {
  const { group, role } = useOutletContext<{ group: any; role: string }>();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'tasks'>('tasks');
  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', due_date: '', description: '' });
  
  const [now] = useState(() => Date.now());

  // Subtasks State
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, profiles:created_by(full_name), subtasks(*)')
      .eq('group_id', group.id)
      .order('due_date', { ascending: true });
    
    if (data) setTasks(data as GroupTask[]);
    setLoading(false);
  }, [group.id]);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel(`group-tasks-${group.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id, fetchTasks]);

  const fetchHolidays = useCallback(async (year: number) => {
    // Fallback static holiday dataset since public APIs often lack future data or hit CORS
    const holidaysData = [
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
    setHolidays(holidaysData as Holiday[]);
  }, []);

  useEffect(() => {
    fetchHolidays(currentDate.getFullYear());
  }, [currentDate, fetchHolidays]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !user) return;

    await supabase.from('tasks').insert({
      group_id: group.id,
      created_by: user.id,
      title: newTask.title,
      description: newTask.description,
      due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
      status: 'pending'
    });

    setNewTask({ title: '', due_date: '', description: '' });
    setShowTaskModal(false);
    useDataStore.getState().invalidateCache(['upcoming', 'planner']);
    fetchTasks();
  };

  const toggleTaskStatus = async (task: GroupTask) => {
    const isCurrentlyDone = task.status === 'done' || task.status === 'completed';
    const newStatus = isCurrentlyDone ? 'pending' : 'done';
    
    // optimistically update locally
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    useDataStore.getState().invalidateCache(['upcoming', 'planner']);

    await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id);
  };

  const toggleSubtask = async (taskId: string, subtaskId: string, currentStatus: boolean) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId && t.subtasks) {
        return {
          ...t,
          subtasks: t.subtasks.map((st: GroupSubtask) => st.id === subtaskId ? { ...st, is_completed: !currentStatus } : st)
        };
      }
      return t;
    }));
    await supabase.from('subtasks').update({ is_completed: !currentStatus }).eq('id', subtaskId);
  };

  const addSubtask = async (taskId: string) => {
    if (!newSubtaskTitle.trim()) return;
    
    const tempId = 'temp-' + Date.now();
    const tempSubtask = { id: tempId, title: newSubtaskTitle, is_completed: false, task_id: taskId };
    
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, subtasks: [...(t.subtasks || []), tempSubtask] };
      }
      return t;
    }));
    
    const titleToSave = newSubtaskTitle;
    setNewSubtaskTitle('');
    setAddingSubtaskTo(null);

    const { data } = await supabase.from('subtasks').insert({
      task_id: taskId,
      title: titleToSave,
      is_completed: false
    }).select().single();

    if (data) {
      setTasks(currentTasks => currentTasks.map(t => {
        if (t.id === taskId && t.subtasks) {
          return {
            ...t,
            subtasks: t.subtasks.map((st: GroupSubtask) => st.id === tempId ? data as GroupSubtask : st)
          };
        }
        return t;
      }));
    }
  };

  const isOverdue = (dateString: string | null | undefined, status: string) => {
    if (!dateString || status === 'done' || status === 'completed') return false;
    return new Date(dateString) < new Date();
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'completed');

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    // Optimsitic UI Update
    const newStatus = destination.droppableId;
    setTasks(tasks.map(t => t.id === draggableId ? { ...t, status: newStatus } : t));
    useDataStore.getState().invalidateCache(['upcoming', 'planner']);

    // Database Sync
    await supabase.from('tasks').update({ status: newStatus }).eq('id', draggableId);
  };

  // Calendar logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const calendarGrid = useMemo(() => {
    return (
      <div className="grid grid-cols-7 gap-1 relative z-0">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10"></div>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const todayDt = new Date();
          const todayStr = `${todayDt.getFullYear()}-${String(todayDt.getMonth() + 1).padStart(2, '0')}-${String(todayDt.getDate()).padStart(2, '0')}`;
          
          const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          const isToday = dayStr === todayStr;
          const holiday = holidays.find(h => h.date === dayStr);
          
          const dayTasks = tasks.filter(t => t.due_date && t.due_date.startsWith(dayStr) && t.status !== 'completed' && t.status !== 'done');
          const showTooltip = holiday || dayTasks.length > 0;
          
          return (
            <motion.div 
              key={i} 
              whileHover={{ scale: 1.1, zIndex: 10 }}
              className={`h-10 rounded-xl flex flex-col items-center justify-center relative border transition-all duration-300 cursor-pointer ${isToday ? 'bg-sky-500 text-white border-sky-400 shadow-lg glow-sky' : 'bg-white/40 dark:bg-slate-800/40 cyberpunk:bg-black/40 text-slate-700 dark:text-slate-300 cyberpunk:text-emerald-500 border-slate-100/50 dark:border-slate-700/50 cyberpunk:border-emerald-500/30 hover:bg-white dark:hover:bg-slate-700 cyberpunk:hover:bg-emerald-500/20 hover:border-sky-200/50'} group`}
            >
              <span className={`text-xs sm:text-sm font-bold ${isToday ? 'text-white' : 'text-slate-700 dark:text-slate-300 cyberpunk:text-emerald-500'}`}>{i + 1}</span>
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
  }, [firstDay, daysInMonth, currentDate, holidays, tasks]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <div className="px-4 py-3 md:px-8 md:py-6 border-b border-slate-200/40 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            className={`px-4 py-2 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all duration-300 shadow-sm ${activeTab === 'tasks' ? 'bg-sky-500 text-white shadow-sky-500/20 glow-sky' : 'text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-600 hover:bg-white/80 dark:hover:bg-slate-800/80 cyberpunk:hover:bg-emerald-500/10 glass-premium border-slate-200/30 dark:border-slate-700/30 cyberpunk:border-emerald-500/30'}`}
            onClick={() => setActiveTab('tasks')}
          >
            <CheckSquare size={16} /> Strategy
          </button>
          
          <div className="flex glass-premium p-1 rounded-xl border-slate-200/30 shadow-inner">
            <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 cyberpunk:bg-emerald-900/50 shadow-md text-sky-600' : 'text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-600 hover:text-slate-900 dark:hover:text-white cyberpunk:hover:text-emerald-300'}`}>
              <LayoutList size={16}/> List
            </button>
            <button onClick={() => setViewMode('board')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${viewMode === 'board' ? 'bg-white dark:bg-slate-800 cyberpunk:bg-emerald-900/50 shadow-md text-sky-600' : 'text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-600 hover:text-slate-900 dark:hover:text-white cyberpunk:hover:text-emerald-300'}`}>
              <Columns size={16}/> Board
            </button>
          </div>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowTaskModal(true)}
          className="w-full sm:w-auto px-8 py-2.5 flex items-center justify-center bg-sky-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-sky-600 transition-all text-xs shadow-xl shadow-sky-500/20 border border-sky-400/50"
        >
          <Plus size={18} strokeWidth={3} /> <span className="ml-2">Initialize Mission</span>
        </motion.button>
      </div>

      <div className="flex-1 min-h-0 p-3 md:p-6 bg-slate-50/30 dark:bg-slate-900/30 cyberpunk:bg-black/30">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 md:gap-6 min-h-0">
        {viewMode === 'list' ? (
          <div className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-slate-200 rounded-xl w-full" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-6 md:py-12 text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-600 border border-dashed border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/50 rounded-xl bg-white dark:bg-slate-900 cyberpunk:bg-black flex flex-col items-center justify-center h-full">
                <CheckSquare className="text-slate-300 dark:text-slate-700 cyberpunk:text-emerald-900 mb-2 md:mb-4" size={40} />
                <p className="font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 text-sm md:text-base uppercase tracking-widest">No tasks yet</p>
                <p className="text-[10px] md:text-sm px-4">Create a task to coordinate with your group.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4 pb-20">
                <AnimatePresence mode="popLayout" initial={false}>
                  {tasks.map((task, index) => {
                    const completedSubtasks = task.subtasks?.filter((st: GroupSubtask) => st.is_completed).length || 0;
                    const totalSubtasks = task.subtasks?.length || 0;
                    const progressWidth = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
                    const isDone = task.status === 'done' || task.status === 'completed';
                    const isUrgent = task.due_date && !isDone && (new Date(task.due_date).getTime() - now < 24 * 60 * 60 * 1000);
                    
                    return (
                      <motion.div 
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -2 }}
                        className={`flex flex-col relative overflow-hidden rounded-3xl border transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-sky-500/10 ${
                          isDone ? 'bg-slate-50/50 border-slate-100/50 opacity-60' : 
                          isUrgent ? 'bg-orange-50/5 border-orange-200/50 hover:border-orange-400/50' : 'glass-premium border-slate-200/40 hover:border-sky-300/50'
                        }`}
                      >
                        <div className="p-4 md:p-5 flex items-start gap-4 z-10 w-full relative">
                          {totalSubtasks > 0 && (
                            <div className="absolute top-0 left-0 h-1 bg-slate-100/30 transition duration-500 w-full overflow-hidden">
                               <div className="h-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.8)] animate-shimmer" style={{ width: `${progressWidth}%`, backgroundSize: '200% 100%' }}></div>
                            </div>
                          )}
                          
                          {role === 'admin' || user?.id === task.created_by ? (
                            <button 
                              onClick={() => toggleTaskStatus(task)}
                              className={`mt-1 shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-300 transform active:scale-90 z-10 ${
                                isDone ? 'bg-emerald-500 border-emerald-500 text-white glow-emerald shadow-lg' : 'bg-white/50 border-slate-300/50 hover:border-sky-500 text-transparent hover:text-sky-500'
                              }`}
                            >
                              <Check size={14} strokeWidth={3} />
                            </button>
                          ) : isDone ? (
                            <div className="mt-1 shrink-0 w-6 h-6 flex items-center justify-center z-10 text-emerald-500">
                              <CheckCircle2 size={20} />
                            </div>
                          ) : null}
                          
                          <div className="flex-1 min-w-0 z-10 pt-0.5">
                            <h3 className={`font-black tracking-tight text-sm md:text-base transition-colors duration-300 ${isDone ? 'line-through text-slate-400 dark:text-slate-600 cyberpunk:text-emerald-900' : 'text-slate-900 dark:text-white cyberpunk:text-emerald-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 cyberpunk:group-hover:text-emerald-300'} flex items-center gap-2 flex-wrap`}>
                              {task.title}
                              {isUrgent && <AlertCircle className="text-orange-500 animate-pulse" size={14} />}
                            </h3>
                            {task.description && (
                              <p className={`text-xs md:text-sm mt-1.5 font-medium line-clamp-2 leading-relaxed transition-all duration-300 ${isDone ? 'text-slate-400 opacity-60' : 'text-slate-500 group-hover:text-slate-600'}`}>
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-4 flex-wrap">
                              {task.due_date && (
                                <div className={`flex items-center gap-1.5 whitespace-nowrap font-black uppercase tracking-[0.15em] text-[8px] md:text-[10px] px-2.5 py-1 rounded-full border ${isUrgent ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-500/30 glow-orange' : isDone ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700' : 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 border-sky-100 dark:border-sky-800 glow-sky'}`}>
                                  <Clock size={10} /> {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950/30 border border-slate-100/50 dark:border-slate-700/50 cyberpunk:border-emerald-500/20 px-2.5 py-1 rounded-full">
                                <Users size={10} className="text-sky-400 cyberpunk:text-emerald-500" />
                                <span>Tactical: <span className="text-slate-900 dark:text-white cyberpunk:text-emerald-400">{task.profiles?.full_name?.split(' ')[0]}</span></span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Subtasks UI */}
                        <div className="w-full pl-[60px] pr-5 pb-5 relative z-10">
                          <AnimatePresence mode="popLayout">
                            {task.subtasks && task.subtasks.length > 0 && (
                              <div className="space-y-2 mb-4">
                                {task.subtasks.map((st: GroupSubtask) => (
                                  <motion.div 
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={st.id} 
                                    className="flex items-center gap-2.5 group/st"
                                  >
                                    {role === 'admin' || user?.id === task.created_by ? (
                                    <button onClick={() => toggleSubtask(task.id, st.id, st.is_completed)} className={`flex-shrink-0 transition-all duration-300 transform active:scale-90 ${st.is_completed ? 'text-emerald-500 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'text-slate-300 hover:text-sky-500'}`}>
                                      {st.is_completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                    </button>
                                  ) : st.is_completed ? (
                                    <div className="flex-shrink-0 text-emerald-500">
                                      <CheckCircle2 size={16} />
                                    </div>
                                  ) : null}
                                    <span className={`text-[11px] md:text-xs font-semibold transition-all duration-300 ${st.is_completed ? 'text-slate-400 line-through decoration-slate-300/50 italic opacity-70' : 'text-slate-600 group-hover/st:text-slate-900 duration-200'}`}>{st.title}</span>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </AnimatePresence>
                          
                          {addingSubtaskTo === task.id ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-3 bg-white/80 dark:bg-slate-900/80 cyberpunk:bg-black backdrop-blur-xl p-3 rounded-2xl border border-sky-100 dark:border-slate-800 cyberpunk:border-emerald-500/50 shadow-xl shadow-sky-500/5 relative z-20"
                            >
                              <input
                                type="text"
                                autoFocus
                                placeholder="Micro-target title..."
                                className="flex-1 text-xs font-bold p-1.5 outline-none bg-transparent text-slate-900 dark:text-white cyberpunk:text-emerald-400 placeholder:text-slate-400"
                                value={newSubtaskTitle}
                                onChange={e => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') addSubtask(task.id);
                                  if (e.key === 'Escape') { setAddingSubtaskTo(null); setNewSubtaskTitle(''); }
                                }}
                              />
                              <div className="flex gap-2">
                                <button onClick={() => { setAddingSubtaskTo(null); setNewSubtaskTitle(''); }} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition">
                                  <X size={16} />
                                </button>
                                <button onClick={() => addSubtask(task.id)} className="text-[10px] font-black uppercase tracking-widest bg-sky-500 text-white px-4 py-2 rounded-xl active:scale-95 transition shadow-lg shadow-sky-500/20">Add</button>
                              </div>
                            </motion.div>
                          ) : (
                            <button 
                              onClick={() => setAddingSubtaskTo(task.id)}
                              className="text-[10px] font-black text-sky-500 hover:text-white flex items-center gap-1.5 mt-1 opacity-100 transition-all duration-300 uppercase tracking-widest bg-sky-50/50 hover:bg-sky-500 px-3 py-1.5 rounded-xl border border-sky-100/50 hover:border-sky-500 hover:shadow-lg hover:shadow-sky-500/20 active:scale-95"
                            >
                              <Plus size={12} strokeWidth={3} /> Micro-target
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-3">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full md:h-[calc(100vh-200px)] md:min-h-[600px] md:overflow-x-auto md:pb-4 items-start select-none">
                
                {[
                  { id: 'pending', title: 'To Do', items: pendingTasks },
                  { id: 'in_progress', title: 'In Progress', items: inProgressTasks },
                  { id: 'done', title: 'Done', items: completedTasks }
                ].map(column => (
                  <div key={column.id} className="bg-slate-200/60 dark:bg-slate-800/40 cyberpunk:bg-emerald-500/5 w-full md:w-72 lg:w-80 flex-shrink-0 rounded-2xl flex flex-col md:max-h-full border border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/20">
                    <div className="p-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900 cyberpunk:bg-black rounded-t-2xl">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        {column.title}
                        <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold">{column.items.length}</span>
                      </h3>
                    </div>
                    
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.droppableProps}
                          className={`flex-1 p-3 overflow-y-auto min-h-[200px] transition-colors ${snapshot.isDraggingOver ? 'bg-sky-50' : ''}`}
                        >
                          {column.items.map((task, index) => {
                            const completedSubtasks = task.subtasks?.filter((st: GroupSubtask) => st.is_completed).length || 0;
                            const totalSubtasks = task.subtasks?.length || 0;
                            const progressWidth = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
                            const overdue = isOverdue(task.due_date, task.status);
                            
                            return (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`mb-3 bg-white dark:bg-slate-800 cyberpunk:bg-black/60 rounded-xl shadow-sm border ${snapshot.isDragging ? 'shadow-xl border-sky-400 rotate-2' : 'border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/30 hover:border-sky-300 dark:hover:border-sky-500 cyberpunk:hover:border-emerald-400'} p-4 group flex flex-col gap-2`}
                                  >
                                    {totalSubtasks > 0 && (
                                      <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full w-full overflow-hidden mb-1">
                                         <div className="h-full bg-sky-400" style={{ width: `${progressWidth}%` }}></div>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className={`font-semibold ${column.id === 'done' ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-200 cyberpunk:text-emerald-400'}`}>
                                        {task.title}
                                      </h4>
                                      <GripVertical size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                                    </div>

                                    <div className="flex flex-col gap-2 mt-2">
                                      {task.profiles?.full_name && (
                                        <div className="text-[10px] text-slate-500 font-medium">
                                          via {task.profiles.full_name}
                                        </div>
                                      )}
                                      
                                      {task.due_date && (
                                        <div className={`flex items-center gap-1 text-[11px] font-medium w-max px-2 py-1 rounded inline-flex ${column.id === 'done' ? 'text-slate-400 bg-slate-100 dark:bg-slate-700 dark:text-slate-500' : overdue ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 cyberpunk:text-emerald-400' : 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 cyberpunk:text-emerald-500'}`}>
                                          <Clock size={12} />
                                          {new Date(task.due_date).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          </div>
        )}
        
        {viewMode === 'list' && (
          <div className="lg:col-span-1 min-h-0 flex flex-col pb-16">
            <div className="glass-premium rounded-3xl border-slate-200/40 dark:border-slate-800/40 cyberpunk:border-emerald-500/30 p-4 md:p-6 flex flex-col h-full overflow-hidden shadow-xl shadow-sky-500/5">
              <div className="flex items-center justify-between mb-6 shrink-0 border-b border-slate-100/60 dark:border-slate-800/60 cyberpunk:border-emerald-500/20 pb-4">
                <h3 className="font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 text-sm md:text-lg uppercase tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-sky-500 rounded-full"></div>
                  {currentDate.toLocaleString('default', { month: 'long' })}
                  <span className="text-slate-400 font-medium ml-1">{currentDate.getFullYear()}</span>
                </h3>
                <div className="flex gap-1.5">
                  <button onClick={prevMonth} className="p-2 hover:bg-sky-50 rounded-xl text-slate-400 hover:text-sky-600 transition-all border border-transparent hover:border-sky-100 active:scale-90"><ChevronLeft size={18}/></button>
                  <button onClick={nextMonth} className="p-2 hover:bg-sky-50 rounded-xl text-slate-400 hover:text-sky-600 transition-all border border-transparent hover:border-sky-100 active:scale-90"><ChevronRight size={18}/></button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 shrink-0">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
              </div>
              
              <div className="flex-1 min-h-0">
                {calendarGrid}

                <div className="mt-8 pt-6 border-t border-slate-100/60 space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"></div> Shared Goal
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700 cyberpunk:border-emerald-500/30">{pendingTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> Public Holiday
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700 cyberpunk:border-emerald-500/30">{holidays.filter(h => h.date.startsWith(currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0'))).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="bg-white dark:bg-slate-900 cyberpunk:bg-black rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/50 relative z-[1001] animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 mb-4">Add Group Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 cyberpunk:text-emerald-400 uppercase tracking-widest mb-1.5">Task Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50 dark:bg-slate-800 cyberpunk:bg-black font-medium dark:text-white cyberpunk:text-emerald-400 transition"
                  value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
                  placeholder="What needs to be done?"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 cyberpunk:text-emerald-400 uppercase tracking-widest mb-1.5">Description (Optional)</label>
                <textarea 
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50 dark:bg-slate-800 cyberpunk:bg-black font-medium dark:text-white cyberpunk:text-emerald-400 transition min-h-[100px]"
                  value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Add more details..."
                />
              </div>
              <div>
                <CustomDateTimePicker
                  value={newTask.due_date}
                  onChange={val => setNewTask({...newTask, due_date: val})}
                  label="Due Date"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 font-medium">Add Task</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
