import { supabase } from './supabase';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';
import { db } from './db';
import { SYNC_SHARDS, fetchShardData, syncShardsToCloud, type SyncShard } from './gdrive';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface SyncStatus {
  state: SyncState;
  lastSyncAt: Date | null;
  error?: string;
  progress?: number;
}

type SyncListener = (status: SyncStatus) => void;

class SyncEngine {
  private status: SyncStatus = {
    state: 'idle',
    lastSyncAt: null
  };

  private listeners = new Set<SyncListener>();
  private dirtyShards = new Set<SyncShard>();
  private syncTimeout: any = null;
  private isInitialized = false;

  constructor() {
    // Initialization happens via initialize() called from a global entry point
  }

  public async initialize() {
    if (this.isInitialized) return;
    
    const user = useAuthStore.getState().user;
    if (!user) return;

    this.isInitialized = true;
    this.initializeListeners(user.id);
    this.initializeLifecycleListeners();
    this.requestStoragePersistence();
    this.pruneLocalDatabase();
    
    // Load initial sync status from profile
    const profile = useAuthStore.getState().profile;
    if (profile?.gdrive_backup_status?.last_backup_at) {
      this.status.lastSyncAt = new Date(profile.gdrive_backup_status.last_backup_at);
      this.notify();
    }
    
    // Initial catch-up sync (3s after load to avoid resource competition)
    setTimeout(() => this.checkAndSyncIfStale(), 3000);

    // Periodic catch-up check (every 1 hour) to ensure 24h backup guarantee
    setInterval(() => this.checkAndSyncIfStale(), 60 * 60 * 1000);
  }

