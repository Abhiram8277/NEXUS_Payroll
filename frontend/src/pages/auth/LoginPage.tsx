import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Lock,
  Mail,
  ShieldAlert,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  Building,
  UserCheck,
  Eye,
  EyeOff,
  Sparkles,
  LogIn,
} from 'lucide-react';

type AuthMode = 'login' | 'forgot' | 'reset' | 'activate' | 'setup';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>(() => {
    return location.pathname === '/setup' || searchParams.get('mode') === 'setup' ? 'setup' : 'login';
  });
  const [isSystemChecking, setIsSystemChecking] = useState(true);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [existingAdminEmail, setExistingAdminEmail] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Standard Login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot / Reset / Activate state
  const [resetEmail, setResetEmail] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Initial Setup State
  const [setupForm, setSetupForm] = useState({
    companyName: '',
    companyTagline: 'Payroll, without the paperwork.',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    city: '',
    state: '',
  });
  const [showSetupPassword, setShowSetupPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  // Check system status on mount
  useEffect(() => {
    checkSystemStatus();
  }, [location.pathname]);

  const checkSystemStatus = async () => {
    try {
      setIsSystemChecking(true);
      const res = await api.get('/auth/system-status');
      if (res.data?.success && res.data?.data) {
        const status = res.data.data;
        setHasAdmin(status.hasAdmin);
        setExistingAdminEmail(status.adminEmail || null);

        const queryMode = searchParams.get('mode');
        const isSetupPath = location.pathname === '/setup';

        if (!status.hasAdmin) {
          setMode('setup');
        } else if (queryMode === 'setup' || isSetupPath) {
          setMode('setup');
        } else if (queryMode === 'reset' || queryMode === 'activate' || queryMode === 'forgot') {
          setMode(queryMode as AuthMode);
        } else {
          setMode('login');
        }
      } else {
        setMode('setup');
      }
    } catch (e) {
      if (location.pathname === '/setup') {
        setMode('setup');
      } else {
        setMode('login');
      }
    } finally {
      setIsSystemChecking(false);
    }
  };

  const handleWipeAndReset = async () => {
    if (
      !window.confirm(
        'WARNING: This will wipe all existing data and reset NEXUS to a completely clean state so you can create a fresh administrator. Proceed?'
      )
    ) {
      return;
    }

    setIsResetting(true);
    setErrorMessage('');
    try {
      const res = await api.post('/auth/reset-database', {
        confirmation: 'WIPE_ALL_DATA_START_FRESH',
      });
      if (res.data?.success) {
        setSuccessMessage('Database reset successfully! You can now create your fresh Master Admin account.');
        setHasAdmin(false);
        setExistingAdminEmail(null);
        setMode('setup');
        setSetupForm({
          companyName: '',
          companyTagline: 'Payroll, without the paperwork.',
          adminName: '',
          adminEmail: '',
          adminPassword: '',
          confirmPassword: '',
          city: '',
          state: '',
        });
      }
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || 'Failed to reset database.');
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    const queryMode = searchParams.get('mode');
    const queryToken = searchParams.get('token');
    const queryEmail = searchParams.get('email');

    if (queryMode === 'setup' || location.pathname === '/setup') {
      setMode('setup');
    } else if (queryMode === 'reset' || queryMode === 'activate') {
      setMode(queryMode);
    }

    if (queryToken) {
      setTokenInput(queryToken);
    }
    if (queryEmail) {
      setResetEmail(queryEmail);
      setIdentifier(queryEmail);
    }
  }, [searchParams, location.pathname]);

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

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!setupForm.companyName.trim()) {
      setErrorMessage('Company / Organization Name is required.');
      return;
    }
    if (!setupForm.adminName.trim() || !setupForm.adminEmail.trim()) {
      setErrorMessage('Administrator name and email are required.');
      return;
    }
    if (setupForm.adminPassword !== setupForm.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (setupForm.adminPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/setup-admin', {
        companyName: setupForm.companyName.trim(),
        companyTagline: setupForm.companyTagline.trim(),
        adminName: setupForm.adminName.trim(),
        adminEmail: setupForm.adminEmail.trim(),
        adminPassword: setupForm.adminPassword,
        city: setupForm.city?.trim() || undefined,
        state: setupForm.state?.trim() || undefined,
      });

      if (res.data.success && res.data.data) {
        const { token, user } = res.data.data;
        login(token, user);
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to configure initial setup.');
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

  if (isSystemChecking) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center relative overflow-hidden">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-extrabold text-2xl shadow-xl shadow-cyan-500/20 mb-4 border border-cyan-400/30">
          N
        </div>
        <p className="text-sm font-semibold text-cyan-400 animate-pulse">Initializing NEXUS System...</p>
      </div>
    );
  }

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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-200/80">
          {/* Top Switcher Tabs: Sign In / First-Time Admin Setup */}
          <div className="flex rounded-2xl bg-slate-100 p-1 mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'login' || mode === 'forgot' || mode === 'reset' || mode === 'activate'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-600" />
              Sign In
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('setup');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'setup'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-500/25'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              First-Time Admin Setup
              {!hasAdmin && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-extrabold uppercase">
                  Start Here
                </span>
              )}
            </button>
          </div>

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

          {/* MODE: INITIAL FIRST-TIME SETUP */}
          {mode === 'setup' && hasAdmin ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  Administrator Already Configured
                </div>
                <p className="text-xs text-amber-800 mt-2 leading-relaxed">
                  An administrator account is already set up for this NEXUS instance
                  {existingAdminEmail ? (
                    <span className="font-semibold block text-slate-800 mt-0.5">({existingAdminEmail})</span>
                  ) : null}.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                  <span className="font-semibold text-slate-800 block">Want to add another Administrator or HR?</span>
                  <p>
                    Sign in to your administrator account, go to <strong>Users & Staff</strong> (<code>/admin/users</code>), and click <em>Create Staff / HR Account</em> with the <strong>Administrator</strong> role.
                  </p>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setMode('login');
                    if (existingAdminEmail) setIdentifier(existingAdminEmail);
                    setErrorMessage('');
                  }}
                >
                  Sign In as Administrator
                </Button>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2 font-medium">
                    Or wipe existing data to create a fresh administrator from scratch:
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={handleWipeAndReset}
                    isLoading={isResetting}
                  >
                    Reset All Data & Start Fresh Setup
                  </Button>
                </div>
              </div>
            </div>
          ) : mode === 'setup' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 text-xs font-bold mb-2 border border-cyan-200">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  First-Time System Initialization
                </div>
                <h3 className="text-lg font-bold text-slate-900">Create Master Admin Account</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure your organization and primary administrator. You can later create HR accounts and onboard employees.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSetupSubmit}>
                <Input
                  label="Organization / Company Name"
                  placeholder="e.g. Acme Technologies Pvt Ltd"
                  value={setupForm.companyName}
                  onChange={(e) => setSetupForm({ ...setupForm, companyName: e.target.value })}
                  icon={<Building className="w-4 h-4 text-slate-400" />}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Administrator Full Name"
                    placeholder="e.g. Abhiram Malla"
                    value={setupForm.adminName}
                    onChange={(e) => setSetupForm({ ...setupForm, adminName: e.target.value })}
                    icon={<UserCheck className="w-4 h-4 text-slate-400" />}
                    required
                  />

                  <Input
                    label="Administrator Work Email"
                    type="email"
                    placeholder="e.g. admin@acme.com"
                    value={setupForm.adminEmail}
                    onChange={(e) => setSetupForm({ ...setupForm, adminEmail: e.target.value })}
                    icon={<Mail className="w-4 h-4 text-slate-400" />}
                    required
                  />
                </div>

                <div className="relative">
                  <Input
                    label="Administrator Password"
                    type={showSetupPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={setupForm.adminPassword}
                    onChange={(e) => setSetupForm({ ...setupForm, adminPassword: e.target.value })}
                    icon={<Lock className="w-4 h-4 text-slate-400" />}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showSetupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Input
                  label="Confirm Administrator Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={setupForm.confirmPassword}
                  onChange={(e) => setSetupForm({ ...setupForm, confirmPassword: e.target.value })}
                  icon={<Lock className="w-4 h-4 text-slate-400" />}
                  required
                />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Input
                    label="City (Optional)"
                    placeholder="e.g. Hyderabad"
                    value={setupForm.city}
                    onChange={(e) => setSetupForm({ ...setupForm, city: e.target.value })}
                  />
                  <Input
                    label="State (Optional)"
                    placeholder="e.g. Telangana"
                    value={setupForm.state}
                    onChange={(e) => setSetupForm({ ...setupForm, state: e.target.value })}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isLoading}
                >
                  Initialize Organization & Master Admin
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Already have an account? Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODE: NORMAL SIGN IN */}
          {mode === 'login' && (
            <form className="space-y-5" onSubmit={handleLoginSubmit}>
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Sign In to NEXUS</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your credentials to access your organization portal.
                </p>
              </div>

              {!hasAdmin && (
                <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-between gap-3 text-xs text-cyan-900">
                  <span>No administrator configured yet. Create one to get started.</span>
                  <button
                    type="button"
                    onClick={() => setMode('setup')}
                    className="font-bold underline text-cyan-700 hover:text-cyan-900 whitespace-nowrap cursor-pointer"
                  >
                    Setup Admin →
                  </button>
                </div>
              )}

              <Input
                label="Email Address or Employee ID"
                placeholder="name@company.com or EMP-101"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                icon={<Mail className="w-4 h-4 text-slate-400" />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4 text-slate-400" />}
                required
              />

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="font-semibold text-cyan-600 hover:text-cyan-700 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                Sign In to Account
              </Button>

              <div className="pt-2 text-center flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('setup');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  First Time Setup? Create Master Admin Account
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('activate');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Received an activation token? Activate Account
                </button>
              </div>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form className="space-y-5" onSubmit={handleForgotSubmit}>
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Forgot Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your registered work email to receive password reset instructions.
                </p>
              </div>

              <Input
                label="Work Email Address"
                type="email"
                placeholder="name@company.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                icon={<Mail className="w-4 h-4 text-slate-400" />}
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

              <div className="pt-2 flex justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
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
                  className="font-semibold text-cyan-600 hover:text-cyan-700 cursor-pointer"
                >
                  Have a reset token?
                </button>
              </div>
            </form>
          )}

          {/* MODE: RESET PASSWORD / ACTIVATE ACCOUNT */}
          {(mode === 'reset' || mode === 'activate') && (
            <form className="space-y-4" onSubmit={handleResetOrActivateSubmit}>
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">
                  {mode === 'activate' ? 'Activate Account' : 'Reset Password'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {mode === 'activate'
                    ? 'Enter your activation token and set your password to activate your account.'
                    : 'Enter the reset token received via email and create a new password.'}
                </p>
              </div>

              <Input
                label="Security Token"
                placeholder="Paste token received in email..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                icon={<KeyRound className="w-4 h-4 text-slate-400" />}
                required
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Lock className="w-4 h-4 text-slate-400" />}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-4 h-4 text-slate-400" />}
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
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          Protected by enterprise JWT authorization & secure bcrypt encryption.
        </div>
      </div>
    </div>
  );
};
