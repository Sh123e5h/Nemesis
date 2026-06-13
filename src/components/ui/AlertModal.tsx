import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, HelpCircle, XCircle, X, Info } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel',
  type = 'info'
}: AlertModalProps) {
  
  const getIcon = () => {
    const size = 32;
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={size} />;
      case 'error': return <XCircle className="text-rose-500" size={size} />;
      case 'warning': return <AlertCircle className="text-amber-500" size={size} />;
      case 'confirm': return <HelpCircle className="text-sky-500" size={size} />;
      case 'info': return <Info className="text-sky-400" size={size} />;
      default: return <AlertCircle className="text-slate-400" size={size} />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'success': return 'bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/25 dark:shadow-emerald-500/10';
      case 'error': return 'bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-500/25 dark:shadow-rose-500/10';
      case 'warning': return 'bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-500/25 dark:shadow-amber-500/10';
      case 'confirm': return 'bg-sky-500 hover:bg-sky-600 shadow-xl shadow-sky-500/25 dark:shadow-sky-500/10';
      case 'info': return 'bg-sky-500 hover:bg-sky-600 shadow-xl shadow-sky-500/25 dark:shadow-sky-500/10';
      default: return 'bg-slate-900 dark:bg-sky-500 hover:bg-black dark:hover:bg-sky-400 shadow-xl shadow-slate-900/20 dark:shadow-sky-500/10';
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={type !== 'confirm' ? onClose : undefined}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="relative w-full max-w-[400px] glass-premium bg-white/95 dark:bg-slate-900/95 rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-white/5 flex flex-col items-center text-center p-10"
          >
            <div className="relative mb-8">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className={`absolute inset-0 blur-3xl rounded-full ${
                  type === 'success' ? 'bg-emerald-500' :
                  type === 'error' ? 'bg-rose-500' :
                  type === 'warning' ? 'bg-amber-500' :
                  type === 'confirm' ? 'bg-sky-500' :
                  'bg-sky-400'
                }`} 
              />
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center bg-white dark:bg-slate-800 shadow-2xl border border-slate-100 dark:border-white/5 relative z-10 transition-transform hover:rotate-6 duration-500`}>
                {getIcon()}
              </div>
            </div>

            <div className="space-y-3 mb-10 w-full">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                {title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold leading-relaxed uppercase tracking-wide">
                {message}
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              {(onConfirm || type === 'confirm') && (
                <button
                  onClick={() => {
                    if (onConfirm) onConfirm();
                    onClose();
                  }}
                  className={`w-full py-5 rounded-[1.5rem] text-white font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 group relative overflow-hidden ${getButtonClass()}`}
                >
                  <span className="relative z-10">{confirmText}</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
              )}
              
              {type === 'confirm' ? (
                <button
                  onClick={onClose}
                  className="w-full py-5 rounded-[1.5rem] bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95"
                >
                  {cancelText}
                </button>
              ) : !onConfirm ? (
                <button
                  onClick={onClose}
                  className={`w-full py-5 rounded-[1.5rem] text-white font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 group relative overflow-hidden ${getButtonClass()}`}
                >
                  <span className="relative z-10">{confirmText}</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
              ) : null}
            </div>

            {type !== 'confirm' && (
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all bg-slate-100 dark:bg-white/5 rounded-2xl active:scale-90"
              >
                <X size={20} />
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
