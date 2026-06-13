import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import UserAvatar from '../components/UserAvatar';
import { Send, MessageCircle, Paperclip, FileText, Trash2, Search, Plus, X, UserPlus } from 'lucide-react';
import { uploadSmart, getOptimizedUrl } from '../lib/storage';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../components/Skeleton';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';

const extractYoutubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};


interface DMProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  last_seen: string | null;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  created_at: string;
  is_read: boolean;
}

// --- PERFORMANCE: MEMOIZED MESSAGE ITEM ---
const MessageItem = React.memo(({ 
  msg, 
  isMe, 
  showAvatar, 
  username 
}: { 
  msg: DirectMessage; 
  isMe: boolean; 
  showAvatar: boolean; 
  username?: string;
}) => {
  const ytId = msg.content ? extractYoutubeId(msg.content) : null;
  
  return (
    <div className={clsx("flex flex-col max-w-[85%]", isMe ? "self-end items-end" : "self-start items-start")}>
      {!isMe && showAvatar && (
          <span className="text-[10px] text-slate-400 ml-1 mb-1 font-medium">{username}</span>
      )}
      
      {msg.attachment_url && (
        <div className={clsx("mb-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-xs sm:max-w-sm", isMe ? "bg-sky-50" : "bg-white")}>
          {msg.attachment_type === 'image' ? (
            <a href={msg.attachment_url} target="_blank" rel="noreferrer">
              <img 
                src={getOptimizedUrl(msg.attachment_url, 400)} 
                alt={msg.attachment_name} 
                loading="lazy"
                className="w-full h-auto max-h-64 object-cover hover:opacity-90 transition" 
              />
            </a>
          ) : (
            <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 hover:bg-slate-50 transition">
              <div className="w-10 h-10 rounded bg-sky-100 text-sky-500 flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0 pr-4">
                <div className="font-semibold text-sm text-slate-700 truncate">{msg.attachment_name}</div>
                <div className="text-xs text-slate-500 uppercase">{msg.attachment_type}</div>
              </div>
            </a>
          )}
        </div>
      )}

      {msg.content && (
        <div className={clsx(
          "px-4 py-2 rounded-2xl text-sm shadow-sm relative group w-fit",
          isMe ? "bg-sky-500 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
        )}>
          <div className={clsx("prose prose-sm max-w-none break-words", isMe ? "prose-invert" : "")}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
          
          {ytId && (
            <div className="mt-3 rounded-xl overflow-hidden shadow-sm aspect-video w-full max-w-[280px] sm:max-w-sm">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${ytId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}

          <div className={clsx(
            "absolute top-full mt-1 text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap",
            isMe ? "right-1" : "left-1"
          )}>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isMe && <span className="ml-1 text-sky-500">• {msg.is_read ? 'Read' : 'Delivered'}</span>}
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return prev.msg.id === next.msg.id && 
         prev.msg.is_read === next.msg.is_read && 
         prev.showAvatar === next.showAvatar;
});

// ---- Username Search Modal ----
function UserSearchModal({ onSelect, onClose }: { onSelect: (u: DMProfile) => void; onClose: () => void }) {
  const { profile } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DMProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('public_profiles')
          .select('id, username, full_name, avatar_url, last_seen')
          .neq('id', profile?.id)
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(10);
        if (!error && data) setResults(data as DMProfile[]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, profile?.id]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shrink-0">
            <UserPlus size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-sm">New Message</h3>
            <p className="text-xs text-slate-500">Search by username or name</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              ref={inputRef}
              type="text"
              placeholder="@username or full name..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading && (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3 px-2">
                  <SkeletonCircle size={38} />
                  <div className="flex-1 space-y-1.5">
                    <SkeletonLine width="50%" height="11px" />
                    <SkeletonLine width="35%" height="9px" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                <Search size={18} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">No users found for <span className="text-slate-800">"@{query}"</span></p>
              <p className="text-xs text-slate-400 mt-1">Try their exact username</p>
            </div>
          )}
          {!loading && !query && (
            <div className="p-6 text-center text-slate-400 text-sm">
              <MessageCircle size={28} className="mx-auto mb-2 opacity-30" />
              Start typing to search for people
            </div>
          )}
          {results.map(u => (
            <button
              key={u.id}
              onClick={() => { onSelect(u); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition text-left border-b border-slate-50 last:border-0"
            >
              <UserAvatar url={u.avatar_url} name={u.full_name} size="md" className="shadow-sm shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm truncate">{u.full_name}</div>
                <div className="text-xs text-sky-500 truncate">@{u.username}</div>
              </div>
              <div className="text-xs text-slate-400 shrink-0 bg-slate-100 px-2 py-1 rounded-full">Message</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DirectMessages() {
  const { profile } = useAuthStore();
  
  // State
  const [conversations, setConversations] = useState<DMProfile[]>([]);
  const [activeUser, setActiveUser] = useState<DMProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const messagesRef = useRef<DirectMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fetch users from actual conversation history
  const fetchUsers = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingUsers(true);
    try {
      // Get distinct users from direct_messages (both sent and received)
      const { data: msgs, error } = await supabase
        .from('direct_messages')
        .select('sender_id, receiver_id, created_at')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Get unique other-user IDs, preserving most-recent-first order
      const seenIds = new Set<string>();
      const otherUserIds: string[] = [];
      for (const m of (msgs || [])) {
        const otherId = m.sender_id === profile.id ? m.receiver_id : m.sender_id;
        if (!seenIds.has(otherId)) {
          seenIds.add(otherId);
          otherUserIds.push(otherId);
        }
      }

      if (otherUserIds.length === 0) {
        setConversations([]);
        return;
      }

      // Fetch profiles for those users
      const { data: profiles, error: profErr } = await supabase
        .from('public_profiles')
        .select('id, username, full_name, avatar_url, last_seen')
        .in('id', otherUserIds);

      if (profErr) throw profErr;

      // Sort by the order of otherUserIds (most recent first)
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const sorted = otherUserIds.map(id => profileMap.get(id)).filter(Boolean) as DMProfile[];
      setConversations(sorted);
    } catch (err) {
      console.error('[DirectMessages] Failed to fetch conversations:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [profile]);



  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const MESSAGES_PER_PAGE = 50;

  const fetchMessages = useCallback(async (otherUserId: string, reset = false) => {
    if (!profile) return;
    if (reset) {
      setMessages([]);
      setHasMoreMessages(true);
      setLoadingMessages(true);
    }
    
    setLoadingMoreMessages(true);
    try {
      let query = supabase
        .from('direct_messages')
        .select('id, sender_id, receiver_id, content, attachment_url, attachment_name, attachment_type, created_at, is_read')
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${profile.id})`)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (!reset && messagesRef.current.length > 0) {
        query = query.lt('created_at', messagesRef.current[0].created_at);
      }

      const { data: msgs, error } = await query;
      if (error) throw error;
        
      if (msgs) {
        const newMsgs = [...msgs].reverse();
        setMessages(prev => reset ? newMsgs : [...newMsgs, ...prev]);
        setHasMoreMessages(msgs.length === MESSAGES_PER_PAGE);
        
        if (reset) {
          const unreadIds = msgs.filter(m => m.receiver_id === profile.id && !m.is_read).map(m => m.id);
          if (unreadIds.length > 0) {
            await supabase.from('direct_messages').update({ is_read: true }).in('id', unreadIds);
          }
        }
      }
    } catch (err) {
      console.error('[DirectMessages] Failed to fetch messages:', err);
    } finally {
      setLoadingMoreMessages(false);
      setLoadingMessages(false);
    }
  }, [profile]); // Now stable

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await supabase.from('direct_messages').update({ is_read: true }).eq('id', messageId);
    } catch (err) {
      console.error('[DirectMessages] Failed to mark as read:', err);
    }
  }, []);


  useEffect(() => {
    fetchUsers();
  }, [profile?.id, fetchUsers]); // Include fetchUsers dependency

  useEffect(() => {
    if (activeUser && profile) {
      fetchMessages(activeUser.id, true);
    }
  }, [activeUser, profile, fetchMessages]);

  useEffect(() => {
    if (!profile) return;

    const handleSync = (e: any) => {
      const { table, payload } = e.detail;
      
      if (table === 'direct_messages' && payload.new) {
        const msg = payload.new as DirectMessage;
        const isRelated = msg.receiver_id === profile.id || msg.sender_id === profile.id;
        
        if (isRelated) {
          // 1. Always refresh sidebar for related messages to update order/unread
          fetchUsers();

          // 2. If it's for the current active chat, update message list
          if (activeUser && (msg.sender_id === activeUser.id || msg.receiver_id === activeUser.id)) {
            setMessages(prev => {
              const exists = prev.some(m => m.id === msg.id);
              if (exists) return prev;
              
              const newMsgs = [...prev, msg].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              return newMsgs;
            });

            if (msg.receiver_id === profile.id && !msg.is_read) {
              markAsRead(msg.id);
            }
          }
        }
      }
    };

    window.addEventListener('nemesis_sync', handleSync);
    return () => window.removeEventListener('nemesis_sync', handleSync);
  }, [profile, activeUser, fetchUsers, markAsRead]);


  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);


  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser || !profile) return;

    const messageContent = newMessage;
    setNewMessage(''); // optimistic clear
    
    // Optimistic UI Append
    const tempId = 'temp-' + Date.now();
    const optimisticMessage: DirectMessage = {
      id: tempId,
      sender_id: profile.id,
      receiver_id: activeUser.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      is_read: false
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    const { data: insertedMsg, error } = await supabase.from('direct_messages').insert([{
      sender_id: profile.id,
      receiver_id: activeUser.id,
      content: messageContent
    }]).select().single();

    if (error) {
       console.error("Error sending message", error);
       setNewMessage(messageContent); // restore on error
       setMessages(prev => prev.filter(m => m.id !== tempId)); // remove optimistic
    } else if (insertedMsg) {
       // Replace temp with real
       setMessages(prev => prev.map(m => m.id === tempId ? insertedMsg as DirectMessage : m));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !activeUser) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("File size exceeds 20MB limit");
      return;
    }

    setUploading(true);
    const { url: publicUrl, hash } = await uploadSmart(file, 'chat_attachments');

    const fileExt = file.name.split('.').pop() || '';
    let simplifiedType = file.type || fileExt;
    if (file.type.startsWith('image/')) simplifiedType = 'image';
    else if (file.type.startsWith('video/')) simplifiedType = 'video';
    else if (file.type.startsWith('audio/')) simplifiedType = 'audio';
    else if (file.type === 'application/pdf') simplifiedType = 'pdf';
    else simplifiedType = 'document';

    // Optimistic UI Append for file
    const tempId = 'temp-' + Date.now();
    const optimisticMessage: DirectMessage = {
      id: tempId,
      sender_id: profile.id,
      receiver_id: activeUser.id,
      content: '', 
      attachment_url: publicUrl,
      attachment_name: file.name,
      attachment_type: simplifiedType,
      created_at: new Date().toISOString(),
      is_read: false
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    // Send the message with attachment
    const { data: insertedMsg, error: dbError } = await supabase.from('direct_messages').insert([{
      sender_id: profile.id,
      receiver_id: activeUser.id,
      content: '', 
      attachment_url: publicUrl,
      attachment_name: file.name,
      attachment_type: simplifiedType,
      storage_hash: hash
    }]).select().single();

    if (dbError) {
      console.error("Error inserting file msg", dbError);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else if (insertedMsg) {
      setMessages(prev => prev.map(m => m.id === tempId ? insertedMsg as DirectMessage : m));
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteChat = async () => {
    if (!profile || !activeUser) return;
    if (!confirm(`Are you sure you want to permanently delete your chat history with ${activeUser.full_name}?`)) return;

    const { error } = await supabase
      .from('direct_messages')
      .delete()
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${activeUser.id}),and(sender_id.eq.${activeUser.id},receiver_id.eq.${profile.id})`);

    if (error) {
      alert("Failed to delete chat: " + error.message);
    } else {
      setMessages([]);
    }
  };

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    return diff < 60000; // 60 seconds ping threshold
  };

  const filteredUsers = conversations;

  return (
    <div className="max-w-6xl mx-auto pt-2 px-4 md:px-4 md:py-8 flex-1 md:h-[calc(100vh-80px)] md:max-h-[calc(100vh-80px)] md:overflow-hidden flex flex-col md:flex-row gap-2 md:gap-6 min-w-0 w-full transition-all duration-500 mobile-hardened">
      
      {showNewChat && (
        <UserSearchModal
          onSelect={(u) => {
            // Add to top of conversations if not already present
            setConversations(prev => {
              if (prev.some(c => c.id === u.id)) return prev;
              return [u, ...prev];
            });
            setActiveUser(u);
          }}
          onClose={() => setShowNewChat(false)}
        />
      )}

      {/* Sidebar: Conversations — hidden on mobile when chat is active */}
      <div className={clsx(
        "bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200 flex flex-col overflow-hidden",
        activeUser ? "hidden md:flex md:w-64 lg:w-80 md:shrink-0" : "flex-1 md:w-64 lg:w-80 md:shrink-0"
      )}>
        <div className="p-4 border-b border-slate-200/60 bg-white/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <MessageCircle className="text-sky-500" size={18} />
              Messages
            </h2>
            <button
              onClick={() => setShowNewChat(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-sky-500/20 active:scale-95"
            >
              <Plus size={14} />
              New
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loadingUsers ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <SkeletonCircle size={40} />
                  <div className="flex-1 space-y-2">
                    <SkeletonLine width="60%" height="12px" />
                    <SkeletonLine width="40%" height="10px" className="opacity-60" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <MessageCircle size={22} className="text-slate-400" />
              </div>
              <p className="font-semibold text-slate-600 text-sm">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Start a chat by searching for a user</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <Plus size={14} />
                Find Someone
              </button>
            </div>
          ) : (
            filteredUsers.map(u => (
              <button
                key={u.id}
                onClick={() => setActiveUser(u)}
                className={clsx(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition text-left",
                  activeUser?.id === u.id ? "bg-sky-50 border border-sky-100" : "hover:bg-slate-50 border border-transparent"
                )}
              >
                <div className="relative shrink-0">
                  <UserAvatar 
                    url={u.avatar_url} 
                    name={u.full_name} 
                    size="md" 
                    className="shadow-sm" 
                  />
                  {isOnline(u.last_seen) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate text-sm">{u.full_name}</div>
                  <div className="text-xs text-slate-500 truncate">@{u.username}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area — full width on mobile when chat is active */}
      <div className={clsx(
        "flex-1 bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200 flex flex-col overflow-hidden relative",
        activeUser ? "flex" : "hidden md:flex"
      )}>
        {activeUser ? (
          <>
            {/* Header */}
            <div className="p-3 md:p-4 border-b border-slate-200/60 bg-white/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Back button — mobile only */}
                <button 
                  onClick={() => setActiveUser(null)} 
                  className="md:hidden p-1.5 text-slate-500 hover:text-sky-500 hover:bg-slate-100 rounded-full transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div className="relative">
                    <UserAvatar 
                      url={activeUser.avatar_url} 
                      name={activeUser.full_name} 
                      size="lg" 
                    />
                  {isOnline(activeUser.last_seen) && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm md:text-base">{activeUser.full_name}</h3>
                  <div className="text-[10px] md:text-xs font-medium text-slate-500">
                    {isOnline(activeUser.last_seen) ? <span className="text-emerald-500">Online now</span> : 'Offline'}
                  </div>
                </div>
              </div>
              <button
                 onClick={handleDeleteChat}
                 title="Delete Conversation"
                 className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-100 flex items-center justify-center shadow-sm"
              >
                 <Trash2 size={18} />
              </button>
            </div>

            {/* Chat Messages */}
            <div ref={scrollContainerRef} className="flex-1 bg-slate-50/50 message-list scroll-container overflow-y-auto custom-scrollbar">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center flex-col p-6 space-y-6 w-full max-w-md mx-auto">
                  <div className="w-full space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={clsx("flex flex-col max-w-[85%]", i % 2 === 0 ? "self-end items-end" : "self-start items-start")}>
                        <Skeleton variant="rectangle" className={clsx("h-16 w-48 rounded-2xl shadow-sm", i % 2 === 0 ? "bg-sky-500/10 rounded-tr-sm" : "bg-white/50 border border-slate-100 rounded-tl-sm")} />
                        <SkeletonLine width="60px" height="8px" className="mt-2 opacity-30" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center flex-col text-slate-400">
                  <MessageCircle size={48} className="mb-4 opacity-20" />
                  <p className="font-medium text-slate-500">Send a message to start the conversation.</p>
                </div>
              ) : (
                <div className="flex flex-col space-y-2 p-3 md:p-6 pb-4">
                  {hasMoreMessages && (
                    <button 
                      onClick={() => activeUser && fetchMessages(activeUser.id)}
                      disabled={loadingMoreMessages}
                      className="self-center py-2 px-4 text-xs font-bold text-slate-400 hover:text-sky-500 transition uppercase tracking-widest flex items-center gap-2"
                    >
                      {loadingMoreMessages ? (
                        <div className="flex items-center gap-2">
                          <Skeleton variant="circle" className="w-3 h-3 bg-sky-500/20" />
                          <span className="animate-pulse">Loading...</span>
                        </div>
                      ) : 'Load Older Messages'}
                    </button>
                  )}
                  {messages.map((msg, index) => {
                    const isMe = msg.sender_id === profile?.id;
                    const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_id !== msg.sender_id);
                    
                    return (
                      <MessageItem 
                        key={msg.id}
                        msg={msg}
                        isMe={isMe}
                        showAvatar={showAvatar}
                        username={activeUser?.username}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Input Box */}
            <div className="p-2 md:p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-4 bg-white/80 backdrop-blur-md border-t border-slate-200/60 shrink-0 relative">
              {uploading && (
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 overflow-hidden">
                  <div className="h-full bg-sky-500 w-1/3 animate-pulse rounded-r-max"></div>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex items-center gap-1.5 md:gap-2">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-2 md:p-2.5 text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 rounded-full transition disabled:opacity-50"
                  title="Upload Attachment"
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
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 min-w-0 bg-white/90 border border-slate-200/80 rounded-full px-3 md:px-4 py-2 md:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 md:p-2.5 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                >
                  <Send size={18} className="translate-x-[1px] translate-y-[-1px]" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400/80">
            <div className="w-16 h-16 rounded-full bg-white/50 border border-slate-200/50 shadow-inner flex items-center justify-center mb-4">
               <MessageCircle size={28} className="opacity-50" />
            </div>
            <p className="font-medium text-slate-600">Your Messages</p>
            <p className="text-sm mt-1">Select a friend from the left to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
