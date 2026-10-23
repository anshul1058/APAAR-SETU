import React, { useState } from 'react';
import { 
  FileText, 
  Award, 
  Printer, 
  Download, 
  ShieldCheck, 
  History, 
  QrCode, 
  Search 
} from 'lucide-react';
import { INITIAL_AUDIT_LOGS } from '../../data/mockData';
import { AuditLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [logs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.targetApaarId.includes(filterQuery) ||
      l.performedBy.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Institutional Compliance Certification & Audit Ledger</h1>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full uppercase font-mono">
                  SHA-256 Signed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate official AICTE compliance certificates and review cryptographically signed verification logs.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCertificateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
        >
          <Award className="w-4 h-4" />
          Generate AICTE Compliance Certificate
        </button>
      </div>

      {/* Audit Log Ledger */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Cryptographic Audit Log Ledger
            </h2>
            <p className="text-xs text-slate-500">Every verification transaction is assigned a tamper-evident SHA-256 integrity hash.</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search audit actions, APAAR..."
              className="pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-3">Log ID & Timestamp</th>
                <th className="pb-3 px-3">Action Description</th>
                <th className="pb-3 px-3">Target Masked APAAR</th>
                <th className="pb-3 px-3">Authorized Actor</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Cryptographic SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((log) => (
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

      {/* Official AICTE Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border-4 border-double border-amber-200 space-y-6 relative print:border-none print:shadow-none print:m-0 print:p-0">
            
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Official Document Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
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

            <div className="text-center space-y-4 px-4 py-2 border-2 border-amber-300/60 p-6 rounded-2xl bg-gradient-to-b from-amber-50/30 via-white to-amber-50/20">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-900 text-amber-400 font-extrabold flex items-center justify-center text-sm shadow-sm">
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
                <h2 className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                  CERTIFICATE OF APAAR COMPLIANCE & STUDENT DATA INTEGRITY
                </h2>
                <p className="text-xs font-mono text-blue-700 font-bold mt-0.5">
                  Ref: AICTE/APAAR-CERT/2026/DTU-930
                </p>
              </div>

              <div className="text-xs text-slate-700 leading-relaxed text-justify pt-3 space-y-3">
                <p>
                  This is to formally certify that <strong>{user?.institutionName}</strong> (Permanent ID: <span className="font-mono font-bold text-blue-900">{user?.aicteId}</span>) has completed the Automated Permanent Academic Account Registry (APAAR) student verification audit for Academic Cycle 2026-27.
                </p>
                <p>
                  Enrolled student records have been cross-checked against the Central AICTE Registry, DigiLocker UIDAI eKYC Gateway, and Academic Bank of Credits. All concurrent enrollment flags are under monitored show-cause proceedings.
                </p>
              </div>

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

              <div className="pt-6 flex items-end justify-between text-xs">
                <div className="text-left space-y-1">
                  <div className="w-16 h-16 bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-center text-slate-400">
                    <QrCode className="w-10 h-10 text-slate-700" />
                  </div>
                  <p className="text-[9px] font-mono text-slate-400">Scan to Verify</p>
                </div>

                <div className="text-center space-y-1">
                  <div className="w-20 h-20 rounded-full border-4 border-double border-amber-500 flex items-center justify-center text-amber-600 text-[10px] font-black uppercase text-center p-1 leading-tight mx-auto rotate-[-8deg] shadow-xs">
                    AICTE APAAR VERIFIED 2026
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="border-b border-slate-400 w-36 ml-auto mb-1"></div>
                  <p className="font-extrabold text-slate-900 text-xs">Member Secretary</p>
                  <p className="text-[10px] text-slate-500">AICTE Regulatory Bureau</p>
                  <p className="text-[9px] font-mono text-slate-400">Signed: 22 Oct 2026</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
