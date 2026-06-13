import React from 'react';
import { useCloudSync } from '../hooks/useCloudSync';
import { Cloud, CheckCircle2, CloudUpload, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

/**
 * Premium Sync Indicator (WhatsApp Style)
 * Shows the current background sync status with subtle animations.
 */
export const SyncIndicator: React.FC = () => {
  const { syncStatus, lastSyncAt, isConnected } = useCloudSync();

  if (!isConnected) return null;

  const getIcon = () => {
    switch (syncStatus) {
      case 'syncing': return <CloudUpload className="w-5 h-5 text-blue-400 animate-pulse" />;
      case 'synced': return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default: return <Cloud className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Syncing...';
      case 'synced': return 'Backups updated';
      case 'error': return 'Sync error';
      default: return 'Backing up';
    }
  };

  const handleClick = () => {
    if (syncStatus === 'error' || !isConnected) {
      window.location.href = '/settings'; // Direct navigate to fix
    }
  };

  return (
    <motion.div 
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        "flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md transition-colors cursor-pointer",
        syncStatus === 'error' ? "hover:bg-red-500/10 border-red-500/20" : "hover:bg-white/10"
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={syncStatus}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          {getIcon()}
        </motion.div>
      </AnimatePresence>
      
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-white/90 leading-none">
          {getStatusText()}
        </span>
        {lastSyncAt && (
          <span className="text-[8px] text-white/50 leading-none mt-1 uppercase tracking-wider">
            {lastSyncAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </motion.div>
  );
};
