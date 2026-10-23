import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  X,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { institutionService } from '../../services/institutionService';
import { Institution } from '../../types';
import { formatNumber } from '../../utils/formatters';

export const InstitutionListPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInstitutions();
  }, [searchQuery, regionFilter, categoryFilter]);

  const loadInstitutions = async () => {
    setIsLoading(true);
    try {
      const data = await institutionService.getInstitutions(searchQuery, regionFilter, categoryFilter);
      setInstitutions(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    institutionService.exportInstitutionsCsv(institutions);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">AICTE Approved Institutions Registry</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Searchable directory of accredited institutions with verification rates, anomaly scores, and seat quotas.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-slate-700 font-semibold text-xs flex items-center gap-2 transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Export Institutions CSV
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by institute name, code, permanent ID..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            />
          </div>

          <div>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none text-slate-700"
            >
              <option value="ALL">All AICTE Regions</option>
              <option value="Northern">Northern Region</option>
              <option value="Western">Western Region</option>
              <option value="Southern">Southern Region</option>
              <option value="Eastern">Eastern Region</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none text-slate-700"
            >
              <option value="ALL">All Categories</option>
              <option value="Dataset Registry">Dataset Registry</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50/70 border-b border-stone-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Institution Name</th>
                <th className="py-3.5 px-4">Permanent ID</th>
                <th className="py-3.5 px-4">Region & State</th>
                <th className="py-3.5 px-4">Sanctioned Intake</th>
                <th className="py-3.5 px-4">APAAR Verified %</th>
                <th className="py-3.5 px-4">Anomaly Score</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {institutions.map((inst) => (
                <tr
                  key={inst.id}
                  onClick={() => setSelectedInst(inst)}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{inst.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{inst.category}</p>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-medium text-blue-700">
                    {inst.aictePermanentId}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600">
                    {inst.city}, {inst.state}
                    <div className="text-[10px] text-slate-400">{inst.region} Region</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-800">{formatNumber(inst.totalEnrolled)}</p>
                    <p className="text-[10px] text-slate-400">/ {formatNumber(inst.totalSanctionedIntake)} seats</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${inst.verificationRate}%` }}></div>
                      </div>
                      <span className="font-bold text-emerald-700">{inst.verificationRate}%</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      inst.anomalyScore >= 50 ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-slate-700'
                    }`}>
                      {inst.anomalyScore} / 100
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      inst.complianceStatus === 'COMPLIANT'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {inst.complianceStatus.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInst(inst);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Institution Modal */}
      {selectedInst && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{selectedInst.name}</h3>
                <p className="text-xs font-mono text-blue-700">AICTE Permanent ID: {selectedInst.aictePermanentId}</p>
              </div>
              <button onClick={() => setSelectedInst(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Intake</span>
                <p className="text-lg font-black text-slate-900 mt-0.5">{formatNumber(selectedInst.totalSanctionedIntake)} Seats</p>
              </div>
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Verified APAAR</span>
                <p className="text-lg font-black text-emerald-600 mt-0.5">{formatNumber(selectedInst.apaarVerifiedCount)}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <p className="font-bold">Anomaly Assessment ({selectedInst.anomalyScore}/100):</p>
              <p className="text-[11px] leading-relaxed">{selectedInst.anomalySummary}</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <p className="font-bold text-slate-800">Approved Program Cohorts:</p>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {selectedInst.programs.map((prog) => (
                  <div key={prog.programCode} className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex justify-between text-xs">
                    <span>{prog.programName}</span>
                    <span className="font-bold text-slate-700">{prog.actualEnrolled} / {prog.sanctionedIntake}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedInst(null)}
              className="w-full py-2.5 rounded-xl border border-stone-200 text-slate-600 hover:bg-stone-50 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
