import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  ArrowRight, 
  ArrowUpRight, 
  ShieldCheck, 
  UploadCloud,
  FileSpreadsheet,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/studentService';
import { institutionService } from '../../services/institutionService';
import { Student, DuplicateCase, AicteProgramIntake } from '../../types';
import { PROGRAM_INTAKE_DATA } from '../../data/mockData';
import { formatNumber, formatDate, maskApaarId } from '../../utils/formatters';

export const InstitutionDashboard: React.FC = () => {
  const { user, refreshTrigger, openAiWithContext } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCase[]>([]);
  const [intakeData] = useState<AicteProgramIntake[]>(PROGRAM_INTAKE_DATA);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      const resStudents = await studentService.getStudents({ pageSize: 5 });
      const resDups = await institutionService.getDuplicates();
      setStudents(resStudents.data);
      setDuplicates(resDups);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSanctioned = intakeData.reduce((acc, curr) => acc + curr.sanctionedIntake, 0);
  const totalEnrolled = intakeData.reduce((acc, curr) => acc + curr.actualEnrolled, 0);
  const totalApaarVerified = intakeData.reduce((acc, curr) => acc + curr.apaarVerified, 0);
  const totalPending = intakeData.reduce((acc, curr) => acc + curr.pendingVerification, 0);

  const verificationPercentage = ((totalApaarVerified / totalEnrolled) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold rounded-full flex items-center gap-1.5 backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              AICTE Compliance Cycle 2026-27 Active
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-medium rounded-full">
              ABC Node Synchronized
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {user?.institutionName} — Verification Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-2xl">
            Real-time tracking of AICTE sanctioned seat compliance, Automated Permanent Academic Account Registry (APAAR) verification, and cross-institutional duplicate detection.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/institution/upload')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Student Batch CSV
            </button>
            <button
              onClick={() => openAiWithContext('Generate an executive summary of DTU APAAR compliance audit')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              AI Compliance Summary
            </button>
          </div>
        </div>

        {/* Decorative Background Glows */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Sanctioned Seats</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{formatNumber(totalEnrolled)}</span>
            <span className="text-xs font-medium text-slate-400">/ {formatNumber(totalSanctioned)} Sanctioned</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${(totalEnrolled / totalSanctioned) * 100}%` }}></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Occupancy Rate</span>
            <span className="font-bold text-slate-700">{((totalEnrolled / totalSanctioned) * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">APAAR Linked & Verified</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{formatNumber(totalApaarVerified)}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {verificationPercentage}%
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${verificationPercentage}%` }}></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Pending Validation</span>
            <span className="font-bold text-amber-600">{totalPending} candidates</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-3xl border border-rose-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Duplicate Alerts</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{duplicates.length}</span>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Active Flags
            </span>
          </div>
          <p className="mt-3 text-xs text-rose-800/80 leading-snug">
            Concurrent multi-institution enrollments requiring verification or NOC clearance.
          </p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">ABC Credit Ledger</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600">{formatNumber(62480)}</span>
            <span className="text-xs font-medium text-slate-400">Credits Synced</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>NEP 2020 Multi-Entry/Exit Active</span>
          </div>
        </div>

      </div>

      {/* Program-Wise Verification Breakdown & Duplicates Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Program Intake Matrix */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Program-Wise APAAR Verification Status</h2>
              <p className="text-xs text-slate-500">Sanctioned intake compliance across engineering departments</p>
            </div>
            <button
              onClick={() => navigate('/institution/seat-matrix')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Seat Matrix
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {intakeData.map((dept) => {
              const verifiedPct = Math.round((dept.apaarVerified / dept.actualEnrolled) * 100);
              return (
                <div key={dept.programCode} className="p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/60 hover:bg-stone-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800">{dept.programName}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">({dept.programCode})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        Intake: <strong>{dept.actualEnrolled}</strong> / {dept.sanctionedIntake}
                      </span>
                      <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-[11px]">
                        {verifiedPct}% Verified
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden flex">
                    <div style={{ width: `${(dept.apaarVerified / dept.sanctionedIntake) * 100}%` }} className="bg-emerald-500 h-2"></div>
                    <div style={{ width: `${(dept.pendingVerification / dept.sanctionedIntake) * 100}%` }} className="bg-amber-400 h-2"></div>
                    <div style={{ width: `${(dept.discrepanciesCount / dept.sanctionedIntake) * 100}%` }} className="bg-rose-500 h-2"></div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="text-emerald-700 font-medium">✓ {dept.apaarVerified} Verified</span>
                    <span className="text-amber-700 font-medium">⏳ {dept.pendingVerification} In Progress</span>
                    <span className="text-rose-600 font-medium">⚠ {dept.discrepanciesCount} Flagged</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Masked Duplicate Watchlist */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></div>
                <h2 className="text-base font-bold text-slate-900">Duplicate Watchlist</h2>
              </div>
              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-mono">
                Masked APAAR
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Concurrent active admissions identified via central MoE verification:
            </p>

            <div className="space-y-3">
              {duplicates.map((dup) => (
                <div key={dup.id} className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 text-xs space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{dup.studentName}</p>
                      <p className="text-[11px] font-mono text-blue-700 font-semibold">{dup.maskedApaarId}</p>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-rose-200 text-rose-900 rounded">
                      Score: {dup.anomalyScore}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate">Conflict: <strong>{dup.conflictingInstitution.name}</strong></p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-stone-200">
            <button
              onClick={() => openAiWithContext('Explain the duplicate enrollment flags on the watchlist')}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              AI Duplicate Risk Analysis
            </button>
          </div>
        </div>

      </div>

      {/* Recent Student Records Preview Table */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recently Enrolled Students</h2>
            <p className="text-xs text-slate-500">Live feed from central APAAR verification node</p>
          </div>
          <button
            onClick={() => navigate('/institution/students')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Open Student Directory
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-3">Student Name</th>
                <th className="pb-3 px-3">Masked APAAR ID</th>
                <th className="pb-3 px-3">Department</th>
                <th className="pb-3 px-3">Admission Quota</th>
                <th className="pb-3 px-3">ABC Credits</th>
                <th className="pb-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {students.slice(0, 5).map((stu) => (
                <tr key={stu.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    {stu.name}
                    <div className="text-[10px] text-slate-400 font-mono">{stu.rollNumber}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-medium text-blue-700">
                    {stu.maskedApaarId}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {stu.department}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-stone-100 text-[10px] text-slate-700">
                      {stu.quota}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-indigo-700">
                    {formatNumber(stu.abcCreditsEarned)} pts
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      stu.verificationStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      stu.verificationStatus === 'DUPLICATE_SUSPECT' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {stu.verificationStatus.replace('_', ' ')}
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
