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
  Users,
  CalendarCheck2,
  CalendarRange,
  Receipt,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { LeaveRequest } from '../../types';

export const HrDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, leavesRes] = await Promise.all([
        api.get('/reports/dashboard/admin'),
        api.get('/leaves?status=APPLIED'),
      ]);
      setDashboardData(statsRes.data.data);
      setPendingLeaves(leavesRes.data.data || []);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to load HR dashboard metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveDecision = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessingId(id);
      const res = await api.put(`/leaves/${id}/status`, { status });
      if (res.data.success) {
        showToast(`Leave request ${status.toLowerCase()} successfully`, 'success');
        fetchData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to update leave', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name}`}
        description="Here is your HR & Payroll operations overview for today."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Workforce</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {dashboardData?.totalEmployees || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Active headcount</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Present Today</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">
            {dashboardData?.presentToday || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Staff clocked in</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">On Leave Today</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CalendarRange className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-bold text-amber-600 mt-2">
            {dashboardData?.onLeaveToday || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Approved time off</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Pending Approvals</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-bold text-rose-600 mt-2">
            {pendingLeaves.length}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Requires review</span>
        </Card>
      </div>

      {/* Quick Operational Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className="p-6 hover:border-blue-400 transition-all cursor-pointer group"
          onClick={() => navigate('/hr/attendance')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Mark Attendance</h3>
              <p className="text-xs text-slate-500 mt-0.5">Record daily roster or bulk import</p>
            </div>
          </div>
        </Card>

        <Card
          className="p-6 hover:border-blue-400 transition-all cursor-pointer group"
          onClick={() => navigate('/hr/leaves')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CalendarRange className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Leaves</h3>
              <p className="text-xs text-slate-500 mt-0.5">Review leave requests & balances</p>
            </div>
          </div>
        </Card>

        <Card
          className="p-6 hover:border-blue-400 transition-all cursor-pointer group"
          onClick={() => navigate('/hr/payroll')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Prepare Payroll</h3>
              <p className="text-xs text-slate-500 mt-0.5">Calculate LOP & preview monthly run</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Leave Requests Queue */}
      <Card
        orientation="vertical"
        title={`Pending Leave Applications (${pendingLeaves.length})`}
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/hr/leaves')}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Leave Type</th>
                <th className="px-6 py-3">Dates</th>
                <th className="px-4 py-3 text-center">Days</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingLeaves.length > 0 ? (
                pendingLeaves.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {req.employee?.firstName} {req.employee?.lastName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {req.employee?.employeeId} • {req.employee?.department?.name || 'General'}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-800">
                      {req.leaveType.name}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600">
                      {new Date(req.fromDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      -{' '}
                      {new Date(req.toDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-900">
                      {req.days}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate">
                      {req.reason}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => handleLeaveDecision(req.id, 'APPROVED')}
                          loading={processingId === req.id}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600 border-rose-300 hover:bg-rose-50"
                          onClick={() => handleLeaveDecision(req.id, 'REJECTED')}
                          loading={processingId === req.id}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No pending leave applications at this time.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
