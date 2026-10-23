import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Search, 
  LogOut, 
  Building2, 
  AlertTriangle, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_PRESETS, authService } from '../../services/authService';
import { UserRole } from '../../types';
import aicteLogo from '../../assets/aicte-logo-transparent.webp';

interface HeaderProps {
  showSearch?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showSearch = true }) => {
  const { user, logout, login, openAiWithContext } = useAuth();
  const navigate = useNavigate();

  const handleRoleSwitch = async (role: UserRole) => {
    const preset = ROLE_PRESETS.find((p) => p.role === role) || ROLE_PRESETS[0];
    await login(preset.email, preset.role, 'password123');
    navigate(authService.getDefaultPathForRole(role));
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'institution_admin':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">INSTITUTION ADMIN</span>;
      case 'aicte_officer':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">AICTE REGIONAL OFFICER</span>;
      case 'aicte_admin':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold">AICTE APEX ADMIN</span>;
      case 'verifier':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">VERIFICATION DESK</span>;
      default:
        return null;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-stone-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand & Institution Info */}
      <div className="flex items-center gap-4">
        <div 
          onClick={() => navigate(authService.getDefaultPathForRole(user?.role || 'institution_admin'))}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <img 
            src={aicteLogo} 
            alt="AICTE Logo" 
            className="w-9 h-9 object-contain" 
          />
          <div>
            <span className="font-extrabold text-slate-900 tracking-tight text-base block">APAAR SETU</span>
            <p className="text-[10px] text-slate-500 font-medium">One Nation, One Student ID Platform</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-stone-200">
          <Building2 className="w-4 h-4 text-slate-400" />
          <div className="text-xs">
            <span className="font-semibold text-slate-800">{user?.institutionName}</span>
            <span className="text-slate-400 ml-2">ID: <code className="text-blue-700 font-mono font-medium">{user?.aicteId}</code></span>
          </div>
        </div>
      </div>

      {showSearch && <div className="hidden md:flex items-center max-w-xs w-full mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search masked APAAR (9042...)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (user?.role === 'institution_admin') navigate('/institution/students');
                else if (user?.role === 'verifier') navigate('/verifier/portal');
                else navigate('/aicte/duplicates');
              }
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 hover:bg-stone-100 focus:bg-white border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
          />
        </div>
      </div>}

      {/* Right Actions: Role Switcher & Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Role Switcher Pill */}
        <div className="relative group">
          <div className="flex items-center gap-1.5 cursor-pointer">
            {getRoleBadge(user?.role)}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 hidden group-hover:block z-50 animate-fade-in">
            <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Switch Demo Role:
            </p>
            {ROLE_PRESETS.map((p) => (
              <button
                key={p.role}
                onClick={() => handleRoleSwitch(p.role)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  user?.role === p.role ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-stone-50'
                }`}
              >
                <span>{p.name.split('(')[0]}</span>
                <span className="text-[10px] uppercase font-mono text-slate-400">{p.role.split('_')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name.split('(')[0]}</p>
            <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{user?.email}</p>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Log out of session"
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
