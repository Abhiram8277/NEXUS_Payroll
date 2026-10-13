import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  CreditCard,
  Download,
  CalendarCheck2,
  CalendarRange,
  CalendarDays,
  FileText,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';

export const EmployeeDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard/employee');
      if (res.data.success) {
        setDashboardData(res.data.data);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to load employee dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPayslip = async (payslipId: string, month: number, year: number) => {
    try {
      const res = await api.get(`/payslips/${payslipId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NEXUS_Payslip_${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      showToast('Payslip downloaded successfully', 'success');
    } catch (e) {
      showToast('Failed to download payslip PDF', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const employee = dashboardData?.employee;
  const latestPayslip = dashboardData?.latestPayslip;
  const leaveBalances = dashboardData?.leaveBalances || [];
  const attendance = dashboardData?.attendanceSummary;
  const holidays = dashboardData?.upcomingHolidays || [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-navy-950 via-slate-900 to-navy-900 text-white shadow-xl relative overflow-hidden border border-navy-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> NEXUS Employee Self-Service
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {employee?.firstName || user?.name}!
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {employee?.designation?.name || 'Team Member'} • {employee?.department?.name || 'General Department'} •{' '}
              <span className="font-mono text-cyan-400">{employee?.employeeId}</span>
            </p>
          </div>

          {latestPayslip && (
            <div className="flex flex-col items-start md:items-end bg-navy-900/80 backdrop-blur p-4 rounded-xl border border-navy-700/60">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Latest Net Salary (M{latestPayslip.month}/{latestPayslip.year})
              </span>
              <div className="text-2xl md:text-3xl font-bold text-cyan-400 mt-0.5">
                ₹{Number(latestPayslip.netSalary).toLocaleString('en-IN')}
              </div>
              <Button
                size="sm"
                variant="primary"
                className="mt-3 text-xs"
                onClick={() =>
                  handleDownloadPayslip(latestPayslip.id, latestPayslip.month, latestPayslip.year)
                }
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download Payslip
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Attendance Summary */}
        <Card
          className="p-6 hover:border-blue-400 transition-all cursor-pointer"
          onClick={() => navigate('/employee/attendance')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Attendance (This Month)</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CalendarCheck2 className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">
            {attendance?.effectivePresent || 0} / {attendance?.totalDays || 30} Days
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
            <span>LOP: {attendance?.totalLop || 0} days</span>
            <span className="text-blue-600 font-medium flex items-center">
              View Log <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </div>
        </Card>

        {/* Leave Balances Quick Summary */}
        <Card
          className="p-6 hover:border-blue-400 transition-all cursor-pointer"
          onClick={() => navigate('/employee/leaves')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Available Leaves</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <CalendarRange className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {leaveBalances.reduce((acc: number, b: any) => acc + (b.available || 0), 0)} Days
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
            <span>Across all leave quotas</span>
            <span className="text-blue-600 font-medium flex items-center">
              Apply Leave <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </div>
        </Card>

        {/* Salary Information */}
        <Card
          className="p-6 hover:border-blue-400 transition-all cursor-pointer"
          onClick={() => navigate('/employee/salary')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Cost to Company (CTC)</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            ₹{Number(employee?.salary?.ctcAnnual || 0).toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
            <span>Monthly Gross: ₹{Number(employee?.salary?.monthlyGross || 0).toLocaleString('en-IN')}</span>
            <span className="text-blue-600 font-medium flex items-center">
              Salary Breakup <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </div>
        </Card>
      </div>

      {/* Two Column Layout: Leave Balances & Upcoming Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Balances */}
        <Card
          orientation="vertical"
          title="Leave Balances"
          action={
            <Button size="sm" variant="outline" onClick={() => navigate('/employee/leaves')}>
              Apply Time Off
            </Button>
          }
        >
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {leaveBalances.map((bal: any) => (
              <div
                key={bal.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center"
              >
                <span className="text-xs font-semibold text-slate-500 block truncate">
                  {bal.leaveType?.name}
                </span>
                <div className="text-2xl font-bold text-slate-900 mt-1">{bal.available}</div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Used: {bal.used} | Total: {bal.allocated}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Holidays */}
        <Card orientation="vertical" title="Upcoming Company Holidays">
          <div className="divide-y divide-slate-100">
            {holidays.length > 0 ? (
              holidays.map((h: any) => (
                <div key={h.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{h.name}</div>
                      <div className="text-xs text-slate-500">{h.description || 'Public holiday'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-800">
                      {new Date(h.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">
                No upcoming holidays scheduled in the system.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
