import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Lock, Mail, ShieldAlert, Sparkles, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';

type AuthMode = 'login' | 'forgot' | 'reset' | 'activate';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot / Reset / Activate state
  const [resetEmail, setResetEmail] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const queryMode = searchParams.get('mode');
    const queryToken = searchParams.get('token');
    const queryEmail = searchParams.get('email');

    if (queryMode === 'reset' || queryMode === 'activate') {
      setMode(queryMode);
    }
    if (queryToken) {
      setTokenInput(queryToken);
    }
    if (queryEmail) {
      setResetEmail(queryEmail);
      setIdentifier(queryEmail);
    }
  }, [searchParams]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { identifier, password });
      if (res.data.success && res.data.data) {
        const { token, user } = res.data.data;
        login(token, user);

        if (user.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else if (user.role === 'HR') {
          navigate('/hr/dashboard', { replace: true });
        } else {
          navigate('/employee/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors?.length
          ? err.response.data.errors.map((e: any) => `${e.field || 'Error'}: ${e.message}`).join('. ')
          : 'Invalid credentials or server unreachable. Please verify your email/ID and password.');
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: resetEmail });
      setSuccessMessage(
        res.data?.message ||
          'If an account with that email exists, password reset instructions have been sent.'
      );
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Unable to process password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetOrActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setErrorMessage('Password must be at least 8 characters and include both letters and numbers.');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = mode === 'activate' ? '/auth/activate-account' : '/auth/reset-password';
      const payload =
        mode === 'activate'
          ? { token: tokenInput.trim(), newPassword }
          : { token: tokenInput.trim(), email: resetEmail || undefined, newPassword };

      const res = await api.post(endpoint, payload);
      setSuccessMessage(res.data?.message || 'Password updated successfully! You can now sign in.');
      setTokenInput('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setMode('login');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (role: 'ADMIN' | 'HR' | 'EMPLOYEE') => {
    setMode('login');
    setErrorMessage('');
    if (role === 'ADMIN') {
      setIdentifier('admin@nexuspayroll.com');
      setPassword('Admin@12345');
    } else if (role === 'HR') {
      setIdentifier('hr@nexuspayroll.com');
      setPassword('Hr@12345');
    } else {
      setIdentifier('rahul.sharma@nexuspayroll.com');
      setPassword('Emp@12345');
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-extrabold text-2xl shadow-xl shadow-cyan-500/20 mb-4 border border-cyan-400/30">
          N
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">NEXUS</h2>
        <p className="mt-2 text-sm text-cyan-400 font-medium">Payroll, without the paperwork.</p>
        <p className="mt-1 text-xs text-slate-400">Enterprise Indian Payroll SaaS Platform</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-200/80">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-sm text-rose-700">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-sm text-emerald-700">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'login' && (
            <form className="space-y-5" onSubmit={handleLoginSubmit}>
              <Input
                label="Email Address or Employee ID"
                placeholder="e.g. admin@nexuspayroll.com or EMP-101"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-slate-600 font-medium">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full text-base font-semibold"
                isLoading={isLoading}
              >
                Sign In to NEXUS
              </Button>
            </form>
          )}

          {mode === 'forgot' && (
            <form className="space-y-5" onSubmit={handleForgotSubmit}>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reset Your Password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your registered work email address to receive a single-use password reset token.
                </p>
              </div>

              <Input
                label="Registered Email Address"
                type="email"
                placeholder="name@nexuspayroll.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                Send Password Reset Link
              </Button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 cursor-pointer"
                >
                  Have a reset token?
                </button>
              </div>
            </form>
          )}

          {(mode === 'reset' || mode === 'activate') && (
            <form className="space-y-4" onSubmit={handleResetOrActivateSubmit}>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {mode === 'activate' ? 'Activate Your NEXUS Account' : 'Set New Password'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your single-use {mode === 'activate' ? 'activation' : 'reset'} token and choose a strong password (min 8 chars with letters & numbers).
                </p>
              </div>

              <Input
                label={mode === 'activate' ? 'Activation Token' : 'Password Reset Token'}
                placeholder="Paste token from email"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                icon={<KeyRound className="w-4 h-4" />}
                required
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Minimum 8 chars (letters + numbers)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                {mode === 'activate' ? 'Activate Account & Save Password' : 'Update Password'}
              </Button>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Quick Evaluation Credentials Autofill */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Seeded Database Logins
              </span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('ADMIN')}
                className="py-2 px-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span className="text-cyan-700 font-bold">Admin</span>
                <span className="text-[10px] text-slate-500">Full Access</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('HR')}
                className="py-2 px-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span className="text-blue-700 font-bold">HR</span>
                <span className="text-[10px] text-slate-500">Ops / Leaves</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('EMPLOYEE')}
                className="py-2 px-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span className="text-indigo-700 font-bold">Employee</span>
                <span className="text-[10px] text-slate-500">Self Portal</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          Protected by enterprise JWT authorization & secure bcrypt encryption.
        </div>
      </div>
    </div>
  );
};
