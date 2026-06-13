import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

/** How long (ms) before a cached list is considered stale and re-fetched. */
const CACHE_TTL = 300_000; // 5 minutes (saves Disk IO)

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Gamification {
  points: {
    total_points: number;
    level: number;
    streak_days: number;
    title?: string;
  };
  badges: Badge[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  is_private: boolean;
  member_count?: number;
  avatar_url?: string;
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
  subtasks?: any[];
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  created_at: string;
}

interface DataState {
  subjects: string[];
  groups: Group[];
  plannerTasks: Task[];
  upcomingTasks: Task[];
  folders: Folder[];
  gamification: Gamification | null;
  lastFetched: {
    subjects: number;
    groups: number;
    planner: number;
    upcoming: number;
    folders: number;
    gamification: number;
  };
  isServerUnreachable: boolean;
  isInitialLoad: boolean;
  
  // Actions
  setSubjects: (subjects: string[]) => void;
  setGroups: (groups: Group[]) => void;
  setPlannerTasks: (tasks: Task[]) => void;
  setUpcomingTasks: (tasks: Task[]) => void;
  setFolders: (folders: Folder[]) => void;
  setGamification: (data: Gamification) => void;
  setServerUnreachable: (unreachable: boolean) => void;
  invalidateCache: (keys: (keyof DataState['lastFetched'])[]) => void;
  
  // Fetchers
  fetchSubjects: (userId: string, force?: boolean) => Promise<void>;
  fetchGroups: (userId: string, force?: boolean) => Promise<void>;
  fetchPlanner: (userId: string, force?: boolean) => Promise<void>;
  fetchUpcoming: (userId: string, force?: boolean) => Promise<void>;
  fetchFolders: (userId: string, force?: boolean) => Promise<void>;
  fetchGamification: (userId: string) => Promise<void>;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      subjects: [],
      groups: [],
      plannerTasks: [],
      upcomingTasks: [],
      folders: [],
      gamification: null,
      lastFetched: {
        subjects: 0,
        groups: 0,
        planner: 0,
        upcoming: 0,
        folders: 0,
        gamification: 0,
      },
      isServerUnreachable: false,
      isInitialLoad: true,

      setSubjects: (subjects) => set({ 
        subjects, 
        lastFetched: { ...get().lastFetched, subjects: Date.now() },
        isInitialLoad: false
      }),
      
      setGroups: (groups) => set({ 
        groups, 
        lastFetched: { ...get().lastFetched, groups: Date.now() },
        isInitialLoad: false
      }),

      setPlannerTasks: (plannerTasks) => set({
        plannerTasks,
        lastFetched: { ...get().lastFetched, planner: Date.now() },
        isInitialLoad: false
      }),

      setUpcomingTasks: (upcomingTasks) => set({
        upcomingTasks,
        lastFetched: { ...get().lastFetched, upcoming: Date.now() },
        isInitialLoad: false
      }),

      setFolders: (folders) => set({
        folders,
        lastFetched: { ...get().lastFetched, folders: Date.now() },
        isInitialLoad: false
      }),
      
      setGamification: (gamification) => set({ 
        gamification, 
        lastFetched: { ...get().lastFetched, gamification: Date.now() },
        isInitialLoad: false
      }),

      setServerUnreachable: (isServerUnreachable) => set({ isServerUnreachable }),

      invalidateCache: (keys) => set((state) => {
        const newLastFetched = { ...state.lastFetched };
        keys.forEach(k => { newLastFetched[k] = 0; });
        return { lastFetched: newLastFetched };
      }),

      fetchSubjects: async (userId, force = false) => {
        const { lastFetched, subjects } = get();
        if (!force && subjects.length > 0 && Date.now() - lastFetched.subjects < CACHE_TTL) {
          set({ isInitialLoad: false });
          return;
        }

        try {
          const { data, error } = await supabase
            .from('study_materials')
            .select('subject')
            .eq('user_id', userId)
            .eq('is_personal', true)
            .abortSignal(AbortSignal.timeout(10000));
          
          if (error) throw error;
          if (data) {
            const distinct = Array.from(new Set(data.map(d => d.subject)));
            get().setSubjects(distinct);
          }
          set({ isServerUnreachable: false });
        } catch (err) {
          console.error("[DataStore] fetchSubjects failed:", err);
          set({ isServerUnreachable: true, isInitialLoad: false });
        }
      },

      fetchGroups: async (userId, force = false) => {
        const { lastFetched, groups } = get();
        if (!force && groups.length > 0 && Date.now() - lastFetched.groups < CACHE_TTL) {
          set({ isInitialLoad: false });
          return;
        }

        try {
          const { data: memberData, error: memberErr } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', userId)
            .abortSignal(AbortSignal.timeout(10000));

          if (memberErr) throw memberErr;
          if (!memberData || memberData.length === 0) {
            get().setGroups([]);
            set({ isServerUnreachable: false });
            return;
          }

          const groupIds = memberData.map(m => m.group_id);

          const { data: groupsData, error: groupsErr } = await supabase
            .from('groups')
            .select('id, name, description, invite_code, is_private, avatar_url')
            .abortSignal(AbortSignal.timeout(10000))
            .in('id', groupIds);

          if (groupsErr) throw groupsErr;
          if (groupsData) {
            get().setGroups(groupsData as Group[]);
          }
          set({ isServerUnreachable: false });
        } catch (err) {
          console.error("[DataStore] fetchGroups failed:", err);
          set({ isServerUnreachable: true, isInitialLoad: false });
        }
      },

      fetchPlanner: async (userId, force = false) => {
        const { lastFetched, plannerTasks } = get();
        if (!force && plannerTasks.length > 0 && Date.now() - lastFetched.planner < CACHE_TTL) {
          set({ isInitialLoad: false });
          return;
        }

        try {
          // Fetch user's own tasks and group tasks
          const { data: memberData, error: memberErr } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', userId)
            .abortSignal(AbortSignal.timeout(10000));
            
          if (memberErr) throw memberErr;
          const groupIds = memberData?.map(m => m.group_id) || [];

          let query = supabase
            .from('tasks')
            .select('*, groups(name), subtasks(*)')
            .abortSignal(AbortSignal.timeout(15000)) // Larger query, longer timeout
            .order('due_date', { ascending: true });

          if (groupIds.length > 0) {
            query = query.or(`and(group_id.is.null,created_by.eq.${userId}),group_id.in.(${groupIds.join(',')})`);
          } else {
            query = query.eq('created_by', userId).is('group_id', null);
          }

          const { data, error } = await query;
          if (error) throw error;
          if (data) {
            get().setPlannerTasks(data as Task[]);
          }
          set({ isServerUnreachable: false });
        } catch (err) {
          console.error("[DataStore] fetchPlanner failed:", err);
          set({ isServerUnreachable: true, isInitialLoad: false });
        }
      },

      fetchUpcoming: async (userId, force = false) => {
        const { lastFetched, upcomingTasks } = get();
        if (!force && upcomingTasks.length > 0 && Date.now() - lastFetched.upcoming < CACHE_TTL) {
          set({ isInitialLoad: false });
          return;
        }

        try {

          const { data: memberData, error: memberErr } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', userId)
            .abortSignal(AbortSignal.timeout(10000));
            
          if (memberErr) throw memberErr;
          const groupIds = memberData?.map(m => m.group_id) || [];

          let query = supabase
            .from('tasks')
            .select('id, title, due_date, status, group_id, subtasks(id, title, is_completed)')
            .abortSignal(AbortSignal.timeout(10000))
            .neq('status', 'completed')
            .neq('status', 'done')
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(10);

          if (groupIds.length > 0) {
            query = query.or(`and(group_id.is.null,created_by.eq.${userId}),group_id.in.(${groupIds.join(',')})`);
          } else {
            query = query.eq('created_by', userId).is('group_id', null);
          }

          const { data, error } = await query;
          if (error) throw error;
          if (data) {
            get().setUpcomingTasks(data as Task[]);
          }
          set({ isServerUnreachable: false });
        } catch (err) {
          console.error("[DataStore] fetchUpcoming failed:", err);
          set({ isServerUnreachable: true, isInitialLoad: false });
        }
      },

      fetchFolders: async (userId, force = false) => {
        const { lastFetched, folders } = get();
        if (!force && folders.length > 0 && Date.now() - lastFetched.folders < CACHE_TTL) {
          set({ isInitialLoad: false });
          return;
        }

        try {
          const { data, error } = await supabase
            .from('folders')
            .select('*')
            .eq('user_id', userId)
            .abortSignal(AbortSignal.timeout(10000))
            .order('name');
          
          if (error) throw error;
          if (data) {
            get().setFolders(data as Folder[]);
          }
          set({ isServerUnreachable: false });
        } catch (err) {
          console.error("[DataStore] fetchFolders failed:", err);
          set({ isServerUnreachable: true, isInitialLoad: false });
        }
      },

      fetchGamification: async (userId) => {
        try {
          const [{ data: points, error: pointsErr }, { data: userBadgesData, error: badgesErr }] = await Promise.all([
            supabase.from('user_points').select('*').eq('user_id', userId).abortSignal(AbortSignal.timeout(10000)).maybeSingle(),
            supabase.from('user_badges').select('*, badges(*)').eq('user_id', userId).abortSignal(AbortSignal.timeout(10000))
          ]);

          if (pointsErr) throw pointsErr;
          if (badgesErr) throw badgesErr;

          const userBadges = (userBadgesData || []) as any[];

          get().setGamification({
            points: points || { total_points: 0, level: 1, streak_days: 0 },
            badges: userBadges.map(ub => ub.badges)
          });
          set({ isServerUnreachable: false });
        } catch (err) {
          console.error("[DataStore] fetchGamification failed:", err);
          set({ isServerUnreachable: true, isInitialLoad: false });
        }
      },
    }),
    {
      name: 'nemesis-data-cache',
    }
  )
);
