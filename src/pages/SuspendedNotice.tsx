import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Ban, LogOut } from 'lucide-react';

export default function SuspendedNotice() {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.setState({ session: null, profile: null });
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
          <Ban size={40} />
        </div>
        
        <h1 className="text-2xl font-extrabold text-slate-900">Account Suspended</h1>
        
        <p className="text-slate-600 leading-relaxed">
          Your Nemesis account has been suspended by an administrator. You currently do not have access to any platform features.
        </p>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-500">
          If you believe this is an error, please contact platform moderation or your educational administrator.
        </div>

        <button 
          onClick={handleLogout}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold p-3 rounded-xl transition"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );
}
