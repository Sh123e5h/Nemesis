import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { FilePlus, Link as LinkIcon, FolderPlus, Folder } from 'lucide-react';

import { awardPoints } from '../../lib/gamification';
import AlertModal from '../../components/ui/AlertModal';
import QuizGenerator from '../../components/QuizGenerator';

import TopicBreadcrumbs from './components/TopicBreadcrumbs';
import TagFilterBar from './components/TagFilterBar';
import FolderItem, { type FolderData } from './components/FolderItem';
import MaterialItem, { type Material } from './components/MaterialItem';
import FolderModal from './components/modals/FolderModal';
import LinkModal from './components/modals/LinkModal';
import EditMaterialModal from './components/modals/EditMaterialModal';
import ShareModal from './components/modals/ShareModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreadcrumbEntry {
  id: string | null;
  name: string;
}

interface AlertConfig {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  onConfirm?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TopicView() {
  const { subject, topic } = useParams<{ subject: string; topic: string }>();
  const navigate = useNavigate();
  const decodedSubject = decodeURIComponent(subject || '');
  const decodedTopic = decodeURIComponent(topic || '');
  const { user } = useAuthStore();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [materials, setMaterials] = useState<Material[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Folder navigation ─────────────────────────────────────────────────────
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<BreadcrumbEntry[]>([{ id: null, name: 'Root' }]);

  // ── Upload / Add type state ────────────────────────────────────────────────
  const [showAddType, setShowAddType] = useState<'' | 'file' | 'link' | 'note'>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Link form ─────────────────────────────────────────────────────────────
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // ── Folder modal ──────────────────────────────────────────────────────────
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // ── Edit material modal ───────────────────────────────────────────────────
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [fileSize, setFileSize] = useState('Calculating...');
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Share modal ───────────────────────────────────────────────────────────
  const [sharingMaterial, setSharingMaterial] = useState<Material | null>(null);
  const [userGroups, setUserGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  // ── Tag / search filter ───────────────────────────────────────────────────
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const [showQuizGen, setShowQuizGen] = useState(false);

  // ── Alert modal ───────────────────────────────────────────────────────────
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (cfg: Omit<AlertConfig, 'isOpen'>) =>
    setAlertConfig({ ...cfg, isOpen: true });

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let folderQuery = supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .eq('subject', decodedSubject)
      .eq('topic', decodedTopic)
      .order('name');
    folderQuery = currentFolderId
      ? folderQuery.eq('parent_id', currentFolderId)
      : folderQuery.is('parent_id', null);
    const { data: folderData } = await folderQuery;
    if (folderData) setFolders(folderData);

    let materialQuery = supabase
      .from('study_materials')
      .select('*')
      .eq('user_id', user.id)
      .eq('subject', decodedSubject)
      .eq('topic', decodedTopic)
      .eq('is_personal', true)
      .not('title', 'in', '("Initial Directory Placeholder","Initial Topic Placeholder")')
      .order('created_at', { ascending: false });
    materialQuery = currentFolderId
      ? materialQuery.eq('folder_id', currentFolderId)
      : materialQuery.is('folder_id', null);
    const { data: materialData } = await materialQuery;
    if (materialData) setMaterials(materialData);

    setLoading(false);
  }, [user, decodedSubject, decodedTopic, currentFolderId]);

  const fetchUserGroups = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('group_members')
      .select('groups(id, name)')
      .eq('user_id', user.id);
    if (data) {
      const groups = data.map((m: any) => m.groups);
      setUserGroups(groups);
      if (groups.length > 0) setSelectedGroup(groups[0].id);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
    const handleSync = (e: any) => {
      const { table } = e.detail;
      if (table === 'folders' || table === 'study_materials') fetchData();
    };
    window.addEventListener('nemesis_sync', handleSync);
    return () => window.removeEventListener('nemesis_sync', handleSync);
  }, [user?.id, fetchData]);

  useEffect(() => {
    if (!user?.id) return;
    fetchUserGroups();
  }, [user?.id, fetchUserGroups]);

