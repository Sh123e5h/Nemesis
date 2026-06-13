import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Folder, Users, FileText, ChevronRight } from 'lucide-react';

interface SearchMaterial {
  id: string;
  title: string;
  subject: string;
  topic: string;
}

interface SearchGroup {
  id: string;
  name: string;
  description: string;
}

export default function GlobalSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [materials, setMaterials] = useState<SearchMaterial[]>([]);
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const performSearch = useCallback(async () => {
    if (!query) {
      setMaterials([]);
      setGroups([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const [mRes, gRes] = await Promise.all([
      supabase.from('study_materials').select('id, title, subject, topic').ilike('title', `%${query}%`).limit(15),
      supabase.from('groups').select('id, name, description').ilike('name', `%${query}%`).limit(15)
    ]);
    
    setMaterials(mRes.data || []);
    setGroups(gRes.data || []);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-8 space-y-6 min-w-0 w-full overflow-x-hidden mobile-hardened pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <Search size={24} className="text-slate-400 z-10" />
        <input 
          type="text" 
          autoFocus
          value={query}
          onChange={e => setSearchParams(e.target.value ? { q: e.target.value } : {})}
          className="flex-1 bg-transparent outline-none text-lg text-slate-800"
          placeholder="Search materials, groups, topics..."
        />
      </div>

      {loading ? (
        <div className="text-center p-8 text-slate-500">Searching...</div>
      ) : query ? (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-sky-500" /> Study Materials ({materials.length})
            </h2>
            {materials.length > 0 ? (
              <div className="grid gap-3">
                {materials.map(m => (
                  <Link key={m.id} to={`/organizer/preview/${m.id}`} className="bg-white p-4 rounded-xl border border-slate-100 hover:border-sky-300 transition flex items-center justify-between group">
                    <div>
                      <div className="font-semibold text-slate-800 group-hover:text-sky-600 transition">{m.title}</div>
                      <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                        <Folder size={14} /> {m.subject} / {m.topic}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-sky-500" />
                  </Link>
                ))}
              </div>
            ) : <div className="text-slate-500 text-sm">No materials found.</div>}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users size={20} className="text-sky-500" /> Groups ({groups.length})
            </h2>
            {groups.length > 0 ? (
              <div className="grid gap-3">
                {groups.map(g => (
                  <Link key={g.id} to={`/groups/${g.id}`} className="bg-white p-4 rounded-xl border border-slate-100 hover:border-sky-300 transition flex items-center justify-between group">
                    <div>
                      <div className="font-semibold text-slate-800 group-hover:text-sky-600 transition">{g.name}</div>
                      <div className="text-sm text-slate-500 mt-1 line-clamp-1">{g.description}</div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-sky-500" />
                  </Link>
                ))}
              </div>
            ) : <div className="text-slate-500 text-sm">No groups found.</div>}
          </div>
        </div>
      ) : (
        <div className="text-center p-12 text-slate-400">
          <Search size={48} className="mx-auto mb-4 opacity-20" />
          <p>Type something to start searching across Nemesis.</p>
        </div>
      )}
    </div>
  );
}
