import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Database, RefreshCw, Play, Code, FileText } from 'lucide-react';

interface SearchResult {
  type: string;
  name: string;
  detail: string;
  id: string;
}

export default function AdminDataExplorer() {
  const [query, setQuery] = useState('SELECT * FROM profiles LIMIT 10');
  const [results, setResults] = useState<Record<string, any>[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedQueries] = useState<{name: string, query: string}[]>([
    { name: 'All Users', query: 'SELECT id, full_name, username, email, status, created_at FROM profiles ORDER BY created_at DESC LIMIT 50' },
    { name: 'Active Groups', query: 'SELECT g.id, g.name, g.description, p.full_name as creator, g.created_at FROM groups g LEFT JOIN profiles p ON g.created_by = p.id ORDER BY g.created_at DESC' },
    { name: 'Recent Materials', query: 'SELECT sm.title, sm.subject, sm.topic, sm.file_type, p.full_name as uploader, sm.created_at FROM study_materials sm LEFT JOIN profiles p ON sm.user_id = p.id ORDER BY sm.created_at DESC LIMIT 20' },
    { name: 'Report Queue', query: 'SELECT r.*, p.full_name as reporter FROM reports r LEFT JOIN profiles p ON r.reporter_id = p.id WHERE r.status = \'pending\' ORDER BY r.created_at DESC' },
    { name: 'Storage Objects', query: 'SELECT hash, bucket_id, path, size_bytes, mime_type, ref_count, created_at FROM storage_objects ORDER BY created_at DESC LIMIT 20' },
    { name: 'Audit Summary', query: 'SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC' },
    { name: 'Group Members Count', query: 'SELECT g.name, COUNT(gm.user_id) as member_count FROM groups g LEFT JOIN group_members gm ON g.id = gm.group_id GROUP BY g.id, g.name ORDER BY member_count DESC' },
    { name: 'Online Users', query: 'SELECT full_name, username, last_seen FROM profiles WHERE last_seen > NOW() - INTERVAL \'5 minutes\' ORDER BY last_seen DESC' },
  ]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalResults, setGlobalResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<'query' | 'search'>('query');

  const executeQuery = useCallback(async () => {
    if (!query.trim()) return;
    // Safety: only allow SELECT queries
    const trimmed = query.trim().toUpperCase();
    if (!trimmed.startsWith('SELECT')) {
      setError('Only SELECT (read-only) queries are allowed for safety.');
      return;
    }
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const { data, error: err } = await supabase.rpc('execute_readonly_query', { sql_query: query });
      if (err) {
        setError(err.message);
      } else {
        if (Array.isArray(data) && data.length > 0) {
          setColumns(Object.keys(data[0]));
          setResults(data);
        } else {
          setResults([]);
          setColumns([]);
        }
      }
    } catch (e: unknown) {
      setError((e as Error).message || 'Query failed');
    }
    setLoading(false);
  }, [query]);

  const runSavedQuery = useCallback(async (sq: { name: string, query: string }) => {
    setQuery(sq.query);
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const { data, error: err } = await supabase.rpc('execute_readonly_query', { sql_query: sq.query });
      if (err) {
        setError(err.message);
      } else {
        if (Array.isArray(data) && data.length > 0) {
          setColumns(Object.keys(data[0]));
          setResults(data);
        } else {
          setResults([]);
          setColumns([]);
        }
      }
    } catch (e: unknown) {
      setError((e as Error).message || 'Query failed');
    }
    setLoading(false);
  }, []);

  const fullTextSearch = useCallback(async () => {
    if (!globalSearch.trim()) return;
    setSearching(true);
    setGlobalResults([]);

    try {
      const { data, error } = await supabase.rpc('admin_global_search', {
        p_query: globalSearch
      });

      if (error) throw error;
      setGlobalResults(data || []);
    } catch (err: any) {
      console.error('[AdminSearch] Search failure:', err.message);
    } finally {
      setSearching(false);
    }
  }, [globalSearch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Database size={28} className="text-emerald-500" /> Data Explorer</h1>
          <p className="text-sm text-slate-500 mt-0.5">Full-text search and data inspection tools.</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm w-fit">
        {(['search', 'query'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition ${tab === t ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:bg-slate-50'}`}>
            {t === 'search' ? '🔍 Full-Text Search' : '⚡ Query Console'}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={20} />
                <input type="text" placeholder="Search across all data (users, materials, groups, files, messages)..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fullTextSearch()} />
              </div>
              <button onClick={fullTextSearch} disabled={searching} className="px-6 py-4 bg-emerald-500 text-white rounded-2xl font-bold text-sm hover:bg-emerald-600 transition disabled:opacity-50 flex items-center gap-2">
                {searching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />} Search
              </button>
            </div>
          </div>

          {globalResults.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <span className="text-sm font-bold text-slate-700">{globalResults.length} results found</span>
              </div>
              <div className="divide-y divide-slate-100">
                {globalResults.map((r, i) => (
                  <div key={i} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition">
                    <span className="text-lg w-10 text-center">{r.type.split(' ')[0]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{r.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="font-bold uppercase">{r.type.split(' ')[1]}</span>
                        {r.detail && <span>• {r.detail}</span>}
                      </div>
                    </div>
                    <code className="text-[10px] text-slate-400 font-mono">{r.id?.slice(0, 8)}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'query' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Saved Queries */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><FileText size={16} /> Saved Queries</h3>
            {savedQueries.map((sq, i) => (
              <button key={i} onClick={() => runSavedQuery(sq)} className="w-full p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-emerald-300 hover:bg-emerald-50 transition text-sm font-medium text-slate-700">
                {sq.name}
              </button>
            ))}
          </div>

          {/* Query Editor & Results */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
              <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase"><Code size={14} /> SQL Console (Read-Only)</div>
                <button onClick={executeQuery} disabled={loading} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition disabled:opacity-50">
                  {loading ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />} Execute
                </button>
              </div>
              <textarea
                className="w-full p-4 bg-transparent text-emerald-400 text-sm font-mono outline-none resize-none"
                rows={5}
                value={query}
                onChange={e => setQuery(e.target.value)}
                spellCheck={false}
              />
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-200">{error}</div>}

            {results !== null && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">{results.length} row(s) returned</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        {columns.map(c => <th key={c} className="p-3 whitespace-nowrap">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-mono text-xs">
                      {results.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          {columns.map(c => (
                            <td key={c} className="p-3 max-w-[200px] truncate text-slate-700">{String(row[c] ?? 'null')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {results.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No results.</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