  // ─── Folder actions ───────────────────────────────────────────────────────

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !user) return;
    await supabase.from('folders').insert({
      name: newFolderName.trim(),
      user_id: user.id,
      subject: decodedSubject,
      topic: decodedTopic,
      parent_id: currentFolderId,
    });
    setNewFolderName('');
    setShowFolderModal(false);
    fetchData();
  };

  const navigateToFolder = (folder: FolderData) => {
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
    if (!window.confirm('Are you sure you want to delete this folder and all its contents?')) return;
    try {
      const { error } = await supabase.from('folders').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      showAlert({ title: 'Delete Failed', message: err.message || 'Unknown error', type: 'error' });
    }
  };

  // ─── File upload ──────────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setUploadProgress(10);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev: number) => (prev < 90 ? prev + 15 : 90));
    }, 300);

    try {
      const { uploadSmart } = await import('../../lib/storage');
      const uploadResult = await uploadSmart(file, 'materials-files');

      clearInterval(progressInterval);
      setUploadProgress(100);

      let detectedType = 'file';
      if (file.type.startsWith('image/')) detectedType = 'image';
      else if (file.type.startsWith('video/')) detectedType = 'video';
      else if (file.type.startsWith('audio/')) detectedType = 'audio';
      else if (file.type === 'application/pdf') detectedType = 'pdf';
      else if (file.name.match(/\.(doc|docx|txt|rtf|csv|xls|xlsx)$/i)) detectedType = 'document';

      const { data: insertedRows, error: insertError } = await supabase
        .from('study_materials')
        .insert({
          user_id: user.id,
          subject: decodedSubject,
          topic: decodedTopic,
          title: file.name,
          file_url: uploadResult.url,
          file_type: detectedType,
          folder_id: currentFolderId,
          is_personal: true,
          storage_hash: uploadResult.hash,
        })
        .select()
        .single();

      if (insertError) throw new Error(`Failed to save material: ${insertError.message}`);

      const newMaterial: Material = insertedRows ?? {
        id: `optimistic-${Date.now()}`,
        title: file.name,
        file_url: uploadResult.url,
        file_type: detectedType,
        tags: [],
        created_at: new Date().toISOString(),
      };
      setMaterials((prev) => [newMaterial, ...prev]);

      await awardPoints(user.id, 'upload_material');
    } catch (uploadError: any) {
      clearInterval(progressInterval);
      showAlert({
        title: 'Upload Failed',
        message: uploadError.message || 'An unexpected error occurred during upload. Please try again.',
        type: 'error',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setShowAddType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    }
  };

  // ─── Link actions ─────────────────────────────────────────────────────────

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle || !linkUrl || !user) return;
    setUploading(true);
    await supabase.from('study_materials').insert({
      user_id: user.id,
      subject: decodedSubject,
      topic: decodedTopic,
      title: linkTitle,
      file_url: linkUrl,
      file_type: 'link',
      folder_id: currentFolderId,
      is_personal: true,
    });
    await awardPoints(user.id, 'upload_material');
    setUploading(false);
    setLinkTitle('');
    setLinkUrl('');
    setShowAddType('');
    fetchData();
  };

  // ─── Material actions ─────────────────────────────────────────────────────

  const deleteMaterial = async (id: string, fileType: string, fileUrl: string) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    try {
      if (fileUrl && fileType !== 'link') {
        const { deleteSmart } = await import('../../lib/storage');
        try {
          await deleteSmart(fileUrl);
        } catch (storageErr) {
          console.warn('External storage cleanup failed, proceeding with DB removal:', storageErr);
        }
      }
      const { error } = await supabase.from('study_materials').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      showAlert({ title: 'Deletion Failed', message: err.message || 'Could not remove material from database.', type: 'error' });
    }
  };

  const openEditModal = (mat: Material) => {
    setEditingMaterial(mat);
    setEditTitle(mat.title);
    setEditTags(mat.tags ? mat.tags.join(', ') : '');
    setFileSize('Calculating...');

    if (mat.file_url && mat.file_type !== 'link') {
      supabase
        .from('storage_objects')
        .select('size_bytes')
        .eq('path', mat.file_url)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.size_bytes) {
            const kb = data.size_bytes / 1024;
            setFileSize(kb > 1024 ? (kb / 1024).toFixed(2) + ' MB' : kb.toFixed(1) + ' KB');
          } else {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            fetch(mat.file_url, { method: 'HEAD', signal: controller.signal })
              .then((res) => {
                clearTimeout(timeoutId);
                const bytes = res.headers.get('content-length');
                if (bytes) {
                  const kb = Number(bytes) / 1024;
                  setFileSize(kb > 1024 ? (kb / 1024).toFixed(2) + ' MB' : kb.toFixed(1) + ' KB');
                } else {
                  setFileSize('Private (Secured)');
                }
              })
              .catch(() => {
                clearTimeout(timeoutId);
                setFileSize('Access restricted');
              });
          }
        });
    } else {
      setFileSize('Link / Shortcut');
    }
  };

  const saveEdit = async () => {
    if (!editingMaterial || !editTitle.trim()) return;
    setSavingEdit(true);
    const tagsArray = editTags.split(',').map((t) => t.trim().replace(/^#+/, '')).filter(Boolean);
    await supabase.from('study_materials').update({ title: editTitle.trim(), tags: tagsArray }).eq('id', editingMaterial.id);
    setSavingEdit(false);
    setEditingMaterial(null);
    fetchData();
  };

  // ─── Share action ─────────────────────────────────────────────────────────

  const handleShare = async () => {
    if (!sharingMaterial || !selectedGroup || !user) return;
    setIsSharing(true);
    const { error } = await supabase.from('study_materials').insert({
      title: sharingMaterial.title,
      file_url: sharingMaterial.file_url,
      file_type: sharingMaterial.file_type,
      subject: decodedSubject,
      topic: decodedTopic,
      user_id: user.id,
      group_id: selectedGroup,
      is_personal: false,
    });
    setIsSharing(false);
    if (!error) {
      setSharingMaterial(null);
      showAlert({ title: 'Intel Shared', message: 'Material successfully shared to group!', type: 'success' });
    } else {
      showAlert({ title: 'Share Failed', message: error.message, type: 'error' });
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────

  const filteredMaterials = (selectedTag
    ? materials.filter((m) => m.tags?.includes(selectedTag))
    : materials
  ).filter((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const allTags = Array.from(new Set(materials.flatMap((m) => m.tags || []))) as string[];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-4 pt-3 md:px-8 md:pt-8 md:pb-4 max-w-5xl mx-auto flex flex-col w-full min-h-0 min-h-screen md:min-h-0 md:h-[calc(100vh-80px)] mobile-hardened">

      {/* Breadcrumb header */}
      <TopicBreadcrumbs
        decodedSubject={decodedSubject}
        decodedTopic={decodedTopic}
        folderPath={folderPath}
        onNavigateBreadcrumb={navigateToBreadcrumb}
      />

      {/* Action buttons (New Folder, Upload, Add Link) */}
      <div className="grid grid-cols-3 gap-3 mb-6 md:mb-10 shrink-0">
        <button
          onClick={() => setShowFolderModal(true)}
          className="flex items-center justify-center gap-2 bg-indigo-500/5 dark:bg-slate-800/40 border border-indigo-500/20 dark:border-slate-700 text-slate-900 dark:text-white font-black text-[10px] md:text-xs px-2 py-4 rounded-2xl hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-glass hover:shadow-premium active:scale-95 group"
        >
          <FolderPlus size={18} className="text-indigo-500 transition-transform group-hover:scale-110" strokeWidth={2.5} />
          <span className="hidden sm:inline uppercase tracking-widest">New Folder</span>
        </button>

        <button
          onClick={() => { setShowAddType('file'); fileInputRef.current?.click(); }}
          className="flex items-center justify-center gap-2 bg-emerald-500/5 dark:bg-slate-800/40 border border-emerald-500/20 dark:border-slate-700 text-slate-900 dark:text-white font-black text-[10px] md:text-xs px-2 py-4 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all shadow-glass hover:shadow-premium active:scale-95 relative overflow-hidden group"
        >
          {uploading && (
            <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/20 transition-all duration-300 ease-out z-0" style={{ width: `${uploadProgress}%` }} />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <FilePlus size={18} className="text-emerald-500 transition-transform group-hover:scale-110" strokeWidth={2.5} />
            <span className="hidden sm:inline uppercase tracking-widest">{uploading ? `${uploadProgress}%` : 'Upload Intel'}</span>
          </span>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="*/*" />
        </button>

        <button
          onClick={() => setShowAddType('link')}
          className="flex items-center justify-center gap-2 bg-sky-500/5 dark:bg-slate-800/40 border border-sky-500/20 dark:border-slate-700 text-slate-900 dark:text-white font-black text-[10px] md:text-xs px-2 py-4 rounded-2xl hover:bg-sky-500/10 hover:border-sky-500/40 transition-all shadow-glass hover:shadow-premium active:scale-95 group"
        >
          <LinkIcon size={18} className="text-sky-500 transition-transform group-hover:scale-110" strokeWidth={2.5} />
          <span className="hidden sm:inline uppercase tracking-widest">Save Link</span>
        </button>
      </div>

      {uploading && <div className="text-sky-500 mb-4 animate-pulse shrink-0">Uploading material...</div>}

      {/* Search + tag filter */}
      <TagFilterBar
        allTags={allTags}
        selectedTag={selectedTag}
        searchQuery={searchQuery}
        onSelectTag={setSelectedTag}
        onSearchChange={setSearchQuery}
      />

      {/* Content area */}
      {loading ? (
        <div className="flex-1 space-y-8 overflow-y-auto hide-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="glass-premium bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-5 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-white/10 rounded-xl" />
                  <div className="h-4 w-32 bg-slate-100 dark:bg-white/10 rounded-lg" />
                </div>
                <div className="w-6 h-6 bg-slate-100 dark:bg-white/10 rounded-lg opacity-40" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-premium bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-6 rounded-3xl space-y-4 shadow-sm animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 dark:bg-white/10 rounded-2xl" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-3/4 bg-slate-100 dark:bg-white/10 rounded-lg" />
                    <div className="h-3 w-1/4 bg-slate-100 dark:bg-white/10 rounded-lg opacity-60" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="h-5 w-12 bg-slate-100 dark:bg-white/10 rounded-full" />
                  <div className="h-5 w-16 bg-slate-100 dark:bg-white/10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : materials.length === 0 && folders.length === 0 ? (
        <div className="text-center glass-premium p-10 md:p-12 rounded-3xl flex-1 flex flex-col justify-center items-center shadow-none border-dashed border-2 border-slate-200/50 dark:border-slate-800/50 cyberpunk:border-emerald-500/20">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
            <Folder className="text-slate-200 dark:text-slate-700 cyberpunk:text-emerald-900 opacity-40" size={40} />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 mb-2">Topic is Empty</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium max-w-[240px] mx-auto">
            Upload research notes, files or create folders to organize your research intelligence.
          </p>
        </div>
      ) : (
        <div className="flex-1 pr-1 pb-6 min-h-0 overflow-y-auto custom-scrollbar">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {folders.filter((f) => f.id !== null).map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                onNavigate={navigateToFolder}
                onDelete={deleteFolder}
              />
            ))}
            {filteredMaterials.map((mat) => (
              <MaterialItem
                key={mat.id}
                material={mat}
                onEdit={openEditModal}
                onShare={setSharingMaterial}
                onDelete={deleteMaterial}
              />
            ))}
          </motion.div>
        </div>
      )}

      {/* Modals */}
      {showFolderModal && (
        <FolderModal
          folderName={newFolderName}
          onNameChange={setNewFolderName}
          onSubmit={createFolder}
          onClose={() => setShowFolderModal(false)}
        />
      )}

      {showAddType === 'link' && (
        <LinkModal
          title={linkTitle}
          url={linkUrl}
          onTitleChange={setLinkTitle}
          onUrlChange={setLinkUrl}
          onSubmit={handleAddLink}
          onClose={() => setShowAddType('')}
        />
      )}

      <EditMaterialModal
        material={editingMaterial}
        editTitle={editTitle}
        editTags={editTags}
        fileSize={fileSize}
        savingEdit={savingEdit}
        onTitleChange={setEditTitle}
        onTagsChange={setEditTags}
        onSave={saveEdit}
        onClose={() => setEditingMaterial(null)}
      />

      <ShareModal
        material={sharingMaterial}
        userGroups={userGroups}
        selectedGroup={selectedGroup}
        isSharing={isSharing}
        onSelectGroup={setSelectedGroup}
        onShare={handleShare}
        onClose={() => setSharingMaterial(null)}
      />

      {showQuizGen && (
        <QuizGenerator
          subject={decodedSubject}
          topic={decodedTopic}
          onClose={() => setShowQuizGen(false)}
          onGenerated={(quizId) => navigate(`/organizer/quiz/${quizId}`)}
        />
      )}

      <AlertModal
        {...alertConfig}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
