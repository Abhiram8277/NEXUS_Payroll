import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  Receipt,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Eye,
  IndianRupee,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  FileCheck,
} from 'lucide-react';
import { PayrollRun } from '../../types';

export const PayrollPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [selectedEmployeeItem, setSelectedEmployeeItem] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  useEffect(() => {
    fetchPayrollData();
  }, [selectedMonth, selectedYear]);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      setPreviewData(null);
      const res = await api.get(`/payroll/runs/${selectedYear}/${selectedMonth}`);
      if (res.data.success && res.data.data) {
        setPayrollRun(res.data.data);
      } else {
        setPayrollRun(null);
      }
    } catch (e: any) {
      if (e.response?.status === 404) {
        setPayrollRun(null);
      } else {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPayroll = async () => {
    try {
      setActionLoading(true);
      const res = await api.get('/payroll/preview', {
        params: { month: selectedMonth, year: selectedYear },
      });
      if (res.data.success) {
        setPreviewData(res.data.data);
        showToast('Payroll preview calculated successfully', 'info');
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to preview payroll', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunPayroll = async () => {
    try {
      setActionLoading(true);
      const res = await api.post('/payroll/run', {
        month: selectedMonth,
        year: selectedYear,
      });
      if (res.data.success) {
        showToast('Payroll generated and saved as Draft', 'success');
        setPreviewData(null);
        fetchPayrollData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to run payroll', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePayroll = async () => {
    if (!payrollRun) return;
    try {
      setActionLoading(true);
      const res = await api.put(`/payroll/runs/${payrollRun.id}/approve`);
      if (res.data.success) {
        showToast('Payroll approved successfully', 'success');
        fetchPayrollData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to approve payroll', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockPayroll = async () => {
    if (!payrollRun) return;
    try {
      setActionLoading(true);
      const res = await api.put(`/payroll/runs/${payrollRun.id}/lock`);
      if (res.data.success) {
        showToast('Payroll officially locked and payslips generated!', 'success');
        setIsLockModalOpen(false);
        fetchPayrollData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to lock payroll', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPayslip = async (payslipId: string, employeeName: string) => {
    try {
      const res = await api.get(`/payslips/${payslipId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslip_${employeeName}_${selectedMonth}_${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      showToast('Payslip PDF downloaded', 'success');
    } catch (e) {
      showToast('Failed to download payslip PDF', 'error');
    }
  };

  const currentDisplay = payrollRun || previewData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Studio"
        description="Comprehensive Indian payroll processing: LOP deduction, statutory compliance (PF, ESI, PT, TDS), approvals, locking, and payslip distribution."
        action={
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Lifecycle Stepper */}
          <Card className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Payroll Period Status
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-xl font-bold text-slate-900">
                    {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                  </h2>
                  {payrollRun ? (
                    <Badge
                      variant={
                        payrollRun.status === 'LOCKED'
                          ? 'success'
                          : payrollRun.status === 'APPROVED'
                          ? 'cyan'
                          : payrollRun.status === 'REVIEW'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {payrollRun.status === 'LOCKED' ? '🔒 LOCKED & FINAL' : payrollRun.status}
                    </Badge>
                  ) : previewData ? (
                    <Badge variant="warning">CALCULATED PREVIEW</Badge>
                  ) : (
                    <Badge variant="neutral">NOT INITIALIZED</Badge>
                  )}
                </div>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-2">
                {[
                  { step: 'DRAFT', label: '1. Prepared' },
                  { step: 'REVIEW', label: '2. In Review' },
                  { step: 'APPROVED', label: '3. Approved' },
                  { step: 'LOCKED', label: '4. Locked' },
                ].map((s, idx) => {
                  const isCurrent = payrollRun?.status === s.step;
                  const isPassed =
                    payrollRun?.status === 'LOCKED' ||
                    (payrollRun?.status === 'APPROVED' && idx < 3) ||
                    (payrollRun?.status === 'REVIEW' && idx < 2) ||
                    (payrollRun?.status === 'DRAFT' && idx < 1);

                  return (
                    <React.Fragment key={s.step}>
                      {idx > 0 && (
                        <div
                          className={`w-6 h-0.5 ${
                            isPassed ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                        />
                      )}
                      <div
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-sm'
                            : isPassed
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {s.label}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {!payrollRun && !previewData && (
                  <Button
                    variant="primary"
                    onClick={handlePreviewPayroll}
                    loading={actionLoading}
                  >
                    <TrendingUp className="w-4 h-4 mr-1.5" /> Calculate & Preview
                  </Button>
                )}

                {!payrollRun && previewData && (
                  <Button
                    variant="primary"
                    onClick={handleRunPayroll}
                    loading={actionLoading}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Commit to Draft
                  </Button>
                )}

                {payrollRun?.status === 'DRAFT' && (
                  <Button
                    variant="primary"
                    onClick={handleRunPayroll}
                    loading={actionLoading}
                  >
                    Recalculate Draft
                  </Button>
                )}

                {user?.role === 'ADMIN' && payrollRun && (payrollRun.status === 'DRAFT' || payrollRun.status === 'REVIEW') && (
                  <Button
                    variant="primary"
                    onClick={handleApprovePayroll}
                    loading={actionLoading}
                  >
                    <ShieldCheck className="w-4 h-4 mr-1.5" /> Approve Payroll
                  </Button>
                )}

                {user?.role === 'ADMIN' && payrollRun?.status === 'APPROVED' && (
                  <Button
                    variant="primary"
                    onClick={() => setIsLockModalOpen(true)}
                    loading={actionLoading}
                  >
                    <Lock className="w-4 h-4 mr-1.5" /> Lock & Publish Payslips
                  </Button>
                )}

                {payrollRun?.status === 'LOCKED' && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                    All Payslips Published
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Metric KPI Cards */}
          {currentDisplay && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="p-5 bg-white border border-slate-200">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Employees</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {currentDisplay.totalEmployees || currentDisplay.items?.length || 0}
                </div>
                <span className="text-[11px] text-slate-400">Processed in cycle</span>
              </Card>

              <Card className="p-5 bg-white border border-slate-200">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Gross Earnings</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  ₹{Number(currentDisplay.totalGross || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-slate-400">Total earned before tax</span>
              </Card>

              <Card className="p-5 bg-white border border-slate-200">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Deductions</span>
                <div className="text-2xl font-bold text-rose-600 mt-1">
                  ₹{Number(currentDisplay.totalDeductions || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-slate-400">PF, ESI, PT, TDS & LOP</span>
              </Card>

              <Card className="p-5 bg-white border border-slate-200">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Employer Cost</span>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  ₹{Number(currentDisplay.totalEmployerCost || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-slate-400">Employer PF & ESI</span>
              </Card>

              <Card className="p-5 bg-gradient-to-tr from-navy-950 to-blue-950 text-white">
                <span className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">Net Disbursal</span>
                <div className="text-2xl font-bold text-white mt-1">
                  ₹{Number(currentDisplay.totalNet || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-cyan-400/80">Total bank transfer</span>
              </Card>
            </div>
          )}

          {/* Employee Register Table */}
          {currentDisplay ? (
            <Card
              orientation="vertical"
              title={`Salary Register (${
                payrollRun?.payrollEmployees?.length || currentDisplay.items?.length || 0
              } Records)`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Employee</th>
                      <th className="px-4 py-3 text-center">Working</th>
                      <th className="px-4 py-3 text-center">Present</th>
                      <th className="px-4 py-3 text-center text-rose-600">LOP</th>
                      <th className="px-6 py-3 text-right">Gross Pay</th>
                      <th className="px-6 py-3 text-right text-rose-600">Deductions</th>
                      <th className="px-6 py-3 text-right font-bold text-slate-900">Net Pay</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(payrollRun?.payrollEmployees || currentDisplay.items || []).map(
                      (item: any) => {
                        const emp = item.employee || item;
                        return (
                          <tr key={item.id || emp.id} className="hover:bg-slate-50/60">
                            <td className="px-6 py-3.5">
                              <div className="font-semibold text-slate-900">
                                {emp.firstName} {emp.lastName}
                              </div>
                              <div className="text-xs text-slate-500">
                                {emp.employeeId} • {emp.department?.name || 'General'}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center text-slate-700 font-mono text-xs">
                              {item.workingDays}
                            </td>
                            <td className="px-4 py-3.5 text-center text-emerald-600 font-mono text-xs">
                              {item.presentDays}
                            </td>
                            <td className="px-4 py-3.5 text-center text-rose-600 font-mono text-xs font-semibold">
                              {item.lopDays}
                            </td>
                            <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                              ₹{Number(item.grossEarnings).toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-3.5 text-right text-rose-600 font-semibold">
                              ₹{Number(item.totalDeductions).toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                              ₹{Number(item.netSalary).toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedEmployeeItem(item);
                                    setIsDetailModalOpen(true);
                                  }}
                                  title="View Breakdown"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                </Button>

                                {payrollRun?.status === 'LOCKED' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleDownloadPayslip(
                                        item.id,
                                        `${emp.firstName}_${emp.lastName}`
                                      )
                                    }
                                    title="Download Payslip PDF"
                                  >
                                    <Download className="w-4 h-4 text-emerald-600" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="p-16 text-center">
              <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800">
                Payroll Not Yet Run for {months.find((m) => m.value === selectedMonth)?.label}{' '}
                {selectedYear}
              </h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                Calculate attendance, process Loss of Pay (LOP) days, apply statutory deductions, and review the payroll preview.
              </p>
              <Button
                variant="primary"
                className="mt-6"
                onClick={handlePreviewPayroll}
                loading={actionLoading}
              >
                <TrendingUp className="w-4 h-4 mr-2" /> Calculate & Preview Payroll
              </Button>
            </Card>
          )}

          {/* Payslip Breakdown Modal */}
          {selectedEmployeeItem && (
            <Modal
              isOpen={isDetailModalOpen}
              onClose={() => setIsDetailModalOpen(false)}
              title={`Salary Breakdown - ${
                selectedEmployeeItem.employee?.firstName || selectedEmployeeItem.firstName
              } ${selectedEmployeeItem.employee?.lastName || selectedEmployeeItem.lastName}`}
              size="lg"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div>
                    <span className="text-xs text-slate-500 block">Gross Earnings</span>
                    <span className="text-lg font-bold text-slate-900">
                      ₹{Number(selectedEmployeeItem.grossEarnings).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Total Deductions</span>
                    <span className="text-lg font-bold text-rose-600">
                      ₹{Number(selectedEmployeeItem.totalDeductions).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Net Payout</span>
                    <span className="text-lg font-bold text-emerald-600">
                      ₹{Number(selectedEmployeeItem.netSalary).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Components Itemization */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Calculated Line Items
                  </h4>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedEmployeeItem.components || []).map((comp: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-4 py-2.5 font-medium text-slate-800">
                            {comp.name} ({comp.code})
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant={
                                comp.type === 'EARNING'
                                  ? 'success'
                                  : comp.type === 'DEDUCTION'
                                  ? 'warning'
                                  : 'cyan'
                              }
                            >
                              {comp.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                            ₹{Number(comp.amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Permanent Lock Confirmation Modal */}
          <ConfirmationModal
            isOpen={isLockModalOpen}
            onClose={() => setIsLockModalOpen(false)}
            onConfirm={handleLockPayroll}
            title="Lock Payroll & Generate Official Payslips"
            message={`Are you sure you want to permanently lock payroll for ${
              months.find((m) => m.value === selectedMonth)?.label
            } ${selectedYear}? Once locked, this run becomes strictly immutable and tamper-proof. Official payslips will be generated immediately for all active employees.`}
            confirmText="Lock Payroll Permanently"
            confirmVariant="primary"
          />
        </>
      )}
    </div>
  );
};
