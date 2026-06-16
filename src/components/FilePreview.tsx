import React from 'react';
import { Play, Volume2, Loader } from 'lucide-react';
import { getOptimizedUrl } from '../lib/storage';
import clsx from 'clsx';

interface FilePreviewProps {
  url: string;
  name: string;
  type: string;
  isMe?: boolean;
}

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Extract file size from URL if possible
const getFileSizeFromUrl = async (url: string): Promise<number | null> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : null;
  } catch {
    return null;
  }
};

// Helper function to get color scheme based on file type
const getColorScheme = (attachmentType: string) => {
  switch (attachmentType) {
    case 'pdf':
      return { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-100 text-red-600' };
    case 'video':
      return { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600' };
    case 'audio':
      return { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-100 text-green-600' };
    case 'document':
      return { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600' };
    case 'image':
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600' };
    default:
      return { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'bg-slate-100 text-slate-600' };
  }
};

const FilePreview: React.FC<FilePreviewProps> = ({ url, name, type, isMe = false }) => {
  const [fileSize, setFileSize] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [imageFailed, setImageFailed] = React.useState(false);
  const colors = getColorScheme(type);
  const fileExtension = name.split('.').pop()?.toUpperCase() || 'FILE';

  React.useEffect(() => {
    getFileSizeFromUrl(url).then(size => {
      setFileSize(size);
      setLoading(false);
    });
  }, [url]);

  if (type === 'image' && !imageFailed) {
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
          src={getOptimizedUrl(url, 400)} 
          alt={name}
          loading="lazy"
          className="w-full h-auto max-h-80 object-cover"
          onError={() => setImageFailed(true)}
        />
      </a>
    );
  }

  // For video files
  if (type === 'video') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          "relative group rounded-2xl overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all block max-w-sm bg-purple-50",
          isMe ? "border-sky-200" : "border-purple-300"
        )}
      >
        <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center relative">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2 group-hover:bg-purple-500/30 transition">
              <Play size={32} className="text-purple-600 ml-1" fill="currentColor" />
            </div>
            <div className="text-purple-600 font-semibold text-sm">Video</div>
          </div>
        </div>
        <div className="bg-white px-4 py-3 border-t border-purple-200">
          <div className="font-semibold text-sm text-slate-900 truncate">{name}</div>
          <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
            <span className="uppercase font-bold text-purple-600">Video</span>
            {!loading && fileSize && (
              <>
                <span>•</span>
                <span>{formatFileSize(fileSize)}</span>
              </>
            )}
          </div>
        </div>
      </a>
    );
  }

  // For audio files
  if (type === 'audio') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          "flex items-center gap-3 p-4 rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-green-50 to-emerald-50 max-w-sm hover:from-green-100 hover:to-emerald-100",
          isMe ? "border-sky-200" : "border-green-300"
        )}
      >
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-md">
          <Volume2 size={24} className="text-white animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-900 truncate">{name}</div>
          <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
            <span className="uppercase font-bold text-green-600">Audio</span>
            {!loading && fileSize && (
              <>
                <span>•</span>
                <span>{formatFileSize(fileSize)}</span>
              </>
            )}
          </div>
        </div>
      </a>
    );
  }

  // For all other file types
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all shadow-lg hover:shadow-xl",
        colors.bg,
        isMe ? "border-sky-200" : colors.border,
        "max-w-sm"
      )}
    >
      <div className={clsx(
        "w-16 h-16 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg shadow-md",
        colors.icon
      )}>
        <span className="text-center leading-none">{fileExtension.substring(0, 2)}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-slate-900 truncate">{name}</div>
        <div className="flex items-center gap-2 text-xs text-slate-700 mt-2">
          <span className="uppercase font-bold px-2 py-0.5 rounded-full bg-white/60">{type}</span>
          {!loading && fileSize && (
            <>
              <span className="text-slate-500">•</span>
              <span className="text-slate-600">{formatFileSize(fileSize)}</span>
            </>
          )}
          {loading && (
            <>
              <span className="text-slate-500">•</span>
              <Loader size={12} className="animate-spin" />
            </>
          )}
        </div>
      </div>
    </a>
  );
};

export default FilePreview;
