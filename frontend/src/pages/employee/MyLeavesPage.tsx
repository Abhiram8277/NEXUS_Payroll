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
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { LeaveRequest, LeaveType } from '../../types';

export const MyLeavesPage: React.FC = () => {
  const [balances, setBalances] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applySaving, setApplySaving] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveTypeId: '',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  const { showToast } = useToast();

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      const [balRes, typeRes, reqRes] = await Promise.all([
        api.get('/leaves/my-balances'),
        api.get('/leave-types'),
        api.get('/leaves'),
      ]);
      setBalances(balRes.data.data || []);
      setLeaveTypes(typeRes.data.data || []);
      setRequests(reqRes.data.data || []);
    } catch (e: any) {
      console.error(e);
      showToast('Failed to load leave information', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.leaveTypeId || !applyForm.fromDate || !applyForm.toDate || !applyForm.reason) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    try {
      setApplySaving(true);
      const res = await api.post('/leaves/apply', applyForm);
      if (res.data.success) {
        showToast('Leave request submitted successfully for approval', 'success');
        setIsApplyModalOpen(false);
        setApplyForm({ leaveTypeId: '', fromDate: '', toDate: '', reason: '' });
        fetchLeaveData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to submit leave request', 'error');
    } finally {
      setApplySaving(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    if (!window.confirm('Cancel this pending leave application?')) return;
    try {
      const res = await api.put(`/leaves/${id}/cancel`);
      if (res.data.success) {
        showToast('Leave request cancelled and balance restored', 'success');
        fetchLeaveData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to cancel leave request', 'error');
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="My Leaves & Time Off"
        description="Check your accrued annual leave balances and submit time-off applications."
        action={
          <Button variant="primary" onClick={() => setIsApplyModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Apply for Leave
          </Button>
        }
      />

      {/* Leave Balances Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {balances.map((b) => (
          <Card key={b.id} className="p-5 text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">
              {b.leaveType?.name}
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {b.available} <span className="text-sm font-normal text-slate-400">Days</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Used: {b.used}</span>
              <span>Pending: {b.pending}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Leave Applications History */}
      <Card orientation="vertical" title={`Leave Applications History (${requests.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Leave Type</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-4 py-3 text-center">Days</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Applied On</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {req.leaveType?.name}
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
                            : req.status === 'CANCELLED'
                            ? 'neutral'
                            : 'warning'
                        }
                      >
                        {req.status === 'APPLIED' ? 'Pending Approval' : req.status}
                      </Badge>
                      {req.rejectionReason && (
                        <span className="text-[11px] text-rose-500 block mt-1">
                          Reason: {req.rejectionReason}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {req.status === 'APPLIED' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={() => handleCancelLeave(req.id)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <CalendarRange className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">No leave requests found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click the "Apply for Leave" button above to submit a new time-off request.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Time Off"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <Select
            label="Leave Category"
            value={applyForm.leaveTypeId}
            onChange={(e) => setApplyForm({ ...applyForm, leaveTypeId: e.target.value })}
            options={[
              { value: '', label: '-- Select Leave Category --' },
              ...leaveTypes.map((lt) => ({
                value: lt.id,
                label: `${lt.name} (${lt.code})`,
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
            label="Reason for Absence"
            placeholder="Please share details (e.g. personal commitments, illness)"
            value={applyForm.reason}
            onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
            required
          />

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <p>
              • Requests will be routed to your Manager and HR department for review. Unpaid or excess leave beyond your allotted quota will automatically convert to Loss of Pay (LOP) during payroll processing.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={applySaving}>
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
