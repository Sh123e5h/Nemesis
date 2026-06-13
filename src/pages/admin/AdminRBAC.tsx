import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Trash2, X, RefreshCw, Eye, Lock, UserPlus } from 'lucide-react';

/** Hashes a password using SHA-256 with salt and system-wide pepper. */
async function hashPassword(plain: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain + salt + "nemesis_2026_pepper_v1");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function AdminRBAC() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', password: '', role: 'moderator', display_name: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_rbac_data');
      if (error) throw error;
      if (data) {
        setAdmins(data.admins);
        setPermissions(data.permissions);
      }
    } catch (err: any) {
      console.error('[AdminRBAC] Neural sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const inviteAdmin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteForm.password.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }
    setSaving(true);
    const adminId = sessionStorage.getItem('adminId');

    try {
      const hashedPass = await hashPassword(inviteForm.password, inviteForm.email);
      const { error } = await supabase.rpc('admin_manage_access', {
        p_action: 'invite',
        p_email: inviteForm.email,
        p_password_hash: hashedPass,
        p_role: inviteForm.role,
        p_display_name: inviteForm.display_name || inviteForm.email.split('@')[0],
        p_admin_id: adminId
      });

      if (error) throw error;

      setInviteForm({ email: '', password: '', role: 'moderator', display_name: '' });
      setShowInvite(false);
      fetchAll();
    } catch (err: any) {
      alert('Invitation failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [inviteForm, fetchAll]);

  const updateAdminRole = useCallback(async (id: string, role: string) => {
    const adminId = sessionStorage.getItem('adminId');
    try {
      const { error } = await supabase.rpc('admin_manage_access', {
        p_action: 'update_role',
        p_id: id,
        p_role: role,
        p_admin_id: adminId
      });
      if (error) throw error;
      fetchAll();
    } catch (err: any) {
      alert('Role provisioning failure: ' + err.message);
    }
  }, [fetchAll]);

  const toggleAdminActive = useCallback(async (id: string, current: boolean) => {
    const adminId = sessionStorage.getItem('adminId');
    try {
      await supabase.rpc('admin_manage_access', {
        p_action: 'toggle_active',
        p_id: id,
        p_is_active: current,
        p_admin_id: adminId
      });
      fetchAll();
    } catch (err: any) {
      console.error('[AdminRBAC] Access toggle failure:', err.message);
    }
  }, [fetchAll]);

  const deleteAdmin = useCallback(async (id: string, email: string) => {
    const currentAdminId = sessionStorage.getItem('adminId');
    if (id === currentAdminId) { alert('You cannot delete your own account!'); return; }
    if (!confirm(`Remove admin "${email}" permanently?`)) return;
    
    try {
      const { error } = await supabase.rpc('admin_manage_access', {
        p_action: 'delete',
        p_id: id,
        p_admin_id: currentAdminId
      });
      if (error) throw error;
      fetchAll();
    } catch (err: any) {
      alert('Deletion failure: ' + err.message);
    }
  }, [fetchAll]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'moderator': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'viewer': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const modules = [...new Set(permissions.map(p => p.module))];
  const roles = ['super_admin', 'moderator', 'viewer'];
  const currentAdminId = sessionStorage.getItem('adminId');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Shield size={28} className="text-red-500" /> Access Control</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage admin accounts, roles, and module permissions.</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl hover:bg-red-600 transition font-medium text-sm shadow-sm">
          <UserPlus size={18} /> Invite Admin
        </button>
      </div>

      {/* Admin List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-900">Admin Accounts</h2>
        </div>
        {loading ? (
          <div className="p-20 text-center"><RefreshCw className="animate-spin h-8 w-8 text-red-500 mx-auto mb-4" /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {admins.map(a => (
              <div key={a.id} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-400 to-rose-500 text-white font-black flex items-center justify-center text-lg shadow-sm">
                    {(a.display_name || a.email)?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      {a.display_name || a.email.split('@')[0]}
                      {a.id === currentAdminId && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase">You</span>}
                    </div>
                    <div className="text-xs text-slate-400">{a.email}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase ${getRoleColor(a.role || 'super_admin')}`}>{(a.role || 'super_admin').replace('_', ' ')}</span>
                      {a.last_login && <span className="text-[10px] text-slate-400">Last login: {new Date(a.last_login).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={a.role || 'super_admin'} onChange={e => updateAdminRole(a.id, e.target.value)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none" disabled={a.id === currentAdminId}>
                    {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                  {a.id !== currentAdminId && (
                    <>
                      <button onClick={() => toggleAdminActive(a.id, a.is_active !== false)} className={`p-2 rounded-lg transition ${a.is_active !== false ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100'}`} title={a.is_active !== false ? 'Deactivate' : 'Activate'}>
                        {a.is_active !== false ? <Eye size={16} /> : <Lock size={16} />}
                      </button>
                      <button onClick={() => deleteAdmin(a.id, a.email)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><Lock size={18} className="text-slate-500" /> Permission Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4">Module</th>
                {roles.map(r => <th key={r} className="p-4 text-center">{r.replace('_', ' ')}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {modules.map(mod => (
                <tr key={mod} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 font-bold text-slate-900 capitalize">{mod}</td>
                  {roles.map(role => {
                    const perm = permissions.find(p => p.role === role && p.module === mod);
                    return (
                      <td key={role} className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {perm?.can_view && <span className="px-1.5 py-0.5 bg-sky-100 text-sky-600 rounded text-[9px] font-bold">V</span>}
                          {perm?.can_edit && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[9px] font-bold">E</span>}
                          {perm?.can_delete && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-bold">D</span>}
                          {!perm && <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
          <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-sky-100 text-sky-600 rounded">V</span> View</span>
          <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded">E</span> Edit</span>
          <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded">D</span> Delete</span>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><UserPlus size={18} /> Invite Admin</h2>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <form onSubmit={inviteAdmin} className="p-6 space-y-4">
              <input type="text" placeholder="Display Name" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={inviteForm.display_name} onChange={e => setInviteForm({ ...inviteForm, display_name: e.target.value })} />
              <input type="email" required placeholder="Email Address" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} />
              <input type="password" required placeholder="Initial Password" minLength={8} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} />
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}>
                <option value="super_admin">Super Admin</option>
                <option value="moderator">Moderator</option>
                <option value="viewer">Viewer (Read-Only)</option>
              </select>
              <button type="submit" disabled={saving} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition disabled:opacity-50">{saving ? 'Inviting...' : 'Invite Admin'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
