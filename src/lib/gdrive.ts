import { supabase } from './supabase';
import { tokenManager } from './tokenManager';
import { useAuthStore } from '../store/useAuthStore';

export const SYNC_SHARDS = {
  MESSAGES: 'MESSAGES',
  ORGANIZER: 'ORGANIZER',
  PLANNER: 'PLANNER',
  PROFILE: 'PROFILE',
  GROUPS: 'GROUPS'
} as const;

export type SyncShard = keyof typeof SYNC_SHARDS;

export const UPLOADS_FOLDER_NAME = 'Nemesis_Uploads';

export interface GDriveQuota {
  limit: number;
  usage: number;
  nemesis_usage?: number;
  last_backup_at?: string | null;
}

/**
 * Fetches all local data for a specific shard from Supabase.
 * This is what will be backed up to Google Drive.
 */
export async function fetchShardData(userId: string, shard: SyncShard) {
  switch (shard) {
    case 'MESSAGES': {
      // Direct messages are in direct_messages table. 
      // Group messages are in messages table but usually synced via GROUPS shard.
      // We focus on personal DMs here.
      const { data: messages } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });
        
      return { messages };
    }
    case 'ORGANIZER': {
      const [materials, folders] = await Promise.all([
        supabase.from('study_materials').select('*').eq('user_id', userId),
        supabase.from('folders').select('*').eq('user_id', userId)
      ]);
      return { materials: materials.data, folders: folders.data };
    }
    case 'PLANNER': {
      // Subtasks don't have user_id, they link to tasks.
      const { data: tasks } = await supabase.from('tasks').select('*').eq('created_by', userId);
      const taskIds = tasks?.map(t => t.id) || [];
      
      const { data: subtasks } = taskIds.length > 0 
        ? await supabase.from('subtasks').select('*').in('task_id', taskIds)
        : { data: [] };

      return { tasks, subtasks };
    }
    case 'PROFILE': {
      const [profile, points, badges] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_points').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_badges').select('*, badges(*)').eq('user_id', userId)
      ]);
      return { profile: profile.data, points: points.data, badges: badges.data };
    }
    case 'GROUPS': {
      // Fetch groups where user is a member
      const { data: memberships } = await supabase
        .from('group_members')
        .select('*')
        .eq('user_id', userId);
      
      const groupIds = memberships?.map(m => m.group_id) || [];
      
      if (groupIds.length === 0) return { groups: [], announcements: [], memberships: [], messages: [], message_reads: [] };

      const [groups, announcements, messages, reads] = await Promise.all([
        supabase.from('groups').select('*').in('id', groupIds),
        supabase.from('announcements').select('*').eq('is_active', true),
        supabase.from('messages').select('*').in('group_id', groupIds),
        supabase.from('message_reads').select('*').eq('user_id', userId)
      ]);
      return { 
        groups: groups.data, 
        announcements: announcements.data,
        memberships,
        messages: messages.data,
        message_reads: reads.data
      };
    }
    default:
      return null;
  }
}

/**
 * Invokes the gdrive-sync Edge Function with a BATCH of shards.
 * This is much faster than individual calls.
 */
export async function syncShardsToCloud(shards: { fileId: string, fileName: string, content: any }[]) {
  const { data, error } = await supabase.functions.invoke('gdrive-sync', {
    body: { shards }
  });

  if (error) throw new Error(error.message);
  if (data?.status === 'error') throw new Error(data.error);
  
  return data.results;
}

/**
 * Invokes the gdrive-sync Edge Function to upload a shard.
 * Refactored to use the batching function internally for consistency.
 */
export async function syncShardToCloud(shard: SyncShard, content: any) {
  const results = await syncShardsToCloud([{
    fileId: shard,
    fileName: `${shard.toLowerCase()}.json`,
    content
  }]);
  return results[0];
}

/**
 * Lists files in the appDataFolder to see what's available for restoration.
 */
