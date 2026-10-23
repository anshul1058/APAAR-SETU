import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ShieldCheck,
  FileCheck,
  ArrowRight
} from 'lucide-react';
import { Student } from '../../types';

interface BulkUploadCenterProps {
  onBatchProcessed?: (newStudentsCount: number) => void;
}

export const BulkUploadCenter: React.FC<BulkUploadCenterProps> = ({ onBatchProcessed }) => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [batchResult, setBatchResult] = useState<{
    totalRows: number;
    validRows: number;
    duplicateRows: number;
    badChecksumRows: number;
  } | null>(null);

  const sampleCsvContent = `apaar_id,student_name,dob,gender,roll_number,department,quota
9042-3819-5502,Aarav Sharma,2004-04-12,Male,2023/CSE/042,Computer Science & Engineering,AICTE Sanctioned
9124-5820-1928,Rohan Verma,2003-11-28,Male,2024/CSE/118,Computer Science & Engineering,AICTE Sanctioned
7829-1049-3829,Priyanka Nair,2004-08-19,Female,2023/ECE/089,Electronics & Communication,State Quota
8491-2940-1092,Devendra Singh,2005-01-14,Male,2024/AIDS/023,Computer Science & Engineering,PMSSS (J&K Special)
8021-4912-7401,Ananya Sundaram,2003-06-25,Female,2022/ME/015,Mechanical Engineering,AICTE Sanctioned`;

  const downloadSampleTemplate = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'aicte_apaar_batch_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSimulatedUpload = (fileName: string) => {
    setSelectedFileName(fileName);
    setUploadProgress(10);
    setProcessingStage('Reading CSV headers and parsing rows...');
    setBatchResult(null);

    setTimeout(() => {
      setUploadProgress(40);
      setProcessingStage('Calculating Verhoeff checksums for 150 student rows...');
    }, 600);

    setTimeout(() => {
      setUploadProgress(75);
      setProcessingStage('Querying Central AICTE & DigiLocker Gateway for cross-institute duplicates...');
    }, 1300);

    setTimeout(() => {
      setUploadProgress(100);
      setProcessingStage('Batch synchronization finalized!');
      setBatchResult({
        totalRows: 150,
        validRows: 146,
        duplicateRows: 2,
        badChecksumRows: 2
      });
      if (onBatchProcessed) {
        onBatchProcessed(146);
      }
    }, 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Bulk APAAR Student Ingestion Center</h1>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                  Batch API
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingest institutional student batches via CSV or Excel with automated Verhoeff verification and duplicate cross-checking.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={downloadSampleTemplate}
          className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 font-semibold text-xs flex items-center gap-2 transition-colors border border-stone-200"
        >
          <Download className="w-4 h-4 text-slate-600" />
          Download Sample CSV Template
        </button>
      </div>

      {/* Upload Drag & Drop Area */}
      <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-stone-300 text-center hover:border-blue-500 transition-colors">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">Upload Institutional CSV / Excel Batch</h3>
            <p className="text-xs text-slate-500 mt-1">
              Drag and drop your AICTE enrollment spreadsheet here, or click to browse files.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => handleSimulatedUpload('dtu_first_year_batch_2026.csv')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20"
            >
              Upload Sample Batch (150 Students)
            </button>
            <button
              onClick={() => handleSimulatedUpload('lateral_entry_cse_batch.csv')}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-xl text-xs font-semibold border border-stone-200"
            >
              Upload Lateral Entry Batch
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar & Status */}
      {uploadProgress !== null && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${uploadProgress < 100 ? 'animate-spin text-blue-600' : 'text-emerald-600'}`} />
              {processingStage}
            </span>
            <span className="font-mono font-bold text-blue-700">{uploadProgress}%</span>
          </div>

          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                uploadProgress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Batch Processing Results Scorecard */}
      {batchResult && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Batch Processing Summary</h3>
              <p className="text-xs text-slate-500">File: <span className="font-mono font-semibold text-slate-700">{selectedFileName}</span></p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
              ✓ Batch Ingested
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Rows</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{batchResult.totalRows}</p>
              <p className="text-[10px] text-slate-500">Records Parsed</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Valid & Verified</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{batchResult.validRows}</p>
              <p className="text-[10px] text-emerald-700">Checksum & DigiLocker OK</p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-700">Cross-Institute Duplicates</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{batchResult.duplicateRows}</p>
              <p className="text-[10px] text-rose-700">Flagged to Resolution Queue</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-700">Checksum Errors</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{batchResult.badChecksumRows}</p>
              <p className="text-[10px] text-amber-700">Malformed APAAR String</p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100">
            <p className="text-xs text-slate-500">
              146 valid students have been successfully synchronized with the institutional student directory and ABC credits ledger.
            </p>

            <button
              onClick={() => {
                const blob = new Blob([sampleCsvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'discrepancy_report.csv';
                a.click();
              }}
              className="px-4 py-2 bg-stone-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              <FileCheck className="w-3.5 h-3.5" />
              Download Discrepancy CSV
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
