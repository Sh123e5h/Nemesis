import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BreadcrumbEntry {
  id: string | null;
  name: string;
}

interface TopicBreadcrumbsProps {
  decodedSubject: string;
  decodedTopic: string;
  folderPath: BreadcrumbEntry[];
  onNavigateBreadcrumb: (index: number) => void;
}

export default function TopicBreadcrumbs({
  decodedSubject,
  decodedTopic,
  folderPath,
  onNavigateBreadcrumb,
}: TopicBreadcrumbsProps) {
  const navigate = useNavigate();

  const filteredPath = folderPath.filter(
    (fb) =>
      fb.name !== 'Initial Directory Placeholder' &&
      fb.name !== 'Initial Topic Placeholder'
  );

  return (
    <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-8 shrink-0">
      <button
        onClick={() => navigate(-1)}
        className="w-12 h-12 flex items-center justify-center glass-premium border border-white/60 dark:border-slate-800 rounded-2xl text-slate-500 hover:text-sky-500 transition-all shrink-0 group shadow-sm hover:shadow-md active:scale-90"
      >
        <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-0.5" strokeWidth={3} />
      </button>

      <div className="flex-1 min-w-0 glass-premium border border-white/60 dark:border-slate-800 rounded-2xl px-4 py-2 md:px-6 md:py-3 flex flex-col justify-center shadow-sm">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate tracking-[0.2em] font-black uppercase mb-0.5">
          {decodedSubject}
        </p>
        <div className="flex items-center gap-1 text-sm md:text-xl font-black text-slate-900 dark:text-white overflow-x-auto whitespace-nowrap hide-scrollbar pr-2 leading-none tracking-tight uppercase">
          {filteredPath.map((fb, idx) => (
            <React.Fragment key={fb.id || 'root'}>
              {idx > 0 && (
                <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0 mx-1" strokeWidth={3} />
              )}
              <button
                onClick={() => onNavigateBreadcrumb(idx)}
                className={`hover:text-sky-600 transition truncate ${
                  idx === filteredPath.length - 1
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {idx === 0 ? decodedTopic : fb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
