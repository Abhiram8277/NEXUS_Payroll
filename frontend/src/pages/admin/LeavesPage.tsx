import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  CalendarRange,
  Check,
  X,
  Filter,
  User,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { LeaveRequest, LeaveType, Employee } from '../../types';

export const LeavesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'balances' | 'apply'>('requests');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingStatus, setProcessingStatus] = useState(false);

  // Apply on Behalf
  const [applyForm, setApplyForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    fromDate: '',
    toDate: '',
    reason: '',
  });
  const [applying, setApplying] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [reqRes, typeRes, empRes] = await Promise.all([
        api.get('/leaves'),
        api.get('/leave-types'),
        api.get('/employees?limit=100'),
      ]);
      setRequests(reqRes.data.data || []);
      setLeaveTypes(typeRes.data.data || []);
      setEmployees(empRes.data.data?.items || []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load leave records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      setProcessingStatus(true);
      const res = await api.put(`/leaves/${id}/status`, {
        status,
        rejectionReason: reason,
      });
      if (res.data.success) {
        showToast(`Leave request ${status.toLowerCase()} successfully`, 'success');
        setRejectModalOpen(false);
        setRejectionReason('');
        setSelectedReqId(null);
        fetchInitialData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to update leave status', 'error');
    } finally {
      setProcessingStatus(false);
    }
  };

  const handleApplyOnBehalf = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setApplying(true);
      const res = await api.post('/leaves/apply', applyForm);
      if (res.data.success) {
        showToast('Leave request submitted successfully', 'success');
        setApplyForm({
          employeeId: '',
          leaveTypeId: '',
          fromDate: '',
          toDate: '',
          reason: '',
        });
        setActiveTab('requests');
        fetchInitialData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to submit leave request', 'error');
    } finally {
      setApplying(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (statusFilter === 'ALL') return true;
    return req.status === statusFilter;
  });

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
        title="Leave Management & Approvals"
        description="Review time-off requests, monitor leave balance quotas, and prevent unauthorized absenteeism."
        action={
          <Button variant="primary" onClick={() => setActiveTab('apply')}>
            <Plus className="w-4 h-4 mr-1.5" /> Apply on Behalf
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'requests', label: `Pending & Past Requests (${requests.length})` },
          { id: 'balances', label: 'Employee Balances' },
          { id: 'apply', label: 'Apply Leave' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Status filter bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-slate-400 mr-2">Filter Status:</span>
            {['ALL', 'APPLIED', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'APPLIED' ? 'Pending Approval' : st}
              </button>
            ))}
          </div>

          <Card orientation="vertical" title="Leave Applications">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Leave Type</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-4 py-3 text-center">Days</th>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-slate-900">
                            {req.employee?.firstName} {req.employee?.lastName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {req.employee?.employeeId} • {req.employee?.department?.name || 'General'}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="font-medium text-slate-800">{req.leaveType.name}</span>
                          <span className="text-xs text-slate-500 block font-mono">
                            {req.leaveType.code}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600">
                          <div>
                            {new Date(req.fromDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-slate-400">
                            to{' '}
                            {new Date(req.toDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-900">
                          {req.days}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate">
                          {req.reason}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge
                            variant={
                              req.status === 'APPROVED'
                                ? 'success'
                                : req.status === 'REJECTED'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {req.status === 'APPLIED' ? 'Pending Approval' : req.status}
                          </Badge>
                          {req.rejectionReason && (
                            <span className="text-[11px] text-rose-500 block mt-1">
                              {req.rejectionReason}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {req.status === 'APPLIED' ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                                loading={processingStatus}
                              >
                                <Check className="w-4 h-4 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-rose-600 border-rose-300 hover:bg-rose-50"
                                onClick={() => {
                                  setSelectedReqId(req.id);
                                  setRejectModalOpen(true);
                                }}
                              >
                                <X className="w-4 h-4 mr-1" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                        No leave requests found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Employee Balances */}
      {activeTab === 'balances' && (
        <Card orientation="vertical" title="Employee Leave Entitlements Summary">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Leave Balance Quotas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-xs text-slate-500">{emp.employeeId}</div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {emp.department?.name || 'General'}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        {emp.leaveBalances && emp.leaveBalances.length > 0 ? (
                          emp.leaveBalances.map((bal) => (
                            <div
                              key={bal.id}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs flex items-center gap-2"
                            >
                              <span className="font-semibold text-slate-700">
                                {bal.leaveType.code}:
                              </span>
                              <span className="text-emerald-600 font-bold">
                                {bal.available} left
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                ({bal.used} used / {bal.allocated} total)
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">Standard policy applies</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Apply on Behalf */}
      {activeTab === 'apply' && (
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <CalendarRange className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Apply Leave on Employee's Behalf</h3>
                <p className="text-sm text-slate-500">
                  Submit a formal time-off application for an employee.
                </p>
              </div>
            </div>

            <form onSubmit={handleApplyOnBehalf} className="space-y-4">
              <Select
                label="Employee"
                value={applyForm.employeeId}
                onChange={(e) => setApplyForm({ ...applyForm, employeeId: e.target.value })}
                options={[
                  { value: '', label: '-- Select Employee --' },
                  ...employees.map((emp) => ({
                    value: emp.id,
                    label: `${emp.employeeId} - ${emp.firstName} ${emp.lastName}`,
                  })),
                ]}
                required
              />

              <Select
                label="Leave Type"
                value={applyForm.leaveTypeId}
                onChange={(e) => setApplyForm({ ...applyForm, leaveTypeId: e.target.value })}
                options={[
                  { value: '', label: '-- Select Leave Category --' },
                  ...leaveTypes.map((lt) => ({
                    value: lt.id,
                    label: `${lt.name} (${lt.code}) - ${lt.annualAllocation} days/yr`,
                  })),
                ]}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="From Date"
                  type="date"
                  value={applyForm.fromDate}
                  onChange={(e) => setApplyForm({ ...applyForm, fromDate: e.target.value })}
                  required
                />
                <Input
                  label="To Date"
                  type="date"
                  value={applyForm.toDate}
                  onChange={(e) => setApplyForm({ ...applyForm, toDate: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Reason / Notes"
                placeholder="Reason for leave application"
                value={applyForm.reason}
                onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                required
              />

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <p>
                  • Applications exceeding available paid balance will automatically convert excess days to Loss of Pay (LOP) during payroll computation.
                </p>
              </div>

              <Button
                variant="primary"
                type="submit"
                className="w-full justify-center"
                loading={applying}
              >
                Submit Leave Application
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Leave Request"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please provide a mandatory reason for rejecting this leave request so the employee is informed:
          </p>
          <Input
            label="Rejection Reason"
            placeholder="e.g. Project deliverable deadline / critical coverage required"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                selectedReqId && handleStatusUpdate(selectedReqId, 'REJECTED', rejectionReason)
              }
              loading={processingStatus}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
