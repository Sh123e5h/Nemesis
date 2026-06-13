import { Tag, Search } from 'lucide-react';

interface TagFilterBarProps {
  allTags: string[];
  selectedTag: string | null;
  searchQuery: string;
  onSelectTag: (tag: string | null) => void;
  onSearchChange: (query: string) => void;
}

export default function TagFilterBar({
  allTags,
  selectedTag,
  searchQuery,
  onSelectTag,
  onSearchChange,
}: TagFilterBarProps) {
  return (
    <>
      {/* Search */}
      <div className="relative mb-6 md:mb-8 group shrink-0">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none">
          <Search size={18} strokeWidth={2.5} />
        </div>
        <input
          type="text"
          placeholder="Search in this topic..."
          className="w-full pl-11 pr-4 py-3.5 glass-premium border border-white/60 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 text-sm md:text-base font-bold transition shadow-glass hover:shadow-premium"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 shrink-0 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => onSelectTag(null)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition shrink-0 shadow-glass ${
              !selectedTag
                ? 'bg-slate-900 dark:bg-sky-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectTag(tag)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1 shrink-0 ${
                selectedTag === tag
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-100 dark:border-sky-900/30'
              }`}
            >
              <Tag size={10} /> {tag}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
