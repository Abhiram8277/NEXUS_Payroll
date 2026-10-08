import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleReturn = () => {
    if (user?.role === 'ADMIN') navigate('/admin/dashboard');
    else if (user?.role === 'HR') navigate('/hr/dashboard');
    else navigate('/employee/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">403</h1>
      <p className="mt-3 text-lg font-semibold text-slate-200">Access Restricted</p>
      <p className="mt-2 text-sm text-slate-400 max-w-md">
        You do not have the required enterprise authorization to access this module. Backend role-based enforcement has blocked this action.
      </p>
      <div className="mt-8">
        <Button
          variant="primary"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={handleReturn}
        >
          Back to Authorized Dashboard
        </Button>
      </div>
      <p className="mt-12 text-xs text-slate-500">NEXUS — Payroll, without the paperwork.</p>
    </div>
  );
};
