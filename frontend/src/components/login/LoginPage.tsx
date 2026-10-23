import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Award, 
  AlertCircle, 
  QrCode, 
  Settings 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_PRESETS, authService } from '../../services/authService';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@dtu.ac.in');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('institution_admin');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const from = (location.state as any)?.from?.pathname || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter an institutional email address.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(email, selectedRole);
      const destination = from || authService.getDefaultPathForRole(user.role);
      navigate(destination, { replace: true });
    } catch {
      setErrorMessage('Login authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetSelect = (presetRole: UserRole) => {
    const preset = ROLE_PRESETS.find((p) => p.role === presetRole) || ROLE_PRESETS[0];
    setEmail(preset.email);
    setSelectedRole(presetRole);
    setPassword('aicte@2026#secure');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full bg-warm-grid flex flex-col justify-between items-center relative overflow-x-hidden selection:bg-blue-100">
      
      {/* Top AICTE / APAAR Institutional Branding Header */}
      <header className="w-full max-w-6xl px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">APAAR AICTE</span>
              <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                SIH 2026 • PS 26263
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">One Nation, One Student ID Verification Platform</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600 bg-white/70 backdrop-blur-md px-4 py-2 rounded-full border border-stone-200/80 shadow-2xs">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Central MoE Gateway: <strong>ONLINE (Demo Mode)</strong></span>
        </div>
      </header>

      {/* Main Login Centerpiece adhering to Image 1 and Image 2 */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8 z-10">
        
        {/* Role Quick Selector Pills for SIH Demonstration */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 max-w-lg">
          <button
            type="button"
            onClick={() => handlePresetSelect('institution_admin')}
            className={`text-xs px-3.5 py-1.5 rounded-full transition-all font-medium flex items-center gap-1.5 shadow-2xs ${
              selectedRole === 'institution_admin'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white/80 text-slate-600 hover:bg-white border border-stone-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Institution Admin
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('aicte_officer')}
            className={`text-xs px-3.5 py-1.5 rounded-full transition-all font-medium flex items-center gap-1.5 shadow-2xs ${
              selectedRole === 'aicte_officer'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white/80 text-slate-600 hover:bg-white border border-stone-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            AICTE Officer
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('aicte_admin')}
            className={`text-xs px-3.5 py-1.5 rounded-full transition-all font-medium flex items-center gap-1.5 shadow-2xs ${
              selectedRole === 'aicte_admin'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white/80 text-slate-600 hover:bg-white border border-stone-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            AICTE Apex Admin
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('verifier')}
            className={`text-xs px-3.5 py-1.5 rounded-full transition-all font-medium flex items-center gap-1.5 shadow-2xs ${
              selectedRole === 'verifier'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white/80 text-slate-600 hover:bg-white border border-stone-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Verifier Desk
          </button>
        </div>

        {/* Outer relative container to allow the gradient pill button to overlap card bottom exactly like Image 1 */}
        <div className="relative w-full max-w-[390px] pb-7">
          
          {/* LOGIN CARD - Exact Neumorphic Squircle Recreation from Image 1 */}
          <div className="login-card-reference px-9 pt-9 pb-12 w-full border border-stone-200/60 bg-white">
            
            {/* Login Heading matching Image 1 */}
            <div className="mb-8">
              <h1 className="text-3xl font-normal text-slate-700 tracking-tight">Login</h1>
              <p className="text-xs text-slate-400 mt-1 font-normal">
                Sign in to access AICTE student verification
              </p>
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-7">
              {/* Email Input - Minimal underline with Mail icon on right (Image 1) */}
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username@mail.com"
                  required
                  className="w-full pb-2 pt-1 text-slate-700 placeholder:text-slate-400 text-base bg-transparent underline-input pr-8 focus:outline-none transition-colors"
                />
                <label htmlFor="email" className="sr-only">Email</label>
                <div className="absolute right-1 bottom-3 text-slate-400 pointer-events-none">
                  <Mail className="w-5 h-5 stroke-[1.6]" />
                </div>
              </div>

              {/* Password Input - Minimal underline with Eye toggle on right (Image 1) */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  className="w-full pb-2 pt-1 text-slate-700 placeholder:text-slate-400 text-base bg-transparent underline-input pr-8 tracking-wider focus:outline-none transition-colors"
                />
                <label htmlFor="password" className="sr-only">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 bottom-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 stroke-[1.6]" />
                  ) : (
                    <Eye className="w-5 h-5 stroke-[1.6]" />
                  )}
                </button>
              </div>

              {/* Remember Me & Forget Password Link (Image 1) */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-500">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-400 border-gray-300"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-slate-500 hover:text-slate-700 underline underline-offset-2 decoration-slate-300 transition-colors"
                >
                  Forget Password?
                </button>
              </div>
            </form>
          </div>

          {/* BLUE-TO-VIOLET GRADIENT PILL BUTTON (Image 1 recreation) */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-48 z-20">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              type="button"
              className="w-full py-3.5 px-6 rounded-full text-white font-medium text-base tracking-wide flex items-center justify-center gap-2 btn-gradient-pill focus:outline-none focus:ring-4 focus:ring-blue-400/40"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>

        </div>

        {/* Institutional Accreditation Note */}
        <div className="mt-8 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
          <p className="flex items-center gap-1.5 font-medium text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 inline" />
            AICTE & Academic Bank of Credits (ABC) Unified Gateway
          </p>
          <p className="text-[11px] text-slate-400">
            Compliant with NEP 2020 Multi-Disciplinary Framework & UIDAI eKYC standards
          </p>
        </div>

      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-stone-200">
            <h3 className="text-lg font-bold text-slate-900">Reset Credentials</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Enter your AICTE registered institutional email to receive an OTP.
            </p>

            {forgotSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <p className="font-semibold mb-1">Recovery OTP Dispatched!</p>
                <p>A password reset link has been dispatched to <strong>{forgotEmail}</strong>.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotSuccess(false);
                  }}
                  className="mt-3 w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Institutional Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. registrar@dtu.ac.in"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium border border-gray-200 text-slate-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (forgotEmail) setForgotSuccess(true);
                    }}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Send OTP
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full text-center py-4 text-[11px] text-slate-400">
        © 2026 Ministry of Education & All India Council for Technical Education (AICTE).
      </footer>
    </div>
  );
};
