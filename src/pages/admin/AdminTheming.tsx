import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Palette, Save, RefreshCw, Type, Paintbrush, Code, Eye } from 'lucide-react';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../../components/Skeleton';

export default function AdminTheming() {
  const [theme, setTheme] = useState({ primary_color: '#0ea5e9', accent_color: '#6366f1', logo_url: '/logo.svg', app_name: 'Nemesis', welcome_message: 'Welcome to Nemesis — Your Intelligence Hub', custom_css: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const fetchTheme = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_system_settings');
      if (error) throw error;
      if (data?.platform_theme) setTheme(data.platform_theme);
    } catch (err: any) {
      console.error('[AdminTheming] Sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTheme(); }, [fetchTheme]);

  const saveTheme = useCallback(async () => {
    setSaving(true);
    try {
      const adminId = sessionStorage.getItem('adminId');
      const { error } = await supabase.rpc('admin_save_system_setting', {
        p_key: 'platform_theme',
        p_value: theme as any,
        p_admin_id: adminId
      });

      if (error) throw error;

      alert('Platform identity recalibrated successfully!');
    } catch (err: any) {
      alert('Theme sync failure: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [theme]);

  const presetPalettes = [
    { name: 'Ocean', primary: '#0ea5e9', accent: '#6366f1' },
    { name: 'Emerald', primary: '#10b981', accent: '#14b8a6' },
    { name: 'Sunset', primary: '#f97316', accent: '#ef4444' },
    { name: 'Royal', primary: '#8b5cf6', accent: '#a855f7' },
    { name: 'Rose', primary: '#f43f5e', accent: '#ec4899' },
    { name: 'Slate', primary: '#475569', accent: '#64748b' },
  ];

  if (loading) return (
    <div className="space-y-6 max-w-5xl">
       <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <SkeletonLine width="220px" height="2rem" />
          <SkeletonLine width="280px" height="0.875rem" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="rectangle" className="w-[110px] h-[36px] rounded-xl" />
          <Skeleton variant="rectangle" className="w-[124px] h-[40px] rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
               <SkeletonCircle size={18} />
               <SkeletonLine width="100px" />
            </div>
            {[1, 2, 3].map(j => (
              <div key={j} className="space-y-2">
                <SkeletonLine width="80px" height="10px" className="opacity-40" />
                <Skeleton variant="rectangle" className="h-[44px] w-full rounded-xl opacity-20" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
           <SkeletonCircle size={18} />
           <SkeletonLine width="120px" />
        </div>
        <Skeleton variant="rectangle" className="h-[200px] w-full rounded-xl opacity-10" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Palette size={28} className="text-pink-500" /> Platform Theming</h1>
          <p className="text-sm text-slate-500 mt-0.5">Customize the look and feel of Nemesis.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setPreview(!preview)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${preview ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-white text-slate-600 border-slate-200'}`}>
            <Eye size={16} /> {preview ? 'Hide Preview' : 'Preview'}
          </button>
          <button onClick={saveTheme} disabled={saving} className="flex items-center gap-2 bg-pink-500 text-white px-4 py-2.5 rounded-xl hover:bg-pink-600 transition font-medium text-sm shadow-sm disabled:opacity-50">
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} {saving ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branding */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><Type size={18} className="text-slate-500" /> Branding</h3>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">App Name</label>
            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={theme.app_name} onChange={e => setTheme({ ...theme, app_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Logo URL</label>
            <div className="flex gap-3 items-center">
              <input type="text" className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-mono" value={theme.logo_url} onChange={e => setTheme({ ...theme, logo_url: e.target.value })} />
              {theme.logo_url && <img src={theme.logo_url} className="w-10 h-10 rounded-lg object-contain border border-slate-200" alt="Logo" />}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Welcome Message</label>
            <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none" rows={3} value={theme.welcome_message} onChange={e => setTheme({ ...theme, welcome_message: e.target.value })} />
          </div>
        </div>

        {/* Colors */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><Paintbrush size={18} className="text-slate-500" /> Colors</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Primary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={theme.primary_color} onChange={e => setTheme({ ...theme, primary_color: e.target.value })} className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer" />
                <input type="text" value={theme.primary_color} onChange={e => setTheme({ ...theme, primary_color: e.target.value })} className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Accent Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={theme.accent_color} onChange={e => setTheme({ ...theme, accent_color: e.target.value })} className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer" />
                <input type="text" value={theme.accent_color} onChange={e => setTheme({ ...theme, accent_color: e.target.value })} className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Preset Palettes</label>
            <div className="grid grid-cols-3 gap-2">
              {presetPalettes.map(p => (
                <button key={p.name} onClick={() => setTheme({ ...theme, primary_color: p.primary, accent_color: p.accent })} className="p-3 rounded-xl border border-slate-200 hover:border-slate-400 transition text-left">
                  <div className="flex gap-1.5 mb-1.5">
                    <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: p.primary }} />
                    <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: p.accent }} />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><Code size={18} className="text-slate-500" /> Custom CSS</h3>
        <p className="text-xs text-slate-500">Add custom CSS to override platform styles. Use with caution.</p>
        <textarea
          className="w-full p-4 bg-slate-900 text-emerald-400 border border-slate-700 rounded-xl text-sm outline-none font-mono resize-none"
          rows={8}
          placeholder="/* Custom CSS overrides */&#10;.my-class { color: red; }"
          value={theme.custom_css}
          onChange={e => setTheme({ ...theme, custom_css: e.target.value })}
        />
      </div>

      {/* Live Preview */}
      {preview && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Eye size={18} /> Live Preview</h3>
          <div className="p-8 rounded-2xl border border-slate-200" style={{ background: `linear-gradient(135deg, ${theme.primary_color}10, ${theme.accent_color}10)` }}>
            <div className="flex items-center gap-3 mb-6">
              {theme.logo_url && <img src={theme.logo_url} className="w-10 h-10" alt="" />}
              <h2 className="text-2xl font-black" style={{ color: theme.primary_color }}>{theme.app_name}</h2>
            </div>
            <p className="text-slate-600 mb-6">{theme.welcome_message}</p>
            <div className="flex gap-3">
              <button className="px-6 py-2.5 rounded-xl text-white text-sm font-bold" style={{ backgroundColor: theme.primary_color }}>Primary Button</button>
              <button className="px-6 py-2.5 rounded-xl text-white text-sm font-bold" style={{ backgroundColor: theme.accent_color }}>Accent Button</button>
            </div>
            <div className="mt-6 flex gap-3">
              <div className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: theme.primary_color }}>Badge</div>
              <div className="px-4 py-2 rounded-lg text-xs font-bold border-2" style={{ borderColor: theme.accent_color, color: theme.accent_color }}>Outline</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
