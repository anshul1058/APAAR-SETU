import React, { useState } from 'react';
import { ArrowLeft, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { VerificationSession } from '../../types';
import { verificationService } from '../../services/verificationService';

const DIGILOCKER_LOGO = 'https://cdn.digilocker.gov.in/assets/img/icons/digilocker-w.png';

export const DigiLockerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialSession = (location.state as { session?: VerificationSession } | null)?.session;
  const [session, setSession] = useState<VerificationSession | null>(initialSession || null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const allowAccess = async () => {
    if (!session) return;
    setBusy(true); setError('');
    try { setSession(await verificationService.continueToPhone(session.sessionToken)); }
    catch (err: any) { setError(err.message || 'Unable to continue.'); }
    finally { setBusy(false); }
  };

  const sendOtp = async () => {
    if (!session) return;
    setBusy(true); setError('');
    try {
      // OTP + result are handled on the Verification Desk; hand the session back there
      const updated = await verificationService.requestOtp(session.sessionToken, phone);
      setSession(updated);
      navigate('/verifier/portal', { state: { session: updated } });
    }
    catch (err: any) { setError(err.message || 'Unable to send OTP.'); }
    finally { setBusy(false); }
  };

  if (!session) {
    return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><div className="rounded-2xl bg-white p-8 text-center shadow-sm"><p className="text-sm text-slate-600">No DigiLocker verification session found.</p><button onClick={() => navigate('/verifier/portal')} className="mt-4 text-sm font-bold text-[#5b2a86]">Return to Verification Desk</button></div></div>;
  }

  return (
    <div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#f6f0fa] px-4 py-8 md:-m-8 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between">
          <button onClick={() => navigate('/verifier/portal')} className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#5b2a86]"><ArrowLeft className="h-4 w-4" /> Back to Verification Desk</button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Secure DigiLocker connection</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#dfc9ef] bg-white shadow-xl shadow-purple-900/10">
          <div className="bg-[#5b2a86] px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[#4a216f]"><img src={DIGILOCKER_LOGO} alt="DigiLocker" className="h-8 w-8 object-contain" /></div>
              <div><p className="text-lg font-bold">DigiLocker</p><p className="text-[10px] uppercase tracking-[0.18em] text-purple-100">Document Wallet to Empower Citizens</p></div>
              <Lock className="ml-auto h-5 w-5 text-purple-100" />
            </div>
          </div>

          {session.step === 'DIGILOCKER' && <div className="space-y-6 p-8">
            <div><h1 className="text-2xl font-extrabold text-slate-900">Give access to your APAAR ID?</h1><p className="mt-2 text-sm text-slate-500">APAAR Setu is requesting access through your DigiLocker account.</p></div>
            <div className="rounded-xl border border-purple-100 bg-[#faf7fc] p-4 text-sm"><p className="font-bold text-slate-800">Requested permission</p><p className="mt-2 text-slate-600">Verify APAAR ID <span className="font-mono font-bold text-[#5b2a86]">{session.maskedApaarId}</span> against the APAAR Setu registry.</p></div>
            <div className="flex items-start gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" /> You are in control. Only the requested identity details will be shared after consent.</div>
            <div className="flex gap-3"><button onClick={() => navigate('/verifier/portal')} className="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-bold text-slate-600">Deny</button><button onClick={allowAccess} disabled={busy} className="flex-1 rounded-xl bg-[#5b2a86] py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Opening…' : 'Allow access'}</button></div>
          </div>}

          {session.step === 'PHONE_WAIT' && <div className="space-y-6 p-8">
            <div><h1 className="text-2xl font-extrabold text-slate-900">Login or Create Account</h1><p className="mt-2 text-sm text-slate-500">Enter your mobile number to proceed</p></div>
            <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Mobile number</label><div className="flex gap-2"><span className="flex items-center rounded-xl border border-stone-300 bg-stone-50 px-3 font-semibold text-slate-600">+91</span><input autoFocus value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="flex-1 rounded-xl border border-stone-300 px-4 py-3 font-mono tracking-wider outline-none focus:border-[#5b2a86] focus:ring-4 focus:ring-purple-500/10" placeholder="10-digit mobile number" /></div><p className="mt-2 text-[11px] text-slate-400">A one-time password will be sent to this number. By continuing, you agree to the Terms of Service.</p></div>
            <button onClick={sendOtp} disabled={busy || phone.length !== 10} className="w-full rounded-xl bg-[#5b2a86] py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Sending OTP…' : 'Continue'}</button>
          </div>}

          {session.step !== 'DIGILOCKER' && session.step !== 'PHONE_WAIT' && <div className="space-y-5 p-8 text-center">
            <h1 className="text-xl font-extrabold text-slate-900">Continue on the Verification Desk</h1>
            <button onClick={() => navigate('/verifier/portal', { state: { session } })} className="rounded-xl bg-[#5b2a86] px-6 py-3 text-sm font-bold text-white">Return to Verification Desk</button>
          </div>}
        </div>
        {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
        <div className="mt-5 text-center text-[11px] text-slate-400">DigiLocker aims at digital empowerment by providing access to authentic digital documents.</div>
      </div>
    </div>
  );
};
