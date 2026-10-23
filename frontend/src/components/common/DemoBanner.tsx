import React from 'react';
import { Info, Play, Pause, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DemoBanner: React.FC = () => {
  const { 
    autoRefreshCountdown, 
    isAutoRefreshPaused, 
    toggleAutoRefreshPause, 
    openAiWithContext 
  } = useAuth();

  return (
    <aside aria-label="Demo notice" className="bg-gradient-to-r from-amber-50 via-stone-50 to-blue-50 border-b border-amber-200/80 px-4 py-2 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="p-1 rounded-md bg-amber-500/10 text-amber-800 font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider shrink-0 border border-amber-300/60">
          <Info className="w-3.5 h-3.5 text-amber-700" />
          SIH 2026 PS 26263
        </span>
        <p className="text-[11px] text-slate-600 font-medium">
          <strong>Simulated Prototype:</strong> All APAAR, DigiLocker, OTP, and AICTE verifications are simulated mock workflows for demonstration.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* 15-second Refresh Indicator */}
        <div className="flex items-center gap-1.5 bg-white/80 border border-stone-200 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-600 shadow-2xs">
          <RefreshCw className={`w-3 h-3 text-blue-600 ${isAutoRefreshPaused ? '' : 'animate-spin'}`} style={{ animationDuration: '3s' }} />
          <span>Refresh in <strong>{autoRefreshCountdown}s</strong></span>
          <button
            onClick={toggleAutoRefreshPause}
            className="ml-1 p-0.5 rounded hover:bg-stone-200 text-slate-500 hover:text-slate-800 transition-colors"
            title={isAutoRefreshPaused ? 'Resume 15s auto-refresh' : 'Pause auto-refresh'}
          >
            {isAutoRefreshPaused ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
          </button>
        </div>

        {/* AI Assistant Quick Pill */}
        <button
          onClick={() => openAiWithContext('Explain the current screen summary and anomaly flags')}
          className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-xs transition-all"
        >
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>AI Assistant</span>
        </button>
      </div>
    </aside>
  );
};
