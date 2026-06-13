import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { UserMinus, ShieldAlert, ShieldCheck, LogOut, Copy, CheckCircle2 } from 'lucide-react';
import UserAvatar from '../../components/UserAvatar';
import Skeleton from '../../components/ui/Skeleton';

interface GroupMember {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}

const MemberSkeleton = () => (
  <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-slate-50/30 space-y-2">
    {[1, 2, 3].map(i => (
      <div key={i} className="p-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" width={48} height={48} />
          <div className="space-y-2">
            <Skeleton variant="rect" width={120} height={14} />
            <Skeleton variant="rect" width={80} height={10} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function GroupMembers() {
  const { group, role: myRole } = useOutletContext<{ group: any; role: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const copyInviteCode = () => {
    if (!group?.invite_code) return;
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        role,
        joined_at,
        profiles:public_profiles!inner ( id, full_name, username, avatar_url )
      `)
      .eq('group_id', group.id)
      .order('role', { ascending: true }) // admin comes before member typically
      .order('joined_at', { ascending: true });

    if (!error && data) {
      // flatten
      const formatted = data.map((d: any) => ({
        role: d.role,
        joined_at: d.joined_at,
        ...(d.profiles as any)
      })) as GroupMember[];
      setMembers(formatted);
    }
    setLoading(false);
  }, [group.id]);

  useEffect(() => {
    fetchMembers();
    
    const channel = supabase.channel(`group_members_${group.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${group.id}` }, () => {
        fetchMembers();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id, fetchMembers]);

  const removeMember = async (targetUserId: string, targetName: string) => {
    if (!confirm(`Are you sure you want to remove ${targetName} from the group?`)) return;

    if (user) {
      await supabase.from('messages').insert({
        group_id: group.id,
        sender_id: user.id,
        content: `[System] Removed member: ${targetName}`
      });
      // Ping the removed member globally
      await supabase.from('user_notifications').insert({
        user_id: targetUserId,
        title: `Removed from ${group.name}`,
        content: `An admin has removed you from the group "${group.name}".`
      });
    }

    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', targetUserId);

    fetchMembers();
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    
    setInviteLoading(true);
    const searchUsername = inviteUsername.trim().toLowerCase();
    
    // Find user in public_profiles (secure view)
    const { data: targetProfile, error: searchError } = await supabase
      .from('public_profiles')
      .select('id, full_name')
      .eq('username', searchUsername)
      .maybeSingle();
      
    if (searchError || !targetProfile) {
      alert("User not found with that username.");
      setInviteLoading(false);
      return;
    }
    
    // Check if already member
    const isMember = members.some(m => m.id === targetProfile.id);
    if (isMember) {
      alert("User is already a member of this group.");
      setInviteLoading(false);
      return;
    }
    
    // Send invitation instead of direct insertion
    if (user) {
      const { error: inviteError } = await supabase.from('user_notifications').insert({
        user_id: targetProfile.id,
        title: `Group Invitation: ${group.name}`,
        content: `You have been invited to join the private group "${group.name}".`,
        type: 'group_invite',
        action_data: {
          group_id: group.id,
          invite_code: group.invite_code
        }
      });
      
      if (inviteError) {
        alert("Failed to send invitation: " + inviteError.message);
        setInviteLoading(false);
        return;
      }

      await supabase.from('messages').insert({
        group_id: group.id,
        sender_id: user.id,
        content: `[System] Invited ${targetProfile.full_name} to the group`
      });
      
      alert(`Invitation sent successfully to @${searchUsername}!`);
    }
    
    setInviteUsername('');
    setInviteLoading(false);
  };

  const changeRole = async (targetUserId: string, newRole: string) => {
    if (!confirm(`Change role to ${newRole}?`)) return;
    
    await supabase
      .from('group_members')
      .update({ role: newRole })
      .eq('group_id', group.id)
      .eq('user_id', targetUserId);
    
    if (user) {
      const targetUser = members.find(m => m.id === targetUserId);
      await supabase.from('messages').insert({
        group_id: group.id,
        sender_id: user.id,
        content: `[System] Changed the role of ${targetUser?.full_name} to ${newRole}`
      });
    }

    fetchMembers();
  };

  const leaveGroup = async () => {
    if (myRole === 'admin') {
      alert("As an admin, you cannot leave. Transfer admin rights first or delete the group via settings.");
      return;
    }
    
    if (!confirm("Are you sure you want to leave this group?")) return;

    if (user) {
      await supabase.from('messages').insert({
        group_id: group.id,
        sender_id: user.id,
        content: `[System] Left the group`
      });
    }

    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', user?.id);

    navigate('/groups');
  };

  if (loading) return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-2 md:px-6 md:py-4 border-b border-slate-200/60 flex justify-between items-center shrink-0">
        <Skeleton variant="rect" width={150} height={20} />
      </div>
      <MemberSkeleton />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <div className="px-4 py-2 md:px-6 md:py-4 border-b border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h2 className="text-sm md:text-xl font-bold text-slate-900 uppercase tracking-widest leading-none mb-1">Members ({members.length})</h2>
          {!group.is_private ? (
            <div className="flex items-center gap-2 text-[10px] md:text-sm text-slate-400 font-bold uppercase tracking-widest">
              Join Code: 
              <button 
                onClick={copyInviteCode}
                title="Copy to clipboard"
                className="group flex items-center gap-1.5 font-mono bg-white/40 border border-slate-200 text-sky-600 px-2 py-0.5 rounded transition cursor-pointer"
              >
                {group.invite_code}
                {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />}
              </button>
            </div>
          ) : (
            <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded inline-flex items-center gap-1 uppercase tracking-widest">
              <ShieldCheck size={12} /> Private Group
            </div>
          )}
        </div>
        
        {myRole !== 'admin' && (
          <button 
            onClick={leaveGroup}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition text-xs font-bold uppercase tracking-widest"
          >
            <LogOut size={16} /> Leave Group
          </button>
        )}
      </div>

      {group.is_private && myRole === 'admin' && (
        <form onSubmit={handleInviteMember} className="p-4 md:p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-end gap-4 shadow-inner">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              Add Member Manually
            </label>
            <input 
              type="text"
              placeholder="Enter precise @username"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 bg-white shadow-sm"
            />
          </div>
          <button 
            type="submit"
            disabled={inviteLoading || !inviteUsername.trim()}
            className="w-full sm:w-auto px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition disabled:opacity-50 whitespace-nowrap shadow-sm"
          >
            {inviteLoading ? 'Adding...' : 'Add User'}
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30 custom-scrollbar space-y-2">
        {members.map(member => (
          <div key={member.id} className="p-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 transition flex items-center justify-between group">
            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
              <div className="w-[52px] h-[52px] rounded-full p-[2px] border border-slate-200/60 shadow-sm bg-white shrink-0 flex items-center justify-center">
                <UserAvatar 
                  url={member.avatar_url} 
                  name={member.full_name} 
                  size="lg"
                  className="rounded-full"
                />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-sm md:text-base text-slate-900 truncate leading-tight">
                    {member.full_name} 
                  </h3>
                  {member.id === user?.id && <span className="text-[10px] bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest leading-none shrink-0">You</span>}
                </div>
                <p className="text-[10px] md:text-xs text-slate-400 font-bold tracking-widest truncate leading-tight">
                  @{member.username?.toLowerCase()} • <span className="uppercase">{member.role}</span>
                </p>
              </div>
            </div>

            {myRole === 'admin' && member.id !== user?.id && (
              <div className="flex items-center gap-2">
                {member.role === 'admin' ? (
                  <button 
                    onClick={() => changeRole(member.id, 'member')}
                    title="Demote to Member" 
                    className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                  >
                    <ShieldAlert size={18} />
                  </button>
                ) : (
                  <button 
                    onClick={() => changeRole(member.id, 'admin')}
                    title="Promote to Admin" 
                    className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition"
                  >
                    <ShieldCheck size={18} />
                  </button>
                )}
                
                <button 
                  onClick={() => removeMember(member.id, member.full_name)}
                  title="Remove from group" 
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <UserMinus size={18} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
