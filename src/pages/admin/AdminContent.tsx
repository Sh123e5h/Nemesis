import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import UserAvatar from '../../components/UserAvatar';
import { ShieldAlert, Trash2, FileText, File, ExternalLink, Search, CheckSquare, Square, Trash, TrendingUp } from 'lucide-react';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../../components/Skeleton';

interface MaterialItem {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  subject: string;
  topic: string;
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
  };
}

interface GroupFileItem {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  created_at: string;
  profiles: {
    full_name: string;
  };
  groups: {
    name: string;
  };
}

interface ReportItem {
  id: string;
  target_id: string;
  target_type: string;
  reason: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
  };
}

export default function AdminContent() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [groupFiles, setGroupFiles] = useState<GroupFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'materials' | 'groupFiles' | 'reports'>('materials');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [trends, setTrends] = useState<{subject: string, count: number}[]>([]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_moderation_content', {
        p_tab: tab,
        p_search: search
      });
      if (error) throw error;
      
      if (tab === 'materials') setMaterials(data as MaterialItem[]);
      else if (tab === 'groupFiles') setGroupFiles(data as GroupFileItem[]);
      else setReports(data as ReportItem[]);
    } catch (err: any) {
      console.error('[AdminContent] Neural sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    fetchContent();
    setSelectedIds([]);
  }, [fetchContent]);

  useEffect(() => {
    if (tab === 'materials') {
      const counts: Record<string, number> = {};
      materials.forEach(m => {
        if (m.subject) counts[m.subject] = (counts[m.subject] || 0) + 1;
      });
      setTrends(Object.entries(counts).map(([subject, count]) => ({ subject, count })).sort((a, b) => b.count - a.count).slice(0, 5));
    }
  }, [materials, tab]);


  const deleteMaterial = useCallback(async (id: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to permanently delete this material?')) return;
    const adminId = sessionStorage.getItem('adminId');

    try {
      if (fileUrl) {
        const { deleteSmart } = await import('../../lib/storage');
        await deleteSmart(fileUrl);
      }
      
      const { error } = await supabase.rpc('admin_manage_content', {
        p_action: 'delete_material',
        p_id: id,
        p_admin_id: adminId
      });

      if (error) throw error;
      fetchContent();
    } catch (err: any) {
      alert('Moderation failure: ' + err.message);
    }
  }, [fetchContent]);

  const deleteGroupFile = useCallback(async (id: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to permanently delete this group file?')) return;
    const adminId = sessionStorage.getItem('adminId');

    try {
      if (fileUrl) {
        const { deleteSmart } = await import('../../lib/storage');
        await deleteSmart(fileUrl);
      }
      
      const { error } = await supabase.rpc('admin_manage_content', {
        p_action: 'delete_file',
        p_id: id,
        p_admin_id: adminId
      });

      if (error) throw error;
      fetchContent();
    } catch (err: any) {
      alert('Moderation failure: ' + err.message);
    }
  }, [fetchContent]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const toggleSelectAll = useCallback(() => {
    const currentItems = tab === 'materials' ? materials : tab === 'groupFiles' ? groupFiles : reports;
    if (selectedIds.length === currentItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentItems.map(i => i.id));
    }
  }, [tab, materials, groupFiles, reports, selectedIds.length]);

  const batchDelete = useCallback(async () => {
    if (!confirm(`Delete ${selectedIds.length} items permanently?`)) return;
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { error } = await supabase.rpc('admin_batch_manage_content', {
        p_tab: tab,
        p_ids: selectedIds,
        p_admin_id: adminId
      });

      if (error) throw error;
      
      setSelectedIds([]);
      fetchContent();
    } catch (err: any) {
      alert('Batch moderation failure: ' + err.message);
    }
  }, [tab, selectedIds, fetchContent]);

  const dismissReport = useCallback(async (id: string) => {
    const adminId = sessionStorage.getItem('adminId');
    try {
      const { error } = await supabase.rpc('admin_manage_content', { 
        p_action: 'dismiss_report', 
        p_id: id,
        p_admin_id: adminId 
      });
      if (error) throw error;
      fetchContent();
    } catch (err: any) {
      alert('Dismissal failure: ' + err.message);
    }
  }, [fetchContent]);

  const resolveReport = useCallback(async (id: string, type: string) => {
    if (confirm(`Resolve and remove ${type}?`)) {
      const adminId = sessionStorage.getItem('adminId');
      try {
        const { error } = await supabase.rpc('admin_manage_content', {
          p_action: 'resolve_report',
          p_id: id,
          p_admin_id: adminId
        });
        if (error) throw error;
        fetchContent();
      } catch (err: any) {
        alert('Resolution failure: ' + err.message);
      }
    }
  }, [fetchContent]);

  return (
    <div className="space-y-6 text-slate-900 px-4 md:px-0 mobile-hardened">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert size={28} className="text-red-600" /> Content Moderation
          </h1>
          <p className="text-slate-500 text-sm mt-1">Review, trend-analyze, and batch-moderate platform uploads.</p>
        </div>
        
        {/* Subject Trends */}
        {tab === 'materials' && trends.length > 0 && (
          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <TrendingUp className="text-emerald-500" size={20} />
            <div className="flex gap-2">
              {trends.map(t => (
                <div key={t.subject} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase">
                  {t.subject} <span className="text-emerald-500 ml-1">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto w-full md:w-auto">
          {(['materials', 'groupFiles', 'reports'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition whitespace-nowrap ${tab === t ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {t === 'groupFiles' ? 'Group Space' : t === 'reports' ? 'Flagged Items' : 'Study Core'}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${tab}...`} 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none w-full transition text-sm"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          {selectedIds.length > 0 && (
            <button 
              onClick={batchDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-black shadow-lg shadow-red-200 flex items-center gap-2 hover:translate-y-[-2px] active:translate-y-[0] transition"
            >
              <Trash size={16} /> Delete ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="p-5 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-red-500 transition-colors">
                    {selectedIds.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                </th>
                <th className="p-5">Content Details</th>
                <th className="p-5">Contributor</th>
                {tab === 'groupFiles' && <th className="p-5">Environment</th>}
                <th className="p-5">Timestamp</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                [1, 2, 3, 4, 5, 6].map(i => (
                  <tr key={i}>
                    <td className="p-5 text-center">
                       <Skeleton variant="rectangle" className="w-5 h-5 rounded mx-auto opacity-10" />
                    </td>
                    <td className="p-5">
                       <div className="space-y-2">
                          <div className="flex items-center gap-2">
                             <SkeletonCircle size={16} />
                             <SkeletonLine width="180px" height="14px" />
                          </div>
                          <div className="flex gap-1.5">
                             <Skeleton variant="rectangle" className="w-10 h-4 rounded opacity-10" />
                             <Skeleton variant="rectangle" className="w-16 h-4 rounded opacity-10" />
                          </div>
                       </div>
                    </td>
                    <td className="p-5">
                       <div className="space-y-1.5">
                          <SkeletonLine width="100px" height="12px" />
                          <SkeletonLine width="60px" height="10px" className="opacity-40" />
                       </div>
                    </td>
                    {tab === 'groupFiles' && (
                      <td className="p-5">
                         <Skeleton variant="rectangle" className="w-20 h-5 rounded-lg opacity-10" />
                      </td>
                    )}
                    <td className="p-5">
                       <SkeletonLine width="80px" />
                    </td>
                    <td className="p-5 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <SkeletonCircle size={18} />
                          <SkeletonCircle size={18} />
                       </div>
                    </td>
                  </tr>
                ))
              ) : tab === 'materials' ? (
                materials.map(m => (
                  <tr key={m.id} className={`hover:bg-slate-50/80 transition group ${selectedIds.includes(m.id) ? 'bg-red-50/30' : ''}`}>
                    <td className="p-5 text-center">
                      <button onClick={() => toggleSelect(m.id)} className={`transition-colors ${selectedIds.includes(m.id) ? 'text-red-500' : 'text-slate-200 group-hover:text-slate-400'}`}>
                        {selectedIds.includes(m.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="p-5">
                      <div className="font-black text-slate-900 group-hover:text-red-600 transition-colors uppercase tracking-tight flex items-center gap-2">
                        <FileText size={16} className="text-sky-500" /> {m.title}
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-tighter">{m.file_type}</span>
                        <span className="px-1.5 py-0.5 bg-sky-50 text-sky-600 rounded text-[9px] font-black uppercase tracking-tighter">{m.subject}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar 
                          url={null} 
                          name={m.profiles?.full_name} 
                          size="xs" 
                        />
                        <div className="min-w-0">
                          <div className="text-slate-900 font-bold truncate">{m.profiles?.full_name || 'Unknown'}</div>
                          <div className="text-slate-400 text-[10px] font-medium">@{m.profiles?.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-slate-500 font-medium">{m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={m.file_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-xl transition" title="Preview">
                          <ExternalLink size={20} />
                        </a>
                        <button onClick={() => deleteMaterial(m.id, m.file_url)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition" title="Purge Content">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : tab === 'groupFiles' ? (
                groupFiles.map(f => (
                  <tr key={f.id} className={`hover:bg-slate-50/80 transition group ${selectedIds.includes(f.id) ? 'bg-red-50/30' : ''}`}>
                    <td className="p-5 text-center">
                      <button onClick={() => toggleSelect(f.id)} className={`transition-colors ${selectedIds.includes(f.id) ? 'text-red-500' : 'text-slate-200 group-hover:text-slate-400'}`}>
                        {selectedIds.includes(f.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="p-5">
                      <div className="font-black text-slate-900 group-hover:text-red-600 transition-colors uppercase tracking-tight flex items-center gap-2">
                        <File size={16} className="text-indigo-500" /> {f.file_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-tighter">{(f.file_size / 1024 / 1024).toFixed(2)} MB ARCHIVE</div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar 
                          url={null} 
                          name={f.profiles?.full_name} 
                          size="xs" 
                        />
                        <div className="text-slate-900 font-bold truncate">{f.profiles?.full_name || 'Unknown'}</div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-tight">
                        {f.groups?.name || 'Isolated'}
                      </span>
                    </td>
                    <td className="p-5 text-slate-500 font-medium">{f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={f.file_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-xl transition">
                          <ExternalLink size={20} />
                        </a>
                        <button onClick={() => deleteGroupFile(f.id, f.file_url)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                reports.map(r => (
                  <tr key={r.id} className={`hover:bg-slate-50/80 transition group ${selectedIds.includes(r.id) ? 'bg-red-50/30' : ''}`}>
                    <td className="p-5 text-center">
                      <button onClick={() => toggleSelect(r.id)} className={`transition-colors ${selectedIds.includes(r.id) ? 'text-red-500' : 'text-slate-200 group-hover:text-slate-400'}`}>
                        {selectedIds.includes(r.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="p-5 text-sm uppercase font-black text-[10px] tracking-widest">
                       <span className="px-3 py-1.5 rounded-full border border-red-100 bg-red-50 text-red-600 flex items-center gap-1.5 w-fit">
                        <ShieldAlert size={14} /> {r.target_type} Flagged
                      </span>
                      <div className="text-slate-500 normal-case font-medium mt-2 tracking-normal leading-relaxed">
                        Reason: <span className="italic">"{r.reason}"</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar 
                          url={null} 
                          name={r.profiles?.full_name} 
                          size="xs" 
                        />
                        <div className="min-w-0">
                          <div className="text-slate-900 font-bold truncate">{r.profiles?.full_name || 'Anonymous'}</div>
                          <div className="text-slate-400 text-[10px] font-medium italic">@{r.profiles?.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-slate-500 font-medium">{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-5 text-right">
                        <button 
                          onClick={() => dismissReport(r.id)} 
                          className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tight border border-slate-200 hover:bg-slate-100 transition"
                        >
                           Dismiss
                        </button>
                        <button 
                          onClick={() => resolveReport(r.id, r.target_type)} 
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tight shadow-md shadow-red-100 hover:translate-y-[-1px] transition"
                        >
                           Resolve
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && ((tab === 'materials' && materials.length === 0) || (tab === 'groupFiles' && groupFiles.length === 0)) && (
             <div className="p-20 text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                 <Search size={24} className="text-slate-300" />
               </div>
               <p className="text-slate-500 font-bold">No synchronization matches found.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
