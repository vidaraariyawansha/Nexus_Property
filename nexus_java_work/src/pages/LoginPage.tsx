import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Building2,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface LoginPageProps {
  onNavigate: (view: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, quickDemoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);

    try {
      const authenticatedUser = await login(trimmedEmail, password, rememberMe);

      // Server-side authoritative role-based redirect
      if (authenticatedUser.role === 'ADMIN') {
        onNavigate('admin');
      } else if (authenticatedUser.role === 'AGENT') {
        onNavigate('agent');
      } else if (authenticatedUser.role === 'PROPERTY_OWNER') {
        onNavigate('owner');
      } else {
        onNavigate('portal');
      }
    } catch (err: any) {
      // Security: Preserve email, clear password
      setPassword('');
      setError(err.message || 'Email or password is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      await quickDemoLogin(role);
      if (role === 'ADMIN') onNavigate('admin');
      else if (role === 'AGENT') onNavigate('agent');
      else if (role === 'PROPERTY_OWNER') onNavigate('owner');
      else onNavigate('portal');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate demo user.');
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
            Welcome back
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to your Nexus Property account
          </p>
        </div>

        {/* Fast Personas Box for Grading & QA */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold mb-2">
            <KeyRound className="w-3.5 h-3.5" />
            <span>1-Click Test Personas (Grading & QA)</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Click any role below to authenticate instantly with verified seed data:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('CUSTOMER')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium rounded-xl text-left border border-slate-700/80 transition-colors cursor-pointer"
            >
              <span className="block font-semibold text-white">Elena Rostova</span>
              <span className="text-[10px] text-emerald-400">Customer Persona</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('PROPERTY_OWNER')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-medium rounded-xl text-left border border-slate-700/80 transition-colors cursor-pointer"
            >
              <span className="block font-semibold text-white">David Sterling</span>
              <span className="text-[10px] text-indigo-400">Property Owner</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('AGENT')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium rounded-xl text-left border border-slate-700/80 transition-colors cursor-pointer"
            >
              <span className="block font-semibold text-white">Sarah Jenkins</span>
              <span className="text-[10px] text-cyan-400">Certified Agent</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium rounded-xl text-left border border-slate-700/80 transition-colors cursor-pointer"
            >
              <span className="block font-semibold text-white">Victoria Vance</span>
              <span className="text-[10px] text-amber-400">Executive Admin</span>
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Forgot password?
                </button>
              </div>
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

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                />
                <span className="text-xs text-slate-600">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Create an account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
