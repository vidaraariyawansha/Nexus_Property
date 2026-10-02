import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Home,
  Briefcase,
  KeyRound,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { isValidSriLankanPhone, normalizeSriLankanPhone } from '../utils/sriLankaUtils';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';

interface RegisterPageProps {
  onNavigate: (view: string) => void;
  onOpenProfile?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate, onOpenProfile }) => {
  const { register, verifyEmail, resendVerification } = useAuth();

  // Multi-step Registration State: 1 = Details, 2 = Role Selection, 3 = Email Verification, 4 = Success Welcome
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'PROPERTY_OWNER' | 'AGENT'>('CUSTOMER');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification & Interaction States
  const [verificationTokenInput, setVerificationTokenInput] = useState('');
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Step 1 Validation -> Proceed to Step 2 ---
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (phone && phone.trim().length > 0 && !isValidSriLankanPhone(phone.trim())) {
      setError('Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94 77 123 4567).');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    setStep(2);
  };

  // --- Step 2 Final Submission -> Create Account ---
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        phone: phone && phone.trim().length > 0 ? normalizeSriLankanPhone(phone.trim()) : undefined,
        role,
      });

      if (res.verificationToken) {
        setDemoToken(res.verificationToken);
        setVerificationTokenInput(res.verificationToken);
      }

      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3 Email Verification ---
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await verifyEmail(verificationTokenInput);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please ensure the token is correct and unexpired.');
    } finally {
      setLoading(false);
    }
  };

  // --- Resend Verification Link ---
  const handleResend = async () => {
    setError(null);
    setResendStatus(null);
    setLoading(true);

    try {
      const res = await resendVerification(email.trim().toLowerCase());
      if (res.demoToken) {
        setDemoToken(res.demoToken);
        setVerificationTokenInput(res.demoToken);
      }
      setResendStatus('A new verification token has been generated and dispatched to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 4 Role Redirect to Dashboard ---
  const handleGoToDashboard = () => {
    if (role === 'PROPERTY_OWNER') {
      onNavigate('owner');
    } else if (role === 'AGENT') {
      onNavigate('agent');
    } else {
      onNavigate('portal');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <Building2 className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
            {step === 1 && 'Create your Nexus Property account'}
            {step === 2 && 'How will you use Nexus Property?'}
            {step === 3 && 'Verify your Email Address'}
            {step === 4 && 'Welcome to Nexus Property'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {step === 1 && 'Step 1 of 2: Personal & account credentials'}
            {step === 2 && 'Step 2 of 2: Choose your professional account type'}
            {step === 3 && `We have dispatched a verification token to ${email}`}
            {step === 4 && 'Your verified account is ready. Discover Sri Lanka\'s premier properties.'}
          </p>
        </div>

        {/* Progress Tracker Bar */}
        {(step === 1 || step === 2) && (
          <div className="flex items-center gap-2 px-2">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-slate-900' : 'bg-slate-200'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-slate-900' : 'bg-slate-200'}`} />
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resendStatus && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{resendStatus}</span>
            </div>
          )}

          {/* STEP 1: PERSONAL & ACCOUNT INFORMATION */}
          {step === 1 && (
            <form onSubmit={handleProceedToStep2} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number (Sri Lanka)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="+94 77 123 4567 or 0771234567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 focus:bg-white transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 focus:bg-white transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength & Match Indicator */}
              <PasswordStrengthIndicator
                password={password}
                confirmPassword={confirmPassword}
                showMatchStatus={true}
              />

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 mt-5 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: CHOOSE ACCOUNT TYPE */}
          {step === 2 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="space-y-3">
                {/* Customer Role Card */}
                <div
                  onClick={() => setRole('CUSTOMER')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    role === 'CUSTOMER'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      role === 'CUSTOMER' ? 'bg-slate-800 text-emerald-400' : 'bg-white text-slate-700 shadow-xs'
                    }`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">CUSTOMER</h4>
                      <p className={`text-[11px] mt-0.5 leading-snug ${
                        role === 'CUSTOMER' ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        Find, search, compare, save wishlists, and book property viewings across Sri Lanka.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Property Owner Role Card */}
                <div
                  onClick={() => setRole('PROPERTY_OWNER')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    role === 'PROPERTY_OWNER'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      role === 'PROPERTY_OWNER' ? 'bg-slate-800 text-amber-400' : 'bg-white text-slate-700 shadow-xs'
                    }`}>
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">PROPERTY OWNER</h4>
                      <p className={`text-[11px] mt-0.5 leading-snug ${
                        role === 'PROPERTY_OWNER' ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        List houses, lands, and apartments. Manage media galleries, primary photos, and pricing.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Licensed Agent Role Card */}
                <div
                  onClick={() => setRole('AGENT')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    role === 'AGENT'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      role === 'AGENT' ? 'bg-slate-800 text-cyan-400' : 'bg-white text-slate-700 shadow-xs'
                    }`}>
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">AGENT</h4>
                      <p className={`text-[11px] mt-0.5 leading-snug ${
                        role === 'AGENT' ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        Manage assigned property portfolios, conduct private viewings, and respond to buyer inquiries.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative Security Note */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Administrator privileges are restricted and require verification by Nexus Property Corporate Security.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: EMAIL VERIFICATION */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Check your inbox</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  We've sent a verification link to <span className="font-semibold text-slate-800">{email}</span>. Please verify your email to unlock all marketplace operations.
                </p>
              </div>

              {demoToken && (
                <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Single-Use Verification Token</span>
                  </div>
                  <p className="text-[11px] text-indigo-700">
                    Testing note: Token pre-filled below for instant verification.
                  </p>
                </div>
              )}

              <form onSubmit={handleVerifyEmail} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Security Token
                  </label>
                  <input
                    type="text"
                    value={verificationTokenInput}
                    onChange={e => setVerificationTokenInput(e.target.value)}
                    placeholder="Paste 64-character verification token"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-slate-900 text-slate-900"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Verify & Continue</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                >
                  Resend Verification Email
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: WELCOME SCREEN */}
          {step === 4 && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-slate-900">
                Welcome to Nexus Property!
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Your account is confirmed and fully activated. You are now logged in as a{' '}
                <span className="font-semibold text-slate-900">
                  {role === 'CUSTOMER' ? 'Customer' : role === 'PROPERTY_OWNER' ? 'Property Owner' : 'Agent'}
                </span>.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800 block">Next Recommended Steps:</span>
                <p className="text-[11px] text-slate-500">
                  Complete your profile details, set contact preferences, or upload a professional avatar photo to establish trust in the marketplace.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenProfile();
                    }}
                    className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Complete Profile & Photo</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleGoToDashboard}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
