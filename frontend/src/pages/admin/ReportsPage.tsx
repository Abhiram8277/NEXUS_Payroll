import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Building,
  TrendingUp,
  Receipt,
  Filter,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'summary' | 'register' | 'department'>('summary');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [registerData, setRegisterData] = useState<any[]>([]);
  const [deptCostData, setDeptCostData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

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
    fetchReportData();
  }, [activeTab, selectedYear, selectedMonth]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'summary') {
        const res = await api.get('/reports/payroll-summary', {
          params: { year: selectedYear },
        });
        setSummaryData(res.data.data || []);
      } else if (activeTab === 'register') {
        const res = await api.get('/reports/salary-register', {
          params: { month: selectedMonth, year: selectedYear },
        });
        setRegisterData(res.data.data || []);
      } else if (activeTab === 'department') {
        const res = await api.get('/reports/department-cost', {
          params: { month: selectedMonth, year: selectedYear },
        });
        setDeptCostData(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      let endpoint = '';
      let params: any = {};
      let filename = '';

      if (activeTab === 'summary') {
        endpoint = '/reports/payroll-summary';
        params = { year: selectedYear, format };
        filename = `Payroll_Summary_${selectedYear}.${format === 'excel' ? 'xlsx' : format}`;
      } else if (activeTab === 'register') {
        endpoint = '/reports/salary-register';
        params = { month: selectedMonth, year: selectedYear, format };
        filename = `Salary_Register_${selectedMonth}_${selectedYear}.${format === 'excel' ? 'xlsx' : format}`;
      } else if (activeTab === 'department') {
        endpoint = '/reports/department-cost';
        params = { month: selectedMonth, year: selectedYear, format };
        filename = `Department_Cost_${selectedMonth}_${selectedYear}.${format === 'excel' ? 'xlsx' : format}`;
      }

      const res = await api.get(endpoint, {
        params,
        responseType: 'blob',
      });

      const mimeType =
        format === 'csv'
          ? 'text/csv'
          : format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      showToast(`Report exported as ${format.toUpperCase()}`, 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Statutory Registers"
        description="Audit-ready payroll summaries, granular employee salary registers, and department-level cost accounting."
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4 mr-1.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport('excel')}>
              <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Excel
            </Button>
            {activeTab !== 'department' && (
              <Button size="sm" variant="primary" onClick={() => handleExport('pdf')}>
                <FileText className="w-4 h-4 mr-1.5" /> PDF
              </Button>
            )}
          </div>
        }
      />

      {/* Filter and Period Selection */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'summary', label: 'Payroll Summary' },
            { id: 'register', label: 'Salary Register' },
            { id: 'department', label: 'Department Costing' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {activeTab !== 'summary' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* TAB 1: Payroll Summary */}
          {activeTab === 'summary' && (
            <Card orientation="vertical" title={`Annual Payroll Summary (${selectedYear})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Period</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Employees</th>
                      <th className="px-6 py-3 text-right">Gross Earnings</th>
                      <th className="px-6 py-3 text-right text-rose-600">Deductions</th>
                      <th className="px-6 py-3 text-right text-blue-600">Employer Cost</th>
                      <th className="px-6 py-3 text-right font-bold text-slate-900">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryData.length > 0 ? (
                      summaryData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-6 py-3.5 font-bold text-slate-900">{row.period}</td>
                          <td className="px-6 py-3.5">
                            <Badge
                              variant={
                                row.status === 'LOCKED'
                                  ? 'success'
                                  : row.status === 'APPROVED'
                                  ? 'cyan'
                                  : 'warning'
                              }
                            >
                              {row.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-700 font-mono text-xs">
                            {row.employees}
                          </td>
                          <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                            ₹{Number(row.gross).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-3.5 text-right text-rose-600 font-semibold">
                            ₹{Number(row.deductions).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-3.5 text-right text-blue-600 font-semibold">
                            ₹{Number(row.employerCost).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                            ₹{Number(row.net).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                          No payroll cycles found for year {selectedYear}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 2: Salary Register */}
          {activeTab === 'register' && (
            <Card
              orientation="vertical"
              title={`Salary Register Report (${
                months.find((m) => m.value === selectedMonth)?.label
              } ${selectedYear})`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Emp ID</th>
                      <th className="px-4 py-3">Employee Name</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-3 py-3 text-center">Working</th>
                      <th className="px-3 py-3 text-center">Present</th>
                      <th className="px-3 py-3 text-center text-rose-600">LOP</th>
                      <th className="px-4 py-3 text-right">Gross (₹)</th>
                      <th className="px-4 py-3 text-right">PF (₹)</th>
                      <th className="px-4 py-3 text-right">ESI (₹)</th>
                      <th className="px-4 py-3 text-right">PT (₹)</th>
                      <th className="px-4 py-3 text-right">TDS (₹)</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-900">Net Pay (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registerData.length > 0 ? (
                      registerData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 font-mono text-xs">
                          <td className="px-4 py-3 font-semibold text-slate-900">{row.employeeId}</td>
                          <td className="px-4 py-3 font-sans font-medium text-slate-800">
                            {row.name}
                          </td>
                          <td className="px-4 py-3 font-sans text-slate-600">{row.department}</td>
                          <td className="px-3 py-3 text-center text-slate-700">{row.workingDays}</td>
                          <td className="px-3 py-3 text-center text-emerald-600 font-semibold">
                            {row.presentDays}
                          </td>
                          <td className="px-3 py-3 text-center text-rose-600 font-semibold">
                            {row.lopDays}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            ₹{Number(row.gross).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            ₹{Number(row.pf).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            ₹{Number(row.esi).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            ₹{Number(row.pt).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            ₹{Number(row.tds).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            ₹{Number(row.net).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={12} className="px-6 py-8 text-center text-slate-500 font-sans">
                          No salary register generated for this month.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 3: Department Costing */}
          {activeTab === 'department' && (
            <Card
              orientation="vertical"
              title={`Department Payroll Cost Breakdown (${
                months.find((m) => m.value === selectedMonth)?.label
              } ${selectedYear})`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Department</th>
                      <th className="px-4 py-3 text-center">Headcount</th>
                      <th className="px-6 py-3 text-right">Gross Salaries</th>
                      <th className="px-6 py-3 text-right text-blue-600">Employer Contributions</th>
                      <th className="px-6 py-3 text-right font-bold text-slate-900">
                        Total Company Cost (CTC)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deptCostData.length > 0 ? (
                      deptCostData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-6 py-3.5 font-bold text-slate-900">{row.department}</td>
                          <td className="px-4 py-3.5 text-center text-slate-700 font-mono text-xs">
                            {row.headcount}
                          </td>
                          <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                            ₹{Number(row.gross).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-3.5 text-right text-blue-600 font-semibold">
                            ₹{Number(row.employerCost).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                            ₹{Number(row.totalCost).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          No department payroll data available for this cycle.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
