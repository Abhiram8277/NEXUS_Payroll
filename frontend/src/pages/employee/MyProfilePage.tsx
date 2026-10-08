import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  MapPin,
  ShieldCheck,
  Briefcase,
  FileText,
} from 'lucide-react';
import { Employee } from '../../types';

export const MyProfilePage: React.FC = () => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees/me');
      if (res.data.success) {
        setEmployee(res.data.data);
      }
    } catch (e: any) {
      console.error(e);
      showToast('Failed to load employee profile', 'error');
    } finally {
      setLoading(false);
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
        <p className="text-slate-500">No profile record found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="My Employee Profile"
        description="Official personal, employment, and statutory information recorded with company payroll."
      />

      {/* Main Header Banner */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-cyan-500/20">
              {employee.firstName.charAt(0)}
              {employee.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">
                  {employee.firstName} {employee.lastName}
                </h2>
                <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'neutral'}>
                  {employee.status}
                </Badge>
                <Badge variant="cyan">{employee.taxRegime} REGIME</Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-semibold text-slate-700">{employee.employeeId}</span> •{' '}
                {employee.designation?.name || 'Staff Member'} •{' '}
                {employee.department?.name || 'General Department'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <Card orientation="vertical" title="Personal Information">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">First Name</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{employee.firstName}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Last Name</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{employee.lastName}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Email Address</label>
                <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {employee.email}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Phone</label>
                <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {employee.phone || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Gender</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{employee.gender || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Joining Date</label>
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
                <label className="text-xs font-semibold uppercase text-slate-400">Address</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5">
                  {employee.address || 'Address not registered'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Employment & Location */}
        <Card orientation="vertical" title="Employment & Organization">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Employee ID</label>
                <p className="text-sm font-bold text-slate-900 mt-0.5 font-mono">{employee.employeeId}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Department</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5">
                  {employee.department?.name || 'General'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Designation</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5">
                  {employee.designation?.name || 'Staff Member'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Location</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5">
                  {employee.location?.name || 'Headquarters'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">City / State</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5">
                  {employee.location?.city || 'Hyderabad'}, {employee.location?.state || 'Telangana'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Tax Regime</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5">
                  {employee.taxRegime} Tax Schedule
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Banking Details */}
        <Card orientation="vertical" title="Bank Account Details">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Bank Name</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{employee.bankName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Account Number</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">
                  {employee.accountNumber || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">IFSC Code</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">
                  {employee.ifsc || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Account Holder</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5">
                  {employee.accountHolderName || `${employee.firstName} ${employee.lastName}`}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Statutory Identifiers */}
        <Card orientation="vertical" title="Government Statutory Numbers">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Permanent Account Number (PAN)</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">{employee.pan || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Aadhaar Number</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">
                  {employee.aadhaar ? `•••• •••• ${employee.aadhaar.slice(-4)}` : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Universal Account Number (UAN)</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">{employee.uan || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">ESI IP Number</label>
                <p className="text-sm font-medium text-slate-800 mt-0.5 font-mono">{employee.esiNumber || 'N/A'}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
