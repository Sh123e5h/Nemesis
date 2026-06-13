import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { FilePlus, Download, Trash2, File, Edit2, Info, X, Folder, FolderPlus, ChevronRight } from 'lucide-react';
import { uploadSmart, getOptimizedUrl } from '../../lib/storage';

interface GroupFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  uploaded_by: string;
  storage_hash?: string;
  profiles?: { full_name: string };
}

interface GroupFolder {
  id: string;
  name: string;
  user_id: string;
  group_id: string;
  parent_id: string | null;
  created_at: string;
}


export default function GroupFiles() {
  const { group, role } = useOutletContext<{ group: any; role: string }>();
  const { user } = useAuthStore();
  const [files, setFiles] = useState<GroupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Root' }]);
  const [folders, setFolders] = useState<GroupFolder[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Edit Modal State
  const [editingFile, setEditingFile] = useState<GroupFile | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Folders fetch
    let folderQuery = supabase.from('folders').select('*').eq('group_id', group.id).order('name');
    if (currentFolderId) folderQuery = folderQuery.eq('parent_id', currentFolderId);
    else folderQuery = folderQuery.is('parent_id', null);
    
    // Files fetch
    let fileQuery = supabase.from('files').select('*, profiles(full_name)').eq('group_id', group.id).order('created_at', { ascending: false });
    if (currentFolderId) fileQuery = fileQuery.eq('folder_id', currentFolderId);
    else fileQuery = fileQuery.is('folder_id', null);

    const [folderRes, fileRes] = await Promise.all([folderQuery, fileQuery]);

    // Only update state when queries genuinely succeed — preserves existing list on transient errors
    if (!folderRes.error && folderRes.data) setFolders(folderRes.data as GroupFolder[]);
    else if (folderRes.error) console.error('[GroupFiles] Folder fetch error:', folderRes.error.message);

    if (!fileRes.error && fileRes.data) setFiles(fileRes.data as GroupFile[]);
    else if (fileRes.error) console.error('[GroupFiles] Files fetch error:', fileRes.error.message);
    
    setLoading(false);
  }, [group.id, currentFolderId]);

  useEffect(() => {
    fetchData();

    const fileChannel = supabase.channel(`group-files-${group.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `group_id=eq.${group.id}` }, () => fetchData())
      .subscribe();
      
    const folderChannel = supabase.channel(`group-folders-${group.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders', filter: `group_id=eq.${group.id}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(fileChannel);
      supabase.removeChannel(folderChannel);
    };
  }, [group.id, fetchData]);


  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !user) return;
    
    await supabase.from('folders').insert({
      name: newFolderName.trim(),
      group_id: group.id,
      user_id: user.id,
      parent_id: currentFolderId
    });
    
    setNewFolderName('');
    setShowFolderModal(false);
    fetchData();
  };

  const navigateToFolder = (folder: any) => {
    setCurrentFolderId(folder.id);
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const target = folderPath[index];
    setCurrentFolderId(target.id);
    setFolderPath(folderPath.slice(0, index + 1));
  };

  const deleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this folder and all its contents?")) return;
    await supabase.from('folders').delete().eq('id', id);
    fetchData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("File size exceeds 50MB limit");
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => (prev < 90 ? prev + 10 : 90));
    }, 400);

    try {
      const { url: publicUrl, hash } = await uploadSmart(file, 'group-files');
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Determine simplified type for UI
      const fileExt = file.name.split('.').pop() || '';
      let simplifiedType = file.type || fileExt;
      if (file.type.startsWith('image/')) simplifiedType = 'image';
      else if (file.type.startsWith('video/')) simplifiedType = 'video';
      else if (file.type.startsWith('audio/')) simplifiedType = 'audio';
      else if (file.type === 'application/pdf') simplifiedType = 'pdf';
      else if (file.name.match(/\.(doc|docx|txt|rtf|csv|xls|xlsx)$/i)) simplifiedType = 'document';

      const { error: dbError } = await supabase.from('files').insert({
        group_id: group.id,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: simplifiedType,
        folder_id: currentFolderId,
        storage_hash: hash
      });

      if (dbError) throw dbError;

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchData();
      }, 500);

    } catch (err: unknown) {
      clearInterval(progressInterval);
      const uploadError = err as Error;
      console.error("Upload Error:", uploadError);
      
      alert("Upload Failed: " + (uploadError.message || "Unknown error"));

      setUploading(false);
      setUploadProgress(0);
    }
  };

  const openEditModal = (f: GroupFile) => {
    setEditingFile(f);
    setEditName(f.file_name);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editingFile) return;
    setSavingEdit(true);
    await supabase.from('files').update({ file_name: editName.trim() }).eq('id', editingFile.id);
    setSavingEdit(false);
    setEditingFile(null);
    fetchData();
  };

  const deleteFile = async (id: string, fileUrl: string, uploadedBy: string) => {
    if (role !== 'admin' && user?.id !== uploadedBy) {
      alert("Only admins or the uploader can delete this file.");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this file?")) return;

    if (fileUrl) {
      const { deleteSmart } = await import('../../lib/storage');
      await deleteSmart(fileUrl);
    }

    await supabase.from('files').delete().eq('id', id);
    fetchData();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <div className="px-4 py-2 md:px-6 md:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <h2 className="text-sm md:text-xl font-bold text-slate-900 uppercase tracking-widest leading-none">Group Files</h2>
          <div className="flex items-center gap-1 text-[10px] md:text-sm font-bold text-slate-400 overflow-x-auto whitespace-nowrap hide-scrollbar max-w-full uppercase tracking-[0.1em]">
            {folderPath.map((fb, idx) => (
              <React.Fragment key={fb.id || 'root'}>
                {idx > 0 && <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                <button 
                  onClick={() => navigateToBreadcrumb(idx)} 
                  className={`hover:text-sky-600 transition truncate max-w-[150px] ${idx === folderPath.length - 1 ? 'text-slate-900 font-bold' : ''}`}
                >
                  {fb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2 shrink-0 w-full sm:w-auto mt-1 sm:mt-0">
          <button 
            onClick={() => setShowFolderModal(true)}
            className="w-10 h-10 sm:w-auto sm:px-4 sm:py-2 flex items-center justify-center bg-white/40 backdrop-blur-md border border-slate-200 text-slate-700 font-bold rounded-xl hover:border-sky-300 transition text-sm"
          >
            <FolderPlus size={18} /> <span className="hidden sm:inline ml-2">Folder</span>
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-10 h-10 sm:w-auto sm:px-4 sm:py-2 flex-1 sm:flex-none flex items-center justify-center bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition disabled:opacity-50 text-sm shadow-sm relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              <FilePlus size={18} /> <span className="hidden sm:inline">{uploading ? `Uploading... ${uploadProgress}%` : 'Upload'}</span>
            </span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading files...</div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="p-12 text-center border-t border-slate-50">
          <Folder className="mx-auto text-slate-200 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-900 mb-2">This folder is empty</h3>
          <p className="text-slate-500">Create a new folder or share documents here.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 custom-scrollbar space-y-2">
          {/* Folders List */}
          {folders.map(f => (
            <div 
              key={f.id} 
              onClick={() => navigateToFolder(f)}
              className="p-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 transition group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-500 flex items-center justify-center shrink-0">
                  <Folder size={20} className="fill-yellow-500/20" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-sm text-slate-900 truncate group-hover:text-yellow-600 transition block">
                    {f.name}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {(role === 'admin' || f.user_id === user?.id) && (
                  <button 
                    onClick={(e) => deleteFolder(e, f.id)}
                    title="Delete Folder"
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {files.map(f => (
            <div key={f.id} className="p-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 transition group flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 overflow-hidden">
                  {f.mime_type?.startsWith('image') ? (
                    <img src={getOptimizedUrl(f.file_url, 40, 40)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : <File size={20} />}
                </div>
                <div className="min-w-0">
                  <Link to={`/organizer/preview/${f.id}?type=group`} className="font-bold text-sm text-slate-900 truncate hover:text-sky-500 transition block" title={f.file_name}>
                    {f.file_name}
                  </Link>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                    {formatSize(f.file_size)} • {new Date(f.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                <a 
                  href={f.file_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  title="Download File"
                  className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition"
                >
                  <Download size={18} />
                </a>
                
                {(role === 'admin' || f.uploaded_by === user?.id) && (
                  <>
                    <button 
                      onClick={() => openEditModal(f)}
                      title="File Details & Rename"
                      className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => deleteFile(f.id, f.file_url, f.uploaded_by)}
                      title="Delete File"
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Rename Modal */}
      {editingFile && createPortal(
        <div className="modal-overlay pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Edit2 size={20} className="text-sky-500" /> File Details
              </h3>
              <button 
                onClick={() => setEditingFile(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Display Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white text-slate-900 font-bold transition text-sm"
                  placeholder="e.g. Project Assets"
                />
              </div>

              
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Info size={14} className="text-sky-500" /> System Metadata
                </h4>
                <div className="space-y-3 text-sm text-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Date Added</span>
                    <span className="font-bold text-slate-900">{new Date(editingFile.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">File Type</span>
                    <span className="font-black text-sky-600 uppercase">{editingFile.mime_type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Exact Size</span>
                    <span className="font-bold text-slate-900">{formatSize(editingFile.file_size || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Uploaded By</span>
                    <span className="font-black text-sky-600 underline decoration-sky-500/30">{editingFile.profiles?.full_name || 'Unknown'}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end items-center">
              <button 
                onClick={() => setEditingFile(null)}
                className="px-5 py-2.5 text-slate-800 font-black text-xs uppercase tracking-widest hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={saveEdit}
                disabled={savingEdit || editName.trim() === editingFile.file_name}
                className="px-5 py-2.5 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 transition disabled:opacity-50 shadow-sm"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Folder Modal */}
      {showFolderModal && createPortal(
        <div className="modal-overlay pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
              <FolderPlus size={20} className="text-sky-500" /> Create New Folder
            </h3>
            <form onSubmit={createFolder}>
              <input 
                type="text" 
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50 text-slate-900 font-medium transition-shadow mb-6"
                placeholder="Folder Name"
                required
              />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowFolderModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 transition shadow-sm border border-transparent">Create</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
