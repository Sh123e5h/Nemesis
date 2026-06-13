import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowLeft, ShieldCheck, Database, Cloud, MessageSquare, Calendar, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchGDriveStatus, restoreFromGDrive, applyCloudRestore, type GDriveQuota } from '../lib/gdrive';
import { useCloudSync } from '../hooks/useCloudSync';
import AlertModal from '../components/ui/AlertModal';

const GoogleDriveLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574z" fill="#0066da" />
    <path d="M7.25 3.214a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287c-.013-.02-.858-1.504-.863-1.51z" fill="#00ac47" />
    <path d="M9.509 15.867l-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" fill="#ffba00" />
  </svg>
);

export default function Settings() {
  const { user, refreshProfile } = useAuthStore();
  const navigate = useNavigate();

  // ─── Sync State ───
  const { syncStatus, lastSyncAt, isConnected, manualSync, error, progress } = useCloudSync();
  const [quota, setQuota] = useState<GDriveQuota | null>(() => {
    const cached = localStorage.getItem('nemesis_gdrive_quota');
    return cached ? JSON.parse(cached) : null;
  });
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [lastProgress, setLastProgress] = useState(0);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: '', message: '', type: 'info' });

  const handleConnect = async () => {
    // Mark that we expect an OAuth return with a Drive-scoped token.
    // The useEffect above will detect this flag on redirect and save the token.
    sessionStorage.setItem('gdrive_reconnecting', 'true');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
        scopes: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true',
        }
      }
    });
    if (error) {
      sessionStorage.removeItem('gdrive_reconnecting');
      setAlertConfig({ isOpen: true, title: 'Auth Failed', message: error.message, type: 'error' });
    }
  };

  const loadStatus = useCallback(async () => {
    if (isLoadingStatus) return;
    setIsLoadingStatus(true);
    try {
      const result = await fetchGDriveStatus();
      if (result.quota) {
        setQuota(result.quota);
        localStorage.setItem('nemesis_gdrive_quota', JSON.stringify(result.quota));
      } else if (result.error) {
        setAlertConfig({ 
          isOpen: true, 
          title: 'Failed to Load Status', 
          message: result.error, 
          type: 'error' 
        });
      }
    } catch (err: any) {
      const isTokenError = err.message?.toLowerCase().includes('failed to refresh google token') || 
                          err.message?.toLowerCase().includes('invalid_grant');
      
      if (isTokenError) {
        setAlertConfig({ 
          isOpen: true, 
          title: 'Connection Lost', 
          message: 'Your Google Drive connection has expired. Please reconnect to view your storage status and continue syncing.', 
          type: 'confirm',
          confirmText: 'RECONNECT NOW',
          cancelText: 'NOT NOW',
          onConfirm: () => handleConnect()
        });
      } else {
        setAlertConfig({ 
          isOpen: true, 
          title: 'Error', 
          message: err.message || 'Failed to fetch status', 
          type: 'error' 
        });
      }
    } finally {
      setIsLoadingStatus(false);
    }
  }, [isLoadingStatus]);

  // ─── OAuth Redirect Return Handler ───
  // When user returns from Google OAuth (after clicking Connect), capture the
  // new Drive-scoped provider_refresh_token and persist it to the DB.
  useEffect(() => {
    const handleOAuthReturn = async () => {
      const wasReconnecting = sessionStorage.getItem('gdrive_reconnecting');
      if (!wasReconnecting) return;
      sessionStorage.removeItem('gdrive_reconnecting');

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const refreshToken = session?.provider_refresh_token;

        if (refreshToken && user?.id) {
          const { error: dbErr } = await supabase.from('profiles').update({
            gdrive_refresh_token: refreshToken,
            gdrive_backup_status: { valid: true, last_backup_at: null, error: null }
          }).eq('id', user.id);

          if (dbErr) throw new Error(dbErr.message);

          await refreshProfile();
          setAlertConfig({
            isOpen: true,
            title: '✓ Google Drive Connected',
            message: 'Your account is now linked with Drive permissions. Backups will sync automatically.',
            type: 'success'
          });
          loadStatus();
        } else if (!refreshToken) {
          // Google did not return a new refresh token — likely because Supabase
          // suppressed it. Ask the user to disconnect first then reconnect.
          setAlertConfig({
            isOpen: true,
            title: 'Extra Step Required',
            message: 'Google did not issue a new token. Please try connecting again and ensure you grant all requested permissions.',
            type: 'warning'
          });
        }
      } catch (err: any) {
        console.error('[Settings] OAuth return error:', err);
        setAlertConfig({ isOpen: true, title: 'Connection Error', message: err.message, type: 'error' });
      }
    };

    handleOAuthReturn();
  }, [user?.id, refreshProfile, loadStatus]);

  // ─── Token Subscription ───
  useEffect(() => {
    if (isConnected && !quota) {
      loadStatus();
    }
  }, [isConnected, quota, loadStatus]);

  // Refresh status after successful sync to show updated size
  useEffect(() => {
    if (syncStatus === 'synced') {
      loadStatus();
    }
  }, [syncStatus, loadStatus]);

  // Handle Progress Persistence
  useEffect(() => {
    if (syncStatus === 'syncing') {
      setShowProgress(true);
      setLastProgress(progress || 0);
    } else if (syncStatus === 'synced') {
      setLastProgress(100);
      const timer = setTimeout(() => setShowProgress(false), 3000);
      return () => clearTimeout(timer);
    } else if (syncStatus === 'error') {
      setShowProgress(false);
    }
  }, [syncStatus, progress]);

  // Handle Restore Progress Persistence
  useEffect(() => {
    if (isRestoring) {
      setShowProgress(true);
      setLastProgress(restoreProgress);
    } else if (restoreProgress === 100) {
      setLastProgress(100);
      // Keep it visible until the user interacts with the success modal or reload
    }
  }, [isRestoring, restoreProgress]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRestore = async () => {
    if (!user) return;
    setAlertConfig({
      isOpen: true,
      title: 'Restore Data?',
      message: 'This will re-download all your shards (Chats, Organizer, Planner) from Google Drive and merge them into your workspace. This might overwrite local changes.',
      type: 'confirm',
      onConfirm: async () => {
        setIsRestoring(true);
        setRestoreProgress(5);
        
        // Simulation interval to show activity during the heavy cloud request
        const progressInterval = setInterval(() => {
          setRestoreProgress(prev => {
            if (prev >= 98) return prev;
            // Smoother, slowing transition that stays till 98%
            const increment = (99 - prev) * 0.05;
            return prev + Math.max(increment, 0.1);
          });
        }, 150);

        try {
          const result = await restoreFromGDrive();
          clearInterval(progressInterval);
          setRestoreProgress(100);

          if (result.success && result.shards) {
            await applyCloudRestore(result.shards);
            setAlertConfig({ 
              isOpen: true, 
              title: 'Restore Complete', 
              message: 'Your entire workspace has been rehydrated from Google Drive. The app will reload now.', 
              type: 'success',
              onConfirm: () => window.location.reload()
            });
          } else {
            throw new Error(result.error || 'No backup data found on Google Drive.');
          }
        } catch (err: any) {
          clearInterval(progressInterval);
          setAlertConfig({ isOpen: true, title: 'Restore Failed', message: err.message, type: 'error' });
        } finally {
          setIsRestoring(false);
          setTimeout(() => setRestoreProgress(0), 1000);
        }
      }
    });
  };

  const handleManualSync = () => {
    setShowProgress(true);
    setLastProgress(0);
    manualSync();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Cloud Sync</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-2xl border border-emerald-500/20 text-xs font-bold uppercase tracking-widest">
          <ShieldCheck size={16} />
          End-to-End Encrypted
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* WhatsApp Style Backup Section */}
        <section className="md:col-span-2 glass-premium p-6 md:p-8 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-indigo-500/5 to-purple-500/5 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div className="space-y-6">
              <header className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl shadow-glass border border-sky-100/50 dark:border-slate-800 flex items-center justify-center p-2.5">
                  <GoogleDriveLogo size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Backup</h2>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Secure Lifetime Cloud Sync</p>
                </div>
              </header>

              <div className="space-y-4">
                <div className="bg-slate-50/50 dark:bg-slate-800/50 p-5 rounded-3xl border border-white dark:border-slate-700/50 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Last Backup Status</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Time Status */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sync Times</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] text-slate-500">Local Cache</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {lastSyncAt ? lastSyncAt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Cloud Backup</p>
                          {isLoadingStatus && !quota ? (
                            <div className="w-24 h-3 mt-1 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                          ) : (
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {quota?.last_backup_at ? new Date(quota.last_backup_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Storage Status */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Storage Usage</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1"><Database size={10} /> Nemesis Data</p>
                          {isLoadingStatus && !quota ? (
                            <div className="w-16 h-3 mt-1 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                          ) : (
                            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {quota?.nemesis_usage !== undefined ? formatBytes(quota.nemesis_usage) : '0 B'}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1"><Cloud size={10} /> Drive Total</p>
                          {isLoadingStatus && !quota ? (
                            <div className="w-20 h-3 mt-1 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                          ) : (
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              {quota?.usage ? formatBytes(quota.usage) : '0 B'} / {quota?.limit ? formatBytes(quota.limit) : '15 GB'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Progress Bar Section */}
                  <AnimatePresence>
                    {showProgress && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                        className="space-y-2 overflow-hidden"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-500 dark:text-slate-400">
                            {isRestoring || (restoreProgress > 0 && restoreProgress < 100) ? 'Restoring Workspace' : 
                             (lastProgress === 100 ? 'Sync Complete' : 'Syncing Shards')}
                          </span>
                          <span className={(isRestoring || restoreProgress > 0) ? 'text-indigo-500' : 'text-emerald-500'}>
                            {Math.round(isRestoring ? restoreProgress : lastProgress)}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-white dark:border-slate-700/50">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${isRestoring ? restoreProgress : lastProgress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className={`h-full rounded-full ${
                              (isRestoring || restoreProgress > 0) 
                                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20' 
                                : 'bg-gradient-to-r from-emerald-500 to-sky-500 shadow-lg shadow-emerald-500/20'
                            }`}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={handleManualSync}
                      disabled={syncStatus === 'syncing' || !isConnected}
                      className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                    >
                      {syncStatus === 'syncing' ? 'Backing up...' : 'Back Up Now'}
                    </button>
                    
                    {syncStatus === 'error' && (
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight animate-pulse">
                        Sync Failed: {error || 'Unknown Error'}
                      </p>
                    )}
                    {syncStatus === 'synced' && (
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">
                        Successfully Backed Up
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 px-2">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Google Drive Settings</h3>
                  
                  <div className="flex items-center justify-between group/item">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Google Account</p>
                      <p className="text-[10px] font-medium text-slate-500">{isConnected ? user?.email : 'Not connected'}</p>
                    </div>
                    <button 
                      onClick={handleConnect}
                      className="text-xs font-bold text-sky-500 hover:text-sky-600 transition-colors"
                    >
                      {isConnected ? 'Change' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-3 border-t border-slate-100 dark:border-slate-800/50">
              <button 
                onClick={handleRestore}
                disabled={isRestoring || !isConnected}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 border border-slate-200 dark:border-slate-700"
              >
                Recover from Backup
              </button>
              <p className="text-[9px] text-center font-bold text-slate-400 dark:text-slate-600 uppercase tracking-tight">
                Recovery is a destructive operation.
              </p>
            </div>
          </div>
        </section>

        {/* Info Card */}
        <section className="glass-premium p-6 rounded-[2rem] flex flex-col justify-between border-sky-100/50 dark:border-slate-800 relative overflow-hidden">
          <div className="flex flex-col gap-6 relative z-10">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <Database size={20} />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Encrypted Hidden Shards</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Your data is split into encrypted shards (Messages, Planner, etc.) and stored in a hidden App Data folder. This keeps your backup safe from accidental deletion and completely invisible in your primary Google Drive view.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Multimedia uploads are stored separately in the 'Nemesis_Uploads' folder to ensure your cloud storage is utilized efficiently.
              </p>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50 flex flex-col gap-4 relative z-10">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
              <ShieldCheck size={14} />
              <span>Zero-Knowledge Sync</span>
            </div>
            <div className="flex gap-2">
               {/* Decorative blocks representing shards */}
               <div className="flex-1 py-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col items-center justify-center gap-1.5 transition-colors hover:bg-indigo-500/10">
                 <MessageSquare size={16} className="text-indigo-500/70" />
                 <span className="text-[9px] font-bold text-indigo-500/80 uppercase tracking-widest">Chats</span>
               </div>
               <div className="flex-1 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center justify-center gap-1.5 transition-colors hover:bg-emerald-500/10">
                 <Calendar size={16} className="text-emerald-500/70" />
                 <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest">Tasks</span>
               </div>
               <div className="flex-1 py-3 rounded-xl bg-sky-500/5 border border-sky-500/20 flex flex-col items-center justify-center gap-1.5 transition-colors hover:bg-sky-500/10">
                 <Users size={16} className="text-sky-500/70" />
                 <span className="text-[9px] font-bold text-sky-500/80 uppercase tracking-widest">Groups</span>
               </div>
            </div>
          </div>
          
          {/* Subtle background glow */}
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        </section>
      </main>

      <AlertModal 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={() => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
          alertConfig.onConfirm?.();
        }}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
