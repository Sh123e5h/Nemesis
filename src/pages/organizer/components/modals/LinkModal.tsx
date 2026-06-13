import { createPortal } from 'react-dom';

interface LinkModalProps {
  title: string;
  url: string;
  onTitleChange: (v: string) => void;
  onUrlChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function LinkModal({ title, url, onTitleChange, onUrlChange, onSubmit, onClose }: LinkModalProps) {
  return createPortal(
    <div className="modal-overlay">
      <div className="bg-white dark:bg-slate-900 cyberpunk:bg-black rounded-xl shadow-lg w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/50 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 mb-4">Add Link</h2>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Title (e.g. YouTube Tutorial)"
            className="w-full p-3 bg-white dark:bg-slate-800 cyberpunk:bg-black border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:text-white cyberpunk:text-emerald-400 mb-3"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
          />
          <input
            type="url"
            placeholder="https://..."
            className="w-full p-3 bg-white dark:bg-slate-800 cyberpunk:bg-black border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:text-white cyberpunk:text-emerald-400 mb-4"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600">
              Save Link
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
