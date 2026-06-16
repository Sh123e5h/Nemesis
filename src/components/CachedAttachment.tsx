import { useState, useEffect } from 'react';
import { ensureFileCached } from '../lib/fileCache';
import { getOptimizedUrl } from '../lib/storage';
import { FileText, Image as ImageIcon, Video, Mic, File } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  url: string;
  hash?: string;
  name?: string;
  type?: string;
  isMe?: boolean;
}

function renderIcon(type: string, size = 20) {
  switch (type?.toLowerCase()) {
    case 'pdf': return <FileText size={size} />;
    case 'image': return <ImageIcon size={size} />;
    case 'video': return <Video size={size} />;
    case 'audio': return <Mic size={size} />;
    case 'document': return <FileText size={size} />;
    default: return <File size={size} />;
  }
}

export default function CachedAttachment({ url, hash, name, type, isMe }: Props) {
  const [displayUrl, setDisplayUrl] = useState(url);
  const [isLocal, setIsLocal] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (hash && url) {
      ensureFileCached(url, hash, name || 'file').then(localUri => {
        if (localUri !== url) {
          setDisplayUrl(localUri);
          setIsLocal(true);
        }
      });
    }
  }, [url, hash, name]);

  const isImage = type === 'image' || url.match(/\.(jpeg|jpg|gif|png|webp)$/i);

  if (isImage && !imageFailed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          "relative block rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all max-w-[260px] sm:max-w-[300px]",
          isMe ? "border-sky-500/20 border" : "border-slate-200 border"
        )}
      >
        <img 
          src={isLocal ? displayUrl : getOptimizedUrl(url, 400)} 
          alt={name || 'Attachment'}
          loading="lazy"
          className="w-full h-auto max-h-80 object-cover"
          onError={() => setImageFailed(true)}
        />
        {isLocal && (
          <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md rounded-full p-1">
             <span className="text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">✓ Cached</span>
          </div>
        )}
      </a>
    );
  }

  // Fallback for non-images AND failed images
  const safeType = type || (isImage ? 'image' : 'document');
  
  return (
    <a href={url} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 hover:bg-slate-50 transition rounded-xl border border-slate-200 shadow-sm ${isMe ? 'bg-sky-50' : 'bg-white'}`}>
      <div className="w-10 h-10 rounded bg-sky-100 text-sky-500 flex items-center justify-center shrink-0">
        {renderIcon(safeType)}
      </div>
      <div className="min-w-0 pr-4">
        <div className="font-semibold text-sm text-slate-700 truncate">{name || 'Attachment'}</div>
        <div className="text-xs text-slate-500 uppercase flex items-center gap-2">
          {safeType}
          {isLocal && <span className="text-emerald-500 font-bold ml-1 text-[8px]">LOCAL</span>}
        </div>
      </div>
    </a>
  );
}
