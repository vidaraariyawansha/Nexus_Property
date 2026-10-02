import React, { useState } from 'react';
import { api } from '../api/client';
import {
  Building2,
  Mail,
  Lock,
  KeyRound,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';

interface ForgotPasswordPageProps {
  onNavigate: (view: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<{ demoToken?: string }>('/api/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      setNoticeMessage('If an account exists for this email, password reset instructions have been sent.');
      if (res.demoToken) {
        setDemoToken(res.demoToken);
        setTokenInput(res.demoToken);
      }
      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', {
        token: tokenInput.trim(),
        newPassword,
        confirmPassword,
      });
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired password reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <Building2 className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
            {step === 'request' && 'Reset your password'}
            {step === 'reset' && 'Create a new password'}
            {step === 'success' && 'Password updated successfully'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {step === 'request' && 'Enter the email associated with your Nexus Property account.'}
            {step === 'reset' && 'Set a strong new password with at least 8 characters.'}
            {step === 'success' && 'You may now sign in with your updated credentials.'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: REQUEST RESET LINK */}
          {step === 'request' && (
            <form onSubmit={handleRequest} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your registered email address and we'll dispatch a single-use, 1-hour secure password reset link.
              </p>

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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-3 text-center">
                <span className="text-xs text-slate-500">Remember your password? </span>
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

          {/* STEP 2: ENTER TOKEN & NEW PASSWORD */}
          {step === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              {noticeMessage && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  {noticeMessage}
                </div>
              )}

              {demoToken && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Single-Use Security Token Dispatched</span>
                  </div>
                  <p className="text-[11px] text-indigo-700">
                    Testing note: Token pre-filled below for instant verification.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Verification Token
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    placeholder="Paste single-use security token"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
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
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
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

              {/* Password Strength Indicator */}
              <PasswordStrengthIndicator
                password={newPassword}
                confirmPassword={confirmPassword}
                showMatchStatus={true}
              />

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('request')}
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
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'success' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-slate-900">
                Password Successfully Reset
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Your password has been securely updated and previous reset tokens invalidated. You may now sign in.
              </p>

              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
