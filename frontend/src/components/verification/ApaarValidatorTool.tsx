import React, { useState } from 'react';
import { 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  FileCheck, 
  ShieldCheck, 
  Printer, 
  Sparkles, 
  Award,
  Building,
  User
} from 'lucide-react';
import { formatApaarId, validateVerhoeffChecksum, generateSha256Simulated } from '../../utils/apaarValidator';
import { Student } from '../../types';

interface ApaarValidatorToolProps {
  students: Student[];
  onFlagStudent?: (studentId: string, reason: string) => void;
}

export const ApaarValidatorTool: React.FC<ApaarValidatorToolProps> = ({ students }) => {
  const [inputVal, setInputVal] = useState('9042-3819-5502');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{
    status: 'VERIFIED' | 'DISCREPANCY' | 'DUPLICATE' | 'INVALID_CHECKSUM' | null;
    student?: Student;
    checksumValid: boolean;
    serverMessage?: string;
    verifiedAt?: string;
  } | null>({
    status: 'VERIFIED',
    student: students[0],
    checksumValid: true,
    serverMessage: 'Digitally authenticated via DigiLocker eKYC & AICTE Central Node',
    verifiedAt: new Date().toLocaleString()
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatApaarId(e.target.value);
    setInputVal(formatted);
  };

  const runVerification = (idToVerify: string) => {
    const cleanDigits = idToVerify.replace(/\D/g, '');
    if (cleanDigits.length !== 12) {
      setResult({
        status: 'INVALID_CHECKSUM',
        checksumValid: false,
        serverMessage: 'APAAR ID must be exactly 12 numeric digits.'
      });
      return;
    }

    setIsVerifying(true);
    const checksumPassed = validateVerhoeffChecksum(cleanDigits);

    setTimeout(() => {
      setIsVerifying(false);
      if (!checksumPassed) {
        setResult({
          status: 'INVALID_CHECKSUM',
          checksumValid: false,
          serverMessage: 'Verhoeff Checksum verification failed: Dihedral group permutation error.'
        });
        return;
      }

      // Check matched student in database
      const match = students.find((s) => s.apaarId === idToVerify || s.apaarId.replace(/\D/g, '') === cleanDigits);

      if (match) {
        if (match.verificationStatus === 'DUPLICATE_SUSPECT') {
          setResult({
            status: 'DUPLICATE',
            student: match,
            checksumValid: true,
            serverMessage: 'CRITICAL WARNING: Concurrent active enrollment flagged in Central AICTE Registry.',
            verifiedAt: new Date().toLocaleString()
          });
        } else if (match.verificationStatus === 'DISCREPANCY_FLAGGED') {
          setResult({
            status: 'DISCREPANCY',
            student: match,
            checksumValid: true,
            serverMessage: match.discrepancyReason || 'Profile discrepancy detected against DigiLocker Aadhaar KYC.',
            verifiedAt: new Date().toLocaleString()
          });
        } else {
          setResult({
            status: 'VERIFIED',
            student: match,
            checksumValid: true,
            serverMessage: 'Digitally authenticated via DigiLocker eKYC & AICTE Central Node',
            verifiedAt: new Date().toLocaleString()
          });
        }
      } else {
        // Unregistered new student with valid checksum
        setResult({
          status: 'VERIFIED',
          student: {
            id: 'STU-NEW-2026',
            apaarId: idToVerify,
            name: 'Kavya S. Nambiar',
            aadhaarName: 'Kavya S. Nambiar',
            dob: '2005-02-18',
            gender: 'Female',
            email: 'kavya.nambiar@dtu.ac.in',
            phone: '+91 98201 44921',
            rollNumber: '2024/CSE/204',
            institutionId: 'INST-DTU-01',
            institutionName: 'Delhi Technological University (DTU)',
            aictePermanentId: '1-432890123',
            program: 'B.Tech Computer Science & Engineering',
            department: 'Computer Science & Engineering',
            batchYear: '2024-2028',
            currentSemester: 2,
            quota: 'AICTE Sanctioned',
            verificationStatus: 'VERIFIED',
            aadhaarLinked: true,
            digiLockerSynced: true,
            abcAccountId: 'ABC-6921-9941',
            abcCreditsEarned: 44,
            verificationTimestamp: new Date().toLocaleString(),
            avatarSeed: 'kavya'
          },
          checksumValid: true,
          serverMessage: 'New enrollment authenticated. Verified against National Academic Depository (NAD).',
          verifiedAt: new Date().toLocaleString()
        });
      }
    }, 650);
  };

  const handlePreset = (presetId: string) => {
    setInputVal(presetId);
    runVerification(presetId);
  };

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900">Real-Time APAAR ID Verification Engine</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verify 12-digit APAAR numbers using mathematical Verhoeff checksum & simulated MoE DigiLocker gateway.
            </p>
          </div>

          {/* Quick presets for test evaluation */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Test Scenarios:</span>
            <button
              onClick={() => handlePreset('9042-3819-5502')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              ✓ Verified Student
            </button>
            <button
              onClick={() => handlePreset('9124-5820-1928')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              ⚠ Duplicate Conflict
            </button>
            <button
              onClick={() => handlePreset('8491-2940-1092')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              ⚠ DOB Mismatch
            </button>
            <button
              onClick={() => handlePreset('1234-5678-9999')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              ✕ Bad Checksum
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={inputVal}
              onChange={handleInputChange}
              placeholder="e.g. 9042-3819-5502"
              maxLength={14}
              className="w-full px-4 py-3.5 pl-11 text-lg font-mono tracking-widest bg-stone-50 border border-stone-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800"
            />
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            
            {inputVal.replace(/\D/g, '').length === 12 && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs">
                {validateVerhoeffChecksum(inputVal.replace(/\D/g, '')) ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Checksum Valid
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[10px]">
                    <XCircle className="w-3.5 h-3.5" /> Checksum Failed
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => runVerification(inputVal)}
            disabled={isVerifying}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Querying Gateway...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Authenticate APAAR ID
              </>
            )}
          </button>
        </div>
      </div>

      {/* Verification Result Cards */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Official APAAR ID Digital Card */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Verification Status Alert Banner */}
            <div
              className={`p-4 rounded-3xl border flex items-start gap-3.5 shadow-sm ${
                result.status === 'VERIFIED'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : result.status === 'DUPLICATE'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : result.status === 'DISCREPANCY'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="mt-0.5">
                {result.status === 'VERIFIED' && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
                {result.status === 'DUPLICATE' && <AlertTriangle className="w-6 h-6 text-rose-600 animate-pulse" />}
                {result.status === 'DISCREPANCY' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
                {result.status === 'INVALID_CHECKSUM' && <XCircle className="w-6 h-6 text-rose-600" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">
                    {result.status === 'VERIFIED' && 'APAAR Record Verified & Confirmed'}
                    {result.status === 'DUPLICATE' && 'Duplicate Enrollment Flag Triggered!'}
                    {result.status === 'DISCREPANCY' && 'Identity & Quota Discrepancy Flagged'}
                    {result.status === 'INVALID_CHECKSUM' && 'Invalid APAAR Number Format'}
                  </h3>
                  {result.verifiedAt && (
                    <span className="text-[10px] text-slate-500">{result.verifiedAt}</span>
                  )}
                </div>
                <p className="text-xs mt-1 leading-relaxed">{result.serverMessage}</p>
              </div>
            </div>

            {/* Simulated Digital APAAR Card */}
            {result.student && (
              <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-md p-6 relative overflow-hidden">
                {/* Top Card Bar with Government of India and AICTE Emblem */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-900 text-amber-400 font-extrabold flex items-center justify-center text-sm shadow">
                      AICTE
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ministry of Education, Govt. of India</p>
                      <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">AUTOMATED PERMANENT ACADEMIC ACCOUNT REGISTRY</h4>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full uppercase">
                      APAAR ID CARD
                    </span>
                  </div>
                </div>

                {/* Card Content Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                  
                  {/* Student Photo Simulation */}
                  <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-3xl font-black flex items-center justify-center shadow-md mb-2">
                      {result.student.name.charAt(0)}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ DigiLocker eKYC
                    </span>
                  </div>

                  {/* Student Details */}
                  <div className="sm:col-span-2 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">Student Full Name</span>
                      <p className="font-extrabold text-base text-slate-900">{result.student.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-bold">12-Digit APAAR ID</span>
                        <p className="font-mono font-black text-blue-700 text-sm tracking-wider">{result.student.apaarId}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-bold">ABC Account ID</span>
                        <p className="font-mono font-bold text-indigo-700">{result.student.abcAccountId}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-bold">DOB & Gender</span>
                        <p className="font-medium text-slate-800">{result.student.dob} • {result.student.gender}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-bold">Roll / Enrollment No.</span>
                        <p className="font-mono font-semibold text-slate-800">{result.student.rollNumber}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">Institution Affiliation</span>
                      <p className="font-semibold text-slate-800 leading-snug">{result.student.institutionName}</p>
                      <p className="text-[10px] text-slate-400">AICTE Permanent ID: {result.student.aictePermanentId}</p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] border-t border-stone-200">
                      <span className="text-slate-500 font-medium">{result.student.program}</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {result.student.abcCreditsEarned} ABC Credits
                      </span>
                    </div>
                  </div>

                </div>

                {/* Digital Card Footer */}
                <div className="mt-4 pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cryptographically Signed via MoE Digital Token</span>
                  </div>
                  <div className="font-mono">
                    SHA256: {generateSha256Simulated(result.student.apaarId)}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right 1 Col: Verhoeff Mathematical Anatomy & Security Specs */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Verhoeff Algorithm Breakdown
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              APAAR IDs utilize the Verhoeff error detection algorithm based on the dihedral group D5 of order 10.
            </p>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">11 Data Digits:</span>
                <span className="font-mono font-bold text-slate-800">{inputVal.replace(/\D/g, '').slice(0, 11) || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">12th Verhoeff Check Digit:</span>
                <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {inputVal.replace(/\D/g, '').slice(11, 12) || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Permutation Matrix P(i mod 8):</span>
                <span className="text-emerald-700 font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Single-digit error detection:</span>
                <span className="font-bold text-slate-800">100%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Adjacent transposition check:</span>
                <span className="font-bold text-slate-800">100%</span>
              </div>
            </div>

            <div className="border-t border-stone-200 pt-3">
              <h4 className="text-xs font-bold text-slate-800 mb-2">Interoperability Standards</h4>
              <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
                <li>National Educational Technology Forum (NETF)</li>
                <li>DigiLocker W3C Verifiable Credentials</li>
                <li>Academic Bank of Credits (NEP 2020)</li>
                <li>AICTE Central Seat Matrix Gateway</li>
              </ul>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
