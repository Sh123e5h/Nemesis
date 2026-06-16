import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import UserAvatar from '../../components/UserAvatar';
import { Search, Trash2, Edit2, X, Save, Folder } from 'lucide-react';
import { Skeleton, SkeletonLine } from '../../components/Skeleton';

interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
    avatar_url?: string | null;
  };
}

export default function AdminGroups() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', is_private: false });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rpcData, error } = await supabase.rpc('get_admin_groups', {
        p_search: search,
        p_limit: 50
      });

      if (error) throw error;

      if (rpcData) {
        // Map the flat RPC result to the component's nested interface
        const mappedData = rpcData.map((g: any) => ({
          ...g,
          profiles: {
            full_name: g.creator_full_name,
            username: g.creator_username,
            avatar_url: g.creator_avatar_url
          }
        }));
        setGroups(mappedData);
      }
    } catch (err) {
      console.error('Failed to decommission RLS barrier for groups:', err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const deleteGroup = useCallback(async (groupId: string, groupName: string) => {
    if (!confirm(`CRITICAL WARNING:\n\nAre you absolutely sure you want to permanently delete the group "${groupName}"?\nThis action will also purge all associated files, messages, and member data.`)) return;

    try {
      const adminId = sessionStorage.getItem('adminId');
      if (!adminId) throw new Error("Administrative identity not found. Please log in again.");

      const { error } = await supabase.rpc('admin_manage_group', {
        target_group_id: groupId,
        admin_id: adminId,
        action_type: 'delete'
      });

      if (error) throw error;
      
      alert("Group successfully decommissioned.");
      fetchGroups();
    } catch (err: any) {
      console.error('Group Purge Failed:', err);
      alert("MANAGEMENT ERROR: " + (err.message || "Unauthorized delete attempt."));
    }
  }, [fetchGroups]);

  const startEdit = useCallback((group: GroupItem) => {
    setEditingGroup(group);
    setEditForm({ 
      name: group.name || '', 
      description: group.description || '', 
      is_private: group.is_private || false 
    });
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingGroup) return;
    setSavingEdit(true);
    
    try {
      const adminId = sessionStorage.getItem('adminId');
      if (!adminId) throw new Error("Administrative identity not found.");

      const { error } = await supabase.rpc('admin_manage_group', {
        target_group_id: editingGroup.id,
        admin_id: adminId,
        action_type: 'update',
        new_name: editForm.name,
        new_description: editForm.description,
        new_is_private: editForm.is_private
      });

      if (error) throw error;
      
      alert("Group record enforced successfully.");
      setEditingGroup(null);
      fetchGroups();
    } catch (err: any) {
      console.error('Enforcement Failed:', err);
      alert("MODIFICATION ERROR: " + (err.message || "Unauthorized edit attempt."));
    } finally {
      setSavingEdit(false);
    }
  }, [editingGroup, editForm, fetchGroups]);

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Group Management</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
          <input 
            type="text" 
            placeholder="Search groups..." 
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none w-full md:w-64"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="p-5">Group Identity</th>
                <th className="p-5">Creator</th>
                <th className="p-5">Privacy</th>
                <th className="p-5">Registered</th>
                <th className="p-5 text-right">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td className="p-4">
                      <div className="space-y-2">
                        <SkeletonLine width="140px" height="14px" />
                        <SkeletonLine width="200px" height="10px" className="opacity-40" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <SkeletonLine width="100px" height="14px" />
                        <SkeletonLine width="60px" height="10px" className="opacity-40" />
                      </div>
                    </td>
                    <td className="p-4">
                      <Skeleton variant="rectangle" className="w-[60px] h-[24px] rounded" />
                    </td>
                    <td className="p-4">
                      <SkeletonLine width="80px" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton variant="rectangle" className="w-[60px] h-[32px] rounded-lg" />
                        <Skeleton variant="rectangle" className="w-[60px] h-[32px] rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : groups.map(g => !g ? null : (
                <tr key={g.id} className="hover:bg-slate-50 transition">
                  <td className="p-5">
                    <div className="font-black text-slate-900 uppercase tracking-tight">{g.name}</div>
                    <div className="text-slate-400 text-[10px] font-medium truncate max-w-xs mt-0.5">{g.description || 'No description provided'}</div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar 
                        url={g.profiles?.avatar_url} 
                        name={g.profiles?.full_name} 
                        size="xs" 
                      />
                      <div className="min-w-0">
                        <div className="text-slate-900 font-bold truncate">{g.profiles?.full_name}</div>
                        <div className="text-slate-400 text-[10px] font-medium">@{g.profiles?.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${g.is_private ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                      {g.is_private ? 'Private' : 'Public'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">{g.created_at ? new Date(g.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => startEdit(g)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition bg-sky-50 text-sky-600 hover:bg-sky-100"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button 
                      onClick={() => deleteGroup(g.id, g.name)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && groups.length === 0 && (
            <div className="flex flex-col items-center justify-center p-16 text-center border-t border-slate-100">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100 shadow-sm ring-4 ring-white">
                <Folder size={36} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No groups found</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-2">There are no groups recorded in the system. They will appear here once created by users.</p>
            </div>
          )}
        </div>
      </div>

      {editingGroup && (
        <div className="modal-overlay">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-900">Force Edit Group Details</h2>
              <button onClick={() => setEditingGroup(null)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 focus:outline-none" rows={3}></textarea>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input type="checkbox" checked={editForm.is_private} onChange={e => setEditForm({...editForm, is_private: e.target.checked})} className="rounded text-sky-500 focus:ring-sky-500" />
                <span className="text-sm text-slate-700 font-medium">Make Group Private</span>
              </label>
              <button onClick={saveEdit} disabled={savingEdit} className="w-full bg-red-600 text-white p-2.5 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                <Save size={18} /> {savingEdit ? 'Enforcing...' : 'Enforce Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
