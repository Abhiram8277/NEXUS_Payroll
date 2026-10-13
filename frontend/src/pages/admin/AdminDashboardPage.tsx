import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import {
  Users,
  UserCheck,
  Receipt,
  IndianRupee,
  CalendarCheck2,
  CalendarRange,
  ArrowRight,
  TrendingUp,
  Building,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reports/dashboard/admin');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load dashboard analytics from database.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner size="lg" label="Loading NEXUS Dashboard..." className="min-h-[60vh]" />;
  }

  if (error) {
    return (
      <Card className="p-8 text-center my-8">
        <p className="text-rose-600 font-semibold mb-4">{error}</p>
        <Button variant="primary" size="sm" onClick={fetchDashboard}>
          Retry Loading Dashboard
        </Button>
      </Card>
    );
  }

  const kpis = data?.kpis || {};
  const departmentDistribution = data?.departmentDistribution || [];
  const recentEmployees = data?.recentEmployees || [];

  return (
    <div>
      <PageHeader
        title="Executive Payroll Dashboard"
        subtitle="Real-time statutory workforce, payroll status, and compliance metrics"
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<CalendarCheck2 className="w-4 h-4" />}
              onClick={() => navigate('/admin/attendance')}
            >
              Attendance
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Receipt className="w-4 h-4" />}
              onClick={() => navigate('/admin/payroll')}
            >
              Run Payroll
            </Button>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total Workforce"
          value={kpis.totalEmployees || 0}
          subtitle={`${kpis.activeEmployees || 0} currently active`}
          icon={<Users className="w-5 h-5" />}
          iconBg="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Payroll Status"
          value={kpis.currentPayrollStatus || 'DRAFT'}
          subtitle={`Period: ${kpis.currentPayrollPeriod || 'N/A'}`}
          icon={<Receipt className="w-5 h-5" />}
          iconBg="bg-cyan-50 text-cyan-600"
          badge={
            <Badge
              variant={
                kpis.currentPayrollStatus === 'LOCKED'
                  ? 'success'
                  : kpis.currentPayrollStatus === 'APPROVED'
                  ? 'info'
                  : 'warning'
              }
            >
              {kpis.currentPayrollStatus}
            </Badge>
          }
        />

        <StatCard
          title="Gross Payroll (₹)"
          value={`₹${Number(kpis.currentGrossPayroll || 0).toLocaleString('en-IN')}`}
          subtitle="Monthly gross payout before deductions"
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Net Take-Home (₹)"
          value={`₹${Number(kpis.currentNetPayroll || 0).toLocaleString('en-IN')}`}
          subtitle={`Employer Cost: ₹${Number(kpis.currentEmployerCost || 0).toLocaleString('en-IN')}`}
          icon={<IndianRupee className="w-5 h-5" />}
          iconBg="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Main Grid: Distribution & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Department Distribution */}
        <Card title="Department Distribution" subtitle="Active employee headcount by team" className="lg:col-span-2">
          <div className="space-y-4">
            {departmentDistribution.length === 0 ? (
              <p className="text-sm text-slate-400">No department data recorded.</p>
            ) : (
              departmentDistribution.map((dept: any) => {
                const percentage =
                  kpis.totalEmployees > 0
                    ? Math.round((dept.count / kpis.totalEmployees) * 100)
                    : 0;

                return (
                  <div key={dept.code} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-cyan-600" />
                        {dept.name} ({dept.code})
                      </span>
                      <span className="text-slate-500">
                        {dept.count} members ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Action Center */}
        <Card title="Action Center" subtitle="Quick administrative shortcuts">
          <div className="space-y-3">
            <button
              onClick={() => navigate('/admin/payroll')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-cyan-50/50 border border-slate-200/80 hover:border-cyan-200 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Review & Approve Payroll</h4>
                  <p className="text-xs text-slate-500">Inspect draft calculations</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => navigate('/admin/leaves')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-amber-50/50 border border-slate-200/80 hover:border-amber-200 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Pending Leave Requests</h4>
                  <p className="text-xs text-slate-500">{kpis.pendingLeaves || 0} waiting for review</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => navigate('/admin/employees')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-200 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Add New Employee</h4>
                  <p className="text-xs text-slate-500">Onboard staff with salary</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </Card>
      </div>

      {/* Recent Employees Table */}
      <Card
        title="Recently Added Team Members"
        subtitle="Latest additions to NEXUS"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/employees')}
          >
            View All Employees
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentEmployees.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-cyan-700">
                    {emp.employeeId}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {emp.firstName} {emp.lastName}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {emp.department?.name || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {emp.designation?.name || 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {emp.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