export async function listCloudBackups() {
  const { data, error } = await supabase.functions.invoke('drive-fetch', {
    body: { action: 'list' }
  });
  
  if (error) throw error;
  return data.files || [];
}

/**
 * Fetches storage quota information from Google Drive.
 */
export async function fetchGDriveStatus(): Promise<{ quota: GDriveQuota | null; error?: string }> {
  const { data, error } = await supabase.functions.invoke('drive-fetch', {
    body: { action: 'status' }
  });

  if (error) return { quota: null, error: error.message };
  return { quota: data.quota || null };
}

/**
 * Restores all data from the cloud backups.
 */
export async function restoreFromGDrive() {
  const { data, error } = await supabase.functions.invoke('drive-fetch', {
    body: { action: 'restore_all' }
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Persists restored shard data back into Supabase tables.
 */
export async function applyCloudRestore(
  shards: Record<string, any>,
  onProgress?: (table: string, pct: number) => void
) {
  console.log('[GDrive] Applying cloud restore for shards:', Object.keys(shards));

  const currentUser = useAuthStore.getState().user;
  if (!currentUser) throw new Error('User session not found for restore.');
  
  const currentUserId = currentUser.id;
  // Try to find the original user ID from the backup's profile
  const backupUserId = shards.PROFILE?.profile?.id;
  const isCrossAccountRestore = backupUserId && backupUserId !== currentUserId;

  if (isCrossAccountRestore) {
    console.warn(`[GDrive] Cross-account restore detected! Mapping ${backupUserId} -> ${currentUserId}`);
  }

  // Improved helper that can handle table-specific mapping
  const prepareForUpsert = (data: any, table: string, ownerFields: string[] = ['user_id', 'created_by', 'sender_id', 'receiver_id', 'id']): any => {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(d => prepareForUpsert(d, table, ownerFields));
    
    const cleaned = { ...data } as any;

    // For critical tables, we MUST ensure the user_id is the current user to pass RLS
    // especially during cross-account or cross-project restores.
    if (['profiles', 'study_materials', 'folders', 'tasks', 'direct_messages', 'message_reads', 'group_members', 'user_points', 'user_badges'].includes(table)) {
      if (cleaned.user_id) cleaned.user_id = currentUserId;
      if (cleaned.created_by) cleaned.created_by = currentUserId;
      if (cleaned.sender_id === backupUserId) cleaned.sender_id = currentUserId;
      if (cleaned.receiver_id === backupUserId) cleaned.receiver_id = currentUserId;
      if (table === 'profiles') cleaned.id = currentUserId;
    }

    Object.keys(cleaned).forEach(key => {
      // 1. Remove joined objects or arrays
      if (cleaned[key] !== null && typeof cleaned[key] === 'object' && !Array.isArray(cleaned[key])) {
        delete cleaned[key];
      }
      
      // 2. Map ownership if this is a cross-account restore (general case)
      if (isCrossAccountRestore && ownerFields.includes(key)) {
        if (cleaned[key] === backupUserId) {
          cleaned[key] = currentUserId;
        }
      }
    });

    // Handle group materials dependency: if group doesn't exist (or we aren't members),
    // convert to personal material to avoid RLS violation.
    if (table === 'study_materials' && cleaned.is_personal === false) {
      // For now, we'll try to keep the group_id, but if it fails, the user will know.
      // A more complex fix would check membership, but that's expensive here.
    }

    return cleaned;
  };

  const mergeErrors: string[] = [];

  // ─── Chunked upsert helper ────────────────────────────────────────────────
  // Processes rows in batches of CHUNK_SIZE to avoid Supabase payload limits
  // and keeps the JS event loop free between chunks (browser stays responsive).
  const CHUNK_SIZE = 100;

  const chunkedUpsert = async (table: string, data: any[]) => {
    if (!data || data.length === 0) return;
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const chunk = data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const { error } = await supabase.from(table).upsert(prepareForUpsert(chunk, table));
      if (error) {
        console.error(`[GDrive] Error upserting ${table} (chunk ${i + 1}/${totalChunks}):`, error);
        mergeErrors.push(`${table}[chunk ${i + 1}]: ${error.message}`);
      }
      // Report progress (0–100) for this table
      onProgress?.(table, Math.round(((i + 1) / totalChunks) * 100));
      // Yield to the event loop so frames aren't dropped during large restores
      await new Promise<void>(r => setTimeout(r, 0));
    }
  };

  // Thin wrapper for single-object upserts (profile, etc.)
  const safeUpsert = async (table: string, data: any) => {
    if (!data || (Array.isArray(data) && data.length === 0)) return;
    if (Array.isArray(data)) {
      await chunkedUpsert(table, data);
    } else {
      const { error } = await supabase.from(table).upsert(prepareForUpsert(data, table));
      if (error) {
        console.error(`[GDrive] Error upserting ${table}:`, error);
        mergeErrors.push(`${table}: ${error.message}`);
      }
      onProgress?.(table, 100);
    }
  };

  // RESTORE SEQUENTIALLY TO HANDLE FK DEPENDENCIES
  
  // 1. Profile (Base)
  if (shards.PROFILE?.profile) {
    const rawProfile = shards.PROFILE.profile;
    const profileData = prepareForUpsert(rawProfile, 'profiles');
    profileData.email = useAuthStore.getState().profile?.email || currentUser.email;
    delete profileData.created_at;
    delete profileData.last_seen;
    await safeUpsert('profiles', profileData);
  }
  
  if (shards.PROFILE?.points) await safeUpsert('user_points', shards.PROFILE.points);
  if (shards.PROFILE?.badges) await safeUpsert('user_badges', shards.PROFILE.badges);

  // 2. Groups & Memberships (so materials can link to them)
  if (shards.GROUPS) {
    if (shards.GROUPS.groups?.length > 0) {
      // Only restore groups we created to avoid RLS 403
      const ourGroups = shards.GROUPS.groups.filter((g: any) => g.created_by === currentUserId || (isCrossAccountRestore && g.created_by === backupUserId));
      await safeUpsert('groups', ourGroups);
    }
    if (shards.GROUPS.memberships?.length > 0) await safeUpsert('group_members', shards.GROUPS.memberships);
  }

  // 3. Folders (Materials depend on these)
  if (shards.ORGANIZER?.folders?.length > 0) await safeUpsert('folders', shards.ORGANIZER.folders);

  // 4. Materials & Files
  if (shards.ORGANIZER?.materials?.length > 0) await safeUpsert('study_materials', shards.ORGANIZER.materials);
  
  // 5. Planner
  if (shards.PLANNER) {
    if (shards.PLANNER.tasks?.length > 0) await safeUpsert('tasks', shards.PLANNER.tasks);
    if (shards.PLANNER.subtasks?.length > 0) await safeUpsert('subtasks', shards.PLANNER.subtasks);
  }

  // 6. Messages
  if (shards.MESSAGES?.messages?.length > 0) await safeUpsert('direct_messages', shards.MESSAGES.messages);
  if (shards.GROUPS?.message_reads?.length > 0) await safeUpsert('message_reads', shards.GROUPS.message_reads);

  if (mergeErrors.length > 0) {
    throw new Error(`Failed to merge some data: ${mergeErrors.slice(0, 2).join(', ')}`);
  }
}

/**
 * Verifies that the Google Access Token has the mandatory scopes (drive.file and drive.appdata).
 */
export async function verifyGDriveScopes(accessToken: string): Promise<{ valid: boolean; error: string | null }> {
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    const data = await res.json();
    
    if (!res.ok) return { valid: false, error: data.error_description || 'Invalid token' };
    
    const scopes = data.scope?.split(' ') || [];
    const hasFile = scopes.includes('https://www.googleapis.com/auth/drive.file');
    const hasAppData = scopes.includes('https://www.googleapis.com/auth/drive.appdata');
    
    if (!hasFile || !hasAppData) {
      return { valid: false, error: 'Missing permissions: drive.file, drive.appdata' };
    }
    
    return { valid: true, error: null };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

/**
 * Updates the gdrive_backup_status in the profiles table.
 */
export async function updatePersistentGDriveStatus(userId: string, { backupStatus }: { backupStatus: any }) {
  const { error } = await supabase
    .from('profiles')
    .update({ gdrive_backup_status: backupStatus })
    .eq('id', userId);
    
  if (error) console.error('[GDrive] Failed to update persistent status:', error);
}

/**
 * Fetches a file from Google Drive via the Edge Function and returns it as a Blob.
 * Used for material previews.
 */
export async function fetchDriveFileViaEdge(materialId: string, isGroupFile: boolean = false): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.functions.invoke('drive-fetch', {
      body: { materialId, isGroupFile }
    });

    if (error || !data?.base64) {
      console.error('[Drive Fetch] Edge error:', error || 'No data');
      return null;
    }

    const byteCharacters = atob(data.base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: data.mimeType || 'application/pdf' });
  } catch (err) {
    console.error('[Drive Fetch] Failed to convert base64:', err);
    return null;
  }
}

