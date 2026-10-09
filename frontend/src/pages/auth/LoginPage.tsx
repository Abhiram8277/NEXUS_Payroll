import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Lock, Mail, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { identifier, password });
      if (res.data.success && res.data.data) {
        const { token, user } = res.data.data;
        login(token, user);

        // Redirect based on role
        if (user.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else if (user.role === 'HR') {
          navigate('/hr/dashboard', { replace: true });
        } else {
          navigate('/employee/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      if (!err.response) {
        // Backend offline fallback for instant static Vercel preview
        const cleanId = identifier.trim().toLowerCase();
        let demoRole: 'ADMIN' | 'HR' | 'EMPLOYEE' | null = null;
        if (cleanId.includes('admin')) demoRole = 'ADMIN';
        else if (cleanId.includes('hr')) demoRole = 'HR';
        else if (cleanId.includes('rahul') || cleanId.includes('emp')) demoRole = 'EMPLOYEE';

        if (demoRole) {
          const demoUser = {
            id: `usr-${demoRole.toLowerCase()}-001`,
            name: demoRole === 'ADMIN' ? 'System Administrator' : demoRole === 'HR' ? 'Ananya Roy' : 'Rahul Sharma',
            email: cleanId || `${demoRole.toLowerCase()}@nexuspayroll.com`,
            role: demoRole,
            isActive: true,
            employee: {
              id: `emp-${demoRole.toLowerCase()}-001`,
              employeeId: demoRole === 'ADMIN' ? 'EMP-001' : demoRole === 'HR' ? 'EMP-002' : 'EMP-101',
              firstName: demoRole === 'ADMIN' ? 'System' : demoRole === 'HR' ? 'Ananya' : 'Rahul',
              lastName: demoRole === 'ADMIN' ? 'Administrator' : demoRole === 'HR' ? 'Roy' : 'Sharma',
              department: { name: demoRole === 'ADMIN' ? 'Operations' : demoRole === 'HR' ? 'Human Resources' : 'Engineering' },
              designation: { name: demoRole === 'ADMIN' ? 'Administrator' : demoRole === 'HR' ? 'HR Manager' : 'Senior Software Engineer' },
            },
          };
          login('nexus_preview_demo_token', demoUser);
          if (demoRole === 'ADMIN') navigate('/admin/dashboard', { replace: true });
          else if (demoRole === 'HR') navigate('/hr/dashboard', { replace: true });
          else navigate('/employee/dashboard', { replace: true });
          return;
        }
      }

      const errorMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors?.length
          ? err.response.data.errors.map((e: any) => `${e.field || 'Error'}: ${e.message}`).join('. ')
          : 'Invalid credentials. Please verify your email/ID and password.');
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (role: 'ADMIN' | 'HR' | 'EMPLOYEE') => {
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
      {/* Background visual gradients */}
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
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-sm text-rose-700">
                <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

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

              <span className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 cursor-pointer">
                Forgot password?
              </span>
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

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quick Evaluation Logins
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
