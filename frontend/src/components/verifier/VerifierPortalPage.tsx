import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Key, 
  Camera, 
  Printer, 
  Sparkles
} from 'lucide-react';
import { formatApaarId } from '../../utils/apaarValidator';
import { verificationService } from '../../services/verificationService';
import { VerificationSession } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

export const VerifierPortalPage: React.FC = () => {
  const { openAiWithContext } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [inputVal, setInputVal] = useState('9042-3819-5502');
  // handed over by the DigiLocker consent page once the OTP has been requested
  const [session, setSession] = useState<VerificationSession | null>(
    () => (location.state as { session?: VerificationSession } | null)?.session ?? null
  );
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showQrCamera, setShowQrCamera] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // OTP Countdown timer
  useEffect(() => {
    if (!session || session.step !== 'OTP_WAIT' || session.otpCountdown <= 0) return;

    const timer = setInterval(() => {
      setSession((prev) => (prev ? { ...prev, otpCountdown: prev.otpCountdown - 1 } : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.otpCountdown, session?.step]);

  const handleStartVerification = async (apaarToUse?: string) => {
    const val = apaarToUse || inputVal;
    setErrorMessage('');
    setIsVerifying(true);

    try {
      const newSession = await verificationService.startVerification(val);
      navigate('/verifier/digilocker', { state: { session: newSession } });
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification initiation failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      val = val.slice(-1);
    }

    const copy = [...otpDigits];
    copy[index] = val;
    setOtpDigits(copy);

    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    if (!session) return;
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP code.');
      return;
    }

    setErrorMessage('');
    setIsVerifying(true);

    try {
      const updated = await verificationService.verifyOtp(session.sessionToken, fullOtp);
      setSession(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed.');
      // attemptsLeft is tracked server-side by the service; re-render from the mutated session
      setSession((prev) => (prev ? { ...prev } : null));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!session) return;
    try {
      await verificationService.resendOtp(session.sessionToken);
      setSession((prev) => (prev ? { ...prev, otpCountdown: 60 } : null));
      setErrorMessage('');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleSimulateQrScan = (scannedApaar: string) => {
    setShowQrCamera(false);
    setInputVal(scannedApaar);
    handleStartVerification(scannedApaar);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">APAAR Identity Verification & OTP Desk</h1>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase font-mono">
                  Live Terminal
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Spot-verify candidate APAAR IDs through DigiLocker consent, mobile OTP, and registry lookup.
              </p>
            </div>
          </div>
        </div>

        {/* Quick test scenarios */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">Presets:</span>
          <button
            onClick={() => {
              setInputVal('9042-3819-5502');
              handleStartVerification('9042-3819-5502');
            }}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            ✓ Valid Student
          </button>
          <button
            onClick={() => {
              setInputVal('9999-0000-1111');
              handleStartVerification('9999-0000-1111');
            }}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
          >
            ⚠ Tampered Alert
          </button>
          <button
            onClick={() => {
              setInputVal('0227-6804-0250');
              handleStartVerification('0227-6804-0250');
            }}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
          >
            ⚠ Duplicate Conflict
          </button>
        </div>
      </div>

      {/* Input Bar & QR Scanner Trigger */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(formatApaarId(e.target.value))}
              placeholder="Enter the APAAR ID"
              maxLength={14}
              className="w-full px-4 py-3 pl-11 text-base font-mono tracking-widest bg-stone-50 border border-stone-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800"
            />
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <button
            type="button"
            onClick={() => setShowQrCamera(true)}
            className="px-4 py-3 rounded-none bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-semibold flex items-center gap-2 border border-stone-200 transition-colors w-full sm:w-auto justify-center"
          >
            <Camera className="w-4 h-4 text-slate-600" />
            Scan QR Code
          </button>

          <button
            type="button"
            onClick={() => handleStartVerification()}
            disabled={isVerifying}
            className="px-6 py-3 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Querying Gateway...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Initiate Verification
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Example APAAR ID: <code className="font-mono font-semibold text-slate-600">9042-3819-5502</code>
        </p>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Verification Stages */}
      {session && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Step 1: 6-Digit OTP Desk */}
          {session.step === 'OTP_WAIT' && (
            <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-[#dfc9ef] bg-white shadow-xs space-y-6">
              <div className="bg-[#5b2a86] px-6 py-4 text-white flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#5b2a86] font-black">D</div><div><p className="font-bold">DigiLocker</p><p className="text-[10px] text-purple-100">One-time password verification</p></div></div>
              <div className="px-6 pb-6 space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Step 2: Candidate Consent OTP</h3>
                  <p className="text-xs text-slate-500">
                    A secure 6-digit consent OTP has been dispatched to candidate's Aadhaar-linked mobile (<strong>{session.maskedApaarId}</strong>).
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    session.attemptsLeft <= 2 ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {session.attemptsLeft} of 5 Attempts Remaining
                  </span>
                </div>
              </div>

              {session.demoOtp && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  SMS provider not configured — demo OTP: <strong className="font-mono">{session.demoOtp}</strong>
                </div>
              )}

              {/* 6-Digit OTP Boxes */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 py-4">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono font-black text-xl bg-stone-50 border-2 border-stone-300 rounded-2xl focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all text-slate-900"
                  />
                ))}
              </div>

              {/* Countdown & Resend */}
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
                <div className="text-slate-500">
                  {session.otpCountdown > 0 ? (
                    <span>Resend OTP available in: <strong className="font-mono text-slate-800">{session.otpCountdown}s</strong></span>
                  ) : (
                    <button
                      onClick={handleResendOtp}
                      className="text-blue-600 hover:text-blue-800 font-bold underline"
                    >
                      Resend OTP Code
                    </button>
                  )}
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || session.attemptsLeft <= 0}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Verify & Authenticate Record
                </button>
              </div>
              </div>
            </div>
          )}

          {/* Step 2: Verification Result (Authentic vs Tampered) */}
          {(session.step === 'SUCCESS' || session.step === 'TAMPERED' || session.step === 'NOT_FOUND') && (
            <div className="lg:col-span-2 space-y-4">
              
              {/* Result Status Stamp Card */}
              <div
                className={`p-5 rounded-3xl border flex items-start gap-3.5 shadow-xs ${
                  session.step === 'SUCCESS'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                {session.step === 'SUCCESS' ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-7 h-7 text-rose-600 shrink-0" />
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm uppercase tracking-wide">
                      {session.step === 'SUCCESS' ? 'VERIFIED & AUTHENTIC RECORD' : session.step === 'NOT_FOUND' ? 'FLAGGED / APAAR ID NOT FOUND' : 'FLAGGED / TAMPERED RECORD ALERT!'}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">{session.result?.timestamp}</span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed">
                    {session.step === 'SUCCESS'
                      ? 'Cryptographically authenticated against DigiLocker W3C Verifiable Credentials & AICTE Central Node.'
                      : session.result?.tamperReason}
                  </p>
                </div>
              </div>

              {/* Signed verifiable record (backend /verify/confirm response) */}
              {session.result?.payload && (
                <div className="bg-white rounded-3xl border-2 border-stone-200 p-6 shadow-sm relative space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-900 text-amber-400 font-extrabold flex items-center justify-center text-sm shadow-xs">
                        AICTE
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">APAAR Setu Signed Verification</p>
                        <h4 className="text-sm font-extrabold text-slate-900">SIGNED ACADEMIC RECORD</h4>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                      session.result.verified
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {session.result.payload.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="flex items-center justify-center">
                      <div className="w-28 h-28 rounded-2xl border-2 border-stone-200 p-1 bg-white">
                        {session.result.qrDataUrl && <img src={session.result.qrDataUrl} alt="Re-verification QR" className="w-full h-full rounded-xl" />}
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400">Masked APAAR ID</span>
                          <p className="font-mono font-bold text-blue-700">{session.result.payload.apaar_id}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400">Academic year</span>
                          <p className="font-mono font-bold text-indigo-700">{session.result.payload.academic_year}</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Institutional Affiliation</span>
                        <p className="font-semibold text-slate-800">{session.result.payload.institution}</p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Course</span>
                        <p className="font-semibold text-slate-800">{session.result.payload.course}</p>
                      </div>

                      <div className="pt-2 border-t border-stone-100 text-[11px] space-y-1">
                        <p>Issued: <strong>{new Date(session.result.payload.issued_at).toLocaleString()}</strong></p>
                        <p className="font-mono text-slate-500 break-all">Ed25519: {session.result.signature?.slice(0, 44)}…</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-stone-100 pt-3">
                    <button onClick={() => window.print()} className="px-4 py-2 rounded-xl border border-stone-200 text-slate-700 hover:bg-stone-50 font-semibold text-xs flex items-center gap-2 transition-colors">
                      <Printer className="w-3.5 h-3.5" />
                      Print / Save
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Right 1 Col: Registry verification details */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              APAAR Registry Inspection
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The registry lookup confirms whether the authenticated APAAR ID exists in the institutional database.
            </p>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">APAAR digits:</span>
                <span className="font-mono font-bold text-slate-800">{inputVal.replace(/\D/g, '') || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Format:</span>
                <span className="font-bold text-blue-700">12 numeric digits</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Final authority:</span>
                <span className="font-bold text-slate-800">Registry match</span>
              </div>
            </div>

            <button
              onClick={() => openAiWithContext(`Explain the verification result for APAAR ${inputVal}`)}
              className="w-full py-2.5 rounded-xl border border-stone-200 text-slate-700 hover:bg-stone-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              AI Security Verification Check
            </button>
          </div>

        </div>
      )}

      {/* QR Scanner Simulation Modal */}
      {showQrCamera && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4 text-center">
            <h3 className="font-bold text-base text-slate-900">DigiLocker QR Code Viewfinder</h3>
            <p className="text-xs text-slate-500">Simulating live mobile camera scanner</p>

            <div className="relative w-56 h-56 mx-auto bg-slate-950 rounded-2xl border-4 border-dashed border-blue-500 flex items-center justify-center overflow-hidden">
              <QrCode className="w-32 h-32 text-slate-700" />
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse top-1/2"></div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleSimulateQrScan('9042-3819-5502')}
                className="w-full py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700"
              >
                Scan Valid Student QR (Aarav Sharma)
              </button>
              <button
                onClick={() => handleSimulateQrScan('9999-0000-1111')}
                className="w-full py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700"
              >
                Scan Tampered QR (Security Alert)
              </button>
              <button
                onClick={() => setShowQrCamera(false)}
                className="w-full py-2 rounded-xl border border-stone-200 text-slate-600 text-xs hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
