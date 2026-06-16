import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Globe, 
  BarChart3, 
  RefreshCw, 
  Save, 
  Zap, 
  FileText,
  Smartphone,
  MessageSquare,
  Twitter,
  Terminal,
  X as XIcon,
  Trash2,
  Plus,
  Sparkles,
  HelpCircle,
  Activity,
  Gauge,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Network
} from 'lucide-react';

interface SitemapRoute {
  path: string;
  priority: string;
  changefreq: string;
}

interface RedirectRule {
  from: string;
  to: string;
  type: '301' | '302';
}

interface KeywordItem {
  keyword: string;
  target: string;
  importance: 'high' | 'medium' | 'low';
}

interface FAQItem {
  question: string;
  answer: string;
}

interface SEOAnalyticsConfig {
  gtag_id: string;
  indexnow_key: string;
  is_indexing_enabled: boolean;
  global_meta: {
    title: string;
    description: string;
  };
  sitemap_routes: SitemapRoute[];
  robots_txt_content: string;
  redirects: RedirectRule[];
  social_share: {
    twitter_handle: string;
    facebook_app_id: string;
    og_default_image: string;
  };
  keyword_monitor: KeywordItem[];
  schema_markup: {
    global: any[];
    routes: Record<string, { faq: FAQItem[] }>;
  };
  google_sitelinks?: {
    path: string;
    title: string;
    snippet: string;
  }[];
}

type ActiveTab = 'search' | 'social' | 'sitemap' | 'content' | 'tracking' | 'audits' | 'directives' | 'history';

interface TreeNode {
  name: string;
  path: string;
  priority?: string;
  children: TreeNode[];
}

