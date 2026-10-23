import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, RefreshCw, Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService, ROLE_PRESETS } from '../../services/authService';

export const ForbiddenPage: React.FC = () => {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { requiredRoles?: string[]; currentRole?: string } | undefined;
  const currentRole = user?.role || state?.currentRole || 'unknown';
  const required = state?.requiredRoles?.join(', ') || 'Authorized Role';

  const handleSwitchToAuthorized = async (targetRole: any) => {
    const preset = ROLE_PRESETS.find((p) => p.role === targetRole) || ROLE_PRESETS[0];
    await login(preset.email, preset.role);
    const targetPath = authService.getDefaultPathForRole(preset.role);
    navigate(targetPath);
  };

  return (
    <div className="min-h-screen bg-warm-grid flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full">
            HTTP 403 • Access Restricted
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-2">Role Permissions Required</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Your current logged in profile role (<strong>{currentRole}</strong>) does not have privileges to view this section. Requires: <strong>{required}</strong>.
          </p>
        </div>

        {/* Quick Role Switcher for Demo evaluation */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2 text-left">
          <p className="font-bold text-slate-700">Switch to an authorized role for testing:</p>
          <div className="flex flex-col gap-1.5 pt-1">
            {ROLE_PRESETS.map((p) => (
              <button
                key={p.role}
                onClick={() => handleSwitchToAuthorized(p.role)}
                className="w-full px-3 py-2 text-left rounded-xl bg-white hover:bg-blue-50 hover:text-blue-700 border border-stone-200 text-slate-700 flex items-center justify-between text-xs transition-colors"
              >
                <span>{p.name}</span>
                <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 rounded">{p.role}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate(authService.getDefaultPathForRole(user?.role || 'institution_admin'))}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to My Role Dashboard
        </button>
      </div>
    </div>
  );
};
