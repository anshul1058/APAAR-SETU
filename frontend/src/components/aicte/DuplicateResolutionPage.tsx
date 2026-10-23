import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Building2, 
  Send, 
  FileCheck, 
  CheckCircle2, 
  XCircle, 
  History, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { institutionService } from '../../services/institutionService';
import { DuplicateCase } from '../../types';

export const DuplicateResolutionPage: React.FC = () => {
  const { openAiWithContext, refreshTrigger } = useAuth();

  const [duplicates, setDuplicates] = useState<DuplicateCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<DuplicateCase | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeNotes, setNoticeNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    loadDuplicates();
    const interval = window.setInterval(loadDuplicates, 15000);
    return () => window.clearInterval(interval);
  }, [refreshTrigger]);

  const loadDuplicates = async () => {
    try {
      const data = await institutionService.getDuplicates();
      setDuplicates(data);
      setSelectedCase((current) => {
        if (!data.length) return null;
        return data.find((item) => item.id === current?.id) || data[0];
      });
    } catch {
      setDuplicates([]);
      setSelectedCase(null);
    }
  };

  const handleIssueNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    await institutionService.resolveDuplicate(
      selectedCase.id,
      'Official AICTE Show Cause Notice Dispatched',
      noticeNotes || 'Candidate directed to submit surrender certificate within 7 working days.'
    );

    setActionSuccess('Show Cause Notice Dispatched with legal tracking ID!');
    setTimeout(() => {
      setActionSuccess('');
      setShowNoticeModal(false);
      setNoticeNotes('');
      loadDuplicates();
    }, 1500);
  };

  const handleRequestNoc = async () => {
    if (!selectedCase) return;
    await institutionService.resolveDuplicate(
      selectedCase.id,
      'Institutional NOC Clearance Request Dispatched',
      `Clearance requested from ${selectedCase.conflictingInstitution.name} registrar desk.`
    );
    setActionSuccess(`NOC Request dispatched to ${selectedCase.conflictingInstitution.name}!`);
    setTimeout(() => {
      setActionSuccess('');
      loadDuplicates();
    }, 1500);
  };

  const handleRelinquish = async () => {
    if (!selectedCase) return;
    await institutionService.resolveDuplicate(
      selectedCase.id,
      'Seat Relinquished & Ghost Flag Resolved',
      'Seat cancelled at conflicting institution; single institutional seat confirmed.'
    );
    setActionSuccess('Seat successfully relinquished and conflict cleared!');
    setTimeout(() => {
      setActionSuccess('');
      loadDuplicates();
    }, 1500);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">National Duplicate Detection Hub</h1>
                <span className="text-[10px] font-extrabold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full uppercase font-mono">
                  SIH 2026 Core
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Resolve concurrent multi-institute degree registrations and ghost candidates across state boundaries.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => openAiWithContext('Analyze all active cross-institution duplicate enrollment flags')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors self-start md:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          AI Anomaly Diagnosis
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Grid: Cases List on Left, Resolution View on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 1 Col: Cases List */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Flagged Duplicate Queue
          </h2>

          {duplicates.map((dup) => {
            const isSelected = selectedCase?.id === dup.id;
            return (
              <div
                key={dup.id}
                onClick={() => setSelectedCase(dup)}
                className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-50/70 border-rose-300 shadow-md ring-2 ring-rose-400/20'
                    : 'bg-white border-stone-200/80 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{dup.studentName}</h3>
                    <p className="font-mono text-xs text-blue-700 font-semibold">{dup.maskedApaarId}</p>
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    dup.severity === 'CRITICAL' ? 'bg-rose-200 text-rose-900' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {dup.severity}
                  </span>
                </div>

                <div className="mt-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span className="font-medium truncate">{dup.primaryInstitution.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    <span className="truncate">{dup.conflictingInstitution.name}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Score: <strong className="text-rose-700">{dup.anomalyScore}/100</strong></span>
                  <span className="font-bold text-blue-700 uppercase">{dup.status.replace('_', ' ')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 2 Cols: Side-by-Side Resolution View */}
        {selectedCase ? (
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Case Dossier #{selectedCase.id}</span>
                  <h2 className="text-xl font-extrabold text-slate-900">{selectedCase.studentName}</h2>
                  <p className="text-xs font-mono text-blue-700 font-semibold">Masked APAAR: {selectedCase.maskedApaarId}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                    Anomaly Score: {selectedCase.anomalyScore} / 100
                  </span>
                </div>
              </div>

              {/* Side-by-Side Institutional Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Institution A */}
                <div className="p-4 rounded-2xl bg-blue-50/50 border-2 border-blue-200 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-extrabold text-sm">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span>Primary Institution Record</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold">Institution Name</span>
                    <p className="font-bold text-slate-900">{selectedCase.primaryInstitution.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">AICTE ID: {selectedCase.primaryInstitution.aicteId}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold">Course & Degree</span>
                    <p className="font-semibold text-slate-800">{selectedCase.primaryInstitution.course}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-100">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">Admission Year</span>
                      <p className="font-medium text-slate-800">{selectedCase.primaryInstitution.admissionYear}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">State Jurisdiction</span>
                      <p className="font-medium text-slate-800">{selectedCase.primaryInstitution.state}</p>
                    </div>
                  </div>
                </div>

                {/* Institution B */}
                <div className="p-4 rounded-2xl bg-rose-50/50 border-2 border-rose-200 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Conflicting Institution Record</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold">Institution Name</span>
                    <p className="font-bold text-slate-900">{selectedCase.conflictingInstitution.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">AICTE ID: {selectedCase.conflictingInstitution.aicteId}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold">Course & Degree</span>
                    <p className="font-semibold text-slate-800">{selectedCase.conflictingInstitution.course}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-rose-100">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">Admission Year</span>
                      <p className="font-medium text-slate-800">{selectedCase.conflictingInstitution.admissionYear}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">State Jurisdiction</span>
                      <p className="font-medium text-slate-800">{selectedCase.conflictingInstitution.state}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowNoticeModal(true)}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-rose-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Legal Show-Cause Notice
                </button>

                <button
                  onClick={handleRequestNoc}
                  className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                  Request Migration NOC
                </button>

                <button
                  onClick={handleRelinquish}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5 text-slate-500" />
                  Relinquish Conflicted Seat
                </button>
              </div>
            </div>

            {/* Case Audit Trail & History */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                Case History & Regulatory Actions
              </h3>

              <div className="space-y-3">
                {selectedCase.actionHistory.map((act, index) => (
                  <div key={index} className="flex gap-3 text-xs">
                    <div className="w-6 flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                      {index < selectedCase.actionHistory.length - 1 && (
                        <div className="w-0.5 flex-1 bg-stone-200 my-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{act.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{act.date}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{act.notes}</p>
                      <p className="text-[10px] text-blue-600 font-medium mt-1">Logged By: {act.performedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : null}

      </div>

      {/* Show-Cause Notice Modal */}
      {showNoticeModal && selectedCase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">AICTE Legal Show-Cause Notice</h3>
                <p className="text-[11px] text-slate-400 font-mono">Ref: AICTE/APAAR-DUP/2026/{selectedCase.id}</p>
              </div>
              <button onClick={() => setShowNoticeModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-slate-700 space-y-2 leading-relaxed">
              <p><strong>To Candidate:</strong> {selectedCase.studentName} (Masked APAAR: <span className="font-mono">{selectedCase.maskedApaarId}</span>)</p>
              <p className="text-slate-600">
                You are registered simultaneously at <strong>{selectedCase.primaryInstitution.name}</strong> and <strong>{selectedCase.conflictingInstitution.name}</strong>. Holding two concurrent full-time technical degree seats is a violation under Section 4.2 of AICTE APH 2026-27.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Custom Regulatory Remarks:</label>
              <textarea
                rows={3}
                value={noticeNotes}
                onChange={(e) => setNoticeNotes(e.target.value)}
                placeholder="Candidate instructed to produce surrender certificate by 31 Oct 2026..."
                className="w-full p-3 text-xs border border-stone-300 rounded-xl focus:border-blue-500 focus:outline-none"
              ></textarea>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNoticeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIssueNotice}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Notice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