  private async initializeListeners(userId: string) {
    // Listen for changes across all relevant tables
    // We use a single channel for efficiency
    supabase.channel('sync-engine-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, (payload) => {
        // payload.new is not always present for DELETE events, check carefully
        const data = (payload.new || payload.old) as any;
        if (data && (data.sender_id === userId || data.receiver_id === userId)) {
          this.markDirty(SYNC_SHARDS.MESSAGES);
          this.broadcast('direct_messages', payload);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_materials', filter: `user_id=eq.${userId}` }, (payload) => {
        this.markDirty(SYNC_SHARDS.ORGANIZER);
        this.broadcast('study_materials', payload);
      })

      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `created_by=eq.${userId}` }, (payload) => {
        this.markDirty(SYNC_SHARDS.PLANNER);
        this.broadcast('tasks', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, (payload) => {
        // Subtasks don't have user_id column, RLS will handle visibility.
        this.markDirty(SYNC_SHARDS.PLANNER);
        this.broadcast('subtasks', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, (payload) => {
        this.markDirty(SYNC_SHARDS.PROFILE);
        this.broadcast('profiles', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_points', filter: `user_id=eq.${userId}` }, (payload) => {
        this.markDirty(SYNC_SHARDS.PROFILE);
        this.broadcast('user_points', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_badges', filter: `user_id=eq.${userId}` }, (payload) => {
        this.markDirty(SYNC_SHARDS.PROFILE);
        this.broadcast('user_badges', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, (payload) => {
        this.markDirty(SYNC_SHARDS.GROUPS);
        this.broadcast('groups', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${userId}` }, (payload) => {
        this.markDirty(SYNC_SHARDS.GROUPS);
        this.broadcast('group_members', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        // Group messages - we listen to all and mark GROUPS dirty.
        // RLS will ensure we only see what we should.
        this.markDirty(SYNC_SHARDS.GROUPS);
        this.broadcast('messages', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reads', filter: `user_id=eq.${userId}` }, (payload) => {
        this.markDirty(SYNC_SHARDS.GROUPS);
        this.broadcast('message_reads', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, (payload) => {
        this.markDirty(SYNC_SHARDS.GROUPS);
        this.broadcast('files', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, (payload) => {
        this.markDirty(SYNC_SHARDS.ORGANIZER); // Folders can be organizer or group
        this.broadcast('folders', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
        // Announcements are often group-based
        this.markDirty(SYNC_SHARDS.GROUPS);
        this.broadcast('announcements', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        this.broadcast('user_notifications', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pomodoro_sessions', filter: `user_id=eq.${userId}` }, (payload) => {
        this.markDirty(SYNC_SHARDS.PLANNER);
        this.broadcast('pomodoro_sessions', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whiteboards', filter: `user_id=eq.${userId}` }, (payload) => {
        this.markDirty(SYNC_SHARDS.ORGANIZER);
        this.broadcast('whiteboards', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes', filter: `user_id=eq.${userId}` }, (payload) => {
        this.markDirty(SYNC_SHARDS.ORGANIZER);
        this.broadcast('quizzes', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flashcard_decks', filter: `user_id=eq.${userId}` }, (payload) => {
        this.markDirty(SYNC_SHARDS.ORGANIZER);
        this.broadcast('flashcard_decks', payload);
      })
      .subscribe();
    
    console.log('[SyncEngine] Unified real-time hub initialized.');
  }

  private broadcast(table: string, payload: any) {
    window.dispatchEvent(new CustomEvent('nemesis_sync', {
      detail: { table, payload }
    }));
  }

  private initializeLifecycleListeners() {
    // Listen for Network Changes
    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) {
        console.log('[SyncEngine] Network restored. Checking sync status...');
        this.checkAndSyncIfStale();
      }
    });

    // Listen for App Lifecycle (Foreground/Resume)
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        console.log('[SyncEngine] App resumed. Checking sync status...');
        this.checkAndSyncIfStale();
      }
    });
  }

  private async requestStoragePersistence() {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      if (!isPersisted) {
        // Only warn in production environments where persistence is expected to work
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          console.warn('[SyncEngine] Storage persistence not granted. Browser may clear local cache if disk is full.');
        }
      } else {
        console.log('[SyncEngine] Storage persistence granted.');
      }
    }
  }

  private async pruneLocalDatabase() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoDate = thirtyDaysAgo.toISOString();
    
    try {
      const count = await db.messages
        .where('created_at')
        .below(isoDate)
        .and(msg => msg.is_pending !== true)
        .delete();
        
      if (count > 0) console.log(`[SyncEngine] Pruned ${count} old local messages.`);
    } catch (e) {
      console.error('[SyncEngine] Pruning failed:', e);
    }
  }

  public subscribe(fn: SyncListener): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.status));
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Marks a specific data shard as dirty and queues a sync.
   */
  public markDirty(shardId: SyncShard) {
    this.dirtyShards.add(shardId);
    this.queueSync();
  }

  private queueSync() {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    
    // 10s debounce to avoid spamming Google Drive API
    this.syncTimeout = setTimeout(() => {
      this.performSync();
    }, 10000);
  }

  public async performSync() {
    // Only return if we're already mid-flight (progress > 5)
    if (this.status.state === 'syncing' && (this.status.progress ?? 0) > 5) {
      console.log('[SyncEngine] Sync already mid-flight, skipping redundant trigger.');
      return;
    }

    // Check if server is reachable before starting
    const isUnreachable = useDataStore.getState().isServerUnreachable;
    if (isUnreachable) {
      console.log('[SyncEngine] Supabase is unreachable. Postponing sync.');
      this.status = { ...this.status, state: 'offline', error: 'Server unreachable' };
      this.notify();
      return;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      // Update status immediately for UI feedback
      if (this.status.state !== 'syncing') {
        this.status = { ...this.status, state: 'syncing', progress: 5 };
        this.notify();
      }

      // Check connection
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('gdrive_refresh_token')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile?.gdrive_refresh_token) {
        this.status = { ...this.status, state: 'offline', error: 'Google Drive not connected' };
        this.notify();
        return;
      }

      // Snapshot dirty shards
      const shardsToProcess = Array.from(this.dirtyShards);
      if (shardsToProcess.length === 0) {
        this.status = { ...this.status, state: 'idle', progress: 100 };
        this.notify();
        return;
      }

      console.log(`[SyncEngine] Syncing ${shardsToProcess.length} shards...`);
      let hasError = false;
      let errorMsg = '';

      // 1. Fetch data in parallel
      const shardDataResults = await Promise.all(shardsToProcess.map(async (shardId) => {
        try {
          const content = await fetchShardData(user.id, shardId);
          return { shardId, content, error: null };
        } catch (err: any) {
          return { shardId, content: null, error: err.message };
        }
      }));

      const fetchErrors = shardDataResults.filter(r => r.error);
      if (fetchErrors.length > 0) {
        throw new Error(`Data fetch failed: ${fetchErrors[0].error}`);
      }

      // 2. Prepare batch
      const batch = shardDataResults
        .filter(r => r.content)
        .map(r => ({
          fileId: r.shardId,
          fileName: `${r.shardId.toLowerCase()}.json`,
          content: r.content
        }));

      if (batch.length === 0) {
        console.log('[SyncEngine] No dirty shards to sync. Cloud is up-to-date.');
        this.status = { ...this.status, state: 'synced', progress: 100, lastSyncAt: new Date() };
        this.notify();
        return;
      }

      // 3. Send to Cloud
      this.status = { ...this.status, progress: 20 }; 
      this.notify();

      const progressInterval = setInterval(() => {
        const currentProgress = this.status.progress ?? 0;
        if (currentProgress < 90) {
          this.status = { ...this.status, progress: currentProgress + 2 };
          this.notify();
        }
      }, 500);

      try {
        const results = await syncShardsToCloud(batch);
        clearInterval(progressInterval);
        
        for (const res of results) {
          if (res.status === 'success' || res.status === 'skipped') {
            this.dirtyShards.delete(res.fileId as any);
          } else if (res.status === 'error') {
            hasError = true;
            errorMsg = res.error;
          }
        }
      } catch (cloudErr: any) {
        clearInterval(progressInterval);
        throw cloudErr;
      }

      // 4. Finalize
      if (hasError) {
        this.status = { ...this.status, state: 'error', error: errorMsg };
      } else {
        // Refresh profile to get the new last_backup_at from Edge Function
        await useAuthStore.getState().refreshProfile();
        const updatedProfile = useAuthStore.getState().profile;
        const now = updatedProfile?.gdrive_backup_status?.last_backup_at 
          ? new Date(updatedProfile.gdrive_backup_status.last_backup_at) 
          : new Date();
          
        this.status = { state: 'synced', lastSyncAt: now, error: undefined, progress: 100 };
      }
      this.notify();

    } catch (err: any) {
      console.error('[SyncEngine] Critical Sync Error:', err);
      this.status = { ...this.status, state: 'error', error: err.message || 'Synchronization failed' };
      this.notify();
    }
  }

  private checkAndSyncIfStale() {
    const now = Date.now();
    const lastSyncTime = this.status.lastSyncAt?.getTime() || 0;
    const msSinceLastSync = now - lastSyncTime;

    // 1. If no sync in 24 hours, force a full backup
    if (msSinceLastSync > 24 * 60 * 60 * 1000) {
      console.log('[SyncEngine] Backup is older than 24h, forcing full cloud synchronization...');
      this.forceFullBackup();
      return;
    }

    // 2. If no sync in 5 minutes, run a lightweight delta catch-up first,
    //    then kick off the normal dirty-shard sync.
    if (msSinceLastSync > 5 * 60 * 1000) {
      console.log('[SyncEngine] Background check: Running delta catch-up then syncing pending changes...');
      this.catchUpServerChanges().then(() => this.performSync());
    }
  }

  public async forceFullBackup() {
    // Early-exit if Drive is not connected — avoids a DB query on every app load
    // for users who haven't connected Google Drive.
    const user = useAuthStore.getState().user;
    if (!user) return;
    // Set syncing status immediately for instant UI feedback
    // Mark all shards as dirty and sync
    (Object.keys(SYNC_SHARDS) as SyncShard[]).forEach(s => this.dirtyShards.add(s));
    
    // We don't await performSync here to allow the initial 0-5% state update to hit the UI immediately
    // performSync handles its own status updates.
    this.performSync();
  }

  /**
   * Lightweight delta-sync: fetches only rows created after the last known
   * sync timestamp and merges them into the local IndexedDB / data store.
   *
   * Strategy note: `updated_at` columns are absent on most tables in this
   * project. We therefore use `created_at` as the cutoff — this catches any
   * new inserts from other devices or server-side operations that occurred
   * while this client was offline or inactive. It does NOT catch in-place
   * updates to existing rows (those are handled by the real-time subscription
   * channel in initializeListeners, which covers the online case).
   */
  public async catchUpServerChanges(): Promise<void> {
    const user = useAuthStore.getState().user;
    const lastSyncAt = this.status.lastSyncAt;
    if (!user || !lastSyncAt) {
      // No baseline to diff against — skip; forceFullBackup handles the cold-start.
      return;
    }

    const since = lastSyncAt.toISOString();
    console.log(`[SyncEngine] Delta catch-up: fetching changes since ${since}`);

    try {
      // ── Tables with reliable `created_at` ────────────────────────────────
      const [materials, folders, tasks, _subtasks, messages] = await Promise.all([
        supabase.from('study_materials')
          .select('*').eq('user_id', user.id).eq('is_personal', true)
          .gt('created_at', since),
        supabase.from('folders')
          .select('*').eq('user_id', user.id)
          .gt('created_at', since),
        supabase.from('tasks')
          .select('*, subtasks(*)')
          .eq('created_by', user.id)
          .gt('created_at', since),
        supabase.from('subtasks')
          .select('*')
          .gt('created_at', since),
        supabase.from('direct_messages')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .gt('created_at', since),
      ]);

      const ops: Promise<any>[] = [];

      // Merge tasks + subtasks into IndexedDB
      if (tasks.data?.length) {
        ops.push(db.tasks.bulkPut(tasks.data as any[]));
        console.log(`[SyncEngine] Delta: merged ${tasks.data.length} new task(s) into IndexedDB.`);
      }
      if (messages.data?.length) {
        ops.push(db.messages.bulkPut(messages.data as any[]));
        console.log(`[SyncEngine] Delta: merged ${messages.data.length} new message(s) into IndexedDB.`);
      }

      await Promise.all(ops);

      // For materials and folders (no IndexedDB table), signal the UI to re-fetch.
      const hasMaterialChanges = (materials.data?.length ?? 0) + (folders.data?.length ?? 0) > 0;
      const hasAnyChanges = ops.length > 0 || hasMaterialChanges;

      if (hasAnyChanges) {
        window.dispatchEvent(new CustomEvent('nemesis_catchup_complete', {
          detail: {
            tasks: tasks.data?.length ?? 0,
            materials: materials.data?.length ?? 0,
            folders: folders.data?.length ?? 0,
            messages: messages.data?.length ?? 0,
          }
        }));
        console.log('[SyncEngine] Delta catch-up complete. UI notified via nemesis_catchup_complete.');
      } else {
        console.log('[SyncEngine] Delta catch-up: no new changes found.');
      }
    } catch (err: any) {
      // Non-fatal: log and continue. The next full backup will reconcile.
      console.warn('[SyncEngine] Delta catch-up failed (non-fatal):', err.message);
    }
  }
}

export const syncEngine = new SyncEngine();
