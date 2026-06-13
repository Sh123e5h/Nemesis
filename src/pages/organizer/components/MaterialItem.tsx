import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileText, Link as LinkIcon, File, Download, Trash2,
  Image as LucideImage, Edit2, Video, Mic, Share2, ExternalLink,
} from 'lucide-react';

export interface Material {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  tags: string[];
  created_at: string;
}

interface MaterialItemProps {
  material: Material;
  onEdit: (mat: Material) => void;
  onShare: (mat: Material) => void;
  onDelete: (id: string, fileType: string, fileUrl: string) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function getYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function renderIcon(type: string) {
  switch (type) {
    case 'pdf': return <FileText size={24} className="text-red-500" />;
    case 'image': return <LucideImage size={24} className="text-emerald-500" />;
    case 'video': return <Video size={24} className="text-purple-500" />;
    case 'audio': return <Mic size={24} className="text-pink-500" />;
    case 'document': return <FileText size={24} className="text-blue-500" />;
    case 'link': return <LinkIcon size={24} className="text-sky-500" />;
    case 'note': return <File size={24} className="text-amber-500" />;
    default: return <File size={24} className="text-slate-500" />;
  }
}

export default function MaterialItem({ material: mat, onEdit, onShare, onDelete }: MaterialItemProps) {
  const ytId = mat.file_type === 'link' ? getYoutubeVideoId(mat.file_url) : null;

  const typeColor =
    mat.file_type === 'pdf' ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-100 dark:border-red-900/40' :
    mat.file_type === 'link' ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-500 dark:text-sky-400 border-sky-100 dark:border-sky-900/40' :
    mat.file_type === 'image' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40' :
    'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';

  const Preview = (
    <>
      <div className={`bg-slate-500/5 dark:bg-slate-400/5 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 ${ytId ? 'w-16 h-11 md:w-20 md:h-14 p-0' : 'p-2.5'}`}>
        {ytId ? (
          <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="YouTube" className="w-full h-full object-cover" />
        ) : (
          <div className="transition-all duration-300 group-hover:scale-110 filter drop-shadow-sm">
            {renderIcon(mat.file_type)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 text-sm md:text-base truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
          {mat.title}
        </h3>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 capitalize cursor-pointer flex gap-2 flex-wrap items-center font-semibold">
          <span className={`px-1.5 py-0.5 rounded uppercase tracking-widest text-[8px] border ${typeColor}`}>
            {mat.file_type}
          </span>
          <span className="opacity-60">• {new Date(mat.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </>
  );

  return (
    <motion.div variants={itemVariants}>
      <div className="glass-premium p-3 md:p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 md:hover:shadow-premium transition duration-300 flex flex-col gap-3 group hover:border-sky-500/30 dark:hover:border-sky-500/30 md:hover:-translate-y-1">
        <div className="flex items-start justify-between">
          {mat.file_type === 'link' ? (
            <a href={mat.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 overflow-hidden flex-1 hover:opacity-80 transition group/link">
              {Preview}
            </a>
          ) : (
            <Link to={`/organizer/preview/${mat.id}`} className="flex items-center gap-3 overflow-hidden flex-1 hover:opacity-80 transition">
              {Preview}
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-1">
          <div className="flex flex-wrap gap-1">
            {mat.tags?.map((tag) => (
              <span key={tag} className="text-[8px] bg-sky-500/5 px-2 py-0.5 rounded-full text-sky-600 font-black uppercase tracking-tighter border border-sky-500/10 flex items-center gap-0.5">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onShare(mat)}
              className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-all duration-300 hover:scale-125 glow-sky"
              title="Share"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => onEdit(mat)}
              className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all duration-300 hover:scale-125"
              title="Settings"
            >
              <Edit2 size={16} />
            </button>
            {mat.file_url && (
              <a
                href={mat.file_url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-all duration-300 hover:scale-125 glow-sky"
                title="Link/DL"
              >
                {mat.file_type === 'link' ? <ExternalLink size={16} /> : <Download size={16} />}
              </a>
            )}
            <button
              onClick={() => onDelete(mat.id, mat.file_type, mat.file_url)}
              className="p-1.5 text-slate-300 dark:text-slate-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 hover:scale-125"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
