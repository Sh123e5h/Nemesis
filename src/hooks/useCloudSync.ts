import { useEffect, useState } from 'react';
import { syncEngine, type SyncStatus } from '../lib/SyncEngine';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Hook to access the global SyncEngine state.
 */
export function useCloudSync() {
  const { profile } = useAuthStore();
  const [status, setStatus] = useState<SyncStatus>(syncEngine.getStatus());

  useEffect(() => {
    return syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  return {
    syncStatus: status.state,
    lastSyncAt: status.lastSyncAt,
    isConnected: !!profile?.gdrive_refresh_token,
    error: status.error,
    progress: status.progress,
    manualSync: () => syncEngine.forceFullBackup()
  };
}