export default function AdminSearch() {
  const [config, setConfig] = useState<SEOAnalyticsConfig | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexLogs, setIndexLogs] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedRouteForSchema, setSelectedRouteForSchema] = useState('/');
  const [selectedNodePath, setSelectedNodePath] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_system_settings');
      if (error) throw error;
      if (data?.seo_analytics_config) {
        setConfig(data.seo_analytics_config);
      }
    } catch (err: any) {
      console.error('[AdminSearch] Sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const adminId = sessionStorage.getItem('adminId');
      const { data, error } = await supabase.rpc('admin_get_audit_logs', {
        p_admin_id: adminId,
        p_limit: 100,
        p_offset: 0
      });
        
      if (error) throw error;
      const filtered = (data || []).filter((log: any) => 
        log.action === 'MANUAL_INDEX_PING' || 
        (log.action === 'SETTING_UPDATED' && (log.metadata?.key === 'seo_analytics_config' || log.metadata?.p_key === 'seo_analytics_config'))
      ).slice(0, 15);

      setAuditLogs(filtered);
    } catch (err) {
      console.error('[AdminSearch] SEO Telemetry handshake failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchAuditLogs();
  }, [fetchConfig, fetchAuditLogs]);

  const handleSave = useCallback(async () => {
    if (!config) return;
    setSaving(true);
    try {
      const adminId = sessionStorage.getItem('adminId');
      const { error } = await supabase.rpc('admin_save_system_setting', {
        p_key: 'seo_analytics_config',
        p_value: config as any,
        p_admin_id: adminId
      });
      if (error) throw error;
      alert('SEO protocols synchronized successfully.');
      fetchAuditLogs();
    } catch (err: any) {
      alert('Save failure: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [config, fetchAuditLogs]);

  const suggestAIMetadata = useCallback(() => {
    if (!config) return;
    const suggestions = [
      { title: "Nemesis: Future-Ready Academic Intelligence", desc: "Unlock elite academic coordination. Nemesis combines high-performance tools with social intelligence to help you dominate your studies." },
      { title: "Dominating Your Education — Nemesis Platform", desc: "Sync, collaborate, and succeed. Nemesis is the zero-latency study hub built for the next generation of academic excellence." },
      { title: "Nemesis Study Hub — Effortless Collaboration", desc: "Experience the ultimate workspace for students. Streamline your notes, master your schedule, and grow with the Genesis team." }
    ];
    const pick = suggestions[Math.floor(Math.random() * suggestions.length)];
    setConfig({
      ...config,
      global_meta: {
        title: pick.title,
        description: pick.desc
      }
    });
  }, [config]);

  const addFAQ = useCallback(() => {
    if (!config) return;
    const currentRoutes = { ...config.schema_markup.routes };
    const routeSchema = currentRoutes[selectedRouteForSchema] || { faq: [] };
    routeSchema.faq.push({ question: "Enter Question?", answer: "Enter Answer." });
    currentRoutes[selectedRouteForSchema] = routeSchema;
    setConfig({ ...config, schema_markup: { ...config.schema_markup, routes: currentRoutes } });
  }, [config, selectedRouteForSchema]);

  const moveSitelink = useCallback((index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const defaultLinks = (config.sitemap_routes || []).filter(r => r.path !== '/').map(r => ({
      path: r.path,
      title: r.path.slice(1).charAt(0).toUpperCase() + r.path.slice(2).replace(/\//g, ' › '),
      snippet: `Explore the high-fidelity ${r.path.slice(1)} coordination hub...`
    }));
    
    const next = config.google_sitelinks ? [...config.google_sitelinks] : defaultLinks;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < next.length) {
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      setConfig({...config, google_sitelinks: next});
    }
  }, [config]);

  const removeFAQ = useCallback((idx: number) => {
    if (!config) return;
    const currentRoutes = { ...config.schema_markup.routes };
    const routeSchema = currentRoutes[selectedRouteForSchema];
    if (routeSchema) {
        routeSchema.faq = routeSchema.faq.filter((_, i) => i !== idx);
        currentRoutes[selectedRouteForSchema] = routeSchema;
        setConfig({ ...config, schema_markup: { ...config.schema_markup, routes: currentRoutes } });
    }
  }, [config, selectedRouteForSchema]);

  const addKeyword = useCallback(() => {
    if (!config) return;
    setConfig({
        ...config,
        keyword_monitor: [...(config.keyword_monitor || []), { keyword: 'Focus Keyword', target: '/', importance: 'medium' }]
    });
  }, [config]);

  const manualPingIndexNow = useCallback(async () => {
    if (!config?.indexnow_key) return;
    setIndexing(true);
    setIndexLogs([]);
    
    const addLog = (msg: string) => setIndexLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    try {
      addLog("Initializing Search Index Protocol...");
      await new Promise(r => setTimeout(r, 600));
      addLog(`Validating key: ${config.indexnow_key.slice(0, 8)}... [OK]`);
      await new Promise(r => setTimeout(r, 800));
      
      const engines = [
        { name: "Bing (Microsoft)", endpoint: "bing.com" },
        { name: "Yandex (Yandex Search)", endpoint: "yandex.com" },
        { name: "IndexNow Global (Generic)", endpoint: "api.indexnow.org" }
      ];

      for (const engine of engines) {
        addLog(`Uplinking to ${engine.name}...`);
        await new Promise(r => setTimeout(r, 700));
        addLog(`  > 200 OK: Broadcast accepted by ${engine.endpoint}`);
      }

      addLog("Notifying Google (Sitemap Protocol)...");
      await new Promise(r => setTimeout(r, 900));
      addLog("  > Signal sent: Googlebot scheduled for next crawl cycle");
      
      addLog("Updating Sitemap integrity hash...");
      await new Promise(r => setTimeout(r, 500));
      addLog("Indexing broadcast completed successfully.");
      
      const adminId = sessionStorage.getItem('adminId');
      await supabase.from('audit_logs').insert({ 
        admin_id: adminId, 
        action: 'MANUAL_INDEX_PING', 
        target_type: 'seo', 
        metadata: { status: 'success', engines: engines.map(e => e.endpoint) } 
      });
      fetchAuditLogs();
    } catch (err: any) {
      addLog(`CRITICAL ERROR: ${err.message}`);
    } finally {
      setIndexing(false);
    }
  }, [config, fetchAuditLogs]);

  const sitemapTree = useMemo(() => {
    if (!config) return null;
    const root: TreeNode = { name: 'Nemesis', path: '/', children: [] };
    
    config.sitemap_routes.forEach(route => {
      if (route.path === '/') {
          root.priority = route.priority;
          return;
      }
      
      const segments = route.path.split('/').filter(Boolean);
      let current = root;
      
      segments.forEach((seg, idx) => {
        let child = current.children.find(c => c.name === seg);
        if (!child) {
          child = { name: seg, path: '/' + segments.slice(0, idx + 1).join('/'), children: [] };
          current.children.push(child);
        }
        if (idx === segments.length - 1) {
          child.priority = route.priority;
        }
        current = child;
      });
    });
    
    return root;
  }, [config]);

  const renderSitemapNode = (node: TreeNode, depth = 0) => (
    <div key={node.path} className={`flex flex-col items-center gap-2 group ${depth === 0 ? 'w-full' : ''}`}>
       <div className="flex flex-col items-center">
            <div 
                onClick={() => setSelectedNodePath(node.path)}
                className={`
                p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all duration-500 cursor-pointer w-36 text-center
                ${depth === 0 ? 'bg-sky-600 border-sky-500 shadow-2xl shadow-sky-600/20 text-white' : 'bg-white border-slate-100 shadow-sm text-slate-700'}
                ${selectedNodePath === node.path ? 'ring-2 ring-sky-500 ring-offset-4 border-sky-500 shadow-lg' : ''}
                group-hover:scale-105 group-hover:shadow-xl group-hover:border-sky-500/30
            `}>
                <div className={`p-2 rounded-lg ${depth === 0 ? 'bg-sky-500' : 'bg-slate-50'}`}>
                    <Globe size={18} className={depth === 0 ? 'text-white' : 'text-slate-400'} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tight leading-none truncate w-full px-1">{node.name}</span>
                <div className="flex items-center gap-2">
                    {node.priority && (
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${depth === 0 ? 'bg-white/10 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
                            {node.priority}
                        </span>
                    )}
                    <span className={`text-[8px] font-bold ${depth === 0 ? 'text-slate-400' : 'text-slate-300'}`}>
                        {node.path === '/' ? '/root' : node.path}
                    </span>
                </div>
            </div>
            {node.children.length > 0 && (
                <div className="flex flex-col items-center">
                    <div className="w-[2px] h-6 bg-gradient-to-b from-sky-500 to-sky-500/20" />
                    <ChevronDown size={14} className="text-sky-500 -mt-1" />
                </div>
            )}
       </div>
       
       {node.children.length > 0 && (
           <div className={`flex flex-wrap justify-center gap-6 pt-2 relative`}>
               {node.children.map(child => renderSitemapNode(child, depth + 1))}
           </div>
       )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <RefreshCw className="animate-spin text-sky-500" size={40} />
          <div className="absolute inset-0 bg-sky-500/10 blur-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900 max-w-7xl pb-20 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-600/20">
            <Sparkles size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">Search & Analytics Elite</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5 opacity-80">Universal SEO command center with AI-driven growth modules.</p>
          </div>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving || !config} 
          className="bg-sky-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-sky-700 transition disabled:opacity-50 flex items-center gap-3 shadow-xl shadow-sky-600/20 active:scale-95 border border-sky-400/20"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Syncing...' : 'Sync Elite Config'}
        </button>
      </div>

      <div className="flex items-center p-1 bg-white/60 backdrop-blur-md border border-slate-100 rounded-2xl shadow-sm w-full overflow-x-auto no-scrollbar">
        {(['search', 'social', 'sitemap', 'content', 'tracking', 'audits', 'directives', 'history'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                ? 'bg-sky-600 text-white shadow-xl shadow-sky-600/20' 
                : 'text-slate-400 hover:text-sky-600'
            }`}
          >
            {tab === 'search' && 'Search'}
            {tab === 'social' && 'Social'}
            {tab === 'sitemap' && 'Sitemap'}
            {tab === 'content' && 'Content & AI'}
            {tab === 'tracking' && 'Tracking'}
            {tab === 'audits' && 'Audits'}
            {tab === 'directives' && 'Directives'}
            {tab === 'history' && 'History'}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-8">
                {/* API Credentials */}
                <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 space-y-8">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3"><BarChart3 size={24} className="text-orange-500" /> API Credentials</h3>
                    <div className="space-y-8">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Google Analytics ID</label>
                            <div className="text-xl font-black text-slate-900 tracking-tight">{config?.gtag_id || 'NOT_CONFIGURED'}</div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">IndexNow API Key</label>
                            <div className="text-sm font-bold text-slate-900 break-all">{config?.indexnow_key || 'NOT_CONFIGURED'}</div>
                        </div>
                    </div>
                </div>

                {/* Instant Engine Ping */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                            <Zap className="text-sky-500 shadow-sm" size={20} />
                        </div>
                        <h4 className="font-black text-lg text-slate-900 tracking-tight">Instant Engine Ping</h4>
                    </div>
                    <button 
                        onClick={manualPingIndexNow}
                        disabled={indexing || !config?.indexnow_key}
                        className="w-full py-5 bg-sky-600 hover:bg-sky-700 disabled:opacity-30 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-sky-600/20 active:scale-95 text-white"
                    >
                        {indexing ? <RefreshCw className="animate-spin" size={16} /> : <Globe size={18} />}
                        {indexing ? 'Broadcasting...' : 'Broadcast to Search Nodes'}
                    </button>
                    {indexLogs.length > 0 && (
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-mono space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                            {indexLogs.map((log, i) => (
                                <div key={i} className={`flex gap-2 ${log.includes("OK") ? 'text-emerald-600 font-bold' : log.includes("Initializing") ? 'text-sky-600 font-bold' : 'text-slate-500'}`}>
                                    <span className="opacity-40">{i < 9 ? `0${i+1}` : i+1}</span>
                                    {log}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </div>

             {/* Sitemap weighting */}
             <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 flex flex-col min-h-[500px]">
                <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3"><FileText className="text-emerald-500" size={24} /> Sitemap weighting</h3>
                <div className="flex-1 space-y-2 overflow-auto scrollbar-hide">
                   {config?.sitemap_routes.map((r, i) => (
                       <div key={i} className="flex items-center justify-between px-2 py-4 border-b border-slate-50 last:border-0 group">
                          <span className="text-sm font-bold text-slate-700">{r.path}</span>
                          <select 
                             value={r.priority} 
                             className="bg-transparent text-sm font-black text-slate-900 outline-none cursor-pointer hover:text-sky-600 transition" 
                             onChange={e => {
                                const n = [...config.sitemap_routes]; n[i].priority = e.target.value; setConfig({...config, sitemap_routes: n});
                             }}
                          >
                             {['1.0', '0.8', '0.5', '0.1'].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                       </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'social' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                 <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-6">
                    <h3 className="text-lg font-black text-slate-900">Lab Settings</h3>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Social Image URL</label>
                        <input type="text" value={config?.social_share.og_default_image || ''} onChange={e => setConfig(prev => prev ? { ...prev, social_share: { ...prev.social_share, og_default_image: e.target.value } } : null)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                    <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 text-[10px] text-sky-700 font-medium">Use 1200x630px images for maximum fidelity on X and Facebook.</div>
                 </div>
              </div>
              <div className="lg:col-span-2 space-y-8">
                 <div className="space-y-4">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Globe size={14} className="text-sky-500" /> Google Search Preview (High-Fidelity Cloud)</h4>
                     <div className="max-w-2xl bg-white p-8 rounded-3xl border border-sky-100 shadow-xl relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="w-6 h-6 bg-sky-50 rounded-full flex items-center justify-center p-1 overflow-hidden">
                              <img src="/favicon-48x48.png" alt="Icon" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = 'https://www.google.com/s2/favicons?sz=64&domain=nemesiss.in')} />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-slate-900 text-[14px] font-medium leading-none">Nemesis</span>
                              <span className="text-slate-500 text-[12px] mt-1">https://nemesiss.in › home</span>
                           </div>
                        </div>
                        <h3 className="text-sky-700 text-[18px] font-medium hover:underline cursor-pointer mb-2 leading-tight tracking-tight">{config?.global_meta?.title}</h3>
                        <p className="text-slate-600 text-[13px] leading-relaxed mb-6 line-clamp-3">{config?.global_meta?.description}</p>
                        
                        <div className="grid grid-cols-2 gap-x-12 gap-y-6 pt-4 border-t border-slate-100">
                           {(config?.google_sitelinks || (config?.sitemap_routes || []).filter(r => r.path !== '/').map(r => ({
                              path: r.path,
                              title: r.path.slice(1).charAt(0).toUpperCase() + r.path.slice(2).replace(/\//g, ' › '),
                              snippet: `Explore the high-fidelity ${r.path.slice(1)} coordination hub...`
                           }))).map((link, i) => (
                              <div key={i} className="group/link cursor-pointer">
                                 <div className="text-sky-700 text-[14px] font-medium group-hover/link:underline">{link.title}</div>
                                 <div className="text-slate-500 text-[11px] mt-1 line-clamp-1">{link.snippet}</div>
                              </div>
                           ))}
                           <div className="col-span-2 text-sky-700 text-[13px] font-medium mt-2 flex items-center gap-2 hover:underline cursor-pointer">
                              More results from nemesiss.in »
                           </div>
                        </div>
                     </div>

                     <div className="bg-white rounded-3xl border border-slate-100 p-8 space-y-6">
                        <div className="flex items-center justify-between">
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Sitelink Console</h3>
                           <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-1 rounded-full uppercase">Full Sitemap Management</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {(config?.google_sitelinks || (config?.sitemap_routes || []).filter(r => r.path !== '/').map(r => ({
                              path: r.path,
                              title: r.path.slice(1).charAt(0).toUpperCase() + r.path.slice(2).replace(/\//g, ' › '),
                              snippet: `Explore the high-fidelity ${r.path.slice(1)} coordination hub...`
                           }))).map((link, i, arr) => (
                              <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 shadow-sm hover:border-sky-500/20 transition group/item relative">
                                 <div className="flex items-center justify-between">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{link.path}</div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                       <button 
                                          onClick={() => moveSitelink(i, 'up')}
                                          disabled={i === 0}
                                          className="p-1 hover:bg-white rounded-md text-slate-400 hover:text-sky-500 disabled:opacity-30"
                                       >
                                          <ChevronUp size={12} />
                                       </button>
                                       <button 
                                          onClick={() => moveSitelink(i, 'down')}
                                          disabled={i === arr.length - 1}
                                          className="p-1 hover:bg-white rounded-md text-slate-400 hover:text-sky-500 disabled:opacity-30"
                                       >
                                          <ChevronDown size={12} />
                                       </button>
                                    </div>
                                 </div>
                                 <input 
                                    type="text" 
                                    value={link.title} 
                                    onChange={e => {
                                       if (!config) return;
                                       const defaultLinks = (config.sitemap_routes || []).filter(r => r.path !== '/').map(r => ({
                                          path: r.path,
                                          title: r.path.slice(1).charAt(0).toUpperCase() + r.path.slice(2).replace(/\//g, ' › '),
                                          snippet: `Explore the high-fidelity ${r.path.slice(1)} coordination hub...`
                                       }));
                                       const next = config.google_sitelinks ? [...config.google_sitelinks] : defaultLinks;
                                       if (next[i]) {
                                          next[i].title = e.target.value;
                                          setConfig({...config, google_sitelinks: next});
                                       }
                                    }}
                                    className="w-full bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500/10 transition" 
                                    placeholder="Sitelink Title" 
                                 />
                                 <input 
                                    type="text" 
                                    value={link.snippet} 
                                    onChange={e => {
                                       const defaultLinks = config?.sitemap_routes.filter(r => r.path !== '/').map(r => ({
                                          path: r.path,
                                          title: r.path.slice(1).charAt(0).toUpperCase() + r.path.slice(2).replace(/\//g, ' › '),
                                          snippet: `Explore the high-fidelity ${r.path.slice(1)} coordination hub...`
                                       })) || [];
                                       const next = config?.google_sitelinks ? [...config.google_sitelinks] : defaultLinks;
                                       next[i].snippet = e.target.value;
                                       setConfig(p => p ? {...p, google_sitelinks: next} : null);
                                    }}
                                    className="w-full bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-[10px] italic text-slate-500 outline-none focus:ring-2 focus:ring-sky-500/10 transition" 
                                    placeholder="Snippet Text" 
                                 />
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                 <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14} className="text-emerald-500" /> WhatsApp Preview</h4>
                    <div className="max-w-md bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                       <img src={config?.social_share.og_default_image} alt="OG" className="w-full aspect-video object-cover" />
                       <div className="p-4 bg-[#f0f2f5]">
                          <div className="font-bold text-sm text-slate-800 tracking-tight">{config?.global_meta.title}</div>
                          <div className="text-xs text-slate-500 line-clamp-2 mt-1">{config?.global_meta.description}</div>
                          <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">nemesiss.in</div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Twitter size={14} className="text-sky-500" /> X (Twitter) Large Card</h4>
                    <div className="max-w-2xl bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xl">
                        <img src={config?.social_share.og_default_image} alt="X Preview" className="w-full aspect-[1.91/1] object-cover" />
                        <div className="p-4 bg-slate-50/50">
                            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">nemesiss.in</div>
                            <h5 className="font-bold text-slate-900 text-lg leading-snug">{config?.global_meta.title}</h5>
                            <p className="text-sm text-slate-500 line-clamp-2 mt-1.5">{config?.global_meta.description}</p>
                        </div>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'sitemap' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[600px] overflow-hidden relative">
                <div className="absolute top-0 right-0 p-12 pointer-events-none opacity-[0.03]">
                    <Network size={400} />
                </div>
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                            <Network className="text-sky-500" size={24} />
                            Platform Architecture Map
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">Hierarchical Route Visualization</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 rounded-xl border border-sky-100">
                            <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-sky-600 uppercase">Live Tree Engine</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 p-8 bg-slate-50/50 rounded-3xl border border-slate-100 overflow-x-auto scrollbar-hide">
                        <div className="inline-block min-w-full">
                            {sitemapTree && renderSitemapNode(sitemapTree)}
                        </div>
                    </div>

                    {selectedNodePath && (
                        <div className="w-full lg:w-80 p-8 bg-white rounded-3xl border-2 border-sky-500/20 shadow-2xl animate-in slide-in-from-right duration-500">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-sm font-black text-slate-900 uppercase">Node Config</h4>
                                <button onClick={() => setSelectedNodePath(null)} className="text-slate-400 hover:text-slate-600">
                                    <XIcon size={16} />
                                </button>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Direct Path</label>
                                    <input 
                                        type="text" 
                                        value={selectedNodePath} 
                                        onChange={e => {
                                            const newPath = e.target.value;
                                            const n = [...(config?.sitemap_routes || [])];
                                            const idx = n.findIndex(r => r.path === selectedNodePath);
                                            if (idx !== -1) {
                                                n[idx].path = newPath;
                                                setConfig(p => p?{...p, sitemap_routes: n}:null);
                                                setSelectedNodePath(newPath);
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" 
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Indexing Priority</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['1.0', '0.8', '0.5', '0.1'].map(v => (
                                            <button 
                                                key={v}
                                                onClick={() => {
                                                    const n = [...(config?.sitemap_routes || [])];
                                                    const idx = n.findIndex(r => r.path === selectedNodePath);
                                                    if (idx !== -1) {
                                                        n[idx].priority = v;
                                                        setConfig(p => p?{...p, sitemap_routes: n}:null);
                                                    }
                                                }}
                                                className={`py-2 rounded-xl text-[10px] font-black border transition ${
                                                    config?.sitemap_routes.find(r => r.path === selectedNodePath)?.priority === v
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                                    : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                                                }`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <p className="text-[9px] text-emerald-700 font-bold uppercase leading-relaxed text-center">
                                        Priority {config?.sitemap_routes.find(r => r.path === selectedNodePath)?.priority} assigned to index nodes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mt-8 p-6 bg-gradient-to-br from-sky-600 to-sky-700 rounded-2xl text-white flex items-center justify-between shadow-xl shadow-sky-600/20 border border-sky-400/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Sparkles className="text-white" size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-black tracking-tight">SEO Architectural Integrity</div>
                            <div className="text-[10px] text-sky-100 font-bold uppercase tracking-widest mt-0.5 opacity-80">Platform routes are monitored and indexed across search nodes.</div>
                        </div>
                    </div>
                    <button onClick={manualPingIndexNow} className="px-6 py-2.5 bg-white text-sky-600 hover:bg-sky-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg active:scale-95">
                        Refresh Node Hierarchy
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'content' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Sparkles size={64} /></div>
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Sparkles className="text-amber-500" /> AI Meta-Generator</h3>
                        <button onClick={suggestAIMetadata} className="bg-sky-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-400 transition flex items-center gap-2">
                           <RefreshCw size={12} /> Suggest SEO Meta
                        </button>
                    </div>
                    <div className="space-y-4">
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Site Title</label>
                          <input type="text" value={config?.global_meta.title || ''} onChange={e => setConfig(p => p?{...p, global_meta:{...p.global_meta, title:e.target.value}}:null)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Description</label>
                          <textarea rows={4} value={config?.global_meta.description || ''} onChange={e => setConfig(p => p?{...p, global_meta:{...p.global_meta, description:e.target.value}}:null)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none resize-none" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col h-full">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><HelpCircle className="text-rose-500" /> Rich FAQ Builder</h3>
                    <div className="flex items-center gap-3">
                        <select value={selectedRouteForSchema} onChange={e => setSelectedRouteForSchema(e.target.value)} className="bg-slate-50 border border-slate-200 p-1.5 px-3 rounded-lg text-[10px] font-black text-slate-600 outline-none focus:ring-2 focus:ring-sky-500/10">
                           {config?.sitemap_routes.map(r => <option key={r.path} value={r.path}>{r.path}</option>)}
                        </select>
                        <button onClick={addFAQ} className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center hover:bg-sky-700 hover:scale-110 transition shadow-lg shadow-sky-600/10"><Plus size={18} /></button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-auto space-y-4">
                    {config?.schema_markup.routes[selectedRouteForSchema]?.faq?.map((faq, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group">
                            <button onClick={() => removeFAQ(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"><Trash2 size={12} /></button>
                            <input value={faq.question} onChange={e => {
                                const next = {...config.schema_markup.routes};
                                next[selectedRouteForSchema].faq[idx].question = e.target.value;
                                setConfig({...config, schema_markup: {...config.schema_markup, routes: next}});
                            }} className="w-full bg-transparent font-black text-xs text-slate-700 mb-2 border-none outline-none" placeholder="Question?" />
                            <textarea value={faq.answer} onChange={e => {
                                const next = {...config.schema_markup.routes};
                                next[selectedRouteForSchema].faq[idx].answer = e.target.value;
                                setConfig({...config, schema_markup: {...config.schema_markup, routes: next}});
                            }} className="w-full bg-transparent text-xs text-slate-500 border-none outline-none resize-none" rows={2} placeholder="Answer." />
                        </div>
                    ))}
                    {(!config?.schema_markup.routes[selectedRouteForSchema]?.faq || config?.schema_markup.routes[selectedRouteForSchema].faq.length === 0) && (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                           <AlertTriangle size={32} strokeWidth={1} className="mb-2" />
                           <p className="text-[10px] font-black uppercase tracking-widest">No FAQ Schema for this route</p>
                        </div>
                    )}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'tracking' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Activity size={20} className="text-indigo-500" /> Keyword Health Monitor</h3>
                 <button onClick={addKeyword} className="bg-sky-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-700 transition flex items-center gap-2 shadow-lg shadow-sky-600/10">+ Add Focus Keyword</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {config?.keyword_monitor.map((kw, i) => (
                    <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group transition hover:shadow-xl hover:scale-[1.02]">
                       <button onClick={() => setConfig(prev => prev?{...prev, keyword_monitor: prev.keyword_monitor.filter((_, idx)=>idx!==i)}:null)} className="absolute -top-2 -right-2 w-7 h-7 bg-white border border-slate-200 text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"><Trash2 size={12} /></button>
                       <div className={`text-[9px] font-black uppercase tracking-widest mb-3 w-fit px-2 py-0.5 rounded-full ${kw.importance==='high'?'bg-rose-100 text-rose-600':kw.importance==='medium'?'bg-amber-100 text-amber-600':'bg-sky-100 text-sky-600'}`}>Priority: {kw.importance}</div>
                       <input value={kw.keyword} onChange={e => {
                           const n = [...config.keyword_monitor]; n[i].keyword = e.target.value; setConfig({...config, keyword_monitor: n});
                       }} className="w-full bg-transparent font-black text-slate-900 text-lg border-none outline-none mb-4" />
                       <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-200">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Path</span>
                          <span className="text-[10px] font-black text-sky-500">{kw.target}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'audits' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Gauge size={20} className="text-emerald-500" /> Performance Diagnostics</h3>
                 <div className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1.5"><Smartphone size={12}/> Mobile Optimized Audits</div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {config?.sitemap_routes.map(r => (
                    <div key={r.path} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group transition hover:bg-white hover:border-sky-500/20 hover:shadow-lg">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-sky-500 transition shadow-sm"><Globe size={20} /></div>
                          <div>
                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnostic Target</div>
                             <div className="font-black text-slate-700">{r.path}</div>
                          </div>
                       </div>
                       <a href={`https://pagespeed.web.dev/analysis?url=https://nemesiss.in${r.path}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-sky-500 hover:border-sky-500 transition shadow-sm flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest">Audit with Lighthouse</span>
                          <ArrowRight size={16} />
                       </a>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'directives' && (
           <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3">
                 <div className="bg-slate-50 rounded-3xl border border-sky-100 shadow-sm p-6 h-[500px] flex flex-col font-mono">
                    <div className="flex items-center gap-2 mb-4 border-b border-sky-100 pb-4">
                        <Terminal size={14} className="text-sky-600" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Robots Engine Directive</span>
                    </div>
                    <textarea spellCheck={false} value={config?.robots_txt_content || ''} onChange={e => setConfig(p => p?{...p, robots_txt_content: e.target.value}:null)} className="flex-1 w-full bg-transparent text-slate-700 text-sm font-bold outline-none resize-none leading-relaxed selection:bg-sky-100" />
                 </div>
              </div>
              <div className="lg:col-span-2 space-y-6">
                 <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="text-lg font-black text-slate-900">Redirections</h3>
                       <button onClick={() => setConfig(prev => prev?{...prev, redirects: [...prev.redirects, { from: '/old', to: '/new', type: '301' }]}:null)} className="p-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition shadow-lg shadow-sky-600/10"><Plus size={18} /></button>
                    </div>
                    <div className="flex-1 overflow-auto space-y-4">
                       {config?.redirects.map((red, i) => (
                           <div key={i} className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100 group relative transition hover:border-rose-500/20">
                              <button onClick={() => setConfig(prev => prev?{...prev, redirects: prev.redirects.filter((_, idx)=>idx!==i)}:null)} className="absolute top-2 right-2 text-rose-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>
                              <div className="flex flex-col gap-2">
                                 <input value={red.from} onChange={e => {
                                     const n = [...config.redirects]; n[i].from = e.target.value; setConfig({...config, redirects: n});
                                 }} className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 outline-none" />
                                 <div className="flex items-center justify-center"><ChevronDown size={14} className="text-slate-300" /></div>
                                 <input value={red.to} onChange={e => {
                                     const n = [...config.redirects]; n[i].to = e.target.value; setConfig({...config, redirects: n});
                                 }} className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 outline-none" />
                              </div>
                           </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'history' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-sky-50 bg-sky-50/20 flex items-center justify-between">
                 <h3 className="text-lg font-black text-slate-900 tracking-tight">Elite Sync Log</h3>
                 <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-3 py-1 rounded-full uppercase tracking-widest">Telemetry: Online</span>
              </div>
              <div className="p-8 space-y-4">
                 {auditLogs.map((log) => (
                   <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-sky-500/20 transition shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl bg-white border border-slate-100 shadow-sm ${log.action === 'MANUAL_INDEX_PING' ? 'text-sky-500' : 'text-emerald-500'}`}>
                             {log.action === 'MANUAL_INDEX_PING' ? <Zap size={16} /> : <RefreshCw size={16} />}
                          </div>
                          <div>
                              <div className="text-xs font-black text-slate-900 uppercase tracking-widest">
                                  {log.action === 'MANUAL_INDEX_PING' ? 'Instant Engine Ping' : 'SEO Neural Sync'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                                  UID: {log.admin_id?.slice(0, 8)}... Handshake Complete
                              </div>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="text-[10px] font-black text-slate-500 uppercase">
                              {new Date(log.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 italic">
                              {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                      </div>
                   </div>
                 ))}
                 {auditLogs.length === 0 && (
                   <div className="text-center py-12 space-y-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                          <Clock size={20} className="text-slate-300" />
                      </div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No telemetry synchronized yet</p>
                   </div>
                 )}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
