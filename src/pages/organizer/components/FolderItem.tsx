import { motion } from 'framer-motion';
import { Folder, Trash2 } from 'lucide-react';

export interface FolderData {
  id: string;
  name: string;
  created_at: string;
}

interface FolderItemProps {
  folder: FolderData;
  onNavigate: (folder: FolderData) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
};

export default function FolderItem({ folder, onNavigate, onDelete }: FolderItemProps) {
  return (
    <motion.div variants={itemVariants}>
      <div
        className="glass-premium p-3 md:p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 md:hover:shadow-premium transition duration-300 flex items-center justify-between group cursor-pointer hover:border-sky-500/50 dark:hover:border-sky-500/50 md:hover:-translate-y-1"
        onClick={() => onNavigate(folder)}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="bg-sky-500/10 p-2.5 rounded-xl flex-shrink-0 text-sky-500 group-hover:scale-110 transition-transform glow-sky">
            <Folder size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 text-sm md:text-base truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors tracking-tight">
              {folder.name}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 cyberpunk:text-emerald-900 mt-0.5 uppercase tracking-wider">
              {new Date(folder.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => onDelete(e, folder.id)}
          className="p-2 text-slate-300 dark:text-slate-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 hover:scale-125"
          title="Delete Folder"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}
