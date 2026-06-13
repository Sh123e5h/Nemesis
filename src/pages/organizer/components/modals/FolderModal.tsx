import { createPortal } from 'react-dom';
import { FolderPlus, X } from 'lucide-react';

interface FolderModalProps {
  folderName: string;
  onNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function FolderModal({ folderName, onNameChange, onSubmit, onClose }: FolderModalProps) {
  return createPortal(
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="bg-white dark:bg-slate-900 cyberpunk:bg-black rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/50 animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 cyberpunk:border-emerald-500/20 bg-slate-50/50 dark:bg-slate-800/20 cyberpunk:bg-emerald-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500/10 p-2 rounded-lg">
              <FolderPlus className="text-sky-500 dark:text-sky-400 cyberpunk:text-emerald-400" size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400">New Folder</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-900 uppercase tracking-widest mb-1.5 ml-1">
              Folder Name
            </label>
            <input
              type="text"
              placeholder="e.g. Assignments"
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-black border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 text-slate-900 dark:text-white cyberpunk:text-emerald-400 placeholder:text-slate-400 transition"
              value={folderName}
              onChange={(e) => onNameChange(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="flex-1 px-4 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 disabled:opacity-50 transition shadow-glass hover:shadow-premium active:scale-95"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
