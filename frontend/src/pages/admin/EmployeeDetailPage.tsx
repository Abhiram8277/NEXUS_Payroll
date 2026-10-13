import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  ShieldAlert,
  ArrowLeft,
  Upload,
  Download,
  Edit,
  BadgePercent,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { Employee, SalaryTemplate } from '../../types';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'salary' | 'leaves' | 'attendance' | 'documents'>('overview');

  // Edit employee modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Salary assign modal
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [salaryTemplates, setSalaryTemplates] = useState<SalaryTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [monthlyGrossInput, setMonthlyGrossInput] = useState('');
  const [savingSalary, setSavingSalary] = useState(false);

  // Document upload modal
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docType, setDocType] = useState('PAN_CARD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Attendance history
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchEmployeeDetails();
      fetchSalaryTemplates();
    }
  }, [id]);

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employees/${id}`);
      if (res.data.success) {
        setEmployee(res.data.data);
        setEditFormData({
          firstName: res.data.data.firstName,
          lastName: res.data.data.lastName,
          email: res.data.data.email,
          phone: res.data.data.phone || '',
          gender: res.data.data.gender || 'Male',
          address: res.data.data.address || '',
          pan: res.data.data.pan || '',
          aadhaar: res.data.data.aadhaar || '',
          uan: res.data.data.uan || '',
          esiNumber: res.data.data.esiNumber || '',
          accountNumber: res.data.data.accountNumber || '',
          ifsc: res.data.data.ifsc || '',
          bankName: res.data.data.bankName || '',
          status: res.data.data.status,
          taxRegime: res.data.data.taxRegime,
        });

        // Fetch employee attendance
        fetchEmployeeAttendance();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to fetch employee details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryTemplates = async () => {
    try {
      const res = await api.get('/salary/templates');
      if (res.data.success) {
        setSalaryTemplates(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployeeAttendance = async () => {
    try {
      const res = await api.get(`/attendance/employee/${id}`);
      if (res.data.success) {
        setAttendanceRecords(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      const res = await api.put(`/employees/${id}`, editFormData);
      if (res.data.success) {
        showToast('Employee information updated successfully', 'success');
        setIsEditModalOpen(false);
        fetchEmployeeDetails();
      }
    } catch (e: any) {
      const errorMsg =
        e.response?.data?.message ||
        (e.response?.data?.errors?.length
          ? e.response.data.errors.map((err: any) => `${err.field}: ${err.message}`).join(', ')
          : 'Failed to update employee');
      showToast(errorMsg, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAssignSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthlyGrossInput || isNaN(Number(monthlyGrossInput))) {
      showToast('Please enter a valid monthly gross amount', 'error');
      return;
    }
    try {
      setSavingSalary(true);
      const payload: any = {
        employeeId: id,
        monthlyGross: Number(monthlyGrossInput),
      };
      if (selectedTemplateId) {
        payload.templateId = selectedTemplateId;
      }

      const res = await api.post('/salary/assign', payload);
      if (res.data.success) {
        showToast('Salary structure assigned successfully', 'success');
        setIsSalaryModalOpen(false);
        fetchEmployeeDetails();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to assign salary', 'error');
    } finally {
      setSavingSalary(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a file to upload', 'error');
      return;
    }
    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', docType);

      const res = await api.post(`/employees/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        showToast('Document uploaded successfully', 'success');
        setIsDocModalOpen(false);
        setSelectedFile(null);
        fetchEmployeeDetails();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to upload document', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDownloadDoc = async (docId: string, fileName: string) => {
    try {
      const res = await api.get(`/employees/documents/${docId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e: any) {
      showToast('Failed to download document', 'error');
    }
  };

  const handleDeleteDoc = async (docId: string, fileName: string) => {
    if (!window.confirm(`Delete document "${fileName}"?`)) return;
    try {
      const res = await api.delete(`/employees/documents/${docId}`);
      if (res.data.success) {
        showToast('Document deleted successfully', 'success');
        fetchEmployeeDetails();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to delete document', 'error');
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employee) return;
    if (
      !window.confirm(
        `Are you sure you want to delete or deactivate ${employee.firstName} ${employee.lastName}?`
      )
    ) {
      return;
    }
    try {
      const res = await api.delete(`/employees/${employee.id}`);
      if (res.data.success) {
        showToast(res.data.message || 'Employee removed/deactivated', 'success');
        navigate(-1);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to delete employee', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-4">Employee record not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      {/* Profile Overview Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-cyan-500/20">
              {employee.firstName.charAt(0)}
              {employee.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {employee.firstName} {employee.lastName}
                </h1>
                <Badge
                  variant={
                    employee.status === 'ACTIVE'
                      ? 'success'
                      : employee.status === 'ONBOARDING'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  {employee.status}
                </Badge>
                <Badge variant="cyan">{employee.taxRegime} TAX REGIME</Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                <span className="font-semibold text-slate-700">{employee.employeeId}</span>
                <span>•</span>
                <span>{employee.designation?.name || 'Staff Member'}</span>
                <span>•</span>
                <span>{employee.department?.name || 'General Department'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
              <Edit className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
            <Button variant="primary" onClick={() => setIsSalaryModalOpen(true)}>
              <BadgePercent className="w-4 h-4 mr-2" /> Configure Salary
            </Button>
            <Button
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={handleDeleteEmployee}
              title="Deactivate or Delete Employee"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-8 border-b border-slate-200 overflow-x-auto">
          {[
            { id: 'overview', label: 'Personal & Job Profile' },
            { id: 'salary', label: 'Salary Structure' },
            { id: 'leaves', label: 'Leave Balances' },
            { id: 'attendance', label: 'Attendance History' },
            { id: 'documents', label: 'Documents & KYC' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card orientation="vertical" title="Personal & Contact Details">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {employee.email}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Phone Number</label>
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {employee.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Gender</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{employee.gender || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Date of Joining</label>
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />{' '}
                    {new Date(employee.joiningDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Residential Address</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{employee.address || 'Address not registered'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card orientation="vertical" title="Banking & Statutory Details">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Bank Name</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{employee.bankName || 'Not configured'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Account Number</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">{employee.accountNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">IFSC Code</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">{employee.ifsc || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">PAN Number</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">{employee.pan || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Aadhaar Number</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">{employee.aadhaar || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">UAN (PF Number)</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">{employee.uan || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">ESI Number</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">{employee.esiNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Work Location</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{employee.location?.name || 'Headquarters'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Salary Structure */}
      {activeTab === 'salary' && (
        <div className="space-y-6">
          {employee.salary ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-slate-900 to-navy-900 text-white">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Annual Cost to Company (CTC)</span>
                  <div className="text-3xl font-bold mt-2 text-cyan-400">
                    ₹{Number(employee.salary.ctcAnnual).toLocaleString('en-IN')}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">Full yearly compensation</span>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-blue-900 to-indigo-950 text-white">
                  <span className="text-xs uppercase tracking-wider text-blue-300 font-semibold">Monthly Gross Salary</span>
                  <div className="text-3xl font-bold mt-2 text-white">
                    ₹{Number(employee.salary.monthlyGross).toLocaleString('en-IN')}
                  </div>
                  <span className="text-xs text-blue-300 mt-1 block">Pre-deduction baseline</span>
                </Card>
                <Card className="p-6 flex flex-col justify-center items-start">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Configured Components</span>
                  <div className="text-3xl font-bold mt-2 text-slate-800">
                    {employee.salary.componentsJson?.length || 0}
                  </div>
                  <span className="text-xs text-slate-500 mt-1">Earnings & statutory breakdown</span>
                </Card>
              </div>

              {/* Component breakdown table */}
              <Card orientation="vertical" title="Itemized Salary Breakup">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Component</th>
                        <th className="px-6 py-3">Code</th>
                        <th className="px-6 py-3">Classification</th>
                        <th className="px-6 py-3 text-right">Monthly (₹)</th>
                        <th className="px-6 py-3 text-right">Annual (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employee.salary.componentsJson?.map((comp: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-6 py-3.5 font-medium text-slate-900">{comp.name}</td>
                          <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{comp.code}</td>
                          <td className="px-6 py-3.5">
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
                          <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                            ₹{Number(comp.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-3.5 text-right text-slate-500">
                            ₹{(Number(comp.amount) * 12).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <BadgePercent className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800">No Salary Structure Assigned</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                This employee does not currently have a defined monthly gross or salary template assigned.
              </p>
              <Button variant="primary" className="mt-6" onClick={() => setIsSalaryModalOpen(true)}>
                Assign Salary Now
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Tab 3: Leaves */}
      {activeTab === 'leaves' && (
        <Card orientation="vertical" title="Annual Leave Entitlements & Balances">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Leave Type</th>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3 text-center">Allocated</th>
                  <th className="px-6 py-3 text-center">Used</th>
                  <th className="px-6 py-3 text-center">Pending Approval</th>
                  <th className="px-6 py-3 text-right">Available Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employee.leaveBalances && employee.leaveBalances.length > 0 ? (
                  employee.leaveBalances.map((bal) => (
                    <tr key={bal.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{bal.leaveType.name}</td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{bal.leaveType.code}</td>
                      <td className="px-6 py-3.5 text-center text-slate-700">{bal.allocated} days</td>
                      <td className="px-6 py-3.5 text-center text-slate-700">{bal.used} days</td>
                      <td className="px-6 py-3.5 text-center text-amber-600 font-medium">{bal.pending} days</td>
                      <td className="px-6 py-3.5 text-right font-bold text-emerald-600">
                        {bal.available} days
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No leave balances found for this employee.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: Attendance History */}
      {activeTab === 'attendance' && (
        <Card orientation="vertical" title="Recent Attendance Logs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRecords.length > 0 ? (
                  attendanceRecords.slice(0, 31).map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {new Date(record.date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={
                            record.status === 'PRESENT'
                              ? 'success'
                              : record.status === 'HALF_DAY'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-500">{record.remarks || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                      No recent attendance logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 5: Documents */}
      {activeTab === 'documents' && (
        <Card
          orientation="vertical"
          title="KYC & Employment Documents"
          action={
            <Button size="sm" variant="outline" onClick={() => setIsDocModalOpen(true)}>
              <Upload className="w-4 h-4 mr-1.5" /> Upload Document
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Document Type</th>
                  <th className="px-6 py-3">File Name</th>
                  <th className="px-6 py-3">File Size</th>
                  <th className="px-6 py-3">Uploaded Date</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employee.documents && employee.documents.length > 0 ? (
                  employee.documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{doc.documentType}</td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{doc.fileName}</td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {(doc.fileSize / 1024).toFixed(1)} KB
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadDoc(doc.id, doc.fileName)}
                            title="Download Document"
                          >
                            <Download className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteDoc(doc.id, doc.fileName)}
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No documents uploaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Employee Information"
        size="lg"
      >
        <form onSubmit={handleUpdateEmployee} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={editFormData.firstName || ''}
              onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={editFormData.lastName || ''}
              onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={editFormData.email || ''}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={editFormData.phone || ''}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
            <Select
              label="Gender"
              value={editFormData.gender || 'Male'}
              onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
              ]}
            />
            <Select
              label="Tax Regime"
              value={editFormData.taxRegime || 'NEW'}
              onChange={(e) => setEditFormData({ ...editFormData, taxRegime: e.target.value })}
              options={[
                { value: 'NEW', label: 'New Tax Regime (Default)' },
                { value: 'OLD', label: 'Old Tax Regime' },
              ]}
            />
            <Input
              label="PAN Number"
              value={editFormData.pan || ''}
              onChange={(e) => setEditFormData({ ...editFormData, pan: e.target.value.toUpperCase() })}
            />
            <Input
              label="Aadhaar Number"
              value={editFormData.aadhaar || ''}
              onChange={(e) => setEditFormData({ ...editFormData, aadhaar: e.target.value })}
            />
            <Input
              label="UAN"
              value={editFormData.uan || ''}
              onChange={(e) => setEditFormData({ ...editFormData, uan: e.target.value })}
            />
            <Input
              label="ESI Number"
              value={editFormData.esiNumber || ''}
              onChange={(e) => setEditFormData({ ...editFormData, esiNumber: e.target.value })}
            />
            <Input
              label="Bank Name"
              value={editFormData.bankName || ''}
              onChange={(e) => setEditFormData({ ...editFormData, bankName: e.target.value })}
            />
            <Input
              label="Account Number"
              value={editFormData.accountNumber || ''}
              onChange={(e) => setEditFormData({ ...editFormData, accountNumber: e.target.value })}
            />
            <Input
              label="IFSC Code"
              value={editFormData.ifsc || ''}
              onChange={(e) => setEditFormData({ ...editFormData, ifsc: e.target.value.toUpperCase() })}
            />
            <Select
              label="Status"
              value={editFormData.status || 'ACTIVE'}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'ONBOARDING', label: 'Onboarding' },
                { value: 'EXITED', label: 'Exited' },
              ]}
            />
            <div className="col-span-2">
              <Input
                label="Residential Address"
                value={editFormData.address || ''}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={savingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Configure Salary Modal */}
      <Modal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
        title="Assign Salary Structure"
      >
        <form onSubmit={handleAssignSalary} className="space-y-4">
          <Input
            label="Monthly Gross Salary (₹)"
            type="number"
            placeholder="e.g. 60000"
            value={monthlyGrossInput}
            onChange={(e) => setMonthlyGrossInput(e.target.value)}
            required
          />

          <Select
            label="Salary Template (Optional)"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            options={[
              { value: '', label: 'Default Standard Structure (50% Basic, 20% HRA, etc.)' },
              ...salaryTemplates.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />

          <p className="text-xs text-slate-500">
            Assigning will calculate and persist all itemized salary components, employee statutory deductions (PF, ESI, PT), and employer statutory contributions.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsSalaryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={savingSalary}>
              Assign Structure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Upload Employee Document"
      >
        <form onSubmit={handleUploadDocument} className="space-y-4">
          <Select
            label="Document Classification"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            options={[
              { value: 'PAN_CARD', label: 'PAN Card' },
              { value: 'AADHAAR_CARD', label: 'Aadhaar Card' },
              { value: 'PASSPORT', label: 'Passport' },
              { value: 'OFFER_LETTER', label: 'Offer Letter' },
              { value: 'RESUME', label: 'Resume / CV' },
              { value: 'DEGREE_CERTIFICATE', label: 'Educational Degree' },
              { value: 'BANK_STATEMENT', label: 'Bank Statement / Cancelled Cheque' },
              { value: 'OTHER', label: 'Other Document' },
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">File (PDF, PNG, JPG)</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsDocModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={uploadingDoc}>
              Upload Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
