import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FileText, Link as LinkIcon, ExternalLink,  Image, Video, Mic, File } from 'lucide-react';

const getYoutubeVideoId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function GroupMaterials() {
  const { group } = useOutletContext<{ group: any; role: string }>();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaterials = useCallback(async () => {
    const { data } = await supabase
      .from('study_materials')
      .select('*, profiles(full_name)')
      .eq('group_id', group.id)
      .eq('is_personal', false)
      .neq('file_type', 'folder')
      .order('created_at', { ascending: false });
    
    if (data) setMaterials(data);
    setLoading(false);
  }, [group.id]);

  useEffect(() => {
    fetchMaterials();

    const channel = supabase
      .channel('group-materials-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_materials',
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          fetchMaterials();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id, fetchMaterials]);

  const renderIcon = (type: string) => {
    switch(type) {
      case 'pdf': return <FileText size={20} className="text-red-500" />;
      case 'image': return <Image size={20} className="text-emerald-500" />;
      case 'video': return <Video size={20} className="text-purple-500" />;
      case 'audio': return <Mic size={20} className="text-pink-500" />;
      case 'document': return <FileText size={20} className="text-blue-500" />;
      case 'link': return <LinkIcon size={20} className="text-sky-500" />;
      case 'note': return <File size={20} className="text-amber-500" />;
      default: return <File size={20} className="text-slate-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-2 md:px-6 md:py-4 flex justify-between items-center shrink-0">
        <h2 className="text-sm md:text-xl font-bold text-slate-900 uppercase tracking-widest">Shared Materials</h2>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading materials...</div>
      ) : materials.length === 0 ? (
        <div className="p-12 text-center border-t border-slate-50 text-slate-500">
           <p>No materials shared to this group yet.</p>
           <p className="text-sm mt-2">To share materials, open them in your Personal Organizer and mark them as shared to this group. (Note: This specific flow is conceptual based on PRD limits).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
          {materials.map(mat => {
            const ytId = mat.file_type === 'link' ? getYoutubeVideoId(mat.file_url) : null;
            
            const ItemContent = (
              <>
                <div className={`bg-sky-50/50 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden ${ytId ? 'w-16 h-12 md:w-20 md:h-14 p-0' : 'w-10 h-10 md:w-12 md:h-12 p-2'}`}>
                   {ytId ? (
                     <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="YouTube" className="w-full h-full object-cover" />
                   ) : (
                     renderIcon(mat.file_type)
                   )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none truncate">{mat.subject} • {mat.topic}</p>
                  <h3 className="font-bold text-slate-900 mt-1 text-sm md:text-base line-clamp-2 group-hover:text-sky-500 transition leading-tight">{mat.title}</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Shared by {mat.profiles?.full_name}</p>
                </div>
              </>
            );

            return (
              <div key={mat.id} className="bg-white/80 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-slate-200/60 shadow-none hover:border-sky-300 transition flex items-start justify-between group">
                {mat.file_type === 'link' ? (
                  <a href={mat.file_url} target="_blank" rel="noreferrer" className="flex items-start gap-4 overflow-hidden flex-1 hover:opacity-80 transition block">
                    {ItemContent}
                  </a>
                ) : (
                  <Link to={`/organizer/preview/${mat.id}`} className="flex items-start gap-4 overflow-hidden flex-1 hover:opacity-80 transition block">
                    {ItemContent}
                  </Link>
                )}
                
                {mat.file_url && (
                  <a href={mat.file_url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-white rounded-lg shrink-0 ml-1 transition">
                    <ExternalLink size={14} className="md:w-[18px] md:h-[18px]" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
