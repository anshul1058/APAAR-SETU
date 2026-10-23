import React, { useState } from 'react';
import { 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Download,
  Info
} from 'lucide-react';
import { PROGRAM_INTAKE_DATA } from '../../data/mockData';
import { AicteProgramIntake } from '../../types';
import { formatNumber } from '../../utils/formatters';

export const SeatMatrixPage: React.FC = () => {
  const [intakeData] = useState<AicteProgramIntake[]>(PROGRAM_INTAKE_DATA);
  const [selectedProgram, setSelectedProgram] = useState<AicteProgramIntake>(intakeData[0]);

  const totalSanctioned = intakeData.reduce((a, b) => a + b.sanctionedIntake, 0);
  const totalEnrolled = intakeData.reduce((a, b) => a + b.actualEnrolled, 0);
  const totalVerified = intakeData.reduce((a, b) => a + b.apaarVerified, 0);

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">AICTE Sanctioned Seat Matrix & Quota Compliance</h1>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase font-mono">
                  Cycle 2026-27
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify that institutional admissions strictly comply with AICTE intake caps and quota allocations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-stone-50 px-4 py-2.5 rounded-2xl border border-stone-200">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Institutional Status</p>
            <p className="text-sm font-black text-emerald-600">Compliant (No Over-Enrollment)</p>
          </div>
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
        </div>
      </div>

      {/* Program Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <p className="text-slate-400 uppercase font-bold text-[10px]">Total Sanctioned Capacity</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{formatNumber(totalSanctioned)} Seats</p>
          <p className="text-slate-500 mt-1">Across 6 AICTE Approved Programs</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <p className="text-slate-400 uppercase font-bold text-[10px]">Verified with APAAR ID</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">{formatNumber(totalVerified)} Students</p>
          <p className="text-slate-500 mt-1">{((totalVerified / totalSanctioned) * 100).toFixed(1)}% of total intake</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <p className="text-slate-400 uppercase font-bold text-[10px]">Unfilled / Vacancy Quota</p>
          <p className="text-3xl font-black text-blue-700 mt-2">{formatNumber(totalSanctioned - totalEnrolled)} Seats</p>
          <p className="text-slate-500 mt-1">Available for Spot Counseling</p>
        </div>
      </div>

      {/* Intake Table */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">Program Quota Breakdown & Cap Monitoring</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-3">Program Code & Title</th>
                <th className="pb-3 px-3">Sanctioned</th>
                <th className="pb-3 px-3">Enrolled</th>
                <th className="pb-3 px-3">APAAR Verified</th>
                <th className="pb-3 px-3">Verification %</th>
                <th className="pb-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {intakeData.map((item) => {
                const verifiedPct = ((item.apaarVerified / item.sanctionedIntake) * 100).toFixed(1);
                return (
                  <tr
                    key={item.programCode}
                    onClick={() => setSelectedProgram(item)}
                    className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${
                      selectedProgram.programCode === item.programCode ? 'bg-blue-50/70 font-medium' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-slate-900">{item.programName}</p>
                      <p className="text-[10px] font-mono text-slate-400">{item.programCode}</p>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-900">
                      {item.sanctionedIntake}
                    </td>
                    <td className="py-3.5 px-3 text-slate-700">
                      {item.actualEnrolled}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-emerald-600">
                      {item.apaarVerified}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${verifiedPct}%` }}></div>
                        </div>
                        <span className="font-bold text-slate-700">{verifiedPct}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Compliant
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Program Quota Drilldown */}
      {selectedProgram && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Selected Program Quota Distribution</span>
              <h3 className="text-base font-extrabold text-slate-900">{selectedProgram.programName}</h3>
            </div>
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
              Capacity: {selectedProgram.sanctionedIntake} Seats
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase">General Merit (85%)</span>
              <p className="text-lg font-black text-slate-800 mt-1">
                {Math.round(selectedProgram.sanctionedIntake * 0.85)} Seats
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Centralized Counseling</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Management Quota (15% Cap)</span>
              <p className="text-lg font-black text-slate-800 mt-1">
                {Math.round(selectedProgram.sanctionedIntake * 0.15)} Seats
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Merit Based Only</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Lateral Entry (+10%)</span>
              <p className="text-lg font-black text-indigo-700 mt-1">
                +{Math.round(selectedProgram.sanctionedIntake * 0.10)} Supernumerary
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Direct 2nd Year Diploma</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase">PMSSS (J&K Special)</span>
              <p className="text-lg font-black text-blue-700 mt-1">
                +2 Supernumerary
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">AICTE Special Scheme</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
