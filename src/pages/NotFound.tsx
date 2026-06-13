import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center text-slate-900 p-4 text-center">
      <FileQuestion size={80} className="text-sky-300 mb-6" />
      <h1 className="text-6xl font-extrabold tracking-tight mb-4 text-slate-900">404</h1>
      <h2 className="text-2xl font-bold mb-6 text-slate-700">Page Not Found</h2>
      <p className="text-slate-500 max-w-sm mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link 
        to="/" 
        className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-3 rounded-xl shadow-md shadow-sky-500/30 transition"
      >
        <Home size={20} /> Go to Home
      </Link>
    </div>
  );
}
