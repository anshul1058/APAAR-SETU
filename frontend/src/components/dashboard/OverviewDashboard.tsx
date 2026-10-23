import React from 'react';
import { 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight, 
  ShieldCheck, 
  Award, 
  Building2, 
  FileSpreadsheet,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Student, DuplicateCase, AicteProgramIntake } from '../../types';

interface OverviewDashboardProps {
  students: Student[];
  duplicates: DuplicateCase[];
  intakeData: AicteProgramIntake[];
  onNavigateTab: (tab: string) => void;
  onSelectStudent: (student: Student) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  students,
  duplicates,
  intakeData,
  onNavigateTab,
  onSelectStudent
}) => {
  const totalSanctioned = intakeData.reduce((acc, curr) => acc + curr.sanctionedIntake, 0);
  const totalEnrolled = intakeData.reduce((acc, curr) => acc + curr.actualEnrolled, 0);
  const totalApaarVerified = intakeData.reduce((acc, curr) => acc + curr.apaarVerified, 0);
  const totalPending = intakeData.reduce((acc, curr) => acc + curr.pendingVerification, 0);
  const totalDiscrepancies = intakeData.reduce((acc, curr) => acc + curr.discrepanciesCount, 0);

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
              ABC Synchronized
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Institutional APAAR ID Verification Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-2xl">
            Real-time tracking of AICTE sanctioned seat compliance, Automated Permanent Academic Account Registry (APAAR) verification, and cross-institutional duplicate enrollment detection.
          </p>

          {/* Quick Action Buttons inside hero */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('validator')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              Verify Single APAAR ID
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('duplicates')}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Inspect {duplicates.length} Cross-Institute Flags
            </button>
            <button
              onClick={() => onNavigateTab('bulk-upload')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Batch Ingestion
            </button>
          </div>
        </div>

        {/* Decorative Background Glows */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute right-32 bottom-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Sanctioned vs Enrolled */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">CAP Sanctioned Seats</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalEnrolled}</span>
            <span className="text-xs font-medium text-slate-400">/ {totalSanctioned} Sanctioned</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${(totalEnrolled / totalSanctioned) * 100}%` }}
            ></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Occupancy Rate</span>
            <span className="font-bold text-slate-700">{((totalEnrolled / totalSanctioned) * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* KPI 2: APAAR Verified Rate */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">APAAR Linked & Verified</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{totalApaarVerified}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {verificationPercentage}%
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${verificationPercentage}%` }}
            ></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Pending Validation</span>
            <span className="font-bold text-amber-600">{totalPending} students</span>
          </div>
        </div>

        {/* KPI 3: Cross-Institute Duplicates */}
        <div 
          onClick={() => onNavigateTab('duplicates')}
          className="bg-white p-5 rounded-3xl border border-rose-200 shadow-sm hover:shadow-md hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Duplicate Alerts</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{duplicates.length}</span>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Critical AICTE Flag
            </span>
          </div>
          <p className="mt-3 text-xs text-rose-800/80 leading-snug">
            Concurrent multi-institution enrollments detected requiring immediate resolution.
          </p>
          <div className="mt-2 text-[11px] font-bold text-rose-600 flex items-center gap-1 group-hover:underline">
            <span>Resolve Duplicates</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* KPI 4: Academic Bank of Credits Sync */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">ABC Credit Ledger</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600">62,480</span>
            <span className="text-xs font-medium text-slate-400">Credits Synced</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>NEP 2020 Multi-Entry/Exit Enabled</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>MoE API Latency</span>
            <span className="font-bold text-emerald-600">38ms (Healthy)</span>
          </div>
        </div>

      </div>

      {/* Two Column Section: Department Verification Progress & Critical Duplicate Ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: AICTE Department Intake vs APAAR Verification */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Program-Wise APAAR Verification Status</h2>
              <p className="text-xs text-slate-500">Sanctioned intake compliance across engineering departments</p>
            </div>
            <button
              onClick={() => onNavigateTab('seat-matrix')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View Full Matrix
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

                  {/* Stacked Progress Bar */}
                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden flex">
                    <div
                      style={{ width: `${(dept.apaarVerified / dept.sanctionedIntake) * 100}%` }}
                      className="bg-emerald-500 h-2"
                      title={`Verified: ${dept.apaarVerified}`}
                    ></div>
                    <div
                      style={{ width: `${(dept.pendingVerification / dept.sanctionedIntake) * 100}%` }}
                      className="bg-amber-400 h-2"
                      title={`Pending: ${dept.pendingVerification}`}
                    ></div>
                    <div
                      style={{ width: `${(dept.discrepanciesCount / dept.sanctionedIntake) * 100}%` }}
                      className="bg-rose-500 h-2"
                      title={`Flagged: ${dept.discrepanciesCount}`}
                    ></div>
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

        {/* Right 1 Col: Urgent Cross-Institute Flag Ticker */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></div>
                <h2 className="text-base font-bold text-slate-900">Duplicate Watchlist</h2>
              </div>
              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                AICTE PS 26263
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Students identified across multiple AICTE institutions under simultaneous full-time registration:
            </p>

            <div className="space-y-3">
              {duplicates.map((dup) => (
                <div
                  key={dup.id}
                  onClick={() => onNavigateTab('duplicates')}
                  className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 hover:bg-rose-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {dup.studentName}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">APAAR: {dup.apaarId}</p>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-rose-200 text-rose-900 rounded">
                      {dup.severity}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-rose-900/80 bg-white/70 p-2 rounded-xl border border-rose-100">
                    <p className="font-semibold truncate">Primary: {dup.primaryInstitution.name}</p>
                    <p className="text-slate-500 truncate">Conflict: {dup.conflictingInstitution.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-stone-200">
            <button
              onClick={() => onNavigateTab('duplicates')}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              Open Duplicate Resolution Desk
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Recent Student Records Table preview */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recently Verified Students</h2>
            <p className="text-xs text-slate-500">Latest updates from Central APAAR & DigiLocker registry</p>
          </div>
          <button
            onClick={() => onNavigateTab('students')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Explore All 984 Records
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-3">Student Name</th>
                <th className="pb-3 px-3">12-Digit APAAR ID</th>
                <th className="pb-3 px-3">Program / Department</th>
                <th className="pb-3 px-3">Quota</th>
                <th className="pb-3 px-3">ABC Credits</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {students.slice(0, 5).map((stu) => {
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (stu.verificationStatus === 'VERIFIED') badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                if (stu.verificationStatus === 'DUPLICATE_SUSPECT') badgeClass = 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';
                if (stu.verificationStatus === 'DISCREPANCY_FLAGGED') badgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
                if (stu.verificationStatus === 'PENDING') badgeClass = 'bg-blue-50 text-blue-700 border border-blue-200';

                return (
                  <tr key={stu.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                        {stu.name.charAt(0)}
                      </div>
                      <div>
                        <div>{stu.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{stu.rollNumber}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-700">
                      {stu.apaarId}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {stu.program}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-[10px]">
                        {stu.quota}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-indigo-700">
                      {stu.abcCreditsEarned} pts
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${badgeClass}`}>
                        {stu.verificationStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          onSelectStudent(stu);
                          onNavigateTab('students');
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
