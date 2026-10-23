import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  TrendingUp, 
  Award, 
  ShieldAlert,
  Sparkles,
  BarChart3,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { institutionService } from '../../services/institutionService';
import { Institution, DuplicateCase } from '../../types';
import { formatNumber, maskApaarId } from '../../utils/formatters';

export const AicteDashboard: React.FC = () => {
  const { refreshTrigger, openAiWithContext } = useAuth();
  const navigate = useNavigate();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCase[]>([]);
  const [missingRegistryFlags, setMissingRegistryFlags] = useState(0);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      const [insts, dups, missingFlags] = await Promise.all([
        institutionService.getInstitutions(),
        institutionService.getDuplicates(),
        institutionService.getMissingRegistryFlagCount()
      ]);
      setInstitutions(insts);
      setDuplicates(dups);
      setMissingRegistryFlags(missingFlags);
      if (!selectedInstitution && insts.length > 0) {
        setSelectedInstitution(insts[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalSanctioned = institutions.reduce((a, b) => a + b.totalSanctionedIntake, 0);
  const totalEnrolled = institutions.reduce((a, b) => a + b.totalEnrolled, 0);
  const totalVerified = institutions.reduce((a, b) => a + b.apaarVerifiedCount, 0);
  const avgVerificationRate = ((totalVerified / (totalEnrolled || 1)) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      
      {/* Top AICTE Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold rounded-full flex items-center gap-1.5 backdrop-blur-md">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              AICTE National Regulatory Cell • Monitored Cohort
            </span>
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full">
              Central Duplicate Engine Active
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            AICTE Regulatory Surveillance & Anomaly Monitor
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-2xl">
            National overview of AICTE sanctioned seat occupancy, anomaly scores, ghost student tracking, and cross-state dual-admission flags.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/aicte/duplicates')}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-rose-600/20"
            >
              <AlertTriangle className="w-4 h-4" />
              Inspect {duplicates.length} Cross-Institute Duplicates
            </button>
            <button
              onClick={() => openAiWithContext('Analyze the national AICTE anomaly scores and flag explanations')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              AI Anomaly Diagnosis
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Institutions</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{institutions.length}</p>
          <p className="text-xs text-slate-500 mt-1">Across 4 AICTE Geographic Regions</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Enrolled Cohort</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{formatNumber(totalEnrolled)}</p>
          <p className="text-xs text-slate-500 mt-1">of {formatNumber(totalSanctioned)} sanctioned capacity</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">National APAAR Linked</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{formatNumber(totalVerified)}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{avgVerificationRate}%</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">DigiLocker verified credentials</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Cross-Institute Duplicates</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">{duplicates.length} Cases</p>
          <p className="text-xs text-rose-800 mt-1">Dual-enrollment fraud flags</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Missing APAAR IDs</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">{formatNumber(missingRegistryFlags)} Flags</p>
          <p className="text-xs text-amber-800 mt-1">Blank or unregistered APAAR IDs from uploads</p>
        </div>
      </div>

      {/* Intake vs Enrollment Interactive Visual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Institutions Intake vs Enrollment Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Intake-Versus-Enrollment & Anomaly Monitor</h2>
              <p className="text-xs text-slate-500">Sanctioned seats vs actual verified enrollment per institution</p>
            </div>
            <button
              onClick={() => navigate('/aicte/institutions')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              All Institutes
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {institutions.map((inst) => {
              const isSelected = selectedInstitution?.id === inst.id;
              const isHighAnomaly = inst.anomalyScore >= 50;

              return (
                <div
                  key={inst.id}
                  onClick={() => setSelectedInstitution(inst)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-stone-50/60 border-stone-200/70 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="font-bold text-xs text-slate-900">{inst.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">{inst.aictePermanentId} • {inst.region}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isHighAnomaly ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        Anomaly: {inst.anomalyScore}/100
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {formatNumber(inst.totalEnrolled)} / {formatNumber(inst.totalSanctionedIntake)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden flex">
                    <div
                      style={{ width: `${(inst.apaarVerifiedCount / inst.totalSanctionedIntake) * 100}%` }}
                      className="bg-emerald-500 h-2"
                    ></div>
                    <div
                      style={{ width: `${((inst.totalEnrolled - inst.apaarVerifiedCount) / inst.totalSanctionedIntake) * 100}%` }}
                      className="bg-amber-400 h-2"
                    ></div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Verified Rate: <strong className="text-slate-800">{inst.verificationRate}%</strong></span>
                    <span className="text-slate-400 italic truncate max-w-xs">{inst.anomalySummary}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Selected Institution Drill-Down */}
        {selectedInstitution ? (
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Institution Drill-Down</span>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight mt-0.5">{selectedInstitution.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedInstitution.aictePermanentId}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  selectedInstitution.complianceStatus === 'COMPLIANT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedInstitution.complianceStatus.replace('_', ' ')}
                </span>
              </div>

              {/* Anomaly Score Box */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 my-4 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Anomaly Index Score
                  </span>
                  <span className="text-lg font-black text-amber-900 whitespace-nowrap">
                    {Number(selectedInstitution.anomalyScore).toFixed(1)} / 100
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 leading-relaxed">
                  {selectedInstitution.anomalySummary}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-semibold text-slate-800">{selectedInstitution.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-semibold text-slate-800">{selectedInstitution.city}, {selectedInstitution.state}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-slate-500">Faculty-Student Ratio:</span>
                  <span className="font-semibold text-blue-700">{selectedInstitution.facultyStudentRatio} (Norm: 1:20)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-slate-500">Intake Occupancy:</span>
                  <span className="font-bold text-slate-800">{((selectedInstitution.totalEnrolled / selectedInstitution.totalSanctionedIntake) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => openAiWithContext(`Analyze the anomaly score and compliance risks for ${selectedInstitution.name}`)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              AI Regulatory Audit Assessment
            </button>
          </div>
        ) : null}

      </div>

      {/* Duplicate Records with Masked APAAR IDs */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Flagged Cross-Institutional Dual Enrollments</h2>
            <p className="text-xs text-slate-500">Students registered in multiple full-time degree programs across AICTE institutions</p>
          </div>
          <button
            onClick={() => navigate('/aicte/duplicates')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            Resolution Desk
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-3">Student</th>
                <th className="pb-3 px-3">Masked APAAR ID</th>
                <th className="pb-3 px-3">Primary Enrolled Institute</th>
                <th className="pb-3 px-3">Conflicting Institute</th>
                <th className="pb-3 px-3">Anomaly Score</th>
                <th className="pb-3 px-3">Action Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {duplicates.map((dup) => (
                <tr key={dup.id} className="hover:bg-rose-50/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {dup.studentName}
                  </td>
                  <td className="py-3 px-3 font-mono text-blue-700 font-medium">
                    {dup.maskedApaarId}
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    <p className="font-medium">{dup.primaryInstitution.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{dup.primaryInstitution.aicteId}</p>
                  </td>
                  <td className="py-3 px-3 text-rose-800">
                    <p className="font-semibold">{dup.conflictingInstitution.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{dup.conflictingInstitution.aicteId}</p>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-xs">
                      {dup.anomalyScore} / 100
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {dup.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
