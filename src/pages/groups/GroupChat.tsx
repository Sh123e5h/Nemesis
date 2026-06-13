import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { Send, Paperclip, CheckCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadSmart } from '../../lib/storage';
import { db } from '../../lib/db';
import CachedAttachment from '../../components/CachedAttachment';
import { Network } from '@capacitor/network';
import UserAvatar from '../../components/UserAvatar';
import { Skeleton } from '../../components/Skeleton';

const extractYoutubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function GroupChat() {
  const { group } = useOutletContext<{ group: any }>();
  const { user, profile } = useAuthStore();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreLocal, setHasMoreLocal] = useState(true);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const markAsRead = useCallback(async (msgIds: string[]) => {
    if (!user || msgIds.length === 0 || !navigator.onLine) return;
    const records = msgIds.map(id => ({ message_id: id, user_id: user.id }));
    const { error } = await supabase.from('message_reads').upsert(records, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
    if (error) console.error("Error marking read:", error);
  }, [user]);

  const fetchSingleMessage = useCallback(async (msgId: string) => {
    const { data } = await supabase
      .from('messages')
      .select(`
        *, 
        profiles!messages_sender_id_fkey(full_name, username, avatar_url),
        message_reads(
          user_id,
          profiles!message_reads_user_id_fkey(full_name, username)
        )
      `)
      .eq('id', msgId)
      .single();
    
    if (data) {
      await db.messages.put({
        id: data.id,
        group_id: data.group_id,
        sender_id: data.sender_id,
        content: data.content,
        created_at: data.created_at,
        storage_hash: data.storage_hash,
        is_pending: false,
        profiles: data.profiles,
        message_reads: data.message_reads
      });

      setMessages(prev => {
        const existingInfo = prev.find(m => m.id === msgId);
        if (existingInfo) return prev.map(m => m.id === msgId ? data : m);
        return [...prev, data];
      });
      
      if (data.sender_id !== user?.id && !data.message_reads?.some((r: any) => r.user_id === user?.id)) {
        markAsRead([data.id]);
      }
    }
  }, [user, markAsRead]);

  const syncPendingMessages = useCallback(async () => {
    if (!navigator.onLine || !user) return;
    const pending = await db.messages.where('is_pending').equals(1).toArray();
    for (const msg of pending) {
      const { data, error } = await supabase.from('messages').insert({
        group_id: msg.group_id,
        sender_id: msg.sender_id,
        content: msg.content,
        attachment_url: (msg as any).attachment_url,
        attachment_name: (msg as any).attachment_name,
        attachment_type: (msg as any).attachment_type,
        storage_hash: msg.storage_hash
      }).select('id').single();

      if (!error && data) {
        await db.messages.update(msg.id, { is_pending: false, id: data.id });
        fetchSingleMessage(data.id);
      }
    }
  }, [user, fetchSingleMessage]);

  const fetchMessages = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    const limit = 50;
    const offset = isLoadMore ? messages.length : 0;
    
    const cached = await db.messages
      .where('group_id')
      .equals(group.id)
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
    
    const sortedCached = cached.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    if (isLoadMore) {
      setMessages(prev => [...sortedCached, ...prev]);
      setHasMoreLocal(cached.length === limit);
      setLoadingMore(false);
      return;
    }

    if (sortedCached.length > 0) {
      setMessages(sortedCached);
      setLoading(false);
      setHasMoreLocal(cached.length === limit);
    }

    if (!navigator.onLine) {
        setLoading(false);
        return;
    }

    const { data } = await supabase
      .from('messages')
      .select(`
        *, 
        profiles!messages_sender_id_fkey(full_name, username, avatar_url),
        message_reads(
          user_id,
          profiles!message_reads_user_id_fkey(full_name, username)
        )
      `)
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (data) {
      setMessages(data);
      await db.messages.bulkPut(data.map(m => ({
        id: m.id,
        group_id: m.group_id,
        sender_id: m.sender_id,
        content: m.content,
        created_at: m.created_at,
        storage_hash: m.storage_hash,
        is_pending: false,
        profiles: m.profiles,
        message_reads: m.message_reads
      })));

      const unreadIds = data
        .filter(m => m.sender_id !== user?.id && !m.message_reads?.some((r: any) => r.user_id === user?.id))
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
    setLoading(false);
  }, [group.id, messages.length, user, markAsRead]);

  useEffect(() => {
    fetchMessages();
    
    // Sync pending messages when network is restored
    const networkListener = Network.addListener('networkStatusChange', (status) => {
      if (status.connected) {
        syncPendingMessages();
      }
    });

    const handleSync = (e: any) => {
      const { table, payload } = e.detail;
      if (table === 'messages' && payload?.new?.group_id === group.id) {
        fetchSingleMessage(payload.new.id);
      }
      if (table === 'message_reads' && payload?.new?.message_id) {
        // We could optimize further by checking if message_id belongs to current group
        fetchSingleMessage(payload.new.message_id);
      }
    };

    window.addEventListener('nemesis_sync', handleSync);

    return () => {
      networkListener.then(h => h.remove());
      window.removeEventListener('nemesis_sync', handleSync);
    };
  }, [group.id, fetchMessages, syncPendingMessages, fetchSingleMessage]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !profile) return;
    
    const msg = text;
    setText('');
    
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      group_id: group.id,
      sender_id: user.id,
      content: msg.substring(0, 1000),
      created_at: new Date().toISOString(),
      profiles: {
        full_name: profile.full_name,
        username: profile.username
      }
    };

    setMessages(prev => [...prev, optimisticMsg]);
    
    await db.messages.add({
      ...optimisticMsg,
      is_pending: true
    } as any);

    if (!navigator.onLine) return;

    const { data: newMsg, error } = await supabase.from('messages').insert({
      group_id: group.id,
      sender_id: user.id,
      content: msg.substring(0, 1000)
    }).select('*, profiles(full_name, username)').single();

    if (error) {
      console.error("Message send error:", error);
      return;
    }

    if (newMsg) {
      await db.messages.delete(tempId);
      await db.messages.put({ ...newMsg, is_pending: false });
      setMessages(prev => prev.map(m => m.id === tempId ? newMsg : m));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("Chat file max limits to 20MB.");
      return;
    }

    if (!navigator.onLine) {
        alert("Wait until you're online to upload files.");
        return;
    }
    setUploading(true);
    try {
      const { url: publicUrl, hash } = await uploadSmart(file, 'group-files');

      const fileExt = file.name.split('.').pop() || '';
      let simplifiedType = file.type || fileExt;
      if (file.type.startsWith('image/')) simplifiedType = 'image';
      else if (file.type.startsWith('video/')) simplifiedType = 'video';
      else if (file.type.startsWith('audio/')) simplifiedType = 'audio';
      else if (file.type === 'application/pdf') simplifiedType = 'pdf';
      else if (file.name.match(/\.(doc|docx|txt|rtf|csv|xls|xlsx)$/i)) simplifiedType = 'document';

      const { error: syncError } = await supabase.from('files').insert({
        group_id: group.id,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: simplifiedType,
        storage_hash: hash
      });

      if (syncError) {
        console.error("Failed to sync file to Group Files:", syncError);
      }

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        group_id: group.id,
        sender_id: user.id,
        content: '',
        attachment_url: publicUrl,
        attachment_name: file.name,
        attachment_type: simplifiedType,
        created_at: new Date().toISOString(),
        profiles: {
          full_name: profile.full_name,
          username: profile.username
        }
      };
      
      setMessages(prev => [...prev, optimisticMsg]);

      const { data: newFileMessage, error: insertError } = await supabase.from('messages').insert({
        group_id: group.id,
        sender_id: user.id,
        content: '',
        attachment_url: publicUrl,
        attachment_name: file.name,
        attachment_type: simplifiedType,
        storage_hash: hash
      }).select('*, profiles(full_name, username)').single();

      if (insertError) {
        console.error("File message send error:", insertError);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setUploading(false);
        return;
      }

      if (newFileMessage) {
        setMessages(prev => prev.map(m => m.id === tempId ? newFileMessage : m));
      }

      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (uploadError: any) {
      console.error("Group Chat Upload Error:", uploadError);
      
      alert("Upload Failed: " + (uploadError.message || "Unknown error"));
        
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderedMessages = React.useMemo(() => {
    return messages.map((msg, i) => {
      const isSystem = msg.content?.startsWith('[System]');
      const isMe = msg.sender_id === user?.id;
      const showName = !isSystem && (i === 0 || messages[i-1]?.sender_id !== msg.sender_id);

      if (isSystem) {
        return (
          <div key={msg.id} className="flex justify-center my-2">
            <div className="bg-slate-200/50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950/50 text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border border-slate-200 dark:border-slate-700/50 cyberpunk:border-emerald-500/20">
              {msg.profiles?.full_name} {msg.content.replace('[System] ', '').toLowerCase()}
            </div>
          </div>
        );
      }

      return (
        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
          {showName && !isMe && (
            <span className="text-xs text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500/80 mb-1 ml-10">
              {msg.profiles?.full_name}
            </span>
          )}
          <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
            {!isMe && (
              <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold border border-slate-200 dark:border-slate-700/60 cyberpunk:border-emerald-500/30">
                <UserAvatar 
                  url={msg.profiles?.avatar_url} 
                  name={msg.profiles?.full_name} 
                  size="md" 
                />
              </div>
            )}
            <div className="flex flex-col gap-1 w-full">
              {(msg.attachment_url || msg.file_url) && (
                <CachedAttachment 
                  url={msg.attachment_url || msg.file_url} 
                  hash={msg.storage_hash}
                  name={msg.attachment_name || msg.file_name}
                  type={msg.attachment_type || msg.mime_type}
                  isMe={isMe}
                />
              )}

              {msg.content && (
                <div className={`rounded-2xl px-4 py-2 w-full ${isMe ? 'bg-sky-500 text-white rounded-tr-sm shadow-md shadow-sky-500/10' : 'bg-white/80 dark:bg-slate-800/80 cyberpunk:bg-emerald-950/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 cyberpunk:border-emerald-500/30 text-slate-800 dark:text-slate-100 cyberpunk:text-emerald-300 rounded-tl-sm'}`}>
                  <div className={`prose prose-sm max-w-none break-words ${isMe ? 'prose-invert' : 'dark:prose-invert cyberpunk:prose-emerald'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  
                  {extractYoutubeId(msg.content) && (
                    <div className="mt-3 rounded-xl overflow-hidden shadow-sm aspect-video w-full max-w-[280px] sm:max-w-sm">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${extractYoutubeId(msg.content)}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className={`flex items-center gap-1 text-[10px] text-slate-400 mt-1 ${isMe ? 'self-end mr-1' : 'self-start ml-10'}`}>
            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isMe && msg.message_reads && msg.message_reads.length > 0 && (
              <span className="text-sky-500 flex items-center gap-1 ml-1" title={`Seen by ${msg.message_reads.map((r: any) => r.profiles?.full_name).join(', ')}`}>
                <CheckCheck size={14} />
              </span>
            )}
          </div>
        </div>
      );
    });
  }, [messages, user?.id]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-1.5 md:px-6 md:py-4 border-b border-slate-200/60 dark:border-slate-800/60 cyberpunk:border-emerald-500/20 shrink-0">
        <h2 className="text-[9px] md:text-xl font-bold text-slate-400/80 dark:text-slate-500 uppercase tracking-widest leading-none">Chat</h2>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 md:p-6 bg-slate-50/30 dark:bg-transparent custom-scrollbar">
        {hasMoreLocal && (
          <button 
            onClick={() => fetchMessages(true)} 
            disabled={loadingMore}
            className="w-full text-center text-xs text-sky-500 dark:text-sky-400 cyberpunk:text-emerald-400 py-2 hover:underline disabled:opacity-50"
          >
            {loadingMore ? "Loading more history..." : "Load older messages"}
          </button>
        )}
        {loading ? (
          <div className="flex flex-col gap-6 w-full opacity-60 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`flex items-end gap-3 ${i % 3 === 0 ? 'flex-row-reverse' : 'flex-row'}`}>
                <Skeleton variant="circle" className="w-8 h-8 rounded-full shrink-0 bg-slate-200 dark:bg-slate-700 cyberpunk:bg-emerald-900/40" />
                <div className={`flex flex-col gap-2 w-full max-w-[75%] ${i % 3 === 0 ? 'items-end' : ''}`}>
                  <Skeleton 
                    variant="rectangle" 
                    className={`h-14 w-full rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/40 cyberpunk:bg-emerald-950/40 cyberpunk:border-emerald-500/20 ${i % 3 === 0 ? 'rounded-tr-sm' : 'rounded-tl-sm'}`} 
                  />
                  <Skeleton variant="text" className="w-16 h-2 opacity-40 ml-1 bg-slate-200 dark:bg-slate-700 cyberpunk:bg-emerald-900/40" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-400 mt-8">No messages yet. Say hello!</div>
        ) : (
          <div className="flex flex-col gap-3">
              {renderedMessages}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] bg-white/80 dark:bg-slate-900/80 cyberpunk:bg-emerald-950/90 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60 cyberpunk:border-emerald-500/20 shrink-0 md:mb-0">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-3 text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-full transition disabled:opacity-50"
          >
            <Paperclip size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <input 
            type="text"
            className="flex-1 bg-slate-100 dark:bg-slate-800 cyberpunk:bg-emerald-950/50 text-slate-900 dark:text-white cyberpunk:text-emerald-300 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent dark:placeholder:text-slate-600 cyberpunk:placeholder:text-emerald-900"
            placeholder={uploading ? "Uploading file..." : "Type a message..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={uploading}
            maxLength={1000}
          />
          <button 
            type="submit"
            disabled={!text.trim() || uploading}
            className="p-3 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition disabled:opacity-50"
          >
            <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
