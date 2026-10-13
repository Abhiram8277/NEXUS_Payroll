import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  Upload,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  Download,
  Trash2,
  Eye,
} from 'lucide-react';
import { Employee, MonthlyAttendanceSummary } from '../../types';

export const AttendancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'import'>('daily');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Daily Marking State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyRecords, setDailyRecords] = useState<
    Record<
      string,
      {
        id?: string;
        status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LOP';
        remarks: string;
        saved?: boolean;
      }
    >
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
    if (employees.length > 0 && activeTab === 'daily') {
      fetchDailyAttendance(selectedDate, employees);
    }
  }, [selectedDate, employees, activeTab]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlySummary();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees?limit=200&status=ACTIVE');
      if (res.data.success) {
        const emps: Employee[] = res.data.data.items || [];
        setEmployees(emps);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load employee list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyAttendance = async (dateStr: string, empList: Employee[]) => {
    try {
      const res = await api.get('/attendance/daily', { params: { date: dateStr } });
      const savedList: any[] = res.data?.data || [];
      const savedByEmpId = new Map<string, any>();
      savedList.forEach((rec) => savedByEmpId.set(rec.employeeId, rec));

      const map: Record<string, any> = {};
      empList.forEach((emp) => {
        const existing = savedByEmpId.get(emp.id);
        if (existing) {
          map[emp.id] = {
            id: existing.id,
            status: existing.status,
            remarks: existing.remarks || '',
            saved: true,
          };
        } else {
          map[emp.id] = {
            status: 'PRESENT',
            remarks: '',
            saved: false,
          };
        }
      });
      setDailyRecords(map);
    } catch {
      // Fallback default map
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
        ...dailyRecords[emp.id],
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
        fetchDailyAttendance(selectedDate, employees);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to save attendance', 'error');
    } finally {
      setSavingDaily(false);
    }
  };

  const handleDeleteDailyRecord = async (emp: Employee) => {
    const rec = dailyRecords[emp.id];
    if (!rec?.id) return;
    if (
      !window.confirm(
        `Delete saved attendance record for ${emp.firstName} ${emp.lastName} on ${selectedDate}?`
      )
    ) {
      return;
    }
    try {
      const res = await api.delete(`/attendance/${rec.id}`);
      if (res.data.success) {
        showToast('Attendance record deleted', 'success');
        fetchDailyAttendance(selectedDate, employees);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to delete attendance record', 'error');
    }
  };

  const handleDownloadSampleTemplate = async () => {
    try {
      const res = await api.get('/attendance/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(
        new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'NEXUS_Attendance_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      showToast('Sample attendance Excel template downloaded', 'success');
    } catch {
      showToast('Failed to download sample template', 'error');
    }
  };

  const runExcelImport = async (previewOnly: boolean) => {
    if (!importFile) {
      showToast('Please select an Excel or CSV file first', 'error');
      return;
    }
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await api.post(
        `/attendance/import${previewOnly ? '?preview=true' : ''}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      if (res.data.success) {
        setImportResult(res.data.data);
        showToast(
          previewOnly
            ? 'Validation preview completed. Review valid and invalid rows below.'
            : `Attendance import completed: ${res.data.data.successfulRows} record(s) saved.`,
          'success'
        );
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to process attendance file', 'error');
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
        description="Record daily attendance, inspect monthly payroll inputs, and perform validated bulk Excel imports."
        action={
          activeTab === 'daily' ? (
            <Button variant="primary" onClick={handleSaveDaily} loading={savingDaily}>
              <CheckCircle className="w-4 h-4 mr-1.5" /> Save Daily Log
            </Button>
          ) : activeTab === 'import' ? (
            <Button variant="outline" onClick={handleDownloadSampleTemplate}>
              <Download className="w-4 h-4 mr-1.5" /> Download Sample Excel
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
                    <th className="px-6 py-3 text-right">Record State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => {
                    const rec = dailyRecords[emp.id];
                    const currentStatus = rec?.status || 'PRESENT';
                    const currentRemarks = rec?.remarks || '';

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
                        <td className="px-6 py-3.5 text-right">
                          {rec?.saved ? (
                            <div className="inline-flex items-center gap-2">
                              <Badge variant="success">Saved</Badge>
                              <button
                                type="button"
                                onClick={() => handleDeleteDailyRecord(emp)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                                title="Delete Attendance Entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <Badge variant="neutral">Unsaved Default</Badge>
                          )}
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
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Import Attendance via Excel / CSV</h3>
                  <p className="text-sm text-slate-500">
                    Validate and bulk upload biometric or spreadsheet attendance logs into NEXUS.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadSampleTemplate}>
                <Download className="w-4 h-4 mr-1.5" /> Sample Template (.xlsx)
              </Button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Excel Spreadsheet (.xlsx, .xls, .csv)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-400 transition-colors">
                  <div className="space-y-2 text-center">
                    <Upload className="mx-auto h-8 w-8 text-slate-400" />
                    <div className="flex text-sm text-slate-600 justify-center">
                      <label className="relative cursor-pointer rounded-md font-semibold text-blue-600 hover:text-blue-500">
                        <span>Choose an Excel file</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => {
                            setImportFile(e.target.files ? e.target.files[0] : null);
                            setImportResult(null);
                          }}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">
                      {importFile ? `Selected: ${importFile.name}` : 'XLSX, XLS, or CSV up to 5MB'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-semibold text-slate-800">Required Column Headers:</div>
                <p>• <strong>employeeId</strong> (e.g. EMP-101, EMP-102)</p>
                <p>• <strong>date</strong> (Format: YYYY-MM-DD)</p>
                <p>• <strong>status</strong> (PRESENT, ABSENT, HALF_DAY, LOP)</p>
                <p>• <strong>remarks</strong> (Optional note or punch log reason)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  type="button"
                  className="w-full justify-center"
                  onClick={() => runExcelImport(true)}
                  loading={importing}
                  disabled={!importFile}
                >
                  <Eye className="w-4 h-4 mr-1.5" /> 1. Preview & Validate File
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  className="w-full justify-center"
                  onClick={() => runExcelImport(false)}
                  loading={importing}
                  disabled={!importFile}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" /> 2. Confirm & Import Valid Rows
                </Button>
              </div>
            </div>

            {importResult && (
              <div className="mt-6 space-y-4">
                <div
                  className={`p-4 rounded-xl border text-sm ${
                    importResult.previewOnly
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="font-bold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {importResult.previewOnly
                      ? 'Validation Preview Summary (Not Yet Saved)'
                      : 'Attendance Import Summary (Saved to Database)'}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">Total Rows</span>
                      <span className="text-base font-bold text-slate-900">{importResult.totalRows}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">
                        {importResult.previewOnly ? 'Valid Rows' : 'Imported Rows'}
                      </span>
                      <span className="text-base font-bold text-emerald-600">
                        {importResult.successfulRows}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">Existing Updated</span>
                      <span className="text-base font-bold text-blue-600">
                        {importResult.updatedRows || 0}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">Duplicates in File</span>
                      <span className="text-base font-bold text-amber-600">
                        {importResult.duplicateRows || 0}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">Failed / Invalid</span>
                      <span className="text-base font-bold text-rose-600">
                        {importResult.failedRows || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row-Level Errors Table */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="border border-rose-200 rounded-xl overflow-hidden">
                    <div className="bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800 flex items-center gap-2 border-b border-rose-200">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Rejected / Invalid Rows ({importResult.errors.length})
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2">Excel Row #</th>
                            <th className="px-4 py-2">Employee ID</th>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importResult.errors.map((err: any, idx: number) => (
                            <tr key={idx} className="bg-white">
                              <td className="px-4 py-2 font-mono font-semibold text-slate-800">
                                Row {err.row}
                              </td>
                              <td className="px-4 py-2 font-mono text-slate-600">
                                {err.employeeId || '—'}
                              </td>
                              <td className="px-4 py-2 text-slate-600">{err.date || '—'}</td>
                              <td className="px-4 py-2 text-rose-600 font-medium">{err.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Valid Records Preview Table */}
                {importResult.validRecords && importResult.validRecords.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 border-b border-slate-200">
                      Valid Attendance Rows ({importResult.validRecords.length})
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2">Row</th>
                            <th className="px-4 py-2">Employee</th>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importResult.validRecords.map((vr: any, idx: number) => (
                            <tr key={idx} className="bg-white">
                              <td className="px-4 py-2 font-mono">{vr.row}</td>
                              <td className="px-4 py-2 font-medium text-slate-900">
                                {vr.employeeCode} — {vr.employeeName}
                              </td>
                              <td className="px-4 py-2">{vr.date}</td>
                              <td className="px-4 py-2">
                                <Badge variant="success">{vr.status}</Badge>
                              </td>
                              <td className="px-4 py-2 text-slate-500">{vr.remarks || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
