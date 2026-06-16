import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader } from 'lucide-react';

interface NativePDFViewerProps {
  /** blob: URL created from the downloaded PDF blob */
  blobUrl: string | null;
  /** Whether the blob is still being fetched */
  isLoading?: boolean;
}

/**
 * Canvas-based PDF renderer powered by pdfjs-dist.
 * Used in the native Cordova/WebView environment where <iframe> cannot render PDFs.
 * This component fully replaces the <iframe> approach and works in any WebView.
 */
export default function NativePDFViewer({ blobUrl, isLoading }: NativePDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.4);
  const [pageRendering, setPageRendering] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Store the pdfjs document ref so we can re-render when page/scale changes
  const pdfDocRef = useRef<any>(null);
  // Track pending render to avoid race conditions
  const pendingRenderRef = useRef<boolean>(false);

  // ── Load the PDF document when blob URL is available ─────────────────────
  useEffect(() => {
    if (!blobUrl) return;
    setLoadError(null);
    setNumPages(0);
    setCurrentPage(1);
    pdfDocRef.current = null;

    const loadPdf = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // Use CDN worker — this is the same as the text-extraction code
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const doc = await pdfjsLib.getDocument(blobUrl).promise;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
      } catch (err: any) {
        console.error('[NativePDFViewer] Load error:', err);
        setLoadError('Could not load PDF. Try opening it externally.');
      }
    };

    loadPdf();
  }, [blobUrl]);

  // ── Render the current page to canvas whenever page or scale changes ─────
  useEffect(() => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || numPages === 0) return;

    // Prevent concurrent renders
    if (pendingRenderRef.current) return;
    pendingRenderRef.current = true;
    setPageRendering(true);

    const render = async () => {
      try {
        const page = await doc.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        // Size the canvas to match the PDF page
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error('[NativePDFViewer] Render error:', err);
      } finally {
        pendingRenderRef.current = false;
        setPageRendering(false);
      }
    };

    render();
  }, [currentPage, scale, numPages]);

  // ── Loading state (waiting for blob) ─────────────────────────────────────
  if (isLoading || (!blobUrl && !loadError)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-sky-500/20 rounded-full" />
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-[0.3em] animate-pulse">
          Decrypting File...
        </p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-8">
        <div className="glass-premium bg-white/80 dark:bg-slate-800/80 p-8 rounded-3xl border border-red-200 dark:border-red-900/40 text-center max-w-sm shadow-xl">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📄</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < numPages;

  return (
    <div className="w-full h-full flex flex-col bg-slate-300 dark:bg-slate-900 overflow-hidden">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/95 backdrop-blur-md text-white shrink-0 shadow-lg z-10">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={!canGoBack || pageRendering}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition active:scale-90"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="bg-white/10 rounded-lg px-3 py-1 min-w-[64px] text-center">
            <span className="text-xs font-black tabular-nums">
              {numPages === 0 ? '…' : `${currentPage} / ${numPages}`}
            </span>
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
            disabled={!canGoForward || pageRendering}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition active:scale-90"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          {pageRendering && <Loader size={14} className="animate-spin text-sky-400 mr-1" />}
          <button
            onClick={() => setScale(s => Math.max(0.5, parseFloat((s - 0.25).toFixed(2))))}
            disabled={scale <= 0.5}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition active:scale-90"
          >
            <ZoomOut size={16} />
          </button>
          <div className="bg-white/10 rounded-lg px-2 py-1 min-w-[48px] text-center">
            <span className="text-xs font-black tabular-nums">{Math.round(scale * 100)}%</span>
          </div>
          <button
            onClick={() => setScale(s => Math.min(4, parseFloat((s + 0.25).toFixed(2))))}
            disabled={scale >= 4}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition active:scale-90"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* ── PDF Canvas ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-3">
        <div className="relative inline-block shadow-2xl rounded-xl overflow-hidden">
          {pageRendering && (
            <div className="absolute inset-0 bg-white/40 dark:bg-black/40 flex items-center justify-center z-10">
              <Loader size={28} className="animate-spin text-sky-500" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="block max-w-full bg-white"
            style={{ touchAction: 'pan-x pan-y' }}
          />
        </div>
      </div>
    </div>
  );
}