/**
 * Direct download for public drive files.
 */
export async function fetchDriveFileBlob(driveId: string): Promise<Blob | null> {
  try {
    const res = await fetch(`https://drive.google.com/uc?export=download&id=${driveId}`);
    if (!res.ok) return null;
    return await res.blob();
  } catch (err) {
    console.error('[Drive Fetch] Direct download failed:', err);
    return null;
  }
}

/**
 * Executes a direct Google Drive API request from the browser.
 * Uses the tokenManager's cached access token. Falls back to requesting a new
 * one via the profiles table if the token is missing/expired.
 */
export async function executeGDriveRequest<T>(
  callback: (token: string) => Promise<Response>,
  options?: { timeout?: number }
): Promise<{ data: T | null; error: string | null }> {
  try {

    // Use cached access token if still fresh
    let accessToken: string | null = tokenManager.isTokenFresh()
      ? tokenManager.getStatus().accessToken
      : null;

    if (!accessToken) {
      // Token missing or expired — fetch a fresh one via our secure Edge Function
      let refreshToken = useAuthStore.getState().profile?.gdrive_refresh_token;

      if (!refreshToken) {
        // Fallback to database if not yet loaded in store
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('gdrive_refresh_token').eq('id', user?.id).single();
        refreshToken = profile?.gdrive_refresh_token;
      }
      
      if (!refreshToken) {
        throw new Error('Google Drive not connected');
      }

      const { data: tokenData, error: invokeError } = await supabase.functions.invoke('gdrive-refresh', {
        body: { refreshToken }
      });
      
      if (invokeError || tokenData?.error) {
        throw new Error(invokeError?.message || tokenData?.error || 'Failed to refresh Google token');
      }

      accessToken = tokenData.access_token;
      if (!accessToken) throw new Error('Google did not return an access token. Please reconnect in Settings.');

      // Cache the fresh token in the manager for other parts of the app
      tokenManager.setAccessToken(accessToken, tokenData.expires_in || 3599);
    }

    let responsePromise = callback(accessToken);
    let timeoutId: any;

    if (options?.timeout) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Google Drive request timed out')), options.timeout);
      });
      responsePromise = Promise.race([responsePromise, timeoutPromise]);
    }

    const response = await responsePromise;
    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || `HTTP Error ${response.status}` };
    }

    const data = await response.json().catch(() => null);
    return { data, error: null };
  } catch (error: any) {
    console.error('[GDrive Request] Error:', error);
    return { data: null, error: error.message };
  }
}
