import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Upload, ArrowLeft, AlertTriangle, AlertCircle, Cloud, RefreshCw, Trash2, User } from 'lucide-react';
import { uploadSmart } from '../lib/storage';
import UserAvatar from '../components/UserAvatar';

import { motion } from 'framer-motion';


export default function ProfileEdit() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(true);

  const [avatar, setAvatar] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');



  // Delete account confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');


  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!username) {
        setUsernameAvailable(null);
        setUsernameError('');
        return;
      }

      if (username === profile?.username) {
        setUsernameAvailable(true);
        setUsernameError('');
        return;
      }

      if (username.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        setUsernameAvailable(null);
        return;
      }

      if (!/^[a-z][a-z0-9_]*$/.test(username)) {
        setUsernameError('Only lowercase, numbers, underscores. Cannot start with number/underscore.');
        setUsernameAvailable(null);
        return;
      }

      setCheckingUsername(true);
      setUsernameError('');

      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      setCheckingUsername(false);

      if (dbError) {
        setUsernameError('Error checking availability');
        setUsernameAvailable(null);
      } else if (data) {
        setUsernameAvailable(false);
        setUsernameError('Username is already taken');
      } else {
        setUsernameAvailable(true);
        setUsernameError('');
      }

    }, 500);

    return () => clearTimeout(timer);
  }, [username, profile?.username]);

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || usernameAvailable === false) return;
    setLoading(true);
    let newAvatarUrl = profile?.avatar_url;

    try {
      let hash = profile?.storage_hash;
      if (avatar) {
        const result = await uploadSmart(avatar, 'avatars', { cacheControl: '31536000' });
        newAvatarUrl = result.url;
        hash = result.hash;
      }

      const { error } = await supabase.from('profiles').update({
        full_name: fullName,
        username: username,
        avatar_url: newAvatarUrl,
        storage_hash: hash
      }).eq('id', user.id);

      if (error) throw error;

      useAuthStore.setState({ profile: { ...profile!, full_name: fullName, username: username, avatar_url: newAvatarUrl, storage_hash: hash } });
      setSuccess('Profile updated successfully!');
      setTimeout(() => navigate('/profile'), 1500);

    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      alert("Error updating profile: " + message);
    } finally {
      setLoading(false);
    }
  }, [user, usernameAvailable, avatar, fullName, username, profile, navigate]);

  // ─── Google Drive Backup State ───
  const lastSyncTime = profile?.gdrive_backup_status?.last_backup_at



  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    setShowDeleteModal(false);
    setLoading(true);
    try {
      // Remove quizzes before DB purge: purge_authenticated_user deletes public.users while
      // quizzes.created_by still references it unless we clear quizzes (and questions) first.
      const { data: quizRows, error: quizListError } = await supabase
        .from("quizzes")
        .select("id")
        .eq("created_by", user.id);
      if (quizListError) throw quizListError;
      const quizIds = (quizRows ?? []).map((r) => r.id);
      const batchSize = 200;
      for (let i = 0; i < quizIds.length; i += batchSize) {
        const slice = quizIds.slice(i, i + batchSize);
        const { error: qqErr } = await supabase.from("quiz_questions").delete().in("quiz_id", slice);
        if (qqErr) throw qqErr;
      }
      const { error: quizzesErr } = await supabase.from("quizzes").delete().eq("created_by", user.id);
      if (quizzesErr) throw quizzesErr;

      // Final Purge through RPC (Security Definer handles auth.users deletion)
      const { error: rpcError } = await supabase.rpc('purge_authenticated_user');
      if (rpcError) throw rpcError;

      // Revoke External Integrations — wipe ALL Drive tokens from both storage layers
      const driveKeys = [
        'gdrive_access_token',
        'gdrive_refresh_token',
        'gdrive_token_expiry',
        'gdrive_scopes_valid',
        'gdrive_auth_permanent_lockout',
      ];
      driveKeys.forEach(k => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });

      // Final Sign Out to clear session state locally
      await supabase.auth.signOut();

      // Redirect home
      navigate('/');
    } catch (err: any) {
      console.error("Purge Error:", err);
      alert("Error during account deletion: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-4 min-w-0 w-full overflow-x-hidden mobile-hardened">
      <div className="flex items-center px-1">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 bg-white/80 backdrop-blur-xl border border-slate-200/60 px-4 py-2.5 rounded-full shadow-sm shadow-slate-200/50 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:shadow-md hover:-translate-x-1 transition group font-black text-[10px] uppercase tracking-widest"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Profile
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[1.5rem] shadow-xl shadow-sky-500/5 border border-white/60">
        <h1 className="text-base font-black text-slate-900 mb-6 flex items-center gap-2.5 uppercase tracking-tight">
          <div className="w-8 h-8 bg-sky-50 text-sky-500 rounded-lg flex items-center justify-center border border-white shadow-inner">
            <User size={16} />
          </div>
          Personal Information
        </h1>

        {success && <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 border border-green-200 font-medium">{success}</div>}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 md:items-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <UserAvatar
              url={avatar ? URL.createObjectURL(avatar) : profile?.avatar_url}
              email={user?.email}
              name={fullName}
              size="2xl"
              className="border-4 border-white shadow-md mx-auto md:mx-0"
            />

            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h3 className="font-semibold text-slate-900 mb-1">Profile Photo</h3>
              <p className="text-sm text-slate-500 mb-3">Upload a clean, recognizable avatar for your peers.</p>
              <motion.label
                whileHover={{ scale: 1.05, backgroundColor: '#f8fafc' }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition shadow-sm font-medium text-sm text-slate-700"
              >
                <Upload size={16} /> Choose Image
                <input type="file" className="hidden" accept="image/*" onChange={e => setAvatar(e.target.files?.[0] || null)} />
              </motion.label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-1.5 uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 transition outline-none shadow-sm placeholder:text-slate-400"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-1.5 uppercase tracking-wide">Username</label>
              <div className={`flex items-center bg-white border rounded-xl focus-within:ring-2 transition shadow-sm ${usernameAvailable === true ? 'border-green-500 focus-within:ring-green-500' :
                usernameError ? 'border-red-500 focus-within:ring-red-500' :
                  'border-slate-300 focus-within:ring-sky-500'
                }`}>
                <div className="pl-4 flex items-center justify-center pointer-events-none select-none">
                  <span className="text-slate-900 font-black text-xl leading-none">@</span>
                </div>
                <input
                  type="text"
                  maxLength={20}
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase())}
                  className="flex-1 p-3 pl-1.5 bg-transparent border-none focus:ring-0 outline-none shadow-none text-slate-950 font-medium"
                  placeholder="username"
                  required
                />
              </div>
              {checkingUsername && <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin" /> Verifying availability...
              </p>}
              {usernameError && <p className="text-xs text-red-500 mt-1">{usernameError}</p>}
              {usernameAvailable && !usernameError && username !== profile?.username && <p className="text-xs text-green-600 mt-1">Username is available!</p>}
            </div>
          </div>

          <div className="pt-2">
            <motion.button
              type="submit"
              disabled={loading || !usernameAvailable}
              whileHover={!(loading || !usernameAvailable) ? { scale: 1.02 } : {}}
              whileTap={!(loading || !usernameAvailable) ? { scale: 0.98 } : {}}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold p-3 rounded-xl transition disabled:opacity-50 shadow-lg shadow-sky-500/20"
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </motion.button>
          </div>
        </form>
      </div>

      {/* Google Drive Status Section */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 transition hover:shadow-md mt-6">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Cloud className="text-blue-500" />
            Cloud Storage & Sync
          </h2>
          <p className="text-slate-500 text-sm md:pr-12 leading-relaxed">
            Your workspace data is automatically synchronized with your Google Drive. Manage your backup settings and restore data in the main settings.
          </p>
          {lastSyncTime && (
            <div className="text-xs text-emerald-600 font-bold mt-2">
              <span>Last Sync: {new Date(lastSyncTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
        <div className="shrink-0">
          <motion.button
            onClick={() => navigate('/settings')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/10"
          >
            Manage Sync
          </motion.button>
        </div>
      </div>


      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition mt-6">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={22} /> Danger Zone
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
            Once deleted, your account and all associated data are permanently removed. This action cannot be undone.
          </p>
        </div>
        <div className="shrink-0">
          <motion.button
            onClick={() => { setDeleteConfirmText(''); setShowDeleteModal(true); }}
            whileHover={{ scale: 1.05, backgroundColor: '#fef2f2' }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition shadow-sm text-sm"
          >
            <Trash2 size={16} />
            Delete My Account
          </motion.button>
        </div>
      </div>

      {/* ─── Delete Account Confirmation Modal ─── */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Delete Account</h3>
                <p className="text-xs text-slate-500">This action is permanent and irreversible.</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 leading-relaxed">
              Your account, profile, all uploaded files, groups, tasks, and cloud backups will be <strong>permanently deleted</strong>. There is no recovery.
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">
                Type <span className="text-red-600 font-black">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || loading}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

    </div>
  );
}
