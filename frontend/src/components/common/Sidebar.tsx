import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UploadCloud, 
  Layers, 
  FileText, 
  Building2, 
  AlertTriangle, 
  QrCode, 
  Settings,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const getNavLinks = () => {
    switch (user?.role) {
      case 'institution_admin':
        return [
          { to: '/institution/dashboard', label: 'Institutional Overview', icon: LayoutDashboard },
          { to: '/institution/students', label: 'Student Directory', icon: Users, badge: '984 Total' },
          { to: '/institution/upload', label: 'Batch CSV Ingestion', icon: UploadCloud, badge: '10 MB' },
          { to: '/institution/seat-matrix', label: 'Seat Matrix & Quotas', icon: Layers },
          { to: '/institution/reports', label: 'Compliance & Audit Logs', icon: FileText }
        ];

      case 'aicte_officer':
        return [
          { to: '/aicte/dashboard', label: 'AICTE Regional Overview', icon: LayoutDashboard },
          { to: '/aicte/institutions', label: 'Institutions Directory', icon: Building2 },
          { to: '/aicte/duplicates', label: 'Duplicate Detection Hub', icon: AlertTriangle },
          { to: '/verifier/portal', label: 'Spot Inspection Verifier', icon: QrCode }
        ];

      case 'aicte_admin':
        return [
          { to: '/aicte/admin', label: 'Apex Governance Cell', icon: Settings },
          { to: '/aicte/dashboard', label: 'National KPI Metrics', icon: LayoutDashboard },
          { to: '/aicte/institutions', label: 'All AICTE Institutes', icon: Building2 },
          { to: '/aicte/duplicates', label: 'National Duplicate Engine', icon: AlertTriangle },
          { to: '/institution/reports', label: 'Tamper Audit Ledger', icon: FileText }
        ];

      case 'verifier':
        return [
          { to: '/verifier/portal', label: 'APAAR Verification Desk', icon: QrCode, badge: 'Live Scanner' },
          { to: '/institution/students', label: 'Student Records Lookup', icon: Users }
        ];

      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside className="w-64 bg-white border-r border-stone-200/80 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] sticky top-16 shadow-xs select-none">
      <div className="p-4 space-y-6">
        
        {/* User Role Card */}
        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.institutionName.split('(')[0]}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-slate-500 font-medium capitalize">{user?.role.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Navigation Menu
          </p>

          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100/70'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-blue-700 text-blue-100'
                          : ('badgeColor' in item && item.badgeColor) || 'bg-stone-200 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
