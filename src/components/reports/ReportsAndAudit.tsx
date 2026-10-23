import React, { useState } from 'react';
import { 
  FileText, 
  Award, 
  Printer, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  Search, 
  History, 
  ExternalLink,
  QrCode,
  Building2
} from 'lucide-react';
import { AuditLog } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ReportsAndAuditProps {
  logs: AuditLog[];
}

export const ReportsAndAudit: React.FC<ReportsAndAuditProps> = ({ logs }) => {
  const { user } = useAuth();
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [logFilter, setLogFilter] = useState('ALL');

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'ALL') return true;
    return l.status === logFilter;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Compliance Certification & Audit Ledger</h1>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full uppercase">
                  Tamper-Evident SHA-256
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate official AICTE compliance certificates and review cryptographically signed verification logs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCertificateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
          >
            <Award className="w-4 h-4" />
            Generate Official AICTE Compliance Certificate
          </button>
        </div>
      </div>

      {/* Certificate Preview Card */}
      <div className="bg-gradient-to-br from-amber-50/70 via-stone-50 to-blue-50/40 rounded-3xl p-6 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              Annual AICTE Cycle 2026-27
            </span>
            <h3 className="text-base font-extrabold text-slate-900 mt-1">Institutional APAAR Verification Seal</h3>
            <p className="text-xs text-slate-500">Certified for 930 Sanctioned Seats • 95.3% Verified APAAR Adherence</p>
          </div>
        </div>

        <button
          onClick={() => setShowCertificateModal(true)}
          className="px-4 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-slate-700 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          Preview & Print
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Cryptographic Audit Log Ledger
            </h2>
            <p className="text-xs text-slate-500">Every verification transaction is assigned a tamper-evident SHA-256 integrity hash.</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="text-xs px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none"
            >
              <option value="ALL">All Event Types</option>
              <option value="SUCCESS">Verified Success Only</option>
              <option value="FLAGGED">Duplicate Flags Only</option>
              <option value="WARNING">Warnings Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-3">Log ID & Timestamp</th>
                <th className="pb-3 px-3">Action Description</th>
                <th className="pb-3 px-3">Target APAAR / Batch</th>
                <th className="pb-3 px-3">Authorized Actor</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Cryptographic SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3.5 px-3">
                    <p className="font-mono font-bold text-slate-800">{log.id}</p>
                    <p className="text-[10px] text-slate-400">{log.timestamp}</p>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-800">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-blue-700 font-medium">
                    {log.targetApaarId}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    <p className="font-medium">{log.performedBy}</p>
                    <p className="text-[10px] text-slate-400">{log.role}</p>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      log.status === 'FLAGGED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[10px] text-slate-500">
                    {log.sha256Hash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official AICTE Certificate Printable Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border-4 border-double border-amber-200 space-y-6 relative print:border-none print:shadow-none print:m-0 print:p-0">
            
            {/* Action Bar (Hidden when printing) */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Official Document Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save as PDF
                </button>
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="px-3 py-1.5 border border-stone-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-stone-50"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Official Certificate Body */}
            <div className="text-center space-y-4 px-4 py-2 border-2 border-amber-300/60 p-6 rounded-2xl bg-gradient-to-b from-amber-50/30 via-white to-amber-50/20">
              
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-900 text-amber-400 font-extrabold flex items-center justify-center text-sm shadow">
                  AICTE
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
                </p>
                <p className="text-[10px] text-slate-400">
                  (A Statutory Body under the Ministry of Education, Government of India)
                </p>
                <h1 className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                  CERTIFICATE OF APAAR COMPLIANCE & STUDENT DATA INTEGRITY
                </h1>
                <p className="text-xs font-mono text-blue-700 font-bold mt-0.5">
                  Certificate Ref: AICTE/APAAR-CERT/2026/DTU-930
                </p>
              </div>

              <div className="text-xs text-slate-700 leading-relaxed text-justify pt-3 space-y-3">
                <p>
                  This is to formally certify that <strong>{user?.institutionName}</strong> (AICTE Permanent Institute ID: <span className="font-mono font-bold text-blue-900">{user?.aicteId}</span>) has successfully completed the Automated Permanent Academic Account Registry (APAAR) student identification and verification audit for Academic Cycle 2026-27.
                </p>
                <p>
                  All enrolled student records have been cross-checked against the Central AICTE Registry, DigiLocker UIDAI eKYC Gateway, and the Academic Bank of Credits (ABC) repository. No unauthorized dual admissions or non-sanctioned seats were found unresolved.
                </p>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-stone-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Sanctioned Intake</span>
                  <p className="font-extrabold text-slate-900">930 Seats</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">APAAR Linked</span>
                  <p className="font-extrabold text-emerald-600">873 Students</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Compliance Grade</span>
                  <p className="font-extrabold text-blue-700">A+ (Exemplary)</p>
                </div>
              </div>

              {/* Signatures & Seal */}
              <div className="pt-6 flex items-end justify-between text-xs">
                <div className="text-left space-y-1">
                  <div className="w-16 h-16 bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-center text-slate-400">
                    <QrCode className="w-10 h-10 text-slate-700" />
                  </div>
                  <p className="text-[9px] font-mono text-slate-400">Scan to Verify Digitally</p>
                </div>

                <div className="text-center space-y-1">
                  <div className="w-20 h-20 rounded-full border-4 border-double border-amber-500 flex items-center justify-center text-amber-600 text-[10px] font-black uppercase text-center p-1 leading-tight mx-auto rotate-[-8deg] shadow-sm">
                    AICTE APAAR VERIFIED 2026
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="border-b border-slate-400 w-36 ml-auto mb-1"></div>
                  <p className="font-extrabold text-slate-900 text-xs">Member Secretary</p>
                  <p className="text-[10px] text-slate-500">AICTE Regulatory Bureau</p>
                  <p className="text-[9px] font-mono text-slate-400">Signed: 2026-10-22</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
