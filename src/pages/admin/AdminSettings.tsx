import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings, Trash2, AlertTriangle, ShieldCheck, Database, UserX, Key, RefreshCw, ShieldAlert, CheckCircle, Clock, HardDrive, Wifi } from 'lucide-react';

/** Hashes a password using SHA-256 with salt and system-wide pepper. */
async function hashPassword(plain: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain + salt + "nemesis_2026_pepper_v1");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function AdminSettings() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [purging, setPurging] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [maintenance, setMaintenance] = useState({ enabled: false, expires_at: null as string | null });
  const [maintenanceSchedule, setMaintenanceSchedule] = useState({ active: false, start_at: '' as string | null, message: '' });
  const [mLoading, setMLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const [infraLimits, setInfraLimits] = useState({ supabase_max_mb: 850, r2_max_gb: 9.5 });
  const [infraLoading, setInfraLoading] = useState(false);



  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_system_settings');
      if (error) throw error;

      if (data) {
        if (data.maintenance_mode) setMaintenance(data.maintenance_mode);
        if (data.infrastructure_limits) setInfraLimits(data.infrastructure_limits);
        if (data.maintenance_schedule) setMaintenanceSchedule(data.maintenance_schedule);
      }
    } catch (err: any) {
      console.error('[AdminSettings] Sync failure:', err.message);
    }
  }, []);

  // fetchSettings is stable (empty deps) — call it directly on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    let timer: any;
    if (maintenance.enabled && maintenance.expires_at) {
      timer = setInterval(() => {
        const remaining = new Date(maintenance.expires_at!).getTime() - Date.now();
        if (remaining <= 0) {
          setTimeLeft('Expiring...');
          setMaintenance(prev => ({ ...prev, enabled: false, expires_at: null }));
        } else {
          const mins = Math.floor(remaining / 60000);
          const secs = Math.floor((remaining % 60000) / 1000);
          setTimeLeft(`${mins}m ${secs}s`);
        }
      }, 1000);
    } else {
      setTimeLeft(null);
    }
    return () => clearInterval(timer);
  }, [maintenance]);

  const updateInfraLimits = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setInfraLoading(true);
    try {
      const adminId = sessionStorage.getItem('adminId');
      const { error } = await supabase.rpc('admin_save_system_setting', {
        p_key: 'infrastructure_limits',
        p_value: infraLimits as any,
        p_admin_id: adminId
      });
      if (error) throw error;
      
      // Live sync: fetch fresh settings instead of just alerting
      await fetchSettings();
      alert('Infrastructure capacity recalibrated successfully.');
    } catch (err: any) {
      alert('Infra sync failure: ' + err.message);
    } finally {
      setInfraLoading(false);
    }
  }, [infraLimits, fetchSettings]);


  const toggleMaintenance = useCallback(async (enabled: boolean, durationMinutes?: number) => {
    setMLoading(true);
    const expires_at = durationMinutes ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null;
    const newValue = { enabled, expires_at };
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { error } = await supabase.rpc('admin_save_system_setting', {
        p_key: 'maintenance_mode',
        p_value: newValue as any,
        p_admin_id: adminId
      });
      if (error) throw error;

      setMaintenance(newValue);
    } catch (err: any) {
      alert('Lockdown failure: ' + err.message);
    } finally {
      setMLoading(false);
    }
  }, []);

  const updateMaintenanceSchedule = useCallback(async () => {
    setMsLoading(true);
    try {
      const adminId = sessionStorage.getItem('adminId');
      const { error } = await supabase.rpc('admin_save_system_setting', {
        p_key: 'maintenance_schedule',
        p_value: maintenanceSchedule as any,
        p_admin_id: adminId
      });
      if (error) throw error;
      
      // Live sync: ensure UI reflects the newly deployed schedule
      await fetchSettings();
      alert('Maintenance schedule deployed successfully.');
    } catch (err: any) {
      alert('Schedule sync failure: ' + err.message);
    } finally {
      setMsLoading(false);
    }
  }, [maintenanceSchedule, fetchSettings]);

  const changePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordMsg('New password must be at least 8 characters long.');
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg('');
    const adminId = sessionStorage.getItem('adminId');
    if (!adminId) { setPasswordMsg('Session expired. Please re-login.'); setPasswordLoading(false); return; }

    try {
      const { data: rbacData } = await supabase.rpc('admin_get_rbac_data');
      const me = rbacData?.admins?.find((a: any) => a.id === adminId);
      if (!me?.email) {
        throw new Error("Unable to verify secure identity format for encryption.");
      }

      const oldHash = await hashPassword(oldPassword, me.email);
      const newHash = await hashPassword(newPassword, me.email);

      const { data, error: rpcError } = await supabase.rpc('admin_change_password', {
        p_admin_id: adminId,
        p_old_password_hash: oldHash,
        p_new_password_hash: newHash
      });

      if (rpcError) throw rpcError;

      if (!data.success) {
        setPasswordMsg(data.error);
      } else {
        setPasswordMsg('Password updated successfully!');
        setOldPassword('');
        setNewPassword('');
      }
    } catch (err: any) {
      setPasswordMsg('Nexus uplink failure: ' + err.message);
    } finally {
      setPasswordLoading(false);
    }
  }, [oldPassword, newPassword]);

  const purgeOldLogs = useCallback(async () => {
    if (!confirm('This will permanently delete all audit logs older than 30 days. Continue?')) return;
    setPurging(true);
    try {
      const adminId = sessionStorage.getItem('adminId');
      const { error } = await supabase.rpc('admin_cleanup_operations', {
        p_action: 'purge_logs',
        p_admin_id: adminId
      });
      if (error) throw error;
      alert('Audit logs purged successfully.');
    } catch (err: any) {
      alert('Purge failure: ' + err.message);
    } finally {
      setPurging(false);
    }
  }, []);

  const deactivateInactive = useCallback(async () => {
    if (!confirm('This will suspend all users who have not been online in the last 90 days. Continue?')) return;
    setDeactivating(true);
    try {
      const adminId = sessionStorage.getItem('adminId');
      const { data, error } = await supabase.rpc('admin_cleanup_operations', {
        p_action: 'deactivate_inactive',
        p_admin_id: adminId
      });
      if (error) throw error;
      alert(`Mass deactivation complete: ${data.count || 0} user(s) suspended.`);
    } catch (err: any) {
      alert('Operation sync failure: ' + err.message);
    } finally {
      setDeactivating(false);
    }
  }, []);

  const purgeInactiveGroupAssets = useCallback(async () => {
    if (!confirm('This will permanently delete all files from groups with no activity in the last 90 days. THIS CANNOT BE UNDONE. Continue?')) return;
    setPurging(true);
    try {
      const adminId = sessionStorage.getItem('adminId');
      const { data, error } = await supabase.rpc('admin_cleanup_operations', {
        p_action: 'purge_assets',
        p_admin_id: adminId
      });
      if (error) throw error;
      alert(`Content purging complete: ${data.count || 0} relative assets purged.`);
    } catch (err: any) {
      alert('Asset purge failure: ' + err.message);
    } finally {
      setPurging(false);
    }
  }, []);

  return (
    <div className="space-y-8 text-slate-900 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="text-sky-500" size={24} /> System Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage admin credentials and platform maintenance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Platform Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><ShieldCheck size={18} className="text-sky-500" /> Platform Info</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 font-medium">App Name</span>
                <p className="text-slate-900 font-bold mt-0.5">Nemesis</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Admin Console</span>
                <p className="text-slate-900 font-bold mt-0.5">v1.0</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Framework</span>
                <p className="text-slate-900 font-bold mt-0.5">React + Vite + Supabase</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Session</span>
                <p className="text-slate-900 font-bold mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" /> Active
                </p>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><Key size={18} className="text-amber-500" /> Change Admin Password</h2>
            </div>
            <form onSubmit={changePassword} className="p-6 space-y-4">
              {passwordMsg && (
                <div className={`p-3 rounded-xl text-sm font-medium ${passwordMsg.includes('success') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {passwordMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <input 
                  type="password" 
                  required 
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 focus:outline-none transition-all shadow-sm text-slate-900 placeholder:text-slate-300"
                  value={oldPassword} 
                  onChange={e => setOldPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input 
                  type="password" 
                  required 
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 focus:outline-none transition-all shadow-sm text-slate-900 placeholder:text-slate-300"
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <button type="submit" disabled={passwordLoading} className="bg-sky-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-sky-600 transition disabled:opacity-50 flex items-center gap-2">
                <RefreshCw size={16} className={passwordLoading ? 'animate-spin' : ''} />
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
            <div className="p-5 border-b border-red-100 bg-red-50">
              <h2 className="font-bold text-red-700 flex items-center gap-2"><AlertTriangle size={18} /> Danger Zone</h2>
              <p className="text-red-500 text-xs mt-0.5">These actions are destructive and cannot be undone.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2"><Database size={16} className="text-slate-500" /> Purge Old Audit Logs</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Delete all logs older than 30 days to free up space.</p>
                </div>
                <button 
                  onClick={purgeOldLogs} 
                  disabled={purging}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> {purging ? 'Purging...' : 'Purge'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2"><UserX size={16} className="text-slate-500" /> Mass-Deactivate Inactive Users</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Suspend users who haven't logged in for 90+ days.</p>
                </div>
                <button 
                  onClick={deactivateInactive} 
                  disabled={deactivating}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                >
                  <UserX size={14} /> {deactivating ? 'Processing...' : 'Deactivate'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2"><HardDrive size={16} className="text-slate-500" /> Purge Inactive Group Assets</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Remove files from groups with no activity for 90+ days.</p>
                </div>
                <button 
                  onClick={purgeInactiveGroupAssets} 
                  disabled={purging}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                >
                  <HardDrive size={14} /> {purging ? 'Purging...' : 'Purge Assets'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Maintenance Mode */}
          <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${maintenance.enabled ? 'border-amber-200' : 'border-slate-100'}`}>
            <div className={`p-5 border-b flex items-center justify-between ${maintenance.enabled ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
              <h2 className={`font-bold flex items-center gap-2 ${maintenance.enabled ? 'text-amber-800' : 'text-slate-900'}`}>
                <AlertTriangle size={18} /> Platform Maintenance
              </h2>
              {maintenance.enabled && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    System Lockdown
                </div>
              )}
            </div>
            <div className="p-6 space-y-6">
              <div className="flex bg-slate-50 rounded-xl p-4 border border-slate-100 items-center justify-between">
                <div className="max-w-[150px]">
                  <h3 className="font-semibold text-slate-900 text-xs">Lockdown Status</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Restrict users during updates.</p>
                </div>
                <button 
                  onClick={() => toggleMaintenance(!maintenance.enabled)} 
                  disabled={mLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 border ${
                    maintenance.enabled 
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300' 
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-300'
                  }`}
                >
                  {mLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : maintenance.enabled ? (
                    <><ShieldAlert size={14} /> Disable</>
                  ) : (
                    <><CheckCircle size={14} /> Enable</>
                  )}
                </button>
              </div>

              {!maintenance.enabled ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { label: '15 Mins', val: 15 },
                    { label: '30 Mins', val: 30 },
                    { label: '1 Hour', val: 60 },
                    { label: 'Indefinite', val: undefined }
                  ].map((d, i) => (
                    <button
                      key={i}
                      onClick={() => toggleMaintenance(true, d.val)}
                      disabled={mLoading}
                      className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:border-sky-500 hover:text-sky-600 hover:bg-sky-50 transition flex flex-col items-center gap-1"
                    >
                      <Clock size={14} className="opacity-50" />
                      {d.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                      <ShieldCheck size={20} />
                  </div>
                  <div>
                      <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">Active Lockdown</div>
                      <div className="text-slate-600 text-[11px] font-medium mt-0.5">
                        {timeLeft ? `Ends in: ${timeLeft}` : 'Manual release required.'}
                      </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Maintenance */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                   <Clock size={18} className="text-sky-500" /> Maintenance Scheduler
                </h2>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black uppercase text-slate-400">Status:</span>
                   <div className={`w-2 h-2 rounded-full ${maintenanceSchedule.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                </div>
             </div>
             <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                   <div>
                      <div className="text-xs font-bold text-slate-900 uppercase">Enable Countdown</div>
                      <p className="text-[10px] text-slate-500">Show notification banner to users.</p>
                   </div>
                   <button 
                     onClick={() => setMaintenanceSchedule({ ...maintenanceSchedule, active: !maintenanceSchedule.active })}
                     className={`w-12 h-6 rounded-full transition-colors relative ${maintenanceSchedule.active ? 'bg-sky-500' : 'bg-slate-300'}`}
                   >
                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${maintenanceSchedule.active ? 'right-1' : 'left-1'}`} />
                   </button>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Launch Epoch (Start Date/Time)</label>
                   <input 
                     type="datetime-local"
                     className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all shadow-sm text-slate-900"
                     value={maintenanceSchedule.start_at || ''}
                     onChange={e => setMaintenanceSchedule({ ...maintenanceSchedule, start_at: e.target.value })}
                   />
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Protocol Message</label>
                   <input 
                     type="text"
                     placeholder="e.g., Database Neural Sync in progress..."
                     className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all shadow-sm text-slate-900 placeholder:text-slate-300"
                     value={maintenanceSchedule.message}
                     onChange={e => setMaintenanceSchedule({ ...maintenanceSchedule, message: e.target.value })}
                   />
                </div>

                <button 
                  onClick={updateMaintenanceSchedule}
                  disabled={msLoading}
                  className="w-full py-3 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-sky-500 hover:text-white transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  <RefreshCw size={14} className={msLoading ? 'animate-spin' : ''} />
                  {msLoading ? 'Syncing...' : 'Deploy Schedule'}
                </button>
             </div>
          </div>

          {/* Infrastructure Capacity */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><HardDrive size={18} className="text-indigo-500" /> Infrastructure Capacity</h2>
            </div>
            <form onSubmit={updateInfraLimits} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Supabase Storage (MB)</label>
                  <div className="relative">
                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input 
                      type="number" 
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all shadow-sm text-slate-900"
                      value={infraLimits.supabase_max_mb}
                      onChange={e => setInfraLimits({ ...infraLimits, supabase_max_mb: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cloudflare R2 (GB)</label>
                  <div className="relative">
                    <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input 
                      type="number" 
                      step="0.1"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all shadow-sm text-slate-900"
                      value={infraLimits.r2_max_gb}
                      onChange={e => setInfraLimits({ ...infraLimits, r2_max_gb: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={infraLoading}
                className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-600 transition disabled:opacity-50 text-xs flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} className={infraLoading ? 'animate-spin' : ''} />
                Save Infrastructure Limits
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
