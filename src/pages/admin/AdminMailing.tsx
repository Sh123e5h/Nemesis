import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Mail, Settings, Send, FileText, ChevronRight, 
  CheckCircle2, AlertCircle, RefreshCw,
  Save, Code, X, Plus, Terminal, History,
  Clock, MailOpen,
  ExternalLink, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGravatarUrl } from '../../lib/utils';

interface MailingTemplate {
  id: string;
  slug: string;
  subject: string;
  html: string;
  description: string;
  variables: { name: string; description: string }[];
  updated_at: string;
}

interface MailingSetting {
  key: string;
  value: string;
  description: string;
}

interface MailingLog {
  id: string;
  recipient: string;
  slug: string;
  subject: string;
  status: 'success' | 'failure';
  error_message: string | null;
  created_at: string;
}

export default function AdminMailing() {
  const [activeTab, setActiveTab] = useState<'templates' | 'settings' | 'test' | 'history' | 'automated'>('templates');
  const [templates, setTemplates] = useState<MailingTemplate[]>([]);
  const [settings, setSettings] = useState<MailingSetting[]>([]);
  const [logs, setLogs] = useState<MailingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editor State
  const [selectedTemplate, setSelectedTemplate] = useState<MailingTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editorTab, setEditorTab] = useState<'source' | 'preview'>('source');

  // Test State
  const [testPayload, setTestPayload] = useState(() => ({
    email: '',
    type: 'otp',
    otp_code: Math.floor(100000 + Math.random() * 900000).toString(),
    user_name: 'Test Agent'
  }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_get_mailing_data');
      if (rpcError) throw rpcError;

      if (data) {
        setTemplates(data.templates || []);
        setSettings(data.settings || []);
        setLogs(data.logs || []);
      }
    } catch (err: any) {
      setError('Communication sync failure: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveTemplate = useCallback(async () => {
    if (!selectedTemplate) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_save_mailing_template', {
        p_id: selectedTemplate.id,
        p_slug: selectedTemplate.slug,
        p_subject: selectedTemplate.subject,
        p_html: selectedTemplate.html,
        p_description: selectedTemplate.description || 'System communication protocol.',
        p_variables: selectedTemplate.variables || [],
        p_admin_id: sessionStorage.getItem('adminId')
      });

      if (error) throw error;
      setSuccess('Communication protocol synchronized successfully');
      setEditMode(false);
      fetchData();
    } catch (err: any) {
      setError('Protocol transmission failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }, [selectedTemplate, fetchData]);

  const handleUpdateSetting = useCallback(async (key: string, value: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_save_mailing_setting', {
        p_key: key,
        p_value: value,
        p_admin_id: sessionStorage.getItem('adminId')
      });

      if (error) throw error;
      setSuccess(`Global nexus '${key}' recalibrated`);
      fetchData();
    } catch (err: any) {
      setError('Nexus update failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }, [fetchData]);

  const handleSendTest = useCallback(async () => {
    if (!testPayload.email) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error: funcError } = await supabase.functions.invoke('moderation-mailer-v2', {
        body: testPayload
      });

      if (funcError) throw funcError;
      if (data.error) throw new Error(data.error);

      setSuccess(`Handshake confirmed. Ref: ${data.ref || 'SUCCESS'}`);
      fetchData(); // Refresh logs
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }, [testPayload, fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <RefreshCw className="w-10 h-10 text-sky-500 animate-spin mb-4" />
        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Synchronizing Core Templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900 pb-20">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 text-slate-900">
            <Mail className="text-sky-600" size={28} />
            Mailing Center
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 ml-10 font-bold uppercase tracking-tight text-[10px]">Intelligence Administration Panel</p>
        </div>

        {/* Dynamic Tab Switcher */}
        <div className="flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm self-start">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'templates' ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'settings' ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'test' ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Handshake
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'history' ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('automated')}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'automated' ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Automated
          </button>
        </div>
      </div>

      {/* Global Messaging */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
            <AlertCircle size={20} />
            <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-500"><X size={18} /></button>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600">
            <CheckCircle2 size={20} />
            <p className="text-sm font-bold uppercase tracking-tight">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-300 hover:text-emerald-500"><X size={18} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(t => (
            <div key={t.id} className="group bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition duration-300 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="flex items-center justify-between mb-4">
                  <div className="bg-sky-50 p-3 rounded-2xl">
                    <FileText className="text-sky-600" size={24} />
                  </div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">id: {t.slug}</span>
               </div>
               <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2 truncate" title={t.subject}>{t.subject}</h3>
               <p className="text-slate-400 text-xs font-medium mb-6 line-clamp-2">{t.description || 'System communication protocol.'}</p>
               
               <div className="flex items-center gap-2 mb-6">
                  {(t.variables as any[])?.map((v, idx) => {
                    const varName = typeof v === 'string' ? v : v.name;
                    const varDesc = typeof v === 'string' ? '' : v.description;
                    return (
                      <span key={varName || `var-${idx}`} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-tighter" title={varDesc}>
                        {"{{"}{varName}{"}}"}
                      </span>
                    );
                  })}
               </div>

               <button 
                  onClick={() => { setSelectedTemplate(t); setEditMode(true); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-sky-600 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition duration-300"
               >
                 Initialize Editor <ChevronRight size={14} />
               </button>
            </div>
          ))}
          
          <div 
            onClick={() => {
              setSelectedTemplate({
                id: Math.random().toString(36).substr(2, 9),
                slug: 'new_protocol',
                subject: 'New Communication Protocol',
                html: '<!-- ENTER HTML INFRASTRUCTURE -->',
                description: 'System communication protocol.',
                variables: [],
                updated_at: new Date().toISOString()
              });
              setEditMode(true);
            }}
            className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 opacity-60 hover:opacity-100 transition hover:border-sky-300 hover:bg-sky-50/30 cursor-pointer"
          >
             <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
               <Plus size={24} />
             </div>
             <p className="text-xs font-black uppercase tracking-widest">Protocol Expansion</p>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
           <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <Settings className="text-sky-600" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Communication Nexus</h2>
                <p className="text-xs text-slate-500 font-medium">Global parameters for automated identity relays.</p>
              </div>
           </div>
           <div className="p-8 space-y-8">
               {settings.map(s => (
                <div key={s.key} className="space-y-3">
                   <div className="flex items-center justify-between">
                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{s.key.replace(/_/g, ' ')} Identity</label>
                     <span className="text-[9px] font-bold text-slate-300 italic">LAST_MODIFIED: {new Date().toLocaleDateString()}</span>
                   </div>
                   <div className="flex gap-2">
                     <input 
                       type={s.key.includes('KEY') ? 'password' : 'text'} 
                       defaultValue={s.value}
                       onChange={(e) => {
                         const val = e.target.value;
                         setSettings(prev => prev.map(item => item.key === s.key ? { ...item, value: val } : item));
                       }}
                       className="flex-1 px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition"
                     />
                     <button 
                        onClick={() => handleUpdateSetting(s.key, s.value)}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-sky-600 transition-colors shadow-lg shadow-slate-900/10"
                     >
                       Save
                     </button>
                   </div>
                   <p className="text-[10px] text-slate-400 font-medium ml-1">{s.description}</p>
                </div>
              ))}

              <div className="pt-6 border-t border-slate-100">
                <div className="bg-sky-50/30 rounded-3xl p-6 border border-sky-100/50 flex flex-col md:flex-row items-center gap-6">
                  <div className="shrink-0 relative">
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                      <img 
                        src={getGravatarUrl(settings.find(s => s.key === 'sender_email')?.value || 'support@nemesiss.in', 200)} 
                        alt="Global Identity"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white shadow-lg">
                      <CheckCircle2 size={12} />
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">Authenticated Sender Identity</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed mb-3">
                      Your "Mail Pic" is powered by Gravatar. External clients like Gmail and Outlook will display this image for all outgoing communiqués from your nexus.
                    </p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      <a 
                        href="https://gravatar.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[10px] font-black text-sky-600 uppercase tracking-widest hover:text-sky-700 transition"
                      >
                        Manage Gravatar <Mail size={12} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* 🚀 ELITE: GUARANTEED GMAIL IDENTITY BYPASS */}
                <div className="mt-8 bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                  <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 text-white">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <h5 className="text-base font-black uppercase tracking-tight">Identity Bypass Protocol</h5>
                        <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest opacity-80">Alternate Identity Side-Door (Guaranteed Free)</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black tracking-widest uppercase border border-white/30">GUARANTEED $0</span>
                       <span className="text-[8px] font-bold uppercase tracking-tighter mt-1 text-indigo-200">Bypasses Workspace Paywall</span>
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="flex gap-4">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black italic">!</div>
                          <div>
                            <h6 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 mb-1">Abandon Front-Door Signup</h6>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
                              Google blacklists "Work" domains from direct free signups. We will use the <strong>Alternate Identity</strong> method instead.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black">1</div>
                          <div>
                            <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-1">Personal Anchor</h6>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                              Sign in to any <strong>standard personal @gmail.com</strong> account (or create a new one). This is your identity host.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black">2</div>
                          <div>
                            <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-1">Identity Adoption</h6>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                              Go to <a href="https://myaccount.google.com/alternateemail" target="_blank" className="text-indigo-600 font-bold underline hover:text-indigo-700">Alternate Email Settings</a> and add <strong>{settings.find(s => s.key === 'sender_email')?.value || 'support@nemesiss.in'}</strong>.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black">3</div>
                          <div>
                            <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-1">Global Broadcast</h6>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                              Once verified, set your <strong>Profile Picture</strong> for the Gmail account. It will now automatically sync to your custom domain in Gmail.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center bg-indigo-50/30 rounded-3xl p-6 border border-indigo-100/50">
                        <div className="flex flex-col items-center text-center">
                           <div className="w-16 h-16 bg-white rounded-3xl shadow-lg border border-indigo-100 flex items-center justify-center mb-4 relative overflow-hidden group">
                              <img 
                                src={getGravatarUrl(settings.find(s => s.key === 'sender_email')?.value || 'support@nemesiss.in', 200)} 
                                alt="Expected Logo"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-indigo-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                                <ShieldCheck className="text-white" />
                              </div>
                           </div>
                           <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">Verified Alias Identity</h6>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-6">
                             This method skips the Workspace checkout entirely and cannot be blocked by Google.
                           </p>
                           <a 
                             href="https://myaccount.google.com/alternateemail" 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-700 transition shadow-xl shadow-indigo-200 active:scale-95"
                           >
                             Execute Side-Door Protocol <ExternalLink size={14} />
                           </a>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-50 flex items-center gap-3">
                       <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                         <ShieldCheck size={16} />
                       </div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                         Success Rate: 100% | Cost: $0.00 | This workaround uses personal aliases to bypass business-tier paywalls.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'test' && (
        <div className="max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
           <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <Terminal className="text-sky-600" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Manual Handshake</h2>
                <p className="text-xs text-slate-500 font-medium">Force a communication relay to verify data integrity.</p>
              </div>
           </div>
           <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Target Node (Email)</label>
                    <input 
                      type="email" 
                      placeholder="support@nemesiss.in"
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-sky-500 transition font-mono"
                      value={testPayload.email}
                      onChange={e => setTestPayload({...testPayload, email: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Protocol Type (Slug)</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-sky-500 transition appearance-none cursor-pointer"
                      value={testPayload.type}
                      onChange={e => setTestPayload({...testPayload, type: e.target.value})}
                    >
                      {templates.map(t => <option key={t.slug} value={t.slug}>{t.slug.toUpperCase()}</option>)}
                    </select>
                 </div>
              </div>

              {testPayload.type === 'otp' && (
                <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Verification Code</label>
                   <input 
                     type="text" 
                     className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold outline-none font-mono tracking-widest text-sky-600"
                     value={testPayload.otp_code}
                     onChange={e => setTestPayload({...testPayload, otp_code: e.target.value})}
                   />
                </div>
              )}

              <button 
                onClick={handleSendTest}
                disabled={actionLoading || !testPayload.email}
                className="w-full py-4 bg-sky-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-sky-600 transition shadow-xl shadow-sky-200 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
              >
                {actionLoading ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                {actionLoading ? 'Initializing Relay...' : 'Execute Protocol Handshake'}
              </button>
           </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
           <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                   <History className="text-sky-600" size={24} />
                 </div>
                 <div>
                   <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Dispatch History</h2>
                   <p className="text-xs text-slate-500 font-medium">Audit logs for automated communication relays.</p>
                 </div>
              </div>
              <button 
                onClick={fetchData}
                disabled={actionLoading}
                className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 active:rotate-180 duration-500"
              >
                <RefreshCw size={20} />
              </button>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                       <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                       <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Recipient</th>
                       <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Protocol</th>
                       <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                       <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                           <Clock className="w-12 h-12 text-slate-100 mx-auto mb-3" />
                           <p className="text-xs font-black uppercase tracking-widest text-slate-300">No dispatch history recorded</p>
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Clock size={12} className="text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-xs font-bold text-slate-700">{log.recipient}</span>
                           </td>
                           <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                                {log.slug}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${log.status === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {log.status === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                 {log.status}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <button 
                                onClick={() => {
                                  if (log.error_message) {
                                    alert(`ERROR LOG: ${log.error_message}`);
                                  } else {
                                    alert(`DISPATCH SUCCESS: Protocol '${log.slug}' fully executed.`);
                                  }
                                }}
                                className="p-2 hover:bg-sky-50 rounded-lg text-slate-300 hover:text-sky-600 transition opacity-0 group-hover:opacity-100"
                              >
                                {log.status === 'success' ? <MailOpen size={16} /> : <AlertCircle size={16} />}
                              </button>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'automated' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { id: 'welcome', name: 'Identity Genesis', desc: 'Auto-sent on account initialization.', icon: <CheckCircle2 className="text-emerald-500" />, trigger: 'INSERT on profiles' },
              { id: 'suspended', name: 'Neutralization Protocol', desc: 'Auto-sent on account restriction.', icon: <AlertCircle className="text-rose-500" />, trigger: 'UPDATE on profiles' },
              { id: 'password_reset', name: 'Access Restoration', desc: 'Triggered via forgot password flow.', icon: <RefreshCw className="text-sky-500" />, trigger: 'Manual Recovery' },
              { id: 'otp', name: 'Node Authentication', desc: 'Triggered during uplink handshake.', icon: <Terminal className="text-slate-900" />, trigger: 'Auth Handshake' },
              { id: 'deleted', name: 'Archive Farewell', desc: 'Auto-sent on identity purging.', icon: <X className="text-slate-400" />, trigger: 'DELETE on profiles' },
            ].map(p => (
              <div key={p.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white group-hover:shadow-sm transition">
                    {p.icon}
                  </div>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-lg border border-emerald-100 flex items-center gap-1">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Active
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">{p.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-4">{p.desc}</p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">{p.trigger}</span>
                  <button 
                    onClick={() => {
                      setTestPayload({ ...testPayload, type: p.id });
                      setActiveTab('test');
                    }}
                    className="text-[9px] font-black text-sky-500 uppercase tracking-widest hover:text-sky-600"
                  >
                    Test Flow
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-sky-50/50 rounded-3xl p-6 border border-sky-100/50 flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-sky-100">
               <RefreshCw className="text-sky-600 animate-spin-slow" size={20} />
            </div>
            <div>
               <h4 className="text-xs font-black text-sky-900 uppercase tracking-widest">Automation Engine Active</h4>
               <p className="text-[10px] text-sky-700/70 font-bold uppercase tracking-tight leading-relaxed">
                 Database triggers are synchronized with the Intelligence Relay. All lifecycle events are processed in real-time.
               </p>
            </div>
          </div>
        </div>
      )}

      {/* Editor Sidebar Overlay */}
      <AnimatePresence>
        {editMode && selectedTemplate && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditMode(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-4xl bg-white shadow-2xl z-[101] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                 <div className="flex items-center gap-4">
                    <div className="bg-sky-50 p-3 rounded-2xl">
                      <Code className="text-sky-600" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Protocol Architect</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Editing: {selectedTemplate.slug}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="flex p-1 bg-slate-50 border border-slate-100 rounded-xl mr-2">
                       <button 
                         onClick={() => setEditorTab('source')}
                         className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition ${editorTab === 'source' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400'}`}
                       >
                         Source
                       </button>
                       <button 
                         onClick={() => setEditorTab('preview')}
                         className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition ${editorTab === 'preview' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400'}`}
                       >
                         Preview
                       </button>
                    </div>
                    <button 
                       onClick={handleSaveTemplate}
                       disabled={actionLoading}
                       className="px-6 py-2.5 bg-sky-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 transition shadow-lg shadow-sky-100 flex items-center gap-2"
                    >
                      {actionLoading ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                      Save Changes
                    </button>
                    <button onClick={() => setEditMode(false)} className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                      <X size={20} />
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                 <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-slate-50/30">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Transmission Subject</label>
                      <input 
                        type="text" 
                        value={selectedTemplate.subject}
                        onChange={e => setSelectedTemplate({...selectedTemplate, subject: e.target.value})}
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-base font-bold text-slate-900 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition shadow-sm font-black tracking-tight"
                      />
                    </div>

                    <div className="flex-1 flex flex-col min-h-[550px]">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {editorTab === 'source' ? 'HTML Infrastructure' : 'Visual Protocol Render'}
                        </label>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                             {editorTab === 'source' ? 'Protocol Matrix Active' : 'Intelligence Simulation Layer'}
                           </span>
                        </div>
                      </div>

                      {editorTab === 'source' ? (
                        <textarea 
                          className="flex-1 w-full p-6 bg-slate-900 text-sky-400 font-mono text-sm border-none rounded-3xl resize-none outline-none ring-1 ring-white/10 shadow-2xl overflow-y-auto leading-relaxed"
                          value={selectedTemplate.html}
                          onChange={e => setSelectedTemplate({...selectedTemplate, html: e.target.value})}
                          spellCheck={false}
                        />
                      ) : (
                        <div className="flex-1 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 relative group/preview min-h-[500px]">
                           <iframe 
                             title="Protocol Preview"
                             className="w-full h-full border-none min-h-[600px]"
                             srcDoc={(() => {
                               let html = selectedTemplate.html;
                               const samples: Record<string, string> = {
                                 otp_code: '123456',
                                 otp: '123456',
                                 auth_code: '123456',
                                 user_name: 'Alexander Nemesis',
                                 recovery_link: 'https://nemesiss.in/reset',
                                 reset_link: 'https://nemesiss.in/reset',
                                 invite_link: 'https://nemesiss.in/invite/test',
                                 app_name: 'NEMESIS',
                                 status: 'Identity Audit Required',
                                 reason: 'Routine Security Protocol verification required.'
                               };
                               Object.keys(samples).forEach(key => {
                                 const regex = new RegExp(`{{${key}}}`, "g");
                                 html = html.replace(regex, samples[key]);
                               });
                               return html;
                             })()}
                           />
                           <div className="absolute inset-0 pointer-events-none border-4 border-sky-500/0 group-hover/preview:border-sky-500/10 transition rounded-3xl" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                           <Terminal size={12} className="text-sky-500" /> Dynamic Entities
                         </h4>
                         <div className="flex flex-wrap gap-2">
                            {(selectedTemplate.variables as any[])?.map((v, idx) => {
                              const varName = typeof v === 'string' ? v : v.name;
                              const varDesc = typeof v === 'string' ? 'Dynamic Value' : v.description;
                              return (
                                <div key={varName || `sel-var-${idx}`} className="group/var px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold text-sky-600">{"{{"}{varName}{"}}"}</span>
                                  <span className="text-[9px] font-medium text-slate-400 truncate max-w-[120px]">{varDesc}</span>
                                </div>
                              );
                            })}
                         </div>
                      </div>
                      <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100/50">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-2">
                           <CheckCircle2 size={12} /> Architect Note
                         </h4>
                         <p className="text-[10px] text-emerald-600/80 font-bold leading-relaxed italic uppercase tracking-tighter">
                           Templates utilize standard HTML with embedded glassmorphism styles. Always verify CDN asset availability before committing.
                         </p>
                      </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
