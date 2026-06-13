import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import OptimizedImage from '../OptimizedImage';

import type { Group } from '../../store/useDataStore';

interface GroupListItemProps {
  group: Group;
  variants: any;
}

const GroupListItem: React.FC<GroupListItemProps> = ({ group, variants }) => {
  return (
    <motion.div variants={variants}>
      <Link 
        to={`/groups/${group.id}`}
        className="glass-premium p-4 md:p-6 rounded-2xl transition-all duration-300 group flex flex-col h-full hover-lift border border-slate-200/60 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 will-change-transform transform-gpu"
      >
        <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
          {group.avatar_url ? (
            <OptimizedImage 
              src={group.avatar_url} 
              width={56} 
              height={56} 
              alt={group.name} 
              className="w-11 h-11 md:w-14 md:h-14 rounded-xl object-cover border border-slate-200/60 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 shrink-0 bg-white dark:bg-slate-800" 
            />
          ) : (
            <div className="bg-sky-50 dark:bg-slate-700/50 cyberpunk:bg-emerald-900/10 w-11 h-11 md:w-14 md:h-14 rounded-xl text-sky-500 dark:text-sky-400 cyberpunk:text-emerald-500 group-hover:bg-sky-100 dark:group-hover:bg-slate-700 transition shrink-0 flex items-center justify-center">
              <Users size={20} className="md:w-6 md:h-6" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 text-sm md:text-base line-clamp-1 group-hover:text-sky-500 transition-colors tracking-tight">{group.name}</h3>
            <p className="text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-500 cyberpunk:text-emerald-600/80 uppercase tracking-widest mt-0.5">{group.is_private ? 'Private' : 'Public'} • {group.invite_code}</p>
          </div>
        </div>
        <p className="text-[11px] md:text-sm text-slate-600 dark:text-slate-400 cyberpunk:text-emerald-500/70 font-medium line-clamp-2 md:line-clamp-3 flex-1 leading-relaxed mt-1">{group.description || 'No description provided.'}</p>
      </Link>
    </motion.div>
  );
};

export default React.memo(GroupListItem);
