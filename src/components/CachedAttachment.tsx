import { useState, useEffect } from 'react';
import { ensureFileCached } from '../lib/fileCache';
import { getOptimizedUrl } from '../lib/storage';
import { FileText } from 'lucide-react';

interface Props {
  url: string;
  hash?: string;
  name?: string;
  type?: string;
  isMe?: boolean;
}

export default function CachedAttachment({ url, hash, name, type, isMe }: Props) {
  const [displayUrl, setDisplayUrl] = useState(url);
  const [isLocal, setIsLocal] = useState(false);

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

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block relative">
        <img 
          src={isLocal ? displayUrl : getOptimizedUrl(url, 400)} 
          alt={name || 'Attachment'} 
          className="w-full h-auto max-h-64 object-cover hover:opacity-90 transition rounded-xl border border-slate-200 shadow-sm"
          loading="lazy"
        />
        {isLocal && (
          <div className="absolute top-2 right-2 bg-emerald-500/80 text-white text-[8px] px-1 rounded font-bold uppercase">Cached</div>
        )}
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 hover:bg-slate-50 transition rounded-xl border border-slate-200 shadow-sm ${isMe ? 'bg-sky-50' : 'bg-white'}`}>
      <div className="w-10 h-10 rounded bg-sky-100 text-sky-500 flex items-center justify-center shrink-0">
        <FileText size={20} />
      </div>
      <div className="min-w-0 pr-4">
        <div className="font-semibold text-sm text-slate-700 truncate">{name || 'Attachment'}</div>
        <div className="text-xs text-slate-500 uppercase flex items-center gap-2">
          {type || 'document'}
          {isLocal && <span className="text-emerald-500 font-bold ml-1 text-[8px]">LOCAL</span>}
        </div>
      </div>
    </a>
  );
}
