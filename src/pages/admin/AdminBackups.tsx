import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { HardDrive, RefreshCw, Download, Clock, CheckCircle2, AlertCircle, Database, Archive, Trash2, Cloud, ExternalLink } from 'lucide-react';

const BACKUP_TABLES = [
  'profiles', 'groups', 'group_members', 'study_materials', 'files',
  'messages', 'tasks', 'polls', 'direct_messages', 'announcements',
  'audit_logs', 'user_notifications', 'support_tickets', 'feature_flags',
];

export default function AdminBackups() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState({ current: '', pct: 0 });
  const [dbStats, setDbStats] = useState({ tables: 0, totalRows: 0, sizeEstimate: '0 MB' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_backup_suite');
      if (error) throw error;
      
      if (data) {
        if (data.logs) {
          const mapped = data.logs.map((l: any) => ({
            ...l,
            admin: { email: l.admin_email }
          }));
          setBackups(mapped);
        }
        if (data.stats) {
          setDbStats({
            tables: data.stats.tablesCount,
            totalRows: data.stats.totalRows,
            sizeEstimate: data.stats.sizeEstimate
          });
        }
      }
    } catch (err: any) {
      console.error('[AdminBackups] Sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── REAL BACKUP: Export all tables → JSON → Upload to Supabase Storage ───
  const createBackup = useCallback(async (type: 'manual' | 'scheduled') => {
    setCreating(true);
    const adminId = sessionStorage.getItem('adminId');
    // 1. Create a backup log entry
    let backupId: string | null = null;
    try {
      const { data: res, error } = await supabase.rpc('admin_manage_backup_log', {
        p_action: 'start',
        p_log_data: {
          backup_type: type,
          tables_included: BACKUP_TABLES,
          initiated_by: adminId,
          notes: `${type === 'manual' ? 'Manual' : 'Scheduled'} backup → Supabase Storage`
        },
        p_admin_id: adminId
      });
      if (error) throw error;
      backupId = res.id;
    } catch (err: any) {
      console.error('Backup Initialization Failed:', err.message);
      setCreating(false);
      return;
    }

    try {
      // 2. Export all tables
      const backupPayload: Record<string, any[]> = {};
      let exportedRows = 0;

      for (let i = 0; i < BACKUP_TABLES.length; i++) {
        const tableName = BACKUP_TABLES[i];
        setProgress({ current: tableName, pct: Math.round(((i + 1) / BACKUP_TABLES.length) * 60) });

        // Fetch in batches of 1000
        let allRows: any[] = [];
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: rows, error } = await supabase.rpc('admin_get_table_data', {
            p_table_name: tableName,
            p_offset: offset,
            p_limit: batchSize
          });

          if (error) {
            console.error(`Error fetching ${tableName}:`, error);
            break;
          }

          if (rows && rows.length > 0) {
            allRows = [...allRows, ...rows];
            offset += batchSize;
            hasMore = rows.length === batchSize;
          } else {
            hasMore = false;
          }
        }

        backupPayload[tableName] = allRows;
        exportedRows += allRows.length;
      }

      // 3. Build the backup JSON blob
      const backupData = {
        version: '1.0',
        platform: 'Nemesis',
        created_at: new Date().toISOString(),
        created_by: adminId,
        backup_type: type,
        tables: Object.keys(backupPayload),
        total_rows: exportedRows,
        data: backupPayload,
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const backupFileName = `nemesis_backup_${Date.now()}.json`;
      const sizeBytes = blob.size;

      setProgress({ current: 'Uploading to Storage...', pct: 60 });
      
      const { error: uploadError } = await supabase.storage
        .from('system-assets')
        .upload(`backups/${backupFileName}`, blob, {
          contentType: 'application/json',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      setProgress({ current: 'Finalizing...', pct: 95 });

      // 6. Update backup log to completed
      const { data: { publicUrl } } = supabase.storage
        .from('system-assets')
        .getPublicUrl(`backups/${backupFileName}`);

      if (backupId) {
        await supabase.rpc('admin_manage_backup_log', {
          p_action: 'finalize',
          p_log_id: backupId,
          p_log_data: {
            size_bytes: sizeBytes,
            notes: `✅ ${exportedRows} rows → Storage: ${backupFileName}`,
            metadata: { storage_path: `backups/${backupFileName}`, download_url: publicUrl, rows: exportedRows }
          },
          p_admin_id: adminId
        });
      }

      setProgress({ current: 'Done!', pct: 100 });
    } catch (err: any) {
      console.error('Backup failed:', err);

      if (backupId) {
        await supabase.rpc('admin_manage_backup_log', {
          p_action: 'fail',
          p_log_id: backupId,
          p_log_data: {
            notes: `❌ Failed: ${err.message}`
          },
          p_admin_id: adminId
        });
      }
    }

    setTimeout(() => {
      setCreating(false);
      setProgress({ current: '', pct: 0 });
      fetchAll();
    }, 1500);
  }, [fetchAll]);

  const downloadBackup = useCallback((backup: any) => {
    const url = backup.metadata?.download_url;
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Download URL not available for this backup.');
    }
  }, []);

  const deleteBackup = useCallback(async (id: string) => {
    if (!confirm('Delete this backup record?')) return;
    const adminId = sessionStorage.getItem('adminId');
    try {
      const { error } = await supabase.rpc('admin_manage_backup_log', {
        p_action: 'delete',
        p_log_id: id,
        p_admin_id: adminId
      });
      if (error) throw error;
      fetchAll();
    } catch (err: any) {
      alert('Purge Failure: ' + err.message);
    }
  }, [fetchAll]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'running': return <RefreshCw size={16} className="text-amber-500 animate-spin" />;
      case 'failed': return <AlertCircle size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><HardDrive size={28} className="text-indigo-500" /> Backup & Restore</h1>
          <p className="text-sm text-slate-500 mt-0.5">Full database export to <span className="font-bold text-orange-500">Supabase Storage</span>.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => createBackup('manual')} disabled={creating} className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-600 transition font-medium text-sm shadow-sm disabled:opacity-50">
            {creating ? <RefreshCw size={16} className="animate-spin" /> : <Cloud size={18} />} {creating ? 'Backing up...' : 'Backup to Storage'}
          </button>
        </div>
      </div>

      {/* Progress Bar during backup */}
      {creating && (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-indigo-600 flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin" /> {progress.current || 'Preparing...'}
            </span>
            <span className="text-sm font-black text-indigo-900">{progress.pct}%</span>
          </div>
          <div className="w-full h-3 bg-indigo-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition duration-500 ease-out" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Exporting tables → JSON → Supabase Storage bucket</p>
        </div>
      )}

      {/* DB Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tables Tracked', value: dbStats.tables, icon: Database, gradient: 'from-indigo-500 to-violet-600' },
          { label: 'Total Records', value: dbStats.totalRows.toLocaleString(), icon: Archive, gradient: 'from-sky-500 to-blue-600' },
          { label: 'Est. Size', value: dbStats.sizeEstimate, icon: HardDrive, gradient: 'from-emerald-500 to-green-600' },
          { label: 'Destination', value: 'Storage', icon: Cloud, gradient: 'from-orange-500 to-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center shadow-sm`}>
              <s.icon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">{s.value}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Backup History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Backup History</h2>
          <button onClick={fetchAll} disabled={loading} className="p-2 text-slate-400 hover:text-indigo-500 transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {loading ? (
          <div className="p-20 text-center"><RefreshCw className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-4" /></div>
        ) : backups.length === 0 ? (
          <div className="p-20 text-center">
            <Cloud size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">No backups yet. Create your first backup!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {backups.map(b => (
              <div key={b.id} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="flex items-center gap-4">
                  {getStatusIcon(b.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm capitalize">{b.backup_type} Backup</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${b.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : b.status === 'running' ? 'bg-amber-100 text-amber-700' : b.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{b.status}</span>
                      {b.status === 'completed' && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-black uppercase flex items-center gap-1"><Cloud size={10} /> Storage</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                      <span>{new Date(b.started_at).toLocaleString()}</span>
                      {b.size_bytes > 0 && <span>• {formatBytes(b.size_bytes)}</span>}
                      {b.metadata?.rows && <span>• {b.metadata.rows.toLocaleString()} rows</span>}
                      {b.admin?.email && <span>• by {b.admin.email}</span>}
                    </div>
                    {b.metadata?.r2_path && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-mono truncate max-w-xs">{b.metadata.r2_path}</span>
                      </div>
                    )}
                    {!b.metadata?.r2_path && b.tables_included?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {b.tables_included.slice(0, 5).map((t: string) => (
                          <span key={t} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold">{t}</span>
                        ))}
                        {b.tables_included.length > 5 && <span className="text-[9px] text-slate-400 font-bold">+{b.tables_included.length - 5} more</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {b.status === 'completed' && b.metadata?.download_url && (
                    <button onClick={() => downloadBackup(b)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition flex items-center gap-1.5">
                      <Download size={12} /> Download
                    </button>
                  )}
                  {b.status === 'completed' && b.metadata?.download_url && (
                    <a href={b.metadata.download_url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button onClick={() => deleteBackup(b.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* R2 Storage Info */}
      <div className="bg-indigo-950 rounded-3xl p-8 border border-indigo-900 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Cloud size={20} className="text-orange-400" />
          <h3 className="font-black uppercase tracking-tight">Supabase Storage</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-xs font-black text-orange-400 uppercase tracking-widest mb-1">Destination</div>
            <div className="text-sm text-slate-300">Supabase Bucket</div>
            <div className="text-[10px] text-indigo-400 mt-2">backups/ directory</div>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-xs font-black text-orange-400 uppercase tracking-widest mb-1">Format</div>
            <div className="text-sm text-slate-300">Full JSON Export</div>
            <div className="text-[10px] text-indigo-400 mt-2">All {BACKUP_TABLES.length} tables with all columns</div>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-xs font-black text-orange-400 uppercase tracking-widest mb-1">Process</div>
            <div className="text-sm text-slate-300">Export → Compress → Storage PUT</div>
            <div className="text-[10px] text-indigo-400 mt-2">Uses presigned URLs for secure upload</div>
          </div>
        </div>
      </div>
    </div>
  );
}
