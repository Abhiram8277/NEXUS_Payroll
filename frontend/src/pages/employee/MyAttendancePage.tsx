import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  CalendarCheck2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export const MyAttendancePage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [attendanceData, setAttendanceData] = useState<any | null>(null);
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
    fetchMyAttendance();
  }, [selectedMonth, selectedYear]);

  const fetchMyAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/my-attendance', {
        params: { month: selectedMonth, year: selectedYear },
      });
      if (res.data.success) {
        setAttendanceData(res.data.data);
      }
    } catch (e: any) {
      console.error(e);
      showToast('Failed to load attendance logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const summary = attendanceData?.summary;
  const records: any[] = attendanceData?.records || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="My Attendance & Timesheets"
        description="Daily punch history, time off tracking, and calculated Loss of Pay (LOP) metrics."
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
          {/* Summary Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="p-4 text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Working Days
              </span>
              <div className="text-2xl font-bold text-slate-800 mt-1">
                {summary?.totalDays || 0}
              </div>
            </Card>

            <Card className="p-4 text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Present
              </span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {summary?.present || 0}
              </div>
            </Card>

            <Card className="p-4 text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Absent
              </span>
              <div className="text-2xl font-bold text-rose-500 mt-1">{summary?.absent || 0}</div>
            </Card>

            <Card className="p-4 text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Half Days
              </span>
              <div className="text-2xl font-bold text-amber-500 mt-1">
                {summary?.halfDay || 0}
              </div>
            </Card>

            <Card className="p-4 text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Effective Present
              </span>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {summary?.effectivePresent || 0}
              </div>
            </Card>

            <Card className="p-4 text-center bg-rose-50/50 border border-rose-200/60">
              <span className="text-[11px] uppercase tracking-wider text-rose-600 font-semibold">
                Total LOP
              </span>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {summary?.totalLop || 0} Days
              </div>
            </Card>
          </div>

          {/* Daily Records Table */}
          <Card
            orientation="vertical"
            title={`Daily Attendance Logs (${
              months.find((m) => m.value === selectedMonth)?.label
            } ${selectedYear})`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Day</th>
                    <th className="px-6 py-3">Attendance Status</th>
                    <th className="px-6 py-3">Remarks / Punch Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.length > 0 ? (
                    records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5 font-medium text-slate-900">
                          {new Date(rec.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-500">
                          {new Date(rec.date).toLocaleDateString('en-IN', { weekday: 'long' })}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge
                            variant={
                              rec.status === 'PRESENT'
                                ? 'success'
                                : rec.status === 'HALF_DAY'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {rec.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 text-xs">
                          {rec.remarks || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No individual punch records registered for this month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
