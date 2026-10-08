import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">404</h1>
      <p className="mt-3 text-lg font-semibold text-slate-200">Page not found</p>
      <p className="mt-2 text-sm text-slate-400 max-w-sm">
        The page you are looking for doesn't exist or has been moved to another URL.
      </p>
      <div className="mt-8">
        <Button
          variant="primary"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/')}
        >
          Return to Dashboard
        </Button>
      </div>
      <p className="mt-12 text-xs text-slate-500">NEXUS — Payroll, without the paperwork.</p>
    </div>
  );
};
