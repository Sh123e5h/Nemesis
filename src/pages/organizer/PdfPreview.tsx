import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Sparkles,
  X,
  Brain,
  FileText,
  Zap,
  ExternalLink,
  Search
} from 'lucide-react';
import { lazyWithRetry as lazy } from '../../lib/lazyWithRetry';
const QuizGenerator = lazy(() => import('../../components/QuizGenerator'), 'QuizGenerator');

// pdfjs-dist is now dynamically imported only when needed to reduce bundle size
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchDriveFileBlob, fetchDriveFileViaEdge } from '../../lib/gdrive';

/**
 * Robust helper to extract Google Drive file ID from any URL format.
 * Matches: /d/ID, ?id=ID, open?id=ID, uc?id=ID
 */
function extractGDriveId(url: string | undefined): string | null {
  if (!url) return null;
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    try {
      const u = url.startsWith('http') ? new URL(url) : new URL(url, 'https://drive.google.com');
      const q = u.searchParams.get('id');
      if (q) return q;
    } catch {
      /* fall through */
    }
  }
  const idMatch =
    url.match(/\/file\/d\/([^/?#]+)/) ||
    url.match(/\/d\/([^/?#]+)/) ||
    url.match(/[?&]id=([^&?#]+)/);
  return idMatch ? idMatch[1] : null;
}


function isCsvMaterial(m: { title?: string; file_name?: string; mime_type?: string } | null): boolean {
  if (!m) return false;
  const name = (m.title || m.file_name || '').toLowerCase();
  if (name.endsWith('.csv')) return true;
  const mt = (m.mime_type || '').toLowerCase();
  return mt === 'text/csv' || mt === 'application/csv' || mt.includes('csv');
}


/** Split one CSV line respecting quoted fields */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && c === ',') {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

export default function PdfPreview() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([
    { role: 'ai', content: 'Hello! I am your Nemesis AI Study Assistant. I can help you summarize this document or answer questions about its content. What would you like to know?' }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showQuizGen, setShowQuizGen] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [csvSearchQuery, setCsvSearchQuery] = useState('');
  const [isBlobLoading, setIsBlobLoading] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);
  const [gDriveId, setGDriveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  useEffect(() => {
    if (!fileId) return;
    setLoading(true);
    setExtractedText('');
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    const isGroupFile = window.location.search.includes('type=group');
    const table = isGroupFile ? 'files' : 'study_materials';

    supabase.from(table).select('*').eq('id', fileId).single().then(async ({ data }) => {
      if (data) {
        const originalName = isGroupFile ? data.file_name : data.title;
        
        if (isGroupFile) {
          let simplified = data.mime_type;
          if (data.mime_type?.startsWith('image/')) simplified = 'image';
          else if (data.mime_type?.startsWith('video/')) simplified = 'video';
          else if (data.mime_type?.startsWith('audio/')) simplified = 'audio';
          else if (data.mime_type === 'application/pdf' || data.file_name.toLowerCase().endsWith('.pdf')) simplified = 'pdf';
          else if (data.mime_type === 'document' || data.file_name.match(/\.(doc|docx|txt|rtf|csv|xls|xlsx|md)$/i)) simplified = 'document';

          setMaterial({
            ...data,
            title: data.file_name,
            file_type: simplified
          });
        } else {
          setMaterial(data);
        }

        const driveId = extractGDriveId(data.file_url);
        if (driveId) setGDriveId(driveId);

        document.title = `${originalName} | Nemesis`;
        setLoading(false);

        const isPdf = isGroupFile 
          ? data.mime_type === 'application/pdf' || data.file_name?.toLowerCase().endsWith('.pdf')
          : data.file_type === 'pdf' || data.title?.toLowerCase().endsWith('.pdf');

        setIsBlobLoading(true);
        try {
          const processBlob = async (blob: Blob) => {
            let finalBlob = blob;
            if (isPdf && blob.type !== 'application/pdf') {
              finalBlob = new Blob([blob], { type: 'application/pdf' });
            }
            const url = URL.createObjectURL(finalBlob);
            setBlobUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
            const wantsText =
              isPdf ||
              originalName.toLowerCase().match(/\.(txt|csv)$/i) ||
              isCsvMaterial({ title: originalName, mime_type: data.mime_type });
            if (!wantsText) return;
            try {
              if (isPdf) {
                if (blob.size < 100 * 1024 * 1024) {
                  const arrayBuffer = await blob.arrayBuffer();
                  const pdfjsLib = await import('pdfjs-dist');
                  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
                  
                  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                  let fullText = '';
                  for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
                  }
                  setExtractedText(fullText.trim());
                }
              } else {
                const text = await blob.text();
                const trimmed = text.trim();
                if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
                  console.warn(
                    '[Preview] Received HTML instead of file body (often Google sign-in or Drive permissions).'
                  );
                  return;
                }
                setExtractedText(trimmed);
              }
            } catch (err) {
              console.error('[Extract] Failed:', err);
            }
          };

          let loaded = false;

          let effectiveHash: string | undefined = data.storage_hash ?? undefined;
          if (!effectiveHash && data.file_url) {
            const { data: sob } = await supabase
              .from('storage_objects')
              .select('hash')
              .eq('path', data.file_url)
              .maybeSingle();
            if (sob?.hash) effectiveHash = sob.hash;
          }

          /* Suppressed legacy Supabase fetcher. We only use GDrive now. */

          if (!loaded && driveId) {
            try {
              let blob = await fetchDriveFileBlob(driveId);
              if (!blob && fileId) {
                blob = await fetchDriveFileViaEdge(fileId, isGroupFile);
              }
              if (blob) {
                await processBlob(blob);
                loaded = true;
              }
            } catch (e) {
              console.error('[Drive Fetch] Failed:', e);
            }
          }

          if (!loaded && !driveId) {
            if (data.file_url?.startsWith('http')) {
              try {
                const res = await fetch(data.file_url, { mode: 'cors' });
                if (res.ok) {
                  const blob = await res.blob();
                  await processBlob(blob);
                }
              } catch (e) {
                console.error('[Storage URL Fetch] Failed:', e);
              }
            }
          }
        } catch (err) {
          console.error("Failed to process file:", err);
        } finally {
          setIsBlobLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      document.title = 'Nemesis';
    };
  }, [fileId]);

  /* If CSV text extraction missed (race / edge case), read from object URL */
  useEffect(() => {
    if (!material || !isCsvMaterial(material)) return;
    if (extractedText) return;
    if (!blobUrl) return;
    let cancelled = false;
    fetch(blobUrl)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled && t?.trim()) setExtractedText(t.trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [material, blobUrl, extractedText]);

  const sendChatMessage = async (msgOverride?: string) => {
    const messageToSend = msgOverride || chatMessage;
    if (!messageToSend.trim()) return;
    
    const userMsg = { role: 'user', content: messageToSend };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatMessage('');
    setIsAiTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('pdf-ai-assistant', {
        body: { 
          fileUrl: material.file_url,
          extractedText: extractedText,
          fileName: material.title,
          messages: newMessages.slice(-6),
          materialId: material.id,
          isGroupFile: window.location.search.includes('type=group')
        }
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: 'ai', content: data.text }]);
    } catch (err) {
      console.error("AI Assistant Error:", err);
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I'm having trouble thinking right now. Please check your connection and GEMINI_API_KEY." }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950 cyberpunk:bg-black overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-white/5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-slate-200 dark:bg-white/5 rounded-full" />
          <div className="w-48 h-6 bg-slate-200 dark:bg-white/5 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-white dark:bg-slate-950 p-8 flex flex-col items-center justify-center space-y-6">
          <div className="w-full max-w-4xl h-[80%] bg-slate-100 dark:bg-white/5 rounded-3xl animate-pulse shadow-2xl" />
        </div>
      </div>
    </div>
  );
  if (!material) return (
    <div className="h-screen bg-white dark:bg-slate-950 cyberpunk:bg-black flex items-center justify-center p-8 transition-colors duration-500">
      <div className="glass-premium p-10 rounded-3xl border border-red-500/20 text-center max-w-md">
        <div className="bg-red-500/10 p-4 rounded-2xl text-red-500 mx-auto w-fit mb-6">
          <X size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Material Terminated</h3>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">The resource was not found or has been purged from the matrix.</p>
        <button onClick={() => navigate(-1)} className="mt-8 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition">Re-Entry</button>
      </div>
    </div>
  );

  const handleGenerateQuiz = () => setShowQuizGen(true);
  
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950 cyberpunk:bg-black text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden">
      {/* Premium Header */}
      <div className="flex items-center justify-between p-3 md:p-4 glass-premium bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-white/5 relative z-50">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="hidden sm:inline font-black text-[10px] uppercase tracking-[0.2em]">Exit Terminal</span>
        </button>
        
        <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
          <div className="flex items-center gap-3 max-w-full glass-premium bg-slate-100/50 dark:bg-white/5 px-6 py-2 rounded-2xl border border-slate-200/50 dark:border-white/5">
            <div className="flex items-center gap-2">
              {material.file_type === 'pdf' ? <FileText size={18} className="text-red-500 glow-red" /> : <FileText size={18} className="text-sky-400 glow-sky" />}
              <span className="text-sm font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none truncate max-w-[150px] md:max-w-[400px]">
                {material.title}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3">
          <button 
            onClick={handleGenerateQuiz} 
            className="group flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-sky-50 dark:hover:bg-sky-500/20 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 w-9 h-9 md:w-auto md:px-5 md:py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-slate-200 dark:border-white/5 hover:border-sky-200 dark:hover:border-sky-500/30 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/10 active:scale-95"
          >
            <Brain size={18} className="text-sky-500 dark:text-sky-400 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors" /> 
            <span className="hidden md:inline">Neural Quiz</span>
          </button>
          
          <button 
            onClick={() => setShowChat(!showChat)} 
            className={`flex items-center justify-center gap-2 w-9 h-9 md:w-auto md:px-5 md:py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${showChat ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/20 scale-105' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-white/5 hover:scale-105 active:scale-95'}`}
          >
            <Sparkles size={18} /> 
            <span className="hidden md:inline">{showChat ? 'Syncing...' : 'Assistant'}</span>
          </button>

          {gDriveId && (
            <a href={`https://drive.google.com/file/d/${gDriveId}/view`} target="_blank" rel="noreferrer" className="hidden sm:flex items-center justify-center w-9 h-9 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-white/5 hover:scale-105 active:scale-95">
              <ExternalLink size={18} />
            </a>
          )}
          
          <a href={material.file_url} download target="_blank" rel="noreferrer" className="flex items-center justify-center w-9 h-9 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-white/5 hover:scale-105 active:scale-95">
            <Download size={18} />
          </a>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 pb-[env(safe-area-inset-bottom)] relative overflow-hidden flex flex-col">
          <div className="flex-1 w-full relative group overflow-hidden">
            <style dangerouslySetInnerHTML={{ __html: `
              .custom-viewer-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
              .custom-viewer-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-viewer-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.15); border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
              .custom-viewer-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); background-clip: content-box; }
            ` }} />

            {/* CSV ENGINE UI */}
            {isCsvMaterial(material) ? (
              !extractedText && isBlobLoading ? (
                <div className="w-full h-full bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-10 space-y-8 transition-colors duration-500">
                  <div className="relative">
                    <div className="w-32 h-32 bg-sky-500/10 rounded-full animate-ping absolute inset-0" />
                    <div className="w-32 h-32 glass-premium bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-white/5 shadow-3xl flex items-center justify-center relative z-10 rotate-12 transition-transform duration-700">
                      <FileText size={48} className="text-sky-500 glow-sky" />
                    </div>
                  </div>
                  <div className="text-center space-y-4">
                    <h3 className="text-slate-900 dark:text-white text-xl font-black uppercase tracking-tight">Nemesis Data Matrix</h3>
                    <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Neural Parsing Engaged</p>
                  </div>
                </div>
              ) : extractedText ? (
                <div className="w-full h-full bg-white dark:bg-slate-950 overflow-hidden flex flex-col relative transition-colors duration-500">
                  {/* CSV Header & Filter */}
                  <div className="p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between gap-4 shrink-0 transition-colors">
                    <div className="flex items-center gap-3 flex-1 glass-premium bg-white/50 dark:bg-white/5 px-5 py-3 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-inner">
                      <div className="text-sky-500 dark:text-sky-400">
                        <Search size={18} />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Scan matrix data..." 
                        className="bg-transparent border-none focus:outline-none text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 w-full placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        onChange={(e) => setCsvSearchQuery(e.target.value)}
                        value={csvSearchQuery}
                      />
                    </div>
                    <div className="px-4 py-2 glass-premium bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hidden xs:block">
                      {extractedText.split('\n').length - 1} Records
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto custom-viewer-scrollbar relative p-4 md:p-8">
                    <div className="max-w-full mx-auto pb-20">
                      <div className="glass-premium bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-3xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="sticky top-0 z-30">
                              <tr className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10">
                                {parseCsvLine(extractedText.split('\n')[0] || '').map((header, i) => {
                                  const text = header.replace(/^"|"$/g, '').trim();
                                  return (
                                    <th key={i} className="px-6 py-5 text-[10px] font-black text-sky-500 dark:text-sky-400 uppercase tracking-widest whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-sky-500 rounded-full glow-sky" />
                                        {text || `COL_${i+1}`}
                                      </div>
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                              {extractedText.split('\n')
                                .slice(1)
                                .filter(l => l.trim())
                                .filter(l => !csvSearchQuery || l.toLowerCase().includes(csvSearchQuery.toLowerCase()))
                                .map((row, i) => (
                                  <tr key={i} className="hover:bg-sky-500/[0.03] dark:hover:bg-white/[0.04] transition group/row">
                                    {parseCsvLine(row).map((cell, j) => (
                                      <td key={j} className="px-6 py-5 text-slate-600 dark:text-slate-400 font-bold text-xs whitespace-nowrap">
                                        <span className="group-hover/row:text-slate-900 dark:group-hover/row:text-slate-100 transition-colors">
                                          {cell.replace(/^"|"$/g, '').trim()}
                                        </span>
                                      </td>
                                    ))}
                                  </tr>
                                ))
                              }
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center gap-6">
                  <div className="glass-premium bg-white/80 dark:bg-slate-900/80 px-10 py-12 rounded-[2.5rem] border border-slate-200 dark:border-white/10 max-w-md shadow-3xl text-center">
                    <div className="bg-sky-500/10 p-4 rounded-2xl text-sky-500 mx-auto w-fit mb-6">
                      <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Transmission Error</h3>
                    <div className="space-y-4 mb-8 text-center">
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                        The neural stream could not be established in this terminal. Direct download required for full resolution.
                      </p>
                    </div>
                    <a
                      href={material.file_url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-3 bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-sky-500/20 active:scale-95"
                    >
                      <Download size={18} /> Download Asset
                    </a>
                  </div>
                </div>
              )
            ) : material.file_type === 'pdf' ? (
              <iframe 
                src={blobUrl || (gDriveId ? `https://drive.google.com/file/d/${gDriveId}/preview` : material.file_url)} 
                className="w-full h-full border-none bg-white dark:bg-slate-950 transition-colors duration-500"
                title={material.title}
                key={blobUrl ? "blob" : "preview"}
              />
            ) : material.file_type === 'video' ? (
              <div className="flex items-center justify-center h-full w-full bg-black">
                <video src={blobUrl || material.file_url} controls className="max-w-5xl w-full max-h-[90%] rounded-3xl shadow-2xl border border-white/10" />
              </div>
            ) : material.file_type === 'image' ? (
              ((gDriveId && !blobUrl) || imgLoadError) ? (
                <iframe src={`https://drive.google.com/file/d/${gDriveId}/preview`} className="w-full h-full border-none bg-white dark:bg-slate-950" title={material.title} />
              ) : (
                <div className="flex items-center justify-center h-full w-full bg-slate-100 dark:bg-slate-950 p-8 transition-colors duration-500">
                  <img 
                    src={blobUrl || (gDriveId ? `https://drive.google.com/uc?id=${gDriveId}` : material.file_url)} 
                    alt={material.title} 
                    className="max-w-full max-h-full object-contain rounded-3xl shadow-3xl border border-slate-200 dark:border-white/5 transition-opacity duration-300" 
                    referrerPolicy="no-referrer"
                    onError={() => setImgLoadError(true)}
                  />
                </div>
              )
            ) : material.file_type === 'audio' ? (
              <div className="flex flex-col items-center justify-center h-full w-full space-y-8 bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
                <div className="w-40 h-40 glass-premium bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-3xl border border-slate-200 dark:border-white/10">
                  <FileText size={56} className="text-pink-500 glow-pink" />
                </div>
                <div className="text-center px-8">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight max-w-md">{material.title}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">Audio Signal Locked</p>
                </div>
                <div className="w-full max-w-md glass-premium bg-white/50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-white/10">
                  <audio src={blobUrl || material.file_url} controls className="w-full" />
                </div>
              </div>
            ) : material.file_type === 'link' ? (
              <div className="flex flex-col items-center justify-center h-full space-y-8 p-12 text-center">
                <div className="p-8 glass-premium bg-white/80 dark:bg-slate-900/80 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-3xl max-w-md">
                  <div className="w-20 h-20 bg-sky-500/10 rounded-[1.5rem] flex items-center justify-center text-sky-500 mx-auto mb-8">
                    <ExternalLink size={36} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">External Protocol Detected</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest leading-relaxed mb-10">
                    The requested resource resides outside the local intelligence grid. Syncing requires direct uplink.
                  </p>
                  <a href={material.file_url} target="_blank" rel="noreferrer" className="block w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-sky-500/20 active:scale-95">
                    Establish Uplink
                  </a>
                </div>
              </div>
            ) : material.title?.match(/\.txt$/i) && extractedText ? (
              <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-6 md:p-12 overflow-auto custom-viewer-scrollbar transition-colors duration-500">
                 <div className="max-w-4xl mx-auto glass-premium bg-white dark:bg-slate-900/50 p-8 md:p-12 rounded-[2rem] border border-slate-200/50 dark:border-white/5 shadow-3xl">
                   <pre className="font-mono text-sm text-slate-700 dark:text-sky-400/90 leading-relaxed whitespace-pre-wrap">{extractedText}</pre>
                 </div>
              </div>
            ) : (gDriveId) ? (
              <iframe src={`https://drive.google.com/file/d/${gDriveId}/preview`} className="w-full h-full border-none bg-white dark:bg-slate-950 font-sans" title="Drive Secure Preview" />
            ) : material.title?.match(/\.(doc|docx|xls|xlsx|ppt|pptx|rtf)$/i) ? (
              <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(material.file_url)}`} className="w-full h-full border-none bg-white dark:bg-slate-950" title="Doc Preview" />
            ) : (
              <iframe src={material.file_url} className="w-full h-full border-none bg-white dark:bg-slate-950 font-sans" title="Fallback Preview" />
            )}
          </div>
        </div>

        {/* AI Assistant Panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-[400px] glass-premium bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-l border-slate-200 dark:border-white/10 flex flex-col shadow-2xl z-20 relative overflow-hidden"
            >
              {/* AI Header */}
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-sky-500 text-white rounded-2xl shadow-lg shadow-sky-500/30 glow-sky">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base uppercase tracking-tight leading-none">AI Agent</h3>
                    <p className="text-[9px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-[0.2em] mt-1.5">Synaptic Link Active</p>
                  </div>
                </div>
                <button onClick={() => setShowChat(false)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition active:scale-90">
                  <X size={20} />
                </button>
              </div>

              {/* Chat Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 custom-viewer-scrollbar scroll-smooth">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[90%] p-5 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-sky-500 text-white rounded-tr-none shadow-lg shadow-sky-500/10 font-bold' 
                        : 'glass-premium bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-white/10 font-medium'
                    }`}>
                      <div className="prose prose-slate dark:prose-invert prose-xs sm:prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="glass-premium bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl rounded-tl-none flex gap-1.5 border border-slate-200 dark:border-white/5 shadow-inner">
                      <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce delay-150" />
                      <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce delay-300" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 backdrop-blur-xl space-y-6 relative z-10">
                <div className="flex flex-wrap gap-2">
                   <button onClick={() => sendChatMessage("Summarize this document.")} className="px-3.5 py-2 glass-premium bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-500/20 hover:text-sky-600 dark:hover:text-sky-400 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-200 dark:border-white/5 hover:border-sky-200 dark:hover:border-sky-500/30 active:scale-95 shadow-sm">Summarize</button>
                   <button onClick={() => sendChatMessage("Identify key concepts.")} className="px-3.5 py-2 glass-premium bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-500/20 hover:text-sky-600 dark:hover:text-sky-400 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-200 dark:border-white/5 hover:border-sky-200 dark:hover:border-sky-500/30 active:scale-95 shadow-sm">Key Concepts</button>
                   <button onClick={handleGenerateQuiz} className="px-3.5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/10 flex items-center gap-2 active:scale-95 shadow-lg shadow-indigo-500/20">
                      <Zap size={14} className="fill-current" /> Quiz
                   </button>
                </div>
                
                <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }} className="relative group/input">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-2xl blur opacity-0 group-focus-within/input:opacity-20 transition duration-500"></div>
                  <input 
                    type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Query the document..."
                    className="relative w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl py-4 pl-5 pr-14 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all shadow-inner"
                  />
                  <button type="submit" disabled={!chatMessage.trim() || isAiTyping} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 text-sky-500 dark:text-sky-400 hover:bg-sky-500/10 rounded-xl transition-all disabled:opacity-30 active:scale-90">
                    <Send size={20} className="fill-current" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showQuizGen && material && (
        <Suspense fallback={null}>
          <QuizGenerator 
            subject={material.subject} topic={material.topic} materialId={fileId}
            fileUrl={material.file_url} extractedText={extractedText}
            isGroupFile={window.location.search.includes('type=group')}
            onClose={() => setShowQuizGen(false)} 
            onGenerated={(quizId: string) => { setShowQuizGen(false); navigate(`/organizer/quiz/${quizId}`); }}
          />
        </Suspense>
      )}
    </div>
  );
}
