import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  CalendarCheck2,
  Upload,
  Calendar,
  Search,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Download,
} from 'lucide-react';
import { Employee, MonthlyAttendanceSummary } from '../../types';

export const AttendancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'import'>('daily');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Daily Marking State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyRecords, setDailyRecords] = useState<
    Record<string, { status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LOP'; remarks: string }>
  >({});
  const [savingDaily, setSavingDaily] = useState(false);

  // Monthly Summary State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlyAttendanceSummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Bulk Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const { showToast } = useToast();

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlySummary();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees?limit=100');
      if (res.data.success) {
        const emps: Employee[] = res.data.data.items || [];
        setEmployees(emps);
        // Default all to PRESENT
        const initialMap: any = {};
        emps.forEach((emp) => {
          initialMap[emp.id] = { status: 'PRESENT', remarks: '' };
        });
        setDailyRecords(initialMap);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load employee list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await api.get('/attendance/summary', {
        params: { month: selectedMonth, year: selectedYear },
      });
      if (res.data.success) {
        setMonthlySummaries(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load monthly summary', 'error');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleStatusChange = (employeeId: string, status: any) => {
    setDailyRecords((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        status,
      },
    }));
  };

  const handleRemarksChange = (employeeId: string, remarks: string) => {
    setDailyRecords((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        remarks,
      },
    }));
  };

  const handleMarkAll = (status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LOP') => {
    const updated: any = {};
    employees.forEach((emp) => {
      updated[emp.id] = {
        status,
        remarks: dailyRecords[emp.id]?.remarks || '',
      };
    });
    setDailyRecords(updated);
    showToast(`Marked all employees as ${status}`, 'info');
  };

  const handleSaveDaily = async () => {
    try {
      setSavingDaily(true);
      const records = Object.entries(dailyRecords).map(([employeeId, data]) => ({
        employeeId,
        date: selectedDate,
        status: data.status,
        remarks: data.remarks || undefined,
      }));

      const res = await api.post('/attendance/mark', { records });
      if (res.data.success) {
        showToast(`Attendance recorded for ${records.length} employees on ${selectedDate}`, 'success');
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to save attendance', 'error');
    } finally {
      setSavingDaily(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      showToast('Please select an Excel or CSV file', 'error');
      return;
    }
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('month', String(selectedMonth));
      formData.append('year', String(selectedYear));

      const res = await api.post('/attendance/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setImportResult(res.data.data);
        showToast('Attendance imported successfully', 'success');
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to import attendance', 'error');
    } finally {
      setImporting(false);
    }
  };

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
        title="Attendance & Time Management"
        description="Record daily attendance, inspect monthly payroll inputs, and perform bulk Excel imports."
        action={
          activeTab === 'daily' ? (
            <Button variant="primary" onClick={handleSaveDaily} loading={savingDaily}>
              <CheckCircle className="w-4 h-4 mr-1.5" /> Save Daily Log
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'daily', label: 'Daily Attendance Sheet' },
          { id: 'monthly', label: 'Monthly Summary & LOP' },
          { id: 'import', label: 'Bulk Import (Excel / CSV)' },
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

      {/* TAB 1: Daily Marking */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Calendar className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Attendance Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium mr-1">Quick Action:</span>
              <Button size="sm" variant="outline" onClick={() => handleMarkAll('PRESENT')}>
                Mark All Present
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleMarkAll('ABSENT')}>
                Mark All Absent
              </Button>
            </div>
          </Card>

          <Card orientation="vertical" title={`Attendance Roster (${employees.length} Active Staff)`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => {
                    const currentStatus = dailyRecords[emp.id]?.status || 'PRESENT';
                    const currentRemarks = dailyRecords[emp.id]?.remarks || '';

                    return (
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
                          <div className="flex items-center gap-1.5">
                            {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LOP'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(emp.id, st)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  currentStatus === st
                                    ? st === 'PRESENT'
                                      ? 'bg-emerald-500 text-white shadow-sm'
                                      : st === 'ABSENT'
                                      ? 'bg-rose-500 text-white shadow-sm'
                                      : st === 'HALF_DAY'
                                      ? 'bg-amber-500 text-white shadow-sm'
                                      : 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <input
                            type="text"
                            placeholder="Optional notes"
                            value={currentRemarks}
                            onChange={(e) => handleRemarksChange(emp.id, e.target.value)}
                            className="w-full max-w-xs px-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Monthly Summary */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">Period:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="outline" size="sm" onClick={fetchMonthlySummary}>
              Refresh Summary
            </Button>
          </Card>

          <Card
            orientation="vertical"
            title={`Monthly Attendance & LOP Summary (${
              months.find((m) => m.value === selectedMonth)?.label
            } ${selectedYear})`}
          >
            {loadingSummary ? (
              <div className="p-12 text-center">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Employee</th>
                      <th className="px-6 py-3">Department</th>
                      <th className="px-4 py-3 text-center">Working Days</th>
                      <th className="px-4 py-3 text-center">Present</th>
                      <th className="px-4 py-3 text-center">Absent</th>
                      <th className="px-4 py-3 text-center">Half Day</th>
                      <th className="px-4 py-3 text-center">Explicit LOP</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-800">Effective Present</th>
                      <th className="px-4 py-3 text-right font-bold text-rose-600">Total LOP (Days)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlySummaries.length > 0 ? (
                      monthlySummaries.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="px-6 py-3.5">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-500">{item.employeeId}</div>
                          </td>
                          <td className="px-6 py-3.5 text-slate-600">{item.department}</td>
                          <td className="px-4 py-3.5 text-center text-slate-700">{item.totalDays}</td>
                          <td className="px-4 py-3.5 text-center font-medium text-emerald-600">
                            {item.present}
                          </td>
                          <td className="px-4 py-3.5 text-center text-rose-500">{item.absent}</td>
                          <td className="px-4 py-3.5 text-center text-amber-500">{item.halfDay}</td>
                          <td className="px-4 py-3.5 text-center text-purple-600">{item.lop}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-slate-900">
                            {item.effectivePresent}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-rose-600">
                            {item.totalLop}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                          No attendance data recorded yet for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: Bulk Import */}
      {activeTab === 'import' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Import Attendance via Excel / CSV</h3>
                <p className="text-sm text-slate-500">
                  Bulk upload biometric or spreadsheet punch logs directly to NEXUS.
                </p>
              </div>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payroll Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payroll Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Excel Spreadsheet (.xlsx, .xls)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-400 transition-colors">
                  <div className="space-y-2 text-center">
                    <Upload className="mx-auto h-8 w-8 text-slate-400" />
                    <div className="flex text-sm text-slate-600">
                      <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                          className="sr-only"
                          required
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {importFile ? importFile.name : 'XLSX or CSV up to 10MB'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-semibold text-slate-800">Required Column Headers:</div>
                <p>• <strong>Employee ID</strong> (e.g. EMP001, EMP002)</p>
                <p>• <strong>Date</strong> (Format: YYYY-MM-DD or DD/MM/YYYY)</p>
                <p>• <strong>Status</strong> (PRESENT, ABSENT, HALF_DAY, LOP)</p>
                <p>• <strong>Remarks</strong> (Optional note or punch log reason)</p>
              </div>

              <Button
                variant="primary"
                type="submit"
                className="w-full justify-center"
                loading={importing}
              >
                Upload and Process Attendance
              </Button>
            </form>

            {importResult && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                <div className="font-bold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Import Completed Successfully
                </div>
                <p className="mt-1">
                  Processed {importResult.totalImported || 0} attendance records for {selectedMonth}/
                  {selectedYear}.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
