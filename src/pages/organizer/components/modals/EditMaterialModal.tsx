import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import type { Material } from '../MaterialItem';

interface EditMaterialModalProps {
  material: Material | null;
  editTitle: string;
  editTags: string;
  fileSize: string;
  savingEdit: boolean;
  onTitleChange: (v: string) => void;
  onTagsChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function EditMaterialModal({
  material,
  editTitle,
  editTags,
  fileSize,
  savingEdit,
  onTitleChange,
  onTagsChange,
  onSave,
  onClose,
}: EditMaterialModalProps) {
  return createPortal(
    <AnimatePresence>
      {material && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 8 }}
            className="bg-white dark:bg-slate-900 cyberpunk:bg-black rounded-3xl shadow-4xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/30"
          >
            <div className="p-5 md:p-10">
              <div className="mb-3 md:mb-10">
                <h2 className="text-lg md:text-2xl font-bold dark:text-white cyberpunk:text-emerald-400 tracking-tight leading-none">
                  Asset Details
                </h2>
                <p className="text-[10px] md:text-sm font-semibold text-slate-500 mt-1 dark:text-slate-400">
                  Configuration & Tags
                </p>
              </div>

              <div className="space-y-4 md:space-y-8 max-h-[60vh] overflow-y-auto pr-2 thin-scrollbar">
                {/* Title */}
                <div>
                  <label className="text-[10px] md:text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 md:mb-2.5 block px-1">
                    Display Alias
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 md:px-5 py-3 md:py-4 bg-white dark:bg-slate-800 cyberpunk:bg-black border border-slate-300 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 font-bold dark:text-white cyberpunk:text-emerald-400 transition placeholder:text-slate-300 text-sm md:text-base"
                    value={editTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    disabled={savingEdit}
                    placeholder="Asset Title..."
                  />
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
                  {/* Mobile condensed */}
                  <div className="sm:hidden bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm space-y-2 text-slate-900 dark:text-white">
                    <div className="flex justify-between items-center text-[10px] font-bold border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 uppercase tracking-widest">Metadata Cluster</span>
                      <span className="text-sky-500 uppercase tracking-widest">Asset Active</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Category</p>
                        <p className="text-xs font-bold text-black dark:text-white capitalize">{material.file_type}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Net Mass</p>
                        <p className={`text-xs font-bold ${fileSize === 'Calculating...' ? 'text-sky-600 animate-pulse' : 'text-black dark:text-white'}`}>
                          {fileSize}
                        </p>
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Temporal Entry</p>
                      <p className="text-[11px] font-bold text-black dark:text-white">
                        {new Date(material.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Desktop cards */}
                  <div className="hidden sm:block bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-500/10 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/30 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5">Category</p>
                    <p className="text-sm font-bold dark:text-white cyberpunk:text-emerald-400 capitalize">{material.file_type}</p>
                  </div>
                  <div className="hidden sm:block bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 md:mb-1.5">Net Mass</p>
                    <p className={`text-sm font-bold ${fileSize === 'Calculating...' ? 'text-sky-600 animate-pulse' : 'text-black'}`}>
                      {fileSize}
                    </p>
                  </div>
                  <div className="hidden sm:block sm:col-span-2 bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 md:mb-1.5">Temporal Entry</p>
                    <p className="text-sm font-bold text-black">{new Date(material.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-[10px] md:text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 md:mb-2.5 block px-1">
                    Asset Tags
                  </label>
                  <textarea
                    className="w-full px-4 md:px-5 py-3 md:py-4 bg-white border border-slate-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 font-bold text-black transition placeholder:text-slate-400 resize-none h-20 md:h-32 text-sm md:text-base"
                    value={editTags}
                    onChange={(e) => onTagsChange(e.target.value)}
                    disabled={savingEdit}
                    placeholder="math, analysis, final_exam..."
                  />
                  <p className="mt-2 text-[9px] md:text-[10px] font-semibold text-slate-500 px-1">
                    Separate entries with commas for indexing
                  </p>
                </div>
              </div>

              <div className="mt-6 md:mt-10 flex flex-col sm:flex-row items-center justify-end gap-2 md:gap-3">
                <button
                  onClick={onSave}
                  disabled={savingEdit || !editTitle.trim()}
                  className="w-full sm:w-auto px-10 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs md:text-sm uppercase tracking-widest rounded-2xl shadow-glass hover:shadow-premium active:scale-95 transition disabled:opacity-50 order-1 sm:order-2"
                >
                  {savingEdit ? 'Syncing...' : 'Update Asset'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={savingEdit}
                  className="w-full sm:w-auto px-6 py-2.5 md:py-3 text-slate-600 dark:text-slate-400 cyberpunk:text-emerald-500 font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 cyberpunk:hover:bg-emerald-500/10 rounded-2xl transition disabled:opacity-50 order-2 sm:order-1"
                >
                  Discard
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
