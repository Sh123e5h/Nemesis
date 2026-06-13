import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Star, Flame, Target, RefreshCw, Plus, Trash2, X, Save, Award, Zap, Search, UserCheck } from 'lucide-react';
import UserAvatar from '../../components/UserAvatar';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number;
}

interface LeaderboardUser {
  id: string;
  user_id: string;
  total_points: number;
  streak_days: number;
  level: number;
  full_name: string;
  username: string;
  avatar_url: string;
}

interface PointsConfig {
  [key: string]: number;
}

export default function AdminGamification() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'badges' | 'leaderboard' | 'config'>('overview');
  const [showCreate, setShowCreate] = useState(false);
  const [showAward, setShowAward] = useState<Badge | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: '🏆', points_required: 0 });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalPoints: 0, avgPoints: 0, topStreak: 0, badgesAwarded: 0 });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_gamification_suite');
      if (error) throw error;
      
      if (data) {
        if (data.badges) setBadges(data.badges);
        if (data.leaderboard) setLeaderboard(data.leaderboard);
        if (data.config) setPointsConfig(data.config);
        if (data.stats) setStats(data.stats);
      }
    } catch (err: any) {
      console.error('[AdminGamification] Sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const searchUsers = useCallback(async (val: string) => {
    setUserSearch(val);
    if (val.length < 2) {
      setFoundUsers([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('admin_search_profiles', { p_query: val });
      if (error) throw error;
      setFoundUsers(data || []);
    } catch (err: any) {
      console.error('Search Failure:', err.message);
    } finally {
      setSearching(false);
    }
  }, []);

  const awardBadgeToUser = useCallback(async (userId: string, badge: Badge) => {
    setSaving(true);
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { data, error } = await supabase.rpc('admin_award_badge', {
        p_user_id: userId,
        p_badge_id: badge.id,
        p_admin_id: adminId
      });

      if (error) throw error;
      
      if (!data.success) {
        alert('Award Error: ' + data.error);
      } else {
        alert(`Badge "${badge.name}" awarded successfully! Notification sent.`);
        setShowAward(null);
        fetchAll();
      }
    } catch (err: any) {
      console.error('Moderation Failure:', err.message);
      alert('Moderation Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [fetchAll]);

  const createBadge = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { error } = await supabase.rpc('admin_manage_badge', {
        p_action: 'create',
        p_badge_data: form as any,
        p_admin_id: adminId
      });
      if (error) throw error;

      setForm({ name: '', description: '', icon: '🏆', points_required: 0 });
      setShowCreate(false);
      fetchAll();
    } catch (err: any) {
      alert('Creation Failure: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [form, fetchAll]);

  const deleteBadge = useCallback(async (id: string) => {
    if (!confirm('Delete this badge permanently?')) return;
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { error } = await supabase.rpc('admin_manage_badge', {
        p_action: 'delete',
        p_badge_id: id,
        p_admin_id: adminId
      });
      if (error) throw error;
      fetchAll();
    } catch (err: any) {
      alert('Purge Failure: ' + err.message);
    }
  }, [fetchAll]);

  const savePointsConfig = useCallback(async () => {
    setSaving(true);
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { error } = await supabase.rpc('admin_save_system_setting', {
        p_key: 'points_config',
        p_value: pointsConfig as any,
        p_admin_id: adminId
      });
      if (error) throw error;
      alert('Points configuration saved and audited successfully!');
    } catch (err: any) {
      alert('Sync Failure: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [pointsConfig]);

  const syncAllBadges = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.rpc('sync_all_badges');
      alert('System-wide synchronization complete! All qualified users have been awarded their badges.');
      fetchAll();
    } catch (err: any) {
      alert('Sync Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  const emojiOptions = ['🏆', '⭐', '🔥', '🧠', '📚', '🦋', '🤝', '💎', '🎯', '🚀', '👑', '🌟', '💪', '🎓', '🏅'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Trophy size={28} className="text-amber-500" /> Gamification</h1>
          <p className="text-sm text-slate-500 mt-0.5">Points, badges, streaks, and leaderboards.</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-amber-500 transition shadow-sm">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm w-fit">
        {(['overview', 'badges', 'leaderboard', 'config'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition ${tab === t ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:bg-slate-50'}`}>{t}</button>
        ))}
      </div>

      {tab === 'badges' && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4">
           <div className="flex items-center gap-3 text-amber-800">
             <Zap size={20} className="text-amber-500" />
             <div className="text-sm">
               <span className="font-bold">Automated Badging Active</span>
               <p className="opacity-80 text-xs">Users automatically receive badges when they reach the required XP milestones.</p>
             </div>
           </div>
           <button 
             onClick={syncAllBadges}
             className="px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition shadow-sm flex items-center gap-2"
           >
             <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync All Users
           </button>
        </div>
      )}

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total XP Distributed', value: stats.totalPoints.toLocaleString(), icon: Zap, gradient: 'from-amber-500 to-orange-600' },
              { label: 'Avg XP / User', value: stats.avgPoints, icon: Target, gradient: 'from-violet-500 to-purple-600' },
              { label: 'Top Streak', value: `${stats.topStreak}d`, icon: Flame, gradient: 'from-red-500 to-rose-600' },
              { label: 'Badges Awarded', value: stats.badgesAwarded, icon: Award, gradient: 'from-sky-500 to-blue-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className={`w-10 h-10 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center mb-3`}>
                  <s.icon size={20} className="text-white" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">{s.value}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Star size={18} className="text-amber-500" /> Top 5 Users</h3>
            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((u, i) => (
                <div key={u.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300'}`}>#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-900">{u.full_name || u.username || 'Unknown'}</div>
                    <div className="text-[10px] text-slate-400">Level {u.level} • {u.streak_days || 0}d streak</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-amber-600">{u.total_points} XP</div>
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && <p className="text-center text-slate-400 italic py-6">No points data yet.</p>}
            </div>
          </div>
        </>
      )}

      {tab === 'badges' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl hover:bg-amber-600 transition font-medium text-sm"><Plus size={18} /> Create Badge</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map(b => (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-start gap-4 hover:border-amber-200 transition-colors group">
                <div className="text-4xl">{b.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900">{b.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{b.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.points_required > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {b.points_required > 0 ? `Auto-Award @ ${b.points_required} XP` : 'Manual Award Only'}
                    </span>
                  </div>
                  <button 
                    onClick={() => { setShowAward(b); setUserSearch(''); setFoundUsers([]); }}
                    className="mt-4 w-full py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition flex items-center justify-center gap-1.5"
                  >
                    <UserCheck size={12} /> Award to User
                  </button>
                </div>
                <button onClick={() => deleteBadge(b.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          {showCreate && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h2 className="font-bold text-slate-900">Create Badge</h2>
                  <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
                </div>
                <form onSubmit={createBadge} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Icon</label>
                    <div className="flex gap-2 flex-wrap">
                      {emojiOptions.map(e => (
                        <button key={e} type="button" onClick={() => setForm({ ...form, icon: e })} className={`w-10 h-10 rounded-lg text-xl border-2 transition ${form.icon === e ? 'border-amber-500 bg-amber-50 scale-110' : 'border-slate-200 hover:border-slate-400'}`}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <input type="text" required placeholder="Badge Name" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  <input type="text" placeholder="Description" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  <input type="number" min={0} placeholder="Points Required (0 = manual award)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={form.points_required} onChange={e => setForm({ ...form, points_required: parseInt(e.target.value) || 0 })} />
                  <button type="submit" disabled={saving} className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition disabled:opacity-50">{saving ? 'Creating...' : 'Create Badge'}</button>
                </form>
              </div>
            </div>
          )}

          {showAward && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div>
                    <h2 className="font-bold text-slate-900">Award Badge</h2>
                    <p className="text-xs text-amber-600 font-bold uppercase tracking-tight">{showAward.name}</p>
                  </div>
                  <button onClick={() => setShowAward(null)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search size={16} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Search user by name or username..." 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      value={userSearch}
                      onChange={e => searchUsers(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 min-h-[200px] max-h-[300px] overflow-y-auto pr-1">
                    {searching ? (
                       <div className="flex items-center justify-center py-10"><RefreshCw size={24} className="text-amber-500 animate-spin" /></div>
                    ) : foundUsers.length > 0 ? (
                      foundUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-amber-200 transition group">
                          <div className="flex items-center gap-3">
                            <UserAvatar url={u.avatar_url} name={u.full_name} size="sm" />
                            <div>
                              <div className="text-xs font-bold text-slate-900">{u.full_name}</div>
                              <div className="text-[10px] text-slate-400">@{u.username}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => awardBadgeToUser(u.id, showAward)}
                            disabled={saving}
                            className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-amber-600 transition disabled:opacity-50"
                          >
                            Award
                          </button>
                        </div>
                      ))
                    ) : userSearch.length >= 2 ? (
                      <div className="text-center py-10 text-slate-400 text-sm italic">No users found.</div>
                    ) : (
                      <div className="text-center py-10 text-slate-400 text-sm">Type to search for users...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="p-4">#</th><th className="p-4">User</th><th className="p-4">XP</th><th className="p-4">Level</th><th className="p-4">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {leaderboard.map((u, i) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4"><span className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs ${i < 3 ? 'bg-amber-500' : 'bg-slate-300'}`}>{i + 1}</span></td>
                  <td className="p-4 font-bold flex items-center gap-3">
                    <UserAvatar url={u.avatar_url} name={u.full_name} size="xs" />
                    <div>
                      {u.full_name || u.username || 'Unknown'} <span className="text-slate-400 font-normal text-xs">@{u.username}</span>
                    </div>
                  </td>
                  <td className="p-4 font-black text-amber-600">{u.total_points}</td>
                  <td className="p-4"><span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-bold">Lv.{u.level}</span></td>
                  <td className="p-4"><span className="flex items-center gap-1 text-xs"><Flame size={14} className="text-orange-500" />{u.streak_days || 0}d</span></td>
                </tr>
              ))}
              {leaderboard.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400">No leaderboard data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'config' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-lg space-y-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><Zap size={18} className="text-amber-500" /> Points Configuration</h3>
          <p className="text-xs text-slate-500">Set point values for each user action.</p>
          {Object.entries(pointsConfig).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-slate-700 capitalize">{key.replace(/_/g, ' ')}</label>
              <input type="number" min={0} value={val as number} onChange={e => setPointsConfig({ ...pointsConfig, [key]: parseInt(e.target.value) || 0 })} className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center outline-none" />
            </div>
          ))}
          <button onClick={savePointsConfig} disabled={saving} className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      )}
    </div>
  );
}
