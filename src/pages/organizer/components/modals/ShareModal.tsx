import { createPortal } from 'react-dom';
import { Share2, X, Users } from 'lucide-react';
import type { Material } from '../MaterialItem';

interface Group {
  id: string;
  name: string;
}

interface ShareModalProps {
  material: Material | null;
  userGroups: Group[];
  selectedGroup: string;
  isSharing: boolean;
  onSelectGroup: (id: string) => void;
  onShare: () => void;
  onClose: () => void;
}

export default function ShareModal({
  material,
  userGroups,
  selectedGroup,
  isSharing,
  onSelectGroup,
  onShare,
  onClose,
}: ShareModalProps) {
  if (!material) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[99999] transition pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="bg-white dark:bg-slate-900 cyberpunk:bg-black rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/50 w-full max-w-sm overflow-hidden flex flex-col transform transition duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-100/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500">
              <Share2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Share to Group</h2>
              <p className="text-[10px] text-slate-400 font-medium">Distribute assets to community hubs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 pr-2">
            Choose Destination
          </label>

          {userGroups.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Users size={24} className="text-slate-300" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Groups Found</h3>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                Join or create a group in the "Groups" panel to share your materials.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 thin-scrollbar">
              {userGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onSelectGroup(g.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition duration-200 text-left ${
                    selectedGroup === g.id
                      ? 'bg-sky-50 border-sky-200 ring-2 ring-sky-500/5 shadow-sm'
                      : 'bg-white border-slate-100 hover:border-sky-200 hover:bg-slate-50/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
                    selectedGroup === g.id ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {g.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[11px] font-bold truncate ${selectedGroup === g.id ? 'text-sky-900' : 'text-slate-800'}`}>
                      {g.name}
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">Verified Active Group</div>
                  </div>
                  {selectedGroup === g.id && (
                    <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 mt-1 border-t border-slate-100/50 bg-slate-50/50 transition-opacity ${userGroups.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
          <button
            onClick={onShare}
            className="w-full py-3 bg-sky-500 text-white rounded-2xl hover:bg-sky-600 font-bold text-sm tracking-tight transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-glass hover:shadow-premium"
            disabled={isSharing || !selectedGroup}
          >
            {isSharing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sharing Intel...</span>
              </>
            ) : (
              <>
                <Share2 size={16} />
                <span>Share to Hub</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
