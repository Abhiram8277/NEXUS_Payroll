import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  Wallet,
  IndianRupee,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export const MySalaryPage: React.FC = () => {
  const [salaryData, setSalaryData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchSalary();
  }, []);

  const fetchSalary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/salary/my-salary');
      if (res.data.success) {
        setSalaryData(res.data.data);
      }
    } catch (e: any) {
      console.error(e);
      showToast('Failed to load salary structure', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!salaryData) {
    return (
      <div className="text-center py-16">
        <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Salary Structure Not Configured</h3>
        <p className="text-sm text-slate-500 mt-1">
          Your compensation package is being prepared by HR. Please check back shortly.
        </p>
      </div>
    );
  }

  const components: any[] = salaryData.componentsJson || [];
  const earnings = components.filter((c) => c.type === 'EARNING');
  const deductions = components.filter((c) => c.type === 'DEDUCTION');
  const employer = components.filter((c) => c.type === 'EMPLOYER_CONTRIBUTION');

  const totalMonthlyEarnings = earnings.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalMonthlyDeductions = deductions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const estimatedNetSalary = totalMonthlyEarnings - totalMonthlyDeductions;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="My Compensation & Salary Breakup"
        description="Detailed itemization of your monthly earnings, statutory deductions, and annual Cost to Company (CTC)."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-tr from-navy-950 to-blue-950 text-white">
          <span className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">
            Annual Cost to Company (CTC)
          </span>
          <div className="text-3xl font-extrabold text-white mt-2">
            ₹{Number(salaryData.ctcAnnual || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-cyan-400/80 mt-1 block">Full yearly compensation package</span>
        </Card>

        <Card className="p-6 bg-gradient-to-tr from-slate-900 to-navy-900 text-white">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Monthly Gross Salary
          </span>
          <div className="text-3xl font-extrabold text-cyan-400 mt-2">
            ₹{Number(salaryData.monthlyGross || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Before statutory deductions</span>
        </Card>

        <Card className="p-6 bg-emerald-50 border border-emerald-200">
          <span className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">
            Estimated Monthly Take-Home
          </span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-2">
            ₹{Math.max(0, estimatedNetSalary).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-emerald-600/80 mt-1 block">
            Net pay after standard deductions
          </span>
        </Card>
      </div>

      {/* Breakup Tables: Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings */}
        <Card orientation="vertical" title="Earnings Breakup">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Salary Component</th>
                  <th className="px-6 py-3 text-right">Monthly (₹)</th>
                  <th className="px-6 py-3 text-right">Annual (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {earnings.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{c.code}</div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-900">
                      ₹{Number(c.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-500">
                      ₹{(Number(c.amount) * 12).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50/80 font-bold">
                  <td className="px-6 py-3.5 text-slate-900">Total Gross Earnings</td>
                  <td className="px-6 py-3.5 text-right text-emerald-600">
                    ₹{totalMonthlyEarnings.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-900">
                    ₹{(totalMonthlyEarnings * 12).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Deductions */}
        <Card orientation="vertical" title="Statutory & Standard Deductions">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Deduction Item</th>
                  <th className="px-6 py-3 text-right">Monthly (₹)</th>
                  <th className="px-6 py-3 text-right">Annual (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deductions.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{c.code}</div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-rose-600">
                      ₹{Number(c.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-500">
                      ₹{(Number(c.amount) * 12).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50/80 font-bold">
                  <td className="px-6 py-3.5 text-slate-900">Total Deductions</td>
                  <td className="px-6 py-3.5 text-right text-rose-600">
                    ₹{totalMonthlyDeductions.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-900">
                    ₹{(totalMonthlyDeductions * 12).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Employer Contributions Note */}
      {employer.length > 0 && (
        <Card orientation="vertical" title="Employer Statutory Contributions (Included in CTC)">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Contribution</th>
                  <th className="px-6 py-3 text-right">Monthly (₹)</th>
                  <th className="px-6 py-3 text-right">Annual (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employer.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{c.name}</td>
                    <td className="px-6 py-3.5 text-right text-blue-600 font-semibold">
                      ₹{Number(c.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-500">
                      ₹{(Number(c.amount) * 12).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
