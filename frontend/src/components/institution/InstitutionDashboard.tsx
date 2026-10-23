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
  Sparkles,
  PlugZap,
  RefreshCw,
  Unplug,
  Save,
  KeyRound,
  FileSearch
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/studentService';
import { institutionService } from '../../services/institutionService';
import { Student, DuplicateCase, AicteProgramIntake, ErpConfig, ErpCrossCheckReport } from '../../types';
import { formatNumber, formatDate, maskApaarId } from '../../utils/formatters';

export const InstitutionDashboard: React.FC = () => {
  const { user, refreshTrigger, openAiWithContext } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCase[]>([]);
  const [intakeData, setIntakeData] = useState<AicteProgramIntake[]>([]);
  const [duplicateAlerts, setDuplicateAlerts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- ERP integration: institution admin enters their ERP portal API key ---
  const [erp, setErp] = useState<ErpConfig | null>(null);
  const [erpUrl, setErpUrl] = useState('');
  const [erpKey, setErpKey] = useState('');
  const [erpSaving, setErpSaving] = useState(false);
  const [erpChecking, setErpChecking] = useState(false);
  const [erpError, setErpError] = useState<string | null>(null);
  const [erpNotice, setErpNotice] = useState<string | null>(null);
  const [erpReport, setErpReport] = useState<ErpCrossCheckReport | null>(null);

  useEffect(() => {
    // /institutions/me/erp is institution-admin only — hidden for other roles
    institutionService
      .getErpConfig()
      .then((cfg) => {
        setErp(cfg);
        setErpUrl(cfg.erp_base_url || '');
        setErpReport(cfg.last_result);
      })
      .catch(() => setErp(null));
  }, [refreshTrigger]);

  useEffect(() => {
    loadData();
    const handleStudentDataUpdated = () => loadData();
    window.addEventListener('student-data-updated', handleStudentDataUpdated);
    return () => window.removeEventListener('student-data-updated', handleStudentDataUpdated);
  }, [refreshTrigger, user?.institutionName]);

  const loadData = async () => {
    try {
      const [institutions, resStudents, resDups] = await Promise.all([
        institutionService.getInstitutions().catch(() => []),
        studentService.getStudents({
          institutionName: user?.institutionName,
          pageSize: 5
        }),
        institutionService.getDuplicates().catch(() => [])
      ]);
      const currentInstitution = institutions.find(
        (item) => item.name === user?.institutionName || item.aictePermanentId === user?.aicteId
      ) || null;
      const uploadedPrograms = user?.institutionName
        ? studentService.getLocalInstitutionPrograms(user.institutionName)
        : [];
      setIntakeData(uploadedPrograms.length ? uploadedPrograms : (currentInstitution?.programs || []));
      setDuplicateAlerts(currentInstitution?.duplicateAlerts || 0);
      setStudents(resStudents.data);
      setDuplicates(resDups);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------- ERP handlers
  const applyErpConfig = (cfg: ErpConfig) => {
    setErp(cfg);
    setErpUrl(cfg.erp_base_url || '');
    setErpReport(cfg.last_result);
  };

  const saveErpConnection = async () => {
    setErpSaving(true);
    setErpError(null);
    setErpNotice(null);
    try {
      const cfg = await institutionService.saveErpConfig(erpUrl, erpKey);
      applyErpConfig(cfg);
      setErpKey('');
      setErpNotice('ERP connection saved. The API key is encrypted at rest and never shown again.');
    } catch (e) {
      setErpError((e as Error).message);
    } finally {
      setErpSaving(false);
    }
  };

  const runErpCrossCheck = async () => {
    setErpChecking(true);
    setErpError(null);
    setErpNotice(null);
    try {
      const rep = await institutionService.runErpCrossCheck();
      setErpReport(rep);
      setErpNotice(rep.summary);
      institutionService.getErpConfig().then(setErp).catch(() => {});
    } catch (e) {
      setErpError((e as Error).message);
    } finally {
      setErpChecking(false);
    }
  };

  const disconnectErp = async () => {
    if (!window.confirm('Remove the stored ERP URL and API key from this platform?')) return;
    setErpError(null);
    setErpNotice(null);
    try {
      const cfg = await institutionService.disconnectErp();
      applyErpConfig(cfg);
      setErpNotice('ERP connection removed.');
    } catch (e) {
      setErpError((e as Error).message);
    }
  };

  const totalCapIntake = intakeData.reduce((acc, curr) => acc + curr.sanctionedIntake, 0);
  const totalAdditionalSeats = intakeData.reduce((acc, curr) => acc + (curr.additionalSeats || 0), 0);
  const totalSanctioned = totalCapIntake + totalAdditionalSeats;
  const totalEnrolled = intakeData.reduce((acc, curr) => acc + curr.actualEnrolled, 0);
  const totalApaarVerified = intakeData.reduce((acc, curr) => acc + curr.apaarVerified, 0);
  const totalPending = intakeData.reduce((acc, curr) => acc + curr.pendingVerification, 0);

  const occupancyPercentage = totalSanctioned > 0
    ? ((totalEnrolled / totalSanctioned) * 100).toFixed(1)
    : '0.0';
  const verificationPercentage = totalEnrolled > 0
    ? ((totalApaarVerified / totalEnrolled) * 100).toFixed(1)
    : '0.0';

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
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sanctioned Capacity</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{formatNumber(totalEnrolled)}</span>
            <span className="text-xs font-medium text-slate-400">/ {formatNumber(totalSanctioned)} Sanctioned</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${occupancyPercentage}%` }}></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Occupancy Rate</span>
            <span className="font-bold text-slate-700">{occupancyPercentage}%</span>
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
            <span className="text-2xl font-black text-rose-600">{duplicateAlerts}</span>
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
            <span className="text-2xl font-black text-indigo-600">—</span>
            <span className="text-xs font-medium text-slate-400">Not in uploaded CSV</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>NEP 2020 Multi-Entry/Exit Active</span>
          </div>
        </div>

      </div>

      {/* ERP Integration — institution admin connects their ERP portal (PRD F7) */}
      {erp && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs">
          {/* header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <PlugZap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Institution ERP Integration</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your ERP portal's API key to pull its student roster and cross-check every record before APAAR verification.
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                erp.status === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : erp.status === 'error'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              {erp.status === 'connected'
                ? '● Connected'
                : erp.status === 'error'
                ? '● Connection error'
                : '○ Not configured'}
            </span>
          </div>

          {/* form: base URL + API key */}
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto] gap-3 items-end">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ERP Base URL</span>
              <input
                type="url"
                value={erpUrl}
                onChange={(e) => setErpUrl(e.target.value)}
                placeholder="https://erp.yourcollege.edu.in/api (or mock://demo)"
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ERP API Key</span>
              <input
                type="password"
                value={erpKey}
                onChange={(e) => setErpKey(e.target.value)}
                autoComplete="off"
                placeholder={
                  erp.api_key_masked
                    ? `Stored: ${erp.api_key_masked} — leave blank to keep`
                    : 'API key provided by your ERP vendor'
                }
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400"
              />
            </label>
            <button
              onClick={saveErpConnection}
              disabled={erpSaving || !erpUrl.trim() || (!erp.api_key_configured && !erpKey.trim())}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              {erpSaving ? 'Saving…' : 'Save Key'}
            </button>
          </div>

          <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            The key is encrypted on the server and never displayed again — only the masked hint is returned.
          </p>

          {/* notices */}
          {erpError && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {erpError}
            </div>
          )}
          {erpNotice && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
              {erpNotice}
            </div>
          )}

          {/* actions (only once a key is stored) */}
          {erp.api_key_configured && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={runErpCrossCheck}
                disabled={erpChecking || erpSaving}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-violet-500/20"
              >
                <RefreshCw className={`w-4 h-4 ${erpChecking ? 'animate-spin' : ''}`} />
                {erpChecking ? 'Cross-checking…' : 'Run Cross-Check vs ERP'}
              </button>
              <button
                onClick={disconnectErp}
                disabled={erpChecking}
                className="px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 disabled:opacity-50 text-slate-600 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Unplug className="w-4 h-4" /> Disconnect
              </button>
              <span className="text-[11px] text-slate-500 ml-auto font-mono">
                key {erp.api_key_masked}
                {erp.last_sync_at && ` · last sync ${new Date(erp.last_sync_at).toLocaleString()}`}
              </span>
            </div>
          )}

          {/* last cross-check report */}
          {erpReport && (
            <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/40 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <FileSearch className="w-4 h-4 text-violet-600" />
                  ERP Cross-Check Report
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(erpReport.checked_at).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5 text-center">
                  <div className="text-lg font-black text-emerald-700">{formatNumber(erpReport.matched)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700/80">Matched</div>
                </div>
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-2.5 text-center">
                  <div className="text-lg font-black text-rose-700">{formatNumber(erpReport.missing_in_erp_count)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-rose-700/80">Missing in ERP</div>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-2.5 text-center">
                  <div className="text-lg font-black text-amber-700">{formatNumber(erpReport.missing_in_local_count)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700/80">Only in ERP</div>
                </div>
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-2.5 text-center">
                  <div className="text-lg font-black text-orange-700">{formatNumber(erpReport.field_mismatches_count)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-orange-700/80">Field Mismatches</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    In our records but missing in ERP
                  </p>
                  {erpReport.missing_in_erp.length === 0 ? (
                    <p className="text-xs text-emerald-700 font-medium">None — every local record exists in the ERP.</p>
                  ) : (
                    <ul className="space-y-1">
                      {erpReport.missing_in_erp.slice(0, 5).map((m, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between text-xs bg-white/80 rounded-lg px-2.5 py-1.5 border border-stone-100"
                        >
                          <span className="font-semibold text-slate-800 truncate">{m.full_name}</span>
                          <span className="font-mono text-blue-700 shrink-0 ml-2">{m.apaar_id_masked}</span>
                        </li>
                      ))}
                      {erpReport.missing_in_erp_count > 5 && (
                        <li className="text-[10px] text-slate-500 pl-1">
                          + {erpReport.missing_in_erp_count - 5} more…
                        </li>
                      )}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Field mismatches (local vs ERP)
                  </p>
                  {erpReport.field_mismatches.length === 0 ? (
                    <p className="text-xs text-emerald-700 font-medium">None — all compared fields agree.</p>
                  ) : (
                    <ul className="space-y-1">
                      {erpReport.field_mismatches.slice(0, 5).map((m, i) => (
                        <li key={i} className="text-xs bg-white/80 rounded-lg px-2.5 py-1.5 border border-stone-100">
                          <span className="font-semibold text-slate-800">{m.full_name}</span>
                          <span className="text-slate-400"> · </span>
                          <span className="font-bold text-orange-700">{m.field}</span>
                          <div className="text-[10px] text-slate-500 truncate">
                            local: <span className="text-slate-700">{m.local}</span> vs erp:{' '}
                            <span className="text-slate-700">{m.erp}</span>
                          </div>
                        </li>
                      ))}
                      {erpReport.field_mismatches_count > 5 && (
                        <li className="text-[10px] text-slate-500 pl-1">
                          + {erpReport.field_mismatches_count - 5} more…
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* contract hint */}
          <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
            The platform calls{' '}
            <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-slate-500">{'{base URL}'}/students</code>{' '}
            with <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-slate-500">Authorization: Bearer &lt;key&gt;</code>{' '}
            and compares identity (APAAR ID / passport / roll number), name, DOB, admission date, course, category,
            quota and nationality against our records. Use base URL{' '}
            <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-slate-500">mock://demo</code> to try
            the full flow without a real ERP portal.
          </p>
        </div>
      )}

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
            {intakeData.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                No course intake data is available for this institution.
              </p>
            ) : intakeData.map((dept) => {
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
                        Intake: <strong>{dept.actualEnrolled}</strong> / {dept.sanctionedIntake + (dept.additionalSeats || 0)}
                        <span className="ml-1 text-[10px] text-slate-400">({dept.sanctionedIntake} CAP + {dept.additionalSeats || 0} TFWS)</span>
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
