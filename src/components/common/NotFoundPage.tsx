import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-warm-grid flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full">
            Error 404
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-2">Page Not Found</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            The requested APAAR portal route does not exist or may have moved.
          </p>
        </div>

        <button
          onClick={() => navigate(user ? authService.getDefaultPathForRole(user.role) : '/login')}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-500/20"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Portal Home
        </button>
      </div>
    </div>
  );
};
