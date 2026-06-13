import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, Calendar, ArrowLeft } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';

import { ProfileSkeleton } from '../components/PageSkeleton';

export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('public_profiles').select('id, full_name, username, created_at, avatar_url').eq('username', username).single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [username]);

  if (loading) return <ProfileSkeleton />;
  if (!profile) return <div className="p-8 text-center text-slate-500">User not found</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
        <UserAvatar 
          url={profile.avatar_url} 
          name={profile.full_name} 
          size="2xl" 
          className="border-4 border-slate-50 mb-4 shadow-sm" 
        />
        
        <h1 className="text-2xl font-bold text-slate-900">{profile.full_name}</h1>
        <div className="text-sky-500 font-medium mb-6">@{profile.username}</div>

        <div className="flex items-center gap-6 text-sm text-slate-500 mb-8 border-t border-b border-slate-100 py-4 w-full justify-center">
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} />
            Public Groups: 0
          </div>
        </div>
      </div>
    </div>
  );
}
