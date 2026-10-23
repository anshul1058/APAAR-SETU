import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Sliders, 
  Save, 
  Server, 
  Key, 
  Lock, 
  CheckCircle2,
  AlertTriangle,
  History
} from 'lucide-react';
import { INITIAL_AUDIT_LOGS } from '../../data/mockData';

export const AicteAdminPage: React.FC = () => {
  const [anomalyThreshold, setAnomalyThreshold] = useState(65);
  const [autoFlagGraceDays, setAutoFlagGraceDays] = useState(7);
  const [biometricSyncDays, setBiometricSyncDays] = useState(30);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">AICTE Apex Administrative Governance Cell</h1>
                <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full uppercase font-mono">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized policy controls, verification thresholds, and cryptographic audit governance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            National Verification Hub: ONLINE
          </span>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>National governance thresholds and policy parameters saved!</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Thresholds */}
        <form onSubmit={handleSave} className="md:col-span-2 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600" />
              Automated Anomaly Detection Thresholds
            </h2>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Governance Policies
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-800">
                  Critical Anomaly Score Threshold: <span className="font-mono text-purple-700 text-sm">{anomalyThreshold}/100</span>
                </label>
                <span className="text-[10px] text-slate-400">Triggers automated council review</span>
              </div>
              <input
                type="range"
                min={30}
                max={90}
                value={anomalyThreshold}
                onChange={(e) => setAnomalyThreshold(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Any candidate or institution exceeding this anomaly index is auto-escalated to regional inspectors.
              </p>
            </div>

            <div className="pt-2">
              <label className="font-bold text-slate-800 block mb-1">
                Show-Cause Response Grace Period: <span className="font-mono text-purple-700">{autoFlagGraceDays} Working Days</span>
              </label>
              <input
                type="number"
                min={3}
                max={30}
                value={autoFlagGraceDays}
                onChange={(e) => setAutoFlagGraceDays(Number(e.target.value))}
                className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Biometric Sync Inactivity SLA: <span className="font-mono text-purple-700">{biometricSyncDays} Days</span>
              </label>
              <input
                type="number"
                min={15}
                max={90}
                value={biometricSyncDays}
                onChange={(e) => setBiometricSyncDays(Number(e.target.value))}
                className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Flags ghost student alert when 0% biometric attendance is reported for the defined duration.
              </p>
            </div>
          </div>
        </form>

        {/* Right 1 Col: Gateway Health */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-500" />
            Gateway Health & API Nodes
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">DigiLocker W3C Gateway</span>
                <span className="text-emerald-700 font-bold text-[10px]">99.98% Uptime</span>
              </div>
              <p className="text-[10px] text-slate-400">Latency: 42ms • TLS 1.3 Strict</p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">MoE NAD Credit Vault</span>
                <span className="text-emerald-700 font-bold text-[10px]">Active</span>
              </div>
              <p className="text-[10px] text-slate-400">Sync: 62,480 credits queued</p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">UIDAI Verhoeff Checksum Node</span>
                <span className="text-emerald-700 font-bold text-[10px]">Operational</span>
              </div>
              <p className="text-[10px] text-slate-400">Dihedral D5 Mathematical Verification</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
