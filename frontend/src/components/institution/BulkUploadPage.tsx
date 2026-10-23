import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  FileCheck, 
  ArrowRight,
  Info,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadService } from '../../services/uploadService';
import { UploadBatchSummary } from '../../types';
import { formatNumber } from '../../utils/formatters';

export const BulkUploadPage: React.FC = () => {
  const { openAiWithContext } = useAuth();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [stageMessage, setStageMessage] = useState('');
  const [summary, setSummary] = useState<UploadBatchSummary | null>(null);
  const [uploadError, setUploadError] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleProcessFile = async (file: File) => {
    setUploadError('');
    setSelectedFile(file);
    setSummary(null);

    try {
      const res = await uploadService.processUpload(file, (pct, stage) => {
        setUploadProgress(pct);
        setStageMessage(stage);
      });
      setSummary(res);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const detailMessage = Array.isArray(detail)
        ? detail.map((item: { msg?: string }) => item.msg || 'Invalid upload data').join('; ')
        : detail;
      setUploadError(detailMessage || err.message || 'File upload failed');
      setUploadProgress(null);
    }
  };

  const handleDownloadErrors = () => {
    if (summary?.errors) {
      uploadService.exportErrorsCsv(summary.errors);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    setSummary(null);
    setUploadError('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Institutional Batch Upload Workflow</h1>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase font-mono">
                  Max 10 MB
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingest student batches via CSV with row-level validation and duplicate detection.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => uploadService.downloadTemplate()}
          className="px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-slate-700 font-semibold text-xs flex items-center gap-2 transition-colors shadow-2xs self-start md:self-auto"
        >
          <Download className="w-4 h-4 text-slate-600" />
          Download Sample CSV Template
        </button>
      </div>

      {uploadError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      {!summary && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white rounded-3xl p-8 border-2 border-dashed text-center transition-all ${
            isDragging ? 'border-blue-500 bg-blue-50/20' : 'border-stone-300 hover:border-blue-400'
          }`}
        >
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900">Drop your student batch spreadsheet here</h3>
              <p className="text-xs text-slate-500 mt-1">
                Supports .CSV files up to <strong>10 MB</strong> in size.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <label className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md shadow-blue-500/20 transition-all">
                Browse Batch File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>

            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Bar with Staged Status */}
      {uploadProgress !== null && !summary && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              {stageMessage}
            </span>
            <span className="font-mono font-bold text-blue-700">{uploadProgress}%</span>
          </div>

          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Validation Summaries & Rule Chips */}
      {summary && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Summary Scorecard */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Batch Inspection Dossier</span>
                <h3 className="text-base font-extrabold text-slate-900">{summary.fileName}</h3>
                <p className="text-xs text-slate-500 font-mono">File Size: {summary.fileSizeMb} MB • {formatNumber(summary.totalRecords)} Rows</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadErrors}
                  className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Error CSV
                </button>
                <button
                  onClick={handleReset}
                  className="px-3.5 py-2 rounded-xl border border-stone-200 text-slate-600 hover:bg-stone-50 text-xs font-semibold"
                >
                  Upload Another
                </button>
              </div>
            </div>

            {/* Scorecard metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Rows</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{formatNumber(summary.totalRecords)}</p>
                <p className="text-[10px] text-slate-500">Evaluated</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Passed Rows</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{formatNumber(summary.passedRecords)}</p>
                <p className="text-[10px] text-emerald-700">Ready for ABC Sync</p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-700">Critical Errors</span>
                <p className="text-2xl font-black text-rose-600 mt-1">{summary.criticalErrors}</p>
                <p className="text-[10px] text-rose-700">Requires Correction</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-700">Warnings</span>
                <p className="text-2xl font-black text-amber-600 mt-1">{summary.warningFlags}</p>
                <p className="text-[10px] text-amber-700">Identity Mismatches</p>
              </div>
            </div>

            {/* Rule Chips */}
            <div className="pt-2">
              <p className="text-xs font-bold text-slate-700 mb-2">Automated Rules Evaluated:</p>
              <div className="flex flex-wrap items-center gap-2">
                {summary.rulesEvaluated.map((rule, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border ${
                      rule.passed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}
                  >
                    {rule.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                    <span>{rule.name}</span>
                    {!rule.passed && (
                      <span className="bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                        {rule.violatorCount}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Row-Level Flags Table */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Row-Level Validation Flags</h3>
                <p className="text-xs text-slate-500">Correct errors before final submission to AICTE Central Node</p>
              </div>
              <button
                onClick={() => openAiWithContext('Explain the row level validation flags from the batch upload')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                AI Batch Diagnosis
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 px-3">Row</th>
                    <th className="pb-3 px-3">Student Name</th>
                    <th className="pb-3 px-3">Masked APAAR</th>
                    <th className="pb-3 px-3">Department & Roll</th>
                    <th className="pb-3 px-3">Rule Violated</th>
                    <th className="pb-3 px-3">Severity</th>
                    <th className="pb-3 px-3">Discrepancy Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {summary.errors.map((err) => (
                    <tr key={err.rowNumber} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-500">
                        #{err.rowNumber}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {err.studentName}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-medium text-blue-700">
                        {err.maskedApaarId}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        {err.department}
                        <div className="text-[10px] text-slate-400 font-mono">{err.rollNumber}</div>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-800">
                        {err.ruleViolated}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            err.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {err.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 leading-snug">
                        {err.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resubmission Action Bar */}
            <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {formatNumber(summary.passedRecords)} clean rows can be committed immediately. {formatNumber(summary.errors.length)} flagged rows will be staged in the exception queue.
              </p>

              <button
                onClick={() => {
                  alert(`Batch successfully ingested with ${summary.errors.length} exceptions staged.`);
                  handleReset();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Commit Valid Records ({formatNumber(summary.passedRecords)} Students)
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
